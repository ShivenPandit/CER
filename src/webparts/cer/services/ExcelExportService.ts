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
        "Name of Project": this.sanitizeFormula(proposal.pr_name),
        "CER Proposal No.": this.sanitizeFormula(proposal.cerprno),
        "CER Owner Name": this.sanitizeFormula(proposal.owname),
        "Owner Email": this.sanitizeFormula(proposal.owner_email),
        "Block/SBU/Field": this.sanitizeFormula(proposal.sbu),
        "Status": this.sanitizeFormula(proposal.status),
        "Category": this.sanitizeFormula(proposal.cat),
        "Objectives of CER": this.sanitizeFormula(proposal.object),
        "Amount of CER": proposal.amount,
        "Currency": this.sanitizeFormula(proposal.currency),
        "Payback/Non Payback": this.sanitizeFormula(proposal.payable),
        "Payback Period (Quarters)": proposal.payback_quarters || "N/A",
        "Financial Benefits – NPV ($mm)": proposal.ben_npv,
        "Financial Benefit – IRR (%)": proposal.ben_irr,
        "Key Assumptions to Financial Benefit/Costs": this.sanitizeFormula(proposal.cost_assumptions),
        "Start Date of Project": this.sanitizeFormula(proposal.st_date),
        "Completion Date of Project": this.sanitizeFormula(proposal.com_date),
        "Total Duration (Months)": proposal.duration_months,
        "Corporate Budget (Yes/No)": this.sanitizeFormula(proposal.cbudget),
        "Corporate Budget Amount ($mm)": proposal.cb_amnt,
        "Reason if not/partially budgeted": this.sanitizeFormula(proposal.reason),
        "Aligned with JV (Yes/No/Under Discussion)": this.sanitizeFormula(proposal.jv),
        "JV Cost Recoverable (Yes/No)": this.sanitizeFormula(proposal.jv_recoverable || "No"),
        "JV Budget (Yes/No)": this.sanitizeFormula(proposal.jv_budget),
        "JV Budget Amount ($mm)": proposal.jv_amnt,
        "Reason if not/partially budgeted (JV)": this.sanitizeFormula(proposal.jv_reason),
        [`Production (in mmbbls) - ${proposal.ph_till_label || "Till Mar'26"}`]: proposal.prod_till,
        [`Production (in mmbbls) - ${proposal.ph_fy_label || "FY 26-27"}`]: proposal.prod_fy,
        [`Production (in mmbbls) - ${proposal.ph_beyond_label || "Beyond FY'27"}`]: proposal.prod_beyond,
        [`Capex ($mm) - ${proposal.ph_till_label || "Till Mar'26"}`]: proposal.capex_till,
        [`Capex ($mm) - ${proposal.ph_fy_label || "FY 26-27"}`]: proposal.capex_fy,
        [`Capex ($mm) - ${proposal.ph_beyond_label || "Beyond FY'27"}`]: proposal.capex_beyond,
        [`Opex ($mm) - ${proposal.ph_till_label || "Till Mar'26"}`]: proposal.opex_till,
        [`Opex ($mm) - ${proposal.ph_fy_label || "FY 26-27"}`]: proposal.opex_fy,
        [`Opex ($mm) - ${proposal.ph_beyond_label || "Beyond FY'27"}`]: proposal.opex_beyond,
        "Engineering ($mm)": proposal.engineer,
        "Surface Facilities ($mm)": proposal.s_fac,
        "Commissioning ($mm)": proposal.comis,
        "Pre Operations ($mm)": proposal.preop,
        "Others ($mm)": proposal.others,
        "Total Cost Estimates ($mm)": proposal.total,
        "Remarks (including Justification for Non Payback expenditure, etc.)": this.sanitizeFormula(proposal.remarks),
        "Remarks on JV Risk (including risk carrying period)": this.sanitizeFormula(proposal.remarks_jv),
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
