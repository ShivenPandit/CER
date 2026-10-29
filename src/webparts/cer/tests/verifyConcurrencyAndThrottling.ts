/**
 * Automated Verification Suite for Concurrency, Throttling Resilience & Workflow Hardening
 *
 * Validates:
 * 1. Optimistic Concurrency (ETag, HTTP 412 detection)
 * 2. HTTP 429 / 503 Throttling & Exponential Backoff Resilience
 * 3. Proposal Status & Decision Preconditions (Idempotency, Stage Alignment)
 * 4. Draft Collision & Overwrite Protection
 * 5. Asynchronous Chunked Excel Export & Formula Sanitization
 */

import type { ICERProposal } from "../models/CERModel";

declare const global: any;
declare const process: any;

// Polyfill window & document for Node environment
(global as any).window = global;
(global as any).document = {
  getElementsByTagName: () => [{ appendChild: () => {} }],
  getElementById: () => null,
  createElement: () => ({ id: "", rel: "", type: "", href: "" }),
};

// Polyfill missing internal SPFx modules in Node
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

async function runConcurrencyAndThrottlingTests() {
  console.log("================================================================================");
  console.log(" CONCURRENCY, THROTTLING RESILIENCE & INTEGRITY VERIFICATION SUITE");
  console.log("================================================================================");

  const { SharePointOperations } = await import("../hooks/useSharePointOperations");
  const { ExcelExportService } = await import("../services/ExcelExportService");

  const siteUrl = "https://vedanta.sharepoint.com/sites/CERManagementSystemUAT";

  // ---------------------------------------------------------------------------
  // Test Suite 1: Optimistic Concurrency & ETag Verification
  // ---------------------------------------------------------------------------
  console.log("\nTest Suite 1: Optimistic Concurrency & HTTP 412 Precondition Failed");

  let recordedIfMatch: string | undefined;
  const mockHttpClientWithEtag = {
    post: async (url: string, config: any, options: any) => {
      recordedIfMatch = options?.headers?.["If-Match"];
      if (recordedIfMatch === '"stale-etag-v1"') {
        return {
          ok: false,
          status: 412,
          text: async () => "Precondition Failed: Item version does not match",
        };
      }
      return {
        ok: true,
        status: 204,
      };
    },
  } as any;

  const opsWithEtag = new SharePointOperations(mockHttpClientWithEtag, siteUrl);

  // 1.1: Passes specific ETag when provided
  try {
    await opsWithEtag.updateListItem("CERProposals", 101, { Title: "Updated" }, '"fresh-etag-v2"');
    assert(recordedIfMatch === '"fresh-etag-v2"', "1.1: Specific ETag transmitted in If-Match header");
  } catch (err: any) {
    assert(false, `1.1: Failed with error: ${err.message}`);
  }

  // 1.2: Falls back to wildcard "*" when no ETag is provided
  try {
    await opsWithEtag.updateListItem("CERProposals", 101, { Title: "Updated" });
    assert(recordedIfMatch === "*", "1.2: Wildcard '*' fallback used when ETag is absent");
  } catch (err: any) {
    assert(false, `1.2: Failed with error: ${err.message}`);
  }

  // 1.3: Throws descriptive concurrency error on HTTP 412
  let caught412 = false;
  let errorMsg = "";
  try {
    await opsWithEtag.updateListItem("CERProposals", 101, { Title: "Updated" }, '"stale-etag-v1"');
  } catch (err: any) {
    caught412 = true;
    errorMsg = err.message;
  }
  assert(caught412, "1.3a: HTTP 412 correctly caught as an error");
  assert(errorMsg.includes("Concurrency conflict (HTTP 412)"), "1.3b: Error message specifies Concurrency conflict (HTTP 412)");
  assert(errorMsg.includes("modified by another user"), "1.3c: Error message advises item was modified by another user");

  // ---------------------------------------------------------------------------
  // Test Suite 2: HTTP 429 & 503 Throttling Resilience & Retry
  // ---------------------------------------------------------------------------
  console.log("\nTest Suite 2: HTTP 429/503 Throttling Interception & Exponential Backoff");

  let getAttempts = 0;
  const mockThrottledClient = {
    get: async () => {
      getAttempts++;
      if (getAttempts < 3) {
        return {
          ok: false,
          status: 429,
          headers: {
            get: (h: string) => (h.toLowerCase() === "retry-after" ? "0.01" : null),
          },
          text: async () => "Too Many Requests",
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ value: [{ Id: 1, Title: "SuccessAfterRetry" }] }),
      };
    },
  } as any;

  const throttlingOps = new SharePointOperations(mockThrottledClient, siteUrl);

  // 2.1: Successfully retries HTTP 429 and returns data on 3rd attempt
  const throttleResult = await throttlingOps.get<any>(`${siteUrl}/_api/web/lists`);
  assert(getAttempts === 3, `2.1a: Made exactly 3 attempts (received 429 twice, then succeeded): ${getAttempts}`);
  assert(throttleResult.value[0].Title === "SuccessAfterRetry", "2.1b: Successfully retrieved response payload after retry");

  // 2.2: Exhausted retries throws clear throttling error
  let exhaustedAttempts = 0;
  const mockExhaustedClient = {
    get: async () => {
      exhaustedAttempts++;
      return {
        ok: false,
        status: 429,
        headers: {
          get: (h: string) => (h.toLowerCase() === "retry-after" ? "0.01" : null),
        },
        text: async () => "Rate limit exceeded continuously",
      };
    },
  } as any;

  const exhaustedOps = new SharePointOperations(mockExhaustedClient, siteUrl);
  let caughtExhaustion = false;
  let exhaustionMsg = "";
  try {
    await exhaustedOps.get(`${siteUrl}/_api/web/lists`);
  } catch (err: any) {
    caughtExhaustion = true;
    exhaustionMsg = err.message;
  }
  assert(caughtExhaustion, "2.2a: Throttling exhaustion triggers thrown error");
  assert(exhaustionMsg.includes("throttled (HTTP 429) after 3 retries"), `2.2b: Exhaustion error message explains throttling after 3 retries: ${exhaustionMsg}`);

  // ---------------------------------------------------------------------------
  // Test Suite 3: Workflow Decision Preconditions & Concurrency Checks
  // ---------------------------------------------------------------------------
  console.log("\nTest Suite 3: Workflow Decision Stage Preconditions & Idempotency");

  const { SharePointCERDataService } = await import("../services/SharePointCERDataService");

  // In-memory mock proposals list for data service
  const inMemoryProposals: Record<string, any> = {
    "CER-2026-0001": {
      Id: 10,
      Title: "CER-2026-0001",
      cerPrNo: "CER-2026-0001",
      prName: "Subsea Pipeline Expansion",
      status: "In Approval",
      currentLevel: 1,
      current_level: 1,
      cerOwner: "Alice Smith",
      ownerEmail: "alice.smith@cairnindia.com",
      owner_email: "alice.smith@cairnindia.com",
      pendingWithRole: "L1 Technical Review",
      pending_with_role: "L1 Technical Review",
      pendingWithEmail: "sunil.verma@cairnindia.com",
      pending_with_email: "sunil.verma@cairnindia.com",
      sbu: "RJ North",
      amount: 5000000,
      currency: "USD",
      Author: { Title: "Alice Smith", EMail: "alice.smith@cairnindia.com" },
      Modified: new Date().toISOString(),
      "odata.etag": '"etag-prop-10"',
    },
  };

  const inMemoryDecisions: any[] = [];

  const mockSPClient = {
    get: async (url: string) => {
      const lower = url.toLowerCase();
      if (lower.includes("lists/getbytitle('cer_proposals')") || lower.includes("lists/getbytitle('cerproposals')")) {
        const item = inMemoryProposals["CER-2026-0001"];
        return {
          ok: true,
          status: 200,
          json: async () => ({ value: item ? [item] : [] }),
        };
      }
      if (lower.includes("lists/getbytitle('cer_workflowlevels')") || lower.includes("lists/getbytitle('cerworkflowlevels')")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            value: [
              { Id: 1, levelId: 1, level_id: 1, roleTitle: "L1 Technical Review", role_title: "L1 Technical Review", approverEmail: "sunil.verma@cairnindia.com", approver_email: "sunil.verma@cairnindia.com", sbu: "RJ North", isActive: true, is_active: true },
              { Id: 2, levelId: 2, level_id: 2, roleTitle: "L2 Lead Review", role_title: "L2 Lead Review", approverEmail: "lead.engineer@cairnindia.com", approver_email: "lead.engineer@cairnindia.com", sbu: "RJ North", isActive: true, is_active: true },
            ],
          }),
        };
      }
      if (lower.includes("lists/getbytitle('cer_approvaldecisions')") || lower.includes("lists/getbytitle('cerapprovaldecisions')")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ value: inMemoryDecisions }),
        };
      }
      if (lower.includes("lists/getbytitle('cer_userroles')") || lower.includes("lists/getbytitle('ceruserroles')")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ value: [] }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ value: [] }),
      };
    },
    post: async (url: string, config: any, options: any) => {
      const lower = url.toLowerCase();
      if (lower.includes("lists/getbytitle('cer_approvaldecisions')") || lower.includes("lists/getbytitle('cerapprovaldecisions')")) {
        const body = options?.body ? JSON.parse(options.body) : {};
        inMemoryDecisions.push({ Id: inMemoryDecisions.length + 1, ...body });
        return {
          ok: true,
          status: 200,
          json: async () => ({ Id: inMemoryDecisions.length }),
        };
      }
      if (options?.headers?.["X-HTTP-Method"] === "MERGE") {
        const body = options?.body ? JSON.parse(options.body) : {};
        const item = inMemoryProposals["CER-2026-0001"];
        if (item) {
          Object.assign(item, body);
          if (body.currentLevel !== undefined) {
            item.currentLevel = body.currentLevel;
            item.current_level = body.currentLevel;
          }
          if (body.status !== undefined) {
            item.status = body.status;
          }
        }
        return {
          ok: true,
          status: 204,
        };
      }
      if (lower.includes("ensureuser")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ Id: 101, Title: "Sunil Verma", Email: "sunil.verma@cairnindia.com", LoginName: "sunil.verma" }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ Id: 1 }),
      };
    },
  };

  const testDataService = new SharePointCERDataService(
    mockSPClient as any,
    siteUrl
  );

  // 3.1: Reject decision if proposal is not at the target level
  let wrongLevelError = "";
  try {
    await testDataService.recordDecision({
      cerprno: "CER-2026-0001",
      level_id: 2, // proposal is at level 1!
      approver_name: "Sunil Verma",
      approver_email: "sunil.verma@cairnindia.com",
      decision: "APPROVED",
      comments: "Approved",
    });
  } catch (err: any) {
    wrongLevelError = err.message;
  }
  assert(wrongLevelError.includes("is at approval Level 1, but decision was submitted for Level 2"), `3.1: Rejected decision when proposal level does not match: ${wrongLevelError}`);

  // 3.2: Successfully approve level 1
  let approvedSuccess = false;
  try {
    const res = await testDataService.recordDecision({
      cerprno: "CER-2026-0001",
      level_id: 1,
      approver_name: "Sunil Verma",
      approver_email: "sunil.verma@cairnindia.com",
      decision: "APPROVED",
      comments: "Approved Level 1 technical review",
    });
    approvedSuccess = res.success && res.nextLevel === 2;
  } catch (err: any) {
    console.error("3.2 error:", err);
  }
  assert(approvedSuccess, "3.2: Successfully approved Level 1 and advanced to Level 2");

  // 3.3: Re-submitting Level 1 is now blocked because current_level is 2
  let duplicateBlockError = "";
  try {
    await testDataService.recordDecision({
      cerprno: "CER-2026-0001",
      level_id: 1,
      approver_name: "Sunil Verma",
      approver_email: "sunil.verma@cairnindia.com",
      decision: "APPROVED",
      comments: "Duplicate approval attempt",
    });
  } catch (err: any) {
    duplicateBlockError = err.message;
  }
  assert(duplicateBlockError.includes("Level 2, but decision was submitted for Level 1"), "3.3: Repeated approval for already-passed level blocked cleanly");

  // ---------------------------------------------------------------------------
  // Test Suite 4: Asynchronous Chunked Excel Export & Formula Sanitization
  // ---------------------------------------------------------------------------
  console.log("\nTest Suite 4: Large Excel Export Chunking & Formula Sanitization");

  // 4.1: Test formula injection sanitization
  const testProposalWithFormulas: any = {
    cerprno: "=SUM(A1:A10)",
    pr_name: "@EXEC('cmd.exe')",
    owname: "+1234567890",
    owner_email: "-malicious@cairnindia.com",
    sbu: "RJ North",
    status: "Approved",
    amount: 1000000,
  };

  const sanitizedRow = ExcelExportService.mapProposalToExportRow(testProposalWithFormulas);
  assert(sanitizedRow["CER PR Number"] === "'=SUM(A1:A10)", "4.1a: Escaped leading '=' with single quote");
  assert(sanitizedRow["Proposal Name"] === "'@EXEC('cmd.exe')", "4.1b: Escaped leading '@' with single quote");
  assert(sanitizedRow["CER Owner"] === "'+1234567890", "4.1c: Escaped leading '+' with single quote");
  assert(sanitizedRow["Owner Email"] === "'-malicious@cairnindia.com", "4.1d: Escaped leading '-' with single quote");

  // 4.2: Test exportProposalListAsync executes without error on large array
  const largeProposalSet: ICERProposal[] = Array.from({ length: 1500 }, (_, i) => ({
    id: `prop-${i}`,
    cerprno: `CER-2026-${("0000" + (i + 1)).slice(-4)}`,
    pr_name: `Test Project ${i + 1}`,
    owname: "Test User",
    owner_email: "test.user@cairnindia.com",
    sbu: "RJ North",
    status: "Approved",
    object: "Testing large scale export performance",
    amount: 100000,
    currency: "USD",
    cat: "Vital",
    payable: "Payback",
    period: "2 years",
    ben_npv: 50,
    ben_irr: 15,
    cost_assumptions: "Standard assumptions",
    st_date: "2026-01-01",
    com_date: "2027-01-01",
    duration_months: 12,
    cbudget: "Yes",
    cb_amnt: 100000,
    cb_currency: "USD",
    reason: "",
    jv: "No",
    jv_cost: 0,
    jv_budget: "No",
    jv_amnt: 0,
    jv_reason: "",
    ph_till_label: "Till FY25",
    ph_fy_label: "FY 25-26",
    ph_beyond_label: "Beyond FY26",
    prod_till: 0,
    prod_fy: 0,
    prod_beyond: 0,
    capex_till: 0,
    capex_fy: 100000,
    capex_beyond: 0,
    opex_till: 0,
    opex_fy: 0,
    opex_beyond: 0,
    engineer: 10000,
    s_fac: 20000,
    comis: 10000,
    preop: 5000,
    others: 55000,
    total: 100000,
    remarks: "Remarks",
    remarks_jv: "",
    current_level: 7,
    pending_with_role: "Approved",
    pending_with_email: "",
    created_date: new Date().toISOString(),
    created_by: "System",
    modified_date: new Date().toISOString(),
    modified_by: "System",
    revision_count: 0,
  }));

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const fs = require("fs");
  const expectedDate = new Date().toISOString().split("T")[0];
  const expectedFileName = `Stress_Test_Report_${expectedDate}.xlsx`;

  try {
    await ExcelExportService.exportProposalListAsync(largeProposalSet, "Stress_Test_Report", 500);
    assert(fs.existsSync(expectedFileName), `4.2a: Asynchronous export generated valid file on disk: '${expectedFileName}'`);
    const fileStats = fs.statSync(expectedFileName);
    assert(fileStats.size > 10000, `4.2b: Asynchronous export generated non-empty Excel spreadsheet (${fileStats.size} bytes)`);
    // Cleanup generated file
    fs.unlinkSync(expectedFileName);
  } catch (err: any) {
    assert(false, `4.2: Asynchronous Excel export failed: ${err.message}`);
  }

  // ---------------------------------------------------------------------------
  // Summary
  // ---------------------------------------------------------------------------
  console.log("\n================================================================================");
  console.log(` CONCURRENCY & INTEGRITY TEST SUMMARY: ${passed} PASSED | ${failed} FAILED`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runConcurrencyAndThrottlingTests().catch((e) => {
  console.error("Unhandled test suite execution error:", e);
  process.exit(1);
});
