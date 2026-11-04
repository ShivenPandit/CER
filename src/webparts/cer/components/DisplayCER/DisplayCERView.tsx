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
import { StatusHistoryModal } from '../ApprovalWorkflow/StatusHistoryModal';
import { AuditTrailModal } from '../Audit/AuditTrailModal';
import { ProposalHistoryModal } from './ProposalHistoryModal';
import { UserAvatar } from '../Common/UserAvatar';
import { calculateExactDays, getCurrentFiscalYearPhasingLabels } from "../../utils/dateUtils";

interface IDisplayCERViewProps {
  dataService: ICERDataService;
  currentUser: IAppUser;
  initialProposalId?: string;
  onCancel: () => void;
  onNavigateToChange: (cerprno: string) => void;
  onNavigateToAudit: (cerprno: string) => void;
  onViewRemarksHistory?: (cerprno: string) => void;
}

export const DisplayCERView: React.FC<IDisplayCERViewProps> = ({
  dataService,
  currentUser,
  initialProposalId,
  onCancel,
  onNavigateToChange,
  onNavigateToAudit,
}) => {
  const [proposalNumberInput, setProposalNumberInput] = useState(initialProposalId || "");
  const [proposal, setProposal] = useState<ICERProposal | null>(null);
  const [attachments, setAttachments] = useState<ICERAttachment[]>([]);
  const [workflowLevels, setWorkflowLevels] = useState<IWorkflowLevel[]>([]);
  const [decisions, setDecisions] = useState<IApprovalDecision[]>([]);
  const [historyProposals, setHistoryProposals] = useState<ICERProposal[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [exportNotice, setExportNotice] = useState<string | null>(null);
  const [isStatusHistoryOpen, setIsStatusHistoryOpen] = useState(false);
  const [isProposalHistoryOpen, setIsProposalHistoryOpen] = useState(false);
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
        const [atts, lvls, decs, roles, hist] = await Promise.all([
          dataService.getAttachments(found.cerprno),
          dataService.getWorkflowLevels(found.sbu),
          dataService.getApprovalDecisions(found.cerprno),
          dataService.getUserRoles().catch(() => []),
          dataService.getProposalHistory(found.cer_proposal_id || found.cerprno).catch(() => []),
        ]);
        setHistoryProposals(hist || []);
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

          // If approver_name is missing, resolve from CERRoleMatrix strictly for active users holding the 'Approver' role at this level
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
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            title="Go back"
            aria-label="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Display CER
            </h2>
          </div>
        </div>

        {/* Actions & Status Badge in Top Bar Header */}
        {proposal ? (
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Action Toolbar - Prominently positioned with enhanced UI/UX */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5 print:hidden shrink-0">
              <button
                type="button"
                onClick={handleDownloadPDF}
                className="group flex items-center gap-2 h-10 px-4 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-700 hover:to-rose-800 active:scale-[0.98] text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow transition-all cursor-pointer"
                title="Download Adobe/Vector CER PDF Form"
              >
                <FileDown className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-y-0.5" />
                <span>Download PDF</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadExcel}
                className="group flex items-center gap-2 h-10 px-4 bg-[#107C41] hover:bg-[#0E6C38] active:scale-[0.98] text-white text-sm font-semibold rounded-xl shadow-xs hover:shadow transition-all cursor-pointer"
                title="Download Excel Spreadsheet"
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0 transition-transform group-hover:-translate-y-0.5" />
                <span>Download Excel</span>
              </button>

              <button
                type="button"
                onClick={() => setIsStatusHistoryOpen(true)}
                className="group flex items-center gap-2 h-10 px-4 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 hover:text-[#012964] border border-slate-300 hover:border-slate-400 text-sm font-semibold rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                title="View complete stage-by-stage status history, approvals, rejections, and comments"
              >
                <History className="w-4 h-4 text-slate-500 group-hover:text-[#012964] shrink-0 transition-transform group-hover:rotate-[-20deg]" />
                <span>Status History</span>
              </button>

              <button
                type="button"
                onClick={() => setIsProposalHistoryOpen(true)}
                className="group flex items-center gap-2 h-10 px-4 bg-white hover:bg-slate-50 active:scale-[0.98] text-slate-700 hover:text-[#012964] border border-slate-300 hover:border-slate-400 text-sm font-semibold rounded-xl shadow-2xs hover:shadow-xs transition-all cursor-pointer"
                title="View complete proposal submissions and approved version history"
              >
                <History className="w-4 h-4 text-slate-500 group-hover:text-[#012964] shrink-0 transition-transform group-hover:rotate-[-20deg]" />
                <span>Proposal History</span>
              </button>
            </div>

            <div className="h-6 w-px bg-slate-200 hidden xl:block shrink-0" />

            {/* Proposal Status Badge */}
            <span
              className={`inline-flex items-center gap-2 h-10 text-sm font-bold px-4 rounded-xl border shadow-2xs shrink-0 ${
                proposal.status === "Approved"
                  ? "bg-white cer-border-green text-slate-900"
                  : proposal.status === "Rejected"
                  ? "bg-rose-50 text-rose-700 border-rose-200"
                  : proposal.status === "Draft"
                  ? "bg-slate-100 text-slate-700 border-slate-200"
                  : proposal.status === "Revised"
                  ? "bg-amber-50 text-amber-700 border-amber-200"
                  : "bg-white cer-border-blue cer-text-blue"
              }`}
            >
              <Clock
                className="w-4 h-4 shrink-0"
                style={{
                  color:
                    proposal.status === "Approved"
                      ? "var(--cer-brand-green)"
                      : proposal.status === "Rejected"
                      ? undefined
                      : "var(--cer-brand-blue)",
                }}
              />
              <span>{proposal.status === "Revised" ? "Send Back" : proposal.status}</span>
            </span>
          </div>
        ) : (
          /* Fallback Lookup Form if navigated without proposal ID */
          <form onSubmit={handleLookup} className="flex items-center gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={proposalNumberInput}
                onChange={(e) => setProposalNumberInput(e.target.value)}
                placeholder="Search proposal..."
                className="w-full h-10 pl-9 pr-3.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-sm font-mono font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none cer-input-focus transition-all"
              />
            </div>
            <button
              type="submit"
              disabled={isLoading}
              className="flex items-center justify-center gap-1.5 h-10 px-4 cer-btn-primary text-sm font-semibold rounded-xl shadow-sm transition-opacity shrink-0 disabled:opacity-50 cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>{isLoading ? "Loading..." : "Retrieve"}</span>
            </button>
          </form>
        )}
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
          <div className="p-4 sm:p-6 bg-white rounded-2xl border border-slate-200/80 shadow-subtle space-y-4">
            {/* Primary Row: CER PR Number + Status/Vital + Sanction Amount */}
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
              <div>
                <p className="text-xs sm:text-[13px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  CER Proposal ID / No.
                </p>
                <div className="flex items-center gap-2.5 flex-wrap">
                  <span className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tracking-tight" title="System-generated CER Proposal ID">
                    {proposal.cer_proposal_id || proposal.cerprno}
                  </span>
                  {proposal.proposal_no && proposal.proposal_no !== (proposal.cer_proposal_id || proposal.cerprno) && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs sm:text-[13px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-300" title="Business Reference Proposal Number">
                      No: {proposal.proposal_no}
                    </span>
                  )}

                  {/* Vital / Category Pill (only if applicable) */}
                  {proposal.cat && (
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs sm:text-[13px] font-bold px-3 py-1 rounded-full border shadow-2xs ${
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
                <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider">
                  Sanction Amount
                </p>
                <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                  {proposal.currency} {proposal.amount.toLocaleString()}
                </p>
              </div>
            </div>

            {/* Second Row: Project Title (Clean, unconstrained headline) */}
            <div className="pt-0.5 pb-1">
              <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug">
                {proposal.pr_name}
              </h1>
            </div>

            {/* Third Row: Metadata Grid with subtle dividers */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 py-3.5 border-y border-slate-100">
              {/* Project Owner */}
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Project Owner</p>
                  <p className="text-sm sm:text-[15px] font-bold text-slate-900 truncate mt-0.5" title={proposal.owname}>
                    {proposal.owname}
                  </p>
                </div>
              </div>

              {/* SBU */}
              <div className="flex items-center gap-3 lg:border-l lg:border-slate-200 lg:pl-4">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-center shrink-0">
                  <Layers className="w-4 h-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">SBU</p>
                  <p className="text-sm sm:text-[15px] font-bold text-slate-900 truncate mt-0.5">
                    {proposal.sbu}
                  </p>
                </div>
              </div>

              {/* Duration */}
              <div className="flex items-center gap-3 lg:border-l lg:border-slate-200 lg:pl-4">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-center shrink-0">
                  <Calendar className="w-4 h-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Duration</p>
                  <p className="text-sm sm:text-[15px] font-bold text-slate-900 truncate mt-0.5">
                    {proposal.period || (proposal.st_date && proposal.com_date ? `${calculateExactDays(proposal.st_date, proposal.com_date)} Days` : `${proposal.duration_months} Months`)}
                  </p>
                </div>
              </div>

              {/* Pending With */}
              <div className="flex items-center gap-3 lg:border-l lg:border-slate-200 lg:pl-4">
                <div className="w-9 h-9 rounded-xl bg-slate-50 border border-slate-200/90 flex items-center justify-center shrink-0">
                  <UserCheck className="w-4 h-4 text-slate-500" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Pending With</p>
                  <p className="text-sm sm:text-[15px] font-bold text-slate-900 truncate mt-0.5">
                    {proposal.status === "In Approval"
                      ? `Level ${proposal.current_level} (${proposal.pending_with_role || `Level ${proposal.current_level} Approver`})`
                      : proposal.status === "Approved"
                      ? "Fully Approved"
                      : proposal.status === "Rejected"
                      ? "Proposal Rejected"
                      : proposal.status === "Draft"
                      ? "Draft"
                      : proposal.status === "Revised"
                      ? "Send Back"
                      : proposal.status}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section A & B: Project Info and Financial Benefits Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Section A: Project Details Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                <FolderGit2 className="w-5 h-5 cer-text-blue" />
                <h3 className="font-bold text-slate-900 text-lg">Project Details</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="col-span-2">
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Name of Project</p>
                  <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{proposal.pr_name}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">CER Proposal No.</p>
                  <p className="font-mono font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{proposal.proposal_no || proposal.cerprno}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">CER Proposal ID</p>
                  <p className="font-mono font-bold cer-text-blue text-sm sm:text-[15px] mt-0.5">{proposal.cer_proposal_id || proposal.cerprno}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">CER Owner Name</p>
                  <div className="flex items-center gap-2 mt-1">
                    <UserAvatar
                      name={proposal.owname}
                      email={proposal.owner_email}
                      size="xs"
                    />
                    <span className="font-bold text-slate-900 text-sm sm:text-[15px]">{proposal.owname}</span>
                  </div>
                </div>
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Block/SBU/Field</p>
                  <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{proposal.sbu}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Category</p>
                  <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{proposal.cat}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Start Date of Project</p>
                  <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{proposal.st_date}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Completion Date of Project</p>
                  <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{proposal.com_date}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Total Duration</p>
                  <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">
                    {proposal.st_date && proposal.com_date
                      ? `${calculateExactDays(proposal.st_date, proposal.com_date)} Days`
                      : (proposal.period || `${proposal.duration_months} Months`)}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Owner Email</p>
                  <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5 truncate">{proposal.owner_email}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Objectives of CER</p>
                  <p className="font-medium text-slate-800 text-sm sm:text-[15px] mt-1 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                    {proposal.object || "N/A"}
                  </p>
                </div>
              </div>
            </div>

            {/* Section B: Financial Benefits Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                <DollarSign className="w-5 h-5 cer-text-green" />
                <h3 className="font-bold text-slate-900 text-lg">Financial Metrics</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Amount of CER</p>
                  <p className="font-extrabold cer-text-blue mt-0.5 text-lg sm:text-xl">
                    {proposal.currency} {proposal.amount.toLocaleString()}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Payback/Non Payback</p>
                  <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{proposal.payable}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Payback Period (in no. of Quarters)</p>
                  <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">
                    {proposal.payback_quarters ? `${proposal.payback_quarters} Quarters` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Financial Benefits – NPV ($mm)</p>
                  <p className="font-bold cer-text-blue mt-0.5 text-base">
                    {proposal.ben_npv ? `$${proposal.ben_npv} mm` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Financial Benefit – IRR (%)</p>
                  <p className="font-bold cer-text-blue mt-0.5 text-base">
                    {proposal.ben_irr ? `${proposal.ben_irr}%` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Revisions Count</p>
                  <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{proposal.revision_count || 0}</p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Key Assumptions to Financial Benefit/Costs</p>
                  <p className="font-medium text-slate-800 text-sm mt-1 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
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
                <h3 className="font-bold text-slate-900 text-lg">Expenditure Phasing</h3>
              </div>
              <span className="text-xs sm:text-[13px] font-bold cer-text-blue bg-blue-50/80 px-3 py-1 rounded-full border cer-border-blue">
                Indian FY ({period2Display})
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-700 font-bold bg-slate-100/80">
                    <th className="py-3 px-4">Expenditure stream</th>
                    <th className="py-3 px-4 text-right">{period1Display}</th>
                    <th className="py-3 px-4 text-right">{period2Display}</th>
                    <th className="py-3 px-4 text-right">{period3Display}</th>
                    <th className="py-3 px-4 text-right font-bold text-slate-900">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-800">Production (in mmbbls)</td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-700">{proposal.prod_till.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-700">{proposal.prod_fy.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-700">{proposal.prod_beyond.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                      {(proposal.prod_till + proposal.prod_fy + proposal.prod_beyond).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-800">Capex ($mm)</td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-700">{proposal.capex_till.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-700">{proposal.capex_fy.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-700">{proposal.capex_beyond.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">
                      {(proposal.capex_till + proposal.capex_fy + proposal.capex_beyond).toLocaleString()}
                    </td>
                  </tr>
                  <tr className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-800">Opex ($mm)</td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-700">{proposal.opex_till.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-700">{proposal.opex_fy.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-700">{proposal.opex_beyond.toLocaleString()}</td>
                    <td className="py-2.5 px-4 text-right font-bold text-slate-900">
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
              <h3 className="font-bold text-slate-900 text-lg">Cost Breakdown</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {(() => {
                const sym = proposal.currency === "INR" ? "₹" : "$";
                const unit = proposal.currency === "INR" ? "" : " mm";
                return (
                  <>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-semibold block text-xs sm:text-[13px]">Engineering</span>
                      <span className="font-bold text-slate-900 mt-1 block text-sm sm:text-base">
                        {sym}{proposal.engineer.toLocaleString()}{unit}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-semibold block text-xs sm:text-[13px]">Surface Facilities</span>
                      <span className="font-bold text-slate-900 mt-1 block text-sm sm:text-base">
                        {sym}{proposal.s_fac.toLocaleString()}{unit}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-semibold block text-xs sm:text-[13px]">Commissioning</span>
                      <span className="font-bold text-slate-900 mt-1 block text-sm sm:text-base">
                        {sym}{proposal.comis.toLocaleString()}{unit}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-semibold block text-xs sm:text-[13px]">Pre Operations</span>
                      <span className="font-bold text-slate-900 mt-1 block text-sm sm:text-base">
                        {sym}{proposal.preop.toLocaleString()}{unit}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-semibold block text-xs sm:text-[13px]">Others</span>
                      <span className="font-bold text-slate-900 mt-1 block text-sm sm:text-base">
                        {sym}{proposal.others.toLocaleString()}{unit}
                      </span>
                    </div>
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                      <span className="text-[#012964] font-bold block text-xs sm:text-[13px]">Total (Calculated)</span>
                      <span className="font-extrabold text-[#012964] mt-1 block text-base sm:text-lg font-mono">
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
                <h3 className="font-bold text-slate-900 text-lg">Corporate Budget</h3>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Corporate Budget (Yes/No)</p>
                  <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{proposal.cbudget}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Corporate Budget Amount ($mm)</p>
                  <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">
                    ${proposal.cb_amnt.toLocaleString()} mm
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Reason if not/partially budgeted</p>
                  <p className="font-medium text-slate-800 text-sm mt-1 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                    {proposal.reason || "Within standard budgetary envelope."}
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
              <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                <DollarSign className="w-5 h-5 text-slate-700" />
                <h3 className="font-bold text-slate-900 text-lg">Joint Venture Details</h3>
              </div>
              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Aligned with JV</p>
                  <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{proposal.jv}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">JV Cost Recoverable</p>
                  <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{proposal.jv_recoverable || "No"}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">JV Budget (Yes/No)</p>
                  <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{proposal.jv_budget}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">JV Budget Amount ($mm)</p>
                  <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">
                    ${proposal.jv_amnt.toLocaleString()} mm
                  </p>
                </div>
                <div className="col-span-2">
                  <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Reason if not/partially budgeted</p>
                  <p className="font-medium text-slate-800 text-sm mt-1 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                    {proposal.jv_reason || "Approved by Operating Committee / TCM."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Section G: Remarks & Justification */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
              <MessageSquare className="w-5 h-5 cer-text-blue" />
              <h3 className="font-bold text-slate-900 text-lg">Remarks & Justification</h3>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-sm text-slate-800 leading-relaxed space-y-3">
              <div>
                <p className="font-bold text-slate-900 mb-1 text-sm">Business Remarks & Justification:</p>
                <p>{proposal.remarks || "No narrative remarks provided."}</p>
              </div>
              {proposal.remarks_jv && (
                <div className="pt-3 border-t border-slate-200">
                  <p className="font-bold text-slate-900 mb-1 text-sm">JV Risk Assessment:</p>
                  <p>{proposal.remarks_jv}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section H: Attachments */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
            <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
              <Paperclip className="w-5 h-5 text-slate-700" />
              <h3 className="font-bold text-slate-900 text-lg">
                Attachments ({attachments.length})
              </h3>
            </div>
            {attachments.length === 0 ? (
              <p className="text-slate-500 text-sm py-2 italic font-medium">No attachments.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
                  >
                    <div className="truncate">
                      <p className="font-bold text-slate-900 truncate text-sm">{att.name}</p>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        {(att.size / 1024).toFixed(0)} KB • by {att.uploaded_by}
                      </p>
                    </div>
                    {att.data_url && (
                      <a
                        href={att.data_url}
                        download={att.name}
                        className="px-3.5 py-1.5 text-xs sm:text-[13px] font-semibold cer-text-blue bg-white border cer-border-blue rounded-lg hover:bg-blue-50 transition-colors shrink-0"
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
          historyProposals={historyProposals}
        />
      )}

      {proposal && (
        <ProposalHistoryModal
          isOpen={isProposalHistoryOpen}
          onClose={() => setIsProposalHistoryOpen(false)}
          cerProposalId={proposal.cer_proposal_id || proposal.cerprno}
          initialHistory={historyProposals}
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
