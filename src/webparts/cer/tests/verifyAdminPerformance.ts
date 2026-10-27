/* eslint-disable require-atomic-updates */
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

async function testPerformanceOptimizations() {
  console.log("================================================================================");
  console.log(" Admin Console Performance & Deduplication Verification Suite");
  console.log("================================================================================\n");

  const { SharePointCERDataService } = await import("../services/SharePointCERDataService");

  let networkCallCount = 0;
  const queriedUrls: string[] = [];

  // Mock SPHttpClient that tracks network calls and query parameters
  const mockSpHttpClient = {
    get: async (url: string) => {
      networkCallCount++;
      queriedUrls.push(url);

      if (url.includes("CER_UserRoles")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            value: [
              {
                ID: 1,
                Title: "Shiven Pandit",
                user_email: "Shiven.Pandit@cairnindia.com",
                login_name: "70007144@cairnindia.com",
                role: "Admin",
                is_active: true,
                assigned_by: "System",
                assigned_date: new Date().toISOString(),
              },
            ],
          }),
        };
      }

      if (url.includes("CER_WorkflowLevels")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            value: [
              {
                ID: 10,
                level_id: 1,
                level_name: "Level 1 - Technical Review",
                role_title: "Technical Reviewer",
                sbu: "All",
                is_active: true,
              },
            ],
          }),
        };
      }

      return {
        ok: true,
        status: 200,
        json: async () => ({ value: [] }),
      };
    },
    post: async () => ({
      ok: true,
      status: 200,
      json: async () => ({ Id: 999 }),
      text: async () => "",
    }),
  } as any;

  const service = new SharePointCERDataService(
    mockSpHttpClient,
    "https://vedanta.sharepoint.com/sites/CERManagementSystemUAT"
  );

  // Test 1: Field projection ($select)
  console.log("Test 1: Field Projection ($select) Verification");
  await service.getUserRoles();
  const lastUrl = queriedUrls[queriedUrls.length - 1];
  const hasSelect = lastUrl.includes("$select=");
  console.log(`  ${hasSelect ? "✔ [PASS]" : "✖ [FAIL]"} getUserRoles specifies $select projection to minimize payload size`);
  if (!hasSelect) throw new Error("getUserRoles did not include $select");

  // Test 2: In-memory Caching (30s TTL)
  console.log("\nTest 2: In-Memory Caching (30s TTL)");
  const callsBeforeCached = networkCallCount;
  await service.getUserRoles();
  await service.getUserRoles();
  const callsAfterCached = networkCallCount;
  const cachedRolesWorked = callsBeforeCached === callsAfterCached;
  console.log(`  ${cachedRolesWorked ? "✔ [PASS]" : "✖ [FAIL]"} Subsequent getUserRoles() calls served immediately from cache (0 network requests)`);
  if (!cachedRolesWorked) throw new Error("getUserRoles caching failed");

  // Test 3: Concurrent In-Flight Deduplication
  console.log("\nTest 3: Concurrent Request Deduplication (Single-Flight)");
  service.clearCache();
  networkCallCount = 0;
  queriedUrls.splice(0, queriedUrls.length);

  // Simulate AdminConsoleView loading both getUserRoles and getWorkflowLevels in parallel
  const [roles, levels] = await Promise.all([
    service.getUserRoles(),
    service.getWorkflowLevels(),
  ]);

  console.log(`  Roles returned: ${roles.length}, Levels returned: ${levels.length}`);
  console.log(`  Total network calls made: ${networkCallCount}`);
  // Expected: Exactly 2 calls (1 for CER_UserRoles, 1 for CER_WorkflowLevels)
  // WITHOUT deduplication, it would have been 3 calls (2 to CER_UserRoles, 1 to CER_WorkflowLevels)
  const userRolesCallCount = queriedUrls.filter((u) => u.includes("CER_UserRoles")).length;
  const workflowLevelsCallCount = queriedUrls.filter((u) => u.includes("CER_WorkflowLevels")).length;
  console.log(`  Calls to CER_UserRoles: ${userRolesCallCount} (Expected: 1)`);
  console.log(`  Calls to CER_WorkflowLevels: ${workflowLevelsCallCount} (Expected: 1)`);

  const deduplicationWorked = userRolesCallCount === 1 && workflowLevelsCallCount === 1;
  console.log(`  ${deduplicationWorked ? "✔ [PASS]" : "✖ [FAIL]"} Deduplication prevented redundant parallel query to CER_UserRoles`);
  if (!deduplicationWorked) throw new Error("Deduplication failed");

  // Test 4: Cache Invalidation on Mutation
  console.log("\nTest 4: Cache Invalidation on Role Mutation");
  const callsBeforeMutation = networkCallCount;
  await service.assignUserRole(
    {
      user_name: "Test User",
      user_email: "test@example.com",
      login_name: "test@example.com",
      role: "Initiator",
      is_active: true,
      assigned_by: "Admin",
      assigned_date: new Date().toISOString(),
    },
    { name: "Admin", email: "admin@example.com" }
  );

  // Calling getUserRoles() after mutation should make a fresh network call
  await service.getUserRoles();
  const freshFetchAfterMutation = networkCallCount > callsBeforeMutation;
  console.log(`  ${freshFetchAfterMutation ? "✔ [PASS]" : "✖ [FAIL]"} assignUserRole invalidated cache; fresh data fetched from SharePoint`);
  if (!freshFetchAfterMutation) throw new Error("Cache invalidation failed");

  console.log("\n================================================================================");
  console.log(" ALL PERFORMANCE OPTIMIZATION TESTS PASSED SUCCESSFULLY");
  console.log("================================================================================\n");
}

testPerformanceOptimizations().catch((err) => {
  console.error("Performance tests failed:", err);
  (process as any).exit(1);
});
