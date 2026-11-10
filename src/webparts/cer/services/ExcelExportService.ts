import * as XLSX from "xlsx";
import { ICERProposal } from "../models/CERModel";
import {
  calculateExactDays,
  getCurrentFiscalYearPhasingLabels,
  formatExcelDate,
  formatExcelDateTime,
} from "../utils/dateUtils";
import { disarmFormulaInjection } from "../utils/sanitizationUtils";
import { ICERDataService } from "./ICERDataService";

export interface IExcelExportFilterOptions {
  searchTerm?: string;
  status?: string;
  category?: string;
  sbu?: string;
  owner?: string;
  dateFrom?: string;
  dateTo?: string;
}

export class ExcelExportService {
  /**
   * Sanitizes strings to prevent Spreadsheet Formula Injection (CSV / XLS injection attacks - CWE-1236)
   */
  public static sanitizeFormula(value: any): any {
    return disarmFormulaInjection(value);
  }

  /**
   * Formats a date value for Excel display as DD-MMM-YYYY (e.g. 03-Nov-2026).
   */
  public static formatExcelDate(value?: string | Date): string {
    return formatExcelDate(value);
  }

  /**
   * Formats a date/timestamp for Excel display in local user timezone as DD-MMM-YYYY HH:mm:ss.
   */
  public static formatExcelDateTime(value?: string | Date): string {
    return formatExcelDateTime(value);
  }

  /**
   * Exports a single CER proposal with full financial, phasing, and cost details aligned
   * with SHAREPOINT_LISTS_AND_COLUMNS_SETUP.md (FR-10)
   */
  public static exportSingleProposal(proposal: ICERProposal): void {
    const p: any = proposal;
    const data = [this.mapProposalToExportRow(proposal)];

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CERProposal");

    const now = new Date().toISOString().split("T")[0];
    const fileName = `${p.cer_proposal_id || p.cerPrNo || p.cerprno || "CER"}_Summary_${now}.xlsx`;
    XLSX.writeFile(workbook, fileName);
  }

  /**
   * Transforms proposal raw data into clean export row format with formula sanitization.
   * Exports all 55+ detailed columns covering identification, economics, schedules,
   * corporate budget, joint venture details, phasing, cost breakdown, remarks, and workflow tracking.
   */
  public static mapProposalToExportRow(raw: any): Record<string, any> {
    const cerProposalId = raw.cer_proposal_id || raw.cerPrNo || raw.cerprno || raw.Title || "";
    const proposalNo = raw.proposal_no || raw.proposalNo || "";
    const projectName = raw.pr_name || raw.prName || "";

    const defaultPhasing = getCurrentFiscalYearPhasingLabels(
      raw.created_date ? new Date(raw.created_date) : new Date()
    );
    const phTill = raw.ph_till_label || defaultPhasing.ph_till_label;
    const phFy = raw.ph_fy_label || defaultPhasing.ph_fy_label;
    const phBeyond = raw.ph_beyond_label || defaultPhasing.ph_beyond_label;

    return {
      // 1. Basic Identification
      "CER Proposal ID": this.sanitizeFormula(cerProposalId),
      "Proposal Reference No": this.sanitizeFormula(proposalNo),
      "Project Name": this.sanitizeFormula(projectName),
      "Status": this.sanitizeFormula(raw.status || ""),
      "Category": this.sanitizeFormula(raw.cat || raw.category || ""),
      "SBU / Block": this.sanitizeFormula(raw.sbu || ""),
      "CER Owner Name": this.sanitizeFormula(raw.owname || raw.cerOwner || ""),
      "CER Owner Email": this.sanitizeFormula(raw.owner_email || raw.ownerEmail || ""),
      "Initiated By": this.sanitizeFormula(raw.created_by || raw.Author?.Title || ""),

      // 2. Financials & Objectives
      "Objectives of CER": this.sanitizeFormula(raw.object || ""),
      "Total Amount": raw.amount !== undefined && raw.amount !== null ? Number(raw.amount) : 0,
      "Currency": this.sanitizeFormula(raw.currency || "USD"),
      "Payable By": this.sanitizeFormula(raw.payable || ""),
      "Benefit Period": this.sanitizeFormula(raw.period || ""),
      "Payback Period (Quarters)": raw.payback_quarters !== undefined && raw.payback_quarters !== null ? raw.payback_quarters : (raw.paybackQuarters !== undefined && raw.paybackQuarters !== null ? raw.paybackQuarters : "N/A"),
      "Benefit NPV": raw.ben_npv !== undefined && raw.ben_npv !== null ? raw.ben_npv : (raw.benefitNpv !== undefined ? raw.benefitNpv : 0),
      "Benefit IRR (%)": raw.ben_irr !== undefined && raw.ben_irr !== null ? raw.ben_irr : (raw.benefitIrr !== undefined ? raw.benefitIrr : 0),
      "Cost Assumptions": this.sanitizeFormula(raw.cost_assumptions || raw.costAssumptions || ""),

      // 3. Schedule & Project Duration
      "Start Date": this.sanitizeFormula(this.formatExcelDate(raw.st_date || raw.startDate)),
      "Completion Date": this.sanitizeFormula(this.formatExcelDate(raw.com_date || raw.completionDate)),
      "Duration (Months)": raw.duration_months !== undefined && raw.duration_months !== null ? raw.duration_months : (raw.durationMonths !== undefined && raw.durationMonths !== null ? raw.durationMonths : calculateExactDays(raw.st_date || raw.startDate, raw.com_date || raw.completionDate)),

      // 4. Corporate Budget
      "Corporate Budgeted?": this.sanitizeFormula(raw.cbudget || raw.currentBudgeted || ""),
      "Corporate Budget Amount": raw.cb_amnt !== undefined && raw.cb_amnt !== null ? raw.cb_amnt : (raw.currentBudgetAmount !== undefined ? raw.currentBudgetAmount : 0),
      "Corporate Budget Currency": this.sanitizeFormula(raw.cb_currency || raw.currentBudgetCurrency || "USD"),
      "Unbudgeted Reason": this.sanitizeFormula(raw.reason || raw.unbudgetedReason || ""),

      // 5. Joint Venture (JV)
      "Aligned with JV?": this.sanitizeFormula(raw.jv || raw.jointVenture || ""),
      "JV Cost Recoverable?": this.sanitizeFormula(raw.jv_recoverable || raw.jvRecoverable || "No"),
      "JV Partner Cost": raw.jv_cost !== undefined && raw.jv_cost !== null ? raw.jv_cost : (raw.jvCost !== undefined ? raw.jvCost : 0),
      "JV Budgeted?": this.sanitizeFormula(raw.jv_budget || raw.jvBudgeted || ""),
      "JV Partner Amount": raw.jv_amnt !== undefined && raw.jv_amnt !== null ? raw.jv_amnt : (raw.jvAmount !== undefined ? raw.jvAmount : 0),
      "JV Reason": this.sanitizeFormula(raw.jv_reason || raw.jvReason || ""),
      "JV Remarks": this.sanitizeFormula(raw.remarks_jv || raw.remarksJv || ""),

      // 6. Phasing Labels
      "Phasing Prior Period Label": this.sanitizeFormula(phTill),
      "Phasing Current FY Label": this.sanitizeFormula(phFy),
      "Phasing Beyond Period Label": this.sanitizeFormula(phBeyond),

      // 7. Phasing - Production
      "Production Prior Period": raw.prod_till !== undefined && raw.prod_till !== null ? raw.prod_till : (raw.prodTill !== undefined ? raw.prodTill : 0),
      "Production Current FY": raw.prod_fy !== undefined && raw.prod_fy !== null ? raw.prod_fy : (raw.prodFy !== undefined ? raw.prodFy : 0),
      "Production Beyond Period": raw.prod_beyond !== undefined && raw.prod_beyond !== null ? raw.prod_beyond : (raw.prodBeyond !== undefined ? raw.prodBeyond : 0),

      // 8. Phasing - Capex
      "Capex Prior Period": raw.capex_till !== undefined && raw.capex_till !== null ? raw.capex_till : (raw.capexTill !== undefined ? raw.capexTill : 0),
      "Capex Current FY": raw.capex_fy !== undefined && raw.capex_fy !== null ? raw.capex_fy : (raw.capexFy !== undefined ? raw.capexFy : 0),
      "Capex Beyond Period": raw.capex_beyond !== undefined && raw.capex_beyond !== null ? raw.capex_beyond : (raw.capexBeyond !== undefined ? raw.capexBeyond : 0),

      // 9. Phasing - Opex
      "Opex Prior Period": raw.opex_till !== undefined && raw.opex_till !== null ? raw.opex_till : (raw.opexTill !== undefined ? raw.opexTill : 0),
      "Opex Current FY": raw.opex_fy !== undefined && raw.opex_fy !== null ? raw.opex_fy : (raw.opexFy !== undefined ? raw.opexFy : 0),
      "Opex Beyond Period": raw.opex_beyond !== undefined && raw.opex_beyond !== null ? raw.opex_beyond : (raw.opexBeyond !== undefined ? raw.opexBeyond : 0),

      // 10. Cost Breakdown
      "Engineering Cost": raw.engineer !== undefined && raw.engineer !== null ? raw.engineer : (raw.engineeringCost !== undefined ? raw.engineeringCost : 0),
      "Surface Facilities Cost": raw.s_fac !== undefined && raw.s_fac !== null ? raw.s_fac : (raw.surfaceFacilitiesCost !== undefined ? raw.surfaceFacilitiesCost : 0),
      "Commissioning Cost": raw.comis !== undefined && raw.comis !== null ? raw.comis : (raw.commissioningCost !== undefined ? raw.commissioningCost : 0),
      "Preoperative Cost": raw.preop !== undefined && raw.preop !== null ? raw.preop : (raw.preoperativeCost !== undefined ? raw.preoperativeCost : 0),
      "Other Costs": raw.others !== undefined && raw.others !== null ? raw.others : (raw.otherCosts !== undefined ? raw.otherCosts : 0),
      "Total Item Cost": raw.total !== undefined && raw.total !== null ? raw.total : (raw.amount || 0),

      // 11. Remarks & Justification
      "General Remarks": this.sanitizeFormula(raw.remarks || ""),

      // 12. Workflow Tracking
      "Current Approval Level": raw.current_level !== undefined && raw.current_level !== null ? raw.current_level : (raw.currentLevel !== undefined ? raw.currentLevel : ""),
      "Pending With Role": this.sanitizeFormula(raw.pending_with_role || raw.pendingWithRole || ""),
      "Pending With Email": this.sanitizeFormula(raw.pending_with_email || raw.pendingWithEmail || ""),
      "Workflow Version": this.sanitizeFormula(raw.version || "V1"),
      "Revision Count": raw.revision_count !== undefined && raw.revision_count !== null ? raw.revision_count : (raw.revisionCount || 0),

      // 13. Audit & System Metadata
      "Request Date": this.sanitizeFormula(this.formatExcelDate(raw.request_date || raw.RequestDate)),
      "Created Date": this.formatExcelDateTime(raw.created_date || raw.Created),
      "Created By": this.sanitizeFormula(raw.created_by || raw.Author?.Title || ""),
      "Last Modified Date": this.formatExcelDateTime(raw.modified_date || raw.Modified),
      "Last Modified By": this.sanitizeFormula(raw.modified_by || raw.Editor?.Title || ""),
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

  /**
   * Complete, server-backed Excel export for the Reports module (Phase 4 hardening).
   *
   * Unlike exportProposalListAsync which only exports proposals currently loaded into React state,
   * this method fetches the COMPLETE authorized dataset directly from the data service
   * using pagination / continuation links until all records are retrieved, then applies
   * active filters, sanitizes spreadsheet formulas against CSV/XLS injection, and writes
   * the complete Excel spreadsheet.
   */
  public static async exportAllMatchingProposalsAsync(
    dataService: ICERDataService,
    filters: IExcelExportFilterOptions = {},
    reportTitle: string = "CERProposals_Report",
    onProgress?: (statusMessage: string, count: number) => void,
    chunkSize: number = 500,
  ): Promise<{ totalExported: number }> {
    if (onProgress) {
      onProgress("Fetching complete proposal records from SharePoint...", 0);
    }

    // Follow continuation links to retrieve full dataset from SharePoint / backend
    const allProposals = await dataService.getAllProposals(true);

    // Exclude system counter control records
    const businessProposals = allProposals.filter((p) => {
      const no = (p.cerprno || "").toUpperCase();
      const status = (p.status || "").toLowerCase();
      return !no.startsWith("CER-COUNTER-") && status !== "systemcounter";
    });

    if (onProgress) {
      onProgress(
        `Filtering and processing ${businessProposals.length} proposals...`,
        businessProposals.length,
      );
    }

    // Apply active user filters
    const search = (filters.searchTerm || "").trim().toLowerCase();
    const statusFilter = (filters.status || "ALL").toUpperCase();
    const catFilter = (filters.category || "ALL").toUpperCase();
    const sbuFilter = (filters.sbu || "ALL").toUpperCase();
    const ownerFilter = (filters.owner || "").trim().toLowerCase();
    const fromDate = filters.dateFrom ? new Date(filters.dateFrom) : null;
    const toDate = filters.dateTo ? new Date(filters.dateTo) : null;
    if (toDate) {
      toDate.setHours(23, 59, 59, 999);
    }

    const filtered = businessProposals.filter((p) => {
      if (search) {
        const matchesId = (p.cer_proposal_id || "").toLowerCase().includes(search);
        const matchesPropNo = (p.proposal_no || "").toLowerCase().includes(search);
        const matchesCerNo = (p.cerprno || "").toLowerCase().includes(search);
        const matchesName = (p.pr_name || "").toLowerCase().includes(search);
        if (!matchesId && !matchesPropNo && !matchesCerNo && !matchesName) return false;
      }
      if (statusFilter !== "ALL" && (p.status || "").toUpperCase() !== statusFilter) {
        return false;
      }
      if (catFilter !== "ALL" && (p.cat || "").toUpperCase() !== catFilter) {
        return false;
      }
      if (sbuFilter !== "ALL" && (p.sbu || "").toUpperCase() !== sbuFilter) {
        return false;
      }
      if (ownerFilter) {
        const matchesOwner = (p.owname || "").toLowerCase().includes(ownerFilter);
        const matchesEmail = (p.owner_email || "").toLowerCase().includes(ownerFilter);
        if (!matchesOwner && !matchesEmail) return false;
      }
      if (fromDate || toDate) {
        const createdDate = p.created_date ? new Date(p.created_date) : null;
        if (createdDate) {
          if (fromDate && createdDate < fromDate) return false;
          if (toDate && createdDate > toDate) return false;
        }
      }
      return true;
    });

    if (filtered.length === 0) {
      if (typeof alert === "function") {
        alert("No matching proposals found for the selected export filters.");
      }
      return { totalExported: 0 };
    }

    if (onProgress) {
      onProgress(
        `Generating Excel spreadsheet for ${filtered.length} matching proposals...`,
        filtered.length,
      );
    }

    const data: Record<string, any>[] = [];
    for (let i = 0; i < filtered.length; i += chunkSize) {
      const slice = filtered.slice(i, i + chunkSize);
      for (const p of slice) {
        data.push(this.mapProposalToExportRow(p));
      }
      if (i + chunkSize < filtered.length) {
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "CERProposals");

    const now = new Date().toISOString().split("T")[0];
    const fileName = `${reportTitle}_${now}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    if (onProgress) {
      onProgress(`Successfully exported ${filtered.length} proposals.`, filtered.length);
    }

    return { totalExported: filtered.length };
  }
}
