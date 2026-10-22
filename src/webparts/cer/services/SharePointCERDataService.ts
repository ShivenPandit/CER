import { SPHttpClient, SPHttpClientResponse, MSGraphClientV3 } from "@microsoft/sp-http";
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
} from "../models/WorkflowModel";
import { ICERAttachment } from "../models/AttachmentModel";
import { IDirectoryUser } from "../models/UserModel";
import { LocalMockCERDataService } from "./LocalMockCERDataService";
import { validateAttachment } from "../utils/attachmentValidation";

export class SharePointCERDataService implements ICERDataService {
  private _spHttpClient: SPHttpClient;
  private _siteUrl: string;
  private _context?: WebPartContext;
  private _fallbackMock: LocalMockCERDataService;
  private _cachedFieldChoices?: IFieldChoices;

  constructor(spHttpClient: SPHttpClient, siteUrl: string, context?: WebPartContext) {
    this._spHttpClient = spHttpClient;
    this._siteUrl = siteUrl;
    this._context = context;
    this._fallbackMock = new LocalMockCERDataService();
  }

  // ---------------------------------------------------------------------------
  // 0. Dropdown Choice Fields from SharePoint List Schema
  // ---------------------------------------------------------------------------

  public async getFieldChoices(): Promise<IFieldChoices> {
    if (this._cachedFieldChoices) {
      return this._cachedFieldChoices;
    }

    try {
      const endpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_Proposals')/fields?$filter=TypeAsString eq 'Choice'&$select=InternalName,Title,Choices,DefaultValue`;
      const response: SPHttpClientResponse = await this._spHttpClient.get(
        endpoint,
        SPHttpClient.configurations.v1,
        { headers: { Accept: "application/json;odata=nometadata" } },
      );

      if (response.ok) {
        const json = await response.json();
        if (json.value && Array.isArray(json.value) && json.value.length > 0) {
          const choicesMap: Record<string, string[]> = {};
          for (const f of json.value) {
            const internalName = String(f.InternalName || "");
            if (Array.isArray(f.Choices) && f.Choices.length > 0) {
              choicesMap[internalName] = f.Choices.map((c: any) => String(c).trim()).filter(Boolean);
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
      }
    } catch (e) {
      console.warn("[SharePointCERDataService] Error querying choice fields from CER_Proposals list:", e);
    }

    return this._fallbackMock.getFieldChoices();
  }


  // ---------------------------------------------------------------------------
  // 1. CER_Proposals Operations
  // ---------------------------------------------------------------------------

  public async getAllProposals(): Promise<ICERProposal[]> {
    try {
      const endpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_Proposals')/items?$top=500&$orderby=Created desc`;
      const response: SPHttpClientResponse = await this._spHttpClient.get(
        endpoint,
        SPHttpClient.configurations.v1,
        { headers: { Accept: "application/json;odata=nometadata" } },
      );

      if (response.ok) {
        const json = await response.json();
        if (json.value && json.value.length > 0) {
          return json.value.map((item: Record<string, unknown>) =>
            this._mapSharePointItemToProposal(item),
          );
        }
      }
      return this._fallbackMock.getAllProposals();
    } catch (e) {
      console.warn(
        "[SharePointCERDataService] Failed to query CER_Proposals list, falling back to local store:",
        e,
      );
      return this._fallbackMock.getAllProposals();
    }
  }

  public async getProposalByNumber(
    cerprno: string,
  ): Promise<ICERProposal | null> {
    try {
      const filter = encodeURIComponent(`cerprno eq '${cerprno}'`);
      const endpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_Proposals')/items?$filter=${filter}&$top=1`;
      const response: SPHttpClientResponse = await this._spHttpClient.get(
        endpoint,
        SPHttpClient.configurations.v1,
        { headers: { Accept: "application/json;odata=nometadata" } },
      );

      if (response.ok) {
        const json = await response.json();
        if (json.value && json.value.length > 0) {
          return this._mapSharePointItemToProposal(json.value[0]);
        }
      }
      return this._fallbackMock.getProposalByNumber(cerprno);
    } catch (e) {
      return this._fallbackMock.getProposalByNumber(cerprno);
    }
  }

  public async generateProposalNumber(): Promise<string> {
    try {
      const year = new Date().getFullYear();
      const endpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_Proposals')/items?$select=cerprno&$top=500&$orderby=Created desc`;
      const response: SPHttpClientResponse = await this._spHttpClient.get(
        endpoint,
        SPHttpClient.configurations.v1,
        { headers: { Accept: "application/json;odata=nometadata" } },
      );

      if (response.ok) {
        const json = await response.json();
        const prefix = `CER-${year}-`;
        let highest = 0;
        if (json.value && Array.isArray(json.value)) {
          for (const item of json.value) {
            const no = String(item.cerprno || "");
            if (no.startsWith(prefix)) {
              const numPart = parseInt(no.replace(prefix, ""), 10);
              if (!isNaN(numPart) && numPart > highest) {
                highest = numPart;
              }
            }
          }
        }
        const nextNum = highest + 1;
        return `${prefix}${("0000" + nextNum).slice(-4)}`;
      }
    } catch (e) {
      // fallback
    }
    return this._fallbackMock.generateProposalNumber();
  }

  public async createProposal(
    proposal: ICERProposal,
  ): Promise<{ success: boolean; message: string; proposal: ICERProposal }> {
    const now = new Date().toISOString();
    const newProposal: ICERProposal = {
      ...proposal,
      status: proposal.status || "In Approval",
      current_level: 1,
      pending_with_role: proposal.pending_with_role || "L1 - Technical Review",
      created_date: now,
      modified_date: now,
      revision_count: 0,
    };

    try {
      const endpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_Proposals')/items`;
      const payload = this._mapProposalToSharePointItem(newProposal);

      const response: SPHttpClientResponse = await this._spHttpClient.post(
        endpoint,
        SPHttpClient.configurations.v1,
        {
          headers: {
            Accept: "application/json;odata=nometadata",
            "Content-Type": "application/json;odata=nometadata",
          },
          body: JSON.stringify(payload),
        },
      );

      if (response.ok) {
        const createdItem = await response.json();
        if (createdItem && createdItem.Id) {
          newProposal.id = String(createdItem.Id);
        }

        // 1. Also log initial narrative remarks into CER_RemarksHistory
        if (newProposal.remarks && newProposal.remarks.trim()) {
          await this._createRemarksRecord(newProposal.cerprno, 1, newProposal.remarks, newProposal.created_by);
        }

        // 2. Also log workflow dispatch notification into CER_Notifications
        await this._createNotificationRecord(
          newProposal.cerprno,
          [newProposal.owner_email, newProposal.pending_with_email].filter(Boolean),
          `[CER Action Required] New Proposal ${newProposal.cerprno} - ${newProposal.pr_name}`,
          `CER Proposal ${newProposal.cerprno} (${newProposal.pr_name}) for ${newProposal.currency} ${newProposal.amount.toLocaleString()} has been submitted and is awaiting Level 1 approval.`,
          0
        );

        // Keep local fallback in sync
        try {
          await this._fallbackMock.createProposal(newProposal);
        } catch {
          // ignore duplicate in local mock
        }

        return {
          success: true,
          message: "CER Proposal No. has been created and sent for approval",
          proposal: newProposal,
        };
      }
    } catch (e) {
      console.warn("[SharePointCERDataService] Error creating proposal in SharePoint, using fallback:", e);
    }

    return this._fallbackMock.createProposal(newProposal);
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

    const updatedProposal: ICERProposal = {
      ...proposal,
      modified_date: now,
      modified_by: user.name,
      revision_count: (original.revision_count || 0) + 1,
    };

    try {
      // Find SharePoint Item ID in CER_Proposals
      const filter = encodeURIComponent(`cerprno eq '${proposal.cerprno}'`);
      const searchRes: SPHttpClientResponse = await this._spHttpClient.get(
        `${this._siteUrl}/_api/web/lists/getByTitle('CER_Proposals')/items?$filter=${filter}&$select=Id&$top=1`,
        SPHttpClient.configurations.v1,
        { headers: { Accept: "application/json;odata=nometadata" } },
      );

      if (searchRes.ok) {
        const searchJson = await searchRes.json();
        if (searchJson.value && searchJson.value.length > 0) {
          const spItemId = searchJson.value[0].Id;
          const payload = this._mapProposalToSharePointItem(updatedProposal);

          // Update proposal in CER_Proposals
          await this._spHttpClient.post(
            `${this._siteUrl}/_api/web/lists/getByTitle('CER_Proposals')/items(${spItemId})`,
            SPHttpClient.configurations.v1,
            {
              headers: {
                Accept: "application/json;odata=nometadata",
                "Content-Type": "application/json;odata=nometadata",
                "X-HTTP-Method": "MERGE",
                "If-Match": "*",
              },
              body: JSON.stringify(payload),
            },
          );

          // Write each delta row to CER_AuditTrail
          for (const record of auditRecords) {
            await this._createAuditRecord(record);
          }

          // If remarks changed, write new version to CER_RemarksHistory
          if (proposal.remarks !== original.remarks && proposal.remarks.trim()) {
            const nextVersion = (original.revision_count || 1) + 1;
            await this._createRemarksRecord(proposal.cerprno, nextVersion, proposal.remarks, user.name);
          }

          // Write notification to CER_Notifications
          await this._createNotificationRecord(
            proposal.cerprno,
            [proposal.owner_email, proposal.pending_with_email].filter(Boolean),
            `[CER Update] Proposal ${proposal.cerprno} - Revision ${updatedProposal.revision_count}`,
            `Proposal ${proposal.cerprno} has been revised by ${user.name} with ${auditRecords.length} updated fields.`,
            0
          );
        }
      }
    } catch (e) {
      console.warn("[SharePointCERDataService] Error updating in SharePoint, falling back:", e);
    }

    // Keep fallback mock in sync
    return this._fallbackMock.updateProposal(updatedProposal, user);
  }

  // ---------------------------------------------------------------------------
  // 2. CER_AuditTrail Operations
  // ---------------------------------------------------------------------------

  public async getAuditTrail(cerprno?: string): Promise<ICERAuditRecord[]> {
    try {
      let endpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_AuditTrail')/items?$top=500&$orderby=Created desc`;
      if (cerprno) {
        endpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_AuditTrail')/items?$filter=cerprno eq '${encodeURIComponent(cerprno)}'&$top=500&$orderby=Created desc`;
      }

      const response: SPHttpClientResponse = await this._spHttpClient.get(
        endpoint,
        SPHttpClient.configurations.v1,
        { headers: { Accept: "application/json;odata=nometadata" } },
      );

      if (response.ok) {
        const json = await response.json();
        if (json.value && json.value.length > 0) {
          return json.value.map((item: any) => ({
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
        }
      }
    } catch (e) {
      console.warn("[SharePointCERDataService] Error querying CER_AuditTrail:", e);
    }
    return this._fallbackMock.getAuditTrail(cerprno);
  }

  private async _createAuditRecord(record: ICERAuditRecord): Promise<void> {
    try {
      const endpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_AuditTrail')/items`;
      await this._spHttpClient.post(
        endpoint,
        SPHttpClient.configurations.v1,
        {
          headers: {
            Accept: "application/json;odata=nometadata",
            "Content-Type": "application/json;odata=nometadata",
          },
          body: JSON.stringify({
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
          }),
        },
      );
    } catch (e) {
      // non-blocking
    }
  }

  // ---------------------------------------------------------------------------
  // 3. CER_RemarksHistory Operations
  // ---------------------------------------------------------------------------

  public async getRemarksHistory(cerprno: string): Promise<ICERRemarksVersion[]> {
    try {
      const filter = encodeURIComponent(`cerprno eq '${cerprno}'`);
      const endpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_RemarksHistory')/items?$filter=${filter}&$top=100&$orderby=Created desc`;
      const response: SPHttpClientResponse = await this._spHttpClient.get(
        endpoint,
        SPHttpClient.configurations.v1,
        { headers: { Accept: "application/json;odata=nometadata" } },
      );

      if (response.ok) {
        const json = await response.json();
        if (json.value && json.value.length > 0) {
          return json.value.map((item: any) => ({
            id: String(item.Id || item.id),
            cerprno: item.cerprno || item.Title,
            version: Number(item.version || 1),
            remarks_text: item.remarks_text || "",
            remarks_type: item.remarks_type || "REMARKS",
            word_count: Number(item.word_count || (item.remarks_text ? item.remarks_text.split(/\s+/).filter(Boolean).length : 0)),
            created_by: item.created_by_user || item.Author?.Title || "System User",
            created_date: item.revision_date || item.Created || new Date().toISOString(),
          }));
        }
      }
    } catch (e) {
      console.warn("[SharePointCERDataService] Error querying CER_RemarksHistory:", e);
    }
    return this._fallbackMock.getRemarksHistory(cerprno);
  }

  private async _createRemarksRecord(
    cerprno: string,
    version: number,
    remarksText: string,
    createdBy: string,
  ): Promise<void> {
    try {
      const endpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_RemarksHistory')/items`;
      await this._spHttpClient.post(
        endpoint,
        SPHttpClient.configurations.v1,
        {
          headers: {
            Accept: "application/json;odata=nometadata",
            "Content-Type": "application/json;odata=nometadata",
          },
          body: JSON.stringify({
            Title: cerprno,
            cerprno: cerprno,
            version: version,
            remarks_text: remarksText,
            remarks_type: "REMARKS",
            word_count: remarksText.split(/\s+/).filter(Boolean).length,
            created_by_user: createdBy,
            revision_date: new Date().toISOString(),
          }),
        },
      );
    } catch (e) {
      // non-blocking
    }
  }

  // ---------------------------------------------------------------------------
  // 4. CER_WorkflowLevels Operations
  // ---------------------------------------------------------------------------

  public async getWorkflowLevels(): Promise<IWorkflowLevel[]> {
    try {
      const endpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_WorkflowLevels')/items?$top=50&$orderby=level_id asc`;
      const response: SPHttpClientResponse = await this._spHttpClient.get(
        endpoint,
        SPHttpClient.configurations.v1,
        { headers: { Accept: "application/json;odata=nometadata" } },
      );

      if (response.ok) {
        const json = await response.json();
        if (json.value && json.value.length > 0) {
          return json.value.map((item: any) => ({
            id: String(item.Id || item.id),
            level_id: Number(item.level_id || 1),
            level_name: item.level_name || item.Title || `Level ${item.level_id}`,
            role_title: item.role_title || "",
            approver_name: item.approver_name || "",
            approver_email: item.approver_email || "",
            min_amount: item.min_amount !== undefined && item.min_amount !== null ? Number(item.min_amount) : undefined,
            max_amount: item.max_amount !== undefined && item.max_amount !== null ? Number(item.max_amount) : undefined,
            is_active: item.is_active !== undefined ? !!item.is_active : true,
          }));
        } else {
          // If empty, auto-seed standard levels to SharePoint list
          const defaultLevels = await this._fallbackMock.getWorkflowLevels();
          for (const lvl of defaultLevels) {
            await this._createWorkflowLevelRecord(lvl);
          }
          return defaultLevels;
        }
      }
    } catch (e) {
      console.warn("[SharePointCERDataService] Error querying CER_WorkflowLevels:", e);
    }
    return this._fallbackMock.getWorkflowLevels();
  }

  public async saveWorkflowLevels(levels: IWorkflowLevel[]): Promise<void> {
    try {
      for (const lvl of levels) {
        const filter = encodeURIComponent(`level_id eq ${lvl.level_id}`);
        const res = await this._spHttpClient.get(
          `${this._siteUrl}/_api/web/lists/getByTitle('CER_WorkflowLevels')/items?$filter=${filter}&$select=Id&$top=1`,
          SPHttpClient.configurations.v1,
          { headers: { Accept: "application/json;odata=nometadata" } },
        );
        if (res.ok) {
          const json = await res.json();
          if (json.value && json.value.length > 0) {
            const spId = json.value[0].Id;
            await this._spHttpClient.post(
              `${this._siteUrl}/_api/web/lists/getByTitle('CER_WorkflowLevels')/items(${spId})`,
              SPHttpClient.configurations.v1,
              {
                headers: {
                  Accept: "application/json;odata=nometadata",
                  "Content-Type": "application/json;odata=nometadata",
                  "X-HTTP-Method": "MERGE",
                  "If-Match": "*",
                },
                body: JSON.stringify({
                  Title: lvl.level_name,
                  level_id: lvl.level_id,
                  level_name: lvl.level_name,
                  role_title: lvl.role_title,
                  approver_name: lvl.approver_name,
                  approver_email: lvl.approver_email,
                  min_amount: lvl.min_amount || null,
                  max_amount: lvl.max_amount || null,
                  is_active: lvl.is_active,
                }),
              },
            );
            continue;
          }
        }
        await this._createWorkflowLevelRecord(lvl);
      }
    } catch (e) {
      console.warn("[SharePointCERDataService] Error saving workflow levels to SharePoint:", e);
    }
    await this._fallbackMock.saveWorkflowLevels(levels);
  }

  private async _createWorkflowLevelRecord(lvl: IWorkflowLevel): Promise<void> {
    try {
      await this._spHttpClient.post(
        `${this._siteUrl}/_api/web/lists/getByTitle('CER_WorkflowLevels')/items`,
        SPHttpClient.configurations.v1,
        {
          headers: {
            Accept: "application/json;odata=nometadata",
            "Content-Type": "application/json;odata=nometadata",
          },
          body: JSON.stringify({
            Title: lvl.level_name,
            level_id: lvl.level_id,
            level_name: lvl.level_name,
            role_title: lvl.role_title,
            approver_name: lvl.approver_name,
            approver_email: lvl.approver_email,
            min_amount: lvl.min_amount || null,
            max_amount: lvl.max_amount || null,
            is_active: lvl.is_active,
          }),
        },
      );
    } catch (e) {
      // non-blocking
    }
  }

  // ---------------------------------------------------------------------------
  // 5. CER_ApprovalDecisions Operations
  // ---------------------------------------------------------------------------

  public async getApprovalDecisions(cerprno: string): Promise<IApprovalDecision[]> {
    try {
      const filter = encodeURIComponent(`cerprno eq '${cerprno}'`);
      const endpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_ApprovalDecisions')/items?$filter=${filter}&$top=100&$orderby=Created desc`;
      const response: SPHttpClientResponse = await this._spHttpClient.get(
        endpoint,
        SPHttpClient.configurations.v1,
        { headers: { Accept: "application/json;odata=nometadata" } },
      );

      if (response.ok) {
        const json = await response.json();
        if (json.value && json.value.length > 0) {
          return json.value.map((item: any) => ({
            id: String(item.Id || item.id),
            cerprno: item.cerprno || item.Title,
            level_id: Number(item.level_id || 1),
            level_name: item.level_name || `Level ${item.level_id}`,
            approver_name: item.approver_name || "",
            approver_email: item.approver_email || "",
            decision: item.decision as "APPROVED" | "REJECTED",
            comments: item.comments || "",
            decision_date: item.decision_date || item.Created || new Date().toISOString(),
          }));
        }
      }
    } catch (e) {
      console.warn("[SharePointCERDataService] Error querying CER_ApprovalDecisions:", e);
    }
    return this._fallbackMock.getApprovalDecisions(cerprno);
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

    try {
      // 1. Post decision record to CER_ApprovalDecisions
      const endpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_ApprovalDecisions')/items`;
      await this._spHttpClient.post(
        endpoint,
        SPHttpClient.configurations.v1,
        {
          headers: {
            Accept: "application/json;odata=nometadata",
            "Content-Type": "application/json;odata=nometadata",
          },
          body: JSON.stringify({
            Title: params.cerprno,
            cerprno: params.cerprno,
            level_id: params.level_id,
            level_name: `Level ${params.level_id}`,
            approver_name: params.approver_name,
            approver_email: params.approver_email,
            decision: params.decision,
            comments: params.comments || "",
            decision_date: now,
          }),
        },
      );

      // 2. Determine workflow outcome and update CER_Proposals
      const workflowLevels = await this.getWorkflowLevels();
      const currentLevelIndex = workflowLevels.findIndex((l) => l.level_id === params.level_id);
      let newStatus = "In Approval";
      let nextLevel = params.level_id;
      let nextRole = "";
      let nextEmail = "";

      if (params.decision === "REJECTED") {
        newStatus = "Rejected";
      } else if (currentLevelIndex === workflowLevels.length - 1) {
        newStatus = "Approved";
      } else {
        const nextLvl = workflowLevels[currentLevelIndex + 1];
        nextLevel = nextLvl ? nextLvl.level_id : params.level_id + 1;
        nextRole = nextLvl ? nextLvl.role_title : "";
        nextEmail = nextLvl ? nextLvl.approver_email : "";
      }

      // Update proposal item in CER_Proposals
      const filter = encodeURIComponent(`cerprno eq '${params.cerprno}'`);
      const propRes = await this._spHttpClient.get(
        `${this._siteUrl}/_api/web/lists/getByTitle('CER_Proposals')/items?$filter=${filter}&$select=Id&$top=1`,
        SPHttpClient.configurations.v1,
        { headers: { Accept: "application/json;odata=nometadata" } },
      );

      if (propRes.ok) {
        const propJson = await propRes.json();
        if (propJson.value && propJson.value.length > 0) {
          const spId = propJson.value[0].Id;
          await this._spHttpClient.post(
            `${this._siteUrl}/_api/web/lists/getByTitle('CER_Proposals')/items(${spId})`,
            SPHttpClient.configurations.v1,
            {
              headers: {
                Accept: "application/json;odata=nometadata",
                "Content-Type": "application/json;odata=nometadata",
                "X-HTTP-Method": "MERGE",
                "If-Match": "*",
              },
              body: JSON.stringify({
                status: newStatus,
                current_level: nextLevel,
                pending_with_role: nextRole,
                pending_with_email: nextEmail,
                modified_date: now,
                modified_by: params.approver_name,
              }),
            },
          );
        }
      }

      // 3. Log notification to CER_Notifications
      await this._createNotificationRecord(
        params.cerprno,
        [params.approver_email, nextEmail].filter(Boolean),
        `[CER Decision] ${params.cerprno} ${params.decision}`,
        `Proposal ${params.cerprno} has been ${params.decision} at Level ${params.level_id} by ${params.approver_name}. Current status: ${newStatus}.`,
        0
      );
    } catch (e) {
      console.warn("[SharePointCERDataService] Error recording decision in SharePoint:", e);
    }

    return this._fallbackMock.recordDecision(params);
  }

  // ---------------------------------------------------------------------------
  // 6. CER_Attachments Operations (Document Library)
  // ---------------------------------------------------------------------------

  public async getAttachments(cerprno: string): Promise<ICERAttachment[]> {
    try {
      const filter = encodeURIComponent(`cerprno eq '${cerprno}'`);
      const endpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_Attachments')/items?$filter=${filter}&$select=Id,FileLeafRef,FileRef,cerprno,uploaded_by,file_size,file_type,Created,File/ServerRelativeUrl,File/Length&$expand=File&$top=100`;
      const response: SPHttpClientResponse = await this._spHttpClient.get(
        endpoint,
        SPHttpClient.configurations.v1,
        { headers: { Accept: "application/json;odata=nometadata" } },
      );

      if (response.ok) {
        const json = await response.json();
        if (json.value && json.value.length > 0) {
          const spAttachments: ICERAttachment[] = json.value.map((item: any) => ({
            id: String(item.Id || item.id),
            cerprno: item.cerprno || cerprno,
            name: item.FileLeafRef || item.File?.Name || "document",
            size: Number(item.file_size || item.File?.Length || 0),
            type: item.file_type || "application/octet-stream",
            data_url: item.File?.ServerRelativeUrl || item.FileRef || "",
            uploaded_by: item.uploaded_by || "User",
            uploaded_date: item.Created || new Date().toISOString(),
          }));
          return spAttachments;
        }
      }
    } catch (e) {
      console.warn("[SharePointCERDataService] Error querying CER_Attachments:", e);
    }
    return this._fallbackMock.getAttachments(cerprno);
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
        const uploadEndpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_Attachments')/RootFolder/Files/add(url='${encodeURIComponent(fileName)}',overwrite=true)`;

        const uploadRes: SPHttpClientResponse = await this._spHttpClient.post(
          uploadEndpoint,
          SPHttpClient.configurations.v1,
          {
            headers: {
              Accept: "application/json;odata=nometadata",
              "Content-Type": "application/octet-stream",
            },
            body: buffer,
          },
        );

        if (uploadRes.ok) {
          // Retrieve item ID by FileLeafRef for reliable metadata tagging in Document Library
          const itemRes = await this._spHttpClient.get(
            `${this._siteUrl}/_api/web/lists/getByTitle('CER_Attachments')/items?$filter=FileLeafRef eq '${encodeURIComponent(fileName)}'&$select=Id`,
            SPHttpClient.configurations.v1,
            { headers: { Accept: "application/json;odata=nometadata" } },
          );

          if (itemRes.ok) {
            const itemJson = await itemRes.json();
            if (itemJson.value && itemJson.value.length > 0) {
              const itemId = itemJson.value[0].Id;
              await this._spHttpClient.post(
                `${this._siteUrl}/_api/web/lists/getByTitle('CER_Attachments')/items(${itemId})`,
                SPHttpClient.configurations.v1,
                {
                  headers: {
                    Accept: "application/json;odata=nometadata",
                    "Content-Type": "application/json;odata=nometadata",
                    "X-HTTP-Method": "MERGE",
                    "If-Match": "*",
                  },
                  body: JSON.stringify({
                    cerprno: attachment.cerprno,
                    uploaded_by: attachment.uploaded_by,
                    file_size: attachment.size,
                    file_type: attachment.type,
                  }),
                },
              );
            }
          }
        }
      }
    } catch (e) {
      console.warn("[SharePointCERDataService] Failed to upload binary to CER_Attachments:", e);
    }

    return this._fallbackMock.addAttachment(attachment);
  }

  public async deleteAttachment(id: string): Promise<void> {
    try {
      if (/^\d+$/.test(id)) {
        await this._spHttpClient.post(
          `${this._siteUrl}/_api/web/lists/getByTitle('CER_Attachments')/items(${id})`,
          SPHttpClient.configurations.v1,
          {
            headers: {
              Accept: "application/json;odata=nometadata",
              "X-HTTP-Method": "DELETE",
              "If-Match": "*",
            },
          },
        );
      }
    } catch (e) {
      console.warn("[SharePointCERDataService] Error deleting attachment from SharePoint:", e);
    }
    return this._fallbackMock.deleteAttachment(id);
  }

  // ---------------------------------------------------------------------------
  // 7. CER_Notifications Operations
  // ---------------------------------------------------------------------------

  public async getNotificationLogs(cerprno?: string): Promise<INotificationLog[]> {
    try {
      let endpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_Notifications')/items?$top=100&$orderby=Created desc`;
      if (cerprno) {
        endpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_Notifications')/items?$filter=cerprno eq '${encodeURIComponent(cerprno)}'&$top=100&$orderby=Created desc`;
      }
      const response: SPHttpClientResponse = await this._spHttpClient.get(
        endpoint,
        SPHttpClient.configurations.v1,
        { headers: { Accept: "application/json;odata=nometadata" } },
      );

      if (response.ok) {
        const json = await response.json();
        if (json.value && json.value.length > 0) {
          return json.value.map((item: any) => ({
            id: String(item.Id || item.id),
            cerprno: item.cerprno || item.Title,
            recipients: item.recipients ? item.recipients.split(";").map((s: string) => s.trim()) : [],
            subject: item.subject || "",
            body: item.body || "",
            attachments_count: Number(item.attachments_count || 0),
            dispatch_timestamp: item.dispatch_timestamp || item.Created || new Date().toISOString(),
            status: (item.status as "SENT" | "PENDING" | "FAILED") || "SENT",
          }));
        }
      }
    } catch (e) {
      console.warn("[SharePointCERDataService] Error querying CER_Notifications:", e);
    }
    return this._fallbackMock.getNotificationLogs(cerprno);
  }

  private async _createNotificationRecord(
    cerprno: string,
    recipients: string[],
    subject: string,
    body: string,
    attachmentsCount: number,
  ): Promise<void> {
    try {
      const endpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_Notifications')/items`;
      await this._spHttpClient.post(
        endpoint,
        SPHttpClient.configurations.v1,
        {
          headers: {
            Accept: "application/json;odata=nometadata",
            "Content-Type": "application/json;odata=nometadata",
          },
          body: JSON.stringify({
            Title: cerprno,
            cerprno: cerprno,
            recipients: recipients.join("; "),
            subject: subject,
            body: body,
            attachments_count: attachmentsCount,
            dispatch_timestamp: new Date().toISOString(),
            status: "SENT",
          }),
        },
      );
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
      ph_till_label: item.ph_till_label || "Till Mar'26",
      ph_fy_label: item.ph_fy_label || "FY 26-27",
      ph_beyond_label: item.ph_beyond_label || "Beyond FY'27",
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
      ph_till_label: proposal.ph_till_label,
      ph_fy_label: proposal.ph_fy_label,
      ph_beyond_label: proposal.ph_beyond_label,
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
      const endpoint = `${this._siteUrl}/_api/web/siteusers?$filter=PrincipalType eq 1 and Email ne ''&$select=Id,Title,Email,LoginName,IsSiteAdmin`;
      const response: SPHttpClientResponse = await this._spHttpClient.get(
        endpoint,
        SPHttpClient.configurations.v1,
        {
          headers: {
            Accept: "application/json;odata=nometadata",
          },
        }
      );

      if (response.ok) {
        const json = await response.json();
        if (json && json.value && Array.isArray(json.value) && json.value.length > 0) {
          const siteUsers: IDirectoryUser[] = json.value.map((u: any) => {
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
      }
    } catch (siteUsersError) {
      console.warn(
        "[SharePointCERDataService] Querying siteusers failed, falling back to directory search:",
        siteUsersError
      );
    }

    // 2. Query ClientPeoplePickerSearchUser scoped to SharePoint site permissions (PrincipalSource: 1 = SPWeb)
    try {
      const endpoint = `${this._siteUrl}/_api/SP.UI.ApplicationPages.ClientPeoplePickerWebServiceInterface.ClientPeoplePickerSearchUser`;
      const payload = {
        queryParams: {
          __metadata: { type: "SP.UI.ApplicationPages.ClientPeoplePickerQueryParameters" },
          AllowEmailAddresses: true,
          AllowMultipleEntities: false,
          AllUrlZones: false,
          MaximumEntitySuggestions: 15,
          PrincipalSource: 1, // 1 = SPWeb only (users with permission to this site)
          PrincipalType: 1, // Users
          QueryString: trimmed,
        },
      };

      const response: SPHttpClientResponse = await this._spHttpClient.post(
        endpoint,
        SPHttpClient.configurations.v1,
        {
          headers: {
            Accept: "application/json;odata=verbose",
            "Content-Type": "application/json;odata=verbose",
          },
          body: JSON.stringify(payload),
        }
      );

      if (response.ok) {
        const json = await response.json();
        const rawResults = json?.d?.ClientPeoplePickerSearchUser;
        if (rawResults) {
          const parsed = typeof rawResults === "string" ? JSON.parse(rawResults) : rawResults;
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed.map((item: any) => {
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
        }
      }
    } catch (spError) {
      console.warn("[SharePointCERDataService] ClientPeoplePickerSearchUser failed:", spError);
    }

    // 3. Fallback to local store with real portal member personas if offline
    return this._fallbackMock.searchDirectoryUsers(query);
  }
}

