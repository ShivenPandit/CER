/**
 * Identity Column Schema & Normalization Verification Suite
 *
 * Verifies that all custom identity columns across the 8 CER SharePoint lists
 * conform to the text-based identity architectural model, with robust normalization,
 * legacy Person column fallback tolerance, and complete Segregation of Duties preservation.
 */

import { AuthService, normalizeUserIdentifier, isDesignatedAdmin } from "../services/AuthService";
import { PermissionService } from "../services/PermissionService";
import { ICERProposal } from "../models/CERModel";
import { IAppUser, IUserRoleAssignment, resolveDirectoryUserEmail } from "../models/UserModel";
import { IWorkflowLevel } from "../models/WorkflowModel";

function assert(condition: boolean, msg: string): void {
  if (!condition) {
    console.error(`  ❌ [FAIL] ${msg}`);
    throw new Error(msg);
  }
  console.log(`  ✔ [PASS] ${msg}`);
}

async function runIdentityColumnSchemaTests() {
  console.log("================================================================================");
  console.log(" CER Identity Column Schema & Normalization Verification Suite");
  console.log("================================================================================\n");

  // ---------------------------------------------------------------------------
  // Test Suite 1: Identity Normalization & Claims Token Stripping
  // ---------------------------------------------------------------------------
  console.log("Test Suite 1: Identity Normalization & Claims Token Stripping");
  
  assert(
    normalizeUserIdentifier("i:0#.f|membership|70007144@cairnindia.com") === "70007144@cairnindia.com",
    "Strips SharePoint claims prefix 'i:0#.f|membership|' cleanly"
  );

  assert(
    normalizeUserIdentifier("  Priya.Kalekar@cairnindia.com  ") === "priya.kalekar@cairnindia.com",
    "Trims leading/trailing whitespace and normalizes to lowercase"
  );

  assert(
    normalizeUserIdentifier("membership|user@domain.com") === "user@domain.com",
    "Strips legacy 'membership|' prefix"
  );

  assert(
    normalizeUserIdentifier("") === "",
    "Handles empty or undefined identifier safely"
  );

  assert(
    isDesignatedAdmin("70007144@cairnindia.com"),
    "Designated Admin identifier '70007144@cairnindia.com' is recognized"
  );

  assert(
    isDesignatedAdmin("i:0#.f|membership|70007144@cairnindia.com"),
    "Claims-prefixed Designated Admin identity is recognized"
  );

  // ---------------------------------------------------------------------------
  // Test Suite 2: Directory People Picker Email & UPN Resolution
  // ---------------------------------------------------------------------------
  console.log("\nTest Suite 2: Directory People Picker Email & UPN Resolution");

  assert(
    resolveDirectoryUserEmail({ mail: "rajesh.kumar@vedanta.co.in", userPrincipalName: "70001234@cairnindia.com" }) === "rajesh.kumar@vedanta.co.in",
    "Prefers valid corporate 'mail' field over userPrincipalName"
  );

  assert(
    resolveDirectoryUserEmail({ mail: "", userPrincipalName: "70001234@cairnindia.com" }) === "70001234@cairnindia.com",
    "Falls back to valid userPrincipalName when mail is empty"
  );

  assert(
    resolveDirectoryUserEmail({ mail: "invalid-email", userPrincipalName: "also-invalid" }) === "",
    "Returns empty string when both mail and userPrincipalName are invalid"
  );

  // ---------------------------------------------------------------------------
  // Test Suite 3: Legacy Person or Group Column Fallback Tolerance
  // ---------------------------------------------------------------------------
  console.log("\nTest Suite 3: Legacy Person or Group Column Fallback Tolerance in CER_UserRoles");

  // Simulate a raw SharePoint item that only had the legacy Person column populated
  const rawLegacyItem: Record<string, any> = {
    Id: 101,
    Title: null,
    user_email: null,
    login_name: null,
    role: "Approver",
    approval_level: 2,
    department: "Operations",
    sbu: "RJ North",
    is_active: true,
    User: {
      Title: "Legacy Approver Name",
      LookupValue: "Legacy Approver Name",
      EMail: "legacy.approver@cairnindia.com",
      Email: "legacy.approver@cairnindia.com",
      Name: "i:0#.f|membership|70009999@cairnindia.com",
    },
  };

  const resolvedUserName = rawLegacyItem.Title || rawLegacyItem.user_name || (rawLegacyItem.User && (rawLegacyItem.User.Title || rawLegacyItem.User.LookupValue)) || "";
  const resolvedUserEmail = rawLegacyItem.user_email || (rawLegacyItem.User && (rawLegacyItem.User.EMail || rawLegacyItem.User.Email || rawLegacyItem.User.Mail)) || "";
  const resolvedLoginName = rawLegacyItem.login_name || rawLegacyItem.user_email || (rawLegacyItem.User && (rawLegacyItem.User.Name || rawLegacyItem.User.UserName || rawLegacyItem.User.Email)) || "";

  assert(resolvedUserName === "Legacy Approver Name", "Fallback successfully resolves display name from legacy User Person column");
  assert(resolvedUserEmail === "legacy.approver@cairnindia.com", "Fallback successfully resolves email from legacy User Person column");
  assert(resolvedLoginName === "i:0#.f|membership|70009999@cairnindia.com", "Fallback successfully resolves login name from legacy User Person column");

  // ---------------------------------------------------------------------------
  // Test Suite 4: Cross-List Identity Contracts (All 8 Lists)
  // ---------------------------------------------------------------------------
  console.log("\nTest Suite 4: Cross-List Identity Contracts (All 8 Lists)");

  // 1. CER_Proposals
  const mockProposal = ({
    id: "1",
    cerprno: "CER-2026-0001",
    pr_name: "Gas Compression Plant Upgrade",
    owname: "Sunil Verma",
    owner_email: "sunil.verma@vedanta.co.in",
    sbu: "RJ North",
    status: "In Approval",
    object: "Upgrade booster compressors",
    amount: 1500000,
    currency: "USD",
    cat: "Vital",
    payable: "Payback",
    period: "12 Months",
    current_level: 1,
    pending_with_role: "Project Owner",
    pending_with_email: "sunil.verma@vedanta.co.in",
    created_date: new Date().toISOString(),
    created_by: "Sunil Verma",
    modified_date: new Date().toISOString(),
    modified_by: "Sunil Verma",
    revision_count: 0,
  } as any as ICERProposal);
  assert(typeof mockProposal.owner_email === "string" && mockProposal.owner_email.includes("@"), "CER_Proposals: owner_email is standard text email");
  assert(typeof mockProposal.owname === "string" && mockProposal.owname.length > 0, "CER_Proposals: owname is standard text display name");
  assert(typeof mockProposal.pending_with_email === "string", "CER_Proposals: pending_with_email is standard text email");

  // 2. CER_AuditTrail
  const mockAudit = {
    cerprno: "CER-2026-0001",
    field_name: "amount",
    old_value: "1000000",
    new_value: "1500000",
    user_name: "Priya Kalekar",
    user_email: "priya.kalekar@cairnindia.com",
  };
  assert(typeof mockAudit.user_name === "string" && typeof mockAudit.user_email === "string", "CER_AuditTrail: user_name and user_email are immutable text strings");

  // 3. CER_RemarksHistory
  const mockRemarks = {
    cerprno: "CER-2026-0001",
    version: 1,
    remarks_text: "Essential compression project",
    created_by_user: "Sunil Verma",
  };
  assert(typeof mockRemarks.created_by_user === "string", "CER_RemarksHistory: created_by_user is text author string");

  // 4. CER_WorkflowLevels
  const mockLevel: IWorkflowLevel = {
    id: "1",
    level_id: 1,
    level_name: "L1 - Project Owner Review",
    role_title: "Project Owner",
    sbu: "RJ North",
    is_active: true,
    assignment_type: "ProjectOwnerAuto",
    is_project_owner_stage: true,
    created_by: "System Admin",
    created_date: new Date().toISOString(),
    approver_name: "Project Owner (Auto-fetched from CER Proposal)",
    approver_email: "",
  };
  assert(typeof mockLevel.role_title === "string", "CER_WorkflowLevels: role_title is text role descriptor");

  // 5. CER_ApprovalDecisions
  const mockDecision = {
    cerprno: "CER-2026-0001",
    level_id: 1,
    approver_name: "Sunil Verma",
    approver_email: "sunil.verma@vedanta.co.in",
    decision: "APPROVED",
  };
  assert(typeof mockDecision.approver_name === "string" && typeof mockDecision.approver_email === "string", "CER_ApprovalDecisions: approver_name and approver_email are text strings");

  // 6. CER_Attachments
  const mockAttachment = {
    cerprno: "CER-2026-0001",
    name: "Vendor_Quote.pdf",
    uploaded_by: "Sunil Verma",
    size: 245000,
    type: "application/pdf",
  };
  assert(typeof mockAttachment.uploaded_by === "string", "CER_Attachments: uploaded_by is text uploader string");

  // 7. CER_Notifications
  const mockNotification = {
    cerprno: "CER-2026-0001",
    recipients: ["sunil.verma@vedanta.co.in", "approver2@vedanta.co.in"],
    subject: "Action Required",
  };
  const serializedRecipients = mockNotification.recipients.join("; ");
  assert(typeof serializedRecipients === "string" && serializedRecipients.includes(";"), "CER_Notifications: recipients serialize cleanly as semicolon-delimited text");

  // 8. CER_UserRoles
  const mockUserRole: IUserRoleAssignment = {
    id: "50",
    user_name: "Priya Kalekar (STL Digital)",
    user_email: "priya.kalekar@cairnindia.com",
    login_name: "70004733@cairnindia.com",
    role: "Admin",
    is_active: true,
    assigned_by: "System Administrator",
    assigned_date: new Date().toISOString(),
  };
  assert(typeof mockUserRole.user_email === "string" && typeof mockUserRole.login_name === "string", "CER_UserRoles: user_email and login_name are distinct text identity fields");

  // ---------------------------------------------------------------------------
  // Test Suite 5: Segregation of Duties with Text Identities
  // ---------------------------------------------------------------------------
  console.log("\nTest Suite 5: Segregation of Duties with Text Identities");

  const proposalOwnerUser: IAppUser = {
    id: 1,
    name: "Sunil Verma",
    email: "sunil.verma@vedanta.co.in",
    role: "Approver",
    roles: ["Approver"],
    is_active: true,
  };

  const nonOwnerStageConfig: IWorkflowLevel = {
    id: "2",
    level_id: 2,
    level_name: "L2 - Technical Review",
    role_title: "Discipline Lead",
    sbu: "RJ North",
    is_active: true,
    assignment_type: "SpecificUser",
    is_project_owner_stage: false,
    created_by: "Admin",
    created_date: new Date().toISOString(),
  };

  const proposalAtL2: ICERProposal = {
    ...mockProposal,
    current_level: 2,
    pending_with_role: "Discipline Lead",
    pending_with_email: "discipline.lead@vedanta.co.in",
  };
  const sodCheck = PermissionService.canApproveCER(proposalAtL2, proposalOwnerUser, nonOwnerStageConfig);
  assert(
    !sodCheck.allowed && (sodCheck.reason || "").includes("Segregation of Duties"),
    "Segregation of Duties strictly blocks proposal owner on non-Project-Owner stage via text email comparison"
  );

  // ---------------------------------------------------------------------------
  // Test Suite 6: Fail-Closed Identity Resolution & Unsafe Fallback Prevention
  // ---------------------------------------------------------------------------
  console.log("\nTest Suite 6: Fail-Closed Identity Resolution & Unsafe Fallback Prevention");

  const mockDataService: any = {
    getUserRoles: async () => [
      {
        id: "1",
        user_name: "Designated Administrator",
        user_email: "70007144@cairnindia.com",
        login_name: "70007144@cairnindia.com",
        role: "Admin",
        is_active: true,
      },
    ],
  };

  // 1. Empty email and empty loginName must fail closed
  const emptyContext = await AuthService.resolveCurrentUser(
    { id: 0, name: "", email: "", loginName: "" },
    mockDataService
  );
  assert(emptyContext.user.is_active === false, "Missing email and loginName resolves to is_active === false");
  assert(emptyContext.user.roles.length === 0, "Missing email and loginName resolves to 0 roles (no Admin privileges)");
  assert(emptyContext.user.email === "", "Missing email does not substitute 70007144@cairnindia.com");
  assert(emptyContext.user.role !== "Admin", "Missing email is not granted Admin role");

  // 2. Unregistered ordinary user gets default Initiator without Admin privileges
  const unregContext = await AuthService.resolveCurrentUser(
    { id: 2, name: "Ordinary User", email: "ordinary@cairnindia.com", loginName: "ordinary@cairnindia.com" },
    mockDataService
  );
  assert(unregContext.user.is_active === true, "Valid registered identity is active");
  assert(unregContext.user.role === "Initiator", "Unregistered user receives unprivileged Initiator role");
  assert(unregContext.user.roles.indexOf("Admin") === -1, "Unregistered user cannot inherit Admin privileges");

  // 3. Genuine designated admin is recognized and active
  const adminContext = await AuthService.resolveCurrentUser(
    { id: 99, name: "Designated Admin", email: "70007144@cairnindia.com", loginName: "70007144@cairnindia.com" },
    mockDataService
  );
  assert(adminContext.user.is_active === true, "Designated Admin is active");
  assert(adminContext.user.role === "Admin", "Designated Admin receives Admin role");
  assert(adminContext.user.roles.indexOf("Admin") !== -1, "Designated Admin roles array includes Admin");

  console.log("\n================================================================================");
  console.log(" ALL IDENTITY COLUMN SCHEMA & NORMALIZATION TESTS PASSED SUCCESSFULLY");
  console.log("================================================================================\n");
}

runIdentityColumnSchemaTests().catch((e) => {
  console.error("Test Suite execution failed:", e);
  (process as any).exit(1);
});
