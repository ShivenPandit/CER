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
import { PersonFieldService } from "./PersonFieldService";

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
      let fields: Array<{ InternalName: string; Title: string; Choices: string[]; DefaultValue: string }> = [];
      try {
        fields = await this._sp.getListFields("CERProposals", {
          filter: "TypeAsString eq 'Choice'",
          select: "InternalName,Title,Choices,DefaultValue",
        });
      } catch {
        try {
          fields = await this._sp.getListFields("CER_Proposals", {
            filter: "TypeAsString eq 'Choice'",
            select: "InternalName,Title,Choices,DefaultValue",
          });
        } catch {
          fields = [];
        }
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
    const candidateLists = ["CERProposals", "CER_Proposals"];
    let lastErr: any = null;

    for (const listName of candidateLists) {
      try {
        let items: any[] = [];
        try {
          items = await this._sp.getListItems(listName, {
            top: 500,
            orderby: "Created desc",
            expand: "cerOwner",
            select: "*,cerOwner/Id,cerOwner/Title,cerOwner/EMail,cerOwner/Name",
          });
        } catch {
          items = await this._sp.getListItems(listName, {
            top: 500,
            orderby: "Created desc",
          });
        }
        return items.map((item: Record<string, unknown>) =>
          this._mapSharePointItemToProposal(item),
        );
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
  }

  public async getProposalByNumber(
    cerprno: string,
  ): Promise<ICERProposal | null> {
    const candidateLists = ["CERProposals", "CER_Proposals"];
    let lastErr: any = null;

    for (const listName of candidateLists) {
      try {
        let items: any[] = [];
        // Tier 1: Query by linking column cerPrNo with cerOwner Person field expanded
        try {
          items = await this._sp.getListItems(listName, {
            filter: `cerPrNo eq '${cerprno}'`,
            orderby: "Modified desc",
            expand: "cerOwner",
            select: "*,cerOwner/Id,cerOwner/Title,cerOwner/EMail,cerOwner/Name",
            top: 1,
          });
        } catch (t1Err) {
          // Tier 2: Query by linking column cerPrNo without Person field expansion
          try {
            items = await this._sp.getListItems(listName, {
              filter: `cerPrNo eq '${cerprno}'`,
              orderby: "Modified desc",
              top: 1,
            });
          } catch (t2Err) {
            // Tier 3: Fetch recent list items and match by cerPrNo in memory
            try {
              const allItems = await this._sp.getListItems(listName, {
                top: 500,
                orderby: "Created desc",
              });
              items = allItems.filter(
                (it: any) => (it.cerPrNo || it.Title) === cerprno
              );
            } catch (t3Err) {
              items = [];
            }
          }
        }

        if (items.length > 0) {
          return this._mapSharePointItemToProposal(items[0]);
        }
        return null;
      } catch (e) {
        lastErr = e;
      }
    }

    console.error(`[SharePointCERDataService] Failed to query proposal '${cerprno}' from SharePoint:`, lastErr);
    throw new Error(
      `Unable to load proposal '${cerprno}' from SharePoint: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
    );
  }

  public async generateProposalNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `CER-${year}-`;
    let highest = 0;
    const candidateLists = ["CERProposals", "CER_Proposals"];
    let lastErr: any = null;

    for (const listName of candidateLists) {
      try {
        let items: any[] = [];
        try {
          items = await this._sp.getListItems<any>(listName, {
            select: "Id,Title,cerPrNo",
            top: 500,
            orderby: "Created desc",
          });
        } catch {
          items = await this._sp.getListItems<any>(listName, {
            select: "Id,Title",
            top: 500,
            orderby: "Created desc",
          });
        }

        for (const item of items) {
          const no = String(item.cerPrNo || item.cerprno || item.Title || "");
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
        lastErr = e;
      }
    }

    const nextNum = highest + 1;
    return `${prefix}${("0000" + nextNum).slice(-4)}`;
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

    let ownerSpUserId: number | null = null;
    if (newProposal.owner_email || newProposal.owname) {
      try {
        const ensuredOwner = await this._sp.ensureUser(newProposal.owner_email || newProposal.owname);
        if (ensuredOwner && ensuredOwner.Id > 0) {
          ownerSpUserId = ensuredOwner.Id;
        }
      } catch {
        // Fallback gracefully
      }
    }

    const modernPayload: any = this._mapProposalToModernSharePointItem(newProposal);
    const legacyPayload: any = this._mapProposalToLegacySharePointItem(newProposal);
    if (ownerSpUserId) {
      modernPayload.cerOwnerId = ownerSpUserId;
      legacyPayload.cerOwnerId = ownerSpUserId;
      legacyPayload.ownameId = ownerSpUserId;
    }

    // Check if an item with this cerprno already exists in CERProposals / CER_Proposals list (e.g. draft saved earlier)
    let existingItems: Array<{ Id: number }> = [];
    let targetListName = "CERProposals";
    for (const listName of ["CERProposals", "CER_Proposals"]) {
      try {
        try {
          existingItems = await this._sp.getListItems<{ Id: number }>(listName, {
            filter: `cerPrNo eq '${newProposal.cerprno}'`,
            select: "Id",
            top: 1,
          });
        } catch {
          const allItems = await this._sp.getListItems<any>(listName, {
            select: "Id,cerPrNo,Title",
            top: 500,
          });
          existingItems = allItems.filter(
            (it: any) => (it.cerPrNo || it.Title) === newProposal.cerprno
          );
        }
        targetListName = listName;
        break;
      } catch (queryErr) {
        // try next candidate
      }
    }

    if (existingItems.length > 0) {
      const spItemId = existingItems[0].Id;
      newProposal.id = String(spItemId);

      try {
        try {
          await this._sp.updateListItem(targetListName, spItemId, modernPayload);
        } catch (initialErr: any) {
          const errText = String(initialErr?.message || "").toLowerCase();
          if (errText.includes("does not exist") || errText.includes("invalid field") || errText.includes("st_date") || errText.includes("startdate")) {
            await this._sp.updateListItem(targetListName, spItemId, legacyPayload);
          } else {
            throw initialErr;
          }
        }
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
      let createdItem: { Id: number } | undefined;
      const candidateLists = [targetListName, targetListName === "CERProposals" ? "CER_Proposals" : "CERProposals"];
      let lastCreateErr: any = null;

      for (const listName of candidateLists) {
        try {
          try {
            createdItem = await this._sp.createListItem<{ Id: number }>(listName, modernPayload);
            break;
          } catch (initialErr: any) {
            const errText = String(initialErr?.message || "").toLowerCase();
            if (errText.includes("does not exist") || errText.includes("invalid field") || errText.includes("st_date") || errText.includes("startdate")) {
              createdItem = await this._sp.createListItem<{ Id: number }>(listName, legacyPayload);
              break;
            } else {
              throw initialErr;
            }
          }
        } catch (err) {
          lastCreateErr = err;
        }
      }

      if (createdItem && createdItem.Id) {
        newProposal.id = String(createdItem.Id);
      } else if (lastCreateErr) {
        throw lastCreateErr;
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

    // Find SharePoint Item ID in CERProposals / CER_Proposals
    let existingItems: Array<{ Id: number }> = [];
    let targetListName = "CERProposals";
    for (const listName of ["CERProposals", "CER_Proposals"]) {
      try {
        try {
          existingItems = await this._sp.getListItems<{ Id: number }>(listName, {
            filter: `cerPrNo eq '${proposal.cerprno}'`,
            select: "Id",
            top: 1,
          });
        } catch {
          const allItems = await this._sp.getListItems<any>(listName, {
            select: "Id,cerPrNo,Title",
            top: 500,
          });
          existingItems = allItems.filter(
            (it: any) => (it.cerPrNo || it.Title) === proposal.cerprno
          );
        }
        if (existingItems.length > 0) {
          targetListName = listName;
          break;
        }
      } catch {
        // try next
      }
    }

    if (existingItems.length === 0) {
      throw new Error(`Cannot update proposal '${proposal.cerprno}': Proposal record was not found in SharePoint CERProposals list.`);
    }

    const spItemId = existingItems[0].Id;
    const modernPayload = this._mapProposalToModernSharePointItem(updatedProposal);
    const legacyPayload = this._mapProposalToLegacySharePointItem(updatedProposal);

    // Primary write: Update proposal in CERProposals / CER_Proposals
    try {
      try {
        await this._sp.updateListItem(targetListName, spItemId, modernPayload);
      } catch (initialErr: any) {
        const errText = String(initialErr?.message || "").toLowerCase();
        if (errText.includes("does not exist") || errText.includes("invalid field") || errText.includes("st_date") || errText.includes("startdate")) {
          await this._sp.updateListItem(targetListName, spItemId, legacyPayload);
        } else {
          throw initialErr;
        }
      }
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
    const candidateLists = ["CERAuditTrail", "CER_AuditTrail"];
    let lastErr: any = null;

    for (const listName of candidateLists) {
      try {
        let items: Record<string, any>[] = [];
        if (cerprno) {
          try {
            items = await this._sp.getListItems<Record<string, any>>(listName, {
              filter: `cerPrNo eq '${cerprno}'`,
              top: 500,
              orderby: "Created desc",
            });
          } catch {
            const allItems = await this._sp.getListItems<Record<string, any>>(listName, {
              top: 500,
              orderby: "Created desc",
            });
            items = allItems.filter((it: any) => (it.cerPrNo || it.Title) === cerprno);
          }
        } else {
          items = await this._sp.getListItems<Record<string, any>>(listName, {
            top: 500,
            orderby: "Created desc",
          });
        }

        return items.map((item) => ({
          id: String(item.Id || item.id),
          cerprno: item.cerPrNo || item.cerprno || item.Title || "",
          field_name: item.fieldName || item.field_name || "",
          field_desc: item.fieldName || item.field_desc || AUDIT_FIELD_DESCRIPTIONS[item.fieldName || item.field_name] || item.fieldName || item.field_name,
          old_value: item.oldValue || item.old_value || "",
          new_value: item.newValue || item.new_value || "",
          user_name: item.userName || item.user_name || "",
          user_email: item.userEmail || item.user_email || "",
          audit_date: item.audit_date || (item.timestamp ? String(item.timestamp).split("T")[0] : ""),
          audit_time: item.audit_time || (item.timestamp && String(item.timestamp).includes("T") ? String(item.timestamp).split("T")[1].substring(0, 8) : ""),
          timestamp: item.timestamp || item.Created || new Date().toISOString(),
          is_long_text: !!item.is_long_text,
        }));
      } catch (err) {
        lastErr = err;
      }
    }

    if (lastErr && (String(lastErr?.message || lastErr).includes("404") || String(lastErr?.message || lastErr).includes("does not exist"))) {
      console.warn("[SharePointCERDataService] CERAuditTrail list not found on site, defaulting to empty audit log:", lastErr);
      return [];
    }

    console.error("[SharePointCERDataService] Error querying CERAuditTrail from SharePoint:", lastErr);
    throw new Error(
      `Unable to load audit trail from SharePoint: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`,
    );
  }

  private async _createAuditRecord(record: ICERAuditRecord): Promise<void> {
    const candidateLists = ["CERAuditTrail", "CER_AuditTrail"];
    const modernPayload = {
      Title: record.cerprno,
      cerPrNo: record.cerprno,
      fieldName: record.field_name,
      oldValue: record.old_value,
      newValue: record.new_value,
      userName: record.user_name,
      userEmail: record.user_email,
      actionType: "UPDATE",
      timestamp: record.timestamp,
    };
    const legacyPayload = {
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
  // 3. CER_RemarksHistory Operations
  // ---------------------------------------------------------------------------

  public async getRemarksHistory(cerprno: string): Promise<ICERRemarksVersion[]> {
    const candidateLists = ["CERRemarksHistory", "CER_RemarksHistory"];
    let lastErr: any = null;

    for (const listName of candidateLists) {
      try {
        let items: Record<string, any>[] = [];
        try {
          items = await this._sp.getListItems<Record<string, any>>(listName, {
            filter: `cerPrNo eq '${cerprno}'`,
            top: 100,
            orderby: "Created desc",
          });
        } catch {
          const allItems = await this._sp.getListItems<Record<string, any>>(listName, {
            top: 100,
            orderby: "Created desc",
          });
          items = allItems.filter((it: any) => (it.cerPrNo || it.Title) === cerprno);
        }

        return items.map((item) => ({
          id: String(item.Id || item.id),
          cerprno: item.cerPrNo || item.cerprno || item.Title,
          version: Number(item.stepNumber || item.version || 1),
          remarks_text: item.remarkText || item.remarks_text || "",
          remarks_type: item.remarks_type || "REMARKS",
          word_count: Number(item.word_count || (item.remarkText ? item.remarkText.split(/\s+/).filter(Boolean).length : (item.remarks_text ? item.remarks_text.split(/\s+/).filter(Boolean).length : 0))),
          created_by: item.createdByUser || item.created_by_user || item.Author?.Title || "System User",
          created_date: item.timestamp || item.revision_date || item.Created || new Date().toISOString(),
        }));
      } catch (err) {
        lastErr = err;
      }
    }

    if (lastErr && (String(lastErr?.message || lastErr).includes("404") || String(lastErr?.message || lastErr).includes("does not exist"))) {
      console.warn("[SharePointCERDataService] CERRemarksHistory list not found on site, defaulting to empty remarks:", lastErr);
      return [];
    }

    console.error("[SharePointCERDataService] Error querying CERRemarksHistory from SharePoint:", lastErr);
    throw new Error(`Unable to load remarks history from SharePoint: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
  }

  private async _createRemarksRecord(
    cerprno: string,
    version: number,
    remarksText: string,
    createdBy: string,
  ): Promise<void> {
    const candidateLists = ["CERRemarksHistory", "CER_RemarksHistory"];
    const modernPayload = {
      Title: cerprno,
      cerPrNo: cerprno,
      stepNumber: version,
      remarkText: remarksText,
      createdByUser: createdBy,
      timestamp: new Date().toISOString(),
      stageRole: "Commenter",
    };
    const legacyPayload = {
      Title: cerprno,
      cerprno: cerprno,
      version: version,
      remarks_text: remarksText,
      remarks_type: "REMARKS",
      word_count: remarksText.split(/\s+/).filter(Boolean).length,
      created_by_user: createdBy,
      revision_date: new Date().toISOString(),
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
        const candidateLists = ["CERWorkflowLevels", "CER_WorkflowLevels"];

        for (const listName of candidateLists) {
          try {
            // Modern CamelCase + legacy aliases
            items = await this._sp.getListItems<Record<string, any>>(listName, {
              select: "Id,ID,Title,levelId,level_id,level_name,roleTitle,role_title,sbu,isActive,is_active,created_by,created_date,Created,assignmentType,assignment_type",
              top: 50,
            });
            break;
          } catch {
            try {
              items = await this._sp.getListItems<Record<string, any>>(listName, {
                top: 50,
              });
              break;
            } catch {
              // try next candidate
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
          const lid = Number(item.levelId ?? item.level_id ?? 1);
          const rawAssignmentType = (item.assignmentType || item.assignment_type) as ApproverAssignmentType | undefined;
          const lvlObj = {
            role_title: item.roleTitle || item.role_title || "",
            level_name: item.roleTitle || item.role_title || item.level_name || item.Title || `Level ${lid}`,
            assignment_type: rawAssignmentType,
          };
          const isPO = isProjectOwnerStage(lvlObj);
          const assignmentType: ApproverAssignmentType = rawAssignmentType || (isPO ? "ProjectOwnerAuto" : "SpecificUser");

          // Dynamically match approver from CERUserRoles by approval_level only if NOT Project Owner stage
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
            is_active: item.isActive !== undefined ? !!item.isActive : (item.is_active !== undefined ? !!item.is_active : true),
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
        if (e && (String((e as any)?.message || e).includes("404") || String((e as any)?.message || e).includes("does not exist"))) {
          console.warn("[SharePointCERDataService] CERWorkflowLevels list not found on site, returning empty levels:", e);
          return [];
        }
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
      // 1. Fetch all existing items from CERWorkflowLevels / CER_WorkflowLevels
      let existingRaw: any[] = [];
      let targetListName = "CERWorkflowLevels";
      for (const listName of ["CERWorkflowLevels", "CER_WorkflowLevels"]) {
        try {
          existingRaw = await this._sp.getListItems<any>(listName, {
            top: 100,
          });
          targetListName = listName;
          break;
        } catch {
          // try next
        }
      }

      const existingItems = existingRaw.map((item: any) => ({
        Id: Number(item.Id !== undefined ? item.Id : item.ID),
        level_id: Number(item.levelId ?? item.level_id ?? 1),
        sbu: String(item.sbu || "").trim(),
      }));

      const usedSpIds = new Set<number>();

      // 2. Insert or update each level
      for (const lvl of levels) {
        const assignmentType: ApproverAssignmentType = lvl.assignment_type || (isProjectOwnerStage(lvl) ? "ProjectOwnerAuto" : "SpecificUser");
        const modernPayload = {
          Title: lvl.level_name || `Level ${lvl.level_id}`,
          levelId: Number(lvl.level_id),
          roleTitle: lvl.role_title,
          sbu: (lvl.sbu || "").trim(),
          isActive: lvl.is_active !== undefined ? Boolean(lvl.is_active) : true,
          assignmentType: assignmentType,
        };
        const legacyPayload = {
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
              item.sbu.toLowerCase() === modernPayload.sbu.toLowerCase() &&
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
            try {
              await this._sp.updateListItem(targetListName, targetSpId, modernPayload);
            } catch {
              await this._sp.updateListItem(targetListName, targetSpId, legacyPayload);
            }
          } catch (updateErr: any) {
            const fallbackPayload: Record<string, any> = { Title: modernPayload.Title, sbu: modernPayload.sbu };
            await this._sp.updateListItem(targetListName, targetSpId, fallbackPayload);
          }
        } else {
          // New level to create
          const newId = await this._createWorkflowLevelRecord(modernPayload, targetListName);
          if (newId) {
            usedSpIds.add(newId);
          }
        }
      }

      // 3. Delete any obsolete items that are no longer in levels
      for (const item of existingItems) {
        if (!usedSpIds.has(item.Id)) {
          try {
            await this._sp.deleteListItem(targetListName, item.Id);
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

  private async _createWorkflowLevelRecord(payload: Record<string, any>, preferredListName = "CERWorkflowLevels"): Promise<number | undefined> {
    const modernPayload = {
      Title: payload.Title || `Level ${payload.levelId || payload.level_id}`,
      levelId: Number(payload.levelId ?? payload.level_id ?? 1),
      roleTitle: payload.roleTitle || payload.role_title || "",
      sbu: payload.sbu || "",
      isActive: payload.isActive !== undefined ? Boolean(payload.isActive) : (payload.is_active !== undefined ? Boolean(payload.is_active) : true),
      assignmentType: payload.assignmentType || payload.assignment_type || "SpecificUser",
    };
    const legacyPayload = {
      Title: payload.Title || `Level ${payload.levelId || payload.level_id}`,
      level_id: Number(payload.levelId ?? payload.level_id ?? 1),
      level_name: payload.roleTitle || payload.role_title || payload.Title,
      role_title: payload.roleTitle || payload.role_title || "",
      sbu: payload.sbu || "",
      is_active: payload.isActive !== undefined ? Boolean(payload.isActive) : (payload.is_active !== undefined ? Boolean(payload.is_active) : true),
      assignment_type: payload.assignmentType || payload.assignment_type || "SpecificUser",
    };

    const candidateLists = [preferredListName, preferredListName === "CERWorkflowLevels" ? "CER_WorkflowLevels" : "CERWorkflowLevels"];
    let lastErr: any = null;

    for (const listName of candidateLists) {
      try {
        try {
          const created = await this._sp.createListItem<{ Id: number }>(listName, modernPayload);
          return created.Id;
        } catch {
          const created = await this._sp.createListItem<{ Id: number }>(listName, legacyPayload);
          return created.Id;
        }
      } catch (err: any) {
        lastErr = err;
      }
    }
    console.error("[SharePointCERDataService] Failed to create workflow level item in SharePoint:", lastErr);
    throw lastErr;
  }

  // ---------------------------------------------------------------------------
  // 5. CER_ApprovalDecisions Operations
  // ---------------------------------------------------------------------------

  public async getApprovalDecisions(cerprno: string): Promise<IApprovalDecision[]> {
    const candidateLists = ["CERApprovalDecisions", "CER_ApprovalDecisions"];
    let lastErr: any = null;

    for (const listName of candidateLists) {
      try {
        let items: Record<string, any>[] = [];
        // Tier 1: Modern schema with linking column cerPrNo, Author & approver Person fields expanded
        try {
          items = await this._sp.getListItems<Record<string, any>>(listName, {
            filter: `cerPrNo eq '${cerprno}'`,
            select: "Id,Title,cerPrNo,levelId,decision,remarks,decidedAt,Created,Author/Id,Author/Title,Author/EMail,approver/Id,approver/Title,approver/EMail",
            expand: "Author,approver",
            top: 100,
            orderby: "Created desc",
          });
        } catch {
          // Tier 2: Query by linking column cerPrNo without Person field expansion
          try {
            items = await this._sp.getListItems<Record<string, any>>(listName, {
              filter: `cerPrNo eq '${cerprno}'`,
              select: "Id,Title,cerPrNo,levelId,decision,remarks,decidedAt,Created",
              top: 100,
              orderby: "Created desc",
            });
          } catch {
            // Tier 3: Fetch recent list items and match by cerPrNo in memory
            try {
              const allItems = await this._sp.getListItems<Record<string, any>>(listName, {
                top: 100,
                orderby: "Created desc",
              });
              items = allItems.filter(
                (it: any) => (it.cerPrNo || it.Title) === cerprno
              );
            } catch {
              items = [];
            }
          }
        }

        return items.map((item) => {
          const approverPerson = PersonFieldService.extractPersonField(item, "approver") || PersonFieldService.extractPersonField(item, "Author");
          const approverName = approverPerson?.name || item.approver_name || (typeof item.approver === "string" ? item.approver : "") || "";
          const approverEmail = approverPerson?.email || item.approver_email || "";
          const levelId = Number(item.levelId ?? item.level_id ?? 1);

          return {
            id: String(item.Id || item.id),
            cerprno: item.cerPrNo || item.cerprno || item.Title,
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
      } catch (e) {
        lastErr = e;
      }
    }

    if (lastErr && (String(lastErr?.message || lastErr).includes("404") || String(lastErr?.message || lastErr).includes("does not exist"))) {
      console.warn("[SharePointCERDataService] CERApprovalDecisions list not found on site, defaulting to empty decisions list:", lastErr);
      return [];
    }

    console.error("[SharePointCERDataService] Error querying CERApprovalDecisions from SharePoint:", lastErr);
    throw new Error(`Unable to load approval decisions from SharePoint: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
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
      throw new Error(`Cannot record decision: Proposal '${params.cerprno}' not found in SharePoint CERProposals list.`);
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

    // 1. Fetch current proposal item to retrieve SBU, Creator email and ID from candidate lists
    const candidateProposalLists = ["CERProposals", "CER_Proposals"];
    let propItem: { Id: number; sbu?: string; owner_email?: string } | null = null;
    let targetProposalList = "CERProposals";

    for (const listName of candidateProposalLists) {
      try {
        let items: Array<{ Id: number; sbu?: string; owner_email?: string }> = [];
        try {
          items = await this._sp.getListItems<{ Id: number; sbu?: string; owner_email?: string }>(listName, {
            filter: `cerPrNo eq '${params.cerprno}'`,
            top: 1,
          });
        } catch {
          const allItems = await this._sp.getListItems<any>(listName, {
            select: "Id,cerPrNo,Title,sbu,owner_email",
            top: 500,
          });
          items = allItems.filter(
            (it: any) => (it.cerPrNo || it.Title) === params.cerprno
          );
        }
        if (items.length > 0) {
          propItem = items[0];
          targetProposalList = listName;
          break;
        }
      } catch {
        // continue to next candidate list
      }
    }

    if (!propItem) {
      throw new Error(`Cannot record decision: Proposal '${params.cerprno}' not found in SharePoint CERProposals list.`);
    }

    const spId = propItem.Id;
    const creatorEmail = (existingProposal.owner_email || propItem?.owner_email || "").trim();

    // 2. Fetch prior approval decisions to obtain all previous approvers' emails
    let priorEmails: string[] = [];
    try {
      const priorDecisions = await this.getApprovalDecisions(params.cerprno);
      priorEmails = priorDecisions.map((d) => (d.approver_email || "").trim()).filter(Boolean);
    } catch (pErr) {
      console.warn("[SharePointCERDataService] Failed to load prior approval decisions for notification recipients:", pErr);
    }

    // 3. Resolve approver user id for native Person field in CERApprovalDecisions
    let approverUserId: number | undefined;
    if (params.approver_email) {
      try {
        const ensured = await this._sp.ensureUser(params.approver_email);
        approverUserId = ensured.Id;
      } catch {
        // non-blocking
      }
    }

    // 4. Primary write 1: Post decision record to CERApprovalDecisions (with fallback)
    const modernDecisionPayload: Record<string, any> = {
      Title: params.cerprno,
      cerPrNo: params.cerprno,
      levelId: params.level_id,
      decision: params.decision === "REJECTED" ? "Rejected" : "Approved",
      remarks: params.comments || "",
      decidedAt: now,
    };
    if (approverUserId) {
      modernDecisionPayload.approverId = approverUserId;
    }

    const legacyDecisionPayload: Record<string, any> = {
      Title: `${params.cerprno}-L${params.level_id}`,
      cerprno: params.cerprno,
      level_id: params.level_id,
      level_name: `Level ${params.level_id}`,
      approver_name: params.approver_name,
      approver_email: params.approver_email,
      decision: params.decision,
      comments: params.comments || "",
      decision_date: now,
    };

    const candidateDecisionLists = ["CERApprovalDecisions", "CER_ApprovalDecisions"];
    let decisionRecorded = false;
    let decisionErr: any = null;

    for (const dList of candidateDecisionLists) {
      try {
        try {
          await this._sp.createListItem(dList, modernDecisionPayload);
          decisionRecorded = true;
          break;
        } catch {
          await this._sp.createListItem(dList, legacyDecisionPayload);
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
    const legacyUpdatePayload: Record<string, any> = {
      status: newStatus,
      current_level: nextLevel,
      pending_with_role: nextRole,
      pending_with_email: nextEmail,
      modified_date: now,
      modified_by: params.approver_name,
    };

    try {
      try {
        await this._sp.updateListItem(targetProposalList, spId, modernUpdatePayload);
      } catch {
        await this._sp.updateListItem(targetProposalList, spId, legacyUpdatePayload);
      }
    } catch (updateErr) {
      console.error("[SharePointCERDataService] Primary decision was recorded, but updating CERProposals status failed:", updateErr);
      throw new Error(
        `Approval decision was recorded, but updating proposal status failed in SharePoint. Please check proposal status before retrying. (Details: ${updateErr instanceof Error ? updateErr.message : String(updateErr)})`
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
  // 6. CERAttachments Operations (Document Library)
  // ---------------------------------------------------------------------------

  public async getAttachments(cerprno: string): Promise<ICERAttachment[]> {
    const candidateLists = ["CERAttachments", "CER_Attachments"];
    let lastErr: any = null;

    for (const libName of candidateLists) {
      try {
        let items: Record<string, any>[] = [];
        // Tier 1: Query by cerPrNo with File and uploadedBy expanded
        try {
          items = await this._sp.getListItems<Record<string, any>>(libName, {
            filter: `cerPrNo eq '${cerprno}'`,
            select: "Id,FileLeafRef,FileRef,cerPrNo,category,uploadDate,Created,File/ServerRelativeUrl,File/Length,uploadedBy/Id,uploadedBy/Title,uploadedBy/EMail",
            expand: "File,uploadedBy",
            top: 100,
          });
        } catch (t1Err) {
          // Tier 2: Query by cerPrNo with only File expanded
          try {
            items = await this._sp.getListItems<Record<string, any>>(libName, {
              filter: `cerPrNo eq '${cerprno}'`,
              select: "Id,FileLeafRef,FileRef,cerPrNo,category,uploadDate,Created,File/ServerRelativeUrl,File/Length",
              expand: "File",
              top: 100,
            });
          } catch (t2Err) {
            // Tier 3: Query without filter if cerPrNo column isn't indexed or configured, filter in memory
            try {
              items = await this._sp.getListItems<Record<string, any>>(libName, {
                select: "Id,FileLeafRef,FileRef,Created,File/ServerRelativeUrl,File/Length",
                expand: "File",
                top: 200,
              });
              items = items.filter((it) => {
                const leaf = String(it.FileLeafRef || "");
                const cNo = String(it.cerPrNo || it.cerprno || "");
                return cNo === cerprno || leaf.startsWith(cerprno) || leaf.includes(cerprno);
              });
            } catch (t3Err) {
              // Tier 4: Minimal query fallback
              items = await this._sp.getListItems<Record<string, any>>(libName, {
                top: 100,
              });
              items = items.filter((it) => {
                const leaf = String(it.FileLeafRef || "");
                const cNo = String(it.cerPrNo || it.cerprno || "");
                return cNo === cerprno || leaf.startsWith(cerprno) || leaf.includes(cerprno);
              });
            }
          }
        }

        return items.map((item) => {
          const uploaderPerson = PersonFieldService.extractPersonField(item, "uploadedBy") || PersonFieldService.extractPersonField(item, "Author");
          const uploaderName = uploaderPerson?.name || item.uploaded_by || (typeof item.uploadedBy === "string" ? item.uploadedBy : "") || "User";
          const uploadDate = item.uploadDate || item.Created || new Date().toISOString();
          const fileSize = Number(item.File?.Length || item.file_size || 0);

          return {
            id: String(item.Id || item.id),
            cerprno: item.cerPrNo || item.cerprno || cerprno,
            name: item.FileLeafRef || item.File?.Name || "document",
            size: fileSize,
            type: item.file_type || (item.FileLeafRef && item.FileLeafRef.endsWith(".pdf") ? "application/pdf" : "application/octet-stream"),
            data_url: item.File?.ServerRelativeUrl || item.FileRef || "",
            uploaded_by: uploaderName,
            uploaded_date: uploadDate,
          };
        });
      } catch (e) {
        lastErr = e;
      }
    }

    if (lastErr && (String(lastErr?.message || lastErr).includes("404") || String(lastErr?.message || lastErr).includes("does not exist"))) {
      console.warn(`[SharePointCERDataService] CERAttachments library not found on site for CER '${cerprno}', defaulting to empty list:`, lastErr);
      return [];
    }

    console.error("[SharePointCERDataService] Error querying CERAttachments from SharePoint:", lastErr);
    throw new Error(`Unable to load attachments for CER '${cerprno}' from SharePoint: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`);
  }

  public async addAttachment(attachment: ICERAttachment): Promise<void> {
    const existing = await this.getAttachments(attachment.cerprno);
    const existingSize = existing.reduce((sum, a) => sum + (a.size || 0), 0);

    const validation = validateAttachment(
      attachment,
      existingSize,
      existing.map((a) => a.name)
    );
    if (!validation.isValid) {
      throw new Error(`[SharePoint Attachment Policy Violation] ${validation.error}`);
    }

    let uploadedById: number | undefined;
    if (attachment.uploaded_by && attachment.uploaded_by.includes("@")) {
      try {
        const ensured = await this._sp.ensureUser(attachment.uploaded_by);
        uploadedById = ensured.Id;
      } catch {
        // non-blocking
      }
    }

    const modernMetadata: Record<string, any> = {
      cerPrNo: attachment.cerprno,
      category: attachment.type?.includes("pdf") ? "Technical" : "Other",
      uploadDate: new Date().toISOString(),
      ...(uploadedById ? { uploadedById } : {}),
    };

    const fallbackMetadata: Record<string, any> = {
      cerPrNo: attachment.cerprno,
      category: attachment.type?.includes("pdf") ? "Technical" : "Other",
      uploadDate: new Date().toISOString(),
    };

    const minimalMetadata: Record<string, any> = {
      cerPrNo: attachment.cerprno,
    };

    const candidateLibraries = ["CERAttachments", "CER_Attachments"];
    let uploaded = false;
    let lastErr: any = null;

    if (attachment.data_url && attachment.data_url.indexOf("data:") === 0) {
      const buffer = this._base64ToArrayBuffer(attachment.data_url);
      const fileName = `${attachment.cerprno}_${Date.now()}_${attachment.name}`;

      for (const libName of candidateLibraries) {
        try {
          try {
            await this._sp.uploadFileToLibrary(libName, fileName, buffer, modernMetadata);
            uploaded = true;
            break;
          } catch {
            try {
              await this._sp.uploadFileToLibrary(libName, fileName, buffer, fallbackMetadata);
              uploaded = true;
              break;
            } catch {
              try {
                await this._sp.uploadFileToLibrary(libName, fileName, buffer, minimalMetadata);
                uploaded = true;
                break;
              } catch {
                await this._sp.uploadFileToLibrary(libName, fileName, buffer, {});
                uploaded = true;
                break;
              }
            }
          }
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
    }
  }

  public async deleteAttachment(id: string): Promise<void> {
    const candidateLibraries = ["CERAttachments", "CER_Attachments"];
    let deleted = false;
    let lastErr: any = null;

    for (const libName of candidateLibraries) {
      try {
        if (/^\d+$/.test(id)) {
          await this._sp.deleteListItem(libName, id);
          deleted = true;
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

  // ---------------------------------------------------------------------------
  // 7. CERNotifications Operations
  // ---------------------------------------------------------------------------

  public async getNotificationLogs(cerprno?: string): Promise<INotificationLog[]> {
    const candidateLists = ["CERNotifications", "CER_Notifications"];
    let lastErr: any = null;

    for (const listName of candidateLists) {
      try {
        let items: Record<string, any>[] = [];
        if (cerprno) {
          try {
            items = await this._sp.getListItems<Record<string, any>>(listName, {
              filter: `cerPrNo eq '${cerprno}'`,
              top: 100,
              orderby: "Created desc",
            });
          } catch {
            const allItems = await this._sp.getListItems<Record<string, any>>(listName, {
              top: 100,
              orderby: "Created desc",
            });
            items = allItems.filter((it: any) => (it.cerPrNo || it.Title) === cerprno);
          }
        } else {
          items = await this._sp.getListItems<Record<string, any>>(listName, {
            top: 100,
            orderby: "Created desc",
          });
        }

        return items.map((item) => ({
          id: String(item.Id || item.id),
          cerprno: item.cerPrNo || item.cerprno || item.Title,
          recipients: item.recipients ? item.recipients.split(";").map((s: string) => s.trim()) : [],
          subject: item.subject || "",
          body: item.bodyPreview || item.body || "",
          attachments_count: Number(item.attachments_count || 0),
          timestamp: item.Created || item.dispatch_timestamp || item.timestamp || new Date().toISOString(),
          status: (item.status as "SENT" | "PENDING" | "FAILED") || "SENT",
        }));
      } catch (e) {
        lastErr = e;
      }
    }

    if (lastErr && (String(lastErr?.message || lastErr).includes("404") || String(lastErr?.message || lastErr).includes("does not exist"))) {
      console.warn("[SharePointCERDataService] CERNotifications list not found on site, defaulting to empty list:", lastErr);
      return [];
    }

    console.error("[SharePointCERDataService] Error querying CERNotifications from SharePoint:", lastErr);
    throw new Error(
      `Unable to load notification logs from SharePoint: ${lastErr instanceof Error ? lastErr.message : String(lastErr)}`
    );
  }

  private async _createNotificationRecord(
    cerprno: string,
    recipients: string[],
    subject: string,
    body: string,
    attachmentsCount: number,
  ): Promise<void> {
    const modernPayload = {
      Title: cerprno,
      cerPrNo: cerprno,
      recipients: recipients.join("; "),
      subject: subject,
      bodyPreview: body.length > 500 ? body.slice(0, 500) + "..." : body,
      triggerEvent: subject.includes("Rejected") ? "REJECT" : (subject.includes("Sanction") || subject.includes("Final") || subject.includes("Approved") ? "APPROVE" : "SUBMIT"),
    };

    const legacyPayload = {
      Title: cerprno,
      cerprno: cerprno,
      recipients: recipients.join("; "),
      subject: subject,
      body: body,
      attachments_count: attachmentsCount,
      dispatch_timestamp: new Date().toISOString(),
      status: "SENT",
    };

    const candidateLists = ["CERNotifications", "CER_Notifications"];
    for (const listName of candidateLists) {
      try {
        try {
          await this._sp.createListItem(listName, modernPayload);
          return;
        } catch {
          await this._sp.createListItem(listName, legacyPayload);
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
    return {
      id: String(item.Id || item.id),
      cerprno: item.cerPrNo || item.cerprno || item.Title,
      pr_name: item.prName || item.pr_name || "",
      owname: ownerPerson?.name || (typeof item.cerOwner === "string" ? item.cerOwner : "") || (typeof item.owname === "string" ? item.owname : "") || item.ownname || "",
      owner_email: ownerPerson?.email || item.owner_email || "",
      sbu: item.sbu || "RJ North",
      status: item.status || "In Approval",
      object: item.object || "",
      amount: Number(item.amount || 0),
      currency: item.currency || "USD",
      cat: item.category || item.cat || "Vital",
      payable: item.payable || "Payback",
      period: item.period || "",
      payback_quarters: item.paybackQuarters !== undefined && item.paybackQuarters !== null ? Number(item.paybackQuarters) : (item.payback_quarters !== undefined && item.payback_quarters !== null ? Number(item.payback_quarters) : 4),
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
      created_date: item.Created || new Date().toISOString(),
      created_by: item.Author?.Title || "System",
      modified_date: item.Modified || new Date().toISOString(),
      modified_by: item.Editor?.Title || "System",
      revision_count: Number(item.revisionCount ?? item.revision_count ?? 0),
    };
  }

  private _mapProposalToModernSharePointItem(proposal: ICERProposal): any {
    const formatIsoDate = (val?: string) => {
      if (!val) return null;
      if (val.indexOf("T") !== -1) return val;
      return `${val}T00:00:00Z`;
    };

    return {
      Title: proposal.cerprno,
      cerPrNo: proposal.cerprno,
      prName: proposal.pr_name,
      sbu: proposal.sbu,
      status: proposal.status,
      object: proposal.object,
      amount: Number(proposal.amount || 0),
      currency: proposal.currency || "USD",
      category: proposal.cat || "Vital",
      payable: proposal.payable || "Payback",
      period: proposal.period,
      paybackQuarters: proposal.payback_quarters !== undefined && proposal.payback_quarters !== null ? Number(proposal.payback_quarters) : null,
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
      revisionCount: Number(proposal.revision_count || 0),
    };
  }

  private _mapProposalToLegacySharePointItem(proposal: ICERProposal): any {
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

  private _mapProposalToSharePointItem(proposal: ICERProposal): any {
    return this._mapProposalToModernSharePointItem(proposal);
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
        const candidateLists = ["CERUserRoles"];

        for (const listName of candidateLists) {
          try {
            // Tier 1: Modern schema with Person fields 'User' and 'assignedBy' expanded matching CERUserRoles
            items = await this._sp.getListItems<Record<string, any>>(listName, {
              select: "Id,ID,Title,role,approvalLevel,department,assignedDate,Created,User/Id,User/Title,User/EMail,User/Name,assignedBy/Id,assignedBy/Title,assignedBy/EMail",
              expand: "User,assignedBy",
              top: 500,
            });
            break;
          } catch (t1Err) {
            console.warn("[SharePointCERDataService] Tier 1 fetch failed, trying Tier 2 (User only):", t1Err);
            try {
              // Tier 2: Only User expanded
              items = await this._sp.getListItems<Record<string, any>>(listName, {
                select: "Id,ID,Title,role,approvalLevel,department,assignedDate,Created,User/Id,User/Title,User/EMail,User/Name",
                expand: "User",
                top: 500,
              });
              break;
            } catch (t2Err) {
              console.warn("[SharePointCERDataService] Tier 2 fetch failed, trying Tier 3 (no Person expand):", t2Err);
              try {
                // Tier 3: Baseline fallback without Person expansion
                items = await this._sp.getListItems<Record<string, any>>(listName, {
                  select: "Id,ID,Title,role,approvalLevel,department,assignedDate,Created",
                  top: 500,
                });
                break;
              } catch (t3Err) {
                console.warn("[SharePointCERDataService] Tier 3 fetch failed, trying Tier 4 minimal:", t3Err);
                // Tier 4: Minimal fields fallback
                items = await this._sp.getListItems<Record<string, any>>(listName, {
                  select: "Id,ID,Title,Created",
                  top: 500,
                });
                break;
              }
            }
          }
        }

        const list = items.map((item: any) => {
          const userPerson = PersonFieldService.extractPersonField(item, "User");
          const assignedByPerson = PersonFieldService.extractPersonField(item, "assignedBy");

          const userName = userPerson?.name || item.Title || item.user_name || "";
          const userEmail = userPerson?.email || item.user_email || "";
          const loginName = userPerson?.loginName || item.login_name || userEmail;
          const userId = userPerson?.id || (item.UserId ? Number(item.UserId) : undefined);

          const assignedByName = assignedByPerson?.name || item.assignedBy || item.assigned_by || (item.Author ? item.Author.Title : "System Administrator");
          const assignedDate = item.assignedDate || item.assigned_date || item.Created || new Date().toISOString();

          return {
            id: String(item.ID !== undefined ? item.ID : item.Id !== undefined ? item.Id : item.id || Date.now()),
            user_name: userName,
            user_email: userEmail,
            login_name: loginName,
            user_id: userId,
            role: item.role || "Initiator",
            approval_level: item.approvalLevel !== undefined ? Number(item.approvalLevel) : (item.approval_level !== undefined ? Number(item.approval_level) : undefined),
            department: item.department || "",
            sbu: item.sbu || "",
            is_active: item.isActive !== undefined ? !!item.isActive : (item.is_active !== undefined ? !!item.is_active : true),
            assigned_by: assignedByName,
            assigned_date: assignedDate,
          };
        });
        list.sort((a: IUserRoleAssignment, b: IUserRoleAssignment) => new Date(b.assigned_date).getTime() - new Date(a.assigned_date).getTime());
        
        this._cachedUserRoles = list;
        this._cachedUserRolesTimestamp = Date.now();
        return list;
      } catch (e) {
        if (e && (String((e as any)?.message || e).includes("404") || String((e as any)?.message || e).includes("does not exist"))) {
          console.warn("[SharePointCERDataService] CERUserRoles list not found on site, defaulting to empty roles:", e);
          return [];
        }
        console.error("[SharePointCERDataService] Querying CERUserRoles failed:", e);
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
      // 1. Resolve SharePoint user ID using ensureUser for the assigned user
      let spUserId: number | null = assignment.user_id || null;
      if (!spUserId && (assignment.login_name || assignment.user_email)) {
        try {
          const targetLogon = assignment.login_name || assignment.user_email;
          const ensured = await this._sp.ensureUser(targetLogon);
          spUserId = ensured.Id;
        } catch (ensureErr) {
          console.warn("[SharePointCERDataService] ensureUser resolution warning during assignUserRole:", ensureErr);
        }
      }

      // 2. Resolve SharePoint user ID for the actor (assignedBy)
      let assignedById: number | null = null;
      if (actor.email) {
        try {
          const ensuredActor = await this._sp.ensureUser(actor.email);
          assignedById = ensuredActor.Id;
        } catch (actorErr) {
          console.warn("[SharePointCERDataService] ensureUser resolution warning for actor:", actorErr);
        }
      }

      const payload: Record<string, any> = {
        Title: assignment.user_name,
        role: assignment.role,
        department: assignment.department || "",
        assignedDate: new Date().toISOString(),
      };

      if (assignment.approval_level) {
        payload.approvalLevel = assignment.approval_level;
      }
      if (spUserId) {
        payload.UserId = spUserId;
      }
      if (assignedById) {
        payload.assignedById = assignedById;
      }

      let res: { Id?: number; ID?: number } | null = null;
      const candidateLists = ["CERUserRoles"];

      for (const listName of candidateLists) {
        try {
          res = await this._sp.createListItem<{ Id?: number; ID?: number }>(listName, payload);
          break;
        } catch (createErr: any) {
          const errStr = String(createErr?.message || "").toLowerCase();
          const fallbackPayload: Record<string, any> = { ...payload };
          if (errStr.includes("assignedbyid")) delete fallbackPayload.assignedById;
          if (errStr.includes("userid") || errStr.includes("user")) delete fallbackPayload.UserId;
          if (errStr.includes("approvallevel")) {
            delete fallbackPayload.approvalLevel;
            fallbackPayload.approval_level = assignment.approval_level || null;
          }
          if (errStr.includes("assigneddate")) {
            delete fallbackPayload.assignedDate;
            fallbackPayload.assigned_date = payload.assignedDate;
            fallbackPayload.assigned_by = actor.name;
          }
          try {
            res = await this._sp.createListItem<{ Id?: number; ID?: number }>(listName, fallbackPayload);
            break;
          } catch {
            // Try next list name
          }
        }
      }

      if (!res) {
        throw new Error("Failed to write to CERUserRoles list.");
      }

      const created: IUserRoleAssignment = {
        ...assignment,
        id: String(res.ID !== undefined ? res.ID : res.Id !== undefined ? res.Id : Date.now()),
        user_id: spUserId || undefined,
        assigned_by: actor.name,
        assigned_date: payload.assignedDate,
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
        // ignore audit logging error
      }

      return created;
    } catch (e) {
      console.error("[SharePointCERDataService] assignUserRole failed in SharePoint:", e);
      throw new Error(`Unable to assign user role to '${assignment.user_name}' in SharePoint CERUserRoles list: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  public async updateUserRole(
    assignment: IUserRoleAssignment,
    actor: { name: string; email: string }
  ): Promise<void> {
    this.clearCache();
    try {
      // 1. Resolve SharePoint user ID using ensureUser
      let spUserId: number | null = assignment.user_id || null;
      if (!spUserId && (assignment.login_name || assignment.user_email)) {
        try {
          const targetLogon = assignment.login_name || assignment.user_email;
          const ensured = await this._sp.ensureUser(targetLogon);
          spUserId = ensured.Id;
        } catch (ensureErr) {
          console.warn("[SharePointCERDataService] ensureUser resolution warning during updateUserRole:", ensureErr);
        }
      }

      const payload: Record<string, any> = {
        Title: assignment.user_name,
        role: assignment.role,
        department: assignment.department || "",
      };

      if (assignment.approval_level) {
        payload.approvalLevel = assignment.approval_level;
      }
      if (spUserId) {
        payload.UserId = spUserId;
      }

      const candidateLists = ["CERUserRoles"];
      let updated = false;

      for (const listName of candidateLists) {
        try {
          await this._sp.updateListItem(listName, assignment.id, payload);
          updated = true;
          break;
        } catch (updateErr: any) {
          const errStr = String(updateErr?.message || "").toLowerCase();
          const fallbackPayload: Record<string, any> = { ...payload };
          if (errStr.includes("userid") || errStr.includes("user")) delete fallbackPayload.UserId;
          if (errStr.includes("approvallevel")) {
            delete fallbackPayload.approvalLevel;
            fallbackPayload.approval_level = assignment.approval_level || null;
          }
          try {
            await this._sp.updateListItem(listName, assignment.id, fallbackPayload);
            updated = true;
            break;
          } catch {
            // try next candidate
          }
        }
      }

      if (!updated) {
        throw new Error(`Failed to update item ${assignment.id} in CERUserRoles.`);
      }

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
        // ignore audit logging error
      }
      return;
    } catch (e) {
      console.error("[SharePointCERDataService] updateUserRole failed in SharePoint:", e);
      throw new Error(`Unable to update user role for '${assignment.user_name}' in SharePoint CERUserRoles list: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  public async revokeUserRole(
    assignmentId: string,
    actor: { name: string; email: string }
  ): Promise<void> {
    this.clearCache();
    try {
      const candidateLists = ["CERUserRoles"];
      let deleted = false;
      for (const listName of candidateLists) {
        try {
          await this._sp.deleteListItem(listName, assignmentId);
          deleted = true;
          break;
        } catch {
          // try next
        }
      }

      if (!deleted) {
        throw new Error(`Failed to delete item ${assignmentId} from CERUserRoles.`);
      }

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
      throw new Error(`Unable to revoke user role assignment '${assignmentId}' in SharePoint CERUserRoles list: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  // ---------------------------------------------------------------------------
  // 7. Administrative Audit Log
  // ---------------------------------------------------------------------------

  public async getAdminAuditLog(): Promise<IAdminAuditRecord[]> {
    for (const listName of ["CERAdminAuditLog", "CER_AdminAuditLog"]) {
      try {
        const items = await this._sp.getListItems<Record<string, any>>(listName, {
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
        // try next
      }
    }
    return [];
  }

  public async logAdminAudit(record: Omit<IAdminAuditRecord, "id">): Promise<void> {
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

    for (const listName of ["CERAdminAuditLog", "CER_AdminAuditLog"]) {
      try {
        await this._sp.createListItem(listName, payload);
        return;
      } catch (e) {
        // try next
      }
    }
  }
}


