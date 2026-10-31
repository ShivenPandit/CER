import React, { useState, useEffect } from "react";
import {
  Search,
  ArrowLeft,
  FileDown,
  FileSpreadsheet,
  Edit,
  History,
  ShieldCheck,
  AlertCircle,
  FolderGit2,
  DollarSign,
  Landmark,
  BarChart2,
  Calculator,
  MessageSquare,
  Paperclip,
  CheckCircle2,
  Clock,
  User,
  Layers,
  Calendar,
  UserCheck,
} from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { IAppUser } from "../../models/UserModel";
import { ICERAttachment } from "../../models/AttachmentModel";
import { IWorkflowLevel, IApprovalDecision, isProjectOwnerStage } from "../../models/WorkflowModel";
import { ICERDataService } from "../../services/ICERDataService";
import { PDFExportService } from "../../services/PDFExportService";
import { ExcelExportService } from "../../services/ExcelExportService";
import { PermissionService } from "../../services/PermissionService";
import { StatusBadge } from '../Shared/StatusBadge';
import { CategoryBadge } from '../Shared/CategoryBadge';
import { ApprovalProgressTracker } from '../ApprovalWorkflow/ApprovalProgressTracker';
import { StatusHistoryModal } from '../ApprovalWorkflow/StatusHistoryModal';
import { AuditTrailModal } from '../Audit/AuditTrailModal';
import { UserAvatar } from '../Common/UserAvatar';
import { calculateExactDays, getCurrentFiscalYearPhasingLabels } from "../../utils/dateUtils";

interface IDisplayCERViewProps {
  dataService: ICERDataService;
  currentUser: IAppUser;
  initialProposalId?: string;
  onCancel: () => void;
  onNavigateToChange: (cerprno: string) => void;
  onNavigateToAudit: (cerprno: string) => void;
  onViewRemarksHistory: (cerprno: string) => void;
}

export const DisplayCERView: React.FC<IDisplayCERViewProps> = ({
  dataService,
  currentUser,
  initialProposalId,
  onCancel,
  onNavigateToChange,
  onNavigateToAudit,
  onViewRemarksHistory,
}) => {
  const [proposalNumberInput, setProposalNumberInput] = useState(initialProposalId || "");
  const [proposal, setProposal] = useState<ICERProposal | null>(null);
  const [attachments, setAttachments] = useState<ICERAttachment[]>([]);
  const [workflowLevels, setWorkflowLevels] = useState<IWorkflowLevel[]>([]);
  const [decisions, setDecisions] = useState<IApprovalDecision[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [isStatusHistoryOpen, setIsStatusHistoryOpen] = useState(false);
  const [isAuditTrailOpen, setIsAuditTrailOpen] = useState(false);

  const loadProposal = async (cerprno: string): Promise<void> => {
    if (!cerprno || !cerprno.trim()) {
      setErrorMessage("Make an entry in mandatory field 'CER Proposal No.'");
      setProposal(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const found = await dataService.getProposalByNumber(cerprno.trim());
      if (!found) {
        setErrorMessage(`Proposal '${cerprno}' not found in the system.`);
        setProposal(null);
      } else {
        setProposal(found);
        const [atts, lvls, decs, roles] = await Promise.all([
          dataService.getAttachments(found.cerprno),
          dataService.getWorkflowLevels(found.sbu),
          dataService.getApprovalDecisions(found.cerprno),
          dataService.getUserRoles().catch(() => []),
        ]);
        const resolvedLvls = lvls.map((lvl) => {
          if (isProjectOwnerStage(lvl)) {
            return {
              ...lvl,
              is_project_owner_stage: true,
              approver_name: found.owname ? `${found.owname} (Project Owner)` : "Project Owner",
              approver_email: found.owner_email || "",
            };
          }

          // If a decision was already recorded for this level, show the real approver from the decision
          const matchingDec = (decs || []).find((d) => d.level_id === lvl.level_id);
          if (matchingDec && matchingDec.approver_name) {
            return {
              ...lvl,
              approver_name: matchingDec.approver_name,
              approver_email: matchingDec.approver_email || lvl.approver_email,
            };
          }

          // If approver_name is missing, resolve from CERUserRoles strictly for active users holding the 'Approver' role at this level
          if (!lvl.approver_name) {
            const roleMatch = (roles || []).find(
              (r) =>
                r.is_active &&
                r.role === "Approver" &&
                r.approval_level === lvl.level_id
            );
            if (roleMatch && roleMatch.user_name) {
              return {
                ...lvl,
                approver_name: roleMatch.user_name,
                approver_email: roleMatch.user_email || lvl.approver_email,
              };
            }
          }

          return lvl;
        });
        setAttachments(atts);
        setWorkflowLevels(resolvedLvls);
        setDecisions(decs);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error retrieving proposal.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialProposalId) {
      loadProposal(initialProposalId).catch((err) => console.error(err));
    }
  }, [initialProposalId]);

  const handleLookup = (e: React.FormEvent): void => {
    e.preventDefault();
    loadProposal(proposalNumberInput).catch((err) => console.error(err));
  };

  const handleDownloadPDF = async () => {
    if (!proposal) return;
    try {
      setExportNotice("Generating official CER PDF document...");
      await PDFExportService.generateCERPdf(proposal, decisions);
      setExportNotice(null);
    } catch (e: any) {
      setExportNotice(null);
      alert(e.message || "Error while generating PDF file");
    }
  };

  const handleDownloadExcel = () => {
    if (!proposal) return;
    try {
      ExcelExportService.exportSingleProposal(proposal);
    } catch (e: any) {
      alert("Error exporting proposal to Excel: " + e.message);
    }
  };

  const defaultPhasingLabels = proposal
    ? getCurrentFiscalYearPhasingLabels(proposal.created_date ? new Date(proposal.created_date) : new Date())
    : getCurrentFiscalYearPhasingLabels();
  const period1Display = proposal?.ph_till_label || defaultPhasingLabels.ph_till_label;
  const period2Display = proposal?.ph_fy_label || defaultPhasingLabels.ph_fy_label;
  const period3Display = proposal?.ph_beyond_label || defaultPhasingLabels.ph_beyond_label;

  return (
    <div className="cer-display-scope space-y-4 pb-8">
      {/* Page-Scoped Brand Colour Tokens & Accessibility Style */}
      <style>{`
        .cer-display-scope {
          --cer-brand-blue: #012964;
          --cer-brand-green: #66CC33;
        }

        .cer-display-scope .cer-btn-primary {
          background-color: var(--cer-brand-blue) !important;
          color: #ffffff !important;
        }
        .cer-display-scope .cer-btn-primary:hover:not(:disabled) {
          opacity: 0.92 !important;
        }

        .cer-display-scope .cer-btn-green {
          background-color: var(--cer-brand-green) !important;
          color: var(--cer-brand-blue) !important;
          font-weight: 700 !important;
        }
        .cer-display-scope .cer-btn-green:hover:not(:disabled) {
          opacity: 0.92 !important;
        }

        .cer-display-scope .cer-text-blue {
          color: var(--cer-brand-blue) !important;
        }
        .cer-display-scope .cer-text-green {
          color: var(--cer-brand-green) !important;
        }

        .cer-display-scope .cer-border-blue {
          border-color: var(--cer-brand-blue) !important;
        }
        .cer-display-scope .cer-border-green {
          border-color: var(--cer-brand-green) !important;
        }

        .cer-display-scope .cer-bg-blue {
          background-color: var(--cer-brand-blue) !important;
          color: #ffffff !important;
        }
        .cer-display-scope .cer-bg-green {
          background-color: var(--cer-brand-green) !important;
          color: var(--cer-brand-blue) !important;
        }

        .cer-display-scope .cer-input-focus:focus {
          outline: none !important;
          border-color: var(--cer-brand-blue) !important;
          box-shadow: 0 0 0 2px rgba(1, 41, 100, 0.2) !important;
        }

        .sp-skipToContent:not(:focus):not(:focus-within),
        #sp-skipToContent:not(:focus):not(:focus-within) {
          position: absolute !important;
          width: 1px !important;
          height: 1px !important;
          padding: 0 !important;
          margin: -1px !important;
          overflow: hidden !important;
          clip: rect(0, 0, 0, 0) !important;
          white-space: nowrap !important;
          border: 0 !important;
        }
        .sp-skipToContent:focus,
        #sp-skipToContent:focus,
        .sp-skipToContent:focus-visible,
        #sp-skipToContent:focus-visible {
          position: fixed !important;
          top: 12px !important;
          left: 12px !important;
          z-index: 99999 !important;
          display: inline-block !important;
          background: var(--cer-brand-blue) !important;
          color: #ffffff !important;
          padding: 8px 16px !important;
          border-radius: 8px !important;
          font-size: 12px !important;
          font-weight: 600 !important;
          box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.3) !important;
          outline: 2px solid var(--cer-brand-green) !important;
          text-decoration: none !important;
          clip: auto !important;
          width: auto !important;
          height: auto !important;
        }
      `}</style>

      {/* Top Bar with Lookup & Actions */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3.5 print:hidden">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Display Capital Expenditure Request (CER)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Official read-only proposal record, approval stages, and export tools
            </p>
          </div>
        </div>

        {/* Lookup / Retrieve Form */}
        <form onSubmit={handleLookup} className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={proposalNumberInput}
              onChange={(e) => setProposalNumberInput(e.target.value)}
              placeholder="CER Proposal ID or No..."
              className="w-full pl-9 pr-3.5 py-2 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-mono font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none cer-input-focus transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center justify-center gap-1.5 px-4 py-2 cer-btn-primary text-xs font-semibold rounded-xl shadow-sm transition-opacity shrink-0 disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{isLoading ? "Loading..." : "Retrieve"}</span>
          </button>
        </form>
      </div>

      {/* Mandatory Validation Error / Notice as required by FR-02 / FR-03 */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {exportNotice && (
        <div className="p-4 rounded-xl bg-slate-50 border cer-border-blue text-slate-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 cer-text-blue animate-spin" />
          <span className="font-medium">{exportNotice}</span>
        </div>
      )}

      {/* Main Display Body */}
      {proposal && (
        <div className="space-y-4">
          {/* Executive Proposal Summary Card */}
          <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-subtle space-y-3">
            {/* Primary Row: CER PR Number + Status/Vital + Sanction Amount */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1">
                  CER Proposal ID / No.
                </p>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-lg sm:text-xl font-bold font-mono text-slate-900 tracking-tight" title="System-generated CER Proposal ID">
                    {proposal.cer_proposal_id || proposal.cerprno}
                  </span>
                  {proposal.proposal_no && proposal.proposal_no !== (proposal.cer_proposal_id || proposal.cerprno) && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-medium bg-slate-100 text-slate-700 border border-slate-200" title="Business Reference Proposal Number">
                      No: {proposal.proposal_no}
                    </span>
                  )}

                  {/* Proposal Status Pill */}
                  <span
                    className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                      proposal.status === "Approved"
                        ? "bg-white cer-border-green text-slate-900"
                        : proposal.status === "Rejected"
                        ? "bg-rose-50 text-rose-700 border-rose-200"
                        : proposal.status === "Draft"
                        ? "bg-slate-100 text-slate-700 border-slate-200"
                        : proposal.status === "Revised"
                        ? "bg-purple-50 text-purple-700 border-purple-200"
                        : "bg-white cer-border-blue cer-text-blue"
                    }`}
                  >
                    <Clock
                      className="w-3.5 h-3.5"
                      style={{
                        color:
                          proposal.status === "Approved"
                            ? "var(--cer-brand-green)"
                            : proposal.status === "Rejected"
                            ? undefined
                            : "var(--cer-brand-blue)",
                      }}
                    />
                    <span>{proposal.status}</span>
                  </span>

                  {/* Vital / Category Pill (only if applicable) */}
                  {proposal.cat && (
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full border ${
                        proposal.cat === "Vital"
                          ? "bg-rose-50 text-rose-700 border-rose-200"
                          : proposal.cat === "Essential"
                          ? "bg-amber-50 text-amber-700 border-amber-200"
                          : "bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                      <span>{proposal.cat}</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Sanction Amount */}
              <div className="text-left md:text-right shrink-0">
                <p className="text-xs font-medium text-slate-500">
                  Sanction Amount
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  {proposal.currency} {proposal.amount.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Second Row: Project Title & Action Toolbar (Integrated to save vertical space) */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-0.5">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
                {proposal.pr_name}
              </h1>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center gap-2 print:hidden shrink-0">
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-medium rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="Download Adobe/Vector CER PDF Form (FR-09)"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>PDF Form</span>
                </button>

                <button
                  onClick={handleDownloadExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#107C41] hover:bg-[#0E6C38] text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="Download Excel-Compatible Spreadsheet (FR-10)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel Export</span>
                </button>

                <button
                  onClick={() => setIsStatusHistoryOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 text-xs font-medium rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="View complete stage-by-stage status history, approvals, rejections, and comments"
                >
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>Status History</span>
                </button>

                {(() => {
                  const editAuth = proposal
                    ? PermissionService.canEditCER(proposal, currentUser)
                    : { allowed: false, reason: "Proposal not found" };
                  const canEdit = editAuth.allowed;
                  const editTooltip = canEdit
                    ? "Modify Proposal Details (FR-02)"
                    : editAuth.reason || "Proposal cannot be modified";
                  return (
                    <button
                      disabled={!canEdit}
                      onClick={canEdit ? () => onNavigateToChange(proposal.cerprno) : undefined}
                      className={`flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 text-xs font-medium rounded-lg transition-colors ${
                        canEdit
                          ? "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 shadow-2xs cursor-pointer"
                          : "bg-slate-50 text-slate-400 border border-slate-200/80 cursor-not-allowed opacity-60"
                      }`}
                      title={editTooltip}
                      aria-disabled={!canEdit}
                    >
                      <Edit className="w-3.5 h-3.5 text-slate-500" />
                      <span>Change CER</span>
                    </button>
                  );
                })()}

                <button
                  onClick={() => setIsAuditTrailOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 hover:border-slate-300 text-xs font-medium rounded-lg shadow-2xs transition-colors cursor-pointer"
                  title="Inspect Field-Level Audit Trail and Delta Changes"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                  <span>Audit Trail</span>
                </button>
              </div>
            </div>

            {/* Third Row: Metadata Grid with subtle dividers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 py-2.5 border-y border-slate-100">
              {/* Project Owner */}
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400 font-medium">Project Owner</p>
                  <p className="text-xs font-semibold text-slate-800 truncate" title={proposal.owname}>
                    {proposal.owname}
                  </p>
                </div>
              </div>

              {/* SBU */}
              <div className="flex items-center gap-3 lg:border-l lg:border-slate-150 lg:pl-4">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400 font-medium">SBU</p>
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {proposal.sbu}
                  </p>
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-center gap-3 lg:border-l lg:border-slate-150 lg:pl-4">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400 font-medium">Duration</p>
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {proposal.period || (proposal.st_date && proposal.com_date ? `${calculateExactDays(proposal.st_date, proposal.com_date)} Days` : `${proposal.duration_months} Months`)}
                  </p>
                </div>
              </div>

              {/* Pending With */}
              <div className="flex items-center gap-3 lg:border-l lg:border-slate-150 lg:pl-4">
                <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4 text-slate-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400 font-medium">Pending With</p>
                  <p className="text-xs font-semibold text-slate-800 truncate">
                    {proposal.status === "In Approval"
                      ? `Level ${proposal.current_level} (${proposal.pending_with_role || `Level ${proposal.current_level} Approver`})`
                      : proposal.status === "Approved"
                      ? "Fully Approved"
                      : proposal.status === "Rejected"
                      ? "Proposal Rejected"
                      : proposal.status === "Draft"
                      ? "Draft — Not Submitted"
                      : proposal.status === "Revised"
                      ? "Revised — Pending Resubmission"
                      : proposal.status}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Multilevel Approval Workflow Pipeline Tracker */}
          <ApprovalProgressTracker
            levels={workflowLevels}
            decisions={decisions}
            currentLevel={proposal.current_level}
            status={proposal.status}
            proposal={proposal}
            currentUser={currentUser}
          />

          {/* Section A & B: Project Info and Financial Benefits Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Section A: Project Details Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                <FolderGit2 className="w-5 h-5 cer-text-blue" />
                <h3 className="font-bold text-slate-900 text-sm">Section A — Project identification and scope</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="col-span-2">
                  <p className="text-slate-400 font-medium">Name of Project</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{proposal.pr_name}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">CER Proposal No.</p>
                  <p className="font-mono font-bold text-slate-800 mt-0.5">{proposal.proposal_no || proposal.cerprno}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">CER Proposal ID</p>
                  <p className="font-mono font-bold cer-text-blue mt-0.5">{proposal.cer_proposal_id || proposal.cerprno}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">CER Owner Name</p>
                  <div className="flex items-center gap-2 mt-1">
                    <UserAvatar
                      name={proposal.owname}
                      email={proposal.owner_email}
                      size="xs"
                    />
                    <span className="font-semibold text-slate-800">{proposal.owname}</span>
                  </div>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Block/SBU/Field</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{proposal.sbu}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Category</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{proposal.cat}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Start Date of Project</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{proposal.st_date}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Completion Date of Project</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{proposal.com_date}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Total Duration</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {proposal.st_date && proposal.com_date
                      ? `${calculateExactDays(proposal.st_date, proposal.com_date)} Days`
                      : (proposal.period || `${proposal.duration_months} Months`)}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Owner Email</p>
                  <p className="font-semibold text-slate-800 mt-0.5 truncate">{proposal.owner_email}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 font-medium">Objectives of CER</p>
                  <p className="font-medium text-slate-800 mt-0.5 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {proposal.object || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Section B: Financial Benefits Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                <DollarSign className="w-5 h-5 cer-text-green" />
                <h3 className="font-bold text-slate-900 text-sm">Section B — Financial benefits and payback</h3>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-400 font-medium">Amount of CER</p>
                  <p className="font-bold cer-text-blue mt-0.5 text-base">
                    {proposal.currency} {proposal.amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Payback/Non Payback</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{proposal.payable}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Payback Period (in no. of Quarters)</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    {proposal.payback_quarters ? `${proposal.payback_quarters} Quarters` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Financial Benefits – NPV ($mm)</p>
                  <p className="font-bold cer-text-blue mt-0.5 text-sm">
                    {proposal.ben_npv ? `$${proposal.ben_npv} mm` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Financial Benefit – IRR (%)</p>
                  <p className="font-bold cer-text-blue mt-0.5 text-sm">
                    {proposal.ben_irr ? `${proposal.ben_irr}%` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Revisions Count</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{proposal.revision_count || 0}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 font-medium">Key Assumptions to Financial Benefit/Costs</p>
                  <p className="font-medium text-slate-700 mt-0.5 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    {proposal.cost_assumptions || "None recorded."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section C: Expenditure Phasing Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <BarChart2 className="w-5 h-5 cer-text-blue" />
                <h3 className="font-bold text-slate-900 text-sm">Section C — Expenditure phasing</h3>
              </div>
              <span className="text-[11px] font-medium cer-text-blue bg-white px-2.5 py-0.5 rounded-full border cer-border-blue">
                Indian FY ({period2Display})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-50">
                    <th className="py-2 px-3">Expenditure stream</th>
                    <th className="py-2 px-3 text-right">{period1Display}</th>
                    <th className="py-2 px-3 text-right">{period2Display}</th>
                    <th className="py-2 px-3 text-right">{period3Display}</th>
                    <th className="py-2 px-3 text-right font-bold text-slate-800">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-700">Production (in mmbbls)</td>
                    <td className="py-2 px-3 text-right">{proposal.prod_till.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{proposal.prod_fy.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{proposal.prod_beyond.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-bold">
                      {(proposal.prod_till + proposal.prod_fy + proposal.prod_beyond).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-700">Capex ($mm)</td>
                    <td className="py-2 px-3 text-right">{proposal.capex_till.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{proposal.capex_fy.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{proposal.capex_beyond.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-bold">
                      {(proposal.capex_till + proposal.capex_fy + proposal.capex_beyond).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2 px-3 font-semibold text-slate-700">Opex ($mm)</td>
                    <td className="py-2 px-3 text-right">{proposal.opex_till.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{proposal.opex_fy.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right">{proposal.opex_beyond.toLocaleString()}</td>
                    <td className="py-2 px-3 text-right font-bold">
                      {(proposal.opex_till + proposal.opex_fy + proposal.opex_beyond).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section D: CAPEX Cost Estimates Basis */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
              <Calculator className="w-5 h-5 text-slate-900" />
              <h3 className="font-bold text-slate-900 text-sm">Section D — CAPEX cost estimates basis</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 text-xs">
              {(() => {
                const sym = proposal.currency === "INR" ? "₹" : "$";
                const unit = proposal.currency === "INR" ? "" : " mm";
                return (
                  <>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Engineering</span>
                      <span className="font-bold text-slate-900 mt-0.5 block">
                        {sym}{proposal.engineer.toLocaleString()}{unit}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Surface Facilities</span>
                      <span className="font-bold text-slate-900 mt-0.5 block">
                        {sym}{proposal.s_fac.toLocaleString()}{unit}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Commissioning</span>
                      <span className="font-bold text-slate-900 mt-0.5 block">
                        {sym}{proposal.comis.toLocaleString()}{unit}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Pre Operations</span>
                      <span className="font-bold text-slate-900 mt-0.5 block">
                        {sym}{proposal.preop.toLocaleString()}{unit}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-400 block text-[11px]">Others</span>
                      <span className="font-bold text-slate-900 mt-0.5 block">
                        {sym}{proposal.others.toLocaleString()}{unit}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-50/90 rounded-xl border border-slate-200">
                      <span className="text-slate-500 font-semibold block text-[11px]">Total (auto-calculated)</span>
                      <span className="font-bold text-slate-900 mt-0.5 block text-sm font-mono">
                        {sym}{proposal.total.toLocaleString()}{unit}
                      </span>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>

          {/* Section E & F: Corporate Budget and Joint Venture Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                <Landmark className="w-5 h-5 text-slate-700" />
                <h3 className="font-bold text-slate-900 text-sm">Section E — Corporate budget</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-400 font-medium">Corporate Budget (Yes/No)</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{proposal.cbudget}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Corporate Budget Amount ($mm)</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    ${proposal.cb_amnt.toLocaleString()} mm
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 font-medium">Reason if not/partially budgeted</p>
                  <p className="font-medium text-slate-700 mt-0.5 text-xs bg-slate-50 p-2 rounded-lg">
                    {proposal.reason || "Within standard budgetary envelope."}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                <DollarSign className="w-5 h-5 text-slate-700" />
                <h3 className="font-bold text-slate-900 text-sm">Section F — Joint venture details</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <p className="text-slate-400 font-medium">Aligned with JV (Yes/No/Under Discussion)</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{proposal.jv}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">JV Cost Recoverable (Yes/No)</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{proposal.jv_recoverable || "No"}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">JV Budget (Yes/No)</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{proposal.jv_budget}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">JV Budget Amount ($mm)</p>
                  <p className="font-semibold text-slate-800 mt-0.5">
                    ${proposal.jv_amnt.toLocaleString()} mm
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-slate-400 font-medium">Reason if not/partially budgeted</p>
                  <p className="font-medium text-slate-700 mt-0.5 text-xs bg-slate-50 p-2 rounded-lg">
                    {proposal.jv_reason || "Approved by Operating Committee / TCM."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section G: Remarks & Justification */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
            <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 cer-text-blue" />
                <h3 className="font-bold text-slate-900 text-sm">Section G — Remarks and justification</h3>
              </div>
              <button
                onClick={() => onViewRemarksHistory(proposal.cerprno)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold cer-text-blue bg-white hover:bg-slate-50 border cer-border-blue rounded-lg transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                <span>View Historical Versions</span>
              </button>
            </div>
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-800 leading-relaxed">
              <p className="font-semibold text-slate-900 mb-1">Remarks (including Justification for Non Payback expenditure, etc.):</p>
              <p>{proposal.remarks || "No narrative remarks provided."}</p>
              {proposal.remarks_jv && (
                <div className="mt-2.5 pt-2.5 border-t border-slate-200">
                  <p className="font-semibold text-slate-900 mb-1">Remarks on JV Risk (including risk carrying period):</p>
                  <p>{proposal.remarks_jv}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section H: Attachments */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
              <Paperclip className="w-5 h-5 text-slate-700" />
              <h3 className="font-bold text-slate-900 text-sm">
                Supporting Attachments ({attachments.length})
              </h3>
            </div>
            {attachments.length === 0 ? (
              <p className="text-slate-400 text-xs py-1.5 italic">No attachments for this proposal.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="truncate">
                      <p className="font-semibold text-slate-900 truncate">{att.name}</p>
                      <p className="text-[11px] text-slate-400">
                        {(att.size / 1024).toFixed(0)} KB • by {att.uploaded_by}
                      </p>
                    </div>
                    {att.data_url && (
                      <a
                        href={att.data_url}
                        download={att.name}
                        className="px-2.5 py-1 text-xs font-medium cer-text-blue bg-white border cer-border-blue rounded-lg hover:bg-slate-50 transition-colors shrink-0"
                      >
                        Download
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {proposal && (
        <StatusHistoryModal
          isOpen={isStatusHistoryOpen}
          onClose={() => setIsStatusHistoryOpen(false)}
          proposal={proposal}
          levels={workflowLevels}
          decisions={decisions}
          dataService={dataService}
        />
      )}

      {proposal && (
        <AuditTrailModal
          isOpen={isAuditTrailOpen}
          onClose={() => setIsAuditTrailOpen(false)}
          proposal={proposal}
          dataService={dataService}
        />
      )}
    </div>
  );
};
