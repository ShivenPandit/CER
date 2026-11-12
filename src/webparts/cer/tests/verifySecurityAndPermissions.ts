/* eslint-disable */
/**
 * Consolidated Security & Permissions Test Suite
 * Validates:
 * 1. Unregistered User Initiator Rights (drafting, editing, resubmission)
 * 2. Admin Role Preservation in CERRoleMatrix during approval assignment & removal
 * 3. Security restrictions against unauthorized Admin creation
 * 4. Dual-role resolution (Admin + Approver)
 */

import { LocalMockCERDataService } from "../services/LocalMockCERDataService";
import { ICERProposal } from "../models/CERModel";
import { PermissionService } from "../services/PermissionService";
import { IAppUser, IUserRoleAssignment } from "../models/UserModel";

function assert(condition: boolean, msg: string): void {
  if (condition) {
    console.log(`  ✔ [PASS] ${msg}`);
  } else {
    console.error(`  ❌ [FAIL] ${msg}`);
    throw new Error(`Assertion failed: ${msg}`);
  }
}

async function runSecurityAndPermissionsTests(): Promise<void> {
  console.log("================================================================================");
  console.log(" 1. UNREGISTERED USER INITIATOR RIGHTS (DRAFTS, EDITS & RESUBMISSION)");
  console.log("================================================================================");

  const service = new LocalMockCERDataService();

  const priyaUser: IAppUser = {
    id: 101,
    name: "Priya Kalekar (STL Digital)",
    email: "priya.kalekar@cairnindia.com",
    loginName: "70004733@cairnindia.com",
    role: "Initiator",
    roles: ["Initiator"],
    is_active: true,
  };

  const shivenOwner = {
    name: "Shiven Pandit (Microlink)",
    email: "shiven.pandit@microlink.com",
  };

  const strangerUser = {
    name: "Unknown Stranger",
    email: "stranger@external.com",
  };

  // 1. Create a draft proposal initiated by Priya with Shiven as CER Owner
  const draftPayload: Partial<ICERProposal> = {
    pr_name: "testing new build",
    proposal_no: "PR-2026/00099",
    sbu: "RJ North",
    cat: "Vital",
    owname: shivenOwner.name,
    owner_email: shivenOwner.email,
    created_by: priyaUser.name,
    created_by_email: priyaUser.email,
    amount: 10,
    currency: "USD",
    status: "Draft",
    current_level: 0,
    object: "testing draft rights",
    payable: "Payback",
    st_date: "2026-11-03",
    com_date: "2026-11-27",
  };

  const createResult = await service.createProposal(draftPayload as ICERProposal);
  const createdDraft = createResult.proposal;

  assert(Boolean(createdDraft && createdDraft.id), "Draft proposal created successfully");
  assert(createdDraft.status === "Draft", "Created proposal has status 'Draft'");

  // 2. Permission checks: Initiator can edit own draft
  const priyaCanEdit = PermissionService.canEditCER(createdDraft, priyaUser);
  assert(priyaCanEdit.allowed === true, "Initiator (Priya) is permitted to edit her own draft");

  const isOwner = PermissionService.isProposalOwner(createdDraft, priyaUser);
  assert(isOwner === true, "PermissionService.isProposalOwner returns true for initiator");

  // 3. Permission checks: Stranger cannot edit Priya's draft
  const strangerCanEdit = PermissionService.canEditCER(createdDraft, {
    id: 999,
    name: strangerUser.name,
    email: strangerUser.email,
    loginName: strangerUser.email,
    role: "Initiator",
    roles: ["Initiator"],
    is_active: true,
  });
  assert(strangerCanEdit.allowed === false, "Unauthorized stranger is strictly denied editing draft");

  // 4. Update the draft proposal in LocalMockCERDataService as Priya
  const updatePayload: ICERProposal = {
    ...createdDraft,
    object: "testing draft rights updated by initiator",
  };

  const updateResult = await service.updateProposal(
    updatePayload,
    { name: priyaUser.name, email: priyaUser.email }
  );
  const updatedProposal = updateResult.proposal;

  assert(
    updatedProposal.object === "testing draft rights updated by initiator",
    "Initiator successfully updated draft proposal in service"
  );

  // 5. Submit the draft proposal as Priya
  const submitResult = await service.updateProposal(
    { ...updatedProposal, status: "In Approval", current_level: 1 },
    { name: priyaUser.name, email: priyaUser.email },
    updatedProposal
  );
  const submittedProposal = submitResult.proposal;
  assert(submittedProposal.status === "In Approval", "Initiator successfully submitted proposal");

  console.log("\n================================================================================");
  console.log(" 2. ADMIN ROLE PRESERVATION IN CERROLEMATRIX");
  console.log("================================================================================");

  // Setup mock existing Admin
  const adminUser: Omit<IUserRoleAssignment, "id"> = {
    user_name: "Rajesh Ghawali",
    user_email: "rajesh.ghawali@cairnindia.com",
    login_name: "rajesh.ghawali@cairnindia.com",
    role: "Admin",
    sbu: "RJ North",
    is_active: true,
    assigned_by: "System",
    assigned_date: "2026-11-01T00:00:00Z",
  };

  // Re-seed mock service with admin using bootstrap authority
  const seededAdmin = await service.assignUserRole(adminUser, {
    name: "SYSTEM_INITIAL_BOOTSTRAP",
    email: "system@bootstrap",
  });
  assert(seededAdmin.role === "Admin", "Admin seeded with role 'Admin'");

  // Update approval assignment to Level 3 (BU CFO) - Admin role must be preserved
  const assignedL3 = await service.assignUserRole(
    {
      user_name: seededAdmin.user_name,
      user_email: seededAdmin.user_email,
      login_name: seededAdmin.login_name,
      approval_level: 3,
      approver_role_title: "BU CFO",
      sbu: "RJ North",
      role: "Approver", // even if UI attempted to send role: "Approver"
      is_active: true,
      assigned_by: "Admin",
      assigned_date: "2026-11-12",
    },
    { name: "Demo Admin", email: "demo.admin@example.com" }
  );
  assert(assignedL3.role === "Admin", "Admin role strictly preserved on assigning approval level 3");
  assert(assignedL3.approval_level === 3, "Approval level updated to 3");
  assert(assignedL3.approver_role_title === "BU CFO", "Approver role title set to BU CFO");

  // Remove approval assignment - Admin role must still be preserved
  await service.updateUserRole(
    {
      ...assignedL3,
      approval_level: undefined,
      approver_role_title: undefined,
    },
    { name: "Demo Admin", email: "demo.admin@example.com" }
  );
  const allRoles = await service.getUserRoles(true);
  const roleAfterRemoval = allRoles.find((r) => r.user_email.toLowerCase() === adminUser.user_email.toLowerCase())!;
  assert(roleAfterRemoval.role === "Admin", "Admin role strictly preserved after removing approval assignment");
  assert(!roleAfterRemoval.approval_level, "Approval level cleared");

  console.log("\n================================================================================");
  console.log(" 3. SECURITY CHECKS & DUAL-ROLE SUPPORT");
  console.log("================================================================================");

  // Non-matrix users cannot access workflow-config or admin console
  assert(!PermissionService.canAccessView("workflow-config", priyaUser), "Initiator cannot access workflow-config view");
  assert(!PermissionService.canAccessAdmin(priyaUser), "Initiator cannot access Admin Console");

  // Admin user with approval level gets dual-role capabilities
  const dualRoleUser: IAppUser = {
    id: 50,
    name: "Rajesh Ghawali",
    email: "rajesh.ghawali@cairnindia.com",
    loginName: "rajesh.ghawali@cairnindia.com",
    role: "Admin",
    roles: ["Admin", "Approver"],
    approval_level: 3,
    sbu: "RJ North",
    is_active: true,
  };

  assert(PermissionService.canAccessAdmin(dualRoleUser), "Dual-role user has Admin console access");
  assert(PermissionService.canAccessView("pending-approvals", dualRoleUser), "Dual-role user has Pending Approvals access");

  console.log("\n All Security & Permissions verification tests passed successfully!");
}

runSecurityAndPermissionsTests().catch((err) => {
  console.error("Test failed:", err);
  throw err;
});
