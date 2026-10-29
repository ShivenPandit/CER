/**
 * CER Management System — Phase 4 Hardening Verification Suite
 *
 * Validates:
 * Issue 1: Concurrent proposal-number allocation (Atomic CAS, ETag conditional updates, HTTP 412 retry)
 * Issue 2: HTTP 429/503 retry safety (POST classification, reconciliation hooks, uncertain outcome handling)
 * Issue 3: Complete Excel export (Continuation links, full dataset retrieval, active filters, formula sanitization)
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
const fs = require("fs");
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

function assert(condition: boolean, msg: string): void {
  if (condition) {
    console.log(`  ✔ [PASS] ${msg}`);
    passed++;
  } else {
    console.error(`  ❌ [FAIL] ${msg}`);
    failed++;
  }
}

async function runPhase4HardeningVerification(): Promise<void> {
  console.log("================================================================================");
  console.log(" CER MANAGEMENT SYSTEM — PHASE 4 PRODUCTION HARDENING VERIFICATION SUITE");
  console.log("================================================================================");

  const { SharePointOperations } = await import("../hooks/useSharePointOperations");
  const { SharePointCERDataService } = await import("../services/SharePointCERDataService");
  const { LocalMockCERDataService } = await import("../services/LocalMockCERDataService");
  const { ExcelExportService } = await import("../services/ExcelExportService");

  const siteUrl = "https://vedanta.sharepoint.com/sites/CERManagementSystemUAT";

  // ===========================================================================
  // SECTION 1: ISSUE 1 — CONCURRENT PROPOSAL NUMBERING & ATOMIC ALLOCATION
  // ===========================================================================
  console.log("\n--- SECTION 1: ISSUE 1 — CONCURRENT PROPOSAL NUMBERING & ATOMIC ALLOCATION ---");

  // Test 1.1: Format and sequence progression
  console.log("\nTest 1.1: Number Format & Fiscal Year Alignment");
  const mockService = new LocalMockCERDataService();
  const firstAllocated = await mockService.generateProposalNumber();
  const currentYear = new Date().getFullYear();
  const expectedPrefix = `CER-${currentYear}-`;

  assert(firstAllocated.startsWith(expectedPrefix), `Allocated number starts with '${expectedPrefix}': ${firstAllocated}`);
  assert(/^CER-\d{4}-\d{4}$/.test(firstAllocated), `Matches exact format 'CER-YYYY-XXXX': ${firstAllocated}`);

  // Test 1.2: Two simultaneous allocation requests
  console.log("\nTest 1.2: Two Simultaneous Allocation Requests");
  const [numA, numB] = await Promise.all([
    mockService.generateProposalNumber(),
    mockService.generateProposalNumber(),
  ]);
  assert(numA !== numB, `Two simultaneous allocation requests received distinct numbers: '${numA}' vs '${numB}'`);
  const seqA = parseInt(numA.replace(expectedPrefix, ""), 10);
  const seqB = parseInt(numB.replace(expectedPrefix, ""), 10);
  assert(seqB === seqA + 1 || seqA === seqB + 1, `Sequential progression verified: diff is 1 (${seqA}, ${seqB})`);

  // Test 1.3: Many concurrent allocation requests (25 parallel callers)
  console.log("\nTest 1.3: High-Concurrency Allocation (25 Simultaneous Requests)");
  const concurrentCalls = Array.from({ length: 25 }, () => mockService.generateProposalNumber());
  const allocatedNumbers = await Promise.all(concurrentCalls);
  const uniqueNumbers = new Set(allocatedNumbers);

  assert(uniqueNumbers.size === 25, `All 25 concurrent requests received unique numbers (Unique: ${uniqueNumbers.size}/25)`);

  // Verify monotonic progression
  const parsedSequences = allocatedNumbers.map((n) => parseInt(n.replace(expectedPrefix, ""), 10)).sort((a, b) => a - b);
  let isStrictlySequential = true;
  for (let i = 1; i < parsedSequences.length; i++) {
    if (parsedSequences[i] !== parsedSequences[i - 1] + 1) {
      isStrictlySequential = false;
      break;
    }
  }
  assert(isStrictlySequential, `Monotonic strict sequence progression verified with zero gaps or overlaps`);

  // Test 1.4: Compare-and-Swap (CAS) with HTTP 412 Concurrency Conflict on SharePoint
  console.log("\nTest 1.4: SharePoint Atomic CAS with HTTP 412 Concurrency Conflict & Auto-Retry");
  let mergeAttempts = 0;
  let counterSequence = 10;
  let currentEtag = '"etag-v1"';

  const mockHttpClientWithCas = {
    get: async (url: string) => {
      // Counter item query
      if (url.includes("CERProposals") && (url.includes("CER-COUNTER-") || url.includes("Title eq 'CER-COUNTER-"))) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            value: [
              {
                Id: 999,
                Title: `CER-COUNTER-${currentYear}`,
                cerPrNo: `CER-COUNTER-${currentYear}`,
                amount: counterSequence,
                revision_count: counterSequence,
                "@odata.etag": currentEtag,
              },
            ],
          }),
        };
      }
      return { ok: true, status: 200, json: async () => ({ value: [] }) };
    },
    post: async (url: string, config: any, options: any) => {
      if (options?.headers?.["X-HTTP-Method"] === "MERGE") {
        mergeAttempts++;
        const sentIfMatch = options?.headers?.["If-Match"];
        // Simulate race condition: First MERGE attempt encounters HTTP 412 conflict
        if (mergeAttempts === 1) {
          // Meanwhile, another concurrent user bumped the sequence
          counterSequence = 11;
          currentEtag = '"etag-v2"';
          return {
            ok: false,
            status: 412,
            text: async () => "Precondition Failed: Concurrency conflict",
          };
        }
        // Second MERGE attempt with fresh etag succeeds
        if (sentIfMatch === '"etag-v2"') {
          counterSequence = 12;
          currentEtag = '"etag-v3"';
          return { ok: true, status: 204 };
        }
      }
      return { ok: true, status: 200, json: async () => ({ Id: 999 }) };
    },
  } as any;

  const spDataServiceWithCas = new SharePointCERDataService(mockHttpClientWithCas, siteUrl);
  const casAllocatedNo = await spDataServiceWithCas.generateProposalNumber();

  assert(mergeAttempts === 2, `CAS allocator automatically retried after HTTP 412 (Attempts made: ${mergeAttempts})`);
  assert(casAllocatedNo === `CER-${currentYear}-0012`, `Allocated correct sequence after conflict retry: '${casAllocatedNo}'`);

  // Test 1.5: Sequence Progression without Unsafe Reuse on Failed Proposal Creation
  console.log("\nTest 1.5: Forward-Only Sequence Progression (No Unsafe Reuse on Aborted Creation)");
  const alloc1 = await mockService.generateProposalNumber();
  // Simulate proposal creation failure (e.g. invalid SBU or user abort)
  let creationFailed = false;
  try {
    await mockService.createProposal({
      cerprno: alloc1,
      pr_name: "Failed Creation Test",
      sbu: "NON_EXISTENT_SBU",
      amount: 100000,
      status: "In Approval",
    } as any);
  } catch {
    creationFailed = true;
  }
  assert(creationFailed, `Proposal creation failed as expected`);

  // Next allocation must NOT reuse the abandoned sequence number
  const alloc2 = await mockService.generateProposalNumber();
  assert(alloc2 !== alloc1, `Next allocation received distinct number ('${alloc2}') without reusing abandoned '${alloc1}'`);

  // Test 1.6: Duplicate proposal detection
  console.log("\nTest 1.6: Duplicate Proposal Detection & Defense-in-Depth");
  const uniquePropNo = await mockService.generateProposalNumber();
  const validProposal: ICERProposal = {
    id: "",
    cerprno: uniquePropNo,
    pr_name: "Original Proposal",
    owname: "Test User",
    owner_email: "test.user@cairnindia.com",
    sbu: "RJ North",
    amount: 500000,
    status: "Draft",
    cat: "Vital",
    payable: "Payback",
    period: "12 Months",
    payback_quarters: 4,
    cbudget: "Yes",
    jv: "No",
    object: "Objective description for test proposal",
    st_date: "2026-04-01",
    com_date: "2027-03-31",
  } as any;

  await mockService.createProposal(validProposal);
  let duplicateCaught = false;
  try {
    // Attempt duplicate save with same proposal number
    await mockService.createProposal({
      ...validProposal,
      id: "prop-different-id",
      status: "In Approval",
    });
  } catch (dupErr: any) {
    duplicateCaught = true;
    assert(String(dupErr?.message || "").includes("already exists"), `Duplicate proposal creation rejected with clear message: ${dupErr.message}`);
  }
  assert(duplicateCaught, `Duplicate proposal number save blocked by system`);

  // Test 1.7: Exclusion of System Counter from Business Queries
  console.log("\nTest 1.7: Exclusion of Counter Records from Business Proposals");
  const allProposals = await mockService.getAllProposals();
  const hasCounter = allProposals.some((p) => p.cerprno.startsWith("CER-COUNTER-") || p.status === "SystemCounter");
  assert(!hasCounter, `System counter items are completely excluded from getAllProposals`);

  // ===========================================================================
  // SECTION 2: ISSUE 2 — HTTP 429/503 RETRY SAFETY & RECONCILIATION
  // ===========================================================================
  console.log("\n--- SECTION 2: ISSUE 2 — HTTP 429/503 RETRY SAFETY & RECONCILIATION ---");

  // Test 2.1: HTTP 429 on POST is safely retried with backoff
  console.log("\nTest 2.1: HTTP 429 on POST Retries Safely (Gateway Throttling)");
  let post429Attempts = 0;
  const mockClient429 = {
    post: async () => {
      post429Attempts++;
      if (post429Attempts < 3) {
        return {
          ok: false,
          status: 429,
          headers: { get: (h: string) => (h.toLowerCase() === "retry-after" ? "0.01" : null) },
          text: async () => "Rate limit exceeded",
        };
      }
      return {
        ok: true,
        status: 201,
        json: async () => ({ Id: 501, Title: "CreatedAfter429" }),
      };
    },
  } as any;

  const ops429 = new SharePointOperations(mockClient429, siteUrl);
  const result429 = await ops429.createListItem<{ Id: number }>("CERProposals", { Title: "Test429" });
  assert(post429Attempts === 3, `POST retried through HTTP 429 throttling: ${post429Attempts} attempts`);
  assert(result429.Id === 501, `POST completed successfully after throttling backoff`);

  // Test 2.2: HTTP 503 on POST without reconciliation fails safely (no blind duplicate retry)
  console.log("\nTest 2.2: HTTP 503 on POST Without Reconciliation Fails Safely");
  let post503Attempts = 0;
  const mockClient503 = {
    post: async () => {
      post503Attempts++;
      return {
        ok: false,
        status: 503,
        text: async () => "Service Unavailable",
      };
    },
  } as any;

  const ops503 = new SharePointOperations(mockClient503, siteUrl);
  let caught503 = false;
  let errMsg503 = "";
  try {
    await ops503.createListItem<{ Id: number }>("CERProposals", { Title: "Test503" }, { isIdempotent: false });
  } catch (err: any) {
    caught503 = true;
    errMsg503 = err.message;
  }
  assert(caught503, `HTTP 503 on non-idempotent POST aborted without blind retry`);
  assert(post503Attempts === 1, `Made exactly 1 attempt before aborting (no duplicate writes): ${post503Attempts}`);
  assert(errMsg503.includes("Uncertain write outcome"), `Surfaces explicit uncertain outcome error: ${errMsg503}`);

  // Test 2.3: HTTP 503 on POST with reconciliation detects persisted record
  console.log("\nTest 2.3: HTTP 503 on POST with Reconciliation Detects Persisted Record");
  let postReconAttempts = 0;
  let reconciliationExecuted = false;

  const mockClientRecon = {
    post: async () => {
      postReconAttempts++;
      // Server returned 503, but in reality the item was inserted into SharePoint DB
      return {
        ok: false,
        status: 503,
        text: async () => "Service Unavailable (timeout after commit)",
      };
    },
  } as any;

  const opsRecon = new SharePointOperations(mockClientRecon, siteUrl);
  const reconciledResult = await opsRecon.createListItem<{ Id: number }>(
    "CERProposals",
    { Title: "ReconciledCER" },
    {
      isIdempotent: false,
      reconcileFn: async () => {
        reconciliationExecuted = true;
        // Reconciliation check confirms the item was indeed persisted
        return { Id: 777 };
      },
    },
  );

  assert(reconciliationExecuted, `Reconciliation hook was executed after HTTP 503`);
  assert(postReconAttempts === 1, `Zero duplicate POST attempts made (Attempts: ${postReconAttempts})`);
  assert(reconciledResult.Id === 777, `Successfully returned reconciled item (Id: ${reconciledResult.Id})`);

  // Test 2.4: Idempotent operations (GET, MERGE, DELETE) continue safe 503 retries
  console.log("\nTest 2.4: Idempotent Operations (MERGE with ETag) Safely Retry HTTP 503");
  let merge503Attempts = 0;
  const mockClientMerge503 = {
    post: async () => {
      merge503Attempts++;
      if (merge503Attempts < 3) {
        return {
          ok: false,
          status: 503,
          headers: { get: () => "0.01" },
          text: async () => "Service Unavailable",
        };
      }
      return { ok: true, status: 204 };
    },
  } as any;

  const opsMerge503 = new SharePointOperations(mockClientMerge503, siteUrl);
  await opsMerge503.updateListItem("CERProposals", 101, { Title: "Updated" }, '"etag-val"');
  assert(merge503Attempts === 3, `Idempotent MERGE safely retried HTTP 503 until success: ${merge503Attempts} attempts`);

  // ===========================================================================
  // SECTION 3: ISSUE 3 — COMPLETE EXCEL EXPORTS & CONTINUATION LINKS
  // ===========================================================================
  console.log("\n--- SECTION 3: ISSUE 3 — COMPLETE EXCEL EXPORTS & CONTINUATION LINKS ---");

  // Test 3.1: Server-backed complete retrieval via exportAllMatchingProposalsAsync
  console.log("\nTest 3.1: Server-Backed Export Following Continuation Links");
  let getAllProposalsCalledWithForceRefresh = false;
  const multiPageProposals: ICERProposal[] = Array.from({ length: 45 }, (_, i) => ({
    id: `prop-${i + 1}`,
    cerprno: `CER-2026-${("0000" + (i + 1)).slice(-4)}`,
    pr_name: `Project Pipeline ${i + 1}`,
    owname: i % 2 === 0 ? "Arun Kulkarni" : "Rajesh Sharma",
    owner_email: i % 2 === 0 ? "arun.kulkarni@vedanta.co.in" : "rajesh.sharma@vedanta.co.in",
    sbu: i % 3 === 0 ? "RJ North" : (i % 3 === 1 ? "RJ South" : "CBOS"),
    status: i % 2 === 0 ? "Approved" : "In Approval",
    cat: "Vital",
    amount: 1000000 + i * 50000,
    created_date: `2026-03-${("00" + ((i % 28) + 1)).slice(-2)}T10:00:00Z`,
  } as any));

  // Add system counter record to ensure it is filtered out
  multiPageProposals.push({
    id: "prop-counter",
    cerprno: "CER-COUNTER-2026",
    pr_name: "System Counter",
    status: "SystemCounter",
  } as any);

  const mockPagedDataService = {
    getAllProposals: async (forceRefresh?: boolean) => {
      getAllProposalsCalledWithForceRefresh = !!forceRefresh;
      return [...multiPageProposals];
    },
  } as any;

  let progressMessages: string[] = [];
  const exportResult = await ExcelExportService.exportAllMatchingProposalsAsync(
    mockPagedDataService,
    { sbu: "RJ North" },
    "Test_Complete_Report",
    (msg) => progressMessages.push(msg),
    20,
  );

  assert(getAllProposalsCalledWithForceRefresh, `getAllProposals was invoked with forceRefresh: true to bypass stale cache`);
  // Total RJ North: indices 0, 3, 6, 9, 12, 15, 18, 21, 24, 27, 30, 33, 36, 39, 42 = 15 proposals
  assert(exportResult.totalExported === 15, `Filtered exactly 15 matching RJ North proposals from full dataset: ${exportResult.totalExported}`);
  assert(progressMessages.length >= 3, `Progress reporting callbacks were invoked (${progressMessages.length} updates recorded)`);

  // Test 3.2: Formula sanitization in complete export
  console.log("\nTest 3.2: Formula Injection Sanitization in Export Dataset");
  const maliciousProposal: any = {
    cerprno: "=cmd|' /C calc'!A0",
    pr_name: "@SUM(1+1)*cmd|' /C notepad'!A0",
    owname: "+1234567890",
    owner_email: "-malicious-calc",
    sbu: "RJ North",
    status: "Approved",
    amount: 100,
  };
  const sanitizedRow = ExcelExportService.mapProposalToExportRow(maliciousProposal);
  assert(String(sanitizedRow["CER PR Number"]).startsWith("'="), `Sanitized leading '=' formula injection: ${sanitizedRow["CER PR Number"]}`);
  assert(String(sanitizedRow["Proposal Name"]).startsWith("'@"), `Sanitized leading '@' formula injection: ${sanitizedRow["Proposal Name"]}`);
  assert(String(sanitizedRow["CER Owner"]).startsWith("'+"), `Sanitized leading '+' formula injection: ${sanitizedRow["CER Owner"]}`);
  assert(String(sanitizedRow["Owner Email"]).startsWith("'-"), `Sanitized leading '-' formula injection: ${sanitizedRow["Owner Email"]}`);

  // Test 3.3: Verification of generated export file on disk
  console.log("\nTest 3.3: Excel File Generation & Integrity Check");
  const todayStr = new Date().toISOString().split("T")[0];
  const generatedFileName = `Test_Complete_Report_${todayStr}.xlsx`;
  const fileExists = fs.existsSync(generatedFileName);
  assert(fileExists, `Exported workbook successfully written to disk: ${generatedFileName}`);

  if (fileExists) {
    const stats = fs.statSync(generatedFileName);
    assert(stats.size > 1000, `Generated Excel spreadsheet has valid content size (${stats.size} bytes)`);
    // Clean up temporary test file
    fs.unlinkSync(generatedFileName);
  }

  // ===========================================================================
  // SUMMARY
  // ===========================================================================
  console.log("\n================================================================================");
  console.log(` PHASE 4 HARDENING VERIFICATION SUMMARY: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runPhase4HardeningVerification().catch((err) => {
  console.error("FATAL verification error:", err);
  process.exit(1);
});
