import * as XLSX from "xlsx";
import { ICERProposal } from "../models/CERModel";

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
   * Exports a single CER proposal with full financial, phasing, and cost details (FR-10)
   */
  public static exportSingleProposal(proposal: ICERProposal): void {
    const data = [
      {
        "Proposal Number": this.sanitizeFormula(proposal.cerprno),
        "Project Name": this.sanitizeFormula(proposal.pr_name),
        "CER Owner": this.sanitizeFormula(proposal.owname),
        "Owner Email": this.sanitizeFormula(proposal.owner_email),
        "Strategic Business Unit (SBU)": this.sanitizeFormula(proposal.sbu),
        "Status": this.sanitizeFormula(proposal.status),
        "Category": this.sanitizeFormula(proposal.cat),
        "Business Object": this.sanitizeFormula(proposal.object),
        "Amount of CER": proposal.amount,
        "Currency": this.sanitizeFormula(proposal.currency),
        "Payback / Non-Payback": this.sanitizeFormula(proposal.payable),
        "Financial Benefits - NPV ($mm)": proposal.ben_npv,
        "Financial Benefits - IRR (%)": proposal.ben_irr,
        "Project Start Date": this.sanitizeFormula(proposal.st_date),
        "Project Completion Date": this.sanitizeFormula(proposal.com_date),
        "Duration (Months)": proposal.duration_months,
        "Corporate Budget": this.sanitizeFormula(proposal.cbudget),
        "Corporate Budget Amount": proposal.cb_amnt,
        "Corporate Budget Currency": this.sanitizeFormula(proposal.cb_currency),
        "Reason if Not Budgeted": this.sanitizeFormula(proposal.reason),
        "Joint Venture Alignment": this.sanitizeFormula(proposal.jv),
        "JV Cost": proposal.jv_cost,
        "JV Budget Status": this.sanitizeFormula(proposal.jv_budget),
        "JV Budget Amount": proposal.jv_amnt,
        "JV Justification": this.sanitizeFormula(proposal.jv_reason),
        [`Production (${proposal.ph_till_label})`]: proposal.prod_till,
        [`Production (${proposal.ph_fy_label})`]: proposal.prod_fy,
        [`Production (${proposal.ph_beyond_label})`]: proposal.prod_beyond,
        [`CAPEX (${proposal.ph_till_label})`]: proposal.capex_till,
        [`CAPEX (${proposal.ph_fy_label})`]: proposal.capex_fy,
        [`CAPEX (${proposal.ph_beyond_label})`]: proposal.capex_beyond,
        [`OPEX (${proposal.ph_till_label})`]: proposal.opex_till,
        [`OPEX (${proposal.ph_fy_label})`]: proposal.opex_fy,
        [`OPEX (${proposal.ph_beyond_label})`]: proposal.opex_beyond,
        "Cost - Engineering": proposal.engineer,
        "Cost - Site Facilities": proposal.s_fac,
        "Cost - Commissioning": proposal.comis,
        "Cost - Pre-Operating": proposal.preop,
        "Cost - Others": proposal.others,
        "Total Estimated Cost": proposal.total,
        "Remarks & Business Justification": this.sanitizeFormula(proposal.remarks),
        "Remarks - JV Risk": this.sanitizeFormula(proposal.remarks_jv),
        "Current Approval Level": proposal.current_level,
        "Pending With Role": this.sanitizeFormula(proposal.pending_with_role),
        "Created Date": proposal.created_date,
        "Created By": this.sanitizeFormula(proposal.created_by),
        "Last Modified Date": proposal.modified_date,
        "Last Modified By": this.sanitizeFormula(proposal.modified_by)
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CER Proposal");

    const now = new Date().toISOString().split("T")[0];
    const fileName = `${proposal.cerprno}_Summary_${now}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  /**
   * Exports an array of CER proposals for the Reports module (FR-04, FR-10)
   */
  public static exportProposalList(proposals: ICERProposal[], reportTitle: string = "CER_Proposals_Report"): void {
    if (!proposals || proposals.length === 0) {
      alert("No data available to export.");
      return;
    }

    const data = proposals.map((p) => ({
      "Proposal Number": this.sanitizeFormula(p.cerprno),
      "Project Name": this.sanitizeFormula(p.pr_name),
      "Owner": this.sanitizeFormula(p.owname),
      "SBU": this.sanitizeFormula(p.sbu),
      "Status": this.sanitizeFormula(p.status),
      "Category": this.sanitizeFormula(p.cat),
      "Payback Type": this.sanitizeFormula(p.payable),
      "Amount": p.amount,
      "Currency": this.sanitizeFormula(p.currency),
      "NPV ($mm)": p.ben_npv,
      "IRR (%)": p.ben_irr,
      "Corporate Budget": this.sanitizeFormula(p.cbudget),
      "Corporate Budget Amount": p.cb_amnt,
      "JV Aligned": this.sanitizeFormula(p.jv),
      "JV Amount": p.jv_amnt,
      "Total Cost": p.total,
      "Start Date": this.sanitizeFormula(p.st_date),
      "Completion Date": this.sanitizeFormula(p.com_date),
      "Duration (Mos)": p.duration_months,
      "Current Level": p.current_level,
      "Pending With": this.sanitizeFormula(p.pending_with_role),
      "Created Date": p.created_date ? p.created_date.split("T")[0] : ""
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CER Proposals");

    const now = new Date().toISOString().split("T")[0];
    const fileName = `${reportTitle}_${now}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }
}
