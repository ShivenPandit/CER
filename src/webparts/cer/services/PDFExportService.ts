import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { ICERProposal } from "../models/CERModel";
import { IApprovalDecision, IWorkflowLevel } from "../models/WorkflowModel";
import { calculateExactDays, getCurrentFiscalYearPhasingLabels } from "../utils/dateUtils";
import { stripAttachmentsManifest } from "../utils/sanitizationUtils";

export class PDFExportService {
  public static async generateCERPdf(
    proposal: ICERProposal,
    decisions: IApprovalDecision[] = [],
    historyProposals: ICERProposal[] = [],
    versionLabel?: string,
    isArchivedSnapshot: boolean = false,
    workflowLevels: IWorkflowLevel[] = []
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
        doc.text(`CER Proposal No.: ${propNo}`, pageWidth - margin - 6, currentY + 17, { align: "right" });
      }

      currentY += 28;

      // Status Bar
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, currentY, pageWidth - margin * 2, 10, 1.5, 1.5, "FD");

      const isArchived = isArchivedSnapshot || (versionLabel && versionLabel.toLowerCase().indexOf("archived") !== -1);
      const displayStatus = isArchived
        ? "RESUBMITTED"
        : (proposal.status || "IN APPROVAL").toUpperCase();

      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.setFont("helvetica", "bold");
      doc.text("STATUS:", margin + 4, currentY + 6.5);
      doc.setFont("helvetica", "normal");
      doc.text(displayStatus, margin + 20, currentY + 6.5);

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
          ["CER Proposal No.", proposal.proposal_no || (proposal as any).proposalNo || proposal.cerprno],
          ["CER Owner", `${(proposal as any).cerOwner || proposal.owname} (${(proposal as any).ownerEmail || proposal.owner_email})`],
          ["Initiated By", proposal.created_by || proposal.owname],
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

      // Section B: Financial Evaluation & Benefits
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [[{ content: "SECTION B — FINANCIAL EVALUATION & BENEFITS", colSpan: 2, styles: { halign: "left" } }]],
        body: [
          ["Total Amount", `${proposal.currency} ${Number(proposal.amount || 0).toLocaleString()}`],
          ["Payable By", proposal.payable],
          ["Payback Quarters", ((proposal as any).paybackQuarters !== undefined ? (proposal as any).paybackQuarters : proposal.payback_quarters) ? `${(proposal as any).paybackQuarters || proposal.payback_quarters} Quarters` : "N/A"],
          ["Benefit NPV", ((proposal as any).benefitNpv !== undefined ? (proposal as any).benefitNpv : proposal.ben_npv) ? `$${(proposal as any).benefitNpv || proposal.ben_npv} mm` : "N/A"],
          ["Benefit IRR", ((proposal as any).benefitIrr !== undefined ? (proposal as any).benefitIrr : proposal.ben_irr) ? `${(proposal as any).benefitIrr || proposal.ben_irr}%` : "N/A"],
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

      // Section C: Phasing Matrix
      const defaultPhasing = getCurrentFiscalYearPhasingLabels(
        proposal.created_date ? new Date(proposal.created_date) : new Date()
      );
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [[
          "SECTION C — EXPENDITURE PHASING",
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

      // Clean page break before Section D if insufficient room for the full table (~50mm)
      if (currentY > 175) {
        doc.addPage();
        currentY = 16;
      }

      // Section D: CAPEX Cost Estimates Basis
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [["SECTION D — CAPEX COST ESTIMATES BASIS", `AMOUNT ($mm)`, "% OF TOTAL"]],
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

      // Clean page break before Section E & F if insufficient room (~45mm)
      if (currentY > 190) {
        doc.addPage();
        currentY = 16;
      }

      // Section E & F: Corporate Budget and Joint Venture Details
      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [[{ content: "SECTION E & F — CORPORATE BUDGET & JOINT VENTURE", colSpan: 2, styles: { halign: "left" } }]],
        body: [
          ["Current Budgeted?", `${(proposal as any).currentBudgeted || proposal.cbudget} (Amount: $${Number((proposal as any).currentBudgetAmount ?? proposal.cb_amnt ?? 0).toLocaleString()} mm)`],
          ["Unbudgeted Reason", (proposal as any).unbudgetedReason || (proposal.reason && proposal.reason.trim()) || "—"],
          ["Joint Venture?", `${(proposal as any).jointVenture || proposal.jv} (JV Budget: ${(proposal as any).jvBudgeted || proposal.jv_budget} | Amount: $${Number((proposal as any).jvAmount ?? proposal.jv_amnt ?? 0).toLocaleString()} mm)`],
          ["JV Recoverable?", (proposal as any).jvRecoverable || proposal.jv_recoverable || "No"],
        ],
        theme: "grid",
        headStyles: { fillColor: CORPORATE_NAVY, textColor: HEADER_TEXT_COLOR, fontStyle: "bold", fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 50, fontStyle: "bold", textColor: [51, 65, 85], fontSize: 8.5 },
          1: { fontSize: 8.5, textColor: [15, 23, 42] },
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
          [proposal.remarks ? `General Remarks: ${stripAttachmentsManifest(proposal.remarks)}` : "No general remarks recorded."],
          [(proposal as any).remarksJv || proposal.remarks_jv ? `JV Remarks: ${(proposal as any).remarksJv || proposal.remarks_jv}` : "JV Remarks: None recorded."],
        ],
        theme: "grid",
        headStyles: { fillColor: CORPORATE_NAVY, textColor: HEADER_TEXT_COLOR, fontStyle: "bold", fontSize: 8.5 },
        styles: { fontSize: 8, textColor: [15, 23, 42] },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;

      // Section H: Approval Sign-off & Revision History (Version-Wise)
      if (currentY > 200) {
        doc.addPage();
        currentY = 16;
      }

      // 1. Version History Summary Table
      const sortedHistory = [...(historyProposals || [])].sort((a, b) => {
        const da = new Date(a.created_date || a.modified_date || 0).getTime();
        const db = new Date(b.created_date || b.modified_date || 0).getTime();
        return da - db;
      });

      const currentVTag =
        versionLabel ||
        (proposal as any).version ||
        (sortedHistory.length > 0 ? `V${sortedHistory.length + 1}` : "V1");

      const versionRows: any[] = [];
      sortedHistory.forEach((hist, idx) => {
        const vNum = `V${idx + 1}`;
        const refNo = hist.proposal_no || hist.cer_proposal_id || hist.cerprno || "—";
        const amtStr = `${hist.currency || "USD"} ${Number(hist.amount || 0).toLocaleString()}`;
        const dStr = hist.modified_date || hist.created_date
          ? new Date(hist.modified_date || hist.created_date || "").toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "—";
        versionRows.push([
          `${vNum} (Archived Snapshot)`,
          refNo,
          amtStr,
          "Resubmitted",
          dStr,
        ]);
      });

      // Add Current / Latest Active Proposal Row
      const currentRefNo = proposal.proposal_no || proposal.cer_proposal_id || proposal.cerprno || "—";
      const currentAmtStr = `${proposal.currency || "USD"} ${Number(proposal.amount || 0).toLocaleString()}`;
      const currentDStr = proposal.modified_date || proposal.created_date
        ? new Date(proposal.modified_date || proposal.created_date || "").toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      const currentLatestStatus = (proposal.status || "In Approval").toUpperCase();
      versionRows.push([
        `${currentVTag} (Active / Current)`,
        currentRefNo,
        currentAmtStr,
        currentLatestStatus,
        currentDStr,
      ]);

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [
          [
            {
              content: "SECTION H1 — PROPOSAL VERSION & REVISION HISTORY",
              colSpan: 5,
              styles: { halign: "left" },
            },
          ],
          ["Version Tag", "CER Proposal No.", "Sanction Amount", "Status", "Date"],
        ],
        body: versionRows,
        theme: "grid",
        headStyles: { fillColor: CORPORATE_NAVY, textColor: HEADER_TEXT_COLOR, fontStyle: "bold", fontSize: 8 },
        styles: { fontSize: 7.5, textColor: [15, 23, 42] },
        columnStyles: {
          0: { cellWidth: 38, fontStyle: "bold" },
          1: { cellWidth: 42, fontStyle: "bold" },
          2: { cellWidth: 35, fontStyle: "bold", halign: "right" },
          3: { cellWidth: 32 },
          4: { fontStyle: "normal" },
        },
      });

      currentY = (doc as any).lastAutoTable.finalY + 6;

      if (currentY > 205) {
        doc.addPage();
        currentY = 16;
      }

      // 2. Version-Wise Workflow Approval Decisions Audit Trail
      const sortedDecisions = [...(decisions || [])].sort((a, b) => {
        const da = new Date(a.timestamp || (a as any).decision_date || 0).getTime();
        const db = new Date(b.timestamp || (b as any).decision_date || 0).getTime();
        return da - db;
      });

      // Compile workflow stage map to know stage names and approvers
      interface ILevelInfo {
        level_id: number;
        level_name: string;
        approver_name: string;
        approver_email: string;
      }
      const levelMap = new Map<number, ILevelInfo>();

      (workflowLevels || []).forEach((lvl) => {
        if (lvl.is_active !== false) {
          levelMap.set(lvl.level_id, {
            level_id: lvl.level_id,
            level_name: lvl.level_name || `Level ${lvl.level_id}`,
            approver_name: lvl.approver_name || "",
            approver_email: lvl.approver_email || "",
          });
        }
      });

      sortedDecisions.forEach((d) => {
        if (!levelMap.has(d.level_id)) {
          levelMap.set(d.level_id, {
            level_id: d.level_id,
            level_name: d.level_name || `Level ${d.level_id}`,
            approver_name: d.approver_name || "",
            approver_email: d.approver_email || "",
          });
        }
      });

      const allLevels = Array.from(levelMap.values()).sort((a, b) => a.level_id - b.level_id);

      const decisionRows: any[] = [];
      sortedDecisions.forEach((dec) => {
        const decVer = dec.version || currentVTag;
        const stageName = dec.level_name || `Level ${dec.level_id}`;
        const approverInfo = dec.approver_name
          ? `${dec.approver_name}${dec.approver_email ? ` (${dec.approver_email})` : ""}`
          : dec.approver_email || "—";
        const decStatus = (dec.decision || "APPROVED").toUpperCase();
        const decDateStr = dec.timestamp || (dec as any).decision_date
          ? new Date(dec.timestamp || (dec as any).decision_date).toLocaleDateString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—";
        const decComments = dec.comments?.trim() ? dec.comments.trim() : "—";

        decisionRows.push([
          decVer,
          stageName,
          approverInfo,
          decStatus,
          decDateStr,
          decComments,
        ]);
      });

      // Only show NEXT 1 PENDING stage when proposal is actively IN APPROVAL
      const normStatus = (proposal.status || "").trim().toUpperCase();
      const isInApproval =
        normStatus === "IN APPROVAL" ||
        normStatus === "IN_APPROVAL" ||
        normStatus === "IN-APPROVAL" ||
        normStatus === "INAPPROVAL";

      if (isInApproval && !isArchived) {
        // Collect current version's decisions
        const currentVerDecisions = sortedDecisions.filter(
          (d) => (d.version || currentVTag) === currentVTag
        );

        let nextPendingLevelId: number;

        // 1. Check if proposal explicitly specifies current_level (1, 2, 3...)
        const rawPropLevel = Number(proposal.current_level);
        if (!isNaN(rawPropLevel) && rawPropLevel > 0) {
          nextPendingLevelId = rawPropLevel;
        } else if (currentVerDecisions.length === 0) {
          // Initial cycle without decisions yet -> Level 1
          nextPendingLevelId = 1;
        } else {
          // Inspect the latest decision in the current active version cycle
          const latestDec = currentVerDecisions[currentVerDecisions.length - 1];
          const latestType = (latestDec.decision || "").trim().toUpperCase();
          if (latestType.indexOf("SEND") !== -1 || latestType.indexOf("BACK") !== -1) {
            // After SEND_BACK, workflow re-initiates from Level 1
            nextPendingLevelId = 1;
          } else if (latestType === "APPROVED") {
            nextPendingLevelId = (latestDec.level_id || 1) + 1;
          } else {
            nextPendingLevelId = 1;
          }
        }

        // Check if there is already an APPROVED decision for this pending level in current version
        const alreadyApproved = currentVerDecisions.some(
          (d) => d.level_id === nextPendingLevelId && (d.decision || "").toUpperCase() === "APPROVED"
        );

        if (!alreadyApproved) {
          // Resolve level info for this SINGLE next pending stage
          const targetLevel =
            allLevels.find((lvl) => lvl.level_id === nextPendingLevelId) ||
            levelMap.get(nextPendingLevelId) || {
              level_id: nextPendingLevelId,
              level_name: `Level ${nextPendingLevelId}`,
              approver_name: "",
              approver_email: proposal.pending_with_email || "",
            };

          const approverInfo = targetLevel.approver_name
            ? `${targetLevel.approver_name}${targetLevel.approver_email ? ` (${targetLevel.approver_email})` : ""}`
            : targetLevel.approver_email || (proposal.pending_with_role ? `${proposal.pending_with_role}` : "Assigned Approver");

          decisionRows.push([
            currentVTag,
            targetLevel.level_name || `Level ${targetLevel.level_id}`,
            approverInfo,
            "PENDING",
            "—",
            "Awaiting approval sign-off",
          ]);
        }
      }

      if (decisionRows.length === 0) {
        decisionRows.push([
          {
            content: "Proposal currently in initial submission / pending workflow approval sign-offs.",
            colSpan: 6,
            styles: { halign: "center", fontStyle: "italic", textColor: [100, 116, 139] },
          },
        ]);
      }

      // Mark row indices where a version completes to render a dark line
      const versionEndRowIndices = new Set<number>();
      for (let i = 0; i < decisionRows.length; i++) {
        const thisRow = decisionRows[i];
        if (Array.isArray(thisRow)) {
          const thisVer = String(thisRow[0] || "");
          const nextRow = i < decisionRows.length - 1 ? decisionRows[i + 1] : null;
          const nextVer = Array.isArray(nextRow) ? String(nextRow[0] || "") : "";
          if (thisVer && nextVer && thisVer !== nextVer) {
            versionEndRowIndices.add(i);
          }
        }
      }

      autoTable(doc, {
        startY: currentY,
        margin: { left: margin, right: margin },
        head: [
          [
            {
              content: "SECTION H2 — OFFICIAL APPROVAL DECISIONS & SIGN-OFF AUDIT TRAIL (VERSION-WISE)",
              colSpan: 6,
              styles: { halign: "left" },
            },
          ],
          ["Version", "Workflow Level / Stage", "Approver Sign-off", "Decision", "Date & Time", "Comments & Remarks"],
        ],
        body: decisionRows,
        theme: "grid",
        headStyles: { fillColor: CORPORATE_NAVY, textColor: HEADER_TEXT_COLOR, fontStyle: "bold", fontSize: 8 },
        styles: { fontSize: 7, textColor: [15, 23, 42] },
        columnStyles: {
          0: { cellWidth: 16, fontStyle: "bold" },
          1: { cellWidth: 38 },
          2: { cellWidth: 42 },
          3: { cellWidth: 22, fontStyle: "bold" },
          4: { cellWidth: 26 },
          5: { fontStyle: "normal" },
        },
        didParseCell: (data) => {
          if (data.section === "body" && data.column.index === 3) {
            const val = String(data.cell.raw || "").toUpperCase().trim();
            if (val === "APPROVED") {
              data.cell.styles.textColor = [22, 101, 52];
              data.cell.styles.fontStyle = "bold";
            } else if (val === "PENDING") {
              data.cell.styles.textColor = [194, 65, 12];
              data.cell.styles.fontStyle = "bold";
            } else if (val.indexOf("REJECT") !== -1) {
              data.cell.styles.textColor = [185, 28, 28];
              data.cell.styles.fontStyle = "bold";
            } else if (val.indexOf("SEND") !== -1 || val.indexOf("BACK") !== -1) {
              data.cell.styles.textColor = [194, 65, 12];
              data.cell.styles.fontStyle = "bold";
            }
          }
        },
        didDrawCell: (data) => {
          if (data.section === "body" && versionEndRowIndices.has(data.row.index)) {
            // Draw a dark divider line after completing a version
            doc.setDrawColor(15, 23, 42); // Corporate Navy #0f172a
            doc.setLineWidth(1.2);
            const lineY = data.cell.y + data.cell.height;
            doc.line(data.cell.x, lineY, data.cell.x + data.cell.width, lineY);
          }
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

      // Download file with format: <CERPRNO>_<version>_<date>_<time>.pdf (FR-09)
      const now = new Date();
      const datePart = now.toISOString().split("T")[0].replace(/-/g, "");
      const timePart = now.toTimeString().split(" ")[0].replace(/:/g, "");
      const fileName = `${proposal.cerprno}_${currentVTag}_${datePart}_${timePart}.pdf`;

      doc.save(fileName);
    } catch (e) {
      console.error("[PDFExportService] Error generating PDF:", e);
      throw new Error("Error while generating PDF file");
    }
  }
}
