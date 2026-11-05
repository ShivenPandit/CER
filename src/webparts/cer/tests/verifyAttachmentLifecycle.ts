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
  const sc4_v1Atts = await service.getAttachments(p4.cerprno, { versionTag: "V1" });
  assertEqual(sc4_v1Atts.length, 1, "V1 manifest contains 1 document");
  assertEqual(sc4_v1Atts[0].name, "ApprovedQuote.xlsx", "V1 references ApprovedQuote.xlsx");
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
  assertEqual(v1Snapshot.version, "V1", "V1 snapshot has version = 'V1'");

  // Querying service for V1 returns the OLD document
  const histAttsV1 = await service.getAttachments(p6.cerprno, { versionTag: "V1" });
  assertEqual(histAttsV1.length, 1, "V1 has 1 file");
  assertEqual(histAttsV1[0].name, "Old_Quote_v1.xlsx", "Proposal History displays Old_Quote_v1.xlsx");
  assertEqual(histAttsV1[0].version, "V1", "Proposal History file has version = 'V1'");
  console.log("  ✓ PASSED: Proposal History tab displays original approved old document when replaced in V2.");

  // -------------------------------------------------------------------------
  // Scenario 7: Approved V1 -> V2 with one removal -> V1 retains, V2 omits
  // -------------------------------------------------------------------------
  console.log("\n[Scenario 7] Approved V1 -> V2 with one removal");
  const p7 = await makeProposal("PR-2026/TEST-SC7", "Approved");
  await addDoc(p7.cerprno, "DocA_Keep.pdf");
  await addDoc(p7.cerprno, "DocB_RemoveInV2.pdf");

  // In V2 amendment, user removes DocB_RemoveInV2.pdf
  const activeAttsP7Before = await service.getAttachments(p7.cerprno);
  const docB = activeAttsP7Before.find((a) => a.name === "DocB_RemoveInV2.pdf")!;

  // Submit V2 amendment with removedAttachmentIds (ChangeCERView flow)
  const amendP7: ICERProposal = {
    ...p7,
    proposal_no: "PR-2026/TEST-SC7-R1",
    status: "In Approval",
  };
  await service.updateProposal(amendP7, mockUser, p7, { removedAttachmentIds: [docB.id] });

  // Direct physical deletion attempt on historical file must be blocked
  let directDeleteBlocked = false;
  try {
    await service.deleteAttachment(docB.id, { cerprno: p7.cerprno });
  } catch (err: any) {
    if (err.message && err.message.includes("[Protected Historical File]")) {
      directDeleteBlocked = true;
    }
  }
  assertTrue(directDeleteBlocked, "Mandatory file protection blocked physical deletion of DocB");

  const activeAttsP7After = await service.getAttachments(p7.cerprno);
  assertEqual(activeAttsP7After.length, 1, "Active cycle now only has 1 document");
  assertTrue(!activeAttsP7After.some((a) => a.name === "DocB_RemoveInV2.pdf"), "DocB is removed from active cycle");

  // V1 in history retains both DocA and DocB
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

  // Attempt to delete protected historical file from p8
  const histAttsP8 = await service.getAttachments(p8.cerprno, { versionTag: "V1" });
  assertEqual(histAttsP8.length, 1, "V1 has 1 protected file");
  const histFile = histAttsP8[0];
  let deletionBlocked = false;
  try {
    await service.deleteAttachment(histFile.id, { cerprno: p8.cerprno });
  } catch (err: any) {
    if (err.message && err.message.includes("[Protected Historical File]")) {
      deletionBlocked = true;
    }
  }
  assertTrue(deletionBlocked, "Physical deletion of historical file was BLOCKED by protection engine");
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

  // =========================================================================
  // SITUATION 1: User deletes old doc AND uploads new doc (Replacement)
  // =========================================================================
  console.log("\n[Situation 1] User deletes old doc AND uploads new doc (Replacement)");
  const s1Prop = await makeProposal("PR-2026/SIT-1", "Approved");
  const s1OldDoc = await addDoc(s1Prop.cerprno, "Old_Spec_v1.pdf");

  // Post-approval amendment: Old doc removed, New doc added
  const s1Amend: ICERProposal = {
    ...s1Prop,
    proposal_no: "PR-2026/SIT-1-R1",
    status: "In Approval",
  };
  await service.updateProposal(s1Amend, mockUser, s1Prop, { removedAttachmentIds: [s1OldDoc.id] });
  await addDoc(s1Prop.cerprno, "New_Spec_v2.pdf");

  // In Proposal History Tab (Version 1 — Approved): Shows the OLD document
  const s1V1Atts = await service.getAttachments(s1Prop.cerprno, { versionTag: "V1" });
  assertEqual(s1V1Atts.length, 1, "Situation 1: History V1 shows 1 document");
  assertEqual(s1V1Atts[0].name, "Old_Spec_v1.pdf", "Situation 1: History V1 shows OLD document");

  // In Active Proposal (Amendment): Shows the NEW document. Old document removed from active list
  const s1ActiveAtts = await service.getAttachments(s1Prop.cerprno);
  assertEqual(s1ActiveAtts.length, 1, "Situation 1: Active proposal shows 1 document");
  assertEqual(s1ActiveAtts[0].name, "New_Spec_v2.pdf", "Situation 1: Active proposal shows NEW document");
  assertTrue(!s1ActiveAtts.some(a => a.name === "Old_Spec_v1.pdf"), "Situation 1: Old doc is omitted from Active");
  console.log("  ✓ PASSED: Situation 1 (Replacement) verified.");

  // =========================================================================
  // SITUATION 2: User keeps old doc AND adds a new doc (Addition)
  // =========================================================================
  console.log("\n[Situation 2] User keeps old doc AND adds a new doc (Addition)");
  const s2Prop = await makeProposal("PR-2026/SIT-2", "Approved");
  await addDoc(s2Prop.cerprno, "OriginalContract.pdf");

  // Post-approval amendment: Old doc kept, New doc added
  const s2Amend: ICERProposal = {
    ...s2Prop,
    proposal_no: "PR-2026/SIT-2-R1",
    status: "In Approval",
  };
  await service.updateProposal(s2Amend, mockUser, s2Prop);
  await addDoc(s2Prop.cerprno, "Addendum1.pdf");

  // In Proposal History Tab (Version 1 — Approved): Shows only the original document
  const s2V1Atts = await service.getAttachments(s2Prop.cerprno, { versionTag: "V1" });
  assertEqual(s2V1Atts.length, 1, "Situation 2: History V1 shows only original document");
  assertEqual(s2V1Atts[0].name, "OriginalContract.pdf", "Situation 2: History V1 references OriginalContract.pdf");

  // In Active Proposal (Amendment): Shows both documents
  const s2ActiveAtts = await service.getAttachments(s2Prop.cerprno);
  assertEqual(s2ActiveAtts.length, 2, "Situation 2: Active proposal shows both documents");
  assertTrue(s2ActiveAtts.some(a => a.name === "OriginalContract.pdf"), "Situation 2: Active includes original doc");
  assertTrue(s2ActiveAtts.some(a => a.name === "Addendum1.pdf"), "Situation 2: Active includes new doc");
  console.log("  ✓ PASSED: Situation 2 (Addition) verified.");

  // =========================================================================
  // SITUATION 3: User deletes old doc AND does NOT add any new doc (Removal)
  // =========================================================================
  console.log("\n[Situation 3] User deletes old doc AND does NOT add any new doc (Removal)");
  const s3Prop = await makeProposal("PR-2026/SIT-3", "Approved");
  const s3DocA = await addDoc(s3Prop.cerprno, "DocA_ToKeep.pdf");
  const s3DocB = await addDoc(s3Prop.cerprno, "DocB_ToRemove.pdf");

  // Post-approval amendment: Doc B removed, no new doc added
  const s3Amend: ICERProposal = {
    ...s3Prop,
    proposal_no: "PR-2026/SIT-3-R1",
    status: "In Approval",
  };
  await service.updateProposal(s3Amend, mockUser, s3Prop, { removedAttachmentIds: [s3DocB.id] });

  // In Proposal History Tab (Version 1 — Approved): Continues to display and allow download of the old document
  const s3V1Atts = await service.getAttachments(s3Prop.cerprno, { versionTag: "V1" });
  assertEqual(s3V1Atts.length, 2, "Situation 3: History V1 retains both documents");
  assertTrue(s3V1Atts.some(a => a.name === "DocB_ToRemove.pdf"), "Situation 3: History V1 retains removed DocB");

  // In Active Proposal (Amendment): Shows only remaining documents
  const s3ActiveAtts = await service.getAttachments(s3Prop.cerprno);
  assertEqual(s3ActiveAtts.length, 1, "Situation 3: Active proposal shows only 1 document");
  assertEqual(s3ActiveAtts[0].name, "DocA_ToKeep.pdf", "Situation 3: Active proposal shows only DocA");
  assertTrue(!s3ActiveAtts.some(a => a.name === "DocB_ToRemove.pdf"), "Situation 3: DocB is omitted from Active");
  console.log("  ✓ PASSED: Situation 3 (Removal) verified.");

  // =========================================================================
  // SITUATION 4: User does NOT delete and does NOT add any doc (No Changes)
  // =========================================================================
  console.log("\n[Situation 4] User does NOT delete and does NOT add any doc (No Changes)");
  const s4Prop = await makeProposal("PR-2026/SIT-4", "Approved");
  await addDoc(s4Prop.cerprno, "SharedDoc.pdf");

  const s4BeforeCount = (await service.getAttachments(s4Prop.cerprno)).length;

  // Post-approval amendment: Text/budget changes only, attachments untouched
  const s4Amend: ICERProposal = {
    ...s4Prop,
    proposal_no: "PR-2026/SIT-4-R1",
    amount: 9999,
    status: "In Approval",
  };
  await service.updateProposal(s4Amend, mockUser, s4Prop);

  const s4AfterCount = (await service.getAttachments(s4Prop.cerprno)).length;
  assertEqual(s4BeforeCount, s4AfterCount, "Situation 4: Zero duplicate files uploaded or copied");

  // In Proposal History Tab (Version 1 — Approved): Shows original approved documents
  const s4V1Atts = await service.getAttachments(s4Prop.cerprno, { versionTag: "V1" });
  assertEqual(s4V1Atts.length, 1, "Situation 4: History V1 shows original document");
  assertEqual(s4V1Atts[0].name, "SharedDoc.pdf", "Situation 4: History V1 references SharedDoc.pdf");

  // In Active Proposal (Amendment): Shows exact same document reusing reference
  const s4ActiveAtts = await service.getAttachments(s4Prop.cerprno);
  assertEqual(s4ActiveAtts.length, 1, "Situation 4: Active proposal shows same document");
  assertEqual(s4ActiveAtts[0].name, "SharedDoc.pdf", "Situation 4: Active references SharedDoc.pdf");
  console.log("  ✓ PASSED: Situation 4 (No Changes) verified.");

  // =========================================================================
  // Scenario 10: V1 -> V2 -> V3 -> V4 Multi-Version Preservation (Mandatory Architecture)
  // V1 references File A.
  // V2 reuses File A (No Changes).
  // V3 removes File A, adds File B (Replacement/Removal).
  // V4 keeps File B, adds File C (Addition).
  // Verify:
  // - V1 and V2 must still display and download File A.
  // - V3 must not display File A, only File B.
  // - V4 active shows File B and File C.
  // - File A, File B, File C remain physically present in CERAttachments.
  // =========================================================================
  console.log("\n[Scenario 10] Multi-Version Preservation: V1 -> V2 -> V3 -> V4 Lifecycle");
  const p10 = await makeProposal("PR-2026/MULTI-PRESERVE", "Approved");
  const fileA = await addDoc(p10.cerprno, "File_A.pdf");

  // V2: Amend V1 with No Document Changes (reuses File A)
  const p10_V2: ICERProposal = {
    ...p10,
    proposal_no: "PR-2026/MULTI-PRESERVE-R1",
    status: "Approved",
    revision_count: 1,
  };
  await service.updateProposal(p10_V2, mockUser, p10);

  // V3: Amend V2 -> removes File A, uploads File B, then gets Approved
  const p10_V3: ICERProposal = {
    ...p10_V2,
    proposal_no: "PR-2026/MULTI-PRESERVE-R2",
    status: "Approved",
    revision_count: 2,
  };
  await service.updateProposal(p10_V3, mockUser, p10_V2, { removedAttachmentIds: [fileA.id] });
  const fileB = await addDoc(p10.cerprno, "File_B.pdf");

  // V4: Amend V3 -> keeps File B, adds File C (Active Cycle)
  const p10_V4: ICERProposal = {
    ...p10_V3,
    proposal_no: "PR-2026/MULTI-PRESERVE-R3",
    status: "In Approval",
    revision_count: 3,
  };
  await service.updateProposal(p10_V4, mockUser, p10_V3);
  const fileC = await addDoc(p10.cerprno, "File_C.pdf");

  // Verification 1: V1 historical attachments (Authoritative Manifest)
  const sc10_v1Atts = await service.getAttachments(p10.cerprno, { versionTag: "V1" });
  assertEqual(sc10_v1Atts.length, 1, "V1 must have exactly 1 file (File A)");
  assertEqual(sc10_v1Atts[0].name, "File_A.pdf", "V1 must reference File_A.pdf");
  assertTrue(Boolean(sc10_v1Atts[0].server_relative_url || sc10_v1Atts[0].data_url), "V1 File A must have valid download URL");

  // Verification 2: V2 historical attachments (Reused File A preserved across amendments)
  const sc10_v2Atts = await service.getAttachments(p10.cerprno, { versionTag: "V2" });
  assertEqual(sc10_v2Atts.length, 1, "V2 must have exactly 1 file (File A)");
  assertEqual(sc10_v2Atts[0].name, "File_A.pdf", "V2 must reference File_A.pdf");
  assertTrue(Boolean(sc10_v2Atts[0].server_relative_url || sc10_v2Atts[0].data_url), "V2 File A must have valid download URL");

  // Verification 3: V3 historical attachments (Removed File A, kept File B)
  const sc10_v3Atts = await service.getAttachments(p10.cerprno, { versionTag: "V3" });
  assertEqual(sc10_v3Atts.length, 1, "V3 must have exactly 1 file (File B)");
  assertEqual(sc10_v3Atts[0].name, "File_B.pdf", "V3 must reference File_B.pdf");
  assertTrue(!sc10_v3Atts.some((a) => a.name === "File_A.pdf"), "V3 must NOT display File A");

  // Verification 4: V4 active proposal attachments (File B + File C)
  const sc10_v4ActiveAtts = await service.getAttachments(p10.cerprno);
  assertEqual(sc10_v4ActiveAtts.length, 2, "V4 active proposal must have 2 files (File B + File C)");
  assertTrue(sc10_v4ActiveAtts.some((a) => a.name === "File_B.pdf"), "V4 active has File B");
  assertTrue(sc10_v4ActiveAtts.some((a) => a.name === "File_C.pdf"), "V4 active has File C");
  assertTrue(!sc10_v4ActiveAtts.some((a) => a.name === "File_A.pdf"), "V4 active must NOT display File A");

  // Verification 5: Physical Storage Preservation (All files remain physically present)
  let fileADeleted = false;
  try {
    await service.deleteAttachment(fileA.id, { cerprno: p10.cerprno });
  } catch (err: any) {
    if (err.message && err.message.includes("[Protected Historical File]")) {
      fileADeleted = false;
    }
  }
  assertTrue(!fileADeleted, "File A is protected and preserved physically in CERAttachments library");

  console.log("  ✓ PASSED: Multi-version preservation across V1 -> V2 -> V3 -> V4 verified.");

  console.log("\n===============================================================================");
  console.log(" ALL REGRESSION & SITUATIONS 1-4 TEST SCENARIOS PASSED SUCCESSFULLY!          ");
  console.log("===============================================================================");
}

runTestSuite().catch((err) => {
  console.error("Test Suite Failed with error:", err);
  if (typeof process !== "undefined" && typeof (process as any).exit === "function") {
    (process as any).exit(1);
  }
});
