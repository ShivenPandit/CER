import { SPHttpClient, SPHttpClientResponse } from "@microsoft/sp-http";
import { ICERDataService } from "./ICERDataService";
import { ICERProposal } from "../models/CERModel";
import { ICERAuditRecord, ICERRemarksVersion } from "../models/AuditModel";
import { IWorkflowLevel, IApprovalDecision, INotificationLog } from "../models/WorkflowModel";
import { ICERAttachment } from "../models/AttachmentModel";
import { LocalMockCERDataService } from "./LocalMockCERDataService";

export class SharePointCERDataService implements ICERDataService {
  private _spHttpClient: SPHttpClient;
  private _siteUrl: string;
  private _fallbackMock: LocalMockCERDataService;

  constructor(spHttpClient: SPHttpClient, siteUrl: string) {
    this._spHttpClient = spHttpClient;
    this._siteUrl = siteUrl;
    this._fallbackMock = new LocalMockCERDataService();
  }

  public async getAllProposals(): Promise<ICERProposal[]> {
    try {
      const endpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_Proposals')/items?$top=500&$orderby=Created desc`;
      const response: SPHttpClientResponse = await this._spHttpClient.get(
        endpoint,
        SPHttpClient.configurations.v1,
        { headers: { Accept: "application/json;odata=nometadata" } }
      );

      if (response.ok) {
        const json = await response.json();
        if (json.value && json.value.length > 0) {
          return json.value.map((item: any) => this._mapSharePointItemToProposal(item));
        }
      }
      return this._fallbackMock.getAllProposals();
    } catch (e) {
      console.warn("[SharePointCERDataService] Failed to query SharePoint list, falling back to local store:", e);
      return this._fallbackMock.getAllProposals();
    }
  }

  public async getProposalByNumber(cerprno: string): Promise<ICERProposal | null> {
    try {
      const filter = encodeURIComponent(`cerprno eq '${cerprno}'`);
      const endpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_Proposals')/items?$filter=${filter}&$top=1`;
      const response: SPHttpClientResponse = await this._spHttpClient.get(
        endpoint,
        SPHttpClient.configurations.v1,
        { headers: { Accept: "application/json;odata=nometadata" } }
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
    return this._fallbackMock.generateProposalNumber();
  }

  public async createProposal(proposal: ICERProposal): Promise<{ success: boolean; message: string; proposal: ICERProposal }> {
    try {
      const endpoint = `${this._siteUrl}/_api/web/lists/getByTitle('CER_Proposals')/items`;
      const payload = this._mapProposalToSharePointItem(proposal);

      const response: SPHttpClientResponse = await this._spHttpClient.post(
        endpoint,
        SPHttpClient.configurations.v1,
        {
          headers: {
            Accept: "application/json;odata=nometadata",
            "Content-type": "application/json;odata=verbose"
          },
          body: JSON.stringify(payload)
        }
      );

      if (response.ok) {
        return {
          success: true,
          message: "CER Proposal No. has been created and sent for approval",
          proposal
        };
      }
      return this._fallbackMock.createProposal(proposal);
    } catch (e) {
      return this._fallbackMock.createProposal(proposal);
    }
  }

  public async updateProposal(
    proposal: ICERProposal,
    user: { name: string; email: string }
  ): Promise<{ success: boolean; message: string; proposal: ICERProposal; auditRowsCount: number }> {
    return this._fallbackMock.updateProposal(proposal, user);
  }

  public async getAuditTrail(cerprno?: string): Promise<ICERAuditRecord[]> {
    return this._fallbackMock.getAuditTrail(cerprno);
  }

  public async getRemarksHistory(cerprno: string): Promise<ICERRemarksVersion[]> {
    return this._fallbackMock.getRemarksHistory(cerprno);
  }

  public async getWorkflowLevels(): Promise<IWorkflowLevel[]> {
    return this._fallbackMock.getWorkflowLevels();
  }

  public async saveWorkflowLevels(levels: IWorkflowLevel[]): Promise<void> {
    return this._fallbackMock.saveWorkflowLevels(levels);
  }

  public async getApprovalDecisions(cerprno: string): Promise<IApprovalDecision[]> {
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
    return this._fallbackMock.recordDecision(params);
  }

  public async getAttachments(cerprno: string): Promise<ICERAttachment[]> {
    return this._fallbackMock.getAttachments(cerprno);
  }

  public async addAttachment(attachment: ICERAttachment): Promise<void> {
    return this._fallbackMock.addAttachment(attachment);
  }

  public async deleteAttachment(id: string): Promise<void> {
    return this._fallbackMock.deleteAttachment(id);
  }

  public async getNotificationLogs(cerprno?: string): Promise<INotificationLog[]> {
    return this._fallbackMock.getNotificationLogs(cerprno);
  }

  private _mapSharePointItemToProposal(item: any): ICERProposal {
    return {
      id: String(item.Id || item.id),
      cerprno: item.cerprno || item.Title,
      pr_name: item.pr_name || "",
      owname: item.owname || "",
      owner_email: item.owner_email || "",
      sbu: item.sbu || "RJ North",
      status: item.status || "In Approval",
      object: item.object || "",
      amount: Number(item.amount || 0),
      currency: item.currency || "USD",
      cat: item.cat || "Vital",
      payable: item.payable || "Payback",
      period: item.period || "",
      ben_npv: Number(item.ben_npv || 0),
      ben_irr: Number(item.ben_irr || 0),
      cost_assumptions: item.cost_assumptions || "",
      st_date: item.st_date || "",
      com_date: item.com_date || "",
      duration_months: Number(item.duration_months || 0),
      cbudget: item.cbudget || "Yes",
      cb_amnt: Number(item.cb_amnt || 0),
      cb_currency: item.cb_currency || "USD",
      reason: item.reason || "",
      jv: item.jv || "No",
      jv_cost: Number(item.jv_cost || 0),
      jv_budget: item.jv_budget || "No",
      jv_amnt: Number(item.jv_amnt || 0),
      jv_reason: item.jv_reason || "",
      ph_till_label: item.ph_till_label || "Till FY26",
      ph_fy_label: item.ph_fy_label || "FY 26-27",
      ph_beyond_label: item.ph_beyond_label || "Beyond FY27",
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
      pending_with_role: item.pending_with_role || "L1 Approver",
      pending_with_email: item.pending_with_email || "",
      created_date: item.Created || new Date().toISOString(),
      created_by: item.Author?.Title || "System",
      modified_date: item.Modified || new Date().toISOString(),
      modified_by: item.Editor?.Title || "System",
      revision_count: Number(item.revision_count || 0)
    };
  }

  private _mapProposalToSharePointItem(proposal: ICERProposal): any {
    return {
      Title: proposal.cerprno,
      cerprno: proposal.cerprno,
      pr_name: proposal.pr_name,
      owname: proposal.owname,
      owner_email: proposal.owner_email,
      sbu: proposal.sbu,
      status: proposal.status,
      object: proposal.object,
      amount: proposal.amount,
      currency: proposal.currency,
      cat: proposal.cat,
      payable: proposal.payable,
      period: proposal.period,
      ben_npv: proposal.ben_npv,
      ben_irr: proposal.ben_irr,
      cost_assumptions: proposal.cost_assumptions,
      st_date: proposal.st_date,
      com_date: proposal.com_date,
      duration_months: proposal.duration_months,
      cbudget: proposal.cbudget,
      cb_amnt: proposal.cb_amnt,
      cb_currency: proposal.cb_currency,
      reason: proposal.reason,
      jv: proposal.jv,
      jv_cost: proposal.jv_cost,
      jv_budget: proposal.jv_budget,
      jv_amnt: proposal.jv_amnt,
      jv_reason: proposal.jv_reason,
      prod_till: proposal.prod_till,
      prod_fy: proposal.prod_fy,
      prod_beyond: proposal.prod_beyond,
      capex_till: proposal.capex_till,
      capex_fy: proposal.capex_fy,
      capex_beyond: proposal.capex_beyond,
      opex_till: proposal.opex_till,
      opex_fy: proposal.opex_fy,
      opex_beyond: proposal.opex_beyond,
      engineer: proposal.engineer,
      s_fac: proposal.s_fac,
      comis: proposal.comis,
      preop: proposal.preop,
      others: proposal.others,
      total: proposal.total,
      remarks: proposal.remarks,
      remarks_jv: proposal.remarks_jv,
      current_level: proposal.current_level,
      pending_with_role: proposal.pending_with_role,
      pending_with_email: proposal.pending_with_email
    };
  }
}
