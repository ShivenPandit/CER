export {};

declare const process: any;

import { LocalMockCERDataService } from "../services/LocalMockCERDataService";
import { ICERProposal } from "../models/CERModel";
import { ICERAttachment } from "../models/AttachmentModel";
import { FIXED_APPROVAL_STAGES, partitionDecisionsByVersion, IProposalVersionEntry } from "../components/ApprovalWorkflow/StatusHistoryModal";
import { IApprovalDecision } from "../models/WorkflowModel";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`❌ [FAIL] ${message}`);
    process.exit(1);
  }
  console.log(`✔ [PASS] ${message}`);
}

async function runProposalsHistoryProtectionTests(): Promise<void> {
  console.log("================================================================================");
  console.log(" CER PROPOSALS HISTORY PROTECTION & V1/V2/V3 LINEAGE VERIFICATION SUITE");
  console.log("================================================================================\n");

  const service = new LocalMockCERDataService();
  const mockUser = { name: "Alice Project Owner", email: "alice@company.com" };
  const approvalLevels = [1, 2, 3, 4, 5, 6];

  // ---------------------------------------------------------------------------
  // TEST 1: Proposal Number Validation & Self-Reuse Across Revisions
  // ---------------------------------------------------------------------------
  console.log("--- TEST 1: Proposal No Uniqueness Against Other Projects & Self-Reuse ---");

  const baseProp1: Partial<ICERProposal> = {
    pr_name: "Original Capital Project Alpha",
    proposal_no: "PR-2026/LINEAGE-01",
    sbu: "RJ North",
    amount: 10000,
    currency: "USD",
    cat: "Vital",
    owname: mockUser.name,
    owner_email: mockUser.email,
    created_by: mockUser.name,
    status: "Approved",
    current_level: 6,
    object: "Capital replacement phase 1",
  };

  const res1 = await service.createProposal(baseProp1 as ICERProposal);
  const created1: ICERProposal = (res1 as any).proposal || res1;
  const cerId1: string = String(created1.cerprno || created1.cer_proposal_id || "CER-2026-0004");
  assert(Boolean(cerId1), `1a. First proposal created with permanent ID: ${cerId1}`);
  assert(created1.proposal_no === "PR-2026/LINEAGE-01", "1b. First proposal has PR-2026/LINEAGE-01");

  // Attempting to create a second proposal with the same proposal_no must be blocked
  let duplicateBlocked = false;
  try {
    await service.createProposal({
      ...baseProp1,
      pr_name: "Conflicting Beta Project",
      proposal_no: "PR-2026/LINEAGE-01",
    } as ICERProposal);
  } catch (err: any) {
    if (err.message && err.message.includes("already exists")) {
      duplicateBlocked = true;
    }
  }
  assert(duplicateBlocked, "1c. Uniqueness validation successfully blocked different project from duplicating proposal_no");

  // ---------------------------------------------------------------------------
  // TEST 2: V1 Initial Snapshot and Attachment Binding
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 2: V1 Initial Snapshot & Attachment Binding ---");

  // Attach Document A to V1
  const docA: ICERAttachment = {
    id: "att-v1-docA",
    name: "Engineering_Specs_V1.pdf",
    size: 2048,
    type: "application/pdf",
    cerprno: cerId1,
    uploaded_by: mockUser.name,
    uploaded_date: "2026-11-01T10:00:00Z",
    server_relative_url: `/sites/CER/CERAttachments/${cerId1}_Engineering_Specs_V1.pdf`,
  };
  const addedDocA = await service.addAttachment(docA);

  const approvedV1 = await service.getProposalByNumber(cerId1);
  assert(approvedV1 !== null && approvedV1.status === "Approved", "2a. Proposal V1 is fully Approved");
  assert(Number(approvedV1?.revision_count || 0) === 0, "2b. V1 revision_count is 0");

  // ---------------------------------------------------------------------------
  // TEST 3: Resubmit V2 with SAME Proposal No (Self-Reuse)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 3: Post-Approval Resubmission V2 with SAME Proposal No ---");

  // User amends proposal: keeps PR-2026/LINEAGE-01, increases amount to 25,000, replaces Doc A with Doc B
  const docB: ICERAttachment = {
    id: "att-v2-docB",
    name: "Engineering_Specs_V2_Updated.pdf",
    size: 4096,
    type: "application/pdf",
    cerprno: cerId1,
    uploaded_by: mockUser.name,
    uploaded_date: "2026-11-03T14:00:00Z",
    server_relative_url: `/sites/CER/CERAttachments/${cerId1}_Engineering_Specs_V2_Updated.pdf`,
  };
  await service.addAttachment(docB);

  const resV2 = await service.updateProposal(
    {
      ...approvedV1!,
      amount: 25000,
      proposal_no: "PR-2026/LINEAGE-01", // SAME proposal number!
      status: "In Approval",
      current_level: 1,
    },
    mockUser,
    approvedV1!,
    {
      removedAttachmentIds: [addedDocA.id],
    }
  );
  const resubmittedV2: ICERProposal = (resV2 as any).proposal || resV2;

  assert(resubmittedV2.status === "In Approval", "3a. V2 active proposal status reset to 'In Approval'");
  assert(resubmittedV2.amount === 25000, "3b. V2 active proposal amount updated to 25,000");
  assert(resubmittedV2.proposal_no === "PR-2026/LINEAGE-01", "3c. V2 retained same proposal_no without duplicate error");
  assert(Number(resubmittedV2.revision_count) === 1, "3d. V2 active proposal revision_count incremented to 1");

  // Inspect History: V1 snapshot MUST be safely preserved in CERProposalsHistory
  const historyAfterV2 = await service.getProposalHistory(cerId1);
  assert(historyAfterV2.length === 1, `3e. History contains exactly 1 archived snapshot (got: ${historyAfterV2.length})`);
  const snap1 = historyAfterV2[0];
  assert(snap1.version === "V1", `3f. Archived snapshot is tagged 'V1' (got: ${snap1.version})`);
  assert(snap1.amount === 10000, `3g. Archived V1 preserves original amount 10,000 (got: ${snap1.amount})`);
  assert(snap1.proposal_no === "PR-2026/LINEAGE-01", "3h. Archived V1 preserves proposal_no PR-2026/LINEAGE-01");
  assert(snap1.status === "Approved", "3i. Archived V1 status is 'Approved'");

  // ---------------------------------------------------------------------------
  // TEST 4: Approve V2 and Resubmit V3 with MODIFIED Proposal No
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 4: V2 Approval & Resubmission V3 with MODIFIED Proposal No ---");

  // Approve V2 using the dynamically configured approver emails for each level
  const activeLevels = await service.getWorkflowLevels(resubmittedV2.sbu || "RJ North");
  for (const lvl of activeLevels) {
    const approverEmail = lvl.is_project_owner_stage
      ? (resubmittedV2.owner_email || mockUser.email)
      : (lvl.approver_email || "admin@example.com");
    await service.recordDecision({
      cerprno: cerId1,
      level_id: lvl.level_id,
      decision: "APPROVED",
      approver_name: lvl.approver_name || "Approver",
      approver_email: approverEmail,
      comments: `V2 Level ${lvl.level_id} Endorsement`,
    });
  }

  const approvedV2 = await service.getProposalByNumber(cerId1);
  assert(approvedV2 !== null && approvedV2.status === "Approved", "4a. Proposal V2 is fully Approved");
  assert(Number(approvedV2?.revision_count) === 1, "4b. V2 revision_count is 1");

  // User amends proposal again for V3: changes proposal_no to PR-2026/LINEAGE-01-REV, increases amount to 40,000
  const resV3 = await service.updateProposal(
    {
      ...approvedV2!,
      amount: 40000,
      proposal_no: "PR-2026/LINEAGE-01-REV", // CHANGED proposal number!
      status: "In Approval",
      current_level: 1,
    },
    mockUser,
    approvedV2!
  );
  const resubmittedV3: ICERProposal = (resV3 as any).proposal || resV3;

  assert(resubmittedV3.status === "In Approval", "4c. V3 active proposal status reset to 'In Approval'");
  assert(resubmittedV3.amount === 40000, "4d. V3 active proposal amount updated to 40,000");
  assert(resubmittedV3.proposal_no === "PR-2026/LINEAGE-01-REV", "4e. V3 updated to new proposal_no PR-2026/LINEAGE-01-REV");
  assert(Number(resubmittedV3.revision_count) === 2, "4f. V3 active proposal revision_count incremented to 2");

  // ---------------------------------------------------------------------------
  // TEST 5: Verify Multi-Version Lineage & Immutability ($V1 \to V2 \to V3$)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 5: Multi-Version Immutability & Query Lineage ---");

  const fullHistory = await service.getProposalHistory(cerId1);
  assert(fullHistory.length === 2, `5a. Full history has exactly 2 snapshots for cerPrId: V1 and V2 (got: ${fullHistory.length})`);

  const v1Found = fullHistory.find((h) => h.version === "V1");
  const v2Found = fullHistory.find((h) => h.version === "V2");

  assert(Boolean(v1Found), "5b. Snapshot V1 exists");
  assert(Boolean(v2Found), "5c. Snapshot V2 exists");

  assert(v1Found?.amount === 10000, `5d. V1 amount is strictly 10,000 (got: ${v1Found?.amount})`);
  assert(v1Found?.proposal_no === "PR-2026/LINEAGE-01", "5e. V1 proposal_no is PR-2026/LINEAGE-01");

  assert(v2Found?.amount === 25000, `5f. V2 amount is strictly 25,000 (got: ${v2Found?.amount})`);
  assert(v2Found?.proposal_no === "PR-2026/LINEAGE-01", "5g. V2 proposal_no is PR-2026/LINEAGE-01");

  const activeV3 = await service.getProposalByNumber(cerId1);
  assert(activeV3?.amount === 40000, `5h. Active V3 amount is strictly 40,000 (got: ${activeV3?.amount})`);
  assert(activeV3?.proposal_no === "PR-2026/LINEAGE-01-REV", "5i. Active V3 proposal_no is PR-2026/LINEAGE-01-REV");

  // ---------------------------------------------------------------------------
  // TEST 6: Retry Reconciliation (No False V2 Created on Retry)
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 6: Archival Retry Reconciliation (No Duplicate Versions) ---");

  // Simulate retrying the V2 archival operation with approvedV2
  // Because approvedV2 has revision_count = 1, it targets V2.
  // V2 already exists in history. The system must reconcile V2 in-place and NOT create V3!
  await (service as any).archiveApprovedProposal(approvedV2!);

  const historyAfterRetry = await service.getProposalHistory(cerId1);
  assert(
    historyAfterRetry.length === 2,
    `6a. History count remains exactly 2 after retry of V2 archival (got: ${historyAfterRetry.length})`
  );
  const versions = historyAfterRetry.map((h) => h.version).sort();
  assert(
    versions.join(",") === "V1,V2",
    `6b. Versions are strictly ['V1', 'V2'], no duplicate or false V3 created (got: ${versions.join(",")})`
  );

  // ---------------------------------------------------------------------------
  // TEST 7: Exhaustive Attachment Manifest Protection
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 7: Attachment Protection Across All Historical Manifests ---");

  // Doc A was part of V1 approved manifest. In V2, it was replaced.
  // Attempting to physically delete Doc A must be BLOCKED!
  let docADeleteBlocked = false;
  try {
    await service.deleteAttachment(addedDocA.id, { cerprno: cerId1 });
  } catch (err: any) {
    if (err.message && err.message.includes("[Protected Historical File]")) {
      docADeleteBlocked = true;
    }
  }
  assert(docADeleteBlocked, "7a. Physical deletion of Doc A was blocked because Doc A is part of V1 audit manifest");

  // ---------------------------------------------------------------------------
  // TEST 8: StatusHistoryModal Stage 2 "CER Owner" & Decision Partitioning
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 8: StatusHistoryModal 'CER Owner' Naming & Partitioning ---");

  assert(
    FIXED_APPROVAL_STAGES[1].level === 2 && FIXED_APPROVAL_STAGES[1].name === "CER Owner",
    `8a. Stage 2 in FIXED_APPROVAL_STAGES is 'CER Owner' (got: ${FIXED_APPROVAL_STAGES[1].name})`
  );

  const mockVersionEntries: IProposalVersionEntry[] = [
    {
      id: "CURRENT",
      serialNo: 3,
      versionLabel: "Serial No. 3",
      isCurrent: true,
      proposalNo: "PR-2026/LINEAGE-01-REV",
      status: "In Approval",
      amount: 40000,
      currency: "USD",
      dateStr: "05 Nov 2026",
      rawProposal: activeV3!,
    },
    {
      id: "HIST_2",
      serialNo: 2,
      versionLabel: "Serial No. 2",
      isCurrent: false,
      proposalNo: "PR-2026/LINEAGE-01",
      status: "Approved",
      amount: 25000,
      currency: "USD",
      dateStr: "03 Nov 2026",
      rawProposal: v2Found!,
    },
    {
      id: "HIST_1",
      serialNo: 1,
      versionLabel: "Serial No. 1",
      isCurrent: false,
      proposalNo: "PR-2026/LINEAGE-01",
      status: "Approved",
      amount: 10000,
      currency: "USD",
      dateStr: "01 Nov 2026",
      rawProposal: v1Found!,
    },
  ];

  const decisionsV1: IApprovalDecision[] = approvalLevels.map((lvl) => ({
    id: `dec-v1-${lvl}`,
    cerprno: cerId1,
    level_id: lvl,
    level_name: `Level ${lvl}`,
    decision: "APPROVED",
    approver_name: `Approver L${lvl}`,
    approver_email: `approver${lvl}@company.com`,
    comments: `Comments L${lvl}`,
    version: "V1",
    timestamp: `2026-11-01T1${lvl}:00:00Z`,
  }));

  const decisionsV2: IApprovalDecision[] = approvalLevels.map((lvl) => ({
    id: `dec-v2-${lvl}`,
    cerprno: cerId1,
    level_id: lvl,
    level_name: `Level ${lvl}`,
    decision: "APPROVED",
    approver_name: `Approver L${lvl}`,
    approver_email: `approver${lvl}@company.com`,
    comments: `Comments L${lvl}`,
    version: "V2",
    timestamp: `2026-11-03T1${lvl}:00:00Z`,
  }));

  const allDecisions = [...decisionsV1, ...decisionsV2];
  const partitioned = partitionDecisionsByVersion(allDecisions, mockVersionEntries);

  assert(partitioned["HIST_1"].length === 6, `8b. HIST_1 received all 6 decisions from V1 (got: ${partitioned["HIST_1"].length})`);
  assert(partitioned["HIST_2"].length === 6, `8c. HIST_2 received all 6 decisions from V2 (got: ${partitioned["HIST_2"].length})`);
  assert(partitioned["CURRENT"].length === 0, `8d. CURRENT (V3 in approval) has 0 prior decisions (got: ${partitioned["CURRENT"].length})`);

  console.log("\n================================================================================");
  console.log(" ALL PROPOSALS HISTORY PROTECTION & LINEAGE VERIFICATIONS PASSED!");
  console.log("================================================================================");
}

runProposalsHistoryProtectionTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
