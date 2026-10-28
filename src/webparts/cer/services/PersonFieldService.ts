/**
 * Reusable SharePoint Person or Group Field Service
 *
 * Provides a robust, strongly-typed layer for resolving, reading, formatting,
 * and saving SharePoint Person or Group fields (SPFieldUser).
 *
 * Key Capabilities:
 * - Direct integration with DirectoryPeoplePicker and Entra ID / Microsoft 365 identities.
 * - Supported SharePoint REST `ensureUser` execution with site-context-aware caching.
 * - Accurate payload generation for single-person (`FieldNameId: number | null`)
 *   and multi-person (`FieldNameId: { results: number[] }`) columns.
 * - Resilient OData item extraction supporting expanded (`$expand=FieldName`),
 *   flat (`FieldNameId`), and fallback legacy structures.
 * - Explicit error reporting for missing, invalid, or unauthorized identities.
 *
 * @module PersonFieldService
 */

import { SPHttpClient, SPHttpClientResponse } from "@microsoft/sp-http";
import { IDirectoryUser, resolveDirectoryUserEmail } from "../models/UserModel";

// ---------------------------------------------------------------------------
// Types & Interfaces
// ---------------------------------------------------------------------------

/** Normalized SharePoint User representation returned by ensureUser or list queries */
export interface ISharePointUser {
  Id: number;
  Title: string;
  Email: string;
  LoginName: string;
  IsSiteAdmin?: boolean;
}

/** Normalized identity extraction result from a SharePoint list item */
export interface INormalizedPersonValue {
  id?: number;
  name: string;
  email: string;
  loginName: string;
}

// ---------------------------------------------------------------------------
// PersonFieldService Implementation
// ---------------------------------------------------------------------------

export class PersonFieldService {
  /**
   * Site-context-aware in-memory cache for resolved SharePoint users.
   * Keyed by: `${siteUrl.toLowerCase()}::${normalizedLogon}`
   * Invariant Site User IDs are preserved across operations to eliminate redundant network calls.
   */
  private static _userCache = new Map<string, { user: ISharePointUser; timestamp: number }>();
  private static readonly CACHE_TTL_MS = 600000; // 10 minutes

  /**
   * Normalizes a user identifier (strips claims prefix, trims, lowercases).
   */
  public static normalizeLogon(identifier?: string): string {
    if (!identifier) return "";
    return identifier
      .trim()
      .toLowerCase()
      .replace(/^i:0#\.f\|membership\|/i, "")
      .replace(/^membership\|/i, "");
  }

  /**
   * Clears the user cache for testing or permission refreshes.
   */
  public static clearCache(siteUrl?: string): void {
    if (siteUrl) {
      const prefix = `${siteUrl.toLowerCase()}::`;
      for (const key of Array.from(this._userCache.keys())) {
        if (key.startsWith(prefix)) {
          this._userCache.delete(key);
        }
      }
    } else {
      this._userCache.clear();
    }
  }

  /**
   * Resolves a user identity to a valid SharePoint Site User ID using the supported REST ensureUser API.
   *
   * @param client - The SPFx SPHttpClient instance
   * @param siteUrl - Target SharePoint site collection URL
   * @param identity - Email, UPN, or Directory user object
   * @returns Strongly-typed ISharePointUser containing valid integer Id
   */
  public static async resolveUser(
    client: SPHttpClient,
    siteUrl: string,
    identity: string | Partial<IDirectoryUser>
  ): Promise<ISharePointUser> {
    if (!client) {
      throw new Error("[PersonFieldService] SPHttpClient instance is required to resolve users.");
    }
    if (!siteUrl || !siteUrl.trim()) {
      throw new Error("[PersonFieldService] SharePoint siteUrl is required to resolve users in the correct context.");
    }

    let rawLogon = "";
    if (typeof identity === "string") {
      rawLogon = identity.trim();
    } else if (identity && typeof identity === "object") {
      rawLogon = resolveDirectoryUserEmail(identity) || identity.userPrincipalName || identity.mail || "";
    }

    if (!rawLogon) {
      throw new Error("[PersonFieldService] Cannot resolve user: No valid email or userPrincipalName provided.");
    }

    const normLogon = this.normalizeLogon(rawLogon);
    const cacheKey = `${siteUrl.toLowerCase()}::${normLogon}`;
    const now = Date.now();

    const cached = this._userCache.get(cacheKey);
    if (cached && (now - cached.timestamp < this.CACHE_TTL_MS)) {
      return cached.user;
    }

    const endpoint = `${siteUrl.replace(/\/+$/, "")}/_api/web/ensureUser`;
    const response: SPHttpClientResponse = await client.post(
      endpoint,
      SPHttpClient.configurations.v1,
      {
        headers: {
          Accept: "application/json;odata=nometadata",
          "Content-Type": "application/json;odata=verbose",
        },
        body: JSON.stringify({ logonName: rawLogon }),
      }
    );

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(
        `[PersonFieldService] Failed to resolve user '${rawLogon}' in SharePoint site (${response.status}): ${errText || response.statusText}`
      );
    }

    const data = await response.json();
    const id = Number(data.Id || data.id);
    if (!id || isNaN(id) || id <= 0) {
      throw new Error(`[PersonFieldService] ensureUser returned invalid or non-positive User ID for '${rawLogon}'.`);
    }

    const resolvedUser: ISharePointUser = {
      Id: id,
      Title: String(data.Title || data.title || (typeof identity === "object" ? identity.displayName : "") || rawLogon),
      Email: String(data.Email || data.email || data.EMail || (typeof identity === "object" ? identity.mail : "") || rawLogon),
      LoginName: String(data.LoginName || data.loginName || rawLogon),
      IsSiteAdmin: !!data.IsSiteAdmin,
    };

    this._userCache.set(cacheKey, { user: resolvedUser, timestamp: now });
    return resolvedUser;
  }

  /**
   * Formats a single-person field payload for SharePoint REST POST or MERGE operations.
   *
   * In SharePoint REST API, single-person fields with internal name `FieldName` MUST be saved
   * as `FieldNameId: <number>` (or `FieldNameId: null` to clear optional fields).
   *
   * @param internalFieldName - Internal name of the Person column (e.g. "User")
   * @param user - Resolved SharePoint user object, integer ID, or null
   */
  public static formatPersonFieldPayload(
    internalFieldName: string,
    user: ISharePointUser | number | null | undefined
  ): Record<string, any> {
    if (!internalFieldName || !internalFieldName.trim()) {
      throw new Error("[PersonFieldService] Internal field name must be specified.");
    }
    const cleanName = internalFieldName.trim();
    const targetKey = cleanName.endsWith("Id") ? cleanName : `${cleanName}Id`;

    if (user === null || user === undefined) {
      return { [targetKey]: null };
    }

    const userId = typeof user === "number" ? user : user.Id;
    if (typeof userId !== "number" || isNaN(userId) || userId <= 0) {
      throw new Error(`[PersonFieldService] Invalid user ID provided for Person column '${cleanName}': ${userId}`);
    }

    return { [targetKey]: userId };
  }

  /**
   * Formats a multi-person field payload for SharePoint REST POST or MERGE operations.
   *
   * Multi-selection Person columns with internal name `FieldName` are saved
   * as `FieldNameId: { results: [<number>] }` (or `FieldNameId: { results: [] }` to clear).
   *
   * @param internalFieldName - Internal name of the multi-person column
   * @param users - Array of resolved SharePoint user objects or integer IDs
   */
  public static formatMultiPersonFieldPayload(
    internalFieldName: string,
    users: Array<ISharePointUser | number> | null | undefined
  ): Record<string, any> {
    if (!internalFieldName || !internalFieldName.trim()) {
      throw new Error("[PersonFieldService] Internal field name must be specified.");
    }
    const cleanName = internalFieldName.trim();
    const targetKey = cleanName.endsWith("Id") ? cleanName : `${cleanName}Id`;

    if (!users || !Array.isArray(users) || users.length === 0) {
      return { [targetKey]: { results: [] } };
    }

    const validIds: number[] = [];
    for (const u of users) {
      const id = typeof u === "number" ? u : u?.Id;
      if (typeof id === "number" && !isNaN(id) && id > 0) {
        validIds.push(id);
      }
    }

    return { [targetKey]: { results: validIds } };
  }

  /**
   * Safely extracts and normalizes a Person field from a raw SharePoint list item.
   *
   * Handles:
   * 1. Expanded object: `item.User` containing `{ Id, Title, EMail, Name }`
   * 2. Flat lookup ID: `item.UserId`
   * 3. Fallback string fields: `item.Title`, `item.user_email`, `item.login_name`
   *
   * @param rawItem - Raw item object returned from SharePoint REST API
   * @param internalFieldName - Column internal name (e.g. "User")
   */
  public static extractPersonField(
    rawItem: any,
    internalFieldName: string
  ): INormalizedPersonValue | null {
    if (!rawItem || typeof rawItem !== "object") return null;

    const personObj = rawItem[internalFieldName];
    const idKey = internalFieldName.endsWith("Id") ? internalFieldName : `${internalFieldName}Id`;
    const flatId = rawItem[idKey];

    if (personObj && typeof personObj === "object") {
      const id = Number(personObj.Id !== undefined ? personObj.Id : personObj.id);
      const name = String(personObj.Title || personObj.title || personObj.LookupValue || "");
      const email = String(personObj.EMail || personObj.Email || personObj.email || personObj.Mail || "");
      const loginName = String(personObj.Name || personObj.name || personObj.UserName || email);

      return {
        id: !isNaN(id) && id > 0 ? id : undefined,
        name: name.trim(),
        email: email.trim(),
        loginName: loginName.trim(),
      };
    }

    if (flatId !== undefined && flatId !== null && !isNaN(Number(flatId))) {
      const rawTitle = String(rawItem.Title || "").trim();
      const isCerPrNo = rawTitle.startsWith("CER-") || (rawItem.cerPrNo && rawTitle === String(rawItem.cerPrNo).trim());
      const fallbackName = isCerPrNo ? String(rawItem.user_name || "").trim() : String(rawItem.Title || rawItem.user_name || "").trim();
      return {
        id: Number(flatId),
        name: fallbackName,
        email: String(rawItem.user_email || "").trim(),
        loginName: String(rawItem.login_name || rawItem.user_email || "").trim(),
      };
    }

    return null;
  }

  /**
   * Safely extracts and normalizes a multi-person field from a raw SharePoint list item.
   */
  public static extractMultiPersonField(
    rawItem: any,
    internalFieldName: string
  ): INormalizedPersonValue[] {
    if (!rawItem || typeof rawItem !== "object") return [];

    const personField = rawItem[internalFieldName];
    if (Array.isArray(personField)) {
      return personField.map((u) => {
        const id = Number(u.Id !== undefined ? u.Id : u.id);
        return {
          id: !isNaN(id) && id > 0 ? id : undefined,
          name: String(u.Title || u.title || u.LookupValue || "").trim(),
          email: String(u.EMail || u.Email || u.email || "").trim(),
          loginName: String(u.Name || u.name || "").trim(),
        };
      });
    }

    const single = this.extractPersonField(rawItem, internalFieldName);
    return single ? [single] : [];
  }
}
