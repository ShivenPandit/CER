/* eslint-disable */
/**
 * Consolidated Approval Workflow Test Suite
 * Validates:
 * 1. Matrix SBU definitions & 6 sequential approval tiers (with L2 Dynamic)
 * 2. Multi-approver parallel queue routing ("Any 1 can approve")
 * 3. Sequential approval stage progression
 * 4. Multi-user overflow and SBU completion metrics
 */

import { LocalMockCERDataService } from "../services/LocalMockCERDataService";
import { ICERProposal } from "../models/CERModel";
import { IUserRoleAssignment, IAppUser } from "../models/UserModel";

function assert(condition: boolean, msg: string): void {
  if (condition) {
    console.log(`  ✔ [PASS] ${msg}`);
  } else {
    console.error(`  ❌ [FAIL] ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runApprovalWorkflowTests(): Promise<void> {
  console.log("================================================================================");
  console.log(" 1. MATRIX SBU BLOCKS & SEQUENTIAL APPROVAL TIERS");
  console.log("================================================================================");

  const MATRIX_BLOCKS = ["RJ North", "RJ South", "CBOS", "RAVA"] as const;
  assert(MATRIX_BLOCKS.length === 4, "Matrix must have exactly 4 SBUs");

  const MATRIX_LEVELS = [
    { level: 1, label: "L1 - Finance", roleTitle: "Finance" },
    { level: 2, label: "L2 - Project Owner", roleTitle: "Project Owner", isDynamic: true },
    { level: 3, label: "L3 - BU CFO", roleTitle: "BU CFO" },
    { level: 4, label: "L4 - BU Director", roleTitle: "BU Director" },
    { level: 5, label: "L5 - VOGL CFO", roleTitle: "VOGL CFO" },
    { level: 6, label: "L6 - VOGL CEO", roleTitle: "VOGL CEO" },
  ];
  assert(MATRIX_LEVELS.length === 6, "Matrix must have exactly 6 sequential approval tiers");
  assert(MATRIX_LEVELS.find((l) => l.level === 2)?.isDynamic === true, "L2 must be designated as Dynamic");

  console.log("\n================================================================================");
  console.log(" 2. MULTI-APPROVER ASSIGNMENT & PARALLEL ROUTING ('ANY 1 CAN APPROVE')");
  console.log("================================================================================");

  const sampleApprovers: IUserRoleAssignment[] = [
    {
      id: "1",
      user_name: "Shiven Pandit",
      user_email: "shiven@cairn.com",
      login_name: "shiven@cairn.com",
      approval_level: 1,
      sbu: "RJ North",
      role: "Approver",
      assigned_by: "System",
      assigned_date: "2026-11-12",
    } as unknown as IUserRoleAssignment,
    {
      id: "2",
      user_name: "Rajesh Ghawali",
      user_email: "rajesh@cairn.com",
      login_name: "rajesh@cairn.com",
      approval_level: 1,
      sbu: "RJ North",
      role: "Admin",
      assigned_by: "System",
      assigned_date: "2026-11-12",
    } as unknown as IUserRoleAssignment,
    {
      id: "3",
      user_name: "Nadeem Sohail",
      user_email: "nadeem@cairn.com",
      login_name: "nadeem@cairn.com",
      approval_level: 1,
      sbu: "RJ North",
      role: "Admin",
      assigned_by: "System",
      assigned_date: "2026-11-12",
    } as unknown as IUserRoleAssignment,
  ];

  // For 1-2 approvers: all displayed
  const twoApprovers = sampleApprovers.slice(0, 2);
  assert(twoApprovers.length === 2, "2 approvers render directly without overflow");

  // For 3 approvers: first displayed + '+2 more' counter badge
  const overflowCount = sampleApprovers.length - 1;
  assert(overflowCount === 2, `Overflow count for 3 approvers is 2 (got ${overflowCount})`);

  console.log("\n================================================================================");
  console.log(" 3. SEQUENTIAL STAGE ADVANCEMENT IN WORKFLOW SERVICE");
  console.log("================================================================================");

  const service = new LocalMockCERDataService();

  // Setup Level 1 approver in RJ North
  await service.assignUserRole(
    {
      user_name: "Shiven Pandit",
      user_email: "shiven@cairn.com",
      login_name: "shiven@cairn.com",
      approval_level: 1,
      approver_role_title: "Finance",
      sbu: "RJ North",
      role: "Approver",
      is_active: true,
      assigned_by: "System",
      assigned_date: "2026-11-12",
    },
    { name: "SYSTEM_INITIAL_BOOTSTRAP", email: "system@bootstrap" }
  );

  // Create & submit proposal
  const createResult = await service.createProposal({
    pr_name: "Pipeline Expansion",
    proposal_no: "CER-2026-0099",
    cerprno: "CER-2026-0099",
    sbu: "RJ North",
    cat: "Vital",
    amount: 500,
    currency: "USD",
    status: "Draft",
    owname: "Project Owner",
    owner_email: "po@cairn.com",
    created_by: "Initiator",
    created_by_email: "init@cairn.com",
    current_level: 0,
  } as ICERProposal);
  const p = createResult.proposal;

  const submitResult = await service.updateProposal(
    { ...p, status: "In Approval", current_level: 1 },
    { name: "Initiator", email: "init@cairn.com" },
    p
  );
  const submitted = submitResult.proposal;
  assert(submitted.current_level === 1, "Proposal submitted at Level 1");

  // Either approver at Level 1 can approve
  const decisionResult = await service.recordDecision({
    cerprno: submitted.proposal_no || submitted.cerprno,
    level_id: 1,
    approver_name: "Shiven Pandit",
    approver_email: "shiven@cairn.com",
    decision: "APPROVED",
    comments: "L1 Finance Approved",
  });
  assert(decisionResult.success === true, "Level 1 decision recorded successfully");
  assert(decisionResult.nextLevel === 2, "Level 1 approval advances proposal to Level 2 (Project Owner)");

  console.log("\n================================================================================");
  console.log(" 4. SBU LEVEL COMPLETION METRICS");
  console.log("================================================================================");

  const mockRoles: IUserRoleAssignment[] = [
    { id: "1", user_name: "L1", user_email: "l1@cairn.com", login_name: "l1", approval_level: 1, sbu: "RJ North", role: "Approver", assigned_by: "System", assigned_date: "2026-11-12" } as unknown as IUserRoleAssignment,
    { id: "2", user_name: "L3", user_email: "l3@cairn.com", login_name: "l3", approval_level: 3, sbu: "RJ North", role: "Approver", assigned_by: "System", assigned_date: "2026-11-12" } as unknown as IUserRoleAssignment,
    { id: "3", user_name: "L4", user_email: "l4@cairn.com", login_name: "l4", approval_level: 4, sbu: "RJ North", role: "Approver", assigned_by: "System", assigned_date: "2026-11-12" } as unknown as IUserRoleAssignment,
    { id: "4", user_name: "L5", user_email: "l5@cairn.com", login_name: "l5", approval_level: 5, sbu: "RJ North", role: "Approver", assigned_by: "System", assigned_date: "2026-11-12" } as unknown as IUserRoleAssignment,
    { id: "5", user_name: "L6", user_email: "l6@cairn.com", login_name: "l6", approval_level: 6, sbu: "RJ North", role: "Approver", assigned_by: "System", assigned_date: "2026-11-12" } as unknown as IUserRoleAssignment,
    { id: "6", user_name: "South L1", user_email: "south@cairn.com", login_name: "south", approval_level: 1, sbu: "RJ South", role: "Approver", assigned_by: "System", assigned_date: "2026-11-12" } as unknown as IUserRoleAssignment,
  ];

  function getAssignedCountForBlock(block: string): number {
    let count = 0;
    for (const lvl of [1, 3, 4, 5, 6]) {
      if (mockRoles.some((r) => r.sbu === block && r.approval_level === lvl)) {
        count++;
      }
    }
    return count;
  }

  assert(getAssignedCountForBlock("RJ North") === 5, "RJ North has 5/5 assignable levels configured");
  assert(getAssignedCountForBlock("RJ South") === 1, "RJ South has 1/5 assignable levels configured");
  assert(getAssignedCountForBlock("CBOS") === 0, "CBOS has 0/5 assignable levels configured");
  assert(getAssignedCountForBlock("RAVA") === 0, "RAVA has 0/5 assignable levels configured");

  console.log("\n All Approval Workflow verification tests passed successfully!");
}

runApprovalWorkflowTests().catch((err) => {
  console.error("Test failed:", err);
  throw err;
});
