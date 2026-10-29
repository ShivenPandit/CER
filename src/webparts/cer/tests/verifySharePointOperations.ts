export {};

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

// Simple test harness
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

async function runTests() {
  console.log("================================================================================");
  console.log(" SharePointOperations & Modernized fetchHooks Verification Suite");
  console.log("================================================================================");

  // Dynamic import so window polyfill is in place before SPFx imports evaluate
  const {
    SharePointOperations,
    useUIOperations,
    useUserOperations,
    useListOperations,
  } = await import("../hooks/useSharePointOperations");

  const mockSiteUrl = "https://vedanta.sharepoint.com/sites/CERManagementSystemUAT";

  // Mock SPHttpClient
  const requestLog: Array<{ method: string; url: string; headers?: any; body?: any }> = [];

  const mockSpHttpClient = {
    get: async (url: string, config: any, options: any): Promise<any> => {
      requestLog.push({ method: "GET", url, headers: options?.headers });

      // Handle paginated list items
      if (url.includes("/_api/web/lists/getByTitle('PaginatedList')/items?")) {
        if (!url.includes("skipToken=2")) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              value: [{ Id: 1, Title: "Item 1" }, { Id: 2, Title: "Item 2" }],
              "odata.nextLink": `${mockSiteUrl}/_api/web/lists/getByTitle('PaginatedList')/items?$top=5000&skipToken=2`,
            }),
          };
        } else {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              value: [{ Id: 3, Title: "Item 3" }],
            }),
          };
        }
      }

      // Handle file list item fields
      if (url.includes("/ListItemAllFields")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            Id: 99,
            "@odata.etag": '"etag-123"',
          }),
        };
      }

      // Handle current user
      if (url.includes("/_api/web/currentuser/?$select=")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            d: {
              Id: 42,
              Title: "Demo Admin",
              Email: "demo.admin@example.com",
              LoginName: "i:0#.f|membership|demo.admin@example.com",
              IsSiteAdmin: true,
              Groups: {
                results: [{ Id: 10, Title: "CER Admins" }],
              },
            },
          }),
        };
      }

      // Handle site users
      if (url.includes("/_api/web/siteusers")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            value: [
              { Id: 101, Title: "Admin User", Email: "admin@vedanta.com", LoginName: "admin@vedanta.com", IsSiteAdmin: true },
            ],
          }),
        };
      }

      // Default GET response
      return {
        ok: true,
        status: 200,
        json: async () => ({
          value: [{ Id: 10, Title: "Test Item" }],
        }),
      };
    },

    post: async (url: string, config: any, options: any): Promise<any> => {
      const headers = options?.headers || {};
      const method = headers["X-HTTP-Method"] || "POST";
      requestLog.push({ method, url, headers, body: options?.body });

      // Handle HTTP 204 MERGE (no content)
      if (method === "MERGE") {
        return {
          ok: true,
          status: 204,
          statusText: "No Content",
        };
      }

      // Handle HTTP 204 DELETE
      if (method === "DELETE") {
        return {
          ok: true,
          status: 204,
          statusText: "No Content",
        };
      }

      // Handle PeoplePicker search
      if (url.includes("ClientPeoplePickerSearchUser")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            d: {
              ClientPeoplePickerSearchUser: JSON.stringify([
                {
                  Key: "user-key",
                  DisplayText: "User Name",
                  EntityData: { Email: "user@vedanta.com", Title: "Lead Analyst" },
                },
              ]),
            },
          }),
        };
      }

      // Handle RootFolder/Files/add (file upload)
      if (url.includes("/rootfolder/files/add")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            ServerRelativeUrl: "/sites/CERManagementSystemUAT/CER_Attachments/proposal_doc.pdf",
          }),
        };
      }

      // Handle recycle endpoint
      if (url.endsWith("/recycle")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({ value: "guid-recycled" }),
        };
      }

      // Default POST response (create)
      return {
        ok: true,
        status: 201,
        json: async () => ({
          Id: 55,
          Title: "Created Item",
        }),
      };
    },
  } as unknown as any;

  const sp = new SharePointOperations(mockSpHttpClient, mockSiteUrl);

  console.log("\nTest Suite 1: URL & Endpoint Encoding");
  {
    const endpoint = sp.buildListEndpoint("CERProposals", "/items");
    assert(
      endpoint === `${mockSiteUrl}/_api/web/lists/getByTitle('CERProposals')/items`,
      "buildListEndpoint encodes standard list name correctly"
    );

    const specialEndpoint = sp.buildListEndpoint("O'Connor & Sons List");
    assert(
      specialEndpoint === `${mockSiteUrl}/_api/web/lists/getByTitle('O''Connor%20%26%20Sons%20List')`,
      "buildListEndpoint escapes single quotes and special characters properly"
    );
  }

  console.log("\nTest Suite 2: Core HTTP Operations & 204 No-Body Handling");
  {
    // GET
    const getRes = await sp.get<{ value: any[] }>(`${mockSiteUrl}/_api/test`);
    assert(getRes.value.length === 1 && getRes.value[0].Id === 10, "GET retrieves and parses JSON body");

    // POST
    const postRes = await sp.post<{ Id: number }>(`${mockSiteUrl}/_api/test`, { Title: "Hello" });
    assert(postRes.Id === 55, "POST creates item and returns parsed JSON");

    // MERGE (HTTP 204)
    let mergeThrew = false;
    try {
      await sp.merge(`${mockSiteUrl}/_api/test(55)`, { Title: "Updated" });
    } catch {
      mergeThrew = true;
    }
    assert(!mergeThrew, "MERGE handles HTTP 204 without throwing (fixes fetchHooks bug #1 and #2)");

    // DELETE (HTTP 204)
    let deleteThrew = false;
    try {
      await sp.delete(`${mockSiteUrl}/_api/test(55)`);
    } catch {
      deleteThrew = true;
    }
    assert(!deleteThrew, "DELETE handles HTTP 204 without throwing");
  }

  console.log("\nTest Suite 3: List Item CRUD & Pagination");
  {
    // getListItems
    const items = await sp.getListItems("CERProposals", {
      select: "Id,Title",
      filter: "status eq 'Approved'",
      top: 10,
    });
    assert(items.length === 1 && items[0].Id === 10, "getListItems returns unwrapped value array");

    // getAllListItems (Paginated)
    const allItems = await sp.getAllListItems("PaginatedList");
    assert(allItems.length === 3, "getAllListItems iterates across odata.nextLink pages and returns all 3 items");

    // createListItem
    const created = await sp.createListItem("CERProposals", { cerprno: "CER-2026-0001" });
    assert(created.Id === 55, "createListItem creates list item with assigned Id");

    // updateListItem
    await sp.updateListItem("CERProposals", 55, { status: "Approved" });
    const lastMergeReq = requestLog.find((r) => r.method === "MERGE" && r.url.includes("items(55)"));
    assert(!!lastMergeReq, "updateListItem sends HTTP MERGE to target item endpoint");

    // deleteListItem
    await sp.deleteListItem("CERProposals", 55);
    const lastDelReq = requestLog.find((r) => r.method === "DELETE" && r.url.includes("items(55)"));
    assert(!!lastDelReq, "deleteListItem sends HTTP DELETE to target item endpoint");
  }

  console.log("\nTest Suite 4: Document Library File Upload & Recycling");
  {
    const dummyBuffer = new ArrayBuffer(16);
    const uploadRes = await sp.uploadFileToLibrary(
      "CERAttachments",
      "proposal_doc.pdf",
      dummyBuffer,
      { cerprno: "CER-2026-0001", uploaded_by: "Demo Initiator" }
    );

    assert(uploadRes.itemId === 99, "uploadFileToLibrary completes 3-step upload and resolves file list item ID 99");
    assert(uploadRes.serverRelativeUrl.includes("proposal_doc.pdf"), "uploadFileToLibrary returns serverRelativeUrl");

    // Check that metadata was updated with MERGE
    const metaReq = requestLog.find((r) => r.method === "MERGE" && r.url.includes("CERAttachments") && r.url.includes("items(99)"));
    assert(!!metaReq, "uploadFileToLibrary tags metadata via MERGE using item ETag");

    // recycleFile
    let recycleThrew = false;
    try {
      await sp.recycleFile("https://vedanta.sharepoint.com/sites/CERManagementSystemUAT/CER_Attachments/proposal_doc.pdf");
    } catch {
      recycleThrew = true;
    }
    assert(!recycleThrew, "recycleFile extracts relative path from absolute URL and sends to recycle endpoint");
  }

  console.log("\nTest Suite 5: User & PeoplePicker Operations");
  {
    const currentUser = await sp.getCurrentUserGroups();
    assert(currentUser.id === 42, "getCurrentUserGroups retrieves user id 42");
    assert(currentUser.isSiteAdmin === true, "getCurrentUserGroups correctly maps IsSiteAdmin");
    assert(currentUser.groups.length === 1 && currentUser.groups[0].Title === "CER Admins", "getCurrentUserGroups maps expanded groups");

    const searchRes = await sp.searchPeoplePicker("User", 10);
    assert(searchRes.length === 1 && searchRes[0].Key === "user-key", "searchPeoplePicker queries SPWeb ClientPeoplePickerSearchUser");
  }

  console.log("\nTest Suite 6: React Hooks Interface Compatibility");
  {
    const React = await import("react");
    (React as any).__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentDispatcher.current = {
      useCallback: (fn: any) => fn,
      useMemo: (fn: any) => fn(),
    };

    const ui = useUIOperations();
    assert(typeof ui.cancel === "function", "useUIOperations exports cancel function");
    assert(typeof ui.loadCss === "function", "useUIOperations exports loadCss function");

    const userOps = useUserOperations();
    assert(typeof userOps.getCurrentUserGroups === "function", "useUserOperations exports getCurrentUserGroups");
    assert(typeof userOps.getCurrentUser === "function", "useUserOperations exports getCurrentUser (MS Graph)");
    assert(typeof userOps.getUserId === "function", "useUserOperations exports getUserId");
    assert(typeof userOps.getSPGroupUsers === "function", "useUserOperations exports getSPGroupUsers");
    assert(typeof userOps.checkUserRole === "function", "useUserOperations exports checkUserRole");

    const listOps = useListOperations();
    assert(typeof listOps.createRequest === "function", "useListOperations exports createRequest");
    assert(typeof listOps.updateItems === "function", "useListOperations exports updateItems");
    assert(typeof listOps.deleteItem === "function", "useListOperations exports deleteItem");
    assert(typeof listOps.getListItems === "function", "useListOperations exports getListItems");
    assert(typeof listOps.getAllListItems === "function", "useListOperations exports getAllListItems");
    assert(typeof listOps.uploadFileToDocumentLibrary === "function", "useListOperations exports uploadFileToDocumentLibrary");
    assert(typeof listOps.deleteFileFromLibrary === "function", "useListOperations exports deleteFileFromLibrary");
  }

  console.log("\n================================================================================");
  console.log(`TEST SUMMARY: ${passed} PASSED | ${failed} FAILED | TOTAL: ${passed + failed}`);
  console.log("================================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution fatal error:", err);
  process.exit(1);
});
