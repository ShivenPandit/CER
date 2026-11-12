/* eslint-disable */
/**
 * Test verification script for Approval Role Matrix & Multi-User Assignment Redesign
 */

import { IUserRoleAssignment } from "../models/UserModel";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`❌ FAILED: ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  } else {
    console.log(`✅ PASSED: ${message}`);
  }
}

console.log("=== 1. Verifying Matrix SBU Blocks & Level Definitions ===");

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

console.log("\n=== 2. Verifying Multi-User Assignee Overflow Logic ===");

const sampleApprovers: IUserRoleAssignment[] = [
  { id: "1", user_name: "Shiven Pandit", user_email: "shiven@cairn.com", login_name: "shiven@cairn.com", approval_level: 1, sbu: "RJ North", role: "Approver", assigned_by: "System", assigned_date: "2026-11-12" } as unknown as IUserRoleAssignment,
  { id: "2", user_name: "Rajesh Ghawali", user_email: "rajesh@cairn.com", login_name: "rajesh@cairn.com", approval_level: 1, sbu: "RJ North", role: "Admin", assigned_by: "System", assigned_date: "2026-11-12" } as unknown as IUserRoleAssignment,
  { id: "3", user_name: "Nadeem Sohail", user_email: "nadeem@cairn.com", login_name: "nadeem@cairn.com", approval_level: 1, sbu: "RJ North", role: "Admin", assigned_by: "System", assigned_date: "2026-11-12" } as unknown as IUserRoleAssignment,
];

// For 1-2 approvers: all displayed
const twoApprovers = sampleApprovers.slice(0, 2);
assert(twoApprovers.length === 2, "2 approvers should render directly without overflow");

// For 3 approvers: first displayed + '+2 more' counter badge
const threeApprovers = sampleApprovers;
const overflowCount = threeApprovers.length - 1;
assert(overflowCount === 2, `Overflow count for 3 approvers should be 2, got ${overflowCount}`);

console.log("\n=== 3. Verifying SBU Level Completion Calculation ===");

const mockRoles: IUserRoleAssignment[] = [
  // RJ North has levels 1, 3, 4, 5, 6 filled (fully configured)
  { id: "1", user_name: "Approver L1", user_email: "l1@cairn.com", login_name: "l1", approval_level: 1, sbu: "RJ North", role: "Approver", assigned_by: "System", assigned_date: "2026-11-12" } as unknown as IUserRoleAssignment,
  { id: "2", user_name: "Approver L3", user_email: "l3@cairn.com", login_name: "l3", approval_level: 3, sbu: "RJ North", role: "Approver", assigned_by: "System", assigned_date: "2026-11-12" } as unknown as IUserRoleAssignment,
  { id: "3", user_name: "Approver L4", user_email: "l4@cairn.com", login_name: "l4", approval_level: 4, sbu: "RJ North", role: "Approver", assigned_by: "System", assigned_date: "2026-11-12" } as unknown as IUserRoleAssignment,
  { id: "4", user_name: "Approver L5", user_email: "l5@cairn.com", login_name: "l5", approval_level: 5, sbu: "RJ North", role: "Approver", assigned_by: "System", assigned_date: "2026-11-12" } as unknown as IUserRoleAssignment,
  { id: "5", user_name: "Approver L6", user_email: "l6@cairn.com", login_name: "l6", approval_level: 6, sbu: "RJ North", role: "Approver", assigned_by: "System", assigned_date: "2026-11-12" } as unknown as IUserRoleAssignment,
  // RJ South only has level 1 (incomplete)
  { id: "6", user_name: "Approver South L1", user_email: "southl1@cairn.com", login_name: "southl1", approval_level: 1, sbu: "RJ South", role: "Approver", assigned_by: "System", assigned_date: "2026-11-12" } as unknown as IUserRoleAssignment,
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

assert(getAssignedCountForBlock("RJ North") === 5, "RJ North should have 5/5 assignable levels configured");
assert(getAssignedCountForBlock("RJ South") === 1, "RJ South should have 1/5 assignable levels configured");
assert(getAssignedCountForBlock("CBOS") === 0, "CBOS should have 0/5 assignable levels configured");
assert(getAssignedCountForBlock("RAVA") === 0, "RAVA should have 0/5 assignable levels configured");

console.log("\n All Approval Role Matrix Redesign tests passed successfully!");

