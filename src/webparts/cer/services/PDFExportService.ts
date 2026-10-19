import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ICERProposal } from "../models/CERModel";
import { IApprovalDecision } from "../models/WorkflowModel";

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
      doc.text("SPX — CAPITAL EXPENDITURE REQUEST (CER)", margin + 6, currentY + 9);

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(203, 213, 225);
      doc.text("Vedanta Limited / Cairn Oil & Gas — Official Authorization Document", margin + 6, currentY + 16);

      // Proposal Badge in Header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(255, 255, 255);
      doc.text(proposal.cerprno, pageWidth - margin - 6, currentY + 13, { align: "right" });

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

      // Section A: Project Information
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [["PROJECT INFORMATION & SCOPE", ""]],
        body: [
          ["Project Name", proposal.pr_name],
          ["CER Owner / Initiator", `${proposal.owname} (${proposal.owner_email})`],
          ["Business Object", proposal.object || "N/A"],
          ["Project Duration", `${proposal.st_date} to ${proposal.com_date} (${proposal.duration_months} Months)`],
        ],
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold", fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: "bold", textColor: [51, 65, 85], fontSize: 8.5 },
          1: { fontSize: 8.5, textColor: [15, 23, 42] },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;

      // Section B: Financial Benefits & Corporate Budget
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [["FINANCIAL SUMMARY & BUDGET", ""]],
        body: [
          ["Amount of CER", `${proposal.currency} ${proposal.amount.toLocaleString()}`],
          ["Payback Classification", proposal.payable],
          ["Financial Benefits — NPV", proposal.ben_npv ? `$${proposal.ben_npv} MM` : "N/A"],
          ["Financial Benefits — IRR (%)", proposal.ben_irr ? `${proposal.ben_irr}%` : "N/A"],
          ["Corporate Budget Status", `${proposal.cbudget} (Amount: ${proposal.cb_currency} ${proposal.cb_amnt.toLocaleString()})`],
          ["Joint Venture (JV) Alignment", `${proposal.jv} (JV Cost: ${proposal.currency} ${proposal.jv_cost.toLocaleString()} | Budget: ${proposal.jv_budget})`],
          ["Key Assumptions", proposal.cost_assumptions || "None recorded"],
        ],
        theme: "grid",
        headStyles: { fillColor: [30, 41, 59], textColor: 255, fontStyle: "bold", fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: "bold", textColor: [51, 65, 85], fontSize: 8.5 },
          1: { fontSize: 8.5, textColor: [15, 23, 42] },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;

      // Section C: Phasing Matrix
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [["EXPENDITURE PHASING", proposal.ph_till_label, proposal.ph_fy_label, proposal.ph_beyond_label, "TOTAL"]],
        body: [
          [
            "Production Expenditure",
            proposal.prod_till.toLocaleString(),
            proposal.prod_fy.toLocaleString(),
            proposal.prod_beyond.toLocaleString(),
            (proposal.prod_till + proposal.prod_fy + proposal.prod_beyond).toLocaleString(),
          ],
          [
            "CAPEX Expenditure",
            proposal.capex_till.toLocaleString(),
            proposal.capex_fy.toLocaleString(),
            proposal.capex_beyond.toLocaleString(),
            (proposal.capex_till + proposal.capex_fy + proposal.capex_beyond).toLocaleString(),
          ],
          [
            "OPEX Expenditure",
            proposal.opex_till.toLocaleString(),
            proposal.opex_fy.toLocaleString(),
            proposal.opex_beyond.toLocaleString(),
            (proposal.opex_till + proposal.opex_fy + proposal.opex_beyond).toLocaleString(),
          ],
        ],
        theme: "grid",
        headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
        styles: { fontSize: 8, halign: "right" },
        columnStyles: {
          0: { cellWidth: 50, halign: "left", fontStyle: "bold", textColor: [51, 65, 85] },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;

      // Section D: Cost Breakdown
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [["COST BREAKDOWN COMPONENT", `AMOUNT (${proposal.currency})`, "% OF TOTAL"]],
        body: [
          ["Engineering", proposal.engineer.toLocaleString(), `${((proposal.engineer / (proposal.total || 1)) * 100).toFixed(1)}%`],
          ["Site Facilities", proposal.s_fac.toLocaleString(), `${((proposal.s_fac / (proposal.total || 1)) * 100).toFixed(1)}%`],
          ["Commissioning", proposal.comis.toLocaleString(), `${((proposal.comis / (proposal.total || 1)) * 100).toFixed(1)}%`],
          ["Pre-Operating Costs", proposal.preop.toLocaleString(), `${((proposal.preop / (proposal.total || 1)) * 100).toFixed(1)}%`],
          ["Others / Contingency", proposal.others.toLocaleString(), `${((proposal.others / (proposal.total || 1)) * 100).toFixed(1)}%`],
          ["TOTAL ESTIMATED COST", proposal.total.toLocaleString(), "100.0%"],
        ],
        theme: "grid",
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
        styles: { fontSize: 8, halign: "right" },
        columnStyles: {
          0: { cellWidth: 80, halign: "left", fontStyle: "bold", textColor: [51, 65, 85] },
          1: { cellWidth: 50, fontStyle: "bold" },
          2: { cellWidth: 40 },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;

      // Check if we need page break for Remarks and Sign-off
      if (currentY > 220) {
        doc.addPage();
        currentY = 16;
      }

      // Section E: Business Remarks & Justification
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [["BUSINESS JUSTIFICATION & REMARKS"]],
        body: [
          [proposal.remarks || "No detailed justification remarks provided."],
          [proposal.remarks_jv ? `JV Risk Justification: ${proposal.remarks_jv}` : "JV Risk: None noted."],
        ],
        theme: "grid",
        headStyles: { fillColor: [51, 65, 85], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
        styles: { fontSize: 8, textColor: [15, 23, 42] },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;

      // Section F: Approval Decisions Trail
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
        headStyles: { fillColor: [15, 23, 42], textColor: 255, fontStyle: "bold", fontSize: 8 },
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
          `SPX CER Management System — Confidential Corporate Record — Page ${i} of ${totalPages}`,
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
