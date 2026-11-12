/* eslint-disable */
export {};

declare const global: any;
declare const process: any;

// Polyfill window & document for Node environment before importing SPFx libraries
(global as any).window = global;
(global as any).document = {
  getElementsByTagName: () => [{ appendChild: () => {} }],
  getElementById: () => null,
  createElement: () => ({ id: "", rel: "", type: "", href: "" }),
};

// Polyfill SPFx module loader in Node
/* eslint-disable @typescript-eslint/no-var-requires, prefer-rest-params */
const Module = require("module");
const origLoad = Module._load;
Module._load = function (request: string, ...args: any[]) {
  if (request.startsWith("@msinternal")) {
    return {
      isFlightEnabled: () => false,
      isExperimentEnabled: () => false,
    };
  }
  return origLoad.apply(this, [request, ...args]);
};

const { SharePointCERDataService } = require("../services/SharePointCERDataService");
const { AuthService } = require("../services/AuthService");
const { LocalMockCERDataService } = require("../services/LocalMockCERDataService");
import type { IUserRoleAssignment } from "../models/UserModel";

function assert(condition: boolean, message: string): void {
  if (!condition) {
    console.error(`✖ FAIL: ${message}`);
    process.exit(1);
  } else {
    console.log(`✔ PASS: ${message}`);
  }
}

async function runTests(): Promise<void> {
  console.log("\n=======================================================");
  console.log("  VERIFYING ADMIN ROLE PRESERVATION & DUAL-ROLE SUPPORT");
  console.log("=======================================================\n");

  const mockPayloads: Record<string, any>[] = [];
  const mockHttp: any = {
    post: async (url: string, opts: any) => {
      if (opts?.body) {
        mockPayloads.push(JSON.parse(opts.body));
      }
      return { ok: true, json: async () => ({ Id: 101, Title: "Test" }) };
    },
    get: async () => ({ ok: true, json: async () => ({ value: [] }) }),
  };

  // Mock SP Client
  let roleMatrixItems: any[] = [
    {
      ID: 5,
      Id: 5,
      Title: "Rajesh Ghawali",
      Role: "Admin", // Testing capitalized "Role" from SharePoint
      sbu: null,
      approverLevel: null,
      approverRoleTitle: null,
      User: { Id: 50, Title: "Rajesh Ghawali", EMail: "rajesh.ghawali@cairnindia.com" },
    },
    {
      ID: 1,
      Id: 1,
      Title: "Shiven Pandit",
      role: { Value: "Admin" }, // Testing Choice object from SharePoint
      sbu: "RJ North",
      approverLevel: "1",
      approverRoleTitle: "Finance",
      User: { Id: 10, Title: "Shiven Pandit", EMail: "shiven.pandit@cairnindia.com" },
    },
    {
      ID: 6,
      Id: 6,
      Title: "Standard Approver",
      role: "Approver",
      sbu: "RJ North",
      approverLevel: "4",
      approverRoleTitle: "BU Director",
      User: { Id: 60, Title: "Standard Approver", EMail: "approver@cairnindia.com" },
    },
  ];

  const mockSp: any = {
    getListItems: async () => roleMatrixItems,
    getListFields: async () => [
      { InternalName: "Title", Title: "Title", TypeAsString: "Text" },
      { InternalName: "role", Title: "role", TypeAsString: "Choice" },
      { InternalName: "approverLevel", Title: "approverLevel", TypeAsString: "Choice" },
      { InternalName: "approverRoleTitle", Title: "approverRoleTitle", TypeAsString: "Text" },
      { InternalName: "sbu", Title: "sbu", TypeAsString: "Choice" },
      { InternalName: "User", Title: "User", TypeAsString: "User" },
    ],
    updateListItem: async (listName: string, id: string | number, payload: any) => {
      mockPayloads.push({ action: "update", id, ...payload });
      const item = roleMatrixItems.find((i) => String(i.Id) === String(id) || String(i.ID) === String(id));
      if (item) {
        Object.assign(item, payload);
      }
      return { ok: true };
    },
    createListItem: async (listName: string, payload: any) => {
      mockPayloads.push({ action: "create", ...payload });
      // Simulate SharePoint unique value enforcement on User/Title
      const existing = roleMatrixItems.find((r) => r.Title === payload.Title);
      if (existing) {
        const err: any = new Error("spduplicatevaluesfoundexception: duplicate values were found");
        throw err;
      }
      const newId = 100 + roleMatrixItems.length;
      const created = { Id: newId, ID: newId, ...payload };
      roleMatrixItems.push(created);
      return created;
    },
    getSiteUsers: async () => [
      { Id: 50, Title: "Rajesh Ghawali", Email: "rajesh.ghawali@cairnindia.com", LoginName: "rajesh.ghawali@cairnindia.com" },
    ],
  };

  const spDataService = new SharePointCERDataService(
    mockHttp,
    "https://vedanta.sharepoint.com/sites/CERManagementSystemUAT"
  );
  (spDataService as any)._sp = mockSp;

  // ---------------------------------------------------------------------------
  // Test 1: getUserRoles safely parses "Role", "role", and Choice objects
  // ---------------------------------------------------------------------------
  console.log("Suite 1: Parsing Role Column with Diverse Casing and Formats");
  const parsedRoles = await spDataService.getUserRoles(true);
  const rajeshRole = parsedRoles.find((r: IUserRoleAssignment) => r.user_name === "Rajesh Ghawali");
  const shivenRole = parsedRoles.find((r: IUserRoleAssignment) => r.user_name === "Shiven Pandit");

  assert(!!rajeshRole && rajeshRole.role === "Admin", "Rajesh Ghawali correctly parsed as 'Admin' from capitalized 'Role' column");
  assert(!!shivenRole && shivenRole.role === "Admin", "Shiven Pandit correctly parsed as 'Admin' from Choice object { Value: 'Admin' }");

  // ---------------------------------------------------------------------------
  // Test 2: updateUserRole preserves Admin role when assigned to approval level
  // ---------------------------------------------------------------------------
  console.log("\nSuite 2: Preserving Admin Role on Approval Level Assignment");
  mockPayloads.length = 0;

  // Simulate updating Rajesh Ghawali to Level 3 BU CFO in RJ North
  const rajeshUpdate: IUserRoleAssignment = {
    ...rajeshRole!,
    role: "Admin", // Admin role passed from UI
    sbu: "RJ North",
    approval_level: 3,
    approver_role_title: "BU CFO",
  };

  await spDataService.updateUserRole(rajeshUpdate, { name: "Shiven Pandit", email: "shiven@cairnindia.com" });

  const updateCall = mockPayloads.find((p) => p.action === "update" && String(p.id) === "5");
  assert(!!updateCall, "updateListItem called for Rajesh Ghawali (ID: 5)");
  assert(updateCall?.role === "Admin", `updateListItem payload preserved role: "Admin" (was: ${updateCall?.role})`);
  assert(updateCall?.sbu === "RJ North", "updateListItem payload has sbu: 'RJ North'");
  assert(updateCall?.approverLevel === "3", "updateListItem payload has approverLevel: '3'");
  assert(updateCall?.approverRoleTitle === "BU CFO", "updateListItem payload has approverRoleTitle: 'BU CFO'");

  // ---------------------------------------------------------------------------
  // Test 3: assignUserRole routes existing Admin to in-place update and preserves Admin
  // ---------------------------------------------------------------------------
  console.log("\nSuite 3: assignUserRole In-Place Update Routing for Existing Admins");
  mockPayloads.length = 0;

  // Attempting assignUserRole for an existing Admin (Rajesh Ghawali) with role: "" (as might come from directory user)
  const dirAssignment: Omit<IUserRoleAssignment, "id"> = {
    user_name: "Rajesh Ghawali",
    user_email: "rajesh.ghawali@cairnindia.com",
    login_name: "rajesh.ghawali@cairnindia.com",
    role: "" as any,
    sbu: "RJ North",
    approval_level: 3,
    approver_role_title: "BU CFO",
    is_active: true,
    assigned_by: "Shiven Pandit",
    assigned_date: new Date().toISOString(),
  };

  const assignedResult = await spDataService.assignUserRole(dirAssignment, { name: "Shiven Pandit", email: "shiven@cairnindia.com" });
  assert(assignedResult.id === "5", "assignUserRole routed to existing item ID 5 instead of duplicate");
  assert(assignedResult.role === "Admin", "assignUserRole preserved role: 'Admin'");

  const assignUpdateCall = mockPayloads.find((p) => p.action === "update" && String(p.id) === "5");
  assert(!!assignUpdateCall && assignUpdateCall.role === "Admin", "SharePoint update payload preserved role: 'Admin' (not null)");

  // ---------------------------------------------------------------------------
  // Test 4: assignUserRole prevents unauthorized Admin self-promotion for new users
  // ---------------------------------------------------------------------------
  console.log("\nSuite 4: Security Restriction against Non-Admin Self-Promotion");
  let selfPromotionBlocked = false;
  try {
    await spDataService.assignUserRole(
      {
        user_name: "Hacker User",
        user_email: "hacker@evil.com",
        login_name: "hacker@evil.com",
        role: "Admin",
        is_active: true,
        assigned_by: "Hacker User",
        assigned_date: new Date().toISOString(),
      },
      { name: "Hacker User", email: "hacker@evil.com" }
    );
  } catch (err: any) {
    if (err && err.message.indexOf("Security Restriction") !== -1) {
      selfPromotionBlocked = true;
    }
  }
  assert(selfPromotionBlocked, "Unauthorized creation of new Admin via assignUserRole is strictly blocked");

  // ---------------------------------------------------------------------------
  // Test 5: Dual-Role Resolution in AuthService (Admin + Approver)
  // ---------------------------------------------------------------------------
  console.log("\nSuite 5: AuthService Dual-Role Resolution for Admin Approvers");
  const authResult = await AuthService.resolveCurrentUser(
    {
      id: 50,
      name: "Rajesh Ghawali",
      email: "rajesh.ghawali@cairnindia.com",
      loginName: "rajesh.ghawali@cairnindia.com",
    },
    spDataService,
    true
  );

  const resolvedUser = authResult.user;
  assert(resolvedUser.role === "Admin", "Primary role is 'Admin'");
  assert(resolvedUser.roles.indexOf("Admin") !== -1, "roles array contains 'Admin'");
  assert(resolvedUser.roles.indexOf("Approver") !== -1, "roles array contains 'Approver'");
  assert(resolvedUser.approval_level === 3, "approval_level is 3");
  assert(resolvedUser.sbu === "RJ North", "sbu is 'RJ North'");

  // ---------------------------------------------------------------------------
  // Test 6: Removing Approver Level preserves Admin role
  // ---------------------------------------------------------------------------
  console.log("\nSuite 6: Removing Approval Level from Admin preserves Admin role");
  mockPayloads.length = 0;

  const removeApprovalUpdate: IUserRoleAssignment = {
    id: "5",
    user_name: "Rajesh Ghawali",
    user_email: "rajesh.ghawali@cairnindia.com",
    login_name: "rajesh.ghawali@cairnindia.com",
    role: "Admin",
    sbu: "",
    approval_level: undefined,
    approver_role_title: undefined,
    is_active: true,
    assigned_by: "Shiven Pandit",
    assigned_date: new Date().toISOString(),
  };

  await spDataService.updateUserRole(removeApprovalUpdate, { name: "Shiven Pandit", email: "shiven@cairnindia.com" });

  const removalCall = mockPayloads.find((p) => p.action === "update" && String(p.id) === "5");
  assert(!!removalCall, "updateListItem called for removal");
  assert(removalCall?.role === "Admin", "Admin role preserved upon removal of approval assignment");
  assert(removalCall?.approverLevel === null, "approverLevel is set to null upon removal");

  // ---------------------------------------------------------------------------
  // Test 7: LocalMockCERDataService preserves Admin role
  // ---------------------------------------------------------------------------
  console.log("\nSuite 7: LocalMockCERDataService Admin Role Demotion Protection");
  const mockService = new LocalMockCERDataService();
  const mockRoles = await mockService.getUserRoles();
  const mockAdmin = mockRoles.find((r: IUserRoleAssignment) => r.role === "Admin");
  assert(!!mockAdmin, "Mock service has initial active Admin");

  await mockService.updateUserRole(
    {
      ...mockAdmin!,
      role: "" as any, // Demotion attempt via UI
      approval_level: 3,
      sbu: "RJ North",
    },
    { name: "Admin", email: "admin@vedanta.co.in" }
  );

  const updatedMockRoles = await mockService.getUserRoles();
  const updatedMockAdmin = updatedMockRoles.find((r: IUserRoleAssignment) => r.id === mockAdmin!.id);
  assert(updatedMockAdmin?.role === "Admin", "Mock service preserved Admin role instead of demoting");
  assert(updatedMockAdmin?.approval_level === 3, "Mock service updated approval_level to 3");

  console.log("\n=======================================================");
  console.log("  ALL TESTS PASSED SUCCESSFULLY! (7/7 suites)");
  console.log("=======================================================\n");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
