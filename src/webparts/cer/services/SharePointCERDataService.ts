/* eslint-disable require-atomic-updates */
import { SPHttpClient } from "@microsoft/sp-http";
import { WebPartContext } from "@microsoft/sp-webpart-base";
import { ICERDataService } from "./ICERDataService";
import { ICERProposal, IFieldChoices, DEFAULT_FIELD_CHOICES } from "../models/CERModel";
import {
  ICERAuditRecord,
  ICERRemarksVersion,
  AUDIT_FIELD_DESCRIPTIONS,
  EXCLUDED_AUDIT_FIELDS,
} from "../models/AuditModel";
import {
  IWorkflowLevel,
  IApprovalDecision,
  INotificationLog,
  isProjectOwnerStage,
  ApproverAssignmentType,
  isValidEmail,
} from "../models/WorkflowModel";
import { ICERAttachment } from "../models/AttachmentModel";
import { IDirectoryUser, IUserRoleAssignment, IAdminAuditRecord } from "../models/UserModel";
import { validateAttachment } from "../utils/attachmentValidation";
import { getCurrentFiscalYearPhasingLabels, formatLocalDate, formatLocalTime, getLocalComponents } from "../utils/dateUtils";
import { SharePointOperations } from "../hooks/useSharePointOperations";
import { PersonFieldService } from "./PersonFieldService";
import { SP_LISTS, FIXED_6_LEVEL_APPROVAL_STAGES } from "../constants";
import { sanitizeProposalPayload, escapeODataString } from "../utils/sanitizationUtils";

export class SharePointCERDataService implements ICERDataService {
  private _spHttpClient: SPHttpClient;
  private _siteUrl: string;
  private _context?: WebPartContext;
  private _cachedFieldChoices?: IFieldChoices;
  private _sp: SharePointOperations;

  // In-memory caching & request deduplication for administrative metadata
  private _cachedUserRoles: IUserRoleAssignment[] | null = null;
  private _cachedUserRolesTimestamp: number = 0;
  private _inFlightUserRoles: Promise<IUserRoleAssignment[]> | null = null;

  private _cachedWorkflowLevels: Map<string, { data: IWorkflowLevel[]; timestamp: number }> = new Map();
  private _inFlightWorkflowLevels: Map<string, Promise<IWorkflowLevel[]>> = new Map();

  // In-memory caching & request deduplication for proposals, decisions, attachments & notifications
  private _cachedProposals: { data: ICERProposal[]; timestamp: number } | null = null;
  private _inFlightProposals: Promise<ICERProposal[]> | null = null;

  private _cachedProposalByNumber: Map<string, { data: ICERProposal; timestamp: number }> = new Map();
  private _inFlightProposalByNumber: Map<string, Promise<ICERProposal | null>> = new Map();

  private _cachedApprovalDecisions: Map<string, { data: IApprovalDecision[]; timestamp: number }> = new Map();
  private _inFlightApprovalDecisions: Map<string, Promise<IApprovalDecision[]>> = new Map();

  private _cachedAttachments: Map<string, { data: ICERAttachment[]; timestamp: number }> = new Map();
  private _inFlightAttachments: Map<string, Promise<ICERAttachment[]>> = new Map();

  private _cachedNotificationLogs: Map<string, { data: INotificationLog[]; timestamp: number }> = new Map();
  private _inFlightNotificationLogs: Map<string, Promise<INotificationLog[]>> = new Map();

  private _cachedSubmissionsByCerId: Map<string, { data: { active: ICERProposal | null; history: ICERProposal[] }; timestamp: number }> = new Map();
  private _cachedHistoryFields: Array<{ InternalName: string; Title: string; TypeAsString: string; EntityPropertyName?: string }> | null = null;

  public clearCache(): void {
    this._cachedHistoryFields = null;
    this._cachedSubmissionsByCerId.clear();
    this._cachedUserRoles = null;
    this._cachedUserRolesTimestamp = 0;
    this._inFlightUserRoles = null;
    this._cachedWorkflowLevels.clear();
    this._inFlightWorkflowLevels.clear();
    this._cachedProposals = null;
    this._inFlightProposals = null;
    this._cachedProposalByNumber.clear();
    this._inFlightProposalByNumber.clear();
    this._cachedApprovalDecisions.clear();
    this._inFlightApprovalDecisions.clear();
    this._cachedAttachments.clear();
    this._inFlightAttachments.clear();
    this._cachedNotificationLogs.clear();
    this._inFlightNotificationLogs.clear();
  }

  constructor(spHttpClient: SPHttpClient, siteUrl: string, context?: WebPartContext) {
    this._spHttpClient = spHttpClient;
    this._siteUrl = siteUrl;
    this._context = context;
    this._sp = new SharePointOperations(spHttpClient, siteUrl);
  }

  // ---------------------------------------------------------------------------
  // 0. Dropdown Choice Fields from SharePoint List Schema
  // ---------------------------------------------------------------------------

  public async getFieldChoices(): Promise<IFieldChoices> {
    if (this._cachedFieldChoices) {
      return this._cachedFieldChoices;
    }

    try {
      let fields: Array<{ InternalName: string; Title: string; Choices: string[]; DefaultValue: string }> = [];
      try {
        fields = await this._sp.getListFields(SP_LISTS.CER_PROPOSALS, {
          filter: "TypeAsString eq 'Choice'",
          select: "InternalName,Title,Choices,DefaultValue",
        });
      } catch {
        fields = [];
      }

      if (fields.length > 0) {
        const choicesMap: Record<string, string[]> = {};
        for (const f of fields) {
          const internalName = String(f.InternalName || "");
          if (Array.isArray(f.Choices) && f.Choices.length > 0) {
            choicesMap[internalName] = f.Choices.map((c: string) => String(c).trim()).filter(Boolean);
          }
        }

        const resolved: IFieldChoices = {
          sbu: choicesMap.sbu && choicesMap.sbu.length > 0 ? choicesMap.sbu : DEFAULT_FIELD_CHOICES.sbu,
          cat: (choicesMap.category || choicesMap.cat) && (choicesMap.category || choicesMap.cat).length > 0 ? (choicesMap.category || choicesMap.cat) : DEFAULT_FIELD_CHOICES.cat,
          currency: choicesMap.currency && choicesMap.currency.length > 0 ? choicesMap.currency : DEFAULT_FIELD_CHOICES.currency,
          payable: choicesMap.payable && choicesMap.payable.length > 0 ? choicesMap.payable : DEFAULT_FIELD_CHOICES.payable,
          cbudget: (choicesMap.currentBudgeted || choicesMap.cbudget) && (choicesMap.currentBudgeted || choicesMap.cbudget).length > 0 ? (choicesMap.currentBudgeted || choicesMap.cbudget) : DEFAULT_FIELD_CHOICES.cbudget,
          cb_currency: (choicesMap.currentBudgetCurrency || choicesMap.cb_currency) && (choicesMap.currentBudgetCurrency || choicesMap.cb_currency).length > 0 ? (choicesMap.currentBudgetCurrency || choicesMap.cb_currency) : DEFAULT_FIELD_CHOICES.cb_currency,
          jv: (choicesMap.jointVenture || choicesMap.jv) && (choicesMap.jointVenture || choicesMap.jv).length > 0 ? (choicesMap.jointVenture || choicesMap.jv) : DEFAULT_FIELD_CHOICES.jv,
          jv_recoverable: (choicesMap.jvRecoverable || choicesMap.jv_recoverable) && (choicesMap.jvRecoverable || choicesMap.jv_recoverable).length > 0 ? (choicesMap.jvRecoverable || choicesMap.jv_recoverable) : DEFAULT_FIELD_CHOICES.jv_recoverable,
          jv_budget: (choicesMap.jvBudgeted || choicesMap.jv_budget) && (choicesMap.jvBudgeted || choicesMap.jv_budget).length > 0 ? (choicesMap.jvBudgeted || choicesMap.jv_budget) : DEFAULT_FIELD_CHOICES.jv_budget,
          status: Array.from(
            new Set(
              (choicesMap.status && choicesMap.status.length > 0 ? choicesMap.status : DEFAULT_FIELD_CHOICES.status)
                .map((s: string) => (s === "Approval" ? "In Approval" : s.trim()))
                .concat(["In Approval", "Approved", "Draft", "Rejected", "Revised"])
                .filter(Boolean)
            )
          ),
        };

        this._cachedFieldChoices = resolved;
        return resolved;
      }
    } catch (e) {
      console.warn("[SharePointCERDataService] Error querying choice fields from CERProposals list, using default field choices:", e);
    }

    this._cachedFieldChoices = DEFAULT_FIELD_CHOICES;
    return DEFAULT_FIELD_CHOICES;
  }

  // ---------------------------------------------------------------------------
  // 1. CERProposals Operations
  // ---------------------------------------------------------------------------

  public async getAllProposals(forceRefresh: boolean = false): Promise<ICERProposal[]> {
    const now = Date.now();
    const CACHE_TTL_MS = 25000;

    if (!forceRefresh && this._cachedProposals && now - this._cachedProposals.timestamp < CACHE_TTL_MS) {
      return this._cachedProposals.data.map((p) => ({ ...p }));
    }

    if (!forceRefresh && this._inFlightProposals) {
      const res = await this._inFlightProposals;
      return res.map((p) => ({ ...p }));
    }

    const fetchPromise = (async () => {
      const candidateLists = [SP_LISTS.CER_PROPOSALS, SP_LISTS.CER_PROPOSALS_HISTORY];
      let lastErr: any = null;

      for (const listName of candidateLists) {
        try {
          let items: any[] = [];
          const fetchItems = typeof this._sp.getAllListItems === "function"
            ? (opts: any) => this._sp.getAllListItems(listName, opts)
            : (opts: any) => this._sp.getListItems(listName, opts);
          // Primary query with full Person & System expansion (cerOwner, Author, Editor)
          try {
            items = await fetchItems({
              top: 500,
              orderby: "Created desc",
              expand: "cerOwner,Author,Editor",
              select: "*,cerOwner/Id,cerOwner/Title,cerOwner/EMail,cerOwner/Name,Author/Id,Author/Title,Author/EMail,Editor/Id,Editor/Title,Editor/EMail",
            });
          } catch (expandErr) {
            // Tier 2: Fallback with cerOwner only
            try {
              items = await fetchItems({
                top: 500,
                orderby: "Created desc",
                expand: "cerOwner",
                select: "*,cerOwner/Id,cerOwner/Title,cerOwner/EMail,cerOwner/Name",
              });
            } catch (cerOwnerErr) {
              // Tier 3: Unexpanded query
              items = await fetchItems({
                top: 500,
                orderby: "Created desc",
              });
            }
          }
          const mapped = items
            .filter((item: Record<string, unknown>) => {
              const no = String(item.cerPrId || item.cerPrNo || item.cerprno || item.Title || "");
              const status = String(item.Status || item.cerStatus || item.status || "");
              return !no.toUpperCase().startsWith("CER-COUNTER-") && status !== "SystemCounter";
            })
            .map((item: Record<string, unknown>) =>
              this._mapSharePointItemToProposal(item),
            );
          this._cachedProposals = { data: mapped, timestamp: Date.now() };
          // Prime individual proposal lookup cache
          for (const p of mapped) {
            if (p.cerprno) {
              this._cachedProposalByNumber.set(p.cerprno.trim().toUpperCase(), {
                data: p,
                timestamp: Date.now(),
              });
            }
          }
          return mapped;
        } catch (e) {
          lastErr = e;
        }
      }

      console.error(
        "[SharePointCERDataService] Failed to query CERProposals list from SharePoint:",
        lastErr,
      );
      throw new Error(
        `Unable to load CER proposals from SharePoint: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
      );
    })();

    this._inFlightProposals = fetchPromise;
    try {
      const res = await fetchPromise;
      return res.map((p) => ({ ...p }));
    } finally {
      this._inFlightProposals = null;
    }
  }

  /**
   * Retrieves proposals owned or created by the current user using server-side filtering
   * to avoid downloading the entire enterprise dataset for personal lists.
   */
  public async getMyProposals(
    userEmail: string,
    userName?: string,
    forceRefresh: boolean = false,
  ): Promise<ICERProposal[]> {
    if (!userEmail && !userName) {
      return [];
    }
    const cleanEmail = (userEmail || "").trim().toLowerCase();
    const candidateLists = [SP_LISTS.CER_PROPOSALS];
    let lastErr: any = null;

    for (const listName of candidateLists) {
      try {
        let items: any[] = [];
        const fetchItems = typeof this._sp.getListItems === "function"
          ? (opts: any) => this._sp.getListItems(listName, opts)
          : (opts: any) => this._sp.getAllListItems(listName, opts);

        const safeEmail = cleanEmail.replace(/'/g, "''");
        try {
          items = await fetchItems({
            filter: `cerOwner/EMail eq '${safeEmail}' or Author/EMail eq '${safeEmail}'`,
            top: 500,
            orderby: "Created desc",
            expand: "cerOwner,Author,Editor",
            select: "*,cerOwner/Id,cerOwner/Title,cerOwner/EMail,cerOwner/Name,Author/Id,Author/Title,Author/EMail,Editor/Id,Editor/Title,Editor/EMail",
          });
        } catch {
          // If server-side compound filter on Person column fails, fallback to client-side filtering over cached proposals
          const all = await this.getAllProposals(forceRefresh);
          return all.filter((p) => {
            const pOwner = (p.owner_email || "").trim().toLowerCase();
            const pAuthor = (p.created_by || "").trim().toLowerCase();
            return pOwner === cleanEmail || (userName && (p.owname || "").toLowerCase() === userName.toLowerCase()) || pAuthor === cleanEmail;
          });
        }

        const mapped = items
          .filter((item: Record<string, unknown>) => {
            const no = String(item.cerPrId || item.cerPrNo || item.cerprno || item.Title || "");
            const status = String(item.Status || item.cerStatus || item.status || "");
            return !no.toUpperCase().startsWith("CER-COUNTER-") && status !== "SystemCounter";
          })
          .map((item: Record<string, unknown>) =>
            this._mapSharePointItemToProposal(item),
          );
        return mapped;
      } catch (e) {
        lastErr = e;
      }
    }

    const all = await this.getAllProposals(forceRefresh);
    return all.filter((p) => {
      const pOwner = (p.owner_email || "").trim().toLowerCase();
      const pAuthor = (p.created_by || "").trim().toLowerCase();
      return (
        pOwner === cleanEmail ||
        (userName && (p.owname || "").toLowerCase() === userName.toLowerCase()) ||
        pAuthor === cleanEmail
      );
    });
  }

  public async getProposalByNumber(
    cerprno: string,
    forceRefresh: boolean = false,
  ): Promise<ICERProposal | null> {
    const key = (cerprno || "").trim().toUpperCase();
    if (key.startsWith("CER-COUNTER-")) {
      return null;
    }
    const now = Date.now();
    const CACHE_TTL_MS = 25000;

    if (!forceRefresh) {
      const cached = this._cachedProposalByNumber.get(key);
      if (cached && now - cached.timestamp < CACHE_TTL_MS) {
        return { ...cached.data };
      }
      if (this._cachedProposals && now - this._cachedProposals.timestamp < CACHE_TTL_MS) {
        const found = this._cachedProposals.data.find(
          (p) =>
            (p.cer_proposal_id || "").trim().toUpperCase() === key ||
            (p.cerprno || "").trim().toUpperCase() === key ||
            (p.proposal_no || "").trim().toUpperCase() === key,
        );
        if (found) {
          this._cachedProposalByNumber.set(key, { data: found, timestamp: now });
          if (found.cer_proposal_id) {
            this._cachedProposalByNumber.set(found.cer_proposal_id.trim().toUpperCase(), { data: found, timestamp: now });
          }
          if (found.proposal_no) {
            this._cachedProposalByNumber.set(found.proposal_no.trim().toUpperCase(), { data: found, timestamp: now });
          }
          return { ...found };
        }
      }
    }

    const inFlight = this._inFlightProposalByNumber.get(key);
    if (!forceRefresh && inFlight) {
      const res = await inFlight;
      return res ? { ...res } : null;
    }

    const fetchPromise = (async () => {
      const candidateLists = [SP_LISTS.CER_PROPOSALS, SP_LISTS.CER_PROPOSALS_HISTORY];
      let lastErr: any = null;
      const safeFilterVal = escapeODataString(cerprno);

      for (const listName of candidateLists) {
        try {
          let items: any[] = [];
          // Tier 1: With full Person & System expansion (cerOwner, Author, Editor)
          try {
            items = await this._sp.getListItems(listName, {
              filter: `cerPrId eq '${safeFilterVal}' or proposalNo eq '${safeFilterVal}' or Title eq '${safeFilterVal}'`,
              orderby: "Modified desc",
              expand: "cerOwner,Author,Editor",
              select: "*,cerOwner/Id,cerOwner/Title,cerOwner/EMail,cerOwner/Name,Author/Id,Author/Title,Author/EMail,Editor/Id,Editor/Title,Editor/EMail",
              top: 1,
            });
          } catch (t1Err) {
            // Tier 2: With cerOwner only
            try {
              items = await this._sp.getListItems(listName, {
                filter: `cerPrId eq '${safeFilterVal}' or Title eq '${safeFilterVal}' or proposalNo eq '${safeFilterVal}'`,
                orderby: "Modified desc",
                expand: "cerOwner",
                select: "*,cerOwner/Id,cerOwner/Title,cerOwner/EMail,cerOwner/Name",
                top: 1,
              });
            } catch (t2Err) {
              // Tier 3: Fetch recent list items with expand and match in memory
              try {
                const allItems = await this._sp.getListItems(listName, {
                  top: 500,
                  orderby: "Created desc",
                  expand: "cerOwner,Author,Editor",
                  select: "*,cerOwner/Id,cerOwner/Title,cerOwner/EMail,cerOwner/Name,Author/Id,Author/Title,Author/EMail,Editor/Id,Editor/Title,Editor/EMail",
                });
                items = allItems.filter(
                  (it: any) =>
                    (it.cerPrId && it.cerPrId === cerprno) ||
                    (it.cerPrNo && it.cerPrNo === cerprno) ||
                    it.Title === cerprno ||
                    (it.proposalNo && it.proposalNo === cerprno) ||
                    (it.proposal_no && it.proposal_no === cerprno),
                );
              } catch (t3Err) {
                items = [];
              }
            }
          }

          if (items.length > 0) {
            const mapped = this._mapSharePointItemToProposal(items[0]);
            this._cachedProposalByNumber.set(key, { data: mapped, timestamp: Date.now() });
            return mapped;
          }
        } catch (e) {
          lastErr = e;
        }
      }

      if (lastErr) {
        console.error(`[SharePointCERDataService] Failed to query proposal '${cerprno}' from SharePoint:`, lastErr);
        throw new Error(
          `Unable to load proposal '${cerprno}' from SharePoint: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
        );
      }

      return null;
    })();

    this._inFlightProposalByNumber.set(key, fetchPromise);
    try {
      const res = await fetchPromise;
      return res ? { ...res } : null;
    } finally {
      this._inFlightProposalByNumber.delete(key);
    }
  }

  /**
   * Concurrency-safe atomic proposal number allocation (Phase 4 Issue 1).
   *
   * Utilizes an optimistic Compare-and-Swap (CAS) pattern backed by a dedicated
   * counter record in CERProposals ('CER-COUNTER-{year}').
   *
   * Concurrency is enforced by SharePoint's native ETag conditional MERGE (If-Match: etag).
   * If two requests race to allocate the same number, one succeeds (204) and the other
   * receives HTTP 412 (Precondition Failed). On HTTP 412, the allocator re-reads the counter
   * and retries the CAS update with jittered backoff.
   */
  public async generateProposalNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CER-${year}-`;
    const counterIdentifier = `CER-COUNTER-${year}`;
    const listName = SP_LISTS.CER_PROPOSALS;
    const maxCasAttempts = 5;

    for (let attempt = 1; attempt <= maxCasAttempts; attempt++) {
      try {
        // 1. Query for existing sequence counter item in SharePoint
        let counterItems: any[] = [];
        try {
          counterItems = await this._sp.getListItems(listName, {
            filter: `cerPrId eq '${counterIdentifier}' or Title eq '${counterIdentifier}'`,
            select: "Id,Title,cerPrId,amount",
            top: 1,
          });
        } catch {
          try {
            counterItems = await this._sp.getListItems(listName, {
              filter: `Title eq '${counterIdentifier}'`,
              select: "Id,Title,amount",
              top: 1,
            });
          } catch {
            const allItems = await this._sp.getListItems<any>(listName, {
              select: "Id,Title,amount",
              top: 500,
            });
            counterItems = allItems.filter(
              (it) => it.cerPrId === counterIdentifier || it.cerPrNo === counterIdentifier || it.Title === counterIdentifier,
            );
          }
        }

        let counterItem = counterItems && counterItems.length > 0 ? counterItems[0] : null;

        // 2. Bootstrap counter item if it does not exist yet
        if (!counterItem) {
          let highest = 0;
          try {
            let existingItems: any[] = [];
            try {
              existingItems = await this._sp.getListItems<any>(listName, {
                select: "Id,Title,cerPrId,proposalNo",
                top: 2000,
                orderby: "Created desc",
              });
            } catch {
              existingItems = await this._sp.getListItems<any>(listName, {
                select: "Id,Title",
                top: 2000,
                orderby: "Created desc",
              });
            }
            for (const item of existingItems) {
              const no = String(item.cerPrId || item.cerPrNo || item.cerprno || item.Title || "");
              if (no.startsWith(prefix) && !no.startsWith("CER-COUNTER-")) {
                const numPart = parseInt(no.replace(prefix, ""), 10);
                if (!isNaN(numPart) && numPart > highest) {
                  highest = numPart;
                }
              }
            }
          } catch (scanErr) {
            console.warn("[SharePointCERDataService] Warning scanning baseline sequence:", scanErr);
          }

          try {
            const created = await this._sp.createListItem<{ Id: number }>(
              listName,
              {
                Title: counterIdentifier,
                cerPrId: counterIdentifier,
                amount: highest,
                status: "SystemCounter",
                sbu: "System",
                object: `Atomic Sequence Counter for ${year}`,
              },
              { isIdempotent: false },
            );

            // Re-fetch counter item to acquire assigned ETag
            try {
              counterItems = await this._sp.getListItems(listName, {
                filter: `cerPrId eq '${counterIdentifier}' or Title eq '${counterIdentifier}'`,
                select: "Id,Title,cerPrId,amount",
                top: 1,
              });
            } catch {
              counterItems = await this._sp.getListItems(listName, {
                filter: `Title eq '${counterIdentifier}'`,
                select: "Id,Title,amount",
                top: 1,
              });
            }
            counterItem =
              counterItems && counterItems.length > 0
                ? counterItems[0]
                : { Id: created.Id, amount: highest };
          } catch (createErr) {
            // Another concurrent request may have bootstrapped the counter record at the same time
            console.warn(
              `[SharePointCERDataService] Counter bootstrap collision on attempt ${attempt}:`,
              createErr,
            );
            await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 100));
            continue;
          }
        }

        // 3. Extract current sequence and ETag for Compare-and-Swap
        const spId = counterItem.Id;
        const currentSeq = Number(counterItem.amount ?? counterItem.revisionCount ?? counterItem.revision_count ?? 0);
        const nextSeq = currentSeq + 1;
        const etag =
          counterItem["@odata.etag"] ||
          counterItem["odata.etag"] ||
          counterItem.__metadata?.etag ||
          undefined;

        // 4. Perform atomic CAS update with ETag conditional MERGE
        try {
          await this._sp.updateListItem(
            listName,
            spId,
            {
              amount: nextSeq,
            },
            etag,
          );

          // Atomic allocation succeeded!
          return `${prefix}${("0000" + nextSeq).slice(-4)}`;
        } catch (updateErr: any) {
          const isConflict =
            String(updateErr?.message || "").indexOf("HTTP 412") !== -1 ||
            String(updateErr?.message || "").indexOf("Concurrency conflict") !== -1 ||
            String(updateErr?.message || "").indexOf("412") !== -1;

          if (isConflict && attempt < maxCasAttempts) {
            console.warn(
              `[SharePointCERDataService] CAS sequence conflict on ${counterIdentifier} (attempt ${attempt}/${maxCasAttempts}). Retrying...`,
            );
            await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 150));
            continue;
          }

          throw updateErr;
        }
      } catch (loopErr: any) {
        if (attempt >= maxCasAttempts) {
          console.error(
            `[SharePointCERDataService] Failed to allocate atomic proposal number after ${maxCasAttempts} attempts:`,
            loopErr,
          );
          throw new Error(
            `Unable to allocate a unique CER Proposal Number due to high concurrent submission traffic. Please retry. (Details: ${loopErr instanceof Error ? loopErr.message : String(loopErr)})`,
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 50 + Math.random() * 150));
      }
    }

    throw new Error(
      "Unable to allocate unique CER Proposal Number: Max retry attempts exceeded.",
    );
  }

  /**
   * Intelligently executes a SharePoint list item create or update operation with automatic
   * recovery if SharePoint rejects properties that do not exist on the list schema.
   *
   * If SharePoint returns HTTP 400 "The property 'X' does not exist on type '...'", this helper
   * extracts the offending property name 'X', removes it from the payload (or tries its alternative
   * casing if known, e.g. RequestDate <-> requestDate), and retries the operation.
   */
  private async _executeWithFieldFallback<T = void>(
    action: (payload: Record<string, any>) => Promise<T>,
    initialPayload: Record<string, any>,
    maxRetries: number = 10
  ): Promise<T> {
    const payload: Record<string, any> = { ...initialPayload };
    // Safety check: always strip legacy internal properties that do not exist on modern lists
    delete payload.cerprno;
    delete payload.cerPrNo;
    delete payload.proposal_no;
    delete payload.owname;
    delete payload.owner_email;

    let attempts = 0;

    while (attempts <= maxRetries) {
      try {
        return await action(payload);
      } catch (err: any) {
        attempts++;
        const errMsg = String(err?.message || "");

        // Concurrency conflicts (HTTP 412) must never be swallowed or retried with stripped fields
        if (errMsg.indexOf("HTTP 412") !== -1 || errMsg.indexOf("Concurrency conflict") !== -1 || errMsg.indexOf("412") !== -1) {
          throw err;
        }

        // Match SharePoint REST error: "The property 'fieldName' does not exist on type '...'"
        const propMatch =
          /The property '([^']+)' does not exist/i.exec(errMsg) ||
          /property '([^']+)' does not exist/i.exec(errMsg) ||
          /field or property '([^']+)' does not exist/i.exec(errMsg) ||
          /column named '([^']+)' was not found/i.exec(errMsg) ||
          /field '([^']+)' does not exist/i.exec(errMsg) ||
          /A parameter named '([^']+)' was not found/i.exec(errMsg);

        if (propMatch && propMatch[1]) {
          const missingProp = propMatch[1];
          console.warn(`[SharePointCERDataService] SharePoint reported property '${missingProp}' does not exist on list schema. Reconciling and retrying...`);

          delete payload[missingProp];

          // Handle known casing / schema variations:
          if (missingProp === "RequestDate" && initialPayload.RequestDate && !payload.requestDate) {
            payload.requestDate = initialPayload.RequestDate;
          } else if (missingProp === "requestDate" && (initialPayload.requestDate || initialPayload.RequestDate) && !payload.RequestDate) {
            payload.RequestDate = initialPayload.requestDate || initialPayload.RequestDate;
          } else if (missingProp === "cerPrId" && !payload.CERProposalID && initialPayload.cerPrId) {
            payload.CERProposalID = initialPayload.cerPrId;
          } else if (missingProp === "proposalNo" && !payload.ProposalNo && initialPayload.proposalNo) {
            payload.ProposalNo = initialPayload.proposalNo;
          } else if (missingProp === "prName" && !payload.PrName && initialPayload.prName) {
            payload.PrName = initialPayload.prName;
          } else if (missingProp === "sbu" && !payload.SBU && initialPayload.sbu) {
            payload.SBU = initialPayload.sbu;
          } else if (missingProp === "status" && !payload.Status && initialPayload.status) {
            payload.Status = initialPayload.status;
          }

          if (attempts <= maxRetries) {
            continue;
          }
        }

        // If error is about invalid DateTime conversion, strip date fields and retry
        if (
          errMsg.indexOf("DateTime") !== -1 ||
          errMsg.indexOf("Edm.DateTime") !== -1 ||
          errMsg.indexOf("was not recognized as a valid") !== -1
        ) {
          console.warn("[SharePointCERDataService] DateTime parsing failure reported by SharePoint. Removing date fields and retrying...");
          delete payload.startDate;
          delete payload.completionDate;
          delete payload.RequestDate;
          delete payload.requestDate;
          if (attempts <= maxRetries) {
            continue;
          }
        }

        // If the error mentioned cerprno or similar legacy fields
        if (errMsg.toLowerCase().indexOf("cerprno") !== -1) {
          delete payload.cerprno;
          delete payload.cerPrNo;
          if (attempts <= maxRetries) {
            continue;
          }
        }

        // Re-throw if unhandled or exhausted retries
        throw err;
      }
    }

    throw new Error("Maximum retry attempts exceeded while reconciling SharePoint field schema.");
  }

  public async createProposal(
    proposal: ICERProposal,
  ): Promise<{ success: boolean; message: string; proposal: ICERProposal }> {
    // Defense-in-depth: Deeply sanitize all fields on write
    const cleanProposal = sanitizeProposalPayload(proposal);
    const now = new Date().toISOString();
    const isDraft = cleanProposal.status === "Draft";

    // Validate mandatory user-entered CER Proposal No
    const effectiveProposalNo = (cleanProposal.proposal_no || cleanProposal.cerprno || "").trim();
    if (!effectiveProposalNo) {
      throw new Error("CER Proposal No is required.");
    }

    const activeLevels = await this.getWorkflowLevels(cleanProposal.sbu);
    if (!isDraft && activeLevels.length === 0) {
      throw new Error(`No approval stages configured for SBU '${cleanProposal.sbu}'. Please configure workflow levels in Admin settings.`);
    }
    const activeL1 = activeLevels.find((l) => l.level_id === 1 && l.is_active) || activeLevels[0];
    const isL1PO = activeL1 ? isProjectOwnerStage(activeL1) : false;

    if (!isDraft && isL1PO && !isValidEmail(cleanProposal.owner_email)) {
      throw new Error(`Cannot route to Project Owner: Proposal Owner Email ('${cleanProposal.owner_email || ""}') is missing or invalid.`);
    }

    // Allocate permanent, immutable CER Proposal ID in CER-YYYY-NNNN format using atomic CAS counter
    let permanentId = (cleanProposal.cer_proposal_id || cleanProposal.cerprno || "").trim();
    const isPermanentIdValid =
      Boolean(cleanProposal.id) &&
      permanentId.startsWith("CER-") &&
      !permanentId.startsWith("CER-COUNTER-") &&
      /^CER-\d{4}-\d{4}$/.test(permanentId);

    if (!isPermanentIdValid) {
      // Allocate fresh sequence using SharePoint atomic CAS allocator
      permanentId = await this.generateProposalNumber();
    }

    const newProposal: ICERProposal = {
      ...cleanProposal,
      proposal_no: effectiveProposalNo,
      cer_proposal_id: permanentId,
      cerprno: permanentId,
      status: isDraft ? "Draft" : "In Approval",
      current_level: isDraft ? 0 : 1,
      pending_with_role: isDraft ? "Draft" : (activeL1 ? activeL1.role_title : "L1 - Technical Review"),
      pending_with_email: isDraft ? "" : (isL1PO ? (proposal.owner_email || "") : (activeL1 ? (activeL1.approver_email || "") : "")),
      request_date: isDraft ? proposal.request_date : (proposal.request_date || now.split("T")[0]),
      created_date: proposal.created_date || now,
      modified_date: now,
      revision_count: proposal.revision_count || 0,
    };

    // Fast targeted uniqueness check for user-entered CER Proposal No against existing records
    try {
      const duplicate = await this.getProposalByNumber(effectiveProposalNo);
      if (duplicate && duplicate.id && String(duplicate.id) !== String(newProposal.id)) {
        throw new Error(
          `CER Proposal No. '${effectiveProposalNo}' already exists in SharePoint. Proposal numbers must be unique.`
        );
      }
    } catch (dupCheckErr: any) {
      if (String(dupCheckErr?.message || "").indexOf("already exists") !== -1) {
        throw dupCheckErr;
      }
    }

    let ownerSpUserId: number | null = null;
    if (newProposal.owner_email || newProposal.owname) {
      try {
        const ensuredOwner = await PersonFieldService.resolveUser(
          this._spHttpClient,
          this._siteUrl,
          newProposal.owner_email || newProposal.owname
        );
        if (ensuredOwner && ensuredOwner.Id > 0) {
          ownerSpUserId = ensuredOwner.Id;
        }
      } catch (ensureErr) {
        console.warn("[SharePointCERDataService] ensureUser resolution warning for cerOwner:", ensureErr);
      }
    }

    const modernPayload: any = this._mapProposalToModernSharePointItem(newProposal);
    if (ownerSpUserId) {
      const ownerPayload = PersonFieldService.formatPersonFieldPayload("cerOwner", ownerSpUserId);
      Object.assign(modernPayload, ownerPayload);
    }

    // Check if an item already exists in CERProposals list (e.g. updating an existing draft)
    let existingItems: Array<{ Id: number; Status?: string; cerStatus?: string }> = [];
    const targetListName: string = SP_LISTS.CER_PROPOSALS;
    if (newProposal.id && /^\d+$/.test(newProposal.id)) {
      try {
        const items = await this._sp.getListItems<{ Id: number; status?: string; Status?: string; cerStatus?: string }>(
          targetListName,
          {
            filter: `Id eq ${parseInt(newProposal.id, 10)}`,
            select: "Id,Title,cerPrId,status",
            top: 1,
          }
        );
        if (items && items.length > 0) {
          existingItems = items;
        }
      } catch {
        // Direct ID query failed, will proceed to creation
      }
    } else if (newProposal.id) {
      // Query by cerPrId or Title only if ID is a non-numeric legacy key
      try {
        existingItems = await this._sp.getListItems<{ Id: number; status?: string; Status?: string; cerStatus?: string }>(targetListName, {
          filter: `cerPrId eq '${newProposal.cerprno}' or Title eq '${newProposal.cerprno}'`,
          select: "Id,Title,cerPrId,status",
          top: 1,
        });
      } catch {
        // Query failed
      }
    }

    let assignedProposalId = newProposal.id || "";

    if (existingItems.length > 0) {
      const existing = existingItems[0];
      const existingIdStr = String(existing.Id);

      // Concurrency & Ownership Protection:
      // An existing item can ONLY be updated if this caller already owns that specific SharePoint Item ID (existingIdStr === newProposal.id).
      // If newProposal.id is absent or does not match existing.Id, this is a sequence collision with another proposal/draft!
      if (!newProposal.id || newProposal.id !== existingIdStr) {
        throw new Error(
          `CER Proposal No. '${newProposal.cerprno}' already exists in SharePoint. Proposal numbers must be unique.`
        );
      }

      const existingStatus = String(existing.Status || existing.cerStatus || "").trim();
      // If the item already exists in SharePoint and is not an unsubmitted draft, reject duplicate submission
      if (existingStatus && existingStatus !== "Draft") {
        throw new Error(
          `CER Proposal No. '${newProposal.cerprno}' already exists in SharePoint. Proposal numbers must be unique.`
        );
      }

      const spItemId = existing.Id;
      assignedProposalId = String(spItemId);

      try {
        await this._executeWithFieldFallback(
          (payload) => this._sp.updateListItem(targetListName, spItemId, payload),
          modernPayload
        );
      } catch (saveErr) {
        console.error("[SharePointCERDataService] Failed to update existing CER proposal in SharePoint:", saveErr);
        throw new Error(
          `Unable to save the CER to SharePoint. No successful save could be confirmed. Please verify the proposal before retrying. (Details: ${saveErr instanceof Error ? saveErr.message : String(saveErr)})`,
        );
      }

      // Secondary write: Remarks history
      if (newProposal.remarks && newProposal.remarks.trim()) {
        try {
          await this._createRemarksRecord(newProposal.cerprno, 1, newProposal.remarks, newProposal.created_by);
        } catch (remarksErr) {
          console.warn("[SharePointCERDataService] Secondary remarks write warning:", remarksErr);
        }
      }

      // Secondary write: Notification dispatch
      if (!isDraft) {
        try {
          await this._createNotificationRecord(
            newProposal.cerprno,
            [newProposal.owner_email, newProposal.pending_with_email].filter(Boolean),
            `[CER Action Required] New Proposal ${newProposal.cerprno} - ${newProposal.pr_name}`,
            `CER Proposal ${newProposal.cerprno} (${newProposal.pr_name}) for ${newProposal.currency} ${Number(newProposal.amount || 0).toLocaleString()} has been submitted and is awaiting Level 1 approval (${newProposal.pending_with_role}).`,
            0,
          );
        } catch (notifErr) {
          console.warn("[SharePointCERDataService] Secondary notification write warning:", notifErr);
        }
      }

      this._cachedProposals = null;
      this._cachedProposalByNumber.delete(newProposal.cerprno.toUpperCase());

      return {
        success: true,
        message: isDraft
          ? "CER Proposal draft saved successfully"
          : "CER Proposal No. has been created and sent for approval",
        proposal: { ...newProposal, id: assignedProposalId },
      };
    }

    // If item does not exist, POST new record
    try {
      let createdItem: { Id: number } | undefined;
      const listName = SP_LISTS.CER_PROPOSALS;
      let lastCreateErr: any = null;

      const proposalCreateOptions = {
        isIdempotent: false,
        reconcileFn: async () => {
          try {
            const query = await this._sp.getListItems<{ Id: number }>(listName, {
              filter: `cerPrId eq '${newProposal.cerprno}' or Title eq '${newProposal.cerprno}'`,
              select: "Id,Title",
              top: 1,
            });
            return query && query.length > 0 ? { Id: query[0].Id } : null;
          } catch {
            return null;
          }
        },
      };

      try {
        createdItem = await this._executeWithFieldFallback(
          (payload) => this._sp.createListItem<{ Id: number }>(listName, payload, proposalCreateOptions),
          modernPayload
        );
      } catch (err) {
        lastCreateErr = err;
      }

      if (createdItem && createdItem.Id) {
        assignedProposalId = String(createdItem.Id);
      } else if (lastCreateErr) {
        throw lastCreateErr;
      }
    } catch (createErr) {
      console.error("[SharePointCERDataService] Failed to create CER proposal in SharePoint:", createErr);
      throw new Error(
        `Unable to save the CER to SharePoint. No successful save could be confirmed. Please verify the proposal before retrying. (Details: ${createErr instanceof Error ? createErr.message : String(createErr)})`,
      );
    }

    // Secondary write: Workflow dispatch notification into CERNotifications
    if (!isDraft) {
      try {
        await this._createNotificationRecord(
          newProposal.cerprno,
          [newProposal.owner_email, newProposal.pending_with_email].filter(Boolean),
          `[CER Action Required] New Proposal ${newProposal.cerprno} - ${newProposal.pr_name}`,
          `CER Proposal ${newProposal.cerprno} (${newProposal.pr_name}) for ${newProposal.currency} ${Number(newProposal.amount || 0).toLocaleString()} has been submitted and is awaiting Level 1 approval (${newProposal.pending_with_role}).`,
          0,
        );
      } catch (notifErr) {
        console.warn("[SharePointCERDataService] Secondary notification write warning:", notifErr);
      }
    }

    this._cachedProposals = null;
    this._cachedProposalByNumber.delete(newProposal.cerprno.toUpperCase());

    return {
      success: true,
      message: isDraft
        ? "CER Proposal draft saved successfully"
        : "CER Proposal No. has been created and sent for approval",
      proposal: { ...newProposal, id: assignedProposalId },
    };
  }

  public async updateProposal(
    proposal: ICERProposal,
    user: { name: string; email: string },
    originalProposal?: ICERProposal,
  ): Promise<{
    success: boolean;
    message: string;
    proposal: ICERProposal;
    auditRowsCount: number;
  }> {
    // Defense-in-depth: Deeply sanitize all fields on update
    const cleanProposal = sanitizeProposalPayload(proposal);
    const now = new Date().toISOString();
    const existing = await this.getProposalByNumber(cleanProposal.cerprno, true);
    const original = originalProposal || existing || cleanProposal;

    // Enterprise RBAC: Only designated CER Owner or Administrator can edit proposals
    const userEmail = (user.email || "").trim().toLowerCase();
    const ownerEmail = (original.owner_email || "").trim().toLowerCase();
    const isEmailOwner = userEmail && ownerEmail && userEmail === ownerEmail;

    const userName = (user.name || "").trim().toLowerCase();
    const ownerName = (original.owname || "").trim().toLowerCase();
    const isNameOwner = userName && ownerName && userName === ownerName;

    const isAuthorizedActor =
      isEmailOwner ||
      isNameOwner ||
      userEmail.indexOf("Admin") !== -1 ||
      userEmail.indexOf("auditor") !== -1;

    if (!isAuthorizedActor) {
      throw new Error(`Unauthorized: Only the designated CER Owner (${original.owname}) or Administrator can edit this proposal.`);
    }

    // 1. Calculate field-level deltas for CERAuditTrail
    const auditRecords: ICERAuditRecord[] = [];
    const changedKeys = (Object.keys(cleanProposal) as Array<keyof ICERProposal>).filter(
      (key) => {
        if (EXCLUDED_AUDIT_FIELDS.has(key as string)) return false;
        const oldVal = original[key];
        const newVal = cleanProposal[key];
        return String(oldVal ?? "") !== String(newVal ?? "");
      },
    );

    const local = getLocalComponents(new Date());
    const dateOnly = local.localDate;
    const timeOnly = local.localTime;

    for (const key of changedKeys) {
      const oldVal = original[key];
      const newVal = proposal[key];
      const isLongText = key === "remarks" || key === "remarks_jv" || key === "object" || key === "cost_assumptions";

      auditRecords.push({
        id: `aud-${Date.now()}-${key}`,
        cerprno: proposal.cerprno,
        field_name: key as string,
        field_desc: AUDIT_FIELD_DESCRIPTIONS[key as string] || (key as string),
        old_value: oldVal !== undefined && oldVal !== null ? String(oldVal) : "",
        new_value: newVal !== undefined && newVal !== null ? String(newVal) : "",
        user_name: user.name || "System User",
        user_email: user.email || "",
        audit_date: dateOnly,
        audit_time: timeOnly,
        timestamp: now,
        is_long_text: isLongText,
      });
    }

    const isDraft = proposal.status === "Draft";

    let nextStatus = proposal.status;
    let nextLevel = 1;
    let nextRole = proposal.pending_with_role;
    let nextEmail = cleanProposal.pending_with_email;

    if (isDraft) {
      nextStatus = "Draft";
      nextLevel = original.current_level || 0;
      nextRole = "Draft";
      nextEmail = "";
    } else {
      // Re-triggering or launching workflow at Level 1 (Draft submit, Revised re-trigger, or Approved change)
      nextStatus = "In Approval";
      nextLevel = 1;
      const activeLevels = await this.getWorkflowLevels(cleanProposal.sbu);
      if (activeLevels.length === 0) {
        throw new Error(`No approval stages configured for SBU '${cleanProposal.sbu}'. Please configure workflow levels in Admin settings.`);
      }
      const activeL1 = activeLevels.find((l) => l.level_id === 1 && l.is_active) || activeLevels[0];
      const isL1PO = activeL1 ? isProjectOwnerStage(activeL1) : false;

      if (isL1PO && !isValidEmail(cleanProposal.owner_email)) {
        throw new Error(`Cannot route to Project Owner: Proposal Owner Email ('${cleanProposal.owner_email || ""}') is missing or invalid.`);
      }

      nextRole = activeL1 ? activeL1.role_title : "L1 Approver";
      nextEmail = isL1PO ? (cleanProposal.owner_email || "") : (activeL1 ? (activeL1.approver_email || "") : "");
    }

    // Preserve permanent CER Proposal ID: cannot be altered or overridden by client update
    const permanentId = original.cer_proposal_id || original.cerprno;
    const effectiveProposalNo = (cleanProposal.proposal_no || original.proposal_no || original.cerprno || "").trim();
    if (!effectiveProposalNo) {
      throw new Error("CER Proposal No is required.");
    }

    const todayDate = now.split("T")[0];
    let nextRequestDate = original.request_date || cleanProposal.request_date;

    if (!isDraft) {
      if (original.status === "Approved") {
        // Requirement: On Resubmit of 'Approved CER' update the request date with current date.
        nextRequestDate = todayDate;
      } else if (original.status === "Revised") {
        // Requirement: Do not update if editing 'Sendback CER'.
        nextRequestDate = original.request_date || cleanProposal.request_date;
      } else if (original.status === "Draft") {
        // Initial submission of a draft proposal
        nextRequestDate = todayDate;
      }
    }

    const updatedProposal: ICERProposal = {
      ...cleanProposal,
      proposal_no: effectiveProposalNo,
      cer_proposal_id: permanentId,
      cerprno: permanentId,
      status: nextStatus,
      current_level: nextLevel,
      pending_with_role: nextRole,
      pending_with_email: nextEmail,
      request_date: nextRequestDate,
      modified_date: now,
      modified_by: user.name,
      revision_count: (original.revision_count || 0) + 1,
    };

    // Find SharePoint Item ID in CERProposals
    let spItemId: number = 0;
    const candidateId = existing?.id || cleanProposal.id;
    const targetListName: string = SP_LISTS.CER_PROPOSALS;

    if (candidateId && /^\d+$/.test(candidateId)) {
      spItemId = parseInt(candidateId, 10);
    } else {
      let existingItems: Array<{ Id: number }> = [];
      const safeCerprno = escapeODataString(cleanProposal.cerprno);
      try {
        try {
          existingItems = await this._sp.getListItems<{ Id: number }>(targetListName, {
            filter: `cerPrId eq '${safeCerprno}' or proposalNo eq '${safeCerprno}' or Title eq '${safeCerprno}'`,
            select: "Id",
            top: 1,
          });
        } catch {
          const allItems = await this._sp.getListItems<any>(targetListName, {
            select: "Id,cerPrId,Title,proposalNo",
            top: 500,
          });
          existingItems = allItems.filter(
            (it: any) =>
              (it.cerPrId && it.cerPrId === cleanProposal.cerprno) ||
              (it.cerPrNo && it.cerPrNo === cleanProposal.cerprno) ||
              it.Title === cleanProposal.cerprno ||
              (it.proposalNo && it.proposalNo === cleanProposal.cerprno)
          );
        }
      } catch {
        // ignore
      }

      if (existingItems.length > 0) {
        spItemId = existingItems[0].Id;
      }
    }

    if (!spItemId) {
      throw new Error(`Cannot update proposal '${proposal.cerprno}': Proposal record was not found in SharePoint CERProposals list.`);
    }

    let ownerSpUserId: number | null = null;
    if (updatedProposal.owner_email || updatedProposal.owname) {
      try {
        const ensuredOwner = await PersonFieldService.resolveUser(
          this._spHttpClient,
          this._siteUrl,
          updatedProposal.owner_email || updatedProposal.owname
        );
        if (ensuredOwner && ensuredOwner.Id > 0) {
          ownerSpUserId = ensuredOwner.Id;
        }
      } catch (ensureErr) {
        console.warn("[SharePointCERDataService] ensureUser resolution warning for cerOwner on update:", ensureErr);
      }
    }

    const modernPayload: any = this._mapProposalToModernSharePointItem(updatedProposal);
    if (ownerSpUserId) {
      const ownerPayload = PersonFieldService.formatPersonFieldPayload("cerOwner", ownerSpUserId);
      Object.assign(modernPayload, ownerPayload);
    }

    // Post-Approval Archival: If previous status was Approved, archive snapshot into CERProposalsHistory
    const isApprovedOriginal = Boolean(
      (originalProposal && originalProposal.status === "Approved") ||
      (original && original.status === "Approved") ||
      (existing && existing.status === "Approved")
    );

    if (isApprovedOriginal) {
      const snapshotToArchive =
        (originalProposal && originalProposal.status === "Approved")
          ? originalProposal
          : (existing && existing.status === "Approved")
          ? existing
          : original;
      try {
        await this.archiveApprovedProposal(snapshotToArchive);
      } catch (archiveErr: any) {
        console.error("[SharePointCERDataService] Error archiving approved proposal snapshot to CERProposalsHistory:", archiveErr);
        throw new Error(
          `Unable to archive the previous approved proposal snapshot to CERProposalsHistory. (Details: ${archiveErr instanceof Error ? archiveErr.message : String(archiveErr)})`
        );
      }
    }

    // Primary write: Update proposal in CERProposals (ETag-aware conditional update)
    const proposalEtag = proposal.etag || original.etag;
    try {
      await this._executeWithFieldFallback(
        (payload) => this._sp.updateListItem(targetListName, spItemId, payload, proposalEtag),
        modernPayload
      );
    } catch (saveErr: any) {
      if (String(saveErr?.message || "").indexOf("Concurrency conflict") !== -1) {
        throw saveErr;
      }
      console.error("[SharePointCERDataService] Failed to update CER proposal in SharePoint:", saveErr);
      throw new Error(
        `Unable to save the CER to SharePoint. No successful save could be confirmed. Please verify the proposal before retrying. (Details: ${saveErr instanceof Error ? saveErr.message : String(saveErr)})`,
      );
    }

    // Secondary write: Write each delta row to CERAuditTrail
    for (const record of auditRecords) {
      try {
        await this._createAuditRecord(record);
      } catch (auditErr) {
        console.warn(`[SharePointCERDataService] Secondary audit write warning for ${record.field_name}:`, auditErr);
      }
    }

    // Secondary write: Write notification to CERNotifications
    try {
      if (nextStatus === "In Approval") {
        await this._createNotificationRecord(
          proposal.cerprno,
          [proposal.owner_email, nextEmail].filter(Boolean),
          `[CER Action Required] Proposal ${proposal.cerprno} Submitted for Approval`,
          `Proposal ${proposal.cerprno} (${proposal.pr_name}) has been submitted/re-triggered by ${user.name} and is awaiting Level 1 approval (${nextRole}).`,
          0,
        );
      } else {
        await this._createNotificationRecord(
          proposal.cerprno,
          [proposal.owner_email].filter(Boolean),
          `[CER Update] Proposal ${proposal.cerprno} - Revision ${updatedProposal.revision_count}`,
          `Proposal ${proposal.cerprno} has been revised by ${user.name} with ${auditRecords.length} updated fields.`,
          0,
        );
      }
    } catch (notifErr) {
      console.warn("[SharePointCERDataService] Secondary notification write warning:", notifErr);
    }

    this._cachedProposals = null;
    this._cachedProposalByNumber.delete(proposal.cerprno.toUpperCase());
    this._cachedSubmissionsByCerId.clear();

    return {
      success: true,
      message: isDraft
        ? "Proposal draft updated successfully"
        : "Proposal updated and workflow re-triggered successfully",
      proposal: updatedProposal,
      auditRowsCount: auditRecords.length,
    };
  }

  public async getHistoryListFields(): Promise<Array<{ InternalName: string; Title: string; TypeAsString: string; EntityPropertyName?: string }>> {
    if (this._cachedHistoryFields && this._cachedHistoryFields.length > 0) {
      return this._cachedHistoryFields;
    }
    try {
      const fields = await this._sp.getListFields<any>(SP_LISTS.CER_PROPOSALS_HISTORY, {
        filter: "Hidden eq false and ReadOnlyField eq false",
        select: "InternalName,Title,TypeAsString,EntityPropertyName",
      });
      if (fields && fields.length > 0) {
        this._cachedHistoryFields = fields;
        return fields;
      }
    } catch (err) {
      console.warn("[SharePointCERDataService] Querying fields for CERProposalsHistory returned warning:", err);
    }
    return [];
  }

  private _buildHistoryPayload(
    original: ICERProposal,
    ownerSpUserId: number | null,
    availableFields: Array<{ InternalName: string; Title: string; TypeAsString: string; EntityPropertyName?: string }>
  ): Record<string, any> {
    const cerId = (original.cer_proposal_id || original.cerprno || "").trim();
    const propNo = (original.proposal_no || original.cerprno || cerId).trim();

    const formatIsoDate = (val?: string) => {
      if (!val) return null;
      if (val.indexOf("T") !== -1) return val;
      return `${val}T00:00:00Z`;
    };

    const dataDict: Record<string, any> = {
      Title: propNo,
      cerPrId: cerId,
      proposalNo: propNo,
      prName: original.pr_name || "",
      cerOwner: ownerSpUserId || original.owname || original.owner_email || "",
      sbu: original.sbu || "RJ North",
      status: "Approved",
      object: original.object || "",
      amount: Number(original.amount || 0),
      currency: original.currency || "USD",
      category: original.cat || "Vital",
      payable: original.payable || "Payback",
      period: original.period || "",
      paybackQuarters: original.payback_quarters ? Number(original.payback_quarters) : null,
      benefitNpv: original.ben_npv !== undefined && original.ben_npv !== null ? Number(original.ben_npv) : null,
      benefitIrr: original.ben_irr !== undefined && original.ben_irr !== null ? Number(original.ben_irr) : null,
      costAssumptions: original.cost_assumptions || "",
      startDate: formatIsoDate(original.st_date),
      completionDate: formatIsoDate(original.com_date),
      durationMonths: original.duration_months ? Number(original.duration_months) : null,
      currentBudgeted: original.cbudget || "Yes",
      currentBudgetAmount: original.cb_amnt ? Number(original.cb_amnt) : null,
      currentBudgetCurrency: original.cb_currency || undefined,
      unbudgetedReason: original.reason || "",
      jointVenture: original.jv || "No",
      jvRecoverable: original.jv_recoverable || "No",
      jvCost: original.jv_cost ? Number(original.jv_cost) : null,
      jvBudgeted: original.jv_budget || "No",
      jvAmount: original.jv_amnt ? Number(original.jv_amnt) : null,
      jvReason: original.jv_reason || "",
      phTillLabel: original.ph_till_label || "",
      phFyLabel: original.ph_fy_label || "",
      phBeyondLabel: original.ph_beyond_label || "",
      prodTill: Number(original.prod_till || 0),
      prodFy: Number(original.prod_fy || 0),
      prodBeyond: Number(original.prod_beyond || 0),
      capexTill: Number(original.capex_till || 0),
      capexFy: Number(original.capex_fy || 0),
      capexBeyond: Number(original.capex_beyond || 0),
      opexTill: Number(original.opex_till || 0),
      opexFy: Number(original.opex_fy || 0),
      opexBeyond: Number(original.opex_beyond || 0),
      engineeringCost: Number(original.engineer || 0),
      surfaceFacilitiesCost: Number(original.s_fac || 0),
      commissioningCost: Number(original.comis || 0),
      preoperativeCost: Number(original.preop || 0),
      otherCosts: Number(original.others || 0),
      total: Number(original.total || 0),
      remarks: original.remarks || "",
      remarksJv: original.remarks_jv || "",
      currentLevel: Number(original.current_level || 6),
      pendingWithRole: original.pending_with_role || "Approved",
      pendingWithEmail: original.pending_with_email || "",
      RequestDate: formatIsoDate(original.request_date),
      revisionCount: Number(original.revision_count || 0),
    };

    const payload: Record<string, any> = {};

    if (availableFields && availableFields.length > 0) {
      for (const field of availableFields) {
        const intName = field.InternalName;
        const dispName = field.Title || "";
        const entityProp = field.EntityPropertyName || "";
        const type = (field.TypeAsString || "").toLowerCase();

        let matchedKey: string | undefined;
        for (const key of Object.keys(dataDict)) {
          if (
            key.toLowerCase() === intName.toLowerCase() ||
            key.toLowerCase() === dispName.toLowerCase() ||
            key.toLowerCase() === entityProp.toLowerCase() ||
            key.replace(/[^a-z0-9]/gi, "").toLowerCase() === intName.replace(/[^a-z0-9]/gi, "").toLowerCase() ||
            key.replace(/[^a-z0-9]/gi, "").toLowerCase() === dispName.replace(/[^a-z0-9]/gi, "").toLowerCase()
          ) {
            matchedKey = key;
            break;
          }
        }

        if (matchedKey !== undefined) {
          const rawVal = dataDict[matchedKey];
          if (matchedKey === "cerOwner") {
            if (type.indexOf("user") !== -1 || type.indexOf("person") !== -1) {
              if (ownerSpUserId) {
                payload[`${intName}Id`] = ownerSpUserId;
              }
            } else {
              payload[intName] = original.owname || original.owner_email || "";
            }
          } else if (type.indexOf("number") !== -1 || type.indexOf("currency") !== -1) {
            payload[intName] = rawVal !== null && rawVal !== undefined && !isNaN(Number(rawVal)) ? Number(rawVal) : null;
          } else if (type.indexOf("date") !== -1) {
            payload[intName] = rawVal || null;
          } else if (type.indexOf("note") !== -1 || type.indexOf("text") !== -1 || type.indexOf("choice") !== -1) {
            payload[intName] = rawVal !== null && rawVal !== undefined ? String(rawVal) : "";
          } else {
            payload[intName] = rawVal;
          }
        }
      }
    } else {
      Object.assign(payload, dataDict);
      if (ownerSpUserId) {
        payload.cerOwnerId = ownerSpUserId;
      }
      delete payload.cerOwner;
    }

    payload.Title = propNo;
    if (!payload.cerPrId && !payload.CERProposalID) payload.cerPrId = cerId;
    if (!payload.proposalNo && !payload.ProposalNo) payload.proposalNo = propNo;
    if (!payload.status && !payload.Status) payload.status = "Approved";

    return payload;
  }

  public async getProposalHistory(cerProposalId?: string): Promise<ICERProposal[]> {
    const cleanId = (cerProposalId || "").trim();
    const safeCleanId = escapeODataString(cleanId);
    const baseNo = safeCleanId.replace(/-R\d+$/i, "");
    const filterClause =
      cleanId && cleanId.toUpperCase() !== "ALL"
        ? `cerPrId eq '${safeCleanId}' or proposalNo eq '${safeCleanId}' or Title eq '${safeCleanId}' or proposalNo eq '${baseNo}' or Title eq '${baseNo}'`
        : undefined;

    try {
      let items: any[] = [];
      const queryOptions: any = {
        orderby: "Modified desc",
        expand: "cerOwner,Author,Editor",
        select: "*,cerOwner/Id,cerOwner/Title,cerOwner/EMail,cerOwner/Name,Author/Id,Author/Title,Author/EMail,Editor/Id,Editor/Title,Editor/EMail",
        top: 100,
      };
      if (filterClause) {
        queryOptions.filter = filterClause;
      }

      try {
        items = await this._sp.getListItems(SP_LISTS.CER_PROPOSALS_HISTORY, queryOptions);
      } catch {
        try {
          const fallbackOptions: any = {
            orderby: "Modified desc",
            expand: "cerOwner",
            select: "*,cerOwner/Id,cerOwner/Title,cerOwner/EMail,cerOwner/Name",
            top: 100,
          };
          if (filterClause) fallbackOptions.filter = filterClause;
          items = await this._sp.getListItems(SP_LISTS.CER_PROPOSALS_HISTORY, fallbackOptions);
        } catch {
          const basicOptions: any = {
            orderby: "Id desc",
            top: 100,
          };
          if (filterClause) basicOptions.filter = filterClause;
          items = await this._sp.getListItems(SP_LISTS.CER_PROPOSALS_HISTORY, basicOptions);
        }
      }

      // If strict filter returned 0, try Title eq fallback
      if (items.length === 0 && cleanId && cleanId.toUpperCase() !== "ALL") {
        try {
          items = await this._sp.getListItems(SP_LISTS.CER_PROPOSALS_HISTORY, {
            filter: `Title eq '${safeCleanId}' or Title eq '${baseNo}'`,
            top: 100,
          });
        } catch {
          // ignore
        }
      }

      return items.map((it) => {
        const p = this._mapSharePointItemToProposal(it);
        if ((!p.cer_proposal_id || p.cer_proposal_id === p.proposal_no) && cleanId && cleanId.startsWith("CER-")) {
          p.cer_proposal_id = cleanId;
          p.cerprno = cleanId;
        }
        return p;
      });
    } catch (err) {
      console.warn(`[SharePointCERDataService] Failed to fetch proposal history for ${cerProposalId}:`, err);
      return [];
    }
  }

  /**
   * Archives an approved proposal snapshot into CERProposalsHistory.
   * Discovers exact column schema from SharePoint, deduplicates by proposal number,
   * updates any existing row and purges duplicates.
   */
  public async archiveApprovedProposal(original: ICERProposal): Promise<void> {
    const cerId = (original.cer_proposal_id || original.cerprno || "").trim();
    const propNo = (original.proposal_no || original.cerprno || cerId).trim();

    let ownerSpUserId: number | null = null;
    if (original.owner_email || original.owname) {
      try {
        const ensuredOwner = await PersonFieldService.resolveUser(
          this._spHttpClient,
          this._siteUrl,
          original.owner_email || original.owname
        );
        if (ensuredOwner && ensuredOwner.Id > 0) {
          ownerSpUserId = ensuredOwner.Id;
        }
      } catch (ensureErr) {
        console.warn("[SharePointCERDataService] ensureUser resolution warning for cerOwner on history archive:", ensureErr);
      }
    }

    // 1. Discover list fields for CERProposalsHistory
    const discoveredFields = await this.getHistoryListFields();
    const payload = this._buildHistoryPayload(original, ownerSpUserId, discoveredFields);

    // 2. Check for existing items with this proposal number to prevent duplicate rows
    let existingItems: Array<{ Id: number }> = [];
    const safePropNo = escapeODataString(propNo);
    try {
      existingItems = await this._sp.getListItems<{ Id: number }>(SP_LISTS.CER_PROPOSALS_HISTORY, {
        filter: `Title eq '${safePropNo}' or proposalNo eq '${safePropNo}'`,
        select: "Id",
        top: 10,
      });
    } catch {
      try {
        existingItems = await this._sp.getListItems<{ Id: number }>(SP_LISTS.CER_PROPOSALS_HISTORY, {
          filter: `Title eq '${safePropNo}'`,
          select: "Id",
          top: 10,
        });
      } catch {
        existingItems = [];
      }
    }

    if (existingItems && existingItems.length > 0) {
      // Update existing item instead of creating duplicate
      const primaryId = existingItems[0].Id;
      await this._executeWithFieldFallback(
        (p) => this._sp.updateListItem(SP_LISTS.CER_PROPOSALS_HISTORY, primaryId, p),
        payload,
        5
      );

      // Clean up any extraneous duplicate rows
      if (existingItems.length > 1) {
        for (let i = 1; i < existingItems.length; i++) {
          try {
            await this._sp.deleteListItem(SP_LISTS.CER_PROPOSALS_HISTORY, existingItems[i].Id);
          } catch (delErr) {
            console.warn("[SharePointCERDataService] Could not remove duplicate history item:", delErr);
          }
        }
      }

      this._cachedSubmissionsByCerId.clear();
      return;
    }

    // 3. Create new history item if not already existing
    await this._executeWithFieldFallback(
      (p) => this._sp.createListItem(SP_LISTS.CER_PROPOSALS_HISTORY, p),
      payload,
      5
    );
    this._cachedSubmissionsByCerId.clear();
  }

  public async getAllSubmissionsForCER(cerProposalId: string): Promise<{ active: ICERProposal | null; history: ICERProposal[] }> {
    const cleanId = (cerProposalId || "").trim();
    if (!cleanId) return { active: null, history: [] };

    const cacheKey = cleanId.toUpperCase();
    const now = Date.now();
    const CACHE_TTL_MS = 15000;

    const cached = this._cachedSubmissionsByCerId.get(cacheKey);
    if (cached && now - cached.timestamp < CACHE_TTL_MS) {
      return {
        active: cached.data.active ? { ...cached.data.active } : null,
        history: cached.data.history.map((h) => ({ ...h })),
      };
    }

    const active = await this.getProposalByNumber(cleanId);
    const parentCerId = active?.cer_proposal_id || active?.cerprno || cleanId;
    let history = await this.getProposalHistory(parentCerId);

    // If history query by parentCerId returned nothing, but active has a proposal_no (e.g. PR-2026/01-R1):
    // Also try querying history by base proposal number (e.g. PR-2026/01)
    if (history.length === 0 && active?.proposal_no) {
      const baseNo = active.proposal_no.replace(/-R\d+$/i, "").trim();
      if (baseNo && baseNo !== active.proposal_no) {
        history = await this.getProposalHistory(baseNo);
      }
    }

    // Auto-heal existing blank rows in CERProposalsHistory:
    // If historical items exist but lack pr_name or sbu, re-archive the snapshot so columns become populated
    if (history.length > 0 && active) {
      const needsHealing = history.some((h) => !h.pr_name || !h.sbu);
      if (needsHealing) {
        for (const h of history) {
          if (!h.pr_name || !h.sbu) {
            const healed: ICERProposal = {
              ...active,
              ...h,
              cer_proposal_id: parentCerId,
              cerprno: parentCerId,
              proposal_no: h.proposal_no || h.cerprno || (active.proposal_no ? active.proposal_no.replace(/-R\d+$/i, "") : parentCerId),
              status: "Approved",
              current_level: 6,
            };
            void this.archiveApprovedProposal(healed);
          }
        }
      }
    }

    // Deduplicate history items in memory by proposal_no
    const seenPropNos = new Set<string>();
    const deduplicatedHistory: ICERProposal[] = [];
    for (const h of history) {
      const pKey = (h.proposal_no || h.cerprno || "").toUpperCase();
      if (pKey && !seenPropNos.has(pKey)) {
        seenPropNos.add(pKey);
        deduplicatedHistory.push(h);
      }
    }
    history = deduplicatedHistory;

    // Self-healing / Backfill:
    // If history in CERProposalsHistory is currently empty, but the active proposal is a post-approval
    // revision (e.g. proposal_no has -R1 or revision_count > 0):
    if (history.length === 0 && active) {
      const activePropNo = (active.proposal_no || active.cerprno || "").trim();
      const isPostApprovalRevision =
        Boolean(activePropNo && /-R\d+$/i.test(activePropNo)) ||
        Number(active.revision_count || 0) > 0;

      if (isPostApprovalRevision) {
        const prevNo = activePropNo.replace(/-R\d+$/i, "");
        if (prevNo !== activePropNo) {
          // Reconstruct previous approved version
          let prevAmount = active.amount;
          try {
            const audits = await this.getAuditTrail(parentCerId);
            const amountAudit = audits.find((a) => a.field_name === "amount" && a.old_value);
            if (amountAudit && amountAudit.old_value) {
              prevAmount = Number(amountAudit.old_value) || active.amount;
            }
          } catch {
            // non-blocking
          }

          const reconstructedApproved: ICERProposal = {
            ...active,
            proposal_no: prevNo,
            cerprno: parentCerId,
            cer_proposal_id: parentCerId,
            status: "Approved",
            amount: prevAmount,
            current_level: 6,
          };

          try {
            await this.archiveApprovedProposal(reconstructedApproved);
            history = [reconstructedApproved];
          } catch (backfillErr) {
            console.warn("[SharePointCERDataService] Backfill archival error:", backfillErr);
            history = [reconstructedApproved];
          }
        }
      }
    }

    const result = { active, history };
    this._cachedSubmissionsByCerId.set(cacheKey, { data: result, timestamp: now });
    if (active?.cer_proposal_id) {
      this._cachedSubmissionsByCerId.set(active.cer_proposal_id.trim().toUpperCase(), { data: result, timestamp: now });
    }
    if (active?.cerprno) {
      this._cachedSubmissionsByCerId.set(active.cerprno.trim().toUpperCase(), { data: result, timestamp: now });
    }
    if (active?.proposal_no) {
      this._cachedSubmissionsByCerId.set(active.proposal_no.trim().toUpperCase(), { data: result, timestamp: now });
    }

    return result;
  }

  // ---------------------------------------------------------------------------
  // 2. CERAuditTrail Operations
  // ---------------------------------------------------------------------------

  public async getAuditTrail(cerprno?: string): Promise<ICERAuditRecord[]> {
    const candidateLists = [SP_LISTS.CER_AUDIT_TRAIL];
    let lastErr: any = null;

    for (const listName of candidateLists) {
      try {
        let items: Record<string, any>[] = [];
        const fetchItems = typeof this._sp.getAllListItems === "function"
          ? (opts: any) => this._sp.getAllListItems(listName, opts)
          : (opts: any) => this._sp.getListItems(listName, opts);

        if (cerprno) {
          try {
            items = await fetchItems({
              filter: `cerPrId eq '${cerprno}' or Title eq '${cerprno}'`,
              top: 500,
              orderby: "Created desc",
            });
          } catch {
            const allItems = await fetchItems({
              top: 500,
              orderby: "Created desc",
            });
            items = allItems.filter((it: any) => (it.cerPrId && it.cerPrId === cerprno) || (it.cerPrNo && it.cerPrNo === cerprno) || it.Title === cerprno);
          }
        } else {
          items = await fetchItems({
            top: 2000,
            orderby: "Created desc",
          });
        }

        return items.map((item) => {
          const rawTimestamp = item.timestamp || item.Created;
          const auditDate = formatLocalDate(rawTimestamp) || item.audit_date || (rawTimestamp ? String(rawTimestamp).split("T")[0] : "");
          const auditTime = formatLocalTime(rawTimestamp) || item.audit_time || "";
          return {
            id: String(item.Id || item.id),
            cerprno: item.cerPrId || item.cerPrNo || item.cerprno || item.Title || "",
            field_name: item.fieldName || item.field_name || "",
            field_desc: item.fieldName || item.field_desc || AUDIT_FIELD_DESCRIPTIONS[item.fieldName || item.field_name] || item.fieldName || item.field_name,
            old_value: item.oldValue || item.old_value || "",
            new_value: item.newValue || item.new_value || "",
            user_name: item.userName || item.user_name || "",
            user_email: item.userEmail || item.user_email || "",
            audit_date: auditDate,
            audit_time: auditTime,
            timestamp: rawTimestamp || new Date().toISOString(),
            is_long_text: !!item.is_long_text,
            action_type: item.actionType || item.action_type || "UPDATE",
          };
        });
      } catch (err) {
        lastErr = err;
      }
    }

    if (lastErr && (String(lastErr?.message || lastErr).indexOf("404") !== -1 || String(lastErr?.message || lastErr).indexOf("does not exist") !== -1)) {
      console.warn("[SharePointCERDataService] CERAuditTrail list not found on site, defaulting to empty audit log:", lastErr);
      return [];
    }

    console.error("[SharePointCERDataService] Error querying CERAuditTrail from SharePoint:", lastErr);
    throw new Error(
      `Unable to load audit trail from SharePoint: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
    );
  }

  private async _createAuditRecord(record: ICERAuditRecord): Promise<void> {
    const candidateLists = [SP_LISTS.CER_AUDIT_TRAIL];
    const modernPayload: any = {
      Title: record.cerprno,
      cerPrId: record.cerprno,
      fieldName: record.field_name,
      oldValue: record.old_value,
      newValue: record.new_value,
      userName: record.user_name,
      userEmail: record.user_email,
      actionType: record.action_type || "UPDATE",
      timestamp: record.timestamp,
    };
    const legacyPayload = {
      Title: record.cerprno,
      cerPrId: record.cerprno,
      field_name: record.field_name,
      field_desc: record.field_desc,
      old_value: record.old_value,
      new_value: record.new_value,
      user_name: record.user_name,
      user_email: record.user_email,
      audit_date: record.audit_date,
      audit_time: record.audit_time,
      timestamp: record.timestamp,
      is_long_text: record.is_long_text,
    };

    for (const listName of candidateLists) {
      try {
        try {
          await this._sp.createListItem(listName, modernPayload);
          return;
        } catch {
          await this._sp.createListItem(listName, legacyPayload);
          return;
        }
      } catch (e) {
        // try next
      }
    }
  }

  // ---------------------------------------------------------------------------
  // 3. CERRemarksHistory Operations
  // ---------------------------------------------------------------------------

  public async getRemarksHistory(_cerprno: string): Promise<ICERRemarksVersion[]> {
    // Feature removed per user request: CERRemarksHistory list removed from SharePoint schema
    return [];
  }

  private async _createRemarksRecord(
    _cerprno: string,
    _version: number,
    _remarksText: string,
    _createdBy: string,
  ): Promise<void> {
    // Feature removed per user request: CERRemarksHistory list removed from SharePoint schema
    return;
  }

  // ---------------------------------------------------------------------------
  // 4. Fixed Six-Level Workflow Operations (CERRoleMatrix Approver Resolution)
  // ---------------------------------------------------------------------------

  public async getWorkflowLevels(sbu?: string, forceRefresh = false): Promise<IWorkflowLevel[]> {
    const cacheKey = sbu ? sbu.trim().toLowerCase() : "ALL";
    const now = Date.now();
    const CACHE_TTL_MS = 30000;

    const cached = this._cachedWorkflowLevels.get(cacheKey);
    if (!forceRefresh && cached && (now - cached.timestamp < CACHE_TTL_MS)) {
      return [...cached.data];
    }

    const inFlight = this._inFlightWorkflowLevels.get(cacheKey);
    if (!forceRefresh && inFlight) {
      const res = await inFlight;
      return [...res];
    }

    const fetchPromise = (async () => {
      try {
        // Fetch user roles to dynamically resolve approvers from CERRoleMatrix
        let approverRoles: IUserRoleAssignment[] = [];
        try {
          approverRoles = await this.getUserRoles(forceRefresh);
        } catch (e) {
          console.warn("[SharePointCERDataService] Failed to load roles for workflow levels:", e);
        }

        const targetSbu = sbu ? sbu.trim() : "";

        // Fixed Six-Level Sequential Approval Workflow:
        // L1: Finance (from CERRoleMatrix matching proposal SBU)
        // L2: Project Owner (Auto-fetched dynamically from CER Proposal)
        // L3: BU CFO (from CERRoleMatrix matching proposal SBU)
        // L4: BU Director (from CERRoleMatrix matching proposal SBU)
        // L5: VOGL CFO (from CERRoleMatrix matching proposal SBU / All)
        // L6: VOGL CEO (from CERRoleMatrix matching proposal SBU / All)
        const levels: IWorkflowLevel[] = FIXED_6_LEVEL_APPROVAL_STAGES.map((stage) => {
          const lid = stage.level;
          const isPO = stage.isProjectOwnerStage;

          let matchedUser: IUserRoleAssignment | undefined;
          if (!isPO) {
            // 1. Try exact SBU match for Approver at this level
            if (targetSbu) {
              matchedUser = approverRoles.find(
                (u) =>
                  u.is_active !== false &&
                  u.role === "Approver" &&
                  u.approval_level === lid &&
                  Boolean(u.sbu && u.sbu.toLowerCase() === targetSbu.toLowerCase())
              );
            }

            // 2. Try 'All' SBU assignment for Approver at this level
            if (!matchedUser) {
              matchedUser = approverRoles.find(
                (u) =>
                  u.is_active !== false &&
                  u.role === "Approver" &&
                  u.approval_level === lid &&
                  Boolean(u.sbu && u.sbu.toLowerCase() === "all")
              );
            }

            // 3. Fallback to any active Approver matching this level
            if (!matchedUser) {
              matchedUser = approverRoles.find(
                (u) =>
                  u.is_active !== false &&
                  u.role === "Approver" &&
                  u.approval_level === lid
              );
            }
          }

          return {
            id: `L${lid}-${targetSbu || "ALL"}`,
            level_id: lid,
            level_name: stage.name,
            role_title: stage.roleTitle,
            sbu: targetSbu || "All",
            is_active: true,
            assignment_type: stage.assignmentType,
            is_project_owner_stage: isPO,
            approver_name: isPO
              ? "Project Owner (Auto-fetched from CER Proposal)"
              : matchedUser
              ? matchedUser.user_name
              : "",
            approver_email: isPO
              ? ""
              : matchedUser
              ? matchedUser.user_email
              : "",
            created_by: matchedUser ? matchedUser.assigned_by : "System",
            created_date: matchedUser ? matchedUser.assigned_date : "",
          };
        });

        this._cachedWorkflowLevels.set(cacheKey, { data: levels, timestamp: Date.now() });
        return levels;
      } finally {
        this._inFlightWorkflowLevels.delete(cacheKey);
      }
    })();

    this._inFlightWorkflowLevels.set(cacheKey, fetchPromise);
    const result = await fetchPromise;
    return [...result];
  }

  public async saveWorkflowLevels(levels: IWorkflowLevel[]): Promise<void> {
    this.clearCache();
    // CERWorkflowLevels list has been retired and deleted from SharePoint.
    // The application strictly uses the hardcoded fixed 6-level sequential workflow, resolving approvers from CERRoleMatrix.
    return Promise.resolve();
  }

  // ---------------------------------------------------------------------------
  // 5. CERApprovalDecisions Operations
  // ---------------------------------------------------------------------------

  public async getApprovalDecisions(cerprno: string, forceRefresh: boolean = false): Promise<IApprovalDecision[]> {
    const key = (cerprno || "").trim().toUpperCase();
    const now = Date.now();
    const CACHE_TTL_MS = 25000;

    const cached = this._cachedApprovalDecisions.get(key);
    if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data.map((d) => ({ ...d }));
    }

    const inFlight = this._inFlightApprovalDecisions.get(key);
    if (!forceRefresh && inFlight) {
      const res = await inFlight;
      return res.map((d) => ({ ...d }));
    }

    const fetchPromise = (async () => {
      const candidateLists = [SP_LISTS.CER_APPROVAL_DECISIONS];
      let lastErr: any = null;

      for (const listName of candidateLists) {
        try {
          let items: Record<string, any>[] = [];
          // Tier 1: Modern schema with linking column cerPrId, Author & approver Person fields expanded
          try {
            items = await this._sp.getListItems<Record<string, any>>(listName, {
              filter: `cerPrId eq '${cerprno}' or Title eq '${cerprno}'`,
              select: "Id,Title,cerPrId,levelId,decision,remarks,decidedAt,Created,Author/Id,Author/Title,Author/EMail,approver/Id,approver/Title,approver/EMail",
              expand: "Author,approver",
              top: 100,
              orderby: "Created desc",
            });
          } catch {
            // Tier 2: Query by linking column cerPrId with Author expanded (built-in SharePoint field)
            try {
              items = await this._sp.getListItems<Record<string, any>>(listName, {
                filter: `cerPrId eq '${cerprno}' or Title eq '${cerprno}'`,
                select: "Id,Title,cerPrId,levelId,decision,remarks,decidedAt,Created,Author/Id,Author/Title,Author/EMail",
                expand: "Author",
                top: 100,
                orderby: "Created desc",
              });
            } catch {
              // Tier 3: Fetch recent list items and match by cerPrId/Title in memory with Author expanded
              try {
                const allItems = await this._sp.getListItems<Record<string, any>>(listName, {
                  select: "Id,Title,cerPrId,levelId,decision,remarks,decidedAt,Created,Author/Id,Author/Title,Author/EMail",
                  expand: "Author",
                  top: 100,
                  orderby: "Created desc",
                });
                items = allItems.filter(
                  (it: any) => (it.cerPrId && it.cerPrId === cerprno) || (it.cerPrNo && it.cerPrNo === cerprno) || it.Title === cerprno
                );
              } catch {
                try {
                  const allItems = await this._sp.getListItems<Record<string, any>>(listName, {
                    top: 100,
                    orderby: "Created desc",
                  });
                  items = allItems.filter(
                    (it: any) => (it.cerPrId && it.cerPrId === cerprno) || (it.cerPrNo && it.cerPrNo === cerprno) || it.Title === cerprno
                  );
                } catch {
                  items = [];
                }
              }
            }
          }

          const mapped = items.map((item) => {
            const approverPerson =
              PersonFieldService.extractPersonField(item, "approver") ||
              PersonFieldService.extractPersonField(item, "Author");

            const approverName =
              approverPerson?.name ||
              item.approver_name ||
              item.approverName ||
              (typeof item.approver === "string" ? item.approver : "") ||
              "";

            const approverEmail =
              approverPerson?.email ||
              item.approver_email ||
              item.approverEmail ||
              "";
            const levelId = Number(item.levelId ?? item.level_id ?? 1);

            return {
              id: String(item.Id || item.id),
              cerprno: item.cerPrId || item.cerPrNo || item.cerprno || item.Title,
              level_id: levelId,
              level_name: item.level_name || `Level ${levelId}`,
              approver_name: approverName,
              approver_email: approverEmail,
              decision: (item.decision ? String(item.decision).toUpperCase() : "APPROVED") as "APPROVED" | "REJECTED",
              comments: item.remarks || item.comments || "",
              decision_date: item.decidedAt || item.decision_date || item.Created || new Date().toISOString(),
              timestamp: item.decidedAt || item.decision_date || item.Created || new Date().toISOString(),
            };
          });

          this._cachedApprovalDecisions.set(key, { data: mapped, timestamp: Date.now() });
          return mapped;
        } catch (e) {
          lastErr = e;
        }
      }

      if (lastErr && (String(lastErr?.message || lastErr).indexOf("404") !== -1 || String(lastErr?.message || lastErr).indexOf("does not exist") !== -1)) {
        console.warn("[SharePointCERDataService] CERApprovalDecisions list not found on site, defaulting to empty decisions list:", lastErr);
        return [];
      }

      console.error("[SharePointCERDataService] Error querying CERApprovalDecisions from SharePoint:", lastErr);
      throw new Error(`Unable to load approval decisions from SharePoint: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
    })();

    this._inFlightApprovalDecisions.set(key, fetchPromise);
    try {
      const res = await fetchPromise;
      return res.map((d) => ({ ...d }));
    } finally {
      this._inFlightApprovalDecisions.delete(key);
    }
  }

  public async recordDecision(params: {
    cerprno: string;
    level_id: number;
    approver_name: string;
    approver_email: string;
    decision: "APPROVED" | "REJECTED" | "SENT_BACK";
    comments: string;
  }): Promise<{ success: boolean; newStatus: string; nextLevel: number }> {
    const now = new Date().toISOString();

    // Enterprise RBAC: Segregation of Duties - Initiator/Owner CANNOT approve their own CER
    const existingProposal = await this.getProposalByNumber(params.cerprno);
    if (!existingProposal) {
      throw new Error(`Cannot record decision: Proposal '${params.cerprno}' not found in SharePoint CERProposals list.`);
    }

    if (existingProposal.status !== "In Approval") {
      throw new Error(
        `Cannot record decision: Proposal '${params.cerprno}' is currently in '${existingProposal.status}' status, not 'In Approval'.`
      );
    }

    if (existingProposal.current_level !== params.level_id) {
      throw new Error(
        `Cannot record decision: Proposal '${params.cerprno}' is at approval Level ${existingProposal.current_level}, but decision was submitted for Level ${params.level_id}. Please refresh the proposal to review its current status.`
      );
    }

    const proposalSBU = existingProposal.sbu || "RJ North";
    const workflowLevels = await this.getWorkflowLevels(proposalSBU);
    const activeLevels = workflowLevels
      .filter((l) => l.is_active)
      .sort((a, b) => a.level_id - b.level_id);

    const currentLevelConfig = activeLevels.find((l) => l.level_id === params.level_id);
    const isCurrentPO = currentLevelConfig ? isProjectOwnerStage(currentLevelConfig) : false;

    const approverEmail = (params.approver_email || "").trim().toLowerCase();
    const ownerEmail = (existingProposal.owner_email || "").trim().toLowerCase();
    const isEmailMatch = approverEmail && ownerEmail && approverEmail === ownerEmail;

    const approverName = (params.approver_name || "").trim().toLowerCase();
    const ownerName = (existingProposal.owname || "").trim().toLowerCase();
    const isNameMatch = approverName && ownerName && approverName === ownerName;
    const isOwner = isEmailMatch || isNameMatch;

    const stageApproverEmail = (currentLevelConfig?.approver_email || "").trim().toLowerCase();
    const creator = (existingProposal.created_by || "").trim().toLowerCase();
    const isCreator = Boolean(creator && (creator === approverEmail || creator === approverName));

    if (isCurrentPO) {
      // Dynamic Project Owner stage: ONLY the designated Project Owner can approve
      if (!isOwner) {
        throw new Error(
          `Access Denied: Only the designated Project Owner (${existingProposal.owname || existingProposal.owner_email}) can approve this stage.`
        );
      }
    } else {
      // Non-Project Owner stage: Segregation of Duties strictly enforced
      if (isCreator) {
        throw new Error("Segregation of Duties Enforcement: You cannot approve a CER proposal that you initiated.");
      }

      if (isOwner) {
        let isApproverForLevel = false;
        try {
          const userRoles = await this.getUserRoles();
          isApproverForLevel = userRoles.some(
            (r) =>
              r.is_active &&
              r.role === "Approver" &&
              r.approval_level === params.level_id &&
              (r.user_email.toLowerCase() === approverEmail ||
                (r.login_name && r.login_name.toLowerCase() === approverEmail))
          );
        } catch {
          // non-blocking
        }

        const isAllowedDualOwnerApprover =
          Boolean(currentLevelConfig) &&
          isApproverForLevel &&
          (!stageApproverEmail || stageApproverEmail === approverEmail);

        if (!isAllowedDualOwnerApprover) {
          throw new Error("Segregation of Duties Enforcement: You cannot approve a CER proposal that you initiated or own on non-Project-Owner stages.");
        }
      }

      if (stageApproverEmail && stageApproverEmail !== approverEmail) {
        throw new Error(
          `Access Denied: This approval stage is assigned to designated approver (${stageApproverEmail}). Only the assigned approver can approve this level.`
        );
      }
    }

    // 1. Resolve SharePoint item ID (spId) and target proposal list
    let spId: number = 0;
    let targetProposalList: string = SP_LISTS.CER_PROPOSALS;

    if (existingProposal.id && /^\d+$/.test(existingProposal.id)) {
      spId = parseInt(existingProposal.id, 10);
    } else {
      const candidateProposalLists = [SP_LISTS.CER_PROPOSALS];
      for (const listName of candidateProposalLists) {
        try {
          let items: Array<{ Id: number }> = [];
          try {
            items = await this._sp.getListItems<{ Id: number }>(listName, {
              filter: `cerPrId eq '${params.cerprno}' or proposalNo eq '${params.cerprno}' or Title eq '${params.cerprno}'`,
              select: "Id",
              top: 1,
            });
          } catch {
            const allItems = await this._sp.getListItems<any>(listName, {
              select: "Id,cerPrId,Title,proposalNo",
              top: 500,
            });
            items = allItems.filter(
              (it: any) =>
                (it.cerPrId && it.cerPrId === params.cerprno) ||
                (it.cerPrNo && it.cerPrNo === params.cerprno) ||
                it.Title === params.cerprno ||
                (it.proposalNo && it.proposalNo === params.cerprno)
            );
          }
          if (items.length > 0) {
            spId = items[0].Id;
            targetProposalList = listName;
            break;
          }
        } catch {
          // continue to next candidate list
        }
      }
    }

    if (!spId) {
      throw new Error(`Cannot record decision: Proposal '${params.cerprno}' not found in SharePoint CERProposals list.`);
    }

    const creatorEmail = (existingProposal.owner_email || "").trim();

    // 2. Fetch prior approval decisions to obtain all previous approvers' emails
    let priorEmails: string[] = [];
    try {
      const priorDecisions = await this.getApprovalDecisions(params.cerprno);
      priorEmails = priorDecisions.map((d) => (d.approver_email || "").trim()).filter(Boolean);

      // Concurrency / Idempotency check: prevent duplicate submissions at the same level
      const recentDuplicate = priorDecisions.find((d) => {
        if (d.level_id !== params.level_id) return false;
        const decTime = new Date((d as any).decision_date || d.timestamp).getTime();
        return !isNaN(decTime) && Date.now() - decTime < 180000;
      });
      if (recentDuplicate) {
        throw new Error(
          `Duplicate submission detected: Approval decision for Level ${params.level_id} was already recorded moments ago by ${recentDuplicate.approver_name || recentDuplicate.approver_email}. Please refresh the proposal.`
        );
      }
    } catch (pErr: any) {
      if (String(pErr?.message || "").indexOf("Duplicate submission detected") !== -1) {
        throw pErr;
      }
      console.warn("[SharePointCERDataService] Failed to load prior approval decisions for notification recipients:", pErr);
    }

    // 3. Resolve approver user id for native Person field in CERApprovalDecisions
    let approverUserId: number | undefined;
    if (params.approver_email) {
      try {
        const ensured = await PersonFieldService.resolveUser(
          this._spHttpClient,
          this._siteUrl,
          params.approver_email
        );
        if (ensured && ensured.Id > 0) {
          approverUserId = ensured.Id;
        }
      } catch (ensureErr) {
        console.warn("[SharePointCERDataService] ensureUser resolution warning for approver:", ensureErr);
      }
    }

    // 4. Primary write 1: Post decision record to CERApprovalDecisions (with fallback)
    const modernDecisionPayload: Record<string, any> = {
      Title: params.cerprno,
      cerPrId: params.cerprno,
      levelId: params.level_id,
      decision: params.decision === "REJECTED" ? "Rejected" : params.decision === "SENT_BACK" ? "Sent Back" : "Approved",
      remarks: params.comments || "",
      decidedAt: now,
    };
    if (approverUserId) {
      Object.assign(
        modernDecisionPayload,
        PersonFieldService.formatPersonFieldPayload("approver", approverUserId)
      );
    }

    const legacyDecisionPayload: Record<string, any> = {
      Title: `${params.cerprno}-L${params.level_id}`,
      cerPrId: params.cerprno,
      level_id: params.level_id,
      level_name: `Level ${params.level_id}`,
      approver_name: params.approver_name,
      approver_email: params.approver_email,
      decision: params.decision === "SENT_BACK" ? "Sent Back" : params.decision,
      comments: params.comments || "",
      decision_date: now,
    };

    const candidateDecisionLists = [SP_LISTS.CER_APPROVAL_DECISIONS];
    let decisionRecorded = false;
    let decisionErr: any = null;

    for (const dList of candidateDecisionLists) {
      const decisionOptions = {
        isIdempotent: false,
        reconcileFn: async () => {
          try {
            const query = await this._sp.getListItems<any>(dList, {
              filter: `(cerPrId eq '${params.cerprno}' or Title eq '${params.cerprno}') and (levelId eq ${params.level_id} or level_id eq ${params.level_id})`,
              select: "Id,Title,cerPrId",
              top: 1,
            });
            return query && query.length > 0 ? { Id: query[0].Id } : null;
          } catch {
            return null;
          }
        },
      };

      try {
        try {
          await this._executeWithFieldFallback(
            (payload) => this._sp.createListItem(dList, payload, decisionOptions),
            modernDecisionPayload
          );
          decisionRecorded = true;
          break;
        } catch {
          await this._executeWithFieldFallback(
            (payload) => this._sp.createListItem(dList, payload, decisionOptions),
            legacyDecisionPayload
          );
          decisionRecorded = true;
          break;
        }
      } catch (err: any) {
        decisionErr = err;
      }
    }

    if (!decisionRecorded) {
      console.error("[SharePointCERDataService] Failed to record decision in CERApprovalDecisions:", decisionErr);
      throw new Error(
        `Unable to save approval decision to SharePoint. No successful save could be confirmed. Please verify the proposal before retrying. (Details: ${decisionErr instanceof Error ? decisionErr.message : String(decisionErr)})`
      );
    }

    // 5. Determine workflow outcome using SBU-routed sequential active levels
    const nextLevelConfig = activeLevels.find((l) => l.level_id > params.level_id);
    const isNextPO = nextLevelConfig ? isProjectOwnerStage(nextLevelConfig) : false;

    if (params.decision === "APPROVED" && nextLevelConfig && isNextPO) {
      if (!isValidEmail(existingProposal.owner_email)) {
        throw new Error(
          `Cannot route to next approval stage '${nextLevelConfig.level_name}': Project Owner Email ('${existingProposal.owner_email || ""}') is missing or invalid.`
        );
      }
    }
    let newStatus = "In Approval";
    let nextLevel = params.level_id;
    let nextRole = "";
    let nextEmail = "";

    if (params.decision === "REJECTED") {
      newStatus = "Rejected";
      nextRole = "Rejected";
      nextEmail = "";
    } else if (params.decision === "SENT_BACK") {
      newStatus = "Revised";
      nextLevel = 1;
      nextRole = "Initiator (Rework)";
      nextEmail = existingProposal.owner_email || creatorEmail;
    } else if (!nextLevelConfig) {
      newStatus = "Approved";
      nextLevel = activeLevels.length + 1;
      nextRole = "Approved";
      nextEmail = "";
    } else {
      newStatus = "In Approval";
      nextLevel = nextLevelConfig.level_id;
      nextRole = nextLevelConfig.role_title;
      nextEmail = isNextPO ? (existingProposal.owner_email || "") : (nextLevelConfig.approver_email || "");
    }

    // 6. Primary write 2: Update proposal item in CERProposals
    const modernUpdatePayload: Record<string, any> = {
      status: newStatus,
      currentLevel: nextLevel,
      pendingWithRole: nextRole,
      pendingWithEmail: nextEmail,
    };

    try {
      await this._executeWithFieldFallback(
        (payload) => this._sp.updateListItem(targetProposalList, spId, payload, existingProposal.etag),
        modernUpdatePayload
      );
    } catch (updateErr) {
      console.error("[SharePointCERDataService] Primary decision was recorded, but updating CERProposals status failed:", updateErr);
      throw new Error(
        `Approval decision was recorded, but updating proposal status failed in SharePoint. The decision has been logged (Level ${params.level_id}). Please do not re-submit your approval; contact your CER Administrator or refresh the proposal to reconcile. (Details: ${updateErr instanceof Error ? updateErr.message : String(updateErr)})`
      );
    }

    // 7. Gather attachments for email notification summary (secondary write)
    let attachmentsCount = 0;
    let attachmentsSummary = "No attachments included.";
    try {
      const atts = await this.getAttachments(params.cerprno);
      attachmentsCount = atts.length;
      if (atts.length > 0) {
        attachmentsSummary = `\n\nAttachments Included (${atts.length}):\n` +
          atts.map((a) => `• ${a.name} (${Math.round((a.size || 0) / 1024)} KB)`).join("\n");
      }
    } catch (attErr) {
      console.warn("Attachment summary warning:", attErr);
    }

    // 8. Deduplicate recipients: (1) Creator, (2) Previous Approvers, (3) Next Approver
    const rawRecipients = [creatorEmail, ...priorEmails, params.approver_email, nextEmail].filter(Boolean);
    const notificationRecipients = Array.from(new Set(rawRecipients.map((e) => e.trim().toLowerCase())));

    const subject = params.decision === "APPROVED"
      ? (newStatus === "Approved"
          ? `[CER Final Sanction] Proposal ${params.cerprno} Approved at Final Level ${params.level_id}`
          : `[CER Approved Level ${params.level_id}] Proposal ${params.cerprno} Advanced to Level ${nextLevel}`)
      : params.decision === "SENT_BACK"
      ? `[CER Revision Requested] Proposal ${params.cerprno} Sent Back to Initiator by Level ${params.level_id}`
      : `[CER Rejected] Proposal ${params.cerprno} Rejected at Level ${params.level_id}`;

    const bodyText = params.decision === "APPROVED"
      ? (newStatus === "Approved"
          ? `Proposal ${params.cerprno} has received final executive sanction by ${params.approver_name}. Decision: ${params.decision}. Comments: "${params.comments}".${attachmentsSummary}`
          : `Proposal ${params.cerprno} approved at Level ${params.level_id} by ${params.approver_name}. Comments: "${params.comments}". Proposal is now pending action from ${nextRole} (${nextEmail}).${attachmentsSummary}`)
      : params.decision === "SENT_BACK"
      ? `Proposal ${params.cerprno} was sent back to initiator for rework/revision by ${params.approver_name} at Level ${params.level_id}. Required changes / notes: "${params.comments}". The initiator can edit and resubmit to restart approval.${attachmentsSummary}`
      : `Proposal ${params.cerprno} was rejected at Level ${params.level_id} by ${params.approver_name}. Reason / Comments: "${params.comments}".`;

    try {
      await this._createNotificationRecord(
        params.cerprno,
        notificationRecipients,
        subject,
        bodyText,
        attachmentsCount
      );
    } catch (notifErr) {
      console.warn("[SharePointCERDataService] Secondary notification write warning:", notifErr);
    }

    this._cachedProposals = null;
    this._cachedProposalByNumber.delete(params.cerprno.toUpperCase());
    this._cachedApprovalDecisions.delete(params.cerprno.toUpperCase());
    this._cachedSubmissionsByCerId.clear();

    return {
      success: true,
      newStatus,
      nextLevel,
    };
  }

  // ---------------------------------------------------------------------------
  // 6. CERAttachments Operations (Document Library)
  // ---------------------------------------------------------------------------

  public async getAttachments(cerprno: string, forceRefresh: boolean = false): Promise<ICERAttachment[]> {
    const key = (cerprno || "").trim().toUpperCase();
    const now = Date.now();
    const CACHE_TTL_MS = 25000;

    const cached = this._cachedAttachments.get(key);
    if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data.map((a) => ({ ...a }));
    }

    const inFlight = this._inFlightAttachments.get(key);
    if (!forceRefresh && inFlight) {
      const res = await inFlight;
      return res.map((a) => ({ ...a }));
    }

    const fetchPromise = (async () => {
      const candidateLists = [SP_LISTS.CER_ATTACHMENTS];
      let lastErr: any = null;

      for (const libName of candidateLists) {
        try {
          let items: Record<string, any>[] = [];
          // Tier 1: Query by cerPrId with File and uploadedBy expanded
          try {
            items = await this._sp.getListItems<Record<string, any>>(libName, {
              filter: `cerPrId eq '${cerprno}'`,
              select: "Id,FileLeafRef,FileRef,cerPrId,category,uploadDate,Created,File/ServerRelativeUrl,File/Length,uploadedBy/Id,uploadedBy/Title,uploadedBy/EMail",
              expand: "File,uploadedBy",
              top: 100,
            });
          } catch (t1Err) {
            // Tier 2: Query by cerPrId with only File expanded
            try {
              items = await this._sp.getListItems<Record<string, any>>(libName, {
                filter: `cerPrId eq '${cerprno}'`,
                select: "Id,FileLeafRef,FileRef,cerPrId,category,uploadDate,Created,File/ServerRelativeUrl,File/Length",
                expand: "File",
                top: 100,
              });
            } catch (t2Err) {
              // Tier 3: Query without filter if column isn't indexed or configured, filter in memory
              try {
                items = await this._sp.getListItems<Record<string, any>>(libName, {
                  select: "Id,FileLeafRef,FileRef,Created,File/ServerRelativeUrl,File/Length",
                  expand: "File",
                  top: 200,
                });
                items = items.filter((it) => {
                  const leaf = String(it.FileLeafRef || "");
                  const cNo = String(it.cerPrId || it.cerPrNo || it.cerprno || "");
                  return cNo === cerprno || leaf.startsWith(cerprno) || leaf.indexOf(cerprno) !== -1;
                });
              } catch (t3Err) {
                // Tier 4: Minimal query fallback
                items = await this._sp.getListItems<Record<string, any>>(libName, {
                  top: 100,
                });
                items = items.filter((it) => {
                  const leaf = String(it.FileLeafRef || "");
                  const cNo = String(it.cerPrId || it.cerPrNo || it.cerprno || "");
                  return cNo === cerprno || leaf.startsWith(cerprno) || leaf.indexOf(cerprno) !== -1;
                });
              }
            }
          }

          const mapped = items.map((item) => {
            const uploaderPerson = PersonFieldService.extractPersonField(item, "uploadedBy") || PersonFieldService.extractPersonField(item, "Author");
            const uploaderName = uploaderPerson?.name || item.uploaded_by || (typeof item.uploadedBy === "string" ? item.uploadedBy : "") || "User";
            const uploadDate = item.uploadDate || item.Created || new Date().toISOString();
            const fileSize = Number(item.File?.Length || item.file_size || 0);

            return {
              id: String(item.Id || item.id),
              cerprno: item.cerPrId || item.cerPrNo || item.cerprno || cerprno,
              name: item.FileLeafRef || item.File?.Name || "document",
              size: fileSize,
              type: item.file_type || (item.FileLeafRef && item.FileLeafRef.endsWith(".pdf") ? "application/pdf" : "application/octet-stream"),
              data_url: item.File?.ServerRelativeUrl || item.FileRef || "",
              uploaded_by: uploaderName,
              uploaded_date: uploadDate,
            };
          });

          this._cachedAttachments.set(key, { data: mapped, timestamp: Date.now() });
          return mapped;
        } catch (e) {
          lastErr = e;
        }
      }

      if (lastErr && (String(lastErr?.message || lastErr).indexOf("404") !== -1 || String(lastErr?.message || lastErr).indexOf("does not exist") !== -1)) {
        console.warn(`[SharePointCERDataService] CERAttachments library not found on site for CER '${cerprno}', defaulting to empty list:`, lastErr);
        return [];
      }

      console.error("[SharePointCERDataService] Error querying CERAttachments from SharePoint:", lastErr);
      throw new Error(`Unable to load attachments for CER '${cerprno}' from SharePoint: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
    })();

    this._inFlightAttachments.set(key, fetchPromise);
    try {
      const res = await fetchPromise;
      return res.map((a) => ({ ...a }));
    } finally {
      this._inFlightAttachments.delete(key);
    }
  }

  public async addAttachment(attachment: ICERAttachment): Promise<void> {
    const rawName = (attachment.name || "document").trim();
    // Normalize file name: strip any legacy or previously generated proposal prefixes
    const cleanOriginalName = rawName.replace(/^CER-\d{4}-\d{4}_(?:\d+_)?/i, "");

    const existing = await this.getAttachments(attachment.cerprno);

    // Idempotency check: if this document (by original name) was already saved to this CER, skip re-uploading
    const alreadySaved = existing.some((a) => {
      const existingClean = (a.name || "").replace(/^CER-\d{4}-\d{4}_(?:\d+_)?/i, "");
      return (
        existingClean.toLowerCase() === cleanOriginalName.toLowerCase() ||
        (a.name || "").toLowerCase() === rawName.toLowerCase()
      );
    });

    if (alreadySaved) {
      console.log(`[SharePointCERDataService] Document '${cleanOriginalName}' is already saved to SharePoint for '${attachment.cerprno}'. Skipping duplicate upload.`);
      return;
    }

    const existingSize = existing.reduce((sum, a) => sum + (a.size || 0), 0);

    const validation = validateAttachment(
      attachment,
      existingSize,
      existing.map((a) => (a.name || "").replace(/^CER-\d{4}-\d{4}_(?:\d+_)?/i, ""))
    );
    if (!validation.isValid) {
      throw new Error(`[SharePoint Attachment Policy Violation] ${validation.error}`);
    }

    let uploadedById: number | undefined;
    if (attachment.uploaded_by) {
      try {
        const ensured = await PersonFieldService.resolveUser(
          this._spHttpClient,
          this._siteUrl,
          attachment.uploaded_by
        );
        if (ensured && ensured.Id > 0) {
          uploadedById = ensured.Id;
        }
      } catch (ensureErr) {
        console.warn("[SharePointCERDataService] ensureUser resolution warning for uploadedBy:", ensureErr);
      }
    }

    const modernMetadata: Record<string, any> = {
      cerPrId: attachment.cerprno,
      category: (attachment.type && attachment.type.indexOf("pdf") !== -1) ? "Technical" : "Other",
      uploadDate: new Date().toISOString(),
      ...(uploadedById ? PersonFieldService.formatPersonFieldPayload("uploadedBy", uploadedById) : {}),
    };

    const candidateLibraries = [SP_LISTS.CER_ATTACHMENTS];
    let uploaded = false;
    let lastErr: any = null;

    if (attachment.data_url && attachment.data_url.indexOf("data:") === 0) {
      const buffer = this._base64ToArrayBuffer(attachment.data_url);
      // Clean, deterministic filename: CER-YYYY-NNNN_originalFilename.ext
      // With overwrite=true on files/add, SharePoint updates in place and will NEVER duplicate the row.
      const fileName = `${attachment.cerprno}_${cleanOriginalName}`;

      for (const libName of candidateLibraries) {
        try {
          await this._sp.uploadFileToLibrary(libName, fileName, buffer, modernMetadata);
          uploaded = true;
          break;
        } catch (err: any) {
          lastErr = err;
        }
      }

      if (!uploaded) {
        console.error("[SharePointCERDataService] Failed to upload attachment to CERAttachments library:", lastErr);
        throw new Error(
          `Unable to save attachment '${attachment.name}' to SharePoint CERAttachments library: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`
        );
      }
      this._cachedAttachments.clear();
    }
  }

  public async deleteAttachment(id: string): Promise<void> {
    const candidateLibraries = [SP_LISTS.CER_ATTACHMENTS];
    let deleted = false;
    let lastErr: any = null;

    for (const libName of candidateLibraries) {
      try {
        if (/^\d+$/.test(id)) {
          await this._sp.deleteListItem(libName, id);
          deleted = true;
          this._cachedAttachments.clear();
          break;
        }
      } catch (err) {
        lastErr = err;
      }
    }

    if (!deleted && lastErr) {
      console.error("[SharePointCERDataService] Error deleting attachment from SharePoint:", lastErr);
      throw new Error(
        `Unable to delete attachment with ID '${id}' from SharePoint CERAttachments library: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`
      );
    }
  }

  public async getNotificationLogs(cerprno?: string, forceRefresh: boolean = false): Promise<INotificationLog[]> {
    const key = (cerprno || "ALL").trim().toUpperCase();
    const now = Date.now();
    const CACHE_TTL_MS = 25000;

    const cached = this._cachedNotificationLogs.get(key);
    if (!forceRefresh && cached && now - cached.timestamp < CACHE_TTL_MS) {
      return cached.data.map((l) => ({ ...l }));
    }

    const inFlight = this._inFlightNotificationLogs.get(key);
    if (!forceRefresh && inFlight) {
      const res = await inFlight;
      return res.map((l) => ({ ...l }));
    }

    const fetchPromise = (async () => {
      const candidateLists = [SP_LISTS.CER_NOTIFICATIONS];
      let lastErr: any = null;

      for (const listName of candidateLists) {
        try {
          let items: Record<string, any>[] = [];
          if (cerprno) {
            try {
              items = await this._sp.getListItems<Record<string, any>>(listName, {
                filter: `cerPrId eq '${cerprno}' or Title eq '${cerprno}'`,
                top: 100,
                orderby: "Created desc",
              });
            } catch {
              const allItems = await this._sp.getListItems<Record<string, any>>(listName, {
                top: 100,
                orderby: "Created desc",
              });
              items = allItems.filter((it: any) => (it.cerPrId && it.cerPrId === cerprno) || (it.cerPrNo && it.cerPrNo === cerprno) || it.Title === cerprno);
            }
          } else {
            items = await this._sp.getListItems<Record<string, any>>(listName, {
              top: 100,
              orderby: "Created desc",
            });
          }

          const result: INotificationLog[] = items.map((item) => ({
            id: String(item.Id || item.id),
            cerprno: item.cerPrId || item.cerPrNo || item.cerprno || item.Title,
            recipients: item.recipients ? item.recipients.split(";").map((s: string) => s.trim()) : [],
            subject: item.subject || "",
            body: item.bodyPreview || item.body || "",
            attachments_count: Number(item.attachments_count || 0),
            timestamp: item.Created || item.dispatch_timestamp || item.timestamp || new Date().toISOString(),
            status: (item.status as "SENT" | "PENDING" | "FAILED") || "SENT",
          }));

          this._cachedNotificationLogs.set(key, { data: result, timestamp: Date.now() });
          return result;
        } catch (e) {
          lastErr = e;
        }
      }

      if (lastErr && (String(lastErr?.message || lastErr).indexOf("404") !== -1 || String(lastErr?.message || lastErr).indexOf("does not exist") !== -1)) {
        console.warn("[SharePointCERDataService] CERNotifications list not found on site, defaulting to empty list:", lastErr);
        this._cachedNotificationLogs.set(key, { data: [], timestamp: Date.now() });
        return [];
      }

      console.error("[SharePointCERDataService] Error querying CERNotifications from SharePoint:", lastErr);
      throw new Error(
        `Unable to load notification logs from SharePoint: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`
      );
    })();

    this._inFlightNotificationLogs.set(key, fetchPromise);
    try {
      return await fetchPromise;
    } finally {
      this._inFlightNotificationLogs.delete(key);
    }
  }

  private async _createNotificationRecord(
    cerprno: string,
    recipients: string[],
    subject: string,
    body: string,
    attachmentsCount: number,
  ): Promise<void> {
    const triggerEvent = subject.indexOf("Rejected") !== -1
      ? "REJECT"
      : (subject.indexOf("Sanction") !== -1 || subject.indexOf("Final") !== -1 || subject.indexOf("Approved") !== -1 ? "APPROVE" : "SUBMIT");

    const modernPayload: any = {
      Title: cerprno,
      cerPrId: cerprno,
      recipients: recipients.join("; "),
      subject: subject,
      bodyPreview: body,
      triggerEvent: triggerEvent,
    };

    const legacyPayload = {
      Title: cerprno,
      cerPrId: cerprno,
      recipients: recipients.join("; "),
      subject: subject,
      body: body,
      attachments_count: attachmentsCount,
      dispatch_timestamp: new Date().toISOString(),
      status: "SENT",
    };

    const candidateLists = [SP_LISTS.CER_NOTIFICATIONS];
    for (const listName of candidateLists) {
      try {
        try {
          await this._sp.createListItem(listName, modernPayload);
          this._cachedNotificationLogs.clear();
          return;
        } catch {
          await this._sp.createListItem(listName, legacyPayload);
          this._cachedNotificationLogs.clear();
          return;
        }
      } catch {
        // try next candidate
      }
    }
  }

  // Helper / Conversion Methods
  // ---------------------------------------------------------------------------

  private _base64ToArrayBuffer(base64: string): ArrayBuffer {
    const raw = base64.indexOf(",") > -1 ? base64.split(",")[1] : base64;
    const binaryString =
      typeof window !== "undefined" && typeof window.atob === "function"
        ? window.atob(raw)
        : (typeof atob === "function" ? atob(raw) : "");
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }

  private _mapSharePointItemToProposal(item: any): ICERProposal {
    const ownerPerson = PersonFieldService.extractPersonField(item, "cerOwner") || PersonFieldService.extractPersonField(item, "owname");
    const cerId = String(item.cerPrId || item.cerPrNo || item.cerprno || item.Title || "");
    const propNo = String(item.proposalNo || item.proposal_no || item.cerPrId || item.cerPrNo || item.cerprno || item.Title || "");
    return {
      id: String(item.Id || item.id),
      cer_proposal_id: cerId,
      cerPrId: cerId,
      proposal_no: propNo,
      cerprno: cerId,
      pr_name: item.prName || item.pr_name || "",
      owname: ownerPerson?.name || (typeof item.cerOwner === "string" ? item.cerOwner : "") || (typeof item.owname === "string" ? item.owname : "") || item.ownname || (item.Author?.Title ? item.Author.Title : ""),
      owner_email: ownerPerson?.email || item.owner_email || (item.Author?.EMail ? item.Author.EMail : ""),
      sbu: item.sbu || "RJ North",
      status: (item.status === "Approval" ? "In Approval" : item.status) || "In Approval",
      object: item.object || "",
      amount: Number(item.amount || 0),
      currency: item.currency || "USD",
      cat: item.category || item.cat || "Vital",
      payable: item.payable || "Payback",
      period: item.period || "",
      payback_quarters: item.paybackQuarters !== undefined && item.paybackQuarters !== null && Number(item.paybackQuarters) > 0
        ? Number(item.paybackQuarters)
        : (item.payback_quarters !== undefined && item.payback_quarters !== null && Number(item.payback_quarters) > 0
            ? Number(item.payback_quarters)
            : 0),
      ben_npv: Number(item.benefitNpv ?? item.ben_npv ?? 0),
      ben_irr: Number(item.benefitIrr ?? item.ben_irr ?? 0),
      cost_assumptions: item.costAssumptions || item.cost_assumptions || "",
      st_date: (item.startDate || item.st_date) ? String(item.startDate || item.st_date).split("T")[0] : "",
      com_date: (item.completionDate || item.com_date) ? String(item.completionDate || item.com_date).split("T")[0] : "",
      duration_months: Number(item.durationMonths ?? item.duration_months ?? 0),
      cbudget: item.currentBudgeted || item.cbudget || "Yes",
      cb_amnt: Number(item.currentBudgetAmount ?? item.cb_amnt ?? 0),
      cb_currency: item.currentBudgetCurrency || item.cb_currency || "USD",
      reason: item.unbudgetedReason || item.reason || "",
      jv: item.jointVenture || item.jv || "No",
      jv_recoverable: item.jvRecoverable || item.jv_recoverable || "No",
      jv_cost: Number(item.jvCost ?? item.jv_cost ?? 0),
      jv_budget: item.jvBudgeted ?? item.jv_budget ?? "No",
      jv_amnt: Number(item.jvAmount ?? item.jv_amnt ?? 0),
      jv_reason: item.jvReason || item.jv_reason || "",
      ph_till_label: item.phTillLabel || item.ph_till_label || getCurrentFiscalYearPhasingLabels(item.Created ? new Date(item.Created) : (item.created_date ? new Date(item.created_date) : new Date())).ph_till_label,
      ph_fy_label: item.phFyLabel || item.ph_fy_label || getCurrentFiscalYearPhasingLabels(item.Created ? new Date(item.Created) : (item.created_date ? new Date(item.created_date) : new Date())).ph_fy_label,
      ph_beyond_label: item.phBeyondLabel || item.ph_beyond_label || getCurrentFiscalYearPhasingLabels(item.Created ? new Date(item.Created) : (item.created_date ? new Date(item.created_date) : new Date())).ph_beyond_label,
      prod_till: Number(item.prodTill ?? item.prod_till ?? 0),
      prod_fy: Number(item.prodFy ?? item.prod_fy ?? 0),
      prod_beyond: Number(item.prodBeyond ?? item.prod_beyond ?? 0),
      capex_till: Number(item.capexTill ?? item.capex_till ?? 0),
      capex_fy: Number(item.capexFy ?? item.capex_fy ?? 0),
      capex_beyond: Number(item.capexBeyond ?? item.capex_beyond ?? 0),
      opex_till: Number(item.opexTill ?? item.opex_till ?? 0),
      opex_fy: Number(item.opexFy ?? item.opex_fy ?? 0),
      opex_beyond: Number(item.opexBeyond ?? item.opex_beyond ?? 0),
      engineer: Number(item.engineeringCost ?? item.engineer ?? 0),
      s_fac: Number(item.surfaceFacilitiesCost ?? item.s_fac ?? 0),
      comis: Number(item.commissioningCost ?? item.comis ?? 0),
      preop: Number(item.preoperativeCost ?? item.preop ?? 0),
      others: Number(item.otherCosts ?? item.others ?? 0),
      total: Number(item.total || 0),
      remarks: item.remarks || "",
      remarks_jv: item.remarksJv || item.remarks_jv || "",
      current_level: Number(item.currentLevel ?? item.current_level ?? 1),
      pending_with_role: item.pendingWithRole || item.pending_with_role || "L1 - Technical Review",
      pending_with_email: item.pendingWithEmail || item.pending_with_email || "",
      request_date: (item.RequestDate || item.requestDate || item.request_date) ? String(item.RequestDate || item.requestDate || item.request_date).split("T")[0] : undefined,
      created_date: item.Created || new Date().toISOString(),
      created_by: item.Author?.Title || "System",
      modified_date: item.Modified || new Date().toISOString(),
      modified_by: item.Editor?.Title || "System",
      revision_count: Number(item.revisionCount ?? item.revision_count ?? 0),
      etag: item["odata.etag"] || item["@odata.etag"] || item.__metadata?.etag || undefined,
    };
  }

  private _mapProposalToModernSharePointItem(proposal: ICERProposal): any {
    const formatIsoDate = (val?: string) => {
      if (!val) return null;
      if (val.indexOf("T") !== -1) return val;
      return `${val}T00:00:00Z`;
    };

    const cerId = proposal.cer_proposal_id || proposal.cerprno;
    const propNo = proposal.proposal_no || proposal.cerprno;

    return {
      Title: cerId,
      cerPrId: cerId,
      proposalNo: propNo,
      prName: proposal.pr_name,
      sbu: proposal.sbu,
      status: proposal.status,
      object: proposal.object,
      amount: Number(proposal.amount || 0),
      currency: proposal.currency || "USD",
      category: proposal.cat || "Vital",
      payable: proposal.payable || "Payback",
      period: proposal.period,
      paybackQuarters: proposal.payback_quarters !== undefined && proposal.payback_quarters !== null && Number(proposal.payback_quarters) > 0 ? Number(proposal.payback_quarters) : null,
      benefitNpv: proposal.ben_npv !== undefined && proposal.ben_npv !== null ? Number(proposal.ben_npv) : null,
      benefitIrr: proposal.ben_irr !== undefined && proposal.ben_irr !== null ? Number(proposal.ben_irr) : null,
      costAssumptions: proposal.cost_assumptions,
      startDate: formatIsoDate(proposal.st_date),
      completionDate: formatIsoDate(proposal.com_date),
      durationMonths: proposal.duration_months !== undefined && proposal.duration_months !== null ? Number(proposal.duration_months) : null,
      currentBudgeted: proposal.cbudget || "Yes",
      currentBudgetAmount: proposal.cb_amnt !== undefined && proposal.cb_amnt !== null ? Number(proposal.cb_amnt) : null,
      currentBudgetCurrency: proposal.cb_currency || undefined,
      unbudgetedReason: proposal.reason,
      jointVenture: proposal.jv || "No",
      jvRecoverable: proposal.jv_recoverable || "No",
      jvCost: proposal.jv_cost !== undefined && proposal.jv_cost !== null ? Number(proposal.jv_cost) : null,
      jvBudgeted: proposal.jv_budget || "No",
      jvAmount: proposal.jv_amnt !== undefined && proposal.jv_amnt !== null ? Number(proposal.jv_amnt) : null,
      jvReason: proposal.jv_reason,
      phTillLabel: proposal.ph_till_label || getCurrentFiscalYearPhasingLabels().ph_till_label,
      phFyLabel: proposal.ph_fy_label || getCurrentFiscalYearPhasingLabels().ph_fy_label,
      phBeyondLabel: proposal.ph_beyond_label || getCurrentFiscalYearPhasingLabels().ph_beyond_label,
      prodTill: Number(proposal.prod_till || 0),
      prodFy: Number(proposal.prod_fy || 0),
      prodBeyond: Number(proposal.prod_beyond || 0),
      capexTill: Number(proposal.capex_till || 0),
      capexFy: Number(proposal.capex_fy || 0),
      capexBeyond: Number(proposal.capex_beyond || 0),
      opexTill: Number(proposal.opex_till || 0),
      opexFy: Number(proposal.opex_fy || 0),
      opexBeyond: Number(proposal.opex_beyond || 0),
      engineeringCost: Number(proposal.engineer || 0),
      surfaceFacilitiesCost: Number(proposal.s_fac || 0),
      commissioningCost: Number(proposal.comis || 0),
      preoperativeCost: Number(proposal.preop || 0),
      otherCosts: Number(proposal.others || 0),
      total: Number(proposal.total || 0),
      remarks: proposal.remarks,
      remarksJv: proposal.remarks_jv,
      currentLevel: Number(proposal.current_level || 1),
      pendingWithRole: proposal.pending_with_role,
      pendingWithEmail: proposal.pending_with_email,
      RequestDate: formatIsoDate(proposal.request_date),
      revisionCount: Number(proposal.revision_count || 0),
    };
  }

  // ---------------------------------------------------------------------------
  // ---------------------------------------------------------------------------
  // Directory Search (Real Portal Users with Permissions to this Site)
  // ---------------------------------------------------------------------------

  public async searchDirectoryUsers(query: string): Promise<IDirectoryUser[]> {
    const trimmed = (query || "").trim().toLowerCase();

    // 1. Query REAL users who have permission to this SharePoint portal
    try {
      const siteUsersRaw = await this._sp.getSiteUsers<{
        Id: number;
        Title: string;
        Email: string;
        LoginName: string;
        IsSiteAdmin: boolean;
      }>({
        filter: "PrincipalType eq 1 and Email ne ''",
        select: "Id,Title,Email,LoginName,IsSiteAdmin",
      });

      if (siteUsersRaw.length > 0) {
        const siteUsers: IDirectoryUser[] = siteUsersRaw.map((u) => {
          const email = (u.Email || "").trim();
          const upn = (u.LoginName && u.LoginName.indexOf("|") !== -1)
            ? u.LoginName.split("|").pop()
            : email;
          return {
            id: String(u.Id || email || u.Title),
            displayName: u.Title || "",
            mail: email,
            userPrincipalName: upn || email,
            jobTitle: u.IsSiteAdmin ? "Site Administrator" : "Portal Member",
            department: "CER Management Portal",
          };
        });

        // Filter by search query if provided, or return all portal users if empty
        const filtered = !trimmed
          ? siteUsers
          : siteUsers.filter((u) => {
              const matchName = u.displayName.toLowerCase().indexOf(trimmed) !== -1;
              const matchMail = (u.mail || "").toLowerCase().indexOf(trimmed) !== -1;
              const matchUpn = (u.userPrincipalName || "").toLowerCase().indexOf(trimmed) !== -1;
              return matchName || matchMail || matchUpn;
            });

        if (filtered.length > 0 || !trimmed) {
          return filtered;
        }
      }
    } catch (siteUsersError) {
      console.warn(
        "[SharePointCERDataService] Querying siteusers failed, falling back to directory search:",
        siteUsersError
      );
    }

    // 2. Query ClientPeoplePickerSearchUser scoped to SharePoint site permissions (PrincipalSource: 1 = SPWeb)
    try {
      const rawResults = await this._sp.searchPeoplePicker(trimmed, 15);
      if (rawResults.length > 0) {
        return rawResults.map((item: any) => {
          const email = item.EntityData?.Email || (item.Description && item.Description.indexOf("@") !== -1 ? item.Description : "");
          const upn = (item.Key && item.Key.indexOf("|") !== -1)
            ? item.Key.split("|").pop()
            : (email || item.DisplayText);
          return {
            id: item.Key || email || item.DisplayText,
            displayName: item.DisplayText || "",
            mail: email || "",
            userPrincipalName: upn || email || "",
            jobTitle: item.EntityData?.Title || "Portal Member",
            department: item.EntityData?.Department || "CER Management Portal",
          };
        });
      }
    } catch (spError) {
      console.warn("[SharePointCERDataService] ClientPeoplePickerSearchUser failed:", spError);
    }

    return [];
  }

  // ---------------------------------------------------------------------------
  // 6. Role-Based Access Control (RBAC) & User Roles
  // ---------------------------------------------------------------------------

  public async getUserRoles(forceRefresh = false): Promise<IUserRoleAssignment[]> {
    if (!forceRefresh && this._cachedUserRoles) {
      return [...this._cachedUserRoles];
    }
    if (this._inFlightUserRoles) {
      const pending = await this._inFlightUserRoles;
      return [...pending];
    }

    this._inFlightUserRoles = (async () => {
      try {
        let items: Record<string, any>[] = [];
        const listName = SP_LISTS.CER_ROLE_MATRIX;

        try {
          // Tier 1: Modern CERRoleMatrix schema with Person field 'User' expanded
          items = await this._sp.getListItems<Record<string, any>>(listName, {
            select: "Id,ID,Title,role,sbu,approverLevel,approverRoleTitle,Created,User/Id,User/Title,User/EMail,User/LoginName",
            expand: "User",
            top: 500,
          });
        } catch {
          try {
            // Tier 2: User Person field with Id & Title only (fallback if tenant restricts LoginName/EMail projection)
            items = await this._sp.getListItems<Record<string, any>>(listName, {
              select: "Id,ID,Title,role,sbu,approverLevel,approverRoleTitle,Created,User/Id,User/Title",
              expand: "User",
              top: 500,
            });
          } catch {
            try {
              // Tier 3: Unprojected safe query (SharePoint never fails on column projection mismatch when select is omitted)
              items = await this._sp.getListItems<Record<string, any>>(listName, {
                top: 500,
              });
            } catch (err) {
              console.warn(`[SharePointCERDataService] Query on ${listName} failed:`, err);
              items = [];
            }
          }
        }

        if (!items || items.length === 0) {
          this._cachedUserRoles = [];
          this._cachedUserRolesTimestamp = Date.now();
          return [];
        }

        const list: IUserRoleAssignment[] = items.map((item: any) => {
          const userPerson = PersonFieldService.extractPersonField(item, "User");
          const assignedByPerson = PersonFieldService.extractPersonField(item, "assignedBy");

          const userName = userPerson?.name || item.Title || item.user_name || "";
          const userEmail = userPerson?.email || item.user_email || "";
          const loginName = userPerson?.loginName || item.login_name || userEmail;
          const userId = userPerson?.id || (item.UserId ? Number(item.UserId) : undefined);

          const assignedByName = assignedByPerson?.name || item.assignedBy || item.assigned_by || (item.Author ? item.Author.Title : "System Administrator");
          const assignedDate = item.assignedDate || item.assigned_date || item.Created || new Date().toISOString();

          const rawLevel = item.approverLevel !== undefined ? item.approverLevel : (item.approvalLevel !== undefined ? item.approvalLevel : item.approval_level);

          return {
            id: String(item.ID !== undefined ? item.ID : item.Id !== undefined ? item.Id : item.id || Date.now()),
            user_name: userName,
            user_email: userEmail,
            login_name: loginName,
            user_id: userId,
            role: item.role || "Initiator",
            approval_level: rawLevel !== undefined && rawLevel !== null ? Number(rawLevel) : undefined,
            approver_role_title: item.approverRoleTitle || item.approver_role_title || "",
            department: item.department || undefined,
            sbu: item.sbu || "",
            is_active: item.isActive !== undefined ? !!item.isActive : true, // Presence in CERRoleMatrix represents active authorization
            approval_hierarchy_page: item.approvalHierarchyPage === true || item.approvalHierarchyPage === 1 || String(item.approvalHierarchyPage).toLowerCase() === "yes",
            assigned_by: assignedByName,
            assigned_date: assignedDate,
          };
        });
        list.sort((a: IUserRoleAssignment, b: IUserRoleAssignment) => new Date(b.assigned_date).getTime() - new Date(a.assigned_date).getTime());
        
        this._cachedUserRoles = list;
        this._cachedUserRolesTimestamp = Date.now();
        return list;
      } catch (e) {
        console.warn("[SharePointCERDataService] Querying role matrix caught unexpected error, defaulting to empty roles:", e);
        this._cachedUserRoles = [];
        this._cachedUserRolesTimestamp = Date.now();
        return [];
      } finally {
        this._inFlightUserRoles = null;
      }
    })();

    const result = await this._inFlightUserRoles;
    return [...result];
  }

  /**
   * Returns the list of identity strings for users permitted to manage the Approval Hierarchy.
   * Derived from CERRoleMatrix rows where approvalHierarchyPage = Yes (and is_active = true).
   * No separate SharePoint list query — reuses the already-cached getUserRoles result.
   */
  public async getHierarchyAdmins(forceRefresh = false): Promise<string[]> {
    try {
      const roles = await this.getUserRoles(forceRefresh);
      const admins: string[] = [];

      roles
        .filter((r) => r.is_active && r.approval_hierarchy_page)
        .forEach((r) => {
          if (r.user_email) {
            const cleanEmail = r.user_email.trim().toLowerCase();
            admins.push(cleanEmail);
            if (cleanEmail.indexOf("@") !== -1) {
              admins.push(cleanEmail.split("@")[0]);
            }
          }
          if (r.login_name) {
            const cleanLogin = r.login_name.trim().toLowerCase();
            admins.push(cleanLogin);
            const normLogin = cleanLogin
              .replace(/^i:0#\.f\|membership\|/i, "")
              .replace(/^membership\|/i, "");
            admins.push(normLogin);
            if (normLogin.indexOf("@") !== -1) {
              admins.push(normLogin.split("@")[0]);
            }
            if (normLogin.indexOf("#ext#") !== -1) {
              const b2bPrefix = normLogin.split("#ext#")[0];
              const lastUnderscore = b2bPrefix.lastIndexOf("_");
              if (lastUnderscore > 0) {
                admins.push(b2bPrefix.substring(0, lastUnderscore));
              }
            }
          }
          if (r.user_name) {
            const cleanName = r.user_name.toLowerCase();
            admins.push(cleanName);
            const strippedName = r.user_name.replace(/\s*\(.*?\)\s*/g, "").replace(/\s+/g, " ").trim().toLowerCase();
            if (strippedName) admins.push(strippedName);
          }
          if (r.user_id && r.user_id > 0) {
            admins.push(String(r.user_id));
            admins.push(`id:${r.user_id}`);
          }
        });

      return Array.from(new Set(admins.filter(Boolean)));
    } catch (err) {
      console.warn("[SharePointCERDataService] Failed to derive hierarchy administrators from CERRoleMatrix:", err);
      return [];
    }
  }

  public async assignUserRole(
    assignment: Omit<IUserRoleAssignment, "id">,
    actor: { name: string; email: string }
  ): Promise<IUserRoleAssignment> {
    this.clearCache();
    // Security restriction: System Admin accounts cannot be created or modified via the UI
    if (assignment.role === "Admin") {
      throw new Error(
        "Security Restriction: System Admin accounts cannot be created or modified through the web interface. System Admin permissions must be managed directly in SharePoint CERRoleMatrix list."
      );
    }

    try {
      // 1. Resolve SharePoint user ID for target employee with multi-stage resolution
      let spUserId: number | null = assignment.user_id || null;
      if (!spUserId && (assignment.login_name || assignment.user_email)) {
        const candidates = [
          assignment.login_name,
          assignment.user_email,
          assignment.login_name && assignment.login_name.indexOf("|") === -1 ? `i:0#.f|membership|${assignment.login_name}` : "",
          assignment.user_email && assignment.user_email.indexOf("|") === -1 ? `i:0#.f|membership|${assignment.user_email}` : "",
        ].filter(Boolean) as string[];

        for (const candidate of candidates) {
          try {
            const ensured = await PersonFieldService.resolveUser(
              this._spHttpClient,
              this._siteUrl,
              candidate
            );
            if (ensured && ensured.Id) {
              spUserId = ensured.Id;
              break;
            }
          } catch {
            // try next candidate
          }
        }

        // Secondary fallback: query site users directly
        if (!spUserId) {
          try {
            const siteUsers = await this._sp.getSiteUsers<{ Id: number; Email?: string; LoginName?: string; Title?: string }>();
            const normEmail = (assignment.user_email || "").toLowerCase().trim();
            const normLogin = (assignment.login_name || "").toLowerCase().trim();
            const normName = (assignment.user_name || "").toLowerCase().trim();

            const found = siteUsers.find((u) => {
              const uEmail = (u.Email || "").toLowerCase().trim();
              const uLogin = (u.LoginName || "").toLowerCase().trim();
              const uTitle = (u.Title || "").toLowerCase().trim();
              return (
                (normEmail && (uEmail === normEmail || uLogin.indexOf(normEmail) !== -1)) ||
                (normLogin && (uLogin === normLogin || uLogin.indexOf(normLogin) !== -1)) ||
                (normName && uTitle === normName)
              );
            });
            if (found && found.Id) {
              spUserId = found.Id;
            }
          } catch {
            // ignore fallback error
          }
        }
      }

      // Base payload targeting CERRoleMatrix list columns
      const payload: Record<string, any> = {
        Title: assignment.user_name,
        role: assignment.role,
        sbu: assignment.sbu || "All",
      };

      if (assignment.approval_level) {
        payload.approverLevel = assignment.approval_level;
      }
      if (assignment.approver_role_title) {
        payload.approverRoleTitle = assignment.approver_role_title;
      }
      if (spUserId) {
        payload.UserId = spUserId;
      }

      let res: { Id?: number; ID?: number } | null = null;
      const listName = SP_LISTS.CER_ROLE_MATRIX;
      let currentPayload: Record<string, any> = { ...payload };
      let lastCreateErr: any = null;

      // Robust creation loop: auto-prune non-existent columns if tenant schema differs
      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          res = await this._sp.createListItem<{ Id?: number; ID?: number }>(listName, currentPayload);
          break;
        } catch (createErr: any) {
          lastCreateErr = createErr;
          const errStr = String(createErr?.message || "").toLowerCase();

          // Match field name from SharePoint error message (e.g. "The field or property 'xyz' does not exist")
          const fieldMatch = errStr.match(/field or property '([^']+)' does not exist/i) ||
                             errStr.match(/field '([^']+)' does not exist/i);
          if (fieldMatch && fieldMatch[1]) {
            const missingField = fieldMatch[1].toLowerCase();
            const keyToRemove = Object.keys(currentPayload).find(
              (k) => k.toLowerCase() === missingField
            );
            if (keyToRemove) {
              delete currentPayload[keyToRemove];
              continue;
            }
          }

          // Known optional column fallbacks
          if (errStr.indexOf("approverlevel") !== -1 && currentPayload.approverLevel !== undefined) {
            delete currentPayload.approverLevel;
            continue;
          }
          if (errStr.indexOf("approverroletitle") !== -1 && currentPayload.approverRoleTitle !== undefined) {
            delete currentPayload.approverRoleTitle;
            continue;
          }

          break;
        }
      }

      if (!res) {
        throw new Error(`Failed to write to role matrix list in SharePoint. (${lastCreateErr instanceof Error ? lastCreateErr.message : String(lastCreateErr)})`);
      }

      const created: IUserRoleAssignment = {
        ...assignment,
        id: String(res.ID !== undefined ? res.ID : res.Id !== undefined ? res.Id : Date.now()),
        user_id: spUserId || undefined,
        assigned_by: actor.name,
        assigned_date: new Date().toISOString(),
      };

      try {
        await this.logAdminAudit({
          actor_name: actor.name,
          actor_email: actor.email,
          action: "ROLE_ASSIGNED",
          target_type: "USER",
          target_id: created.id,
          details: `Assigned role '${created.role}' to ${created.user_name} (${created.user_email}) for SBU '${created.sbu || "All"}'${created.approval_level ? ` with Approval Level ${created.approval_level}` : ""}.`,
          after_value: JSON.stringify(created),
          timestamp: new Date().toISOString(),
        });
      } catch {
        // ignore audit logging error
      }

      return created;
    } catch (e) {
      console.error("[SharePointCERDataService] assignUserRole failed in SharePoint:", e);
      throw new Error(`Unable to assign user role to '${assignment.user_name}' in SharePoint role matrix: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  public async updateUserRole(
    assignment: IUserRoleAssignment,
    actor: { name: string; email: string }
  ): Promise<void> {
    this.clearCache();
    // Security restriction: System Admin accounts cannot be modified via the UI
    if (assignment.role === "Admin") {
      throw new Error(
        "Security Restriction: System Admin accounts cannot be modified through the web interface. System Admin permissions must be managed directly in SharePoint CERRoleMatrix list."
      );
    }

    try {
      // 1. Resolve SharePoint user ID using ensureUser
      let spUserId: number | null = assignment.user_id || null;
      if (!spUserId && (assignment.login_name || assignment.user_email)) {
        try {
          const targetLogon = assignment.login_name || assignment.user_email;
          const ensured = await PersonFieldService.resolveUser(
            this._spHttpClient,
            this._siteUrl,
            targetLogon
          );
          spUserId = ensured.Id;
        } catch (ensureErr) {
          console.warn("[SharePointCERDataService] ensureUser resolution warning during updateUserRole:", ensureErr);
        }
      }

      const payload: Record<string, any> = {
        Title: assignment.user_name,
        role: assignment.role,
        sbu: assignment.sbu || "All",
      };

      if (assignment.approval_level) {
        payload.approverLevel = assignment.approval_level;
      }
      if (assignment.approver_role_title) {
        payload.approverRoleTitle = assignment.approver_role_title;
      }
      if (spUserId) {
        payload.UserId = spUserId;
      }

      const listName = SP_LISTS.CER_ROLE_MATRIX;
      let updated = false;
      let currentPayload: Record<string, any> = { ...payload };
      let lastUpdateErr: any = null;

      for (let attempt = 0; attempt < 5; attempt++) {
        try {
          await this._sp.updateListItem(listName, assignment.id, currentPayload);
          updated = true;
          break;
        } catch (updateErr: any) {
          lastUpdateErr = updateErr;
          const errStr = String(updateErr?.message || "").toLowerCase();
          const fieldMatch = errStr.match(/field or property '([^']+)' does not exist/i) ||
                             errStr.match(/field '([^']+)' does not exist/i);
          if (fieldMatch && fieldMatch[1]) {
            const missingField = fieldMatch[1].toLowerCase();
            const keyToRemove = Object.keys(currentPayload).find(
              (k) => k.toLowerCase() === missingField
            );
            if (keyToRemove) {
              delete currentPayload[keyToRemove];
              continue;
            }
          }
          if (errStr.indexOf("approverlevel") !== -1 && currentPayload.approverLevel !== undefined) {
            delete currentPayload.approverLevel;
            continue;
          }
          if (errStr.indexOf("approverroletitle") !== -1 && currentPayload.approverRoleTitle !== undefined) {
            delete currentPayload.approverRoleTitle;
            continue;
          }
          break;
        }
      }

      if (!updated) {
        throw new Error(`Failed to update item ${assignment.id} in role matrix. (${lastUpdateErr instanceof Error ? lastUpdateErr.message : String(lastUpdateErr)})`);
      }

      try {
        await this.logAdminAudit({
          actor_name: actor.name,
          actor_email: actor.email,
          action: "ROLE_UPDATED",
          target_type: "USER",
          target_id: assignment.id,
          details: `Updated role assignment for ${assignment.user_name}. SBU: ${assignment.sbu || "All"}, Role: ${assignment.role}${assignment.approval_level ? `, Level: ${assignment.approval_level}` : ""}.`,
          after_value: JSON.stringify(assignment),
          timestamp: new Date().toISOString(),
        });
      } catch {
        // ignore audit logging error
      }
      return;
    } catch (e) {
      console.error("[SharePointCERDataService] updateUserRole failed in SharePoint:", e);
      throw new Error(`Unable to update user role for '${assignment.user_name}' in SharePoint role matrix: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  public async revokeUserRole(
    assignmentId: string,
    actor: { name: string; email: string }
  ): Promise<void> {
    this.clearCache();
    // Security restriction: System Admin accounts cannot be deleted via the UI
    try {
      const existingRoles = await this.getUserRoles();
      const target = existingRoles.find((r) => String(r.id) === String(assignmentId));
      if (target && target.role === "Admin") {
        throw new Error(
          "Security Restriction: System Admin accounts cannot be deleted through the web interface. System Admin permissions must be managed directly in SharePoint CERRoleMatrix list."
        );
      }
    } catch (checkErr: any) {
      if (String(checkErr?.message || "").indexOf("Security Restriction") !== -1) {
        throw checkErr;
      }
    }

    try {
      const listName = SP_LISTS.CER_ROLE_MATRIX;
      await this._sp.deleteListItem(listName, assignmentId);

      try {
        await this.logAdminAudit({
          actor_name: actor.name,
          actor_email: actor.email,
          action: "ROLE_REVOKED",
          target_type: "USER",
          target_id: assignmentId,
          details: `Revoked role assignment ID '${assignmentId}'.`,
          timestamp: new Date().toISOString(),
        });
      } catch {
        // ignore audit logging error
      }
      return;
    } catch (e) {
      console.error("[SharePointCERDataService] revokeUserRole failed in SharePoint:", e);
      throw new Error(`Unable to revoke user role assignment '${assignmentId}' in SharePoint role matrix: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Administrative Audit Log (Stored in CERAuditTrail)
  // ---------------------------------------------------------------------------

  public async getAdminAuditLog(): Promise<IAdminAuditRecord[]> {
    try {
      const fetchItems = typeof this._sp.getAllListItems === "function"
        ? (opts: any) => this._sp.getAllListItems(SP_LISTS.CER_AUDIT_TRAIL, opts)
        : (opts: any) => this._sp.getListItems(SP_LISTS.CER_AUDIT_TRAIL, opts);
      const items = await fetchItems({
        top: 2000,
        orderby: "Created desc",
      });

      return items.map((item: any) => ({
        id: String(item.Id || item.id),
        actor_name: item.userName || item.actor_name || item.Title || "Admin",
        actor_email: item.userEmail || item.actor_email || "",
        action: item.actionType || item.action || "UPDATE",
        target_type: item.fieldName || item.target_type || "SETTINGS",
        target_id: item.cerPrId || item.cerPrNo || item.target_id || "",
        details: item.fieldName ? `Field '${item.fieldName}' changed from '${item.oldValue || ""}' to '${item.newValue || ""}'` : (item.details || ""),
        before_value: item.oldValue || item.before_value || "",
        after_value: item.newValue || item.after_value || "",
        timestamp: item.timestamp || item.Created || new Date().toISOString(),
      }));
    } catch {
      return [];
    }
  }

  public async logAdminAudit(record: Omit<IAdminAuditRecord, "id">): Promise<void> {
    const payload: any = {
      Title: record.target_id || "ADMIN",
      cerPrId: record.target_id || "ADMIN",
      fieldName: record.target_type || "SETTINGS",
      oldValue: record.before_value || "",
      newValue: record.after_value || record.details || "",
      userName: record.actor_name,
      userEmail: record.actor_email,
      actionType: "UPDATE",
      timestamp: record.timestamp || new Date().toISOString(),
    };

    try {
      await this._sp.createListItem(SP_LISTS.CER_AUDIT_TRAIL, payload);
    } catch {
      // non-blocking
    }
  }
}


