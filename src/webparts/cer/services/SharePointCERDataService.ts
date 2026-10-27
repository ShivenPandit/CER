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
import { getCurrentFiscalYearPhasingLabels } from "../utils/dateUtils";
import { SharePointOperations } from "../hooks/useSharePointOperations";

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

  public clearCache(): void {
    this._cachedUserRoles = null;
    this._cachedUserRolesTimestamp = 0;
    this._cachedWorkflowLevels.clear();
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
      const fields = await this._sp.getListFields<{
        InternalName: string;
        Title: string;
        Choices: string[];
        DefaultValue: string;
      }>("CER_Proposals", {
        filter: "TypeAsString eq 'Choice'",
        select: "InternalName,Title,Choices,DefaultValue",
      });

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
          cat: choicesMap.cat && choicesMap.cat.length > 0 ? choicesMap.cat : DEFAULT_FIELD_CHOICES.cat,
          currency: choicesMap.currency && choicesMap.currency.length > 0 ? choicesMap.currency : DEFAULT_FIELD_CHOICES.currency,
          payable: choicesMap.payable && choicesMap.payable.length > 0 ? choicesMap.payable : DEFAULT_FIELD_CHOICES.payable,
          cbudget: choicesMap.cbudget && choicesMap.cbudget.length > 0 ? choicesMap.cbudget : DEFAULT_FIELD_CHOICES.cbudget,
          cb_currency: choicesMap.cb_currency && choicesMap.cb_currency.length > 0 ? choicesMap.cb_currency : DEFAULT_FIELD_CHOICES.cb_currency,
          jv: choicesMap.jv && choicesMap.jv.length > 0 ? choicesMap.jv : DEFAULT_FIELD_CHOICES.jv,
          jv_recoverable: choicesMap.jv_recoverable && choicesMap.jv_recoverable.length > 0 ? choicesMap.jv_recoverable : DEFAULT_FIELD_CHOICES.jv_recoverable,
          jv_budget: choicesMap.jv_budget && choicesMap.jv_budget.length > 0 ? choicesMap.jv_budget : DEFAULT_FIELD_CHOICES.jv_budget,
          status: choicesMap.status && choicesMap.status.length > 0 ? choicesMap.status : DEFAULT_FIELD_CHOICES.status,
        };

        this._cachedFieldChoices = resolved;
        return resolved;
      }
    } catch (e) {
      console.warn("[SharePointCERDataService] Error querying choice fields from CER_Proposals list, using default field choices:", e);
    }

    this._cachedFieldChoices = DEFAULT_FIELD_CHOICES;
    return DEFAULT_FIELD_CHOICES;
  }

  // ---------------------------------------------------------------------------
  // 1. CER_Proposals Operations
  // ---------------------------------------------------------------------------

  public async getAllProposals(): Promise<ICERProposal[]> {
    try {
      const items = await this._sp.getListItems("CER_Proposals", {
        top: 500,
        orderby: "Created desc",
      });

      return items.map((item: Record<string, unknown>) =>
        this._mapSharePointItemToProposal(item),
      );
    } catch (e) {
      console.error(
        "[SharePointCERDataService] Failed to query CER_Proposals list from SharePoint:",
        e,
      );
      throw new Error(
        `Unable to load CER proposals from SharePoint: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  public async getProposalByNumber(
    cerprno: string,
  ): Promise<ICERProposal | null> {
    try {
      const items = await this._sp.getListItems("CER_Proposals", {
        filter: `cerprno eq '${cerprno}'`,
        orderby: "Modified desc",
        top: 1,
      });

      if (items.length > 0) {
        return this._mapSharePointItemToProposal(items[0]);
      }
      return null;
    } catch (e) {
      console.error(`[SharePointCERDataService] Failed to query proposal '${cerprno}' from SharePoint:`, e);
      throw new Error(
        `Unable to load proposal '${cerprno}' from SharePoint: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  public async generateProposalNumber(): Promise<string> {
    try {
      const year = new Date().getFullYear();
      const items = await this._sp.getListItems<{ cerprno: string }>("CER_Proposals", {
        select: "cerprno",
        top: 500,
        orderby: "Created desc",
      });

      const prefix = `CER-${year}-`;
      let highest = 0;
      for (const item of items) {
        const no = String(item.cerprno || "");
        if (no.startsWith(prefix)) {
          const numPart = parseInt(no.replace(prefix, ""), 10);
          if (!isNaN(numPart) && numPart > highest) {
            highest = numPart;
          }
        }
      }
      const nextNum = highest + 1;
      return `${prefix}${("0000" + nextNum).slice(-4)}`;
    } catch (e) {
      console.error("[SharePointCERDataService] Failed to generate proposal number from SharePoint list:", e);
      throw new Error(
        `Unable to generate proposal number from SharePoint: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  public async createProposal(
    proposal: ICERProposal,
  ): Promise<{ success: boolean; message: string; proposal: ICERProposal }> {
    const now = new Date().toISOString();
    const isDraft = proposal.status === "Draft";
    const activeLevels = await this.getWorkflowLevels(proposal.sbu);
    if (!isDraft && activeLevels.length === 0) {
      throw new Error(`No approval stages configured for SBU '${proposal.sbu}'. Please configure workflow levels in Admin settings.`);
    }
    const activeL1 = activeLevels.find((l) => l.level_id === 1 && l.is_active) || activeLevels[0];
    const isL1PO = activeL1 ? isProjectOwnerStage(activeL1) : false;

    if (!isDraft && isL1PO && !isValidEmail(proposal.owner_email)) {
      throw new Error(`Cannot route to Project Owner: Proposal Owner Email ('${proposal.owner_email || ""}') is missing or invalid.`);
    }

    const newProposal: ICERProposal = {
      ...proposal,
      status: isDraft ? "Draft" : "In Approval",
      current_level: isDraft ? 0 : 1,
      pending_with_role: isDraft ? "Draft" : (activeL1 ? activeL1.role_title : "L1 - Technical Review"),
      pending_with_email: isDraft ? "" : (isL1PO ? (proposal.owner_email || "") : (activeL1 ? (activeL1.approver_email || "") : "")),
      created_date: proposal.created_date || now,
      modified_date: now,
      revision_count: proposal.revision_count || 0,
    };

    const payload = this._mapProposalToSharePointItem(newProposal);

    // Check if an item with this cerprno already exists in CER_Proposals list (e.g. draft saved earlier)
    let existingItems: Array<{ Id: number }> = [];
    try {
      existingItems = await this._sp.getListItems<{ Id: number }>("CER_Proposals", {
        filter: `cerprno eq '${newProposal.cerprno}'`,
        select: "Id",
        top: 1,
      });
    } catch (queryErr) {
      console.warn("[SharePointCERDataService] Check for existing proposal encountered warning:", queryErr);
    }

    if (existingItems.length > 0) {
      const spItemId = existingItems[0].Id;
      newProposal.id = String(spItemId);

      try {
        await this._sp.updateListItem("CER_Proposals", spItemId, payload);
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

      return {
        success: true,
        message: isDraft
          ? "CER Proposal draft saved successfully"
          : "CER Proposal No. has been created and sent for approval",
        proposal: newProposal,
      };
    }

    // If item does not exist, POST new record
    try {
      const createdItem = await this._sp.createListItem<{ Id: number }>("CER_Proposals", payload);
      if (createdItem && createdItem.Id) {
        newProposal.id = String(createdItem.Id);
      }
    } catch (createErr) {
      console.error("[SharePointCERDataService] Failed to create CER proposal in SharePoint:", createErr);
      throw new Error(
        `Unable to save the CER to SharePoint. No successful save could be confirmed. Please verify the proposal before retrying. (Details: ${createErr instanceof Error ? createErr.message : String(createErr)})`,
      );
    }

    // Secondary write: Initial narrative remarks into CER_RemarksHistory
    if (newProposal.remarks && newProposal.remarks.trim()) {
      try {
        await this._createRemarksRecord(newProposal.cerprno, 1, newProposal.remarks, newProposal.created_by);
      } catch (remarksErr) {
        console.warn("[SharePointCERDataService] Secondary remarks write warning:", remarksErr);
      }
    }

    // Secondary write: Workflow dispatch notification into CER_Notifications
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

    return {
      success: true,
      message: isDraft
        ? "CER Proposal draft saved successfully"
        : "CER Proposal No. has been created and sent for approval",
      proposal: newProposal,
    };
  }

  public async updateProposal(
    proposal: ICERProposal,
    user: { name: string; email: string },
  ): Promise<{
    success: boolean;
    message: string;
    proposal: ICERProposal;
    auditRowsCount: number;
  }> {
    const now = new Date().toISOString();
    const existing = await this.getProposalByNumber(proposal.cerprno);
    const original = existing || proposal;

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

    // 1. Calculate field-level deltas for CER_AuditTrail
    const auditRecords: ICERAuditRecord[] = [];
    const changedKeys = (Object.keys(proposal) as Array<keyof ICERProposal>).filter(
      (key) => {
        if (EXCLUDED_AUDIT_FIELDS.has(key as string)) return false;
        const oldVal = original[key];
        const newVal = proposal[key];
        return String(oldVal ?? "") !== String(newVal ?? "");
      },
    );

    const nowParts = now.split("T");
    const dateOnly = nowParts[0];
    const timeOnly = nowParts[1] ? nowParts[1].substring(0, 8) : "12:00:00";

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
    let nextEmail = proposal.pending_with_email;

    if (isDraft) {
      nextStatus = "Draft";
      nextLevel = original.current_level || 0;
      nextRole = "Draft";
      nextEmail = "";
    } else {
      // Re-triggering or launching workflow at Level 1 (Draft submit, Revised re-trigger, or Approved change)
      nextStatus = "In Approval";
      nextLevel = 1;
      const activeLevels = await this.getWorkflowLevels(proposal.sbu);
      if (activeLevels.length === 0) {
        throw new Error(`No approval stages configured for SBU '${proposal.sbu}'. Please configure workflow levels in Admin settings.`);
      }
      const activeL1 = activeLevels.find((l) => l.level_id === 1 && l.is_active) || activeLevels[0];
      const isL1PO = activeL1 ? isProjectOwnerStage(activeL1) : false;

      if (isL1PO && !isValidEmail(proposal.owner_email)) {
        throw new Error(`Cannot route to Project Owner: Proposal Owner Email ('${proposal.owner_email || ""}') is missing or invalid.`);
      }

      nextRole = activeL1 ? activeL1.role_title : "L1 Approver";
      nextEmail = isL1PO ? (proposal.owner_email || "") : (activeL1 ? (activeL1.approver_email || "") : "");
    }

    const updatedProposal: ICERProposal = {
      ...proposal,
      status: nextStatus,
      current_level: nextLevel,
      pending_with_role: nextRole,
      pending_with_email: nextEmail,
      modified_date: now,
      modified_by: user.name,
      revision_count: (original.revision_count || 0) + 1,
    };

    // Find SharePoint Item ID in CER_Proposals
    const existingItems = await this._sp.getListItems<{ Id: number }>("CER_Proposals", {
      filter: `cerprno eq '${proposal.cerprno}'`,
      select: "Id",
      top: 1,
    });

    if (existingItems.length === 0) {
      throw new Error(`Cannot update proposal '${proposal.cerprno}': Proposal record was not found in SharePoint CER_Proposals list.`);
    }

    const spItemId = existingItems[0].Id;
    const payload = this._mapProposalToSharePointItem(updatedProposal);

    // Primary write: Update proposal in CER_Proposals
    try {
      await this._sp.updateListItem("CER_Proposals", spItemId, payload);
    } catch (saveErr) {
      console.error("[SharePointCERDataService] Failed to update CER proposal in SharePoint:", saveErr);
      throw new Error(
        `Unable to save the CER to SharePoint. No successful save could be confirmed. Please verify the proposal before retrying. (Details: ${saveErr instanceof Error ? saveErr.message : String(saveErr)})`,
      );
    }

    // Secondary write: Write each delta row to CER_AuditTrail
    for (const record of auditRecords) {
      try {
        await this._createAuditRecord(record);
      } catch (auditErr) {
        console.warn(`[SharePointCERDataService] Secondary audit write warning for ${record.field_name}:`, auditErr);
      }
    }

    // Secondary write: If remarks changed, write new version to CER_RemarksHistory
    if (proposal.remarks !== original.remarks && proposal.remarks.trim()) {
      try {
        const nextVersion = (original.revision_count || 1) + 1;
        await this._createRemarksRecord(proposal.cerprno, nextVersion, proposal.remarks, user.name);
      } catch (remarksErr) {
        console.warn("[SharePointCERDataService] Secondary remarks write warning:", remarksErr);
      }
    }

    // Secondary write: Write notification to CER_Notifications
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

    return {
      success: true,
      message: isDraft
        ? "Proposal draft updated successfully"
        : "Proposal updated and workflow re-triggered successfully",
      proposal: updatedProposal,
      auditRowsCount: auditRecords.length,
    };
  }

  // ---------------------------------------------------------------------------
  // 2. CER_AuditTrail Operations
  // ---------------------------------------------------------------------------

  public async getAuditTrail(cerprno?: string): Promise<ICERAuditRecord[]> {
    try {
      const items = await this._sp.getListItems<Record<string, any>>("CER_AuditTrail", {
        filter: cerprno ? `cerprno eq '${cerprno}'` : undefined,
        top: 500,
        orderby: "Created desc",
      });

      return items.map((item) => ({
        id: String(item.Id || item.id),
        cerprno: item.cerprno || item.Title || "",
        field_name: item.field_name || "",
        field_desc: item.field_desc || AUDIT_FIELD_DESCRIPTIONS[item.field_name] || item.field_name,
        old_value: item.old_value || "",
        new_value: item.new_value || "",
        user_name: item.user_name || "",
        user_email: item.user_email || "",
        audit_date: item.audit_date || "",
        audit_time: item.audit_time || "",
        timestamp: item.timestamp || item.Created || new Date().toISOString(),
        is_long_text: !!item.is_long_text,
      }));
    } catch (e) {
      console.error("[SharePointCERDataService] Error querying CER_AuditTrail from SharePoint:", e);
      throw new Error(
        `Unable to load audit trail from SharePoint: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private async _createAuditRecord(record: ICERAuditRecord): Promise<void> {
    try {
      await this._sp.createListItem("CER_AuditTrail", {
        Title: record.cerprno,
        cerprno: record.cerprno,
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
      });
    } catch (e) {
      // non-blocking
    }
  }

  // ---------------------------------------------------------------------------
  // 3. CER_RemarksHistory Operations
  // ---------------------------------------------------------------------------

  public async getRemarksHistory(cerprno: string): Promise<ICERRemarksVersion[]> {
    try {
      const items = await this._sp.getListItems<Record<string, any>>("CER_RemarksHistory", {
        filter: `cerprno eq '${cerprno}'`,
        top: 100,
        orderby: "Created desc",
      });

      return items.map((item) => ({
        id: String(item.Id || item.id),
        cerprno: item.cerprno || item.Title,
        version: Number(item.version || 1),
        remarks_text: item.remarks_text || "",
        remarks_type: item.remarks_type || "REMARKS",
        word_count: Number(item.word_count || (item.remarks_text ? item.remarks_text.split(/\s+/).filter(Boolean).length : 0)),
        created_by: item.created_by_user || item.Author?.Title || "System User",
        created_date: item.revision_date || item.Created || new Date().toISOString(),
      }));
    } catch (e) {
      console.error("[SharePointCERDataService] Error querying CER_RemarksHistory from SharePoint:", e);
      throw new Error(`Unable to load remarks history from SharePoint: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  private async _createRemarksRecord(
    cerprno: string,
    version: number,
    remarksText: string,
    createdBy: string,
  ): Promise<void> {
    try {
      await this._sp.createListItem("CER_RemarksHistory", {
        Title: cerprno,
        cerprno: cerprno,
        version: version,
        remarks_text: remarksText,
        remarks_type: "REMARKS",
        word_count: remarksText.split(/\s+/).filter(Boolean).length,
        created_by_user: createdBy,
        revision_date: new Date().toISOString(),
      });
    } catch (e) {
      // non-blocking
    }
  }

  // ---------------------------------------------------------------------------
  // 4. CER_WorkflowLevels Operations
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
        let items: Record<string, any>[] = [];
        try {
          items = await this._sp.getListItems<Record<string, any>>("CER_WorkflowLevels", {
            select: "Id,ID,Title,level_id,level_name,role_title,sbu,is_active,created_by,created_date,Created,assignment_type",
            top: 50,
            orderby: "level_id asc",
          });
        } catch {
          try {
            // Fallback 1: assignment_type does not exist
            items = await this._sp.getListItems<Record<string, any>>("CER_WorkflowLevels", {
              select: "Id,ID,Title,level_id,level_name,role_title,sbu,is_active,created_by,created_date,Created",
              top: 50,
              orderby: "level_id asc",
            });
          } catch {
            try {
              // Fallback 2: is_active does not exist, but assignment_type might
              items = await this._sp.getListItems<Record<string, any>>("CER_WorkflowLevels", {
                select: "Id,ID,Title,level_id,level_name,role_title,sbu,created_by,created_date,Created,assignment_type",
                top: 50,
                orderby: "level_id asc",
              });
            } catch {
              // Fallback 3: Standard baseline documented schema (both is_active and assignment_type absent)
              items = await this._sp.getListItems<Record<string, any>>("CER_WorkflowLevels", {
                select: "Id,ID,Title,level_id,level_name,role_title,sbu,created_by,created_date,Created",
                top: 50,
                orderby: "level_id asc",
              });
            }
          }
        }

        if (items.length === 0) {
          this._cachedWorkflowLevels.set(cacheKey, { data: [], timestamp: Date.now() });
          return [];
        }

        // Fetch user roles to dynamically resolve approvers from CER_UserRoles (reuses cached/in-flight roles)
        let approverRoles: IUserRoleAssignment[] = [];
        try {
          approverRoles = await this.getUserRoles(forceRefresh);
        } catch {
          // non-blocking
        }

        const allLevels: IWorkflowLevel[] = items.map((item: any) => {
          const lid = Number(item.level_id || 1);
          const rawAssignmentType = item.assignment_type as ApproverAssignmentType | undefined;
          const lvlObj = {
            role_title: item.role_title || "",
            level_name: item.level_name || item.Title || `Level ${lid}`,
            assignment_type: rawAssignmentType,
          };
          const isPO = isProjectOwnerStage(lvlObj);
          const assignmentType: ApproverAssignmentType = rawAssignmentType || (isPO ? "ProjectOwnerAuto" : "SpecificUser");

          // Dynamically match approver from CER_UserRoles by approval_level only if NOT Project Owner stage
          const matchedUser = !isPO
            ? approverRoles.find(
                (u) =>
                  u.is_active &&
                  u.role === "Approver" &&
                  u.approval_level === lid
              )
            : undefined;

          return {
            id: String(item.ID !== undefined ? item.ID : item.Id !== undefined ? item.Id : item.id || Date.now()),
            level_id: lid,
            level_name: lvlObj.level_name,
            role_title: lvlObj.role_title,
            sbu: item.sbu || "",
            is_active: item.is_active !== undefined ? !!item.is_active : true,
            assignment_type: assignmentType,
            is_project_owner_stage: isPO,
            created_by: matchedUser ? matchedUser.user_name : (item.created_by || item.Author?.Title || ""),
            created_date: item.created_date || item.Created || "",
            approver_name: isPO ? "Project Owner (Auto-fetched from CER Proposal)" : (matchedUser ? matchedUser.user_name : ""),
            approver_email: isPO ? "" : (matchedUser ? matchedUser.user_email : ""),
          };
        });

        // Filter by exact SBU if requested, sorted by level_id asc
        const filteredLevels = sbu
          ? allLevels.filter(
              (lvl) =>
                lvl.sbu && lvl.sbu.toLowerCase() === sbu.trim().toLowerCase()
            ).sort((a, b) => a.level_id - b.level_id)
          : allLevels.sort((a, b) => {
              const sbuComp = (a.sbu || "").localeCompare(b.sbu || "");
              if (sbuComp !== 0) return sbuComp;
              return a.level_id - b.level_id;
            });

        this._cachedWorkflowLevels.set(cacheKey, { data: filteredLevels, timestamp: Date.now() });
        return filteredLevels;
      } catch (e) {
        console.error("[SharePointCERDataService] Error querying CER_WorkflowLevels from SharePoint:", e);
        throw new Error(`Unable to load workflow levels from SharePoint: ${e instanceof Error ? e.message : String(e)}`);
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
    try {
      // 1. Fetch all existing items from CER_WorkflowLevels with sbu to prevent cross-SBU collision
      const existingRaw = await this._sp.getListItems<{ Id?: number; ID?: number; level_id: number; sbu?: string }>("CER_WorkflowLevels", {
        select: "Id,ID,level_id,sbu",
        top: 100,
      });

      const existingItems = existingRaw.map((item: any) => ({
        Id: Number(item.Id !== undefined ? item.Id : item.ID),
        level_id: Number(item.level_id),
        sbu: String(item.sbu || "").trim(),
      }));

      const usedSpIds = new Set<number>();

      // 2. Insert or update each level
      for (const lvl of levels) {
        const assignmentType: ApproverAssignmentType = lvl.assignment_type || (isProjectOwnerStage(lvl) ? "ProjectOwnerAuto" : "SpecificUser");
        const cleanPayload = {
          Title: lvl.level_name || `Level ${lvl.level_id}`,
          level_id: Number(lvl.level_id),
          level_name: lvl.level_name,
          role_title: lvl.role_title,
          sbu: (lvl.sbu || "").trim(),
          is_active: lvl.is_active !== undefined ? Boolean(lvl.is_active) : true,
          assignment_type: assignmentType,
        };

        // Match existing item by SharePoint Id first, or by sbu + level_id
        let targetSpId: number | undefined;
        if (lvl.id && !isNaN(Number(lvl.id))) {
          const matchById = existingItems.find(
            (item) => item.Id === Number(lvl.id) && !usedSpIds.has(item.Id)
          );
          if (matchById) {
            targetSpId = matchById.Id;
          }
        }
        if (!targetSpId) {
          const matchBySbuAndLevel = existingItems.find(
            (item) =>
              item.sbu.toLowerCase() === cleanPayload.sbu.toLowerCase() &&
              item.level_id === Number(lvl.level_id) &&
              !usedSpIds.has(item.Id)
          );
          if (matchBySbuAndLevel) {
            targetSpId = matchBySbuAndLevel.Id;
          }
        }

        if (targetSpId) {
          usedSpIds.add(targetSpId);
          try {
            await this._sp.updateListItem("CER_WorkflowLevels", targetSpId, cleanPayload);
          } catch (updateErr: any) {
            const errStr = String(updateErr?.message || "").toLowerCase();
            if (errStr.includes("assignment_type") || errStr.includes("is_active") || errStr.includes("does not exist") || errStr.includes("invalid field")) {
              const fallbackPayload: Record<string, any> = { ...cleanPayload };
              delete fallbackPayload.assignment_type;
              delete fallbackPayload.is_active;
              await this._sp.updateListItem("CER_WorkflowLevels", targetSpId, fallbackPayload);
            } else {
              throw updateErr;
            }
          }
        } else {
          // New level to create
          const newId = await this._createWorkflowLevelRecord(cleanPayload);
          if (newId) {
            usedSpIds.add(newId);
          }
        }
      }

      // 3. Delete any obsolete items from CER_WorkflowLevels that are no longer in levels
      for (const item of existingItems) {
        if (!usedSpIds.has(item.Id)) {
          try {
            await this._sp.deleteListItem("CER_WorkflowLevels", item.Id);
          } catch (delErr) {
            console.warn(`[SharePointCERDataService] Obsolete workflow level ${item.Id} deletion warning:`, delErr);
          }
        }
      }
    } catch (e) {
      console.error("[SharePointCERDataService] Error saving workflow levels to SharePoint:", e);
      throw e;
    }
  }

  private async _createWorkflowLevelRecord(payload: Record<string, any>): Promise<number | undefined> {
    const cleanPayload = {
      Title: payload.Title,
      level_id: Number(payload.level_id),
      level_name: payload.level_name,
      role_title: payload.role_title,
      sbu: payload.sbu || "",
      is_active: payload.is_active !== undefined ? Boolean(payload.is_active) : true,
      assignment_type: payload.assignment_type || (isProjectOwnerStage(payload) ? "ProjectOwnerAuto" : "SpecificUser"),
    };

    try {
      const created = await this._sp.createListItem<{ Id: number }>("CER_WorkflowLevels", cleanPayload);
      return created.Id;
    } catch (err: any) {
      const errStr = String(err?.message || "").toLowerCase();
      if (errStr.includes("assignment_type") || errStr.includes("is_active") || errStr.includes("does not exist") || errStr.includes("invalid field")) {
        const fallbackPayload: Record<string, any> = { ...cleanPayload };
        delete fallbackPayload.assignment_type;
        delete fallbackPayload.is_active;
        const created = await this._sp.createListItem<{ Id: number }>("CER_WorkflowLevels", fallbackPayload);
        return created.Id;
      }
      console.error("[SharePointCERDataService] Failed to create workflow level item in SharePoint:", err);
      throw err;
    }
  }

  // ---------------------------------------------------------------------------
  // 5. CER_ApprovalDecisions Operations
  // ---------------------------------------------------------------------------

  public async getApprovalDecisions(cerprno: string): Promise<IApprovalDecision[]> {
    try {
      const items = await this._sp.getListItems<Record<string, any>>("CER_ApprovalDecisions", {
        filter: `cerprno eq '${cerprno}'`,
        top: 100,
        orderby: "Created desc",
      });

      return items.map((item) => ({
        id: String(item.Id || item.id),
        cerprno: item.cerprno || item.Title,
        level_id: Number(item.level_id || 1),
        level_name: item.level_name || `Level ${item.level_id}`,
        approver_name: item.approver_name || "",
        approver_email: item.approver_email || "",
        decision: item.decision as "APPROVED" | "REJECTED",
        comments: item.comments || "",
        decision_date: item.decision_date || item.Created || new Date().toISOString(),
        timestamp: item.decision_date || item.Created || new Date().toISOString(),
      }));
    } catch (e) {
      console.error("[SharePointCERDataService] Error querying CER_ApprovalDecisions from SharePoint:", e);
      throw new Error(`Unable to load approval decisions from SharePoint: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  public async recordDecision(params: {
    cerprno: string;
    level_id: number;
    approver_name: string;
    approver_email: string;
    decision: "APPROVED" | "REJECTED";
    comments: string;
  }): Promise<{ success: boolean; newStatus: string; nextLevel: number }> {
    const now = new Date().toISOString();

    // Enterprise RBAC: Segregation of Duties - Initiator/Owner CANNOT approve their own CER
    const existingProposal = await this.getProposalByNumber(params.cerprno);
    if (!existingProposal) {
      throw new Error(`Cannot record decision: Proposal '${params.cerprno}' not found in SharePoint CER_Proposals list.`);
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

    // Check if the actor is an Administrator
    let isUserAdmin = false;
    try {
      const userRoles = await this.getUserRoles();
      isUserAdmin = userRoles.some(
        (r) => r.is_active && r.role === "Admin" && r.user_email.toLowerCase() === approverEmail
      );
    } catch {
      // non-blocking
    }

    if (isCurrentPO) {
      // Must be designated Project Owner (or Admin)
      if (!isOwner && !isUserAdmin) {
        throw new Error(
          `Access Denied: Only the designated Project Owner (${existingProposal.owname || existingProposal.owner_email}) or an Administrator can approve this stage.`
        );
      }
    } else {
      // Non-Project Owner stage: Segregation of Duties strictly enforced
      if (isOwner && !isUserAdmin) {
        throw new Error("Segregation of Duties Enforcement: You cannot approve a CER proposal that you initiated.");
      }
    }

    // 1. Fetch current proposal item to retrieve SBU and Creator email
    const propItems = await this._sp.getListItems<{ Id: number; sbu?: string; owner_email?: string }>("CER_Proposals", {
      filter: `cerprno eq '${params.cerprno}'`,
      top: 1,
    });

    if (propItems.length === 0) {
      throw new Error(`Cannot record decision: Proposal '${params.cerprno}' not found in SharePoint CER_Proposals list.`);
    }

    const propItem = propItems[0];
    const spId = propItem.Id;
    const creatorEmail = (propItem?.owner_email || "").trim();

    // 2. Fetch prior approval decisions to obtain all previous approvers' emails
    let priorEmails: string[] = [];
    try {
      const priorDecisions = await this.getApprovalDecisions(params.cerprno);
      priorEmails = priorDecisions.map((d) => (d.approver_email || "").trim()).filter(Boolean);
    } catch (pErr) {
      console.warn("[SharePointCERDataService] Failed to load prior approval decisions for notification recipients:", pErr);
    }

    // 3. Primary write 1: Post decision record to CER_ApprovalDecisions
    try {
      await this._sp.createListItem("CER_ApprovalDecisions", {
        Title: `${params.cerprno}-L${params.level_id}`,
        cerprno: params.cerprno,
        level_id: params.level_id,
        level_name: `Level ${params.level_id}`,
        approver_name: params.approver_name,
        approver_email: params.approver_email,
        decision: params.decision,
        comments: params.comments || "",
        decision_date: now,
      });
    } catch (decisionErr) {
      console.error("[SharePointCERDataService] Failed to record decision in CER_ApprovalDecisions:", decisionErr);
      throw new Error(
        `Unable to save approval decision to SharePoint. No successful save could be confirmed. Please verify the proposal before retrying. (Details: ${decisionErr instanceof Error ? decisionErr.message : String(decisionErr)})`,
      );
    }

    // 4. Determine workflow outcome using SBU-routed sequential active levels
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

    // 5. Primary write 2: Update proposal item in CER_Proposals
    try {
      await this._sp.updateListItem("CER_Proposals", spId, {
        status: newStatus,
        current_level: nextLevel,
        pending_with_role: nextRole,
        pending_with_email: nextEmail,
        modified_date: now,
        modified_by: params.approver_name,
      });
    } catch (updateErr) {
      console.error("[SharePointCERDataService] Primary decision was recorded, but updating CER_Proposals status failed:", updateErr);
      throw new Error(
        `Approval decision was recorded, but updating proposal status failed in SharePoint. Please check proposal status before retrying. (Details: ${updateErr instanceof Error ? updateErr.message : String(updateErr)})`,
      );
    }

    // 6. Gather attachments for email notification summary (secondary write)
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

    // 7. Deduplicate recipients: (1) Creator, (2) Previous Approvers, (3) Next Approver
    const rawRecipients = [creatorEmail, ...priorEmails, params.approver_email, nextEmail].filter(Boolean);
    const notificationRecipients = Array.from(new Set(rawRecipients.map((e) => e.trim().toLowerCase())));

    const subject = params.decision === "APPROVED"
      ? (newStatus === "Approved"
          ? `[CER Final Sanction] Proposal ${params.cerprno} Approved at Final Level ${params.level_id}`
          : `[CER Approved Level ${params.level_id}] Proposal ${params.cerprno} Advanced to Level ${nextLevel}`)
      : `[CER Rejected] Proposal ${params.cerprno} Rejected at Level ${params.level_id}`;

    const bodyText = params.decision === "APPROVED"
      ? (newStatus === "Approved"
          ? `Proposal ${params.cerprno} has received final executive sanction by ${params.approver_name}. Decision: ${params.decision}. Comments: "${params.comments}".${attachmentsSummary}`
          : `Proposal ${params.cerprno} approved at Level ${params.level_id} by ${params.approver_name}. Comments: "${params.comments}". Proposal is now pending action from ${nextRole} (${nextEmail}).${attachmentsSummary}`)
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

    return {
      success: true,
      newStatus,
      nextLevel,
    };
  }

  // ---------------------------------------------------------------------------
  // 6. CER_Attachments Operations (Document Library)
  // ---------------------------------------------------------------------------

  public async getAttachments(cerprno: string): Promise<ICERAttachment[]> {
    try {
      const items = await this._sp.getListItems<Record<string, any>>("CER_Attachments", {
        filter: `cerprno eq '${cerprno}'`,
        select: "Id,FileLeafRef,FileRef,cerprno,uploaded_by,file_size,file_type,Created,File/ServerRelativeUrl,File/Length",
        expand: "File",
        top: 100,
      });

      return items.map((item) => ({
        id: String(item.Id || item.id),
        cerprno: item.cerprno || cerprno,
        name: item.FileLeafRef || item.File?.Name || "document",
        size: Number(item.file_size || item.File?.Length || 0),
        type: item.file_type || "application/octet-stream",
        data_url: item.File?.ServerRelativeUrl || item.FileRef || "",
        uploaded_by: item.uploaded_by || "User",
        uploaded_date: item.Created || new Date().toISOString(),
      }));
    } catch (e) {
      console.error("[SharePointCERDataService] Error querying CER_Attachments from SharePoint:", e);
      throw new Error(`Unable to load attachments for CER '${cerprno}' from SharePoint: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  public async addAttachment(attachment: ICERAttachment): Promise<void> {
    const existing = await this.getAttachments(attachment.cerprno);
    const existingSize = existing.reduce((sum, a) => sum + (a.size || 0), 0);

    const validation = validateAttachment(
      attachment,
      existingSize,
      existing.map((a) => a.name),
    );
    if (!validation.isValid) {
      throw new Error(`[SharePoint Attachment Policy Violation] ${validation.error}`);
    }

    try {
      // If we have base64 or binary data, upload directly to CER_Attachments Document Library
      if (attachment.data_url && attachment.data_url.indexOf("data:") === 0) {
        const buffer = this._base64ToArrayBuffer(attachment.data_url);
        const fileName = `${attachment.cerprno}_${Date.now()}_${attachment.name}`;
        await this._sp.uploadFileToLibrary("CER_Attachments", fileName, buffer, {
          cerprno: attachment.cerprno,
          uploaded_by: attachment.uploaded_by,
          file_size: attachment.size,
          file_type: attachment.type,
        });
      }
    } catch (e) {
      console.error("[SharePointCERDataService] Failed to upload attachment to CER_Attachments library:", e);
      throw new Error(
        `Unable to save attachment '${attachment.name}' to SharePoint CER_Attachments library: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  public async deleteAttachment(id: string): Promise<void> {
    try {
      if (/^\d+$/.test(id)) {
        await this._sp.deleteListItem("CER_Attachments", id);
      }
    } catch (e) {
      console.error("[SharePointCERDataService] Error deleting attachment from SharePoint:", e);
      throw new Error(
        `Unable to delete attachment with ID '${id}' from SharePoint CER_Attachments library: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  // ---------------------------------------------------------------------------
  // 7. CER_Notifications Operations
  // ---------------------------------------------------------------------------

  public async getNotificationLogs(cerprno?: string): Promise<INotificationLog[]> {
    try {
      const items = await this._sp.getListItems<Record<string, any>>("CER_Notifications", {
        filter: cerprno ? `cerprno eq '${cerprno}'` : undefined,
        top: 100,
        orderby: "Created desc",
      });

      return items.map((item) => ({
        id: String(item.Id || item.id),
        cerprno: item.cerprno || item.Title,
        recipients: item.recipients ? item.recipients.split(";").map((s: string) => s.trim()) : [],
        subject: item.subject || "",
        body: item.body || "",
        attachments_count: Number(item.attachments_count || 0),
        timestamp: item.dispatch_timestamp || item.timestamp || item.Created || new Date().toISOString(),
        status: (item.status as "SENT" | "PENDING" | "FAILED") || "SENT",
      }));
    } catch (e) {
      console.error("[SharePointCERDataService] Error querying CER_Notifications from SharePoint:", e);
      throw new Error(
        `Unable to load notification logs from SharePoint: ${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  private async _createNotificationRecord(
    cerprno: string,
    recipients: string[],
    subject: string,
    body: string,
    attachmentsCount: number,
  ): Promise<void> {
    try {
      await this._sp.createListItem("CER_Notifications", {
        Title: cerprno,
        cerprno: cerprno,
        recipients: recipients.join("; "),
        subject: subject,
        body: body,
        attachments_count: attachmentsCount,
        dispatch_timestamp: new Date().toISOString(),
        status: "SENT",
      });
    } catch (e) {
      // non-blocking
    }
  }

  // ---------------------------------------------------------------------------
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
    return {
      id: String(item.Id || item.id),
      cerprno: item.cerprno || item.Title,
      pr_name: item.pr_name || "",
      owname: item.owname || item.ownname || "",
      owner_email: item.owner_email || "",
      sbu: item.sbu || "RJ North",
      status: item.status || "In Approval",
      object: item.object || "",
      amount: Number(item.amount || 0),
      currency: item.currency || "USD",
      cat: item.cat || "Vital",
      payable: item.payable || "Payback",
      period: item.period || "",
      payback_quarters: item.payback_quarters !== undefined && item.payback_quarters !== null ? Number(item.payback_quarters) : 4,
      ben_npv: Number(item.ben_npv || 0),
      ben_irr: Number(item.ben_irr || 0),
      cost_assumptions: item.cost_assumptions || "",
      st_date: item.st_date ? String(item.st_date).split("T")[0] : "",
      com_date: item.com_date ? String(item.com_date).split("T")[0] : "",
      duration_months: Number(item.duration_months || 0),
      cbudget: item.cbudget || "Yes",
      cb_amnt: Number(item.cb_amnt || 0),
      cb_currency: item.cb_currency || "USD",
      reason: item.reason || "",
      jv: item.jv || "No",
      jv_recoverable: item.jv_recoverable || "No",
      jv_cost: Number(item.jv_cost || 0),
      jv_budget: item.jv_budget || "No",
      jv_amnt: Number(item.jv_amnt || 0),
      jv_reason: item.jv_reason || "",
      ph_till_label: item.ph_till_label || getCurrentFiscalYearPhasingLabels(item.Created ? new Date(item.Created) : (item.created_date ? new Date(item.created_date) : new Date())).ph_till_label,
      ph_fy_label: item.ph_fy_label || getCurrentFiscalYearPhasingLabels(item.Created ? new Date(item.Created) : (item.created_date ? new Date(item.created_date) : new Date())).ph_fy_label,
      ph_beyond_label: item.ph_beyond_label || getCurrentFiscalYearPhasingLabels(item.Created ? new Date(item.Created) : (item.created_date ? new Date(item.created_date) : new Date())).ph_beyond_label,
      prod_till: Number(item.prod_till || 0),
      prod_fy: Number(item.prod_fy || 0),
      prod_beyond: Number(item.prod_beyond || 0),
      capex_till: Number(item.capex_till || 0),
      capex_fy: Number(item.capex_fy || 0),
      capex_beyond: Number(item.capex_beyond || 0),
      opex_till: Number(item.opex_till || 0),
      opex_fy: Number(item.opex_fy || 0),
      opex_beyond: Number(item.opex_beyond || 0),
      engineer: Number(item.engineer || 0),
      s_fac: Number(item.s_fac || 0),
      comis: Number(item.comis || 0),
      preop: Number(item.preop || 0),
      others: Number(item.others || 0),
      total: Number(item.total || 0),
      remarks: item.remarks || "",
      remarks_jv: item.remarks_jv || "",
      current_level: Number(item.current_level || 1),
      pending_with_role: item.pending_with_role || "L1 - Technical Review",
      pending_with_email: item.pending_with_email || "",
      created_date: item.Created || new Date().toISOString(),
      created_by: item.Author?.Title || "System",
      modified_date: item.Modified || new Date().toISOString(),
      modified_by: item.Editor?.Title || "System",
      revision_count: Number(item.revision_count || 0),
    };
  }

  private _mapProposalToSharePointItem(proposal: ICERProposal): any {
    const formatIsoDate = (val?: string) => {
      if (!val) return null;
      if (val.indexOf("T") !== -1) return val;
      return `${val}T00:00:00Z`;
    };

    return {
      Title: proposal.cerprno,
      cerprno: proposal.cerprno,
      pr_name: proposal.pr_name,
      owname: proposal.owname,
      owner_email: proposal.owner_email,
      sbu: proposal.sbu,
      status: proposal.status,
      object: proposal.object,
      amount: Number(proposal.amount || 0),
      currency: proposal.currency || "USD",
      cat: proposal.cat || "Vital",
      payable: proposal.payable || "Payback",
      period: proposal.period,
      payback_quarters: proposal.payback_quarters !== undefined && proposal.payback_quarters !== null ? Number(proposal.payback_quarters) : null,
      ben_npv: proposal.ben_npv !== undefined && proposal.ben_npv !== null ? Number(proposal.ben_npv) : null,
      ben_irr: proposal.ben_irr !== undefined && proposal.ben_irr !== null ? Number(proposal.ben_irr) : null,
      cost_assumptions: proposal.cost_assumptions,
      st_date: formatIsoDate(proposal.st_date),
      com_date: formatIsoDate(proposal.com_date),
      duration_months: proposal.duration_months !== undefined && proposal.duration_months !== null ? Number(proposal.duration_months) : null,
      cbudget: proposal.cbudget || "Yes",
      cb_amnt: proposal.cb_amnt !== undefined && proposal.cb_amnt !== null ? Number(proposal.cb_amnt) : null,
      cb_currency: proposal.cb_currency || undefined,
      reason: proposal.reason,
      jv: proposal.jv || "No",
      jv_recoverable: proposal.jv_recoverable || "No",
      jv_cost: proposal.jv_cost !== undefined && proposal.jv_cost !== null ? Number(proposal.jv_cost) : null,
      jv_budget: proposal.jv_budget || "No",
      jv_amnt: proposal.jv_amnt !== undefined && proposal.jv_amnt !== null ? Number(proposal.jv_amnt) : null,
      jv_reason: proposal.jv_reason,
      ph_till_label: proposal.ph_till_label || getCurrentFiscalYearPhasingLabels().ph_till_label,
      ph_fy_label: proposal.ph_fy_label || getCurrentFiscalYearPhasingLabels().ph_fy_label,
      ph_beyond_label: proposal.ph_beyond_label || getCurrentFiscalYearPhasingLabels().ph_beyond_label,
      prod_till: Number(proposal.prod_till || 0),
      prod_fy: Number(proposal.prod_fy || 0),
      prod_beyond: Number(proposal.prod_beyond || 0),
      capex_till: Number(proposal.capex_till || 0),
      capex_fy: Number(proposal.capex_fy || 0),
      capex_beyond: Number(proposal.capex_beyond || 0),
      opex_till: Number(proposal.opex_till || 0),
      opex_fy: Number(proposal.opex_fy || 0),
      opex_beyond: Number(proposal.opex_beyond || 0),
      engineer: Number(proposal.engineer || 0),
      s_fac: Number(proposal.s_fac || 0),
      comis: Number(proposal.comis || 0),
      preop: Number(proposal.preop || 0),
      others: Number(proposal.others || 0),
      total: Number(proposal.total || 0),
      remarks: proposal.remarks,
      remarks_jv: proposal.remarks_jv,
      current_level: Number(proposal.current_level || 1),
      pending_with_role: proposal.pending_with_role,
      pending_with_email: proposal.pending_with_email,
      revision_count: Number(proposal.revision_count || 0),
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
          const email = item.EntityData?.Email || (item.Description && item.Description.includes("@") ? item.Description : "");
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
    const now = Date.now();
    const CACHE_TTL_MS = 30000;

    if (!forceRefresh && this._cachedUserRoles && (now - this._cachedUserRolesTimestamp < CACHE_TTL_MS)) {
      return [...this._cachedUserRoles];
    }

    if (!forceRefresh && this._inFlightUserRoles) {
      const res = await this._inFlightUserRoles;
      return [...res];
    }

    this._inFlightUserRoles = (async () => {
      try {
        let items: Record<string, any>[] = [];
        try {
          items = await this._sp.getListItems<Record<string, any>>("CER_UserRoles", {
            select: "Id,ID,Title,user_email,login_name,role,approval_level,department,sbu,is_active,assigned_by,assigned_date,Created",
            top: 500,
          });
        } catch {
          // Fallback if is_active or sbu column is not in SharePoint list schema
          items = await this._sp.getListItems<Record<string, any>>("CER_UserRoles", {
            select: "Id,ID,Title,user_email,login_name,role,approval_level,department,assigned_by,assigned_date,Created",
            top: 500,
          });
        }

        const list = items.map((item: any) => ({
          id: String(item.ID !== undefined ? item.ID : item.Id !== undefined ? item.Id : item.id || Date.now()),
          user_name: item.Title || item.user_name || "",
          user_email: item.user_email || "",
          login_name: item.login_name || item.user_email || "",
          role: item.role || "Initiator",
          approval_level: item.approval_level ? Number(item.approval_level) : undefined,
          department: item.department || "",
          sbu: item.sbu || "",
          is_active: item.is_active !== undefined ? !!item.is_active : true,
          assigned_by: item.assigned_by || "System Administrator",
          assigned_date: item.assigned_date || item.Created || new Date().toISOString(),
        }));
        list.sort((a: IUserRoleAssignment, b: IUserRoleAssignment) => new Date(b.assigned_date).getTime() - new Date(a.assigned_date).getTime());
        
        this._cachedUserRoles = list;
        this._cachedUserRolesTimestamp = Date.now();
        return list;
      } catch (e) {
        console.error("[SharePointCERDataService] Querying CER_UserRoles failed:", e);
        throw new Error(`Unable to load user roles from SharePoint: ${e instanceof Error ? e.message : String(e)}`);
      } finally {
        this._inFlightUserRoles = null;
      }
    })();

    const result = await this._inFlightUserRoles;
    return [...result];
  }

  public async assignUserRole(
    assignment: Omit<IUserRoleAssignment, "id">,
    actor: { name: string; email: string }
  ): Promise<IUserRoleAssignment> {
    this.clearCache();
    try {
      const payload = {
        Title: assignment.user_name,
        user_email: assignment.user_email,
        login_name: assignment.login_name,
        role: assignment.role,
        approval_level: assignment.approval_level || null,
        department: assignment.department || "",
        sbu: assignment.sbu || "",
        is_active: assignment.is_active,
        assigned_by: actor.name,
        assigned_date: new Date().toISOString(),
      };

      let res: { Id?: number; ID?: number };
      try {
        res = await this._sp.createListItem<{ Id?: number; ID?: number }>("CER_UserRoles", payload);
      } catch (createErr: any) {
        const errStr = String(createErr?.message || "").toLowerCase();
        if (errStr.includes("is_active") || errStr.includes("sbu") || errStr.includes("does not exist") || errStr.includes("invalid field")) {
          const fallbackPayload: Record<string, any> = { ...payload };
          delete fallbackPayload.is_active;
          delete fallbackPayload.sbu;
          res = await this._sp.createListItem<{ Id?: number; ID?: number }>("CER_UserRoles", fallbackPayload);
        } else {
          throw createErr;
        }
      }
      const created: IUserRoleAssignment = {
        ...assignment,
        id: String(res.ID !== undefined ? res.ID : res.Id !== undefined ? res.Id : Date.now()),
        assigned_by: actor.name,
        assigned_date: payload.assigned_date,
      };

      try {
        await this.logAdminAudit({
          actor_name: actor.name,
          actor_email: actor.email,
          action: "ROLE_ASSIGNED",
          target_type: "USER",
          target_id: created.id,
          details: `Assigned role '${created.role}' to ${created.user_name} (${created.user_email})${created.approval_level ? ` with Approval Level ${created.approval_level}` : ""}.`,
          after_value: JSON.stringify(created),
          timestamp: new Date().toISOString(),
        });
      } catch {
        // ignore audit logging error if CER_AdminAuditLog is not provisioned
      }

      return created;
    } catch (e) {
      console.error("[SharePointCERDataService] assignUserRole failed in SharePoint:", e);
      throw new Error(`Unable to assign user role to '${assignment.user_name}' in SharePoint CER_UserRoles list: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  public async updateUserRole(
    assignment: IUserRoleAssignment,
    actor: { name: string; email: string }
  ): Promise<void> {
    this.clearCache();
    try {
      const payload = {
        Title: assignment.user_name,
        user_email: assignment.user_email,
        login_name: assignment.login_name,
        role: assignment.role,
        approval_level: assignment.approval_level || null,
        department: assignment.department || "",
        sbu: assignment.sbu || "",
        is_active: assignment.is_active,
      };

      await this._sp.updateListItem("CER_UserRoles", assignment.id, payload);

      try {
        await this.logAdminAudit({
          actor_name: actor.name,
          actor_email: actor.email,
          action: assignment.is_active ? "ROLE_UPDATED" : "ROLE_STATUS_TOGGLED",
          target_type: "USER",
          target_id: assignment.id,
          details: `Updated role assignment for ${assignment.user_name}. Active: ${assignment.is_active}, Role: ${assignment.role}.`,
          after_value: JSON.stringify(assignment),
          timestamp: new Date().toISOString(),
        });
      } catch {
        // ignore audit logging error if CER_AdminAuditLog is not provisioned
      }
      return;
    } catch (e) {
      console.error("[SharePointCERDataService] updateUserRole failed in SharePoint:", e);
      throw new Error(`Unable to update user role for '${assignment.user_name}' in SharePoint CER_UserRoles list: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  public async revokeUserRole(
    assignmentId: string,
    actor: { name: string; email: string }
  ): Promise<void> {
    this.clearCache();
    try {
      await this._sp.deleteListItem("CER_UserRoles", assignmentId);

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
        // ignore audit logging error if CER_AdminAuditLog is not provisioned
      }
      return;
    } catch (e) {
      console.error("[SharePointCERDataService] revokeUserRole failed in SharePoint:", e);
      throw new Error(`Unable to revoke user role assignment '${assignmentId}' in SharePoint CER_UserRoles list: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Administrative Audit Log
  // ---------------------------------------------------------------------------

  public async getAdminAuditLog(): Promise<IAdminAuditRecord[]> {
    try {
      const items = await this._sp.getListItems<Record<string, any>>("CER_AdminAuditLog", {
        top: 500,
        orderby: "Created desc",
      });

      return items.map((item: any) => ({
        id: String(item.Id || item.id),
        actor_name: item.actor_name || item.Title || "Admin",
        actor_email: item.actor_email || "",
        action: item.action || "SETTINGS_UPDATED",
        target_type: item.target_type || "SETTINGS",
        target_id: item.target_id || "",
        details: item.details || "",
        before_value: item.before_value || "",
        after_value: item.after_value || "",
        timestamp: item.timestamp || item.Created || new Date().toISOString(),
      }));
    } catch (e) {
      console.warn("[SharePointCERDataService] Querying CER_AdminAuditLog failed:", e);
      return [];
    }
  }

  public async logAdminAudit(record: Omit<IAdminAuditRecord, "id">): Promise<void> {
    try {
      const payload = {
        Title: record.actor_name,
        actor_name: record.actor_name,
        actor_email: record.actor_email,
        action: record.action,
        target_type: record.target_type,
        target_id: record.target_id,
        details: record.details,
        before_value: record.before_value || null,
        after_value: record.after_value || null,
        timestamp: record.timestamp || new Date().toISOString(),
      };

      await this._sp.createListItem("CER_AdminAuditLog", payload);
    } catch (e) {
      console.warn("[SharePointCERDataService] logAdminAudit failed to write to SharePoint CER_AdminAuditLog:", e);
    }
  }
}


