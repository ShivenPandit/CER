export {};

declare const global: any;
declare const process: any;

// Polyfill window & document for Node environment
(global as any).window = global;
(global as any).document = {
  getElementsByTagName: () => [{ appendChild: () => {} }],
  getElementById: () => null,
  createElement: () => ({ id: '', rel: '', type: '', href: '' }),
};

// Polyfill SPFx module loader in Node
/* eslint-disable @typescript-eslint/no-var-requires, prefer-rest-params */
const Module = require('module');
const origLoad = Module._load;
Module._load = function (request: string, ...args: any[]) {
  if (request.startsWith('@msinternal')) {
    return {
      isFlightEnabled: () => false,
      isExperimentEnabled: () => false,
    };
  }
  return origLoad.apply(this, [request, ...args]);
};

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

async function runPersonFieldServiceTests() {
  console.log('================================================================================');
  console.log(' SharePoint Person or Group Fields Verification Suite');
  console.log('================================================================================');

  const { PersonFieldService } = await import('../services/PersonFieldService');
  const { SharePointOperations } = await import('../hooks/useSharePointOperations');
  const { SharePointCERDataService } = await import('../services/SharePointCERDataService');

  const siteUrl = 'https://vedanta.sharepoint.com/sites/CERManagementSystemUAT';

  // ---------------------------------------------------------------------------
  // Suite 1: Resolving a User Successfully via ensureUser & Claims Normalization
  // ---------------------------------------------------------------------------
  console.log('\nTest Suite 1: Resolving User via ensureUser & Claims Normalization');
  PersonFieldService.clearCache();

  let ensureUserCallCount = 0;
  const mockClient: any = {
    post: async (url: string, config: any, options: any) => {
      ensureUserCallCount++;
      const body = JSON.parse(options.body || '{}');
      if (body.logonName && body.logonName.includes('unresolvable')) {
        return {
          ok: false,
          status: 404,
          statusText: 'User cannot be found in directory',
          text: async () => 'User cannot be found in directory',
        };
      }
      if (body.logonName && body.logonName.includes('invalid_id')) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ Id: -1, Title: 'Invalid', Email: 'invalid@vedanta.co.in' }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          Id: 105,
          Title: 'Demo User',
          Email: 'demo.user@example.com',
          LoginName: 'i:0#.f|membership|demo.user@example.com',
          IsSiteAdmin: true,
        }),
      };
    },
  };

  const resolved = await PersonFieldService.resolveUser(mockClient, siteUrl, 'demo.user@example.com');
  assert(resolved.Id === 105, 'Resolved user ID is 105');
  assert(resolved.Title === 'Demo User', 'Resolved Title is Demo User');
  assert(resolved.Email === 'demo.user@example.com', 'Resolved Email is demo.user@example.com');
  assert(resolved.LoginName === 'i:0#.f|membership|demo.user@example.com', 'Resolved LoginName preserved');
  assert(resolved.IsSiteAdmin === true, 'Resolved IsSiteAdmin is true');
  assert(ensureUserCallCount === 1, 'Initial ensureUser call made to SharePoint');

  // Test claims stripping normalization
  const normClaims = PersonFieldService.normalizeLogon('i:0#.f|membership|user@example.com');
  assert(normClaims === 'user@example.com', 'Normalized claims prefix stripped');

  // ---------------------------------------------------------------------------
  // Suite 2: Reusing Cached User ID (No Redundant Network Calls)
  // ---------------------------------------------------------------------------
  console.log('\nTest Suite 2: Reusing Cached User ID');
  const cachedUser = await PersonFieldService.resolveUser(mockClient, siteUrl, 'demo.user@example.com');
  assert(cachedUser.Id === 105, 'Cached user returns correct Id 105');
  assert(ensureUserCallCount === 1, 'Cache hit: No redundant ensureUser network call executed');

  // Context-aware caching: query to different site URL MUST NOT use cache of siteUrl
  const otherSiteUrl = 'https://vedanta.sharepoint.com/sites/DifferentSite';
  await PersonFieldService.resolveUser(mockClient, otherSiteUrl, 'demo.user@example.com');
  assert(ensureUserCallCount === 2, 'Site-context aware: Querying different site URL triggers fresh ensureUser');

  // ---------------------------------------------------------------------------
  // Suite 3: Handling Unresolvable or Invalid User
  // ---------------------------------------------------------------------------
  console.log('\nTest Suite 3: Handling Unresolvable or Invalid Users (Fail-Closed)');
  let unresolvableFailed = false;
  try {
    await PersonFieldService.resolveUser(mockClient, siteUrl, 'unresolvable.ghost@vedanta.co.in');
  } catch (err: any) {
    unresolvableFailed = true;
    assert(err.message.includes('404'), 'Failed with explicit 404 message for unresolvable user');
  }
  assert(unresolvableFailed, 'Unresolvable user threw error instead of returning null or silent fallback');

  let invalidIdFailed = false;
  try {
    await PersonFieldService.resolveUser(mockClient, siteUrl, 'invalid_id@vedanta.co.in');
  } catch (err: any) {
    invalidIdFailed = true;
    assert(err.message.includes('invalid or non-positive User ID'), 'Rejected non-positive user ID');
  }
  assert(invalidIdFailed, 'Non-positive user ID rejected cleanly');

  // ---------------------------------------------------------------------------
  // Suite 4: Single-Person and Multi-Person Payload Formatting
  // ---------------------------------------------------------------------------
  console.log('\nTest Suite 4: Person Field Payload Formatting');
  // Single-person valid ID
  const singlePayload = PersonFieldService.formatPersonFieldPayload('User', 105);
  assert(singlePayload.UserId === 105, 'Single person payload formatted as UserId: 105');

  // Single-person from resolved object
  const singleFromObj = PersonFieldService.formatPersonFieldPayload('User', resolved);
  assert(singleFromObj.UserId === 105, 'Single person from ISharePointUser formatted as UserId: 105');

  // Single-person optional / clear (null)
  const singleNull = PersonFieldService.formatPersonFieldPayload('User', null);
  assert(singleNull.UserId === null, 'Single person optional cleared as UserId: null');

  // Single-person optional undefined
  const singleUndef = PersonFieldService.formatPersonFieldPayload('User', undefined);
  assert(singleUndef.UserId === null, 'Single person optional undefined cleared as UserId: null');

  // Multi-person field formatting
  const multiPayload = PersonFieldService.formatMultiPersonFieldPayload('Approvers', [105, 202]);
  assert(Array.isArray(multiPayload.ApproversId?.results), 'Multi-person payload has results array');
  assert(multiPayload.ApproversId.results.length === 2, 'Multi-person results length is 2');
  assert(multiPayload.ApproversId.results[0] === 105 && multiPayload.ApproversId.results[1] === 202, 'Multi-person contains [105, 202]');

  // Multi-person empty / clear
  const multiEmpty = PersonFieldService.formatMultiPersonFieldPayload('Approvers', []);
  assert(Array.isArray(multiEmpty.ApproversId?.results) && multiEmpty.ApproversId.results.length === 0, 'Multi-person empty formatted as { results: [] }');

  // ---------------------------------------------------------------------------
  // Suite 5: Reading and Normalizing Person-Field Responses
  // ---------------------------------------------------------------------------
  console.log('\nTest Suite 5: Reading and Normalizing Person-Field Responses');
  // Case A: Expanded OData object
  const expandedItem = {
    Id: 1,
    Title: 'Role Item 1',
    User: {
      Id: 105,
      Title: 'Demo User',
      EMail: 'demo.user@example.com',
      Name: 'i:0#.f|membership|demo.user@example.com',
    },
  };
  const extractedExpanded = PersonFieldService.extractPersonField(expandedItem, 'User');
  assert(extractedExpanded !== null, 'Extracted expanded Person field is non-null');
  assert(extractedExpanded?.id === 105, 'Extracted expanded ID is 105');
  assert(extractedExpanded?.name === 'Demo User', 'Extracted expanded name is Demo User');
  assert(extractedExpanded?.email === 'demo.user@example.com', 'Extracted expanded email is demo.user@example.com');
  assert(extractedExpanded?.loginName === 'i:0#.f|membership|demo.user@example.com', 'Extracted expanded loginName is preserved');

  // Case B: Flat Lookup ID
  const flatItem = {
    Id: 2,
    Title: 'Fallback Name',
    user_email: 'fallback@vedanta.co.in',
    login_name: 'fallback@vedanta.co.in',
    UserId: 77,
  };
  const extractedFlat = PersonFieldService.extractPersonField(flatItem, 'User');
  assert(extractedFlat !== null, 'Extracted flat Person field is non-null');
  assert(extractedFlat?.id === 77, 'Extracted flat ID is 77');
  assert(extractedFlat?.email === 'fallback@vedanta.co.in', 'Extracted flat email matches user_email');

  // Case C: Null / Empty Person field
  const emptyItem = { Id: 3, Title: 'Empty' };
  const extractedEmpty = PersonFieldService.extractPersonField(emptyItem, 'User');
  assert(extractedEmpty === null, 'Empty person field returns null safely without throwing');

  // ---------------------------------------------------------------------------
  // Suite 6: HTTP Error Handling (400, 401, 403, 404, 409, 412, 500)
  // ---------------------------------------------------------------------------
  console.log('\nTest Suite 6: HTTP Error Status Handling & Fail-Closed Writes');
  const errorStatuses = [
    { code: 400, label: 'Bad Request / Schema Key Mismatch' },
    { code: 401, label: 'Unauthorized' },
    { code: 403, label: 'Access Denied / Forbidden' },
    { code: 404, label: 'List or User Not Found' },
    { code: 409, label: 'Conflict' },
    { code: 412, label: 'Precondition Failed / Concurrency Conflict' },
    { code: 500, label: 'Internal Server Error' },
  ];

  for (const { code, label } of errorStatuses) {
    const errorClient: any = {
      post: async () => ({
        ok: false,
        status: code,
        statusText: label,
        text: async () => `SharePoint ${code} ${label}`,
      }),
    };

    let caught = false;
    try {
      PersonFieldService.clearCache();
      await PersonFieldService.resolveUser(errorClient, siteUrl, 'test@vedanta.co.in');
    } catch (err: any) {
      caught = true;
      assert(err.message.includes(String(code)), `HTTP ${code} (${label}) caught and surfaced explicitly`);
    }
    assert(caught, `HTTP ${code} failed closed without mock fallback`);
  }

  // ---------------------------------------------------------------------------
  // Suite 7: Full Service Integration (assignUserRole & updateUserRole with Person Field)
  // ---------------------------------------------------------------------------
  console.log('\nTest Suite 7: Data Service Integration with Person Field & ensureUser');
  const requestHistory: Array<{ method: string; url: string; body?: any }> = [];

  const mockHttp = {
    get: async (url: string) => {
      if (url.includes("CERUserRoles") || url.includes("CER_UserRoles")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            value: [
              {
                Id: 888,
                Title: 'Demo User',
                user_email: 'demo.user@example.com',
                login_name: 'demo.user@example.com',
                role: 'Approver',
                approval_level: 1,
                department: 'Information Technology',
                sbu: 'RJ North',
                is_active: true,
                assigned_by: 'Admin',
                assigned_date: '2026-10-27T10:00:00Z',
                User: {
                  Id: 105,
                  Title: 'Demo User',
                  EMail: 'demo.user@example.com',
                  Name: 'i:0#.f|membership|demo.user@example.com',
                },
              },
            ],
          }),
        };
      }
      return { ok: true, status: 200, json: async () => ({ value: [] }) };
    },
    post: async (url: string, config: any, options: any) => {
      const body = options?.body ? JSON.parse(options.body) : {};
      if (url.includes("ensureUser")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            Id: 105,
            Title: 'Demo User',
            Email: 'demo.user@example.com',
            LoginName: 'i:0#.f|membership|demo.user@example.com',
            IsSiteAdmin: true,
          }),
        };
      }
      const method = options?.headers?.["X-HTTP-Method"] === "MERGE" ? "MERGE" : "POST";
      requestHistory.push({ method, url, body });
      return { ok: true, status: 200, json: async () => ({ Id: 888, ID: 888 }) };
    },
  };

  const spDataService = new SharePointCERDataService(mockHttp as any, siteUrl);

  // Test assignUserRole
  const assigned = await spDataService.assignUserRole(
    {
      user_name: 'Demo User',
      user_email: 'demo.user@example.com',
      login_name: 'demo.user@example.com',
      role: 'Approver',
      approval_level: 1,
      department: 'Information Technology',
      sbu: 'RJ North',
      is_active: true,
      assigned_by: 'Admin',
      assigned_date: new Date().toISOString(),
    },
    { name: 'Admin', email: 'admin@example.com' }
  );

  assert(assigned.id === '888', 'assignUserRole returned created item ID 888');
  assert(assigned.user_id === 105, 'assignUserRole populated user_id from ensureUser');
  assert(requestHistory[0].body.UserId === 105, 'assignUserRole wrote UserId: 105 to SharePoint payload');

  // Test updateUserRole
  await spDataService.updateUserRole(
    {
      ...assigned,
      department: 'Digital Operations',
    },
    { name: 'Admin', email: 'admin@example.com' }
  );
  const mergeCall = requestHistory.find((r) => r.method === 'MERGE');
  assert(!!mergeCall && mergeCall.body.UserId === 105, 'updateUserRole wrote UserId: 105 to update payload');
  assert(!!mergeCall && mergeCall.body.department === 'Digital Operations', 'updateUserRole updated department');

  // Test getUserRoles with Person field expansion
  const roles = await spDataService.getUserRoles();
  assert(roles.length === 1, 'getUserRoles returned 1 role');
  assert(roles[0].user_id === 105, 'getUserRoles normalized user_id as 105');
  assert(roles[0].user_name === 'Demo User', 'getUserRoles resolved user_name');
  assert(roles[0].user_email === 'demo.user@example.com', 'getUserRoles resolved user_email');

  // ---------------------------------------------------------------------------
  // Suite 8: Approval Workflow & Segregation of Duties Preservation
  // ---------------------------------------------------------------------------
  console.log('\nTest Suite 8: Workflow Integrity & Segregation of Duties Preservation');
  const { PermissionService } = await import('../services/PermissionService');

  const sampleProposal = {
    id: 'prop-1',
    cerprno: 'CER/2026/001',
    pr_name: 'Turbine Overhaul',
    owname: 'Initiator Alice',
    owner_email: 'alice@vedanta.co.in',
    created_by: 'Initiator Alice',
    created_by_email: 'alice@vedanta.co.in',
    sbu: 'RJ North' as any,
    status: 'In Approval' as any,
    current_level: 1,
    pending_with_role: 'Discipline Lead',
    pending_with_email: 'approver@vedanta.co.in',
    amount: 500000,
  } as any;

  // Verify Segregation of Duties with Person-enabled identity model
  const sodBlocked = PermissionService.canApproveCER(
    sampleProposal,
    { id: "201", name: "Initiator Alice", email: "alice@vedanta.co.in", loginName: "alice@vedanta.co.in", role: "Approver" as any, roles: ["Approver"], is_active: true },
    { id: "1", level_id: 1, role_title: "Discipline Lead", sbu: "RJ North", is_active: true, approver_name: "Discipline Lead", approver_email: "approver@vedanta.co.in" } as any
  );
  assert(sodBlocked.allowed === false, 'Segregation of duties strictly blocks initiator from approving proposal');
  assert(String(sodBlocked.reason || "").includes('Segregation of Duties'), 'SoD violation reason clearly surfaced');

  console.log('================================================================================');
  console.log(`PERSON FIELD VERIFICATION SUMMARY: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  console.log('================================================================================');

  if (failed > 0) {
    (process as any).exit(1);
  }
}

runPersonFieldServiceTests().catch((err) => {
  console.error('Unhandled test failure:', err);
  (process as any).exit(1);
});
