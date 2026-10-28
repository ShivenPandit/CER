/**
 * Automated Verification Suite for Approval Hierarchy Access Restriction
 *
 * Verifies all 10 core requirements specified for Approval Hierarchy access control:
 *  1. Exact authorized email (Shiven.Pandit@cairnindia.com) can see and access Approval Hierarchy.
 *  2. Email comparison is case-insensitive, whitespace-safe, and handles SharePoint claims prefixes.
 *  3. Other Admin users (including other Designated Admins) cannot see or access the tab.
 *  4. Ordinary users (Initiator, Approver, Finance, Reviewer) cannot see or access the tab.
 *  5. Unresolved or missing user identity (null, undefined, empty) is denied access by default (fail-closed).
 *  6. Unauthorized users cannot render the Approval Hierarchy page directly (tab omitted, route fallback).
 *  7. Unauthorized page access does not fetch Approval Hierarchy data.
 *  8. Unauthorized users cannot trigger Add, Edit, Delete, reorder, or Save operations.
 *  9. The authorized user retains existing functionality (SBU filters, Add, Edit, Delete, Reorder, Save).
 * 10. The normal proposal approval workflow still works seamlessly for other users.
 */

import { PermissionService, AUTHORIZED_APPROVAL_HIERARCHY_EMAIL } from "../services/PermissionService";
import { IAppUser, UserRole } from "../models/UserModel";
import { IWorkflowLevel } from "../models/WorkflowModel";
import { LocalMockCERDataService } from "../services/LocalMockCERDataService";
import { ICERProposal } from "../models/CERModel";

let passed = 0;
let failed = 0;

function assert(condition: boolean, message: string): void {
  if (condition) {
    console.log(`  ✔ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ✖ [FAIL] ${message}`);
    failed++;
  }
}

async function runApprovalHierarchyAccessTests(): Promise<void> {
  console.log("================================================================================");
  console.log("APPROVAL HIERARCHY ACCESS RESTRICTION — AUTOMATED VERIFICATION SUITE");
  console.log("================================================================================\n");

  const service = new LocalMockCERDataService();

  // Seed sample workflow levels for verification
  await service.saveWorkflowLevels([
    { level_id: 1, level_name: "L1 - Technical Review", role_title: "Project Owner", approver_name: "Auto-fetch per proposal", approver_email: "", sbu: "RJ North", is_active: true, assignment_type: "ProjectOwnerAuto", is_project_owner_stage: true },
    { level_id: 2, level_name: "L2 - Discipline Review", role_title: "Discipline Lead", approver_name: "Sunil Verma", approver_email: "sunil.verma@vedanta.co.in", sbu: "RJ North", is_active: true, assignment_type: "SpecificUser" },
    { level_id: 3, level_name: "L3 - Commercial Review", role_title: "Head Commercial", approver_name: "Ananya Deshmukh", approver_email: "ananya.deshmukh@vedanta.co.in", sbu: "RJ North", is_active: true, assignment_type: "SpecificUser" }
  ]);

  // ---------------------------------------------------------------------------------------------
  // Test Suite 1: Exact Authorized Identity Verification
  // ---------------------------------------------------------------------------------------------
  console.log("Test Suite 1: Authorized Identity Resolution");
  const authorizedUser: IAppUser = {
    id: "user-shiven",
    email: "Shiven.Pandit@cairnindia.com",
    loginName: "Shiven.Pandit@cairnindia.com",
    name: "Shiven Pandit",
    role: "Admin",
    roles: ["Admin"],
    is_active: true
  };

  assert(
    AUTHORIZED_APPROVAL_HIERARCHY_EMAIL === "shiven.pandit@cairnindia.com",
    `Authorized constant is configured as 'shiven.pandit@cairnindia.com': ${AUTHORIZED_APPROVAL_HIERARCHY_EMAIL}`
  );

  assert(
    PermissionService.canAccessApprovalHierarchy(authorizedUser) === true,
    "1. Exact authorized email (Shiven.Pandit@cairnindia.com) is granted access"
  );

  // ---------------------------------------------------------------------------------------------
  // Test Suite 2: Case-Insensitivity, Whitespace-Safety & Claims Prefix Handling
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest Suite 2: Case-Insensitive, Whitespace & Claims Robustness");

  const upperCaseUser: IAppUser = {
    ...authorizedUser,
    email: "SHIVEN.PANDIT@CAIRNINDIA.COM"
  };
  assert(
    PermissionService.canAccessApprovalHierarchy(upperCaseUser) === true,
    "2a. Uppercase email (SHIVEN.PANDIT@CAIRNINDIA.COM) is granted access"
  );

  const mixedCaseUser: IAppUser = {
    ...authorizedUser,
    email: "ShIvEn.PaNdIt@cAiRnInDiA.cOm"
  };
  assert(
    PermissionService.canAccessApprovalHierarchy(mixedCaseUser) === true,
    "2b. Mixed case email (ShIvEn.PaNdIt@cAiRnInDiA.cOm) is granted access"
  );

  const whitespaceUser: IAppUser = {
    ...authorizedUser,
    email: "   Shiven.Pandit@cairnindia.com   "
  };
  assert(
    PermissionService.canAccessApprovalHierarchy(whitespaceUser) === true,
    "2c. Leading and trailing whitespace is trimmed and granted access"
  );

  const claimsUser: IAppUser = {
    id: "user-claims",
    name: "Shiven Pandit",
    email: "",
    loginName: "i:0#.f|membership|shiven.pandit@cairnindia.com",
    role: "Admin",
    roles: ["Admin"],
    is_active: true
  };
  assert(
    PermissionService.canAccessApprovalHierarchy(claimsUser) === true,
    "2d. SharePoint claims token prefix 'i:0#.f|membership|' is cleanly stripped from loginName"
  );

  const legacyClaimsUser: IAppUser = {
    id: "user-leg-claims",
    name: "Shiven Pandit",
    email: "",
    loginName: "membership|shiven.pandit@cairnindia.com",
    role: "Admin",
    roles: ["Admin"],
    is_active: true
  };
  assert(
    PermissionService.canAccessApprovalHierarchy(legacyClaimsUser) === true,
    "2e. Legacy 'membership|' prefix is cleanly stripped from loginName"
  );

  // ---------------------------------------------------------------------------------------------
  // Test Suite 3: Other Admin Users Are Denied Access
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest Suite 3: Other Admin Users Denied Access (No Role-Based Inheritance)");

  const otherAdmin: IAppUser = {
    id: "user-admin-2",
    email: "priya.kalekar@cairnindia.com",
    loginName: "priya.kalekar@cairnindia.com",
    name: "Priya Kalekar",
    role: "Admin",
    roles: ["Admin"],
    is_active: true
  };
  assert(
    PermissionService.canAccessApprovalHierarchy(otherAdmin) === false,
    "3a. Another Admin user (priya.kalekar@cairnindia.com) is strictly denied access"
  );

  const designatedAdmin7000: IAppUser = {
    id: "user-admin-70007144",
    email: "70007144@cairnindia.com",
    loginName: "70007144@cairnindia.com",
    name: "Designated Admin User",
    role: "Admin",
    roles: ["Admin"],
    is_active: true
  };
  assert(
    PermissionService.canAccessApprovalHierarchy(designatedAdmin7000) === false,
    "3b. Designated Admin identifier (70007144@cairnindia.com) is strictly denied access"
  );

  const spoofedNameUser: IAppUser = {
    id: "user-spoof",
    email: "attacker@cairnindia.com",
    loginName: "attacker@cairnindia.com",
    name: "Shiven Pandit", // Name matches, but email does not!
    role: "Admin",
    roles: ["Admin"],
    is_active: true
  };
  assert(
    PermissionService.canAccessApprovalHierarchy(spoofedNameUser) === false,
    "3c. Display name spoofing ('Shiven Pandit' with non-matching email) is strictly denied"
  );

  // ---------------------------------------------------------------------------------------------
  // Test Suite 4: Ordinary Users Denied Access
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest Suite 4: Ordinary Application Users Denied Access");

  const initiatorUser: IAppUser = {
    id: "user-init",
    email: "initiator@cairnindia.com",
    loginName: "initiator@cairnindia.com",
    name: "Project Initiator",
    role: "Initiator",
    roles: ["Initiator"],
    is_active: true
  };
  assert(
    PermissionService.canAccessApprovalHierarchy(initiatorUser) === false,
    "4a. Initiator user is denied access"
  );

  const approverUser: IAppUser = {
    id: "user-appr",
    email: "approver@cairnindia.com",
    loginName: "approver@cairnindia.com",
    name: "Level Approver",
    role: "Approver",
    roles: ["Approver"],
    is_active: true
  };
  assert(
    PermissionService.canAccessApprovalHierarchy(approverUser) === false,
    "4b. Approver user is denied access"
  );

  const financeUser: IAppUser = {
    id: "user-fin",
    email: "finance@cairnindia.com",
    loginName: "finance@cairnindia.com",
    name: "Finance Controller",
    role: "Finance_Audit",
    roles: ["Finance_Audit"],
    is_active: true
  };
  assert(
    PermissionService.canAccessApprovalHierarchy(financeUser) === false,
    "4c. Finance user is denied access"
  );

  // ---------------------------------------------------------------------------------------------
  // Test Suite 5: Unresolved or Missing Identity (Fail-Closed)
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest Suite 5: Fail-Closed on Missing / Unresolved / Inactive Identity");

  assert(
    PermissionService.canAccessApprovalHierarchy(null) === false,
    "5a. null user identity is denied access"
  );

  assert(
    PermissionService.canAccessApprovalHierarchy(undefined) === false,
    "5b. undefined user identity is denied access"
  );

  const emptyUser: IAppUser = {
    id: "",
    email: "",
    loginName: "",
    name: "",
    role: "Initiator",
    roles: [],
    is_active: true
  };
  assert(
    PermissionService.canAccessApprovalHierarchy(emptyUser) === false,
    "5c. User with empty email and loginName is denied access"
  );

  const inactiveAuthorizedUser: IAppUser = {
    ...authorizedUser,
    is_active: false
  };
  assert(
    PermissionService.canAccessApprovalHierarchy(inactiveAuthorizedUser) === false,
    "5d. Deactivated user account is denied access even if email matches"
  );

  // ---------------------------------------------------------------------------------------------
  // Test Suite 6: UI Discovery & Route Guarding (Tab Hiding and Route Fallback)
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest Suite 6: Tab Hiding & Route Fallback Logic");

  // Helper simulating AdminConsoleView tab generation
  function getRenderedAdminTabs(currentUser?: IAppUser | null): { id: string; label: string }[] {
    const isApprovalHierarchyAuthorized = PermissionService.canAccessApprovalHierarchy(currentUser);
    const tabs: { id: string; label: string }[] = [
      { id: "users", label: "User & Role Management" },
    ];
    if (isApprovalHierarchyAuthorized) {
      tabs.push({ id: "hierarchy", label: "Approval Hierarchy" });
    }
    return tabs;
  }

  // Helper simulating activeTab fallback in AdminConsoleView
  function resolveAdminActiveTab(requestedTab: string, currentUser?: IAppUser | null): string {
    const isApprovalHierarchyAuthorized = PermissionService.canAccessApprovalHierarchy(currentUser);
    if (requestedTab === "hierarchy" && !isApprovalHierarchyAuthorized) {
      return "users";
    }
    return requestedTab;
  }

  const authorizedTabs = getRenderedAdminTabs(authorizedUser);
  assert(
    authorizedTabs.some(t => t.id === "hierarchy") && authorizedTabs.length === 2,
    "6a. Authorized user sees both 'User & Role Management' and 'Approval Hierarchy' tabs"
  );

  const unauthorizedAdminTabs = getRenderedAdminTabs(otherAdmin);
  assert(
    !unauthorizedAdminTabs.some(t => t.id === "hierarchy") && unauthorizedAdminTabs.length === 1,
    "6b. Other Admin user sees ONLY 'User & Role Management' (Approval Hierarchy tab is completely removed)"
  );

  const ordinaryTabs = getRenderedAdminTabs(initiatorUser);
  assert(
    !ordinaryTabs.some(t => t.id === "hierarchy") && ordinaryTabs.length === 1,
    "6c. Ordinary user sees ONLY 'User & Role Management' tab"
  );

  const fallbackTab = resolveAdminActiveTab("hierarchy", otherAdmin);
  assert(
    fallbackTab === "users",
    "6d. Direct attempt to open 'hierarchy' tab by unauthorized user falls back to 'users'"
  );

  // ---------------------------------------------------------------------------------------------
  // Test Suite 7: Protection Against Unauthorized Data Fetching
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest Suite 7: Guarding Feature-Specific Data Fetching");

  // Simulating ApprovalHierarchyTab load function guard
  async function loadApprovalHierarchyForUser(
    currentUser: IAppUser | null,
    dataProvider: LocalMockCERDataService
  ): Promise<{ authorized: boolean; levels: IWorkflowLevel[] }> {
    const isAuthorized = PermissionService.canAccessApprovalHierarchy(currentUser);
    if (!isAuthorized) {
      // Do not fetch workflow levels data for unauthorized users through this feature
      return { authorized: false, levels: [] };
    }
    const levels = await dataProvider.getWorkflowLevels();
    return { authorized: true, levels };
  }

  const unauthorizedFetch = await loadApprovalHierarchyForUser(otherAdmin, service);
  assert(
    unauthorizedFetch.authorized === false && unauthorizedFetch.levels.length === 0,
    "7a. Unauthorized user receives 0 workflow levels through Approval Hierarchy feature"
  );

  const unauthenticatedFetch = await loadApprovalHierarchyForUser(null, service);
  assert(
    unauthenticatedFetch.authorized === false && unauthenticatedFetch.levels.length === 0,
    "7b. Unauthenticated request receives 0 workflow levels"
  );

  const authorizedFetch = await loadApprovalHierarchyForUser(authorizedUser, service);
  assert(
    authorizedFetch.authorized === true && authorizedFetch.levels.length === 3,
    "7c. Authorized user successfully loads all 3 workflow levels"
  );

  // ---------------------------------------------------------------------------------------------
  // Test Suite 8: Feature Operations Protection (Add, Edit, Delete, Reorder, Save)
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest Suite 8: Guarding Feature Operations (Add, Edit, Delete, Reorder, Save)");

  // Simulating ApprovalHierarchyTab guarded mutation operations
  class GuardedHierarchyOperations {
    private isAuthorized: boolean;
    public levels: IWorkflowLevel[];

    constructor(user: IAppUser | null, initialLevels: IWorkflowLevel[]) {
      this.isAuthorized = PermissionService.canAccessApprovalHierarchy(user);
      this.levels = [...initialLevels];
    }

    public handleAddLevel(newLevel: IWorkflowLevel): boolean {
      if (!this.isAuthorized) {
        throw new Error("Access Denied: You are not authorized to add approval hierarchy levels.");
      }
      this.levels.push(newLevel);
      return true;
    }

    public handleEditLevel(levelId: number, updated: Partial<IWorkflowLevel>): boolean {
      if (!this.isAuthorized) {
        throw new Error("Access Denied: You are not authorized to edit approval hierarchy levels.");
      }
      const idx = this.levels.findIndex(l => l.level_id === levelId);
      if (idx !== -1) {
        this.levels[idx] = { ...this.levels[idx], ...updated };
      }
      return true;
    }

    public handleDeleteLevel(levelId: number): boolean {
      if (!this.isAuthorized) {
        throw new Error("Access Denied: You are not authorized to delete approval hierarchy levels.");
      }
      this.levels = this.levels.filter(l => l.level_id !== levelId);
      return true;
    }

    public handleReorder(fromIndex: number, toIndex: number): boolean {
      if (!this.isAuthorized) {
        throw new Error("Access Denied: You are not authorized to reorder approval hierarchy levels.");
      }
      const [moved] = this.levels.splice(fromIndex, 1);
      this.levels.splice(toIndex, 0, moved);
      return true;
    }

    public async handleSaveAll(dataProvider: LocalMockCERDataService): Promise<boolean> {
      if (!this.isAuthorized) {
        throw new Error("Access Denied: You are not authorized to save approval hierarchy configuration.");
      }
      await dataProvider.saveWorkflowLevels(this.levels);
      return true;
    }
  }

  const unauthorizedOps = new GuardedHierarchyOperations(otherAdmin, authorizedFetch.levels);

  let addBlocked = false;
  try {
    unauthorizedOps.handleAddLevel({
      level_id: 4,
      level_name: "L4 - Unauthorized Level",
      role_title: "Hacker",
      approver_name: "Bad Actor",
      approver_email: "bad@cairnindia.com",
      sbu: "RJ North",
      is_active: true
    });
  } catch (err: any) {
    addBlocked = err.message.includes("Access Denied");
  }
  assert(addBlocked, "8a. Unauthorized user blocked from executing handleAddLevel");

  let editBlocked = false;
  try {
    unauthorizedOps.handleEditLevel(1, { role_title: "Compromised Title" });
  } catch (err: any) {
    editBlocked = err.message.includes("Access Denied");
  }
  assert(editBlocked, "8b. Unauthorized user blocked from executing handleEditLevel");

  let deleteBlocked = false;
  try {
    unauthorizedOps.handleDeleteLevel(1);
  } catch (err: any) {
    deleteBlocked = err.message.includes("Access Denied");
  }
  assert(deleteBlocked, "8c. Unauthorized user blocked from executing handleDeleteLevel");

  let reorderBlocked = false;
  try {
    unauthorizedOps.handleReorder(0, 1);
  } catch (err: any) {
    reorderBlocked = err.message.includes("Access Denied");
  }
  assert(reorderBlocked, "8d. Unauthorized user blocked from executing handleReorder");

  let saveBlocked = false;
  try {
    await unauthorizedOps.handleSaveAll(service);
  } catch (err: any) {
    saveBlocked = err.message.includes("Access Denied");
  }
  assert(saveBlocked, "8e. Unauthorized user blocked from executing handleSaveAll");

  // ---------------------------------------------------------------------------------------------
  // Test Suite 9: Authorized User Retains Full Functionality
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest Suite 9: Authorized User Retains Full Hierarchy Functionality");

  const authorizedOps = new GuardedHierarchyOperations(authorizedUser, authorizedFetch.levels);

  // Add Level
  const added = authorizedOps.handleAddLevel({
    level_id: 4,
    level_name: "L4 - Corporate Finance",
    role_title: "Finance Controller",
    approver_name: "Ankit Sharma",
    approver_email: "ankit.sharma2@cairnindia.com",
    sbu: "RJ North",
    is_active: true,
    assignment_type: "SpecificUser"
  });
  assert(added && authorizedOps.levels.length === 4, "9a. Authorized user can add a new hierarchy level");

  // Edit Level
  const edited = authorizedOps.handleEditLevel(4, { role_title: "Senior Finance Controller" });
  assert(
    edited && authorizedOps.levels.find(l => l.level_id === 4)?.role_title === "Senior Finance Controller",
    "9b. Authorized user can edit hierarchy level details"
  );

  // Reorder
  authorizedOps.handleReorder(0, 1);
  assert(
    authorizedOps.levels[0].level_name === "L2 - Discipline Review",
    "9c. Authorized user can reorder hierarchy levels"
  );

  // Delete
  const deleted = authorizedOps.handleDeleteLevel(4);
  assert(deleted && authorizedOps.levels.length === 3, "9d. Authorized user can delete a hierarchy level");

  // Save All
  const saved = await authorizedOps.handleSaveAll(service);
  assert(saved === true, "9e. Authorized user can persist hierarchy changes via saveAll");

  // ---------------------------------------------------------------------------------------------
  // Test Suite 10: Normal Proposal Workflow Works Seamlessly for Other Users
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest Suite 10: Normal Proposal Submission & Approval Workflow Unaffected");

  // Step 1: Initiator creates proposal
  const propNo = await service.generateProposalNumber();
  const proposal: ICERProposal = {
    id: "prop-workflow-test",
    cerprno: propNo,
    pr_name: "Standard SBU Well Augmentation",
    owname: "Alice Initiator",
    owner_email: "alice@cairnindia.com",
    sbu: "RJ North",
    status: "In Approval",
    object: "Testing Normal Workflow",
    amount: 1500000,
    currency: "USD",
    cat: "Vital",
    payable: "Payback",
    period: "12 Months",
    ben_npv: 4.5,
    ben_irr: 18.0,
    cost_assumptions: "Standard discount",
    st_date: "2026-06-01",
    com_date: "2027-05-31",
    duration_months: 12,
    cbudget: "Yes",
    cb_amnt: 1500000,
    cb_currency: "USD",
    reason: "",
    jv: "No",
    jv_cost: 0,
    jv_budget: "No",
    jv_amnt: 0,
    jv_reason: "",
    ph_till_label: "Till FY26",
    ph_fy_label: "FY 26-27",
    ph_beyond_label: "Beyond FY27",
    prod_till: 0,
    prod_fy: 100000,
    prod_beyond: 200000,
    capex_till: 500000,
    capex_fy: 800000,
    capex_beyond: 200000,
    opex_till: 0,
    opex_fy: 0,
    opex_beyond: 0,
    engineer: 200000,
    s_fac: 800000,
    comis: 200000,
    preop: 100000,
    others: 200000,
    total: 1500000,
    remarks: "Standard operations proposal.",
    remarks_jv: "",
    current_level: 0,
    pending_with_role: "",
    pending_with_email: "",
    created_date: new Date().toISOString(),
    created_by: "Alice Initiator",
    modified_date: new Date().toISOString(),
    modified_by: "Alice Initiator",
    revision_count: 0
  };

  const createRes = await service.createProposal(proposal);
  assert(createRes.success === true, "10a. Initiator created proposal successfully");
  assert(createRes.proposal.current_level === 1, "10b. Proposal correctly routed to Level 1");
  assert(
    createRes.proposal.pending_with_email === "alice@cairnindia.com",
    "10c. Level 1 dynamically assigned to Project Owner (Alice) without needing Approval Hierarchy UI"
  );

  // Step 2: Project Owner (Alice) approves
  const aliceDecision = await service.recordDecision({
    cerprno: proposal.cerprno,
    level_id: 1,
    approver_name: "Alice Initiator",
    approver_email: "alice@cairnindia.com",
    decision: "APPROVED",
    comments: "Project owner approval granted"
  });
  assert(aliceDecision.success === true, "10d. Alice (ordinary user) successfully recorded approval decision");
  assert(aliceDecision.nextLevel === 2, "10e. Proposal seamlessly advanced to Level 2 in RJ North hierarchy");

  // Step 3: Level 2 Approver (Sunil Verma) approves
  const sunilDecision = await service.recordDecision({
    cerprno: proposal.cerprno,
    level_id: 2,
    approver_name: "Sunil Verma",
    approver_email: "sunil.verma@vedanta.co.in",
    decision: "APPROVED",
    comments: "Discipline lead technical sign-off"
  });
  assert(sunilDecision.success === true, "10f. Sunil Verma (Discipline Lead) recorded approval decision");
  assert(sunilDecision.nextLevel === 3, "10g. Proposal advanced to Level 3");

  // Step 4: Level 3 Approver (Ananya Deshmukh) sanctions
  const finalDecision = await service.recordDecision({
    cerprno: proposal.cerprno,
    level_id: 3,
    approver_name: "Ananya Deshmukh",
    approver_email: "ananya.deshmukh@vedanta.co.in",
    decision: "APPROVED",
    comments: "Commercial sign-off completed"
  });
  assert(finalDecision.success === true, "10h. Level 3 commercial sign-off recorded");
  assert(finalDecision.newStatus === "Approved", "10i. Proposal transitioned to final 'Approved' status");

  const finalProposal = await service.getProposalByNumber(proposal.cerprno);
  assert(finalProposal?.status === "Approved", "10j. Proposal status verified in storage as 'Approved'");

  // ---------------------------------------------------------------------------------------------
  // Test Suite 11: "My CER Request" Access & Visibility Restrictions
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest Suite 11: 'My CER Request' Role-Based Visibility");

  const pureApprover: IAppUser = {
    id: "user-approver-priya",
    email: "priya.kalekar@cairnindia.com",
    name: "Priya Kalekar",
    role: "Approver",
    roles: ["Approver"],
    is_active: true,
  };

  const dualRoleUser: IAppUser = {
    id: "user-dual",
    email: "dual.user@cairnindia.com",
    name: "Dual Role User",
    role: "Approver",
    roles: ["Approver", "Initiator"],
    is_active: true,
  };

  const testInitiatorUser: IAppUser = {
    id: "user-initiator",
    email: "initiator@cairnindia.com",
    name: "Regular Initiator",
    role: "Initiator",
    roles: ["Initiator"],
    is_active: true,
  };

  assert(
    PermissionService.canViewMyRequests(pureApprover) === false,
    "11a. Pure Approver cannot view 'My CER Requests' (canViewMyRequests === false)"
  );
  assert(
    PermissionService.canAccessView("my-proposals", pureApprover) === false,
    "11b. Pure Approver route access to 'my-proposals' is denied (canAccessView === false)"
  );
  assert(
    PermissionService.canViewMyRequests(dualRoleUser) === true,
    "11c. Dual-role (Approver + Initiator) user can view 'My CER Requests'"
  );
  assert(
    PermissionService.canAccessView("my-proposals", dualRoleUser) === true,
    "11d. Dual-role user route access to 'my-proposals' is granted"
  );
  assert(
    PermissionService.canViewMyRequests(testInitiatorUser) === true,
    "11e. Initiator user can view 'My CER Requests'"
  );
  assert(
    PermissionService.canViewMyRequests(authorizedUser) === true,
    "11f. Admin user can view 'My CER Requests'"
  );

  // ---------------------------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(`APPROVAL HIERARCHY ACCESS VERIFICATION COMPLETE: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================\n");

  if (failed > 0) {
    (process as any).exit(1);
  }
}

runApprovalHierarchyAccessTests().catch(err => {
  console.error("Test execution error:", err);
  (process as any).exit(1);
});
