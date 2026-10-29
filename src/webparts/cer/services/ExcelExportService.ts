import * as XLSX from "xlsx";
import { ICERProposal } from "../models/CERModel";
import { calculateExactDays, getCurrentFiscalYearPhasingLabels } from "../utils/dateUtils";

export class ExcelExportService {
  /**
   * Sanitizes strings to prevent Spreadsheet Formula Injection (CSV / XLS injection attacks)
   */
  private static sanitizeFormula(value: any): any {
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (
        trimmed.startsWith("=") ||
        trimmed.startsWith("+") ||
        trimmed.startsWith("-") ||
        trimmed.startsWith("@") ||
        trimmed.startsWith("\t") ||
        trimmed.startsWith("\r")
      ) {
        return `'${trimmed}`;
      }
    }
    return value;
  }

  /**
   * Exports a single CER proposal with full financial, phasing, and cost details aligned
   * with SHAREPOINT_LISTS_AND_COLUMNS_SETUP.md (FR-10)
   */
  public static exportSingleProposal(proposal: ICERProposal): void {
    const defaultPhasing = getCurrentFiscalYearPhasingLabels(
      proposal.created_date ? new Date(proposal.created_date) : new Date()
    );
    const phTill = proposal.ph_till_label || defaultPhasing.ph_till_label;
    const phFy = proposal.ph_fy_label || defaultPhasing.ph_fy_label;
    const phBeyond = proposal.ph_beyond_label || defaultPhasing.ph_beyond_label;

    const p: any = proposal;
    const data = [
      {
        "Proposal Name": this.sanitizeFormula(p.prName || p.pr_name),
        "CER PR Number": this.sanitizeFormula(p.cerPrNo || p.cerprno),
        "CER Owner": this.sanitizeFormula(p.cerOwner || p.owname),
        "Owner Email": this.sanitizeFormula(p.ownerEmail || p.owner_email),
        "SBU": this.sanitizeFormula(p.sbu),
        "Status": this.sanitizeFormula(p.status),
        "Category": this.sanitizeFormula(p.category || p.cat),
        "Proposal Object": this.sanitizeFormula(p.object),
        "Total Amount": p.amount,
        "Currency": this.sanitizeFormula(p.currency),
        "Payable By": this.sanitizeFormula(p.payable),
        "Benefit Period": this.sanitizeFormula(p.period),
        "Payback Quarters": p.paybackQuarters !== undefined && p.paybackQuarters !== null ? p.paybackQuarters : (p.payback_quarters !== undefined && p.payback_quarters !== null ? p.payback_quarters : "N/A"),
        "Benefit NPV": p.benefitNpv !== undefined && p.benefitNpv !== null ? p.benefitNpv : p.ben_npv,
        "Benefit IRR": p.benefitIrr !== undefined && p.benefitIrr !== null ? p.benefitIrr : p.ben_irr,
        "Cost Assumptions": this.sanitizeFormula(p.costAssumptions || p.cost_assumptions),
        "Start Date": this.sanitizeFormula(p.startDate || p.st_date),
        "Completion Date": this.sanitizeFormula(p.completionDate || p.com_date),
        "Duration Months": p.durationMonths !== undefined && p.durationMonths !== null ? p.durationMonths : (p.duration_months !== undefined && p.duration_months !== null ? p.duration_months : calculateExactDays(p.startDate || p.st_date, p.completionDate || p.com_date)),
        "Current Budgeted?": this.sanitizeFormula(p.currentBudgeted || p.cbudget),
        "Current Budget Amount": p.currentBudgetAmount !== undefined && p.currentBudgetAmount !== null ? p.currentBudgetAmount : p.cb_amnt,
        "Current Budget Currency": this.sanitizeFormula(p.currentBudgetCurrency || p.cb_currency),
        "Unbudgeted Reason": this.sanitizeFormula(p.unbudgetedReason || p.reason),
        "Joint Venture?": this.sanitizeFormula(p.jointVenture || p.jv),
        "JV Recoverable?": this.sanitizeFormula(p.jvRecoverable || p.jv_recoverable || "No"),
        "JV Partner Cost": p.jvCost !== undefined && p.jvCost !== null ? p.jvCost : p.jv_cost,
        "JV Budgeted?": this.sanitizeFormula(p.jvBudgeted || p.jv_budget),
        "JV Partner Amount": p.jvAmount !== undefined && p.jvAmount !== null ? p.jvAmount : p.jv_amnt,
        "JV Reason": this.sanitizeFormula(p.jvReason || p.jv_reason),
        [`Production Prior (${phTill})`]: p.prodTill !== undefined && p.prodTill !== null ? p.prodTill : p.prod_till,
        [`Production Current (${phFy})`]: p.prodFy !== undefined && p.prodFy !== null ? p.prodFy : p.prod_fy,
        [`Production Beyond (${phBeyond})`]: p.prodBeyond !== undefined && p.prodBeyond !== null ? p.prodBeyond : p.prod_beyond,
        [`Capex Prior (${phTill})`]: p.capexTill !== undefined && p.capexTill !== null ? p.capexTill : p.capex_till,
        [`Capex Current (${phFy})`]: p.capexFy !== undefined && p.capexFy !== null ? p.capexFy : p.capex_fy,
        [`Capex Beyond (${phBeyond})`]: p.capexBeyond !== undefined && p.capexBeyond !== null ? p.capexBeyond : p.capex_beyond,
        [`Opex Prior (${phTill})`]: p.opexTill !== undefined && p.opexTill !== null ? p.opexTill : p.opex_till,
        [`Opex Current (${phFy})`]: p.opexFy !== undefined && p.opexFy !== null ? p.opexFy : p.opex_fy,
        [`Opex Beyond (${phBeyond})`]: p.opexBeyond !== undefined && p.opexBeyond !== null ? p.opexBeyond : p.opex_beyond,
        "Engineering Cost": p.engineeringCost !== undefined && p.engineeringCost !== null ? p.engineeringCost : p.engineer,
        "Surface Facilities Cost": p.surfaceFacilitiesCost !== undefined && p.surfaceFacilitiesCost !== null ? p.surfaceFacilitiesCost : p.s_fac,
        "Commissioning Cost": p.commissioningCost !== undefined && p.commissioningCost !== null ? p.commissioningCost : p.comis,
        "Preoperative Cost": p.preoperativeCost !== undefined && p.preoperativeCost !== null ? p.preoperativeCost : p.preop,
        "Other Costs": p.otherCosts !== undefined && p.otherCosts !== null ? p.otherCosts : p.others,
        "Total Item Cost": p.total,
        "General Remarks": this.sanitizeFormula(p.remarks),
        "JV Remarks": this.sanitizeFormula(p.remarksJv || p.remarks_jv),
        "Current Approval Level": p.currentLevel !== undefined && p.currentLevel !== null ? p.currentLevel : p.current_level,
        "Pending With Role": this.sanitizeFormula(p.pendingWithRole || p.pending_with_role),
        "Pending With Email": this.sanitizeFormula(p.pendingWithEmail || p.pending_with_email),
        "Revision Count": p.revisionCount !== undefined && p.revisionCount !== null ? p.revisionCount : (p.revision_count || 0),
        "Created Date": p.created_date || p.Created,
        "Created By": this.sanitizeFormula(p.created_by || p.Author?.Title),
        "Last Modified Date": p.modified_date || p.Modified,
        "Last Modified By": this.sanitizeFormula(p.modified_by || p.Editor?.Title),
      },
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CERProposals");

    const now = new Date().toISOString().split("T")[0];
    const fileName = `${p.cerPrNo || p.cerprno}_Summary_${now}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  /**
   * Transforms proposal raw data into clean export row format with formula sanitization.
   */
  public static mapProposalToExportRow(raw: any): Record<string, any> {
    return {
      "CER PR Number": this.sanitizeFormula(raw.cerPrNo || raw.cerprno),
      "Proposal Name": this.sanitizeFormula(raw.prName || raw.pr_name),
      "CER Owner": this.sanitizeFormula(raw.cerOwner || raw.owname),
      "Owner Email": this.sanitizeFormula(raw.ownerEmail || raw.owner_email),
      "SBU": this.sanitizeFormula(raw.sbu),
      "Status": this.sanitizeFormula(raw.status),
      "Category": this.sanitizeFormula(raw.category || raw.cat),
      "Payable By": this.sanitizeFormula(raw.payable),
      "Total Amount": raw.amount,
      "Currency": this.sanitizeFormula(raw.currency),
      "Benefit NPV": raw.benefitNpv !== undefined && raw.benefitNpv !== null ? raw.benefitNpv : raw.ben_npv,
      "Benefit IRR": raw.benefitIrr !== undefined && raw.benefitIrr !== null ? raw.benefitIrr : raw.ben_irr,
      "Current Budgeted?": this.sanitizeFormula(raw.currentBudgeted || raw.cbudget),
      "Current Budget Amount": raw.currentBudgetAmount !== undefined && raw.currentBudgetAmount !== null ? raw.currentBudgetAmount : raw.cb_amnt,
      "Joint Venture?": this.sanitizeFormula(raw.jointVenture || raw.jv),
      "JV Partner Amount": raw.jvAmount !== undefined && raw.jvAmount !== null ? raw.jvAmount : raw.jv_amnt,
      "Total Item Cost": raw.total,
      "Start Date": this.sanitizeFormula(raw.startDate || raw.st_date),
      "Completion Date": this.sanitizeFormula(raw.completionDate || raw.com_date),
      "Duration Months": raw.durationMonths !== undefined && raw.durationMonths !== null ? raw.durationMonths : (raw.duration_months !== undefined && raw.duration_months !== null ? raw.duration_months : calculateExactDays(raw.startDate || raw.st_date, raw.completionDate || raw.com_date)),
      "Current Approval Level": raw.currentLevel !== undefined && raw.currentLevel !== null ? raw.currentLevel : raw.current_level,
      "Pending With Role": this.sanitizeFormula(raw.pendingWithRole || raw.pending_with_role),
      "Pending With Email": this.sanitizeFormula(raw.pendingWithEmail || raw.pending_with_email),
      "Created Date": (raw.created_date || raw.Created) ? String(raw.created_date || raw.Created).split("T")[0] : "",
    };
  }

  /**
   * Asynchronous chunked Excel export for large datasets (up to 25,000+ items).
   * Yields execution to the browser event loop periodically to prevent UI thread freezing.
   */
  public static async exportProposalListAsync(
    proposals: ICERProposal[],
    reportTitle: string = "CERProposals_Report",
    chunkSize: number = 500,
  ): Promise<void> {
    if (!proposals || proposals.length === 0) {
      alert("No data available to export.");
      return;
    }

    const data: Record<string, any>[] = [];
    for (let i = 0; i < proposals.length; i += chunkSize) {
      const slice = proposals.slice(i, i + chunkSize);
      for (const p of slice) {
        data.push(this.mapProposalToExportRow(p));
      }
      if (i + chunkSize < proposals.length) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CERProposals");

    const now = new Date().toISOString().split("T")[0];
    const fileName = `${reportTitle}_${now}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  /**
   * Exports an array of CER proposals for the Reports module (FR-04, FR-10)
   * aligned with SHAREPOINT_LISTS_AND_COLUMNS_SETUP.md
   */
  public static exportProposalList(proposals: ICERProposal[], reportTitle: string = "CERProposals_Report"): void {
    if (!proposals || proposals.length === 0) {
      alert("No data available to export.");
      return;
    }

    const data = proposals.map((p) => this.mapProposalToExportRow(p));
    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CERProposals");

    const now = new Date().toISOString().split("T")[0];
    const fileName = `${reportTitle}_${now}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }
}
