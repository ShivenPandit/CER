import type { ICERProposal } from "../models/CERModel";

declare const global: any;

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

interface MockRouteHandler {
  (url: string, options?: any): Promise<{ ok: boolean; status: number; json?: () => Promise<any>; text?: () => Promise<string> }>;
}

function createMockSPHttpClient(handler: MockRouteHandler) {
  return {
    get: async (url: string, _config: any, options?: any) => {
      const res = await handler(url, options);
      return {
        ok: res.ok,
        status: res.status,
        statusText: res.ok ? "OK" : "Error",
        json: res.json || (async () => ({})),
        text: res.text || (async () => ""),
      };
    },
    post: async (url: string, _config: any, options?: any) => {
      const res = await handler(url, options);
      return {
        ok: res.ok,
        status: res.status,
        statusText: res.ok ? "OK" : "Error",
        json: res.json || (async () => ({})),
        text: res.text || (async () => ""),
      };
    },
  } as any;
}

export async function runPerformanceOptimizationTests(): Promise<void> {
  console.log("================================================================================");
  console.log(" CER PERFORMANCE AUDIT & RELIABLE SAVE ERROR HANDLING VERIFICATION");
  console.log("================================================================================");

  const { SharePointCERDataService, formatUserFriendlySharePointError } = await import("../services/SharePointCERDataService");
  const siteUrl = "https://vedanta.sharepoint.com/sites/CERManagementSystemUAT";

  // ---------------------------------------------------------------------------------------------
  // Test 1: User-Friendly Error Formatting
  // ---------------------------------------------------------------------------------------------
  console.log("\n--- Test Suite 1: formatUserFriendlySharePointError Sanitization ---");
  {
    const err412 = formatUserFriendlySharePointError(new Error("HTTP 412 Concurrency conflict: ETag mismatch"));
    assert(err412.includes("Concurrency conflict") && err412.includes("Please refresh the proposal"), "412 mapped to user-friendly Concurrency message");

    const err403 = formatUserFriendlySharePointError(new Error("Access denied. You do not have permission (HTTP 403)"));
    assert(err403.includes("Permission Denied") && err403.includes("verify your role assignments"), "403 mapped to user-friendly Permission Denied message");

    const errDup = formatUserFriendlySharePointError(new Error("CER Proposal No. already exists in SharePoint."));
    assert(errDup.includes("already exists"), "Duplicate error message preserved cleanly");

    const err429 = formatUserFriendlySharePointError(new Error("HTTP 429 Throttled"));
    assert(err429.includes("throttled") && err429.includes("Please wait a few moments"), "429 mapped to user-friendly Throttling message");

    const errTimeout = formatUserFriendlySharePointError(new Error("Request timeout exceeded"));
    assert(errTimeout.includes("timed out") && errTimeout.includes("check your network connection"), "Timeout mapped to user-friendly Timeout message");
  }

  // ---------------------------------------------------------------------------------------------
  // Test 2: Operation 1: Draft -> Submit for Approval
  // ---------------------------------------------------------------------------------------------
  console.log("\n--- Test Suite 2: Operation 1 (Draft -> Submit for Approval) ---");
  {
    const calls: Array<{ url: string; method: string }> = [];

    const mockHandler: MockRouteHandler = async (url, options) => {
      const method = options?.headers?.["X-HTTP-Method"] || (options?.body ? "POST" : "GET");
      calls.push({ url, method });

      // Workflow levels
      if (url.includes("CERRoleMatrix") || url.includes("CERApprovalStages") || url.includes("CERWorkflowConfig")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            value: [
              { Id: 1, LevelId: 1, RoleTitle: "L1 - Technical Review", ApproverEmail: "tech@vedanta.com", IsActive: true, SBU: "RJ North" },
            ],
          }),
        };
      }

      // Proposal update
      if (url.includes("CERProposals") && (method === "MERGE" || method === "PATCH" || method === "POST")) {
        return { ok: true, status: 204, json: async () => ({}) };
      }

      // Audit or Notification
      if (url.includes("CERAuditTrail") || url.includes("CERNotifications")) {
        return { ok: true, status: 201, json: async () => ({ Id: 101 }) };
      }

      return { ok: true, status: 200, json: async () => ({ value: [] }) };
    };

    const spHttpClient = createMockSPHttpClient(mockHandler);
    const service = new SharePointCERDataService(spHttpClient, siteUrl);

    const draftProposal: ICERProposal = ({
      id: "42",
      proposal_no: "CER-2026-0042",
      cer_proposal_id: "CER-2026-0042",
      cerprno: "CER-2026-0042",
      pr_name: "Test Draft Submission",
      owname: "Shiven Pandit",
      owner_email: "shiven.pandit@vedanta.com",
      sbu: "RJ North",
      status: "Draft",
      current_level: 0,
      object: "Submitting draft",
      amount: 1500,
      currency: "USD",
      cat: "Vital",
      payable: "Payback",
      period: "Q1",
      cbudget: "Yes",
      jv: "No",
      jv_recoverable: "No",
      jv_budget: "No",
      st_date: "2026-06-01",
      com_date: "2027-06-01",
      total: 1500,
      created_date: "2026-01-01T00:00:00Z",
      request_date: "2026-01-01",
    } as unknown) as ICERProposal;

    const submitPayload: ICERProposal = {
      ...draftProposal,
      status: "In Approval",
    };

    const startTime = Date.now();
    const result = await service.updateProposal(
      submitPayload,
      { name: "Shiven Pandit", email: "shiven.pandit@vedanta.com" },
      draftProposal
    );
    const duration = Date.now() - startTime;

    assert(result.success === true, "Draft submission succeeded");
    assert(result.proposal.status === "In Approval", "Proposal status transitioned to 'In Approval'");
    assert(result.proposal.current_level === 1, "Approval stage initialized to Level 1");
    assert(result.proposal.pending_with_role === "Finance" || result.proposal.pending_with_role === "L1 - Finance", "Pending role assigned to Finance approver");
    assert(result.proposal.request_date === new Date().toISOString().split("T")[0], "Request date updated to today for draft submission");
    assert(!calls.some(c => c.url.includes("CERProposals") && c.method === "GET" && c.url.includes("CER-2026-0042")), "Zero redundant GET proposal queries when originalProposal supplied");
    console.log(`  ⏱ Operation 1 completed in ${duration}ms with ${calls.length} total API requests.`);
  }

  // ---------------------------------------------------------------------------------------------
  // Test 3: Operation 2: Save Changes (bounded parallel audit writes & concurrency)
  // ---------------------------------------------------------------------------------------------
  console.log("\n--- Test Suite 3: Operation 2 (Save Changes with Bounded Parallelism) ---");
  {
    const auditBatchEvents: Array<{ time: number; type: string; field: string }> = [];
    const calls: Array<{ url: string; method: string }> = [];

    const mockHandler: MockRouteHandler = async (url, options) => {
      const method = options?.headers?.["X-HTTP-Method"] || (options?.body ? "POST" : "GET");
      calls.push({ url, method });

      if (url.includes("CERProposals") && (method === "MERGE" || method === "PATCH" || method === "POST")) {
        return { ok: true, status: 204, json: async () => ({}) };
      }

      if (url.includes("CERAuditTrail")) {
        const body = JSON.parse(options?.body || "{}");
        auditBatchEvents.push({ time: Date.now(), type: "audit", field: body.fieldName || body.Title || "" });
        // Simulate 40ms SharePoint write latency per audit record
        await new Promise((resolve) => setTimeout(resolve, 40));
        return { ok: true, status: 201, json: async () => ({ Id: Math.floor(Math.random() * 1000) }) };
      }

      if (url.includes("CERNotifications")) {
        return { ok: true, status: 201, json: async () => ({ Id: 201 }) };
      }

      return { ok: true, status: 200, json: async () => ({ value: [] }) };
    };

    const spHttpClient = createMockSPHttpClient(mockHandler);
    const service = new SharePointCERDataService(spHttpClient, siteUrl);

    const original: ICERProposal = ({
      id: "77",
      proposal_no: "CER-2026-0077",
      cer_proposal_id: "CER-2026-0077",
      cerprno: "CER-2026-0077",
      pr_name: "Original Project Name",
      owname: "Shiven Pandit",
      owner_email: "shiven.pandit@vedanta.com",
      sbu: "RJ North",
      status: "Draft",
      object: "Old objective",
      amount: 1000,
      currency: "USD",
      cat: "Vital",
      payable: "Payback",
      period: "Q1",
      cbudget: "Yes",
      jv: "No",
      jv_recoverable: "No",
      jv_budget: "No",
      st_date: "2026-01-01",
      com_date: "2027-01-01",
      total: 1000,
      cost_assumptions: "Old assumptions",
      remarks: "Old remarks",
    } as unknown) as ICERProposal;

    // Modify 8 distinct fields to test batch chunking (chunk size = 5)
    const modified: ICERProposal = {
      ...original,
      pr_name: "Updated Project Name",
      object: "Updated objective",
      amount: 2500,
      payable: "Revenue",
      period: "Q3",
      st_date: "2026-04-01",
      com_date: "2027-08-01",
      remarks: "Updated remarks",
    };

    const startTime = Date.now();
    const result = await service.updateProposal(
      modified,
      { name: "Shiven Pandit", email: "shiven.pandit@vedanta.com" },
      original
    );
    const duration = Date.now() - startTime;

    assert(result.success === true, "Save Changes succeeded");
    assert(result.auditRowsCount === 8, `Expected 8 audit records created, got ${result.auditRowsCount}`);
    // With sequential execution (8 * 40ms) = 320ms + network. With chunking of 5, (chunk 1: 5 parallel = 40ms, chunk 2: 3 parallel = 40ms) = ~80ms!
    assert(duration < 250, `Bounded parallel batching completed in ${duration}ms (substantially faster than 320ms sequential threshold)`);
    console.log(`  ⏱ Operation 2 with 8 audit fields completed in ${duration}ms.`);
  }

  // ---------------------------------------------------------------------------------------------
  // Test 4: Operation 3: Re-trigger Approval after an Approved Proposal is revised
  // ---------------------------------------------------------------------------------------------
  console.log("\n--- Test Suite 4: Operation 3 (Post-Approval Resubmit & Snapshot Archival) ---");
  {
    let archivedSnapshot: any = null;
    let proposalUpdatedPayload: any = null;

    const mockHandler: MockRouteHandler = async (url, options) => {
      const method = options?.headers?.["X-HTTP-Method"] || (options?.body ? "POST" : "GET");

      // History count lightweight query
      if (url.includes("CERProposalsHistory") && method === "GET") {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            value: [{ Id: 10, Title: "CER-2026-0005", version: "V1" }],
          }),
        };
      }

      // History snapshot write
      if (url.includes("CERProposalsHistory") && (method === "POST" || method === "MERGE")) {
        archivedSnapshot = JSON.parse(options?.body || "{}");
        return { ok: true, status: 201, json: async () => ({ Id: 15 }) };
      }

      // Workflow levels
      if (url.includes("CERRoleMatrix") || url.includes("CERApprovalStages") || url.includes("CERWorkflowConfig")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            value: [
              { Id: 1, LevelId: 1, RoleTitle: "L1 - Technical Review", ApproverEmail: "tech@vedanta.com", IsActive: true, SBU: "RJ North" },
            ],
          }),
        };
      }

      // Proposal update
      if (url.includes("CERProposals") && (method === "MERGE" || method === "PATCH" || method === "POST")) {
        proposalUpdatedPayload = JSON.parse(options?.body || "{}");
        return { ok: true, status: 204, json: async () => ({}) };
      }

      return { ok: true, status: 200, json: async () => ({ value: [] }) };
    };

    const spHttpClient = createMockSPHttpClient(mockHandler);
    const service = new SharePointCERDataService(spHttpClient, siteUrl);

    const approvedOriginal: ICERProposal = ({
      id: "55",
      proposal_no: "CER-2026-0005",
      cer_proposal_id: "CER-2026-0005",
      cerprno: "CER-2026-0005",
      pr_name: "Original Approved Project",
      owname: "Shiven Pandit",
      owner_email: "shiven.pandit@vedanta.com",
      sbu: "RJ North",
      status: "Approved",
      current_level: 6,
      object: "Approved scope",
      amount: 3000,
      currency: "USD",
      cat: "Vital",
      payable: "Payback",
      period: "Q1",
      cbudget: "Yes",
      jv: "No",
      jv_recoverable: "No",
      jv_budget: "No",
      st_date: "2026-01-01",
      com_date: "2027-01-01",
      total: 3000,
      revision_count: 0,
      request_date: "2026-01-01",
    } as unknown) as ICERProposal;

    const postApprovalRevision: ICERProposal = {
      ...approvedOriginal,
      proposal_no: "CER-2026-0005-R1",
      amount: 4500,
      total: 4500,
      object: "Post-approval scope expansion",
    };

    const startTime = Date.now();
    const result = await service.updateProposal(
      postApprovalRevision,
      { name: "Shiven Pandit", email: "shiven.pandit@vedanta.com" },
      approvedOriginal
    );
    const duration = Date.now() - startTime;

    assert(result.success === true, "Post-approval update succeeded");
    assert(result.proposal.status === "In Approval", "Status reset to 'In Approval' for re-trigger");
    assert(result.proposal.current_level === 1, "Level reset to 1 for re-trigger");
    assert(result.proposal.revision_count === 1, "Revision count incremented from 0 to 1");
    assert(result.proposal.cer_proposal_id === "CER-2026-0005", "Permanent CER Proposal ID preserved");
    assert(result.proposal.proposal_no === "CER-2026-0005-R1", "New revision Proposal No. preserved");
    assert(result.proposal.request_date === new Date().toISOString().split("T")[0], "Request date updated to current date for approved re-trigger");
    assert(archivedSnapshot !== null, "Previous approved snapshot successfully archived to CERProposalsHistory");
    console.log(`  ⏱ Operation 3 completed in ${duration}ms.`);
  }

  // ---------------------------------------------------------------------------------------------
  // Test 5: Reliable Save Error Handling (Zero False Success & Fail Closed)
  // ---------------------------------------------------------------------------------------------
  console.log("\n--- Test Suite 5: Reliable Save Error Handling (Zero False Success) ---");
  {
    let secondaryAuditAttempted = false;
    let secondaryNotifAttempted = false;

    const failingHandler: MockRouteHandler = async (url, options) => {
      const method = options?.headers?.["X-HTTP-Method"] || (options?.body ? "POST" : "GET");

      if (url.includes("CERProposals") && (method === "MERGE" || method === "PATCH" || method === "POST")) {
        // Primary write fails with HTTP 500
        return { ok: false, status: 500, text: async () => "Internal SharePoint Database Error" };
      }

      if (url.includes("CERAuditTrail")) {
        secondaryAuditAttempted = true;
      }
      if (url.includes("CERNotifications")) {
        secondaryNotifAttempted = true;
      }

      return { ok: true, status: 200, json: async () => ({ value: [] }) };
    };

    const spHttpClient = createMockSPHttpClient(failingHandler);
    const service = new SharePointCERDataService(spHttpClient, siteUrl);

    const testProposal: ICERProposal = ({
      id: "99",
      proposal_no: "CER-2026-0099",
      cer_proposal_id: "CER-2026-0099",
      cerprno: "CER-2026-0099",
      pr_name: "Fail Closed Test",
      owname: "Shiven Pandit",
      owner_email: "shiven.pandit@vedanta.com",
      sbu: "RJ North",
      status: "Draft",
      object: "Will fail",
      amount: 100,
      currency: "USD",
      cat: "Vital",
      payable: "Payback",
      period: "Q1",
      cbudget: "Yes",
      jv: "No",
      jv_recoverable: "No",
      jv_budget: "No",
      st_date: "2026-01-01",
      com_date: "2027-01-01",
      total: 100,
    } as unknown) as ICERProposal;

    let didThrow = false;
    let caughtError: any = null;

    try {
      await service.updateProposal(
        { ...testProposal, pr_name: "Attempted Name Change" },
        { name: "Shiven Pandit", email: "shiven.pandit@vedanta.com" },
        testProposal
      );
    } catch (err: any) {
      didThrow = true;
      caughtError = err;
    }

    assert(didThrow === true, "Operation threw on primary write failure (no false success)");
    assert(String(caughtError?.message).includes("Unable to save the CER to SharePoint"), "Meaningful error message surfaced to caller");
    assert(secondaryAuditAttempted === false, "Secondary audit write was NOT attempted after primary write failed");
    assert(secondaryNotifAttempted === false, "Secondary notification write was NOT attempted after primary write failed");
  }

  // ---------------------------------------------------------------------------------------------
  // Test 6: Concurrency Conflict Handling (HTTP 412)
  // ---------------------------------------------------------------------------------------------
  console.log("\n--- Test Suite 6: Concurrency Conflict Handling (HTTP 412) ---");
  {
    const concurrencyHandler: MockRouteHandler = async (url, options) => {
      const method = options?.headers?.["X-HTTP-Method"] || (options?.body ? "POST" : "GET");

      if (url.includes("CERProposals") && (method === "MERGE" || method === "PATCH" || method === "POST")) {
        return {
          ok: false,
          status: 412,
          text: async () => "Concurrency conflict: The target item has been modified by another process.",
        };
      }

      return { ok: true, status: 200, json: async () => ({ value: [] }) };
    };

    const spHttpClient = createMockSPHttpClient(concurrencyHandler);
    const service = new SharePointCERDataService(spHttpClient, siteUrl);

    const testProposal: ICERProposal = ({
      id: "99",
      proposal_no: "CER-2026-0099",
      cer_proposal_id: "CER-2026-0099",
      cerprno: "CER-2026-0099",
      pr_name: "Concurrency Test",
      owname: "Shiven Pandit",
      owner_email: "shiven.pandit@vedanta.com",
      sbu: "RJ North",
      status: "Draft",
      object: "Will conflict",
      amount: 100,
      currency: "USD",
      cat: "Vital",
      payable: "Payback",
      period: "Q1",
      cbudget: "Yes",
      jv: "No",
      jv_recoverable: "No",
      jv_budget: "No",
      st_date: "2026-01-01",
      com_date: "2027-01-01",
      total: 100,
      etag: '"3"',
    } as unknown) as ICERProposal;

    let threwConcurrency = false;
    try {
      await service.updateProposal(
        { ...testProposal, pr_name: "Conflict Name Change" },
        { name: "Shiven Pandit", email: "shiven.pandit@vedanta.com" },
        testProposal
      );
    } catch (err: any) {
      threwConcurrency = true;
      const formatted = formatUserFriendlySharePointError(err);
      assert(formatted.includes("Concurrency conflict"), "User-friendly message informs user about modification by another user/session");
    }

    assert(threwConcurrency === true, "Concurrency conflict threw an error as expected");
  }

  // ---------------------------------------------------------------------------------------------
  // Test 7: Non-Silent Secondary Failures Reporting
  // ---------------------------------------------------------------------------------------------
  console.log("\n--- Test Suite 7: Non-Silent Secondary Failures Reporting ---");
  {
    const partialFailureHandler: MockRouteHandler = async (url, options) => {
      const method = options?.headers?.["X-HTTP-Method"] || (options?.body ? "POST" : "GET");

      // Primary write succeeds
      if (url.includes("CERProposals") && (method === "MERGE" || method === "PATCH" || method === "POST")) {
        return { ok: true, status: 204, json: async () => ({}) };
      }

      // Secondary audit write fails
      if (url.includes("CERAuditTrail")) {
        return { ok: false, status: 500, text: async () => "CERAuditTrail service temporarily unavailable" };
      }

      // Secondary notification write fails
      if (url.includes("CERNotifications")) {
        return { ok: false, status: 500, text: async () => "CERNotifications list throttled" };
      }

      return { ok: true, status: 200, json: async () => ({ value: [] }) };
    };

    const spHttpClient = createMockSPHttpClient(partialFailureHandler);
    const service = new SharePointCERDataService(spHttpClient, siteUrl);

    const testProposal: ICERProposal = ({
      id: "99",
      proposal_no: "CER-2026-0099",
      cer_proposal_id: "CER-2026-0099",
      cerprno: "CER-2026-0099",
      pr_name: "Partial Failure Test",
      owname: "Shiven Pandit",
      owner_email: "shiven.pandit@vedanta.com",
      sbu: "RJ North",
      status: "Draft",
      object: "Partial failure test",
      amount: 100,
      currency: "USD",
      cat: "Vital",
      payable: "Payback",
      period: "Q1",
      cbudget: "Yes",
      jv: "No",
      jv_recoverable: "No",
      jv_budget: "No",
      st_date: "2026-01-01",
      com_date: "2027-01-01",
      total: 100,
    } as unknown) as ICERProposal;

    const result = await service.updateProposal(
      { ...testProposal, pr_name: "New Name For Delta" },
      { name: "Shiven Pandit", email: "shiven.pandit@vedanta.com" },
      testProposal
    );

    assert(result.success === true, "Primary proposal write succeeded and was not failed by secondary error");
    assert(result.secondaryFailures !== undefined, "Secondary failures object is present (not silently ignored)");
    assert(result.secondaryFailures?.auditFailedCount === 1, "Audit failure count accurately recorded (1 failed audit record)");
    assert(result.secondaryFailures?.notificationFailed === true, "Notification failure accurately recorded");
    assert(result.warnings !== undefined && result.warnings.length > 0, "Human-readable warnings surfaced in return payload");
  }

  console.log("\n================================================================================");
  console.log(` RESULTS: ${passed} Passed, ${failed} Failed`);
  console.log("================================================================================");

  if (failed > 0) {
    throw new Error(`Performance optimization verification failed with ${failed} failure(s).`);
  }
}

// Run immediately if invoked via CLI
if (typeof require !== "undefined" && (require as any).main === module) {
  runPerformanceOptimizationTests().catch((err) => {
    console.error("Test execution failed:", err);
    if (typeof process !== "undefined" && typeof (process as any).exit === "function") {
      (process as any).exit(1);
    }
  });
}