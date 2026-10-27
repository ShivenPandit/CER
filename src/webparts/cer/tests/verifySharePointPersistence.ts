import type { ICERProposal } from "../models/CERModel";

declare const global: any;
declare const process: any;

// Polyfill window & document for Node environment BEFORE importing SPFx libraries
(global as any).window = global;
(global as any).document = {
  getElementsByTagName: () => [{ appendChild: () => {} }],
  getElementById: () => null,
  createElement: () => ({ id: "", rel: "", type: "", href: "" }),
};

// Polyfill missing internal SPFx modules in raw Node environment
/* eslint-disable @typescript-eslint/no-var-requires, prefer-rest-params */
const Module = require("module");
const origLoad = Module._load;
Module._load = function (request: string) {
  if (request.startsWith("@msinternal")) {
    return {
      isFlightEnabled: () => false,
      isExperimentEnabled: () => false,
    };
  }
  return origLoad.apply(this, arguments);
};
/* eslint-enable @typescript-eslint/no-var-requires, prefer-rest-params */

let passed = 0;
let failed = 0;

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✔ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${msg}`);
    failed++;
  }
}

const mockHttpHelper = {
  get: async () => ({ ok: true, status: 200, json: async () => ({ value: [] }) }),
  post: async () => ({ ok: true, status: 200, json: async () => ({}) }),
};

async function runPersistenceRegressionTests() {
  console.log("================================================================================");
  console.log(" SharePoint Persistence Defect Fix Regression Test Suite (CER-CR-2026-002)");
  console.log("================================================================================");

  const { SharePointCERDataService } = await import("../services/SharePointCERDataService");
  const { LocalMockCERDataService } = await import("../services/LocalMockCERDataService");
  const { DataServiceFactory } = await import("../services/DataServiceFactory");

  const siteUrl = "https://vedanta.sharepoint.com/sites/CERManagementSystemUAT";

  // Helper to create a controlled mock SPHttpClient
  interface MockRouteHandler {
    (url: string, options?: any): Promise<{ ok: boolean; status: number; json?: () => Promise<any>; text?: () => Promise<string> }>;
  }

  function createMockHttpClient(handlers: {
    get?: MockRouteHandler;
    post?: MockRouteHandler;
  }) {
    const postCalls: Array<{ url: string; options?: any }> = [];
    const getCalls: Array<{ url: string; options?: any }> = [];

    const client = {
      getCalls,
      postCalls,
      get: async (url: string, config: any, options: any) => {
        getCalls.push({ url, options });
        if (handlers.get) {
          return handlers.get(url, options);
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ value: [] }),
        };
      },
      post: async (url: string, config: any, options: any) => {
        postCalls.push({ url, options });
        if (handlers.post) {
          return handlers.post(url, options);
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({ Id: 101, Title: "CreatedItem" }),
        };
      },
    };
    return client;
  }

  const baseTestProposal: ICERProposal = {
    id: "prop-9001",
    cerprno: "CER-2026-9001",
    pr_name: "UAT Reliability Validation Rig",
    status: "Draft",
    sbu: "RJ North",
    cat: "Vital",
    currency: "INR",
    amount: 5000000,
    payable: "Cairn",
    period: "12 Months",
    ben_npv: 0,
    ben_irr: 0,
    cost_assumptions: "Testing controlled failures and idempotency",
    st_date: "2026-11-01",
    com_date: "2027-10-31",
    duration_months: 12,
    cbudget: "Yes",
    cb_amnt: 5000000,
    cb_currency: "INR",
    reason: "",
    jv: "No",
    jv_recoverable: "No",
    jv_cost: 0,
    jv_budget: "No",
    jv_amnt: 0,
    jv_reason: "",
    ph_till_label: "Till Mar'26",
    ph_fy_label: "FY 26-27",
    ph_beyond_label: "Beyond FY'27",
    prod_till: 0,
    prod_fy: 5000000,
    prod_beyond: 0,
    capex_till: 0,
    capex_fy: 5000000,
    capex_beyond: 0,
    opex_till: 0,
    opex_fy: 0,
    opex_beyond: 0,
    engineer: 0,
    s_fac: 0,
    comis: 0,
    preop: 0,
    others: 0,
    total: 5000000,
    object: "Validation of reliable persistence without silent mock fallback",
    remarks: "Testing persistence",
    remarks_jv: "",
    owname: "Test Initiator",
    owner_email: "initiator@cairnindia.com",
    created_by: "Test Initiator",
    created_date: "2026-10-26T12:00:00.000Z",
    modified_date: "2026-10-26T12:00:00.000Z",
    modified_by: "Test Initiator",
    current_level: 0,
    pending_with_role: "Draft",
    pending_with_email: "",
    revision_count: 0,
  };

  // ---------------------------------------------------------------------------
  // Test Suite 1: Successful SharePoint proposal creation
  // ---------------------------------------------------------------------------
  console.log("\nTest Suite 1: Successful SharePoint Proposal Creation");
  {
    const mockHttp = createMockHttpClient({
      get: async (url: string) => {
        if ((url.includes("CERWorkflowLevels") || url.includes("CER_WorkflowLevels"))) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              value: [
                { Id: 1, level_id: 1, level_name: "Level 1", role_title: "Technical Reviewer", is_active: true },
              ],
            }),
          };
        }
        if (url.includes("CER_UserRoles") || url.includes("CERUserRoles")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              value: [
                { Id: 1, role: "Approver", approval_level: 1, sbu: "RJ North", is_active: true, user_name: "L1 Reviewer", user_email: "l1@cairnindia.com" },
              ],
            }),
          };
        }
        // CER_Proposals check for existing
        return {
          ok: true,
          status: 200,
          json: async () => ({ value: [] }),
        };
      },
      post: async (url: string) => {
        if ((url.includes("CERProposals") || url.includes("CER_Proposals"))) {
          return {
            ok: true,
            status: 201,
            json: async () => ({ Id: 555, cerprno: "CER-2026-9001" }),
          };
        }
        return { ok: true, status: 200, json: async () => ({}) };
      },
    });

    const spService = new SharePointCERDataService(mockHttp as any, siteUrl);
    const result = await spService.createProposal(baseTestProposal);

    assert(result.success === true, "createProposal reports success: true on valid SharePoint POST");
    assert(result.proposal.id === "555", "createProposal returns assigned SharePoint list item Id '555'");
    assert(
      mockHttp.postCalls.some((c) => c.url.includes("CERProposals") || c.url.includes("CER_Proposals")),
      "createProposal issued POST request to SharePoint CERProposals list",
    );
  }

  // ---------------------------------------------------------------------------
  // Test Suite 2: Failed SharePoint proposal creation DOES NOT invoke mock persistence
  // ---------------------------------------------------------------------------
  console.log("\nTest Suite 2: Failed Proposal Creation Fail-Closed Behavior (No Silent Mock Fallback)");
  {
    const mockHttp = createMockHttpClient({
      get: async () => ({ ok: true, status: 200, json: async () => ({ value: [] }) }),
      post: async (url: string) => {
        if ((url.includes("CERProposals") || url.includes("CER_Proposals"))) {
          return {
            ok: false,
            status: 500,
            text: async () => "Simulated SharePoint 500 Internal Server Error: List schema mismatch",
          };
        }
        return { ok: true, status: 200, json: async () => ({}) };
      },
    });

    const spService = new SharePointCERDataService(mockHttp as any, siteUrl);
    let errorThrown: any = null;

    try {
      await spService.createProposal(baseTestProposal);
    } catch (e) {
      errorThrown = e;
    }

    assert(errorThrown !== null, "createProposal threw an error when SharePoint write failed");
    assert(
      errorThrown && errorThrown.message.includes("Unable to save the CER to SharePoint"),
      "Error message explicitly instructs: 'Unable to save the CER to SharePoint. No successful save could be confirmed'",
    );
  }

  // ---------------------------------------------------------------------------
  // Test Suite 3: Failed proposal update DOES NOT invoke mock persistence
  // ---------------------------------------------------------------------------
  console.log("\nTest Suite 3: Failed Proposal Update Fail-Closed Behavior");
  {
    const mockHttp = createMockHttpClient({
      get: async (url: string) => {
        const decoded = decodeURIComponent(url);
        if (decoded.includes("CER-2026-9001")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              value: [
                {
                  Id: 777,
                  cerprno: "CER-2026-9001",
                  status: "Draft",
                  owner_email: "initiator@cairnindia.com",
                  owname: "Test Initiator",
                  revision_count: 0,
                },
              ],
            }),
          };
        }
        return { ok: true, status: 200, json: async () => ({ value: [] }) };
      },
      post: async (url: string, options: any) => {
        // If MERGE to CER_Proposals items(777), fail it
        if ((url.includes("CERProposals") || url.includes("CER_Proposals")) && options?.headers?.["X-HTTP-Method"] === "MERGE") {
          return {
            ok: false,
            status: 503,
            text: async () => "Simulated SharePoint 503 Service Unavailable",
          };
        }
        return { ok: true, status: 200, json: async () => ({}) };
      },
    });

    const spService = new SharePointCERDataService(mockHttp as any, siteUrl);
    let errorThrown: any = null;

    try {
      await spService.updateProposal(
        { ...baseTestProposal, amount: 6000000 },
        { name: "Test Initiator", email: "initiator@cairnindia.com" },
      );
    } catch (e) {
      errorThrown = e;
    }

    assert(errorThrown !== null, "updateProposal threw an error when SharePoint update failed");
    assert(
      errorThrown && errorThrown.message.includes("Unable to save the CER to SharePoint"),
      "updateProposal error message protects user from believing changes were saved",
    );
  }

  // ---------------------------------------------------------------------------
  // Test Suite 4: Failed approval writes DO NOT invoke mock persistence
  // ---------------------------------------------------------------------------
  console.log("\nTest Suite 4: Failed Approval Decision Persistence");
  {
    const mockHttp = createMockHttpClient({
      get: async (url: string) => {
        const decoded = decodeURIComponent(url);
        if (decoded.includes("CER-2026-9001") && (url.includes("CERProposals") || url.includes("CER_Proposals"))) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              value: [
                {
                  Id: 888,
                  cerprno: "CER-2026-9001",
                  status: "In Approval",
                  owner_email: "initiator@cairnindia.com",
                  owname: "Test Initiator",
                  sbu: "RJ North",
                },
              ],
            }),
          };
        }
        if ((url.includes("CERApprovalDecisions") || url.includes("CER_ApprovalDecisions"))) {
          return { ok: true, status: 200, json: async () => ({ value: [] }) };
        }
        if ((url.includes("CERWorkflowLevels") || url.includes("CER_WorkflowLevels"))) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              value: [
                { Id: 1, level_id: 1, role_title: "L1 Reviewer", is_active: true },
                { Id: 2, level_id: 2, role_title: "L2 Head", is_active: true },
              ],
            }),
          };
        }
        return { ok: true, status: 200, json: async () => ({ value: [] }) };
      },
      post: async (url: string) => {
        if ((url.includes("CERApprovalDecisions") || url.includes("CER_ApprovalDecisions"))) {
          return {
            ok: false,
            status: 403,
            text: async () => "Simulated SharePoint 403 Access Denied writing decision",
          };
        }
        return { ok: true, status: 200, json: async () => ({}) };
      },
    });

    const spService = new SharePointCERDataService(mockHttp as any, siteUrl);
    let errorThrown: any = null;

    try {
      await spService.recordDecision({
        cerprno: "CER-2026-9001",
        level_id: 1,
        approver_name: "L1 Approver",
        approver_email: "l1approver@cairnindia.com",
        decision: "APPROVED",
        comments: "Technical check passed",
      });
    } catch (e) {
      errorThrown = e;
    }

    assert(errorThrown !== null, "recordDecision throws error when CER_ApprovalDecisions write fails");
    assert(
      errorThrown && errorThrown.message.includes("Unable to save approval decision to SharePoint"),
      "recordDecision surfaces descriptive save failure message",
    );
  }

  // ---------------------------------------------------------------------------
  // Test Suite 5: Successful approval write returns directly without mock duplication
  // ---------------------------------------------------------------------------
  console.log("\nTest Suite 5: Successful Approval Write Execution Path");
  {
    let decisionPosted: boolean = false;
    let proposalUpdated: boolean = false;

    const mockHttp = createMockHttpClient({
      get: async (url: string) => {
        const decoded = decodeURIComponent(url);
        if (decoded.includes("CER-2026-9001") && (url.includes("CERProposals") || url.includes("CER_Proposals"))) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              value: [
                {
                  Id: 888,
                  cerprno: "CER-2026-9001",
                  status: "In Approval",
                  owner_email: "initiator@cairnindia.com",
                  owname: "Test Initiator",
                  sbu: "RJ North",
                },
              ],
            }),
          };
        }
        if ((url.includes("CERApprovalDecisions") || url.includes("CER_ApprovalDecisions"))) {
          return { ok: true, status: 200, json: async () => ({ value: [] }) };
        }
        if ((url.includes("CERWorkflowLevels") || url.includes("CER_WorkflowLevels"))) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              value: [
                { Id: 1, level_id: 1, role_title: "L1 Reviewer", sbu: "RJ North", is_active: true },
                { Id: 2, level_id: 2, role_title: "L2 Operations Head", sbu: "RJ North", is_active: true, approver_email: "l2@cairnindia.com" },
              ],
            }),
          };
        }
        return { ok: true, status: 200, json: async () => ({ value: [] }) };
      },
      post: async (url: string, options: any) => {
        if ((url.includes("CERApprovalDecisions") || url.includes("CER_ApprovalDecisions"))) {
          decisionPosted = true;
          return { ok: true, status: 201, json: async () => ({ Id: 301 }) };
        }
        if ((url.includes("CERProposals") || url.includes("CER_Proposals")) && options?.headers?.["X-HTTP-Method"] === "MERGE") {
          proposalUpdated = true;
          return { ok: true, status: 204 };
        }
        return { ok: true, status: 200, json: async () => ({}) };
      },
    });

    const spService = new SharePointCERDataService(mockHttp as any, siteUrl);
    const result = await spService.recordDecision({
      cerprno: "CER-2026-9001",
      level_id: 1,
      approver_name: "L1 Approver",
      approver_email: "l1approver@cairnindia.com",
      decision: "APPROVED",
      comments: "Technical check approved",
    });

    assert(result.success === true, "recordDecision returns success: true");
    assert(result.newStatus === "In Approval", "recordDecision transitions to In Approval for Level 2");
    assert(result.nextLevel === 2, "recordDecision advances to nextLevel: 2");
    assert(Boolean(decisionPosted), "CERApprovalDecisions list item was created in SharePoint");
    assert(Boolean(proposalUpdated), "CERProposals item was updated in SharePoint via MERGE");
  }

  // ---------------------------------------------------------------------------
  // Test Suite 6: Partial multi-step write failure (Decision recorded, Proposal update fails)
  // ---------------------------------------------------------------------------
  console.log("\nTest Suite 6: Partial Multi-Step Failure Diagnostics");
  {
    const mockHttp = createMockHttpClient({
      get: async (url: string) => {
        const decoded = decodeURIComponent(url);
        if (decoded.includes("CER-2026-9001") && (url.includes("CERProposals") || url.includes("CER_Proposals"))) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              value: [
                {
                  Id: 888,
                  cerprno: "CER-2026-9001",
                  status: "In Approval",
                  owner_email: "initiator@cairnindia.com",
                  owname: "Test Initiator",
                  sbu: "RJ North",
                },
              ],
            }),
          };
        }
        if ((url.includes("CERApprovalDecisions") || url.includes("CER_ApprovalDecisions"))) {
          return { ok: true, status: 200, json: async () => ({ value: [] }) };
        }
        if ((url.includes("CERWorkflowLevels") || url.includes("CER_WorkflowLevels"))) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              value: [
                { Id: 1, level_id: 1, role_title: "L1 Reviewer", sbu: "RJ North", is_active: true },
              ],
            }),
          };
        }
        return { ok: true, status: 200, json: async () => ({ value: [] }) };
      },
      post: async (url: string, options: any) => {
        // Step 1: Decision write succeeds
        if ((url.includes("CERApprovalDecisions") || url.includes("CER_ApprovalDecisions"))) {
          return { ok: true, status: 201, json: async () => ({ Id: 301 }) };
        }
        // Step 2: Proposal update fails
        if ((url.includes("CERProposals") || url.includes("CER_Proposals")) && options?.headers?.["X-HTTP-Method"] === "MERGE") {
          return {
            ok: false,
            status: 500,
            text: async () => "Simulated SharePoint 500 on status update",
          };
        }
        return { ok: true, status: 200, json: async () => ({}) };
      },
    });

    const spService = new SharePointCERDataService(mockHttp as any, siteUrl);
    let partialError: any = null;

    try {
      await spService.recordDecision({
        cerprno: "CER-2026-9001",
        level_id: 1,
        approver_name: "L1 Approver",
        approver_email: "l1approver@cairnindia.com",
        decision: "APPROVED",
        comments: "Check passed",
      });
    } catch (e) {
      partialError = e;
    }

    assert(partialError !== null, "Partial multi-step failure is not claimed as full success");
    assert(
      partialError && partialError.message.includes("Approval decision was recorded, but updating proposal status failed"),
      "Error explicitly informs user that decision was recorded so duplicate actions are prevented",
    );
  }

  // ---------------------------------------------------------------------------
  // Test Suite 7: Attachment upload and deletion failures
  // ---------------------------------------------------------------------------
  console.log("\nTest Suite 7: Attachment Upload and Deletion Failures");
  {
    const mockHttp = createMockHttpClient({
      get: async (url: string) => {
        if ((url.includes("CERAttachments") || url.includes("CER_Attachments"))) {
          return { ok: true, status: 200, json: async () => ({ value: [] }) };
        }
        return { ok: true, status: 200, json: async () => ({ value: [] }) };
      },
      post: async (url: string, options: any) => {
        // Attachment upload binary failure
        if (url.includes("files/add(url=")) {
          return {
            ok: false,
            status: 400,
            text: async () => "Simulated SharePoint 400: Quota exceeded in document library",
          };
        }
        // Attachment deletion failure (simulating 500 internal server error)
        if ((url.includes("CERAttachments") || url.includes("CER_Attachments")) && options?.headers?.["X-HTTP-Method"] === "DELETE") {
          return {
            ok: false,
            status: 500,
            text: async () => "Simulated SharePoint 500: Server error deleting attachment item",
          };
        }
        return { ok: true, status: 200, json: async () => ({}) };
      },
    });

    const spService = new SharePointCERDataService(mockHttp as any, siteUrl);

    let uploadError: any = null;
    try {
      await spService.addAttachment({
        id: "att-1",
        cerprno: "CER-2026-9001",
        name: "budget_specs.pdf",
        size: 1024 * 500,
        type: "application/pdf",
        data_url: "data:application/pdf;base64,JVBERi0xLjQK",
        uploaded_by: "Test User",
        uploaded_date: "2026-10-26T12:00:00.000Z",
      });
    } catch (e) {
      uploadError = e;
    }

    assert(uploadError !== null, "addAttachment threw error when upload to library failed");
    assert(
      uploadError && uploadError.message.includes("Unable to save attachment"),
      "addAttachment error clearly indicates upload failure",
    );

    let deleteError: any = null;
    try {
      await spService.deleteAttachment("42");
    } catch (e) {
      deleteError = e;
    }

    assert(deleteError !== null, "deleteAttachment threw error when delete from SharePoint failed");
    assert(
      deleteError && deleteError.message.includes("Unable to delete attachment with ID '42'"),
      "deleteAttachment surfaces clear item ID deletion error",
    );
  }

  // ---------------------------------------------------------------------------
  // Test Suite 8: User role persistence failures
  // ---------------------------------------------------------------------------
  console.log("\nTest Suite 8: User Role Persistence Failures");
  {
    const mockHttp = createMockHttpClient({
      get: async () => ({ ok: true, status: 200, json: async () => ({ value: [] }) }),
      post: async (url: string) => {
        if (url.includes("CER_UserRoles") || url.includes("CERUserRoles")) {
          return {
            ok: false,
            status: 403,
            text: async () => "Simulated SharePoint 403: Only administrators can modify CER_UserRoles",
          };
        }
        return { ok: true, status: 200, json: async () => ({}) };
      },
    });

    const spService = new SharePointCERDataService(mockHttp as any, siteUrl);

    let assignError: any = null;
    try {
      await spService.assignUserRole(
        {
          user_name: "New Approver",
          user_email: "approver@cairnindia.com",
          login_name: "approver@cairnindia.com",
          role: "Approver",
          approval_level: 1,
          department: "Finance",
          sbu: "RJ North",
          is_active: true,
          assigned_by: "Admin",
          assigned_date: "2026-10-26T12:00:00.000Z",
        },
        { name: "Admin", email: "admin@cairnindia.com" },
      );
    } catch (e) {
      assignError = e;
    }

    assert(assignError !== null, "assignUserRole throws error on SharePoint permission failure");
    assert(
      assignError && assignError.message.includes("Unable to assign user role to 'New Approver'"),
      "assignUserRole error message attributes target user and failure cause",
    );
  }

  // ---------------------------------------------------------------------------
  // Test Suite 9: Explicit Mock Mode continues to work perfectly
  // ---------------------------------------------------------------------------
  console.log("\nTest Suite 9: Explicit Mock Mode Availability for Local Dev & Tests");
  {
    const mockService = new LocalMockCERDataService();
    const mockProposals = await mockService.getAllProposals();
    assert(Array.isArray(mockProposals) && mockProposals.length > 0, "LocalMockCERDataService provides mock proposals in mock mode");

    const newMockProp = await mockService.createProposal({
      ...baseTestProposal,
      cerprno: "CER-MOCK-001",
    });
    assert(newMockProp.success === true, "LocalMockCERDataService creates mock proposal in explicit mock mode");

    // Verify DataServiceFactory separation
    DataServiceFactory.resetService();
    const serviceWithoutContext = DataServiceFactory.getService();
    assert(
      serviceWithoutContext instanceof LocalMockCERDataService,
      "DataServiceFactory selects LocalMockCERDataService when no SharePoint context is supplied",
    );

    DataServiceFactory.resetService();
    const mockProps: any = {
      newspHttpClient: mockHttpHelper,
      newsiteUrl: "https://vedanta.sharepoint.com/sites/CERManagementSystemUAT",
    };
    const serviceWithContext = DataServiceFactory.getService(mockProps);
    assert(
      serviceWithContext instanceof SharePointCERDataService,
      "DataServiceFactory selects SharePointCERDataService when SharePoint URL and client are provided",
    );
    DataServiceFactory.resetService();
  }

  // ---------------------------------------------------------------------------
  // Test Suite 10: Segregation of Duties remains strictly enforced
  // ---------------------------------------------------------------------------
  console.log("\nTest Suite 10: Segregation of Duties & 7-Level Approval Integrity");
  {
    const mockHttp = createMockHttpClient({
      get: async (url: string) => {
        const decoded = decodeURIComponent(url);
        if (decoded.includes("CER-2026-9001") && (url.includes("CERProposals") || url.includes("CER_Proposals"))) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              value: [
                {
                  Id: 888,
                  cerprno: "CER-2026-9001",
                  status: "In Approval",
                  owner_email: "initiator@cairnindia.com",
                  owname: "Test Initiator",
                  sbu: "RJ North",
                },
              ],
            }),
          };
        }
        return { ok: true, status: 200, json: async () => ({ value: [] }) };
      },
    });

    const spService = new SharePointCERDataService(mockHttp as any, siteUrl);

    let sodError: any = null;
    try {
      await spService.recordDecision({
        cerprno: "CER-2026-9001",
        level_id: 1,
        approver_name: "Test Initiator",
        approver_email: "initiator@cairnindia.com",
        decision: "APPROVED",
        comments: "Self approval attempt",
      });
    } catch (e) {
      sodError = e;
    }

    assert(sodError !== null, "recordDecision strictly prevents self-approval by proposal initiator");
    assert(
      sodError && sodError.message.includes("Segregation of Duties Enforcement"),
      "Segregation of Duties enforcement message is returned",
    );
  }

  console.log("\n================================================================================");
  console.log(` PERSISTENCE REGRESSION SUMMARY: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  console.log("================================================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runPersistenceRegressionTests().catch((e) => {
  console.error("Unhandled error in test runner:", e);
  process.exit(1);
});
