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
      doc.text("CAPITAL EXPENDITURE REQUEST (CER)", margin + 6, currentY + 9);

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

      // Section A: Project Information & Scope
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [["SECTION A — PROJECT IDENTIFICATION & SCOPE", ""]],
        body: [
          ["Name of Project", proposal.pr_name],
          ["CER Proposal No.", proposal.cerprno],
          ["CER Owner Name", `${proposal.owname} (${proposal.owner_email})`],
          ["Block/SBU/Field", proposal.sbu],
          ["Category", proposal.cat],
          ["Objectives of CER", proposal.object || "N/A"],
          ["Project Schedule", `${proposal.st_date} to ${proposal.com_date} (${proposal.duration_months} Months)`],
        ],
        theme: "grid",
        headStyles: { fillColor: [37, 99, 235], textColor: 255, fontStyle: "bold", fontSize: 9 },
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
        head: [["SECTION B, C & D — FINANCIAL EVALUATION & BUDGET", ""]],
        body: [
          ["Amount of CER", `${proposal.currency} ${proposal.amount.toLocaleString()}`],
          ["Payback/Non Payback", proposal.payable],
          ["Payback Period (Quarters)", proposal.payback_quarters ? `${proposal.payback_quarters} Quarters` : "N/A"],
          ["Financial Benefits – NPV ($mm)", proposal.ben_npv ? `$${proposal.ben_npv} mm` : "N/A"],
          ["Financial Benefit – IRR (%)", proposal.ben_irr ? `${proposal.ben_irr}%` : "N/A"],
          ["Corporate Budget (Yes/No)", `${proposal.cbudget} (Amount: $${proposal.cb_amnt.toLocaleString()} mm)`],
          ["Reason if not/partially budgeted", proposal.reason || "Within approved budget"],
          ["Aligned with JV", `${proposal.jv} (JV Budget: ${proposal.jv_budget} | Amount: $${proposal.jv_amnt.toLocaleString()} mm)`],
          ["JV Cost Recoverable", proposal.jv_recoverable || "No"],
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

      // Section E: Phasing Matrix
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [["EXPENDITURE PHASING", proposal.ph_till_label || "Till Mar'26", proposal.ph_fy_label || "FY 26-27", proposal.ph_beyond_label || "Beyond FY'27", "TOTAL"]],
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
        headStyles: { fillColor: [71, 85, 105], textColor: 255, fontStyle: "bold", fontSize: 8.5 },
        styles: { fontSize: 8, halign: "right" },
        columnStyles: {
          0: { cellWidth: 50, halign: "left", fontStyle: "bold", textColor: [51, 65, 85] },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;

      // Section F: CAPEX Cost Estimates Basis
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [["CAPEX COST ESTIMATES BASIS", `AMOUNT ($mm)`, "% OF TOTAL"]],
        body: [
          ["Engineering", proposal.engineer.toLocaleString(), `${((proposal.engineer / (proposal.total || 1)) * 100).toFixed(1)}%`],
          ["Surface Facilities", proposal.s_fac.toLocaleString(), `${((proposal.s_fac / (proposal.total || 1)) * 100).toFixed(1)}%`],
          ["Commissioning", proposal.comis.toLocaleString(), `${((proposal.comis / (proposal.total || 1)) * 100).toFixed(1)}%`],
          ["Pre Operations", proposal.preop.toLocaleString(), `${((proposal.preop / (proposal.total || 1)) * 100).toFixed(1)}%`],
          ["Others", proposal.others.toLocaleString(), `${((proposal.others / (proposal.total || 1)) * 100).toFixed(1)}%`],
          ["TOTAL", proposal.total.toLocaleString(), "100.0%"],
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
