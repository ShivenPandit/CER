/**
 * SharePoint REST API Operations Utility Layer
 *
 * A type-safe, class-based utility for common SharePoint REST operations.
 * Extracted and improved from fetchHooks.tsx patterns, designed to be used
 * internally by SharePointCERDataService to eliminate boilerplate.
 *
 * Key improvements over fetchHooks.tsx:
 * - Proper HTTP 204 (no-body) handling for MERGE/DELETE operations
 * - Consistent odata=nometadata format (modern SPFx standard)
 * - Strong TypeScript typing instead of `any` everywhere
 * - URL-safe encoding for list names and filter values
 * - Pagination support for lists with >5000 items
 * - 3-step file upload pattern with metadata tagging
 *
 * @module useSharePointOperations
 */

import { useCallback, useMemo } from "react";
import { SPHttpClient, SPHttpClientResponse } from "@microsoft/sp-http";
import { WebPartContext } from "@microsoft/sp-webpart-base";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Standard OData response envelope from SharePoint REST API (nometadata format) */
export interface ISPListResponse<T = Record<string, unknown>> {
  value: T[];
  "odata.nextLink"?: string;
}

/** Result of a create operation — includes the new item ID */
export interface ISPCreateResult {
  Id: number;
  [key: string]: unknown;
}

/** Result of a file upload operation */
export interface ISPFileUploadResult {
  itemId: number;
  serverRelativeUrl: string;
}

/** Strongly-typed SharePoint User representation returned by ensureUser or site queries */
export interface ISharePointUser {
  Id: number;
  Title: string;
  Email: string;
  LoginName: string;
  IsSiteAdmin?: boolean;
}

/** Options for GET requests */
export interface ISPGetOptions {
  /** OData $select clause (without the $select= prefix) */
  select?: string;
  /** OData $filter clause (without the $filter= prefix) — will be URI-encoded */
  filter?: string;
  /** OData $expand clause */
  expand?: string;
  /** OData $orderby clause */
  orderby?: string;
  /** Maximum items to return (default: 500) */
  top?: number;
}

// ---------------------------------------------------------------------------
// SharePoint Operations Utility Class
// ---------------------------------------------------------------------------

export class SharePointOperations {
  private _client: SPHttpClient;
  private _siteUrl: string;
  private static _ensureUserCache = new Map<string, { user: ISharePointUser; timestamp: number }>();
  private static readonly _ENSURE_USER_CACHE_TTL = 600000; // 10 minutes

  constructor(client: SPHttpClient, siteUrl: string) {
    this._client = client;
    this._siteUrl = siteUrl;
  }

  // -----------------------------------------------------------------------
  // Core HTTP Helpers
  // -----------------------------------------------------------------------

  /**
   * Execute an HTTP request with retry logic for rate limiting (HTTP 429)
   * and transient server unavailability (HTTP 503).
   */
  private async _executeWithRetry(
    requestFn: () => Promise<SPHttpClientResponse>,
    actionName: string = "Request",
    maxRetries: number = 3,
  ): Promise<SPHttpClientResponse> {
    let attempt = 0;
    while (true) {
      attempt++;
      const response = await requestFn();

      if (response.status === 429 || response.status === 503) {
        if (attempt <= maxRetries) {
          const retryAfterHeader =
            response.headers?.get("Retry-After") ||
            response.headers?.get("retry-after");
          let delayMs = 0;
          if (retryAfterHeader) {
            const parsedSeconds = parseInt(retryAfterHeader, 10);
            if (!isNaN(parsedSeconds) && parsedSeconds > 0) {
              delayMs = parsedSeconds * 1000;
            }
          }
          if (delayMs <= 0) {
            // Exponential backoff with jitter: 1s, 2s, 4s + 0-500ms jitter
            delayMs = Math.pow(2, attempt - 1) * 1000 + Math.floor(Math.random() * 500);
          }
          console.warn(
            `[SPOperations] ${actionName} received HTTP ${response.status}. Retrying in ${delayMs}ms (attempt ${attempt}/${maxRetries})...`,
          );
          await new Promise((resolve) => setTimeout(resolve, delayMs));
          continue;
        } else {
          const errText = await response.text().catch(() => "");
          throw new Error(
            `[SPOperations] ${actionName} throttled (HTTP ${response.status}) after ${maxRetries} retries: ${errText || "Rate limit or service unavailable"}`,
          );
        }
      }

      return response;
    }
  }

  /**
   * Perform a GET request against a SharePoint REST endpoint.
   * Returns the parsed JSON response.
   */
  public async get<T = Record<string, unknown>>(
    endpoint: string,
  ): Promise<T> {
    const response: SPHttpClientResponse = await this._executeWithRetry(
      () =>
        this._client.get(endpoint, SPHttpClient.configurations.v1, {
          headers: {
            Accept: "application/json;odata=nometadata",
          },
        }),
      `GET ${endpoint.split("?")[0]}`,
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(
        `[SPOperations] GET failed (${response.status}): ${errText}`,
      );
    }

    return response.json();
  }

  /**
   * Perform a POST request (create) against a SharePoint REST endpoint.
   * Returns the parsed JSON response with the created item.
   */
  public async post<T = ISPCreateResult>(
    endpoint: string,
    body: Record<string, unknown>,
  ): Promise<T> {
    const response: SPHttpClientResponse = await this._executeWithRetry(
      () =>
        this._client.post(endpoint, SPHttpClient.configurations.v1, {
          headers: {
            Accept: "application/json;odata=nometadata",
            "Content-Type": "application/json;odata=nometadata",
          },
          body: JSON.stringify(body),
        }),
      `POST ${endpoint.split("?")[0]}`,
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(
        `[SPOperations] POST failed (${response.status}): ${errText}`,
      );
    }

    return response.json();
  }

  /**
   * Perform a MERGE (update) request against a SharePoint REST endpoint.
   *
   * IMPORTANT: SharePoint MERGE returns HTTP 204 (No Content) on success.
   * This method correctly handles 204 by returning void instead of attempting
   * to parse a non-existent response body.
   *
   * Supports optimistic concurrency via the optional `etag` parameter.
   * If the item was modified concurrently, SharePoint responds with HTTP 412.
   */
  public async merge(
    endpoint: string,
    body: Record<string, unknown>,
    etag?: string,
  ): Promise<void> {
    const ifMatchValue = etag && etag.trim() ? etag.trim() : "*";
    const response: SPHttpClientResponse = await this._executeWithRetry(
      () =>
        this._client.post(endpoint, SPHttpClient.configurations.v1, {
          headers: {
            Accept: "application/json;odata=nometadata",
            "Content-Type": "application/json;odata=nometadata",
            "X-HTTP-Method": "MERGE",
            "If-Match": ifMatchValue,
          },
          body: JSON.stringify(body),
        }),
      `MERGE ${endpoint.split("?")[0]}`,
    );

    if (response.status === 412) {
      throw new Error(
        `[SPOperations] Concurrency conflict (HTTP 412): This item has been modified by another user since it was retrieved. Please reload the latest data before saving changes.`,
      );
    }

    // HTTP 204 = success with no body (expected for MERGE)
    // HTTP 200 = success with body (rare but possible)
    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(
        `[SPOperations] MERGE failed (${response.status}): ${errText}`,
      );
    }
    // Do NOT attempt response.json() — 204 has no body
  }

  /**
   * Perform a DELETE request against a SharePoint REST endpoint.
   *
   * Handles the expected response codes:
   * - 200/204: Successfully deleted
   * - 404: Item already deleted (treated as success)
   * - 412: Concurrency conflict
   */
  public async delete(endpoint: string, etag?: string): Promise<void> {
    const ifMatchValue = etag && etag.trim() ? etag.trim() : "*";
    const response: SPHttpClientResponse = await this._executeWithRetry(
      () =>
        this._client.post(endpoint, SPHttpClient.configurations.v1, {
          headers: {
            Accept: "application/json;odata=nometadata",
            "X-HTTP-Method": "DELETE",
            "If-Match": ifMatchValue,
          },
        }),
      `DELETE ${endpoint.split("?")[0]}`,
    );

    if (response.status === 200 || response.status === 204) {
      return; // Success
    }

    if (response.status === 404) {
      console.warn("[SPOperations] Item already deleted (404):", endpoint);
      return; // Treat as success
    }

    if (response.status === 412) {
      throw new Error(
        `[SPOperations] Concurrency conflict (HTTP 412): Item was modified by another user before deletion could occur.`,
      );
    }

    const errText = await response.text().catch(() => "");
    throw new Error(
      `[SPOperations] DELETE failed (${response.status}): ${errText}`,
    );
  }

  // -----------------------------------------------------------------------
  // List Item Operations
  // -----------------------------------------------------------------------

  /**
   * Build the full REST API endpoint URL for a SharePoint list.
   * Properly encodes the list name for URL safety.
   */
  public buildListEndpoint(listName: string, suffix?: string): string {
    const encoded = encodeURIComponent(listName).replace(/'/g, "''");
    const base = `${this._siteUrl}/_api/web/lists/getByTitle('${encoded}')`;
    return suffix ? `${base}${suffix}` : base;
  }

  /**
   * Build an OData query string from options.
   */
  private _buildQueryString(options: ISPGetOptions): string {
    const parts: string[] = [];

    if (options.select) {
      parts.push(`$select=${options.select}`);
    }
    if (options.filter) {
      parts.push(`$filter=${encodeURIComponent(options.filter)}`);
    }
    if (options.expand) {
      parts.push(`$expand=${options.expand}`);
    }
    if (options.orderby) {
      parts.push(`$orderby=${options.orderby}`);
    }
    if (options.top !== undefined) {
      parts.push(`$top=${options.top}`);
    }

    return parts.length > 0 ? `?${parts.join("&")}` : "";
  }

  /**
   * Get items from a SharePoint list with optional OData query parameters.
   * Returns the items array (unwrapped from the `value` envelope).
   */
  public async getListItems<T = Record<string, unknown>>(
    listName: string,
    options: ISPGetOptions = {},
  ): Promise<T[]> {
    const query = this._buildQueryString({
      top: 500,
      ...options,
    });
    const endpoint = this.buildListEndpoint(listName, `/items${query}`);
    const data = await this.get<ISPListResponse<T>>(endpoint);
    return data.value || [];
  }

  /**
   * Get ALL items from a SharePoint list, handling pagination for lists
   * with more than 5000 items.
   *
   * Pattern extracted from fetchHooks.tsx getAllListItems, but using
   * odata=nometadata format (uses `odata.nextLink` instead of `d.__next`).
   */
  public async getAllListItems<T = Record<string, unknown>>(
    listName: string,
    options: ISPGetOptions = {},
  ): Promise<T[]> {
    let allItems: T[] = [];
    const query = this._buildQueryString({
      top: 5000,
      ...options,
    });
    let nextUrl: string | null = this.buildListEndpoint(
      listName,
      `/items${query}`,
    );

    while (nextUrl) {
      const currentUrl = nextUrl;
      const response: SPHttpClientResponse = await this._executeWithRetry(
        () =>
          this._client.get(currentUrl, SPHttpClient.configurations.v1, {
            headers: {
              Accept: "application/json;odata=nometadata",
            },
          }),
        `getAllListItems(${listName})`,
      );

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(
          `[SPOperations] Paginated GET failed (${response.status}): ${errText}`,
        );
      }

      const data: ISPListResponse<T> = await response.json();
      if (data.value) {
        allItems = allItems.concat(data.value);
      }
      const rawData = data as any;
      nextUrl =
        data["odata.nextLink"] ||
        (rawData["@odata.nextLink"] as string) ||
        (rawData?.d?.__next as string) ||
        null;
    }

    return allItems;
  }

  /**
   * Create a new item in a SharePoint list.
   * Returns the created item with its SharePoint-assigned Id.
   */
  public async createListItem<T = ISPCreateResult>(
    listName: string,
    payload: Record<string, unknown>,
  ): Promise<T> {
    const endpoint = this.buildListEndpoint(listName, "/items");
    return this.post<T>(endpoint, payload);
  }

  /**
   * Update an existing item in a SharePoint list by its numeric ID.
   * Uses MERGE to perform a partial update (only specified fields).
   *
   * Supports optimistic concurrency via optional `etag`.
   * Returns void — MERGE responses have no body (HTTP 204).
   */
  public async updateListItem(
    listName: string,
    itemId: number | string,
    payload: Record<string, unknown>,
    etag?: string,
  ): Promise<void> {
    const endpoint = this.buildListEndpoint(listName, `/items(${itemId})`);
    return this.merge(endpoint, payload, etag);
  }

  /**
   * Delete an item from a SharePoint list by its numeric ID.
   * Handles 204 (success), 200 (success with body), and 404 (already deleted).
   */
  public async deleteListItem(
    listName: string,
    itemId: number | string,
    etag?: string,
  ): Promise<void> {
    const endpoint = this.buildListEndpoint(listName, `/items(${itemId})`);
    return this.delete(endpoint, etag);
  }

  // -----------------------------------------------------------------------
  // File / Document Library Operations
  // -----------------------------------------------------------------------

  /**
   * Upload a file to a SharePoint Document Library and tag it with metadata.
   *
   * Implements the 3-step pattern from fetchHooks.tsx uploadFileToDocumentLibrary:
   * 1. Upload the binary file to the library's root folder
   * 2. Retrieve the uploaded file's list item properties (to get the item ID and ETag)
   * 3. MERGE metadata onto the list item
   *
   * @param libraryName - The display name of the Document Library
   * @param fileName - The file name (will be URI-encoded)
   * @param fileContent - The binary content (ArrayBuffer, Blob, or File)
   * @param metadata - Optional key-value metadata fields to tag on the uploaded file
   * @returns The SharePoint item ID and server-relative URL of the uploaded file
   */
  public async uploadFileToLibrary(
    libraryName: string,
    fileName: string,
    fileContent: ArrayBuffer | Blob | File,
    metadata?: Record<string, unknown>,
  ): Promise<ISPFileUploadResult> {
    const encodedFileName = encodeURIComponent(fileName);
    const uploadUrl = `${this._siteUrl}/_api/web/lists/getByTitle('${encodeURIComponent(libraryName)}')/rootfolder/files/add(url='${encodedFileName}',overwrite=true)`;

    // Step 1: Upload the binary
    const uploadResponse: SPHttpClientResponse = await this._client.post(
      uploadUrl,
      SPHttpClient.configurations.v1,
      {
        headers: {
          Accept: "application/json;odata=nometadata",
          "Content-Type": "application/octet-stream",
        },
        body: fileContent,
      },
    );

    if (!uploadResponse.ok) {
      throw new Error(
        `[SPOperations] File upload failed (${uploadResponse.status})`,
      );
    }

    const uploadResult = await uploadResponse.json();
    const serverRelativeUrl: string = uploadResult.ServerRelativeUrl;

    // Step 2: Get the file's list item properties
    const safeFileUrl = serverRelativeUrl.replace(/'/g, "''");
    const fileItemUrl = `${this._siteUrl}/_api/web/GetFileByServerRelativeUrl('${safeFileUrl}')/ListItemAllFields`;
    const fileItemResponse: SPHttpClientResponse = await this._client.get(
      fileItemUrl,
      SPHttpClient.configurations.v1,
      {
        headers: {
          Accept: "application/json;odata=nometadata",
        },
      },
    );

    if (!fileItemResponse.ok) {
      throw new Error(
        "[SPOperations] Could not retrieve the file's list item properties",
      );
    }

    const fileItemJson = await fileItemResponse.json();
    const itemId: number = fileItemJson.Id;

    // Step 3: Tag metadata (if provided)
    if (metadata && Object.keys(metadata).length > 0) {
      const updateUrl = this.buildListEndpoint(
        libraryName,
        `/items(${itemId})`,
      );

      await this._client.post(updateUrl, SPHttpClient.configurations.v1, {
        headers: {
          Accept: "application/json;odata=nometadata",
          "Content-Type": "application/json;odata=nometadata",
          "X-HTTP-Method": "MERGE",
          "If-Match": fileItemJson["@odata.etag"] || "*",
        },
        body: JSON.stringify(metadata),
      });
    }

    return { itemId, serverRelativeUrl };
  }

  /**
   * Delete (recycle) a file from a SharePoint Document Library.
   *
   * Sends the file to the Recycle Bin instead of permanent deletion.
   * Fixes the fetchHooks.tsx bug where response.ok was never checked.
   *
   * @param serverRelativeUrl - The server-relative URL of the file
   */
  public async recycleFile(serverRelativeUrl: string): Promise<void> {
    // Normalize: extract path from absolute URLs
    let relativeUrl = serverRelativeUrl;
    if (relativeUrl.indexOf("://") !== -1) {
      try {
        const parsed = new URL(relativeUrl);
        relativeUrl = parsed.pathname;
      } catch {
        // use as-is
      }
    }

    const safeRelativeUrl = relativeUrl.replace(/'/g, "''");
    const endpoint = `${this._siteUrl}/_api/web/GetFileByServerRelativeUrl('${safeRelativeUrl}')/recycle`;

    const response: SPHttpClientResponse = await this._client.post(
      endpoint,
      SPHttpClient.configurations.v1,
      {
        headers: {
          Accept: "application/json;odata=nometadata",
          "Content-Type": "application/json;odata=nometadata",
        },
      },
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(
        `[SPOperations] File recycle failed (${response.status}): ${errText}`,
      );
    }
  }

  // -----------------------------------------------------------------------
  // List Schema Operations
  // -----------------------------------------------------------------------

  /**
   * Get the field definitions from a SharePoint list schema.
   * Useful for fetching Choice field options dynamically.
   */
  public async getListFields<T = Record<string, unknown>>(
    listName: string,
    options: ISPGetOptions = {},
  ): Promise<T[]> {
    const query = this._buildQueryString(options);
    const endpoint = this.buildListEndpoint(listName, `/fields${query}`);
    const data = await this.get<ISPListResponse<T>>(endpoint);
    return data.value || [];
  }

  // -----------------------------------------------------------------------
  // Site User Operations
  // -----------------------------------------------------------------------

  /**
   * Get site users with optional OData filters.
   */
  public async getSiteUsers<T = Record<string, unknown>>(
    options: ISPGetOptions = {},
  ): Promise<T[]> {
    const query = this._buildQueryString(options);
    const endpoint = `${this._siteUrl}/_api/web/siteusers${query}`;
    const data = await this.get<ISPListResponse<T>>(endpoint);
    return data.value || [];
  }

  /**
   * Search users using the ClientPeoplePickerSearchUser endpoint.
   * Scoped to users with permission to this SharePoint site.
   *
   * @param queryString - The search query text
   * @param maxSuggestions - Maximum suggestions to return (default: 15)
   */
  public async searchPeoplePicker(
    queryString: string,
    maxSuggestions: number = 15,
  ): Promise<Record<string, unknown>[]> {
    const endpoint = `${this._siteUrl}/_api/SP.UI.ApplicationPages.ClientPeoplePickerWebServiceInterface.ClientPeoplePickerSearchUser`;
    const payload = {
      queryParams: {
        __metadata: {
          type: "SP.UI.ApplicationPages.ClientPeoplePickerQueryParameters",
        },
        AllowEmailAddresses: true,
        AllowMultipleEntities: false,
        AllUrlZones: false,
        MaximumEntitySuggestions: maxSuggestions,
        PrincipalSource: 1, // SPWeb only
        PrincipalType: 1, // Users
        QueryString: queryString,
      },
    };

    // PeoplePicker requires odata=verbose format
    const response: SPHttpClientResponse = await this._client.post(
      endpoint,
      SPHttpClient.configurations.v1,
      {
        headers: {
          Accept: "application/json;odata=verbose",
          "Content-Type": "application/json;odata=verbose",
        },
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      throw new Error(
        `[SPOperations] PeoplePicker search failed (${response.status})`,
      );
    }

    const json = await response.json();
    const rawResults = json?.d?.ClientPeoplePickerSearchUser;
    if (!rawResults) return [];

    let parsed: any = rawResults;
    if (typeof rawResults === "string") {
      try {
        parsed = JSON.parse(rawResults);
      } catch {
        parsed = [];
      }
    }
    return Array.isArray(parsed) ? parsed : [];
  }

  /**
   * Fetch current user profile and SharePoint group memberships.
   */
  public async getCurrentUserGroups(): Promise<{
    id: number;
    title: string;
    email: string;
    loginName: string;
    isSiteAdmin: boolean;
    groups: Array<{ Id: number; Title: string }>;
  }> {
    const endpoint = `${this._siteUrl}/_api/web/currentuser/?$select=Title,Email,LoginName,Id,IsSiteAdmin&$expand=groups`;
    const response: SPHttpClientResponse = await this._client.get(
      endpoint,
      SPHttpClient.configurations.v1,
      {
        headers: {
          Accept: "application/json;odata=verbose",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `[SPOperations] getCurrentUserGroups failed (${response.status})`,
      );
    }

    const json = await response.json();
    const user = json?.d;
    return {
      id: user?.Id ?? -1,
      title: user?.Title ?? "",
      email: user?.Email ?? "",
      loginName: user?.LoginName ?? "",
      isSiteAdmin: !!user?.IsSiteAdmin,
      groups: user?.Groups?.results ?? [],
    };
  }

  /**
   * Fetch users belonging to a specific SharePoint group.
   *
   * @param groupName - SharePoint group name (properly encoded)
   */
  public async getSPGroupUsers(
    groupName: string,
  ): Promise<Array<{ Id: number; Email: string; Title?: string }>> {
    const encodedGroupName = encodeURIComponent(groupName).replace(/'/g, "''");
    const endpoint = `${this._siteUrl}/_api/Web/SiteGroups/GetByName('${encodedGroupName}')/users?$select=Title,Email,Id`;
    const response: SPHttpClientResponse = await this._client.get(
      endpoint,
      SPHttpClient.configurations.v1,
      {
        headers: {
          Accept: "application/json;odata=verbose",
        },
      },
    );

    if (!response.ok) {
      throw new Error(
        `[SPOperations] getSPGroupUsers for '${groupName}' failed (${response.status})`,
      );
    }

    const json = await response.json();
    return json?.d?.results || [];
  }

  /**
   * Resolves a user identity to a valid SharePoint Site User ID using the supported REST ensureUser API.
   * Includes site-context-aware in-memory caching to eliminate duplicate network round-trips.
   *
   * @param logonName - Email, UPN, or claims login name
   */
  public async ensureUser(logonName: string): Promise<ISharePointUser> {
    if (!logonName || !logonName.trim()) {
      throw new Error("[SPOperations] ensureUser called with missing or empty logonName");
    }
    const cleanLogon = logonName.trim();
    const cacheKey = `${this._siteUrl.toLowerCase()}::${cleanLogon.toLowerCase()}`;
    const now = Date.now();

    const cached = SharePointOperations._ensureUserCache.get(cacheKey);
    if (cached && (now - cached.timestamp < SharePointOperations._ENSURE_USER_CACHE_TTL)) {
      return cached.user;
    }

    const endpoint = `${this._siteUrl.replace(/\/+$/, "")}/_api/web/ensureUser`;
    const response: SPHttpClientResponse = await this._client.post(
      endpoint,
      SPHttpClient.configurations.v1,
      {
        headers: {
          Accept: "application/json;odata=nometadata",
          "Content-Type": "application/json;odata=verbose",
        },
        body: JSON.stringify({ logonName: cleanLogon }),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(
        `[SPOperations] ensureUser failed for '${cleanLogon}' (${response.status}): ${errText || response.statusText}`
      );
    }

    const data = await response.json();
    const id = Number(data.Id || data.id);
    if (!id || isNaN(id) || id <= 0) {
      throw new Error(`[SPOperations] ensureUser returned invalid or non-positive User ID for '${cleanLogon}'.`);
    }

    const resolvedUser: ISharePointUser = {
      Id: id,
      Title: String(data.Title || data.title || cleanLogon),
      Email: String(data.Email || data.email || data.EMail || cleanLogon),
      LoginName: String(data.LoginName || data.loginName || cleanLogon),
      IsSiteAdmin: !!data.IsSiteAdmin,
    };

    SharePointOperations._ensureUserCache.set(cacheKey, { user: resolvedUser, timestamp: now });
    return resolvedUser;
  }

  /**
   * Fetch user Id by email address.
   * Tries site collection ensureUser first (to resolve even users who haven't visited the site yet),
   * falling back to site users query.
   */
  public async getUserIdByEmail(email: string): Promise<number | null> {
    if (!email || !email.trim()) return null;
    try {
      const user = await this.ensureUser(email);
      return user.Id;
    } catch {
      const filter = `Email eq '${email.replace(/'/g, "''")}'`;
      const users = await this.getSiteUsers<{ Id: number }>({
        filter,
        select: "Id",
        top: 1,
      });
      return users.length > 0 ? users[0].Id : null;
    }
  }
}

// ---------------------------------------------------------------------------
// Standard React Hooks (fetchHooks.tsx standard replacement)
// ---------------------------------------------------------------------------

/**
 * Hook providing a memoized SharePointOperations instance.
 */
export const useSharePointOperations = (
  client?: SPHttpClient,
  siteUrl?: string,
): SharePointOperations | null => {
  return useMemo(() => {
    if (!client || !siteUrl) return null;
    return new SharePointOperations(client, siteUrl);
  }, [client, siteUrl]);
};

/**
 * Custom hook for UI operations (enhanced with duplicate prevention).
 */
export const useUIOperations = () => {
  const cancel = useCallback((siteUrl: string) => {
    window.location.href = siteUrl;
  }, []);

  const loadCss = useCallback((id: string, url: string) => {
    if (document.getElementById(id)) {
      return; // prevent duplicate stylesheet injection
    }
    const head = document.getElementsByTagName("head")[0];
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.type = "text/css";
    link.href = url;
    head.appendChild(link);
  }, []);

  return {
    cancel,
    loadCss,
  };
};

/**
 * Custom hook for user operations.
 */
export const useUserOperations = () => {
  const getCurrentUserGroups = useCallback(
    async (requester: SPHttpClient, siteUrl: string) => {
      const ops = new SharePointOperations(requester, siteUrl);
      return ops.getCurrentUserGroups();
    },
    [],
  );

  const getCurrentUser = useCallback(async (context: WebPartContext) => {
    try {
      const client = await context.msGraphClientFactory.getClient("3");
      const response = await client
        .api("/me")
        .select(
          "id,displayName,mail,userPrincipalName,jobTitle,employeeId,mobilePhone,department",
        )
        .get();

      return {
        d: {
          Id: response.id,
          Title: response.displayName || "",
          Email: response.mail || "",
          LoginName: response.userPrincipalName || "",
          Department: response.department || "",
          EmployeeId: response.employeeId || "",
          MobilePhone: response.mobilePhone || "",
          JobTitle: response.jobTitle || "",
        },
      };
    } catch (error) {
      console.warn("[useUserOperations] Error in getCurrentUser via Graph:", error);
      throw error;
    }
  }, []);

  const getUserId = useCallback(
    async (requester: SPHttpClient, siteUrl: string, email: string) => {
      const ops = new SharePointOperations(requester, siteUrl);
      return ops.getUserIdByEmail(email);
    },
    [],
  );

  const getSPGroupUsers = useCallback(
    async (requester: SPHttpClient, siteUrl: string, groupName: string) => {
      const ops = new SharePointOperations(requester, siteUrl);
      return ops.getSPGroupUsers(groupName);
    },
    [],
  );

  const checkUserRole = useCallback(
    async (
      requester: SPHttpClient,
      siteUrl: string,
      listName: string,
      select: string,
      filter: string,
    ) => {
      const ops = new SharePointOperations(requester, siteUrl);
      const cleanSelect = select.replace(/^\?\$select=/, "").replace(/^&\$select=/, "");
      const cleanFilter = filter.replace(/^&\$filter=/, "").replace(/^\?\$filter=/, "");
      return ops.getListItems(listName, {
        select: cleanSelect || undefined,
        filter: cleanFilter || undefined,
      });
    },
    [],
  );

  return {
    getCurrentUserGroups,
    getCurrentUser,
    getUserId,
    getSPGroupUsers,
    checkUserRole,
  };
};

/**
 * Custom hook for SharePoint list operations (with bug fixes for 204 handling, error checking, and encoding).
 */
export const useListOperations = () => {
  const createRequest = useCallback(
    async (
      requester: SPHttpClient,
      siteUrl: string,
      data: Record<string, unknown> | string,
      listName: string,
    ) => {
      const ops = new SharePointOperations(requester, siteUrl);
      let payload: any = data;
      if (typeof data === "string") {
        try {
          payload = JSON.parse(data);
        } catch {
          payload = {};
        }
      }
      return ops.createListItem(listName, payload);
    },
    [],
  );

  const updateItems = useCallback(
    async (
      requester: SPHttpClient,
      siteUrl: string,
      listName: string,
      oListItemID: string | number,
      body: Record<string, unknown> | string,
    ): Promise<boolean> => {
      const ops = new SharePointOperations(requester, siteUrl);
      let payload: any = body;
      if (typeof body === "string") {
        try {
          payload = JSON.parse(body);
        } catch {
          payload = {};
        }
      }
      await ops.updateListItem(listName, oListItemID, payload);
      return true;
    },
    [],
  );

  const deleteItem = useCallback(
    async (
      spHttpClient: SPHttpClient,
      siteUrl: string,
      listName: string,
      itemId: string | number,
    ): Promise<boolean> => {
      const ops = new SharePointOperations(spHttpClient, siteUrl);
      await ops.deleteListItem(listName, itemId);
      return true;
    },
    [],
  );

  const getLookUpItems = useCallback(
    async (requester: SPHttpClient, siteUrl: string, listName: string) => {
      const ops = new SharePointOperations(requester, siteUrl);
      return ops.getListItems(listName);
    },
    [],
  );

  const getListItems = useCallback(
    async (
      requester: SPHttpClient,
      siteUrl: string,
      listName: string,
      select?: string,
    ) => {
      const ops = new SharePointOperations(requester, siteUrl);
      const cleanSelect = select ? select.replace(/^\?\$select=/, "") : undefined;
      return ops.getListItems(listName, { select: cleanSelect });
    },
    [],
  );

  const getAllListItems = useCallback(
    async (
      requester: SPHttpClient,
      siteUrl: string,
      listName: string,
      select?: string,
    ) => {
      const ops = new SharePointOperations(requester, siteUrl);
      const cleanSelect = select ? select.replace(/^\?\$select=/, "") : undefined;
      return ops.getAllListItems(listName, { select: cleanSelect });
    },
    [],
  );

  const getAttachments = useCallback(
    async (
      requester: SPHttpClient,
      siteUrl: string,
      query: string,
      documentName: string,
    ) => {
      const ops = new SharePointOperations(requester, siteUrl);
      const endpoint = ops.buildListEndpoint(documentName, `/items${query}`);
      const data = await ops.get<ISPListResponse<{
        FileLeafRef?: string;
        FileRef?: string;
        File?: { Length?: number };
      }>>(endpoint);
      return (data.value || []).map((item) => ({
        name: item.FileLeafRef || "",
        url: item.FileRef || "",
        size: item.File?.Length || 0,
      }));
    },
    [],
  );

  const getListItemsWithFilter = useCallback(
    async (
      requester: SPHttpClient,
      siteUrl: string,
      listName: string,
      select?: string,
      filter?: string,
    ) => {
      const ops = new SharePointOperations(requester, siteUrl);
      const cleanSelect = select ? select.replace(/^\?\$select=/, "").replace(/^&\$select=/, "") : undefined;
      const cleanFilter = filter ? filter.replace(/^&\$filter=/, "").replace(/^\?\$filter=/, "") : undefined;
      return ops.getListItems(listName, { select: cleanSelect, filter: cleanFilter });
    },
    [],
  );

  const getListItemsFilter = getListItemsWithFilter;
  const getListTimeLineFilter = getListItemsWithFilter;

  const getApprovalListItems = useCallback(
    async (requester: SPHttpClient, siteUrl: string, listName: string) => {
      const ops = new SharePointOperations(requester, siteUrl);
      return ops.getListItems(listName, { select: "*" });
    },
    [],
  );

  const getDropDownListItems = getApprovalListItems;

  const uploadFileToDocumentLibrary = useCallback(
    async (
      file: File,
      libraryName: string,
      spHttpClient: SPHttpClient,
      siteUrl: string,
      metadata?: Record<string, unknown>,
    ): Promise<number> => {
      const ops = new SharePointOperations(spHttpClient, siteUrl);
      const res = await ops.uploadFileToLibrary(libraryName, file.name, file, metadata);
      return res.itemId;
    },
    [],
  );

  const deleteFileFromLibrary = useCallback(
    async (
      spHttpClient: SPHttpClient,
      siteUrl: string,
      serverRelativeUrl: string,
    ): Promise<void> => {
      const ops = new SharePointOperations(spHttpClient, siteUrl);
      await ops.recycleFile(serverRelativeUrl);
    },
    [],
  );

  return {
    createRequest,
    updateItems,
    deleteItem,
    getLookUpItems,
    getListItems,
    getAllListItems,
    getAttachments,
    getListItemsWithFilter,
    getListItemsFilter,
    getListTimeLineFilter,
    getApprovalListItems,
    getDropDownListItems,
    uploadFileToDocumentLibrary,
    deleteFileFromLibrary,
  };
};

