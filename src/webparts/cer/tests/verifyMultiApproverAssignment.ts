export {};

declare const global: any;
declare const process: any;

// Polyfill window & document for Node environment BEFORE loading SPFx modules
(global as any).window = global;
(global as any).document = {
  getElementsByTagName: () => [{ appendChild: () => {} }],
  getElementById: () => null,
  createElement: () => ({ id: "", rel: "", type: "", href: "" }),
};

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

function assert(condition: any, msg: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

const { PersonFieldService } = require("../services/PersonFieldService");
const { SharePointCERDataService } = require("../services/SharePointCERDataService");
const { LocalMockCERDataService } = require("../services/LocalMockCERDataService");
const { PermissionService } = require("../services/PermissionService");

console.log("================================================================================");
console.log("MULTI-APPROVER & NATIVE MULTI-PERSON COLUMN 'pendingWithEmail' TEST SUITE");
console.log("================================================================================\n");

async function runTests(): Promise<void> {
  // -------------------------------------------------------------------------
  // Test 1: extractMultiPersonField with internal, external, and empty-email users
  // -------------------------------------------------------------------------
  console.log("Test 1: PersonFieldService.extractMultiPersonField Identity Extraction");

  const mockItem = {
    pendingWithEmail: [
      {
        Id: 101,
        Title: "Internal Employee",
        EMail: "internal@vedanta.co.in",
        Name: "i:0#.f|membership|internal@vedanta.co.in",
      },
      {
        Id: 102,
        Title: "Shishant Dixit(STL Digital)",
        EMail: "", // Empty email for contractor/vendor
        Name: "i:0#.f|membership|shishant.dixit_stldigital.com#ext#@vedanta.co.in",
      },
      {
        Id: 103,
        Title: "Service Account Without Email",
        EMail: "",
        Name: "c:0+.t|aad|service-account",
      },
    ],
  };

  const extracted = PersonFieldService.extractMultiPersonField(mockItem, "pendingWithEmail");
  assert(extracted.length === 3, "Extracted exactly 3 persons");

  // User 1
  assert(extracted[0].id === 101, "User 1 ID is 101");
  assert(extracted[0].name === "Internal Employee", "User 1 name matches");
  assert(extracted[0].email === "internal@vedanta.co.in", "User 1 email matches");

  // User 2: External contractor with empty EMail resolved from LoginName UPN
  assert(extracted[1].id === 102, "User 2 ID is 102");
  assert(extracted[1].name === "Shishant Dixit(STL Digital)", "User 2 name matches");
  assert(extracted[1].email === "shishant.dixit_stldigital.com#ext#@vedanta.co.in", "UPN extracted from LoginName");
  assert(extracted[1].loginName === "i:0#.f|membership|shishant.dixit_stldigital.com#ext#@vedanta.co.in", "LoginName preserved");

  // User 3: Service account without email retains valid ID and Name without discarding
  assert(extracted[2].id === 103, "User 3 ID is 103");
  assert(extracted[2].name === "Service Account Without Email", "User 3 name matches");
  assert(extracted[2].email === "", "Does not invent email from non-email Name");

  console.log("  [PASS] Successfully extracted multi-person fields, resolving external UPN and preserving empty-email users\n");

  // -------------------------------------------------------------------------
  // Test 2: getWorkflowLevels merges exact SBU and 'All' SBU assignments
  // -------------------------------------------------------------------------
  console.log("Test 2: Workflow Level Approver Resolution (SBU + 'All' Merging & Deduplication)");

  const mockService = new LocalMockCERDataService();
  const mockRoles = [
    {
      id: "role-1",
      user_id: 201,
      user_name: "Finance RJ North Primary",
      user_email: "finance.rjn@vedanta.co.in",
      role: "Approver",
      approval_level: 1,
      sbu: "RJ North",
      is_active: true,
      assigned_by: "Admin",
      assigned_date: "2026-01-01",
    },
    {
      id: "role-2",
      user_id: 202,
      user_name: "Finance Central All",
      user_email: "finance.all@vedanta.co.in",
      role: "Approver",
      approval_level: 1,
      sbu: "All",
      is_active: true,
      assigned_by: "Admin",
      assigned_date: "2026-01-01",
    },
    {
      id: "role-3",
      user_id: 203,
      user_name: "Inactive Finance Approver",
      user_email: "inactive@vedanta.co.in",
      role: "Approver",
      approval_level: 1,
      sbu: "RJ North",
      is_active: false, // inactive must be excluded
      assigned_by: "Admin",
      assigned_date: "2026-01-01",
    },
    {
      id: "role-4",
      user_id: 204,
      user_name: "BU CFO RJ North",
      user_email: "cfo.rjn@vedanta.co.in",
      role: "Approver",
      approval_level: 3,
      sbu: "RJ North",
      is_active: true,
      assigned_by: "Admin",
      assigned_date: "2026-01-01",
    },
  ];

  (mockService as any)._userRoles = mockRoles;
  const levels = await mockService.getWorkflowLevels("RJ North");
  const l1 = levels.find((l: any) => l.level_id === 1);
  assert(Boolean(l1), "Level 1 config found");
  assert(l1.approvers?.length === 2, "Level 1 merged both exact SBU ('RJ North') and 'All' SBU approvers");
  assert(l1.approver_email === "finance.rjn@vedanta.co.in;finance.all@vedanta.co.in", "Semicolon-separated approver emails");
  assert(l1.approver_name.includes("Finance RJ North Primary") && l1.approver_name.includes("Finance Central All"), "Comma-separated approver names");

  console.log("  [PASS] Exact SBU and 'All' SBU approver assignments merged and deduplicated successfully\n");

  // -------------------------------------------------------------------------
  // Test 3: SharePointCERDataService Native Multi-Person Payload Generation
  // -------------------------------------------------------------------------
  console.log("Test 3: Native SharePoint Multi-Person Payload Format ({ results: [...] })");

  let recordedPostPayload: any = null;
  let recordedUpdatePayload: any = null;

  const mockHttpClient = {
    post: async (url: string, _config: any, options: any) => {
      if (url.includes("/_api/web/ensureUser")) {
        const body = JSON.parse(options.body);
        const logon = body.logonName;
        let id = 501;
        if (logon.includes("finance.all")) id = 502;
        if (logon.includes("owner")) id = 599;
        return {
          ok: true,
          status: 200,
          json: async () => ({
            Id: id,
            Title: logon,
            Email: logon,
            LoginName: `i:0#.f|membership|${logon}`,
          }),
        };
      }
      if (url.includes("CERProposals") && !url.includes("items(")) {
        recordedPostPayload = JSON.parse(options.body);
        return {
          ok: true,
          status: 201,
          json: async () => ({
            Id: 999,
            Title: recordedPostPayload.Title,
            cerPrId: recordedPostPayload.cerPrId,
            proposalNo: recordedPostPayload.proposalNo,
            Created: new Date().toISOString(),
          }),
        };
      }
      if (url.includes("items(999)")) {
        recordedUpdatePayload = JSON.parse(options.body);
        return {
          ok: true,
          status: 204,
          json: async () => ({}),
        };
      }
      return { ok: true, status: 200, json: async () => ({ value: [] }) };
    },
    get: async (url: string) => {
      if (url.includes("CERRoleMatrix")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            value: [
              {
                Id: 1,
                role: "Approver",
                sbu: "RJ North",
                approverLevel: 1,
                approverRoleTitle: "Finance",
                User: {
                  Id: 501,
                  Title: "Finance RJ North Approver",
                  EMail: "finance.rjn@vedanta.co.in",
                  Name: "i:0#.f|membership|finance.rjn@vedanta.co.in",
                },
              },
              {
                Id: 2,
                role: "Approver",
                sbu: "All",
                approverLevel: 1,
                approverRoleTitle: "Finance",
                User: {
                  Id: 502,
                  Title: "Finance Central Approver",
                  EMail: "finance.all@vedanta.co.in",
                  Name: "i:0#.f|membership|finance.all@vedanta.co.in",
                },
              },
            ],
          }),
        };
      }
      if (url.includes("getUserById(501)")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            Id: 501,
            Title: "Finance RJ North Approver",
            Email: "finance.rjn@vedanta.co.in",
            LoginName: "i:0#.f|membership|finance.rjn@vedanta.co.in",
          }),
        };
      }
      if (url.includes("getUserById(502)")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            Id: 502,
            Title: "Finance Central Approver",
            Email: "finance.all@vedanta.co.in",
            LoginName: "i:0#.f|membership|finance.all@vedanta.co.in",
          }),
        };
      }
      if (url.includes("CERProposals") && (url.includes("CER-2026-0001") || url.includes("items(999)"))) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            value: [
              {
                Id: 999,
                Title: "CER-2026-0001",
                cerPrId: "CER-2026-0001",
                proposalNo: "PR-2026/MULTI-001",
                currentLevel: 6,
                status: "In Approval",
                sbu: "RJ North",
                owner_email: "owner@vedanta.co.in",
                owname: "Test Owner",
              },
            ],
          }),
        };
      }
      return { ok: true, status: 200, json: async () => ({ value: [] }) };
    },
  };

  const spDataService = new SharePointCERDataService(mockHttpClient as any, "https://test.sharepoint.com/sites/cer");

  const testProposal = {
    title: "Multi-Approver Verification CER",
    pr_name: "Multi-Approver Verification CER",
    proposal_no: "PR-2026/MULTI-001",
    cerprno: "CER-2026-0001",
    sbu: "RJ North",
    category: "Vital",
    amount: 5000000,
    payable: "Payback",
    payback_period_quarter: 4,
    corporate_budget: "Yes",
    cpex_type: "Replacement",
    joint_venture: "100% Cairn",
    start_date: "2026-11-01",
    completion_date: "2026-12-01",
    narrative: "Testing multi-approver native SharePoint Person column",
    remarks: "Testing",
    owner_email: "owner@vedanta.co.in",
    owname: "Test Owner",
    status: "In Approval",
    ph_till: 0,
    ph_fy: 5000000,
    ph_beyond: 0,
    total: 5000000,
  };

  const createRes = await spDataService.createProposal(testProposal);
  assert(Boolean(createRes.success), "createProposal succeeded");
  assert(Boolean(recordedPostPayload), "SharePoint POST was executed");
  assert(Boolean(recordedPostPayload.pendingWithEmailId), "pendingWithEmailId property is present in payload");
  assert(
    JSON.stringify(recordedPostPayload.pendingWithEmailId) === JSON.stringify({ results: [501, 502] }) ||
    JSON.stringify(recordedPostPayload.pendingWithEmailId) === JSON.stringify([501, 502]),
    "pendingWithEmailId formatted strictly as native SharePoint multi-person"
  );

  console.log("  [PASS] createProposal generated native SharePoint multi-person payload: { results: [501, 502] } / [501, 502]\n");

  // -------------------------------------------------------------------------
  // Test 4: Final Approved Decision Clears pendingWithEmailId to { results: [] }
  // -------------------------------------------------------------------------
  console.log("Test 4: Final Approved Decision Clears pendingWithEmailId to { results: [] }");

  await spDataService.recordDecision({
    cerprno: "CER-2026-0001",
    level_id: 6,
    decision: "APPROVED",
    approver_name: "CEO",
    approver_email: "ceo@vedanta.co.in",
    comments: "Final Level Approved",
  });

  assert(Boolean(recordedUpdatePayload), "Update payload recorded");
  assert(
    JSON.stringify(recordedUpdatePayload.pendingWithEmailId) === JSON.stringify({ results: [] }) ||
    JSON.stringify(recordedUpdatePayload.pendingWithEmailId) === JSON.stringify([]),
    "Final approval clears pendingWithEmailId to empty collection"
  );
  console.log("  [PASS] Final approval cleared pendingWithEmailId using native SharePoint empty collection: { results: [] } / []\n");

  // -------------------------------------------------------------------------
  // Test 5: Truthful Failure on Unresolvable Approver Identity (No Silent Omission)
  // -------------------------------------------------------------------------
  console.log("Test 5: Truthful Failure on Unresolvable Approver Identity (No Silent Omission)");

  const failingMockHttpClient = {
    post: async (url: string) => {
      if (url.includes("/_api/web/ensureUser")) {
        return {
          ok: false,
          status: 404,
          statusText: "User Not Found in Entra / Directory",
          text: async () => "User Not Found in Entra / Directory",
        };
      }
      return { ok: true, status: 200, json: async () => ({ value: [] }) };
    },
    get: async (url: string) => {
      if (url.includes("CERRoleMatrix")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            value: [
              {
                Id: 99,
                role: "Approver",
                sbu: "RJ North",
                approverLevel: 1,
                approverRoleTitle: "Finance",
                User: {
                  Title: "Ghost Approver",
                  EMail: "ghost.approver@unknown.com",
                  Name: "ghost.approver@unknown.com",
                },
              },
            ],
          }),
        };
      }
      return { ok: true, status: 200, json: async () => ({ value: [] }) };
    },
  };

  const failingSpService = new SharePointCERDataService(failingMockHttpClient as any, "https://test.sharepoint.com/sites/cer");

  let errorCaught = false;
  try {
    await failingSpService.createProposal({
      ...testProposal,
      proposal_no: "PR-2026/GHOST-001",
    });
  } catch (err: any) {
    errorCaught = true;
    assert(
      String(err.message).includes("Failed to resolve SharePoint User ID") || String(err.message).includes("Cannot submit CER for approval"),
      "Threw truthful actionable error on unresolvable approver"
    );
  }

  assert(errorCaught, "Failed operation truthfully when approver could not be resolved");
  console.log("  [PASS] Truthfully threw error when approver could not be resolved in SharePoint\n");

  // -------------------------------------------------------------------------
  // Test 6: Pending Approvals Multi-Approver Authorization (Priya Kalekar scenario)
  // -------------------------------------------------------------------------
  console.log("Test 6: Pending Approvals Multi-Approver Authorization & Queue Visibility");

  const priyaUser = {
    id: "priya-1",
    name: "Priya Kalekar",
    email: "priya.kalekar@cairnindia.com",
    loginName: "i:0#.f|membership|priya.kalekar@cairnindia.com",
    role: "Approver",
    roles: ["Approver"],
    approval_level: 1,
    sbu: "RJ North",
    is_active: true,
  };

  const wrongUser = {
    id: "wrong-1",
    name: "Other Approver",
    email: "other@cairnindia.com",
    loginName: "i:0#.f|membership|other@cairnindia.com",
    role: "Approver",
    roles: ["Approver"],
    approval_level: 1,
    sbu: "RJ North",
    is_active: true,
  };

  const multiApproverProposal = {
    ...testProposal,
    cerprno: "CER-2026-0018",
    sbu: "RJ North",
    current_level: 1,
    status: "In Approval",
    created_by: "Shiven Pandit",
    pending_with_email: "shishant.dixit@vedanta.co.in;Priya.Kalekar@cairnindia.com",
  };

  const multiApproverStageConfig = {
    id: "L1-RJ North",
    level_id: 1,
    level_name: "L1 - Finance",
    role_title: "Finance",
    sbu: "RJ North",
    is_active: true,
    assignment_type: "SpecificUser" as const,
    approver_email: "shishant.dixit@vedanta.co.in;Priya.Kalekar@cairnindia.com",
    approvers: [
      {
        id: "1",
        user_name: "Shishant Dixit(STL Digital)",
        user_email: "shishant.dixit@vedanta.co.in",
        role: "Approver",
        approval_level: 1,
        sbu: "All",
        is_active: true,
      },
      {
        id: "2",
        user_name: "Priya Kalekar (STL Digital)",
        user_email: "Priya.Kalekar@cairnindia.com",
        role: "Approver",
        approval_level: 1,
        sbu: "RJ North",
        is_active: true,
      },
    ],
  };

  // Priya must be allowed to approve CER-2026-0018
  const priyaAuth = PermissionService.canApproveCER(multiApproverProposal as any, priyaUser as any, multiApproverStageConfig as any);
  assert(priyaAuth.allowed === true, "Priya Kalekar is authorized to approve multi-approver proposal CER-2026-0018");

  // Test 6a: Contractor/External scenario - user has empty email and claims-prefixed loginName
  const priyaContractorUser = {
    ...priyaUser,
    email: "", // Empty email in SharePoint profile
    loginName: "i:0#.f|membership|priya.kalekar@cairnindia.com",
    name: "Priya Kalekar", // Clean name without vendor suffix
  };
  const priyaContractorAuth = PermissionService.canApproveCER(multiApproverProposal as any, priyaContractorUser as any, multiApproverStageConfig as any);
  assert(priyaContractorAuth.allowed === true, "Priya with empty email and claims prefix is authorized via effective UPN");

  // Test 6b: Older proposal (like CER-2026-0016) where pending_with_email only had Shishant
  const olderProposalWithOnlyShishant = {
    ...multiApproverProposal,
    cerprno: "CER-2026-0016",
    pending_with_email: "shishant.dixit@vedanta.co.in",
  };
  const priyaOlderPropAuth = PermissionService.canApproveCER(olderProposalWithOnlyShishant as any, priyaContractorUser as any, multiApproverStageConfig as any);
  assert(priyaOlderPropAuth.allowed === true, "Priya is authorized for older proposal CER-2026-0016 via stageConfig approvers list");

  // Test 6c: Proposal with empty pending_with_email
  const proposalWithEmptyPending = {
    ...multiApproverProposal,
    cerprno: "CER-2026-0017",
    pending_with_email: "",
  };
  const priyaEmptyPendingAuth = PermissionService.canApproveCER(proposalWithEmptyPending as any, priyaContractorUser as any, multiApproverStageConfig as any);
  assert(priyaEmptyPendingAuth.allowed === true, "Priya is authorized for proposal CER-2026-0017 with empty pending_with_email via stageConfig approvers");

  // Test 6d: Vendor suffix matching between user.name ("Priya Kalekar") and CERRoleMatrix ("Priya Kalekar (STL Digital)")
  const stageConfigWithVendorNameOnly = {
    ...multiApproverStageConfig,
    approver_email: "",
    approvers: [
      {
        id: "2",
        user_name: "Priya Kalekar (STL Digital)",
        user_email: "",
        login_name: "",
        role: "Approver",
        approval_level: 1,
        sbu: "RJ North",
        is_active: true,
      },
    ],
  };
  const priyaNameMatchAuth = PermissionService.canApproveCER(proposalWithEmptyPending as any, priyaContractorUser as any, stageConfigWithVendorNameOnly as any);
  assert(priyaNameMatchAuth.allowed === true, "Priya matches via cleaned display name stripping vendor suffix (STL Digital)");

  // Wrong approver not listed in pending_with_email or stageConfig must be rejected
  const wrongAuth = PermissionService.canApproveCER(multiApproverProposal as any, wrongUser as any, multiApproverStageConfig as any);
  assert(wrongAuth.allowed === false && wrongAuth.reason?.includes("assigned approver"), "Unassigned approver is rejected with assigned approver mismatch");

  // Global getWorkflowLevels() without SBU parameter retains all approvers across all SBUs
  const globalLevels = await mockService.getWorkflowLevels(undefined);
  const globalL1 = globalLevels.find((l: any) => l.level_id === 1);
  assert(Boolean(globalL1), "Global level 1 found");
  assert(globalL1.approvers && globalL1.approvers.length >= 2, "Global getWorkflowLevels retains approvers from both specific SBU and 'All' SBU");

  console.log("  [PASS] Multi-approver authorization verified: Priya Kalekar authorized, unassigned approver blocked\n");

  // -------------------------------------------------------------------------
  // Test 7: StartArray OData Error Recovery in _executeWithFieldFallback
  // -------------------------------------------------------------------------
  console.log("Test 7: StartArray OData Error Recovery in _executeWithFieldFallback");

  let mockMergeAttempts = 0;
  let finalDeliveredPayload: any = null;

  const mockClientForFallback = {
    post: async (url: string, _cfg: any, options: any) => {
      if (url.includes("/items(")) {
        mockMergeAttempts++;
        const parsedBody = JSON.parse(options.body);
        // On attempt 1, if pendingWithEmailId is an object with results, throw SharePoint's exact StartArray error
        if (parsedBody.pendingWithEmailId && typeof parsedBody.pendingWithEmailId === "object" && !Array.isArray(parsedBody.pendingWithEmailId)) {
          return {
            ok: false,
            status: 400,
            statusText: "Bad Request",
            text: async () => JSON.stringify({
              error: {
                code: "-1, Microsoft.SharePoint.Client.InvalidClientQueryException",
                message: "An unexpected 'StartObject' node was found for property named 'pendingWithEmailId' when reading from the JSON reader. A 'StartArray' node was expected."
              }
            })
          };
        }
        finalDeliveredPayload = parsedBody;
        return { ok: true, status: 204, text: async () => "" };
      }
      return { ok: true, status: 200, json: async () => ({ value: [] }) };
    },
    get: async () => ({ ok: true, status: 200, json: async () => ({ value: [] }) }),
  };

  const fallbackDataService = new SharePointCERDataService(
    mockClientForFallback as any,
    "https://contoso.sharepoint.com/sites/CER"
  );

  // Invoke private _executeWithFieldFallback
  const testPayloadWithStartObject: any = {
    status: "In Approval",
    currentLevel: 2,
    pendingWithRole: "CER Owner",
    pendingWithEmailId: { results: [901, 902] },
  };

  await (fallbackDataService as any)._executeWithFieldFallback(
    async (p: any) => {
      const res = await mockClientForFallback.post("https://contoso.sharepoint.com/sites/CER/_api/web/lists/getByTitle('CERProposals')/items(10)", null, {
        body: JSON.stringify(p),
      });
      if (!res.ok) {
        const text = res.text ? await res.text() : "";
        throw new Error(`[SPOperations] MERGE failed (${res.status}): ${text}`);
      }
    },
    testPayloadWithStartObject
  );

  assert(mockMergeAttempts === 2, "Fallback retried after StartArray mismatch");
  assert(Array.isArray(finalDeliveredPayload.pendingWithEmailId), "pendingWithEmailId was successfully converted to flat array");
  assert(
    JSON.stringify(finalDeliveredPayload.pendingWithEmailId) === JSON.stringify([901, 902]),
    "Delivered payload matches expected user IDs [901, 902]"
  );

  console.log("  [PASS] _executeWithFieldFallback caught 'StartArray' mismatch, unwrapped to flat array [901, 902], and succeeded on retry!\n");

  console.log("================================================================================");
  console.log("ALL MULTI-APPROVER & NATIVE MULTI-PERSON TESTS PASSED!");
  console.log("================================================================================");
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
