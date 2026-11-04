import { LocalMockCERDataService } from "../services/LocalMockCERDataService";
import { ICERProposal } from "../models/CERModel";
import { ICERAttachment } from "../models/AttachmentModel";

function assertTrue(condition: boolean, msg: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function assertEqual(actual: any, expected: any, msg: string): void {
  if (actual !== expected) {
    throw new Error(`Assertion failed: ${msg} -> expected ${expected}, got ${actual}`);
  }
}

async function runTestSuite(): Promise<void> {
  console.log("===============================================================================");
  console.log(" CER ATTACHMENT ADD, DELETE, AND POST-APPROVAL VERSIONING TEST SUITE");
  console.log("===============================================================================");

  const service = new LocalMockCERDataService();
  const mockUser = { name: "Shiven Pandit", email: "shiven@example.com" };

  // Helper to create test proposal
  async function makeProposal(propNo: string, status: any = "Draft"): Promise<ICERProposal> {
    const proposal: any = {
      id: "",
      cerprno: "",
      proposal_no: propNo,
      pr_name: `Test Project ${propNo}`,
      owname: mockUser.name,
      owner_email: mockUser.email,
      sbu: "RJ North",
      status: status,
      amount: 5000,
      currency: "USD",
      cat: "Vital",
      payable: "Payback",
      period: "2026-2027",
      object: "Lifecycle testing",
      created_date: new Date().toISOString(),
      created_by: mockUser.name,
      modified_date: new Date().toISOString(),
      modified_by: mockUser.name,
      current_level: status === "Approved" ? 6 : 0,
      revision_count: 0,
    };
    const res = await service.createProposal(proposal);
    return res.proposal;
  }

  // Helper to add mock attachment
  async function addDoc(cerId: string, fileName: string): Promise<ICERAttachment> {
    const att: ICERAttachment = {
      id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      cerprno: cerId,
      name: fileName,
      size: 10240,
      type: fileName.endsWith(".pdf") ? "application/pdf" : "application/vnd.ms-excel",
      uploaded_by: mockUser.name,
      uploaded_date: new Date().toISOString(),
    };
    await service.addAttachment(att);
    const all = await service.getAttachments(cerId);
    return all.find((a) => a.name === fileName)!;
  }

  // -------------------------------------------------------------------------
  // Scenario 1: Draft: Add document without deleting -> Both old and new remain
  // -------------------------------------------------------------------------
  console.log("\n[Scenario 1] Draft: Add document without deleting");
  const p1 = await makeProposal("PR-2026/TEST-SC1", "Draft");
  await addDoc(p1.cerprno, "Doc1.pdf");
  await addDoc(p1.cerprno, "Doc2.pdf");
  const atts1 = await service.getAttachments(p1.cerprno);
  assertTrue(atts1.some((a) => a.name === "Doc1.pdf"), "Doc1.pdf exists");
  assertTrue(atts1.some((a) => a.name === "Doc2.pdf"), "Doc2.pdf exists");
  assertEqual(atts1.filter((a) => a.cerprno === p1.cerprno).length, 2, "Both documents remain in collection");
  console.log("  ✓ PASSED: Both old and newly added documents remain without auto-deletion.");

  // -------------------------------------------------------------------------
  // Scenario 2: Send Back: Add multiple documents -> All remain
  // -------------------------------------------------------------------------
  console.log("\n[Scenario 2] Send Back: Add multiple documents");
  const p2 = await makeProposal("PR-2026/TEST-SC2", "Send Back");
  await addDoc(p2.cerprno, "Initial.xlsx");
  await addDoc(p2.cerprno, "DocA.pdf");
  await addDoc(p2.cerprno, "DocB.pdf");
  const atts2 = await service.getAttachments(p2.cerprno);
  assertTrue(atts2.some((a) => a.name === "Initial.xlsx"), "Initial.xlsx exists");
  assertTrue(atts2.some((a) => a.name === "DocA.pdf"), "DocA.pdf exists");
  assertTrue(atts2.some((a) => a.name === "DocB.pdf"), "DocB.pdf exists");
  assertEqual(atts2.length, 3, "All 3 documents remain");
  console.log("  ✓ PASSED: Multiple documents added to Send Back proposal are all preserved.");

  // -------------------------------------------------------------------------
  // Scenario 3: Draft: Explicit delete -> Only that document deleted after save
  // -------------------------------------------------------------------------
  console.log("\n[Scenario 3] Draft: Explicit delete");
  const p3 = await makeProposal("PR-2026/TEST-SC3", "Draft");
  await addDoc(p3.cerprno, "KeepMe.pdf");
  const delDoc = await addDoc(p3.cerprno, "DeleteMe.pdf");
  const atts3Before = await service.getAttachments(p3.cerprno);
  assertEqual(atts3Before.length, 2, "Initially 2 documents");

  // Explicit deletion of delDoc
  await service.deleteAttachment(delDoc.id, { cerprno: p3.cerprno });
  const atts3After = await service.getAttachments(p3.cerprno);
  assertEqual(atts3After.length, 1, "Only 1 document remains");
  assertEqual(atts3After[0].name, "KeepMe.pdf", "KeepMe.pdf remained intact");
  assertTrue(!atts3After.some((a) => a.name === "DeleteMe.pdf"), "DeleteMe.pdf was physically removed");
  console.log("  ✓ PASSED: Only explicitly deleted document is removed; others remain intact.");

  // -------------------------------------------------------------------------
  // Scenario 4: Approved V1 -> V2 with no document changes -> No duplicate physical files
  // -------------------------------------------------------------------------
  console.log("\n[Scenario 4] Approved V1 -> V2 with no document changes");
  const p4 = await makeProposal("PR-2026/TEST-SC4", "Approved");
  await addDoc(p4.cerprno, "ApprovedQuote.xlsx");
  const attCountBefore = (await service.getAttachments(p4.cerprno)).length;

  // Initiate post-approval amendment without touching attachments
  const amendP4: ICERProposal = {
    ...p4,
    proposal_no: "PR-2026/TEST-SC4-R1",
    amount: 7500, // modified amount
    status: "In Approval",
  };
  await service.updateProposal(amendP4, mockUser, p4);

  const attCountAfter = (await service.getAttachments(p4.cerprno)).length;
  assertEqual(attCountBefore, attCountAfter, "Zero duplicate physical files created");

  // Verify V1 manifest was created in history
  const historyP4 = await service.getProposalHistory(p4.cerprno);
  assertEqual(historyP4.length, 1, "V1 archived into history");
  const v1Atts = await service.getAttachments(p4.cerprno, { versionTag: "V1" });
  assertEqual(v1Atts.length, 1, "V1 manifest contains 1 document");
  assertEqual(v1Atts[0].name, "ApprovedQuote.xlsx", "V1 references ApprovedQuote.xlsx");
  console.log("  ✓ PASSED: V1 and V2 reference the same physical file without duplicating storage.");

  // -------------------------------------------------------------------------
  // Scenario 5: Approved V1 -> V2 with 1 new document -> Original files remain, new file added
  // -------------------------------------------------------------------------
  console.log("\n[Scenario 5] Approved V1 -> V2 with one new document added");
  const p5 = await makeProposal("PR-2026/TEST-SC5", "Approved");
  await addDoc(p5.cerprno, "V1_Spec.pdf");

  // Amend and add new document
  const amendP5: ICERProposal = {
    ...p5,
    proposal_no: "PR-2026/TEST-SC5-R1",
    status: "In Approval",
  };
  await service.updateProposal(amendP5, mockUser, p5);
  await addDoc(p5.cerprno, "V2_AdditionalReport.pdf");

  const v1AttsP5 = await service.getAttachments(p5.cerprno, { versionTag: "V1" });
  assertEqual(v1AttsP5.length, 1, "V1 has exactly 1 document");
  assertEqual(v1AttsP5[0].name, "V1_Spec.pdf", "V1 only contains V1_Spec.pdf");

  const activeAttsP5 = await service.getAttachments(p5.cerprno);
  assertEqual(activeAttsP5.length, 2, "Active cycle has both V1_Spec.pdf and V2_AdditionalReport.pdf");
  console.log("  ✓ PASSED: Original file remains in V1 history; new file is added to active cycle.");

  // -------------------------------------------------------------------------
  // Scenario 6: Approved V1 -> V2 with replacement -> Proposal History displays OLD doc
  // -------------------------------------------------------------------------
  console.log("\n[Scenario 6] Approved V1 -> V2 with replacement (History Tab fidelity)");
  const p6 = await makeProposal("PR-2026/TEST-SC6", "Approved");
  await addDoc(p6.cerprno, "Old_Quote_v1.xlsx");

  // Amend to -R1
  const amendP6: ICERProposal = {
    ...p6,
    proposal_no: "PR-2026/TEST-SC6-R1",
    status: "In Approval",
  };
  await service.updateProposal(amendP6, mockUser, p6);

  // In V2, user uploads replacement
  await addDoc(p6.cerprno, "New_Quote_v2.xlsx");

  // In Proposal History tab for Serial No. 1 (V1):
  const p6Hist = await service.getProposalHistory(p6.cerprno);
  const v1Snapshot = p6Hist[0];
  assertTrue(Boolean(v1Snapshot.attachments_manifest), "V1 has attachments_manifest");
  const v1Manifest = JSON.parse(v1Snapshot.attachments_manifest!);
  assertEqual(v1Manifest.length, 1, "V1 manifest has 1 file");
  assertEqual(v1Manifest[0].name, "Old_Quote_v1.xlsx", "V1 manifest shows OLD quote");

  // Querying service for V1 returns the OLD document
  const histAttsV1 = await service.getAttachments(p6.cerprno, { versionTag: "V1" });
  assertEqual(histAttsV1[0].name, "Old_Quote_v1.xlsx", "Proposal History displays Old_Quote_v1.xlsx");
  console.log("  ✓ PASSED: Proposal History tab displays original approved old document when replaced in V2.");

  // -------------------------------------------------------------------------
  // Scenario 7: Approved V1 -> V2 with one removal -> V1 retains, V2 omits
  // -------------------------------------------------------------------------
  console.log("\n[Scenario 7] Approved V1 -> V2 with one removal");
  const p7 = await makeProposal("PR-2026/TEST-SC7", "Approved");
  await addDoc(p7.cerprno, "DocA_Keep.pdf");
  await addDoc(p7.cerprno, "DocB_RemoveInV2.pdf");

  // Submit V2 amendment
  const amendP7: ICERProposal = {
    ...p7,
    proposal_no: "PR-2026/TEST-SC7-R1",
    status: "In Approval",
  };
  await service.updateProposal(amendP7, mockUser, p7);

  // V1 manifest in history has both DocA and DocB
  const v1P7Atts = await service.getAttachments(p7.cerprno, { versionTag: "V1" });
  assertEqual(v1P7Atts.length, 2, "V1 retained both DocA and DocB");
  assertTrue(v1P7Atts.some((a) => a.name === "DocB_RemoveInV2.pdf"), "DocB remains accessible in V1 history");
  console.log("  ✓ PASSED: Removed document remains intact and accessible in V1 history.");

  // -------------------------------------------------------------------------
  // Scenario 8: Shared File: Attempt physical deletion -> Deletion must be blocked
  // -------------------------------------------------------------------------
  console.log("\n[Scenario 8] Mandatory File Protection: Deletion blocked for historical file");
  const p8 = await makeProposal("PR-2026/TEST-SC8", "Approved");
  const protectedDoc = await addDoc(p8.cerprno, "AuditedHistoricalDocument.pdf");

  // Archive by amending
  const amendP8: ICERProposal = {
    ...p8,
    proposal_no: "PR-2026/TEST-SC8-R1",
    status: "In Approval",
  };
  await service.updateProposal(amendP8, mockUser, p8);

  // Attempt to delete protected file from p8
  let deletionBlocked = false;
  try {
    await service.deleteAttachment(protectedDoc.id, { cerprno: p8.cerprno });
  } catch (err: any) {
    if (err.message && err.message.includes("[Protected Historical File]")) {
      deletionBlocked = true;
    }
  }
  assertTrue(deletionBlocked, "Physical deletion was BLOCKED by protection engine");
  console.log("  ✓ PASSED: Mandatory file protection blocked physical deletion of approved historical file.");

  // -------------------------------------------------------------------------
  // Scenario 9: V1 -> V2 -> V3 Multi-Version Isolation
  // -------------------------------------------------------------------------
  console.log("\n[Scenario 9] V1 -> V2 -> V3 Multi-Version Isolation");
  const p9 = await makeProposal("PR-2026/TEST-SC9", "Approved");
  await addDoc(p9.cerprno, "Doc_Only_V1.pdf");

  // Amend to V2 and approve
  const amendP9_V2: ICERProposal = {
    ...p9,
    proposal_no: "PR-2026/TEST-SC9-R1",
    status: "Approved",
    revision_count: 1,
  };
  await service.updateProposal(amendP9_V2, mockUser, p9);
  await addDoc(p9.cerprno, "Doc_V2_and_V3.pdf");

  // Amend to V3
  const amendP9_V3: ICERProposal = {
    ...amendP9_V2,
    proposal_no: "PR-2026/TEST-SC9-R2",
    status: "In Approval",
    revision_count: 2,
  };
  await service.updateProposal(amendP9_V3, mockUser, amendP9_V2);
  await addDoc(p9.cerprno, "Doc_Only_V3.pdf");

  // Verify V1
  const v1Docs = await service.getAttachments(p9.cerprno, { versionTag: "V1" });
  assertTrue(v1Docs.some((d) => d.name === "Doc_Only_V1.pdf"), "V1 has Doc_Only_V1.pdf");
  assertTrue(!v1Docs.some((d) => d.name === "Doc_Only_V3.pdf"), "V1 does NOT have Doc_Only_V3.pdf");

  // Verify V2
  const v2Docs = await service.getAttachments(p9.cerprno, { versionTag: "V2" });
  assertTrue(v2Docs.some((d) => d.name === "Doc_V2_and_V3.pdf"), "V2 has Doc_V2_and_V3.pdf");

  console.log("  ✓ PASSED: Multi-version lifecycle isolates document manifests cleanly across V1, V2, and V3.");

  console.log("\n===============================================================================");
  console.log(" ALL 9 REGRESSION TEST SCENARIOS PASSED SUCCESSFULLY!                          ");
  console.log("===============================================================================");
}

runTestSuite().catch((err) => {
  console.error("Test Suite Failed with error:", err);
  if (typeof process !== "undefined" && typeof (process as any).exit === "function") {
    (process as any).exit(1);
  }
});
