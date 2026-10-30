import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ICERProposal } from "../models/CERModel";
import { IApprovalDecision } from "../models/WorkflowModel";
import { calculateExactDays, getCurrentFiscalYearPhasingLabels } from "../utils/dateUtils";

export class PDFExportService {
  public static async generateCERPdf(
    proposal: ICERProposal,
    decisions: IApprovalDecision[] = []
  ): Promise<void> {
    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let currentY = 16;

      // 1. Header Banner
      doc.setFillColor(15, 23, 42); // Corporate Navy #0f172a
      doc.rect(margin, currentY, pageWidth - margin * 2, 22, "F");

      doc.setFont("helvetica", "bold");
      doc.setFontSize(14);
      doc.setTextColor(255, 255, 255);
      doc.text("CAPITAL EXPENDITURE REQUEST (CER)", margin + 6, currentY + 9);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);
      doc.text("Vedanta Limited / Cairn Oil & Gas — Official Authorization Document", margin + 6, currentY + 16);

      // Proposal Badge in Header
      const cerId = proposal.cer_proposal_id || (proposal as any).cerPrNo || proposal.cerprno;
      const propNo = proposal.proposal_no || (proposal as any).proposalNo || proposal.cerprno;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(cerId, pageWidth - margin - 6, currentY + 11, { align: "right" });
      if (propNo && propNo !== cerId) {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.text(`Ref: ${propNo}`, pageWidth - margin - 6, currentY + 17, { align: "right" });
      }

      currentY += 28;

      // Status Bar
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, currentY, pageWidth - margin * 2, 10, 1.5, 1.5, "FD");

      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "bold");
      doc.text("STATUS:", margin + 4, currentY + 6.5);
      doc.setFont("helvetica", "normal");
      doc.text(proposal.status.toUpperCase(), margin + 20, currentY + 6.5);

      doc.setFont("helvetica", "bold");
      doc.text("CATEGORY:", margin + 55, currentY + 6.5);
      doc.setFont("helvetica", "normal");
      doc.text(proposal.cat.toUpperCase(), margin + 74, currentY + 6.5);

      doc.setFont("helvetica", "bold");
      doc.text("SBU:", margin + 105, currentY + 6.5);
      doc.setFont("helvetica", "normal");
      doc.text(proposal.sbu, margin + 115, currentY + 6.5);

      doc.setFont("helvetica", "bold");
      doc.text("GENERATED:", margin + 140, currentY + 6.5);
      doc.setFont("helvetica", "normal");
      const todayStr = new Date().toLocaleDateString("en-GB");
      doc.text(todayStr, margin + 162, currentY + 6.5);

      currentY += 15;

      const CORPORATE_NAVY: [number, number, number] = [15, 23, 42]; // Consistent Corporate Navy
      const HEADER_TEXT_COLOR = 255;

      // Section A: Project Information & Scope
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [[{ content: "SECTION A — PROJECT IDENTIFICATION & SCOPE", colSpan: 2, styles: { halign: "left" } }]],
        body: [
          ["Proposal Name", (proposal as any).prName || proposal.pr_name],
          ["CER Proposal ID", proposal.cer_proposal_id || (proposal as any).cerPrNo || proposal.cerprno],
          ["CER Proposal No", proposal.proposal_no || (proposal as any).proposalNo || proposal.cerprno],
          ["CER Owner", `${(proposal as any).cerOwner || proposal.owname} (${(proposal as any).ownerEmail || proposal.owner_email})`],
          ["SBU", proposal.sbu],
          ["Category", (proposal as any).category || proposal.cat],
          ["Proposal Object", proposal.object || "N/A"],
          ["Project Schedule", `${(proposal as any).startDate || proposal.st_date} to ${(proposal as any).completionDate || proposal.com_date} (${calculateExactDays((proposal as any).startDate || proposal.st_date, (proposal as any).completionDate || proposal.com_date)} Days)`],
        ],
        theme: "grid",
        headStyles: { fillColor: CORPORATE_NAVY, textColor: HEADER_TEXT_COLOR, fontStyle: "bold", fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: "bold", textColor: [51, 65, 85], fontSize: 8.5 },
          1: { fontSize: 8.5, textColor: [15, 23, 42] },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;

      // Section B & C & D: Financial Benefits & Budget
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [[{ content: "SECTION B, C & D — FINANCIAL EVALUATION & BUDGET", colSpan: 2, styles: { halign: "left" } }]],
        body: [
          ["Total Amount", `${proposal.currency} ${Number(proposal.amount || 0).toLocaleString()}`],
          ["Payable By", proposal.payable],
          ["Payback Quarters", ((proposal as any).paybackQuarters !== undefined ? (proposal as any).paybackQuarters : proposal.payback_quarters) ? `${(proposal as any).paybackQuarters || proposal.payback_quarters} Quarters` : "N/A"],
          ["Benefit NPV", ((proposal as any).benefitNpv !== undefined ? (proposal as any).benefitNpv : proposal.ben_npv) ? `$${(proposal as any).benefitNpv || proposal.ben_npv} mm` : "N/A"],
          ["Benefit IRR", ((proposal as any).benefitIrr !== undefined ? (proposal as any).benefitIrr : proposal.ben_irr) ? `${(proposal as any).benefitIrr || proposal.ben_irr}%` : "N/A"],
          ["Current Budgeted?", `${(proposal as any).currentBudgeted || proposal.cbudget} (Amount: $${Number((proposal as any).currentBudgetAmount ?? proposal.cb_amnt ?? 0).toLocaleString()} mm)`],
          ["Unbudgeted Reason", (proposal as any).unbudgetedReason || proposal.reason || "Within approved budget"],
          ["Joint Venture?", `${(proposal as any).jointVenture || proposal.jv} (JV Budget: ${(proposal as any).jvBudgeted || proposal.jv_budget} | Amount: $${Number((proposal as any).jvAmount ?? proposal.jv_amnt ?? 0).toLocaleString()} mm)`],
          ["JV Recoverable?", (proposal as any).jvRecoverable || proposal.jv_recoverable || "No"],
          ["Cost Assumptions", (proposal as any).costAssumptions || proposal.cost_assumptions || "None recorded"],
        ],
        theme: "grid",
        headStyles: { fillColor: CORPORATE_NAVY, textColor: HEADER_TEXT_COLOR, fontStyle: "bold", fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: "bold", textColor: [51, 65, 85], fontSize: 8.5 },
          1: { fontSize: 8.5, textColor: [15, 23, 42] },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;

      // Section E: Phasing Matrix
      const defaultPhasing = getCurrentFiscalYearPhasingLabels(
        proposal.created_date ? new Date(proposal.created_date) : new Date()
      );
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [[
          "EXPENDITURE PHASING",
          proposal.ph_till_label || defaultPhasing.ph_till_label,
          proposal.ph_fy_label || defaultPhasing.ph_fy_label,
          proposal.ph_beyond_label || defaultPhasing.ph_beyond_label,
          "TOTAL",
        ]],
        body: [
          [
            "Production (in mmbbls)",
            proposal.prod_till.toLocaleString(),
            proposal.prod_fy.toLocaleString(),
            proposal.prod_beyond.toLocaleString(),
            (proposal.prod_till + proposal.prod_fy + proposal.prod_beyond).toLocaleString(),
          ],
          [
            "Capex ($mm)",
            proposal.capex_till.toLocaleString(),
            proposal.capex_fy.toLocaleString(),
            proposal.capex_beyond.toLocaleString(),
            (proposal.capex_till + proposal.capex_fy + proposal.capex_beyond).toLocaleString(),
          ],
          [
            "Opex ($mm)",
            proposal.opex_till.toLocaleString(),
            proposal.opex_fy.toLocaleString(),
            proposal.opex_beyond.toLocaleString(),
            (proposal.opex_till + proposal.opex_fy + proposal.opex_beyond).toLocaleString(),
          ],
        ],
        theme: "grid",
        headStyles: { fillColor: CORPORATE_NAVY, textColor: HEADER_TEXT_COLOR, fontStyle: "bold", fontSize: 8.5 },
        styles: { fontSize: 8, halign: "right" },
        columnStyles: {
          0: { cellWidth: 50, halign: "left", fontStyle: "bold", textColor: [51, 65, 85] },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;

      // Clean page break before Section F if insufficient room for the full table (~50mm)
      // This prevents the table from being awkwardly split across page 1 and page 2
      if (currentY > 165) {
        doc.addPage();
        currentY = 16;
      }

      // Section F: CAPEX Cost Estimates Basis
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [["CAPEX COST ESTIMATES BASIS", `AMOUNT ($mm)`, "% OF TOTAL"]],
        body: [
          ["Engineering Cost", Number((proposal as any).engineeringCost ?? proposal.engineer ?? 0).toLocaleString(), `${((Number((proposal as any).engineeringCost ?? proposal.engineer ?? 0) / (proposal.total || 1)) * 100).toFixed(1)}%`],
          ["Surface Facilities Cost", Number((proposal as any).surfaceFacilitiesCost ?? proposal.s_fac ?? 0).toLocaleString(), `${((Number((proposal as any).surfaceFacilitiesCost ?? proposal.s_fac ?? 0) / (proposal.total || 1)) * 100).toFixed(1)}%`],
          ["Commissioning Cost", Number((proposal as any).commissioningCost ?? proposal.comis ?? 0).toLocaleString(), `${((Number((proposal as any).commissioningCost ?? proposal.comis ?? 0) / (proposal.total || 1)) * 100).toFixed(1)}%`],
          ["Preoperative Cost", Number((proposal as any).preoperativeCost ?? proposal.preop ?? 0).toLocaleString(), `${((Number((proposal as any).preoperativeCost ?? proposal.preop ?? 0) / (proposal.total || 1)) * 100).toFixed(1)}%`],
          ["Other Costs", Number((proposal as any).otherCosts ?? proposal.others ?? 0).toLocaleString(), `${((Number((proposal as any).otherCosts ?? proposal.others ?? 0) / (proposal.total || 1)) * 100).toFixed(1)}%`],
          ["Total Item Cost", Number(proposal.total || 0).toLocaleString(), "100.0%"],
        ],
        theme: "grid",
        headStyles: { fillColor: CORPORATE_NAVY, textColor: HEADER_TEXT_COLOR, fontStyle: "bold", fontSize: 8.5 },
        styles: { fontSize: 8, halign: "right" },
        columnStyles: {
          0: { cellWidth: 80, halign: "left", fontStyle: "bold", textColor: [51, 65, 85] },
          1: { cellWidth: 50, fontStyle: "bold" },
          2: { cellWidth: 40 },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;

      // Check if we need page break for Remarks and Sign-off
      if (currentY > 210) {
        doc.addPage();
        currentY = 16;
      }

      // Section G: Business Remarks & Justification
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [["BUSINESS JUSTIFICATION & REMARKS"]],
        body: [
          [proposal.remarks ? `General Remarks: ${proposal.remarks}` : "No general remarks recorded."],
          [(proposal as any).remarksJv || proposal.remarks_jv ? `JV Remarks: ${(proposal as any).remarksJv || proposal.remarks_jv}` : "JV Remarks: None recorded."],
        ],
        theme: "grid",
        headStyles: { fillColor: CORPORATE_NAVY, textColor: HEADER_TEXT_COLOR, fontStyle: "bold", fontSize: 8.5 },
        styles: { fontSize: 8, textColor: [15, 23, 42] },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;

      if (currentY > 215) {
        doc.addPage();
        currentY = 16;
      }

      // Section H: Approval Decisions Trail
      const decisionRows = decisions.map((d) => [
        `Level ${d.level_id}: ${d.level_name}`,
        d.approver_name,
        d.decision,
        new Date(d.timestamp).toLocaleString("en-GB"),
        d.comments || "-",
      ]);

      if (decisionRows.length === 0) {
        decisionRows.push(["Level 1: Initiated", proposal.owname, "SUBMITTED", new Date(proposal.created_date).toLocaleString("en-GB"), "Initial Proposal Submission"]);
      }

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [["APPROVAL LEVEL", "APPROVER", "DECISION", "DATE & TIME", "COMMENTS"]],
        body: decisionRows,
        theme: "grid",
        headStyles: { fillColor: CORPORATE_NAVY, textColor: HEADER_TEXT_COLOR, fontStyle: "bold", fontSize: 8 },
        styles: { fontSize: 7.5 },
        columnStyles: {
          0: { fontStyle: "bold" },
          2: { fontStyle: "bold" },
        },
      });

      // Footer with page numbering
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `CER Management System — Confidential Corporate Record — Page ${i} of ${totalPages}`,
          pageWidth / 2,
          doc.internal.pageSize.getHeight() - 8,
          { align: "center" }
        );
      }

      // Download file with format: <CERPRNO>_<date>_<time>.pdf (FR-09)
      const now = new Date();
      const datePart = now.toISOString().split("T")[0].replace(/-/g, "");
      const timePart = now.toTimeString().split(" ")[0].replace(/:/g, "");
      const fileName = `${proposal.cerprno}_${datePart}_${timePart}.pdf`;

      doc.save(fileName);
    } catch (e) {
      console.error("[PDFExportService] Error generating PDF:", e);
      throw new Error("Error while generating PDF file");
    }
  }
}
