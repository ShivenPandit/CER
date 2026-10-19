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
  Printer,
} from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { IAppUser } from "../../models/UserModel";
import { ICERAttachment } from "../../models/AttachmentModel";
import { IWorkflowLevel, IApprovalDecision } from "../../models/WorkflowModel";
import { ICERDataService } from "../../services/ICERDataService";
import { PDFExportService } from "../../services/PDFExportService";
import { ExcelExportService } from "../../services/ExcelExportService";
import { StatusBadge } from "../common/StatusBadge";
import { CategoryBadge } from "../common/CategoryBadge";
import { ApprovalProgressTracker } from "./ApprovalProgressTracker";

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
        const [atts, lvls, decs] = await Promise.all([
          dataService.getAttachments(found.cerprno),
          dataService.getWorkflowLevels(),
          dataService.getApprovalDecisions(found.cerprno),
        ]);
        setAttachments(atts);
        setWorkflowLevels(lvls);
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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-20">
      {/* Top Bar with Lookup & Actions */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Display Capital Expenditure Request (CER)
            </h2>
            <p className="text-xs text-slate-500">
              Form FR-03: Official read-only proposal record, approval stages, and export tools
            </p>
          </div>
        </div>

        {/* Lookup / Retrieve Form */}
        <form onSubmit={handleLookup} className="flex items-center gap-2">
          <input
            type="text"
            value={proposalNumberInput}
            onChange={(e) => setProposalNumberInput(e.target.value)}
            placeholder="Enter Proposal No..."
            className="w-48 sm:w-56 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl shadow-sm transition-colors"
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
        <div className="p-4 rounded-xl bg-blue-50 border border-blue-200 text-blue-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-blue-600 animate-spin" />
          <span className="font-medium">{exportNotice}</span>
        </div>
      )}

      {/* Main Display Body */}
      {proposal && (
        <div className="space-y-6">
          {/* Executive Summary Card & Quick Action Buttons */}
          <div className="p-6 bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-white/10 text-white border border-white/20">
                  {proposal.cerprno}
                </span>
                <CategoryBadge category={proposal.cat} />
                <StatusBadge status={proposal.status} size="sm" />
              </div>

              <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white">
                {proposal.pr_name}
              </h1>

              <div className="flex flex-wrap items-center gap-y-1 gap-x-4 text-xs text-slate-300">
                <span>Owner: <strong>{proposal.owname}</strong></span>
                <span>•</span>
                <span>SBU: <strong>{proposal.sbu}</strong></span>
                <span>•</span>
                <span>Duration: <strong>{proposal.period}</strong></span>
                <span>•</span>
                <span>
                  Pending: <strong className="text-blue-300">Level {proposal.current_level} ({proposal.pending_with_role})</strong>
                </span>
              </div>
            </div>

            {/* Financial Badge & Actions */}
            <div className="flex flex-col items-start md:items-end gap-3 shrink-0">
              <div className="text-left md:text-right">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                  Sanction Amount
                </p>
                <p className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
                  {proposal.currency} {proposal.amount.toLocaleString()}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleDownloadPDF}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                  title="Download Adobe/Vector CER PDF Form (FR-09)"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>PDF Form</span>
                </button>

                <button
                  onClick={handleDownloadExcel}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                  title="Download Excel-Compatible Spreadsheet (FR-10)"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>Excel Export</span>
                </button>

                <button
                  onClick={handlePrint}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg border border-slate-700 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print</span>
                </button>

                {(currentUser.role === "Initiator" || currentUser.role === "Admin") && (
                  <button
                    onClick={() => onNavigateToChange(proposal.cerprno)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    <span>Change CER</span>
                  </button>
                )}

                <button
                  onClick={() => onNavigateToAudit(proposal.cerprno)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-xs font-medium rounded-lg transition-colors"
                  title="Inspect Field-Level Audit Trail"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-blue-300" />
                  <span>Audit Trail</span>
                </button>
              </div>
            </div>
          </div>

          {/* Multilevel Approval Workflow Pipeline Tracker */}
          <ApprovalProgressTracker
            levels={workflowLevels}
            decisions={decisions}
            currentLevel={proposal.current_level}
            status={proposal.status}
          />

          {/* Section A & B: Project Info and Financial Benefits Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Section A: Project Details Card */}
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <FolderGit2 className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Section A — Project identification and scope</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="col-span-2">
                  <p className="text-slate-400 font-medium">Name of Project</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{proposal.pr_name}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">CER Proposal No.</p>
                  <p className="font-mono font-bold text-blue-700 mt-0.5">{proposal.cerprno}</p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">CER Owner Name</p>
                  <p className="font-semibold text-slate-800 mt-0.5">{proposal.owname}</p>
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
                  <p className="font-semibold text-slate-800 mt-0.5">{proposal.duration_months} Months</p>
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
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <DollarSign className="w-5 h-5 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Section B — Financial benefits and payback</h3>
              </div>

              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <p className="text-slate-400 font-medium">Amount of CER</p>
                  <p className="font-bold text-emerald-600 mt-0.5 text-base">
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
                  <p className="font-bold text-emerald-600 mt-0.5 text-sm">
                    {proposal.ben_npv ? `$${proposal.ben_npv} mm` : "N/A"}
                  </p>
                </div>
                <div>
                  <p className="text-slate-400 font-medium">Financial Benefit – IRR (%)</p>
                  <p className="font-bold text-blue-600 mt-0.5 text-sm">
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

          {/* Section C & D: Corporate Budget and Joint Venture Details */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <Landmark className="w-5 h-5 text-purple-600" />
                <h3 className="font-bold text-slate-900 text-sm">Section C — Corporate budget</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
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

            <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-4">
              <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
                <DollarSign className="w-5 h-5 text-amber-600" />
                <h3 className="font-bold text-slate-900 text-sm">Section D — Joint venture details</h3>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
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

          {/* Section E: Expenditure Phasing Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <BarChart2 className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-sm">Section E — Expenditure phasing</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-slate-600 font-bold bg-slate-50">
                    <th className="py-2.5 px-3">Expenditure stream</th>
                    <th className="py-2.5 px-3 text-right">{proposal.ph_till_label || "Till Mar'26"}</th>
                    <th className="py-2.5 px-3 text-right">{proposal.ph_fy_label || "FY 26-27"}</th>
                    <th className="py-2.5 px-3 text-right">{proposal.ph_beyond_label || "Beyond FY'27"}</th>
                    <th className="py-2.5 px-3 text-right font-bold text-slate-800">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">Production (in mmbbls)</td>
                    <td className="py-2.5 px-3 text-right">{proposal.prod_till.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right">{proposal.prod_fy.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right">{proposal.prod_beyond.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      {(proposal.prod_till + proposal.prod_fy + proposal.prod_beyond).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">Capex ($mm)</td>
                    <td className="py-2.5 px-3 text-right">{proposal.capex_till.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right">{proposal.capex_fy.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right">{proposal.capex_beyond.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      {(proposal.capex_till + proposal.capex_fy + proposal.capex_beyond).toLocaleString()}
                    </td>
                  </tr>
                  <tr>
                    <td className="py-2.5 px-3 font-semibold text-slate-700">Opex ($mm)</td>
                    <td className="py-2.5 px-3 text-right">{proposal.opex_till.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right">{proposal.opex_fy.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right">{proposal.opex_beyond.toLocaleString()}</td>
                    <td className="py-2.5 px-3 text-right font-bold">
                      {(proposal.opex_till + proposal.opex_fy + proposal.opex_beyond).toLocaleString()}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section F: CAPEX Cost Estimates Basis */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <Calculator className="w-5 h-5 text-slate-900" />
              <h3 className="font-bold text-slate-900 text-sm">Section F — CAPEX cost estimates basis</h3>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Engineering</span>
                <span className="font-bold text-slate-900 mt-1 block">
                  ${proposal.engineer.toLocaleString()} mm
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Surface Facilities</span>
                <span className="font-bold text-slate-900 mt-1 block">
                  ${proposal.s_fac.toLocaleString()} mm
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Commissioning</span>
                <span className="font-bold text-slate-900 mt-1 block">
                  ${proposal.comis.toLocaleString()} mm
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Pre Operations</span>
                <span className="font-bold text-slate-900 mt-1 block">
                  ${proposal.preop.toLocaleString()} mm
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                <span className="text-slate-400 block text-[11px]">Others</span>
                <span className="font-bold text-slate-900 mt-1 block">
                  ${proposal.others.toLocaleString()} mm
                </span>
              </div>
              <div className="p-3 bg-slate-900 text-white rounded-xl">
                <span className="text-slate-300 block text-[11px]">Total</span>
                <span className="font-bold text-white mt-1 block text-sm">
                  ${proposal.total.toLocaleString()} mm
                </span>
              </div>
            </div>
          </div>

          {/* Section G: Remarks & Justification */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <MessageSquare className="w-5 h-5 text-blue-600" />
                <h3 className="font-bold text-slate-900 text-sm">Section G — Remarks and justification</h3>
              </div>
              <button
                onClick={() => onViewRemarksHistory(proposal.cerprno)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
              >
                <History className="w-3.5 h-3.5" />
                <span>View Historical Versions</span>
              </button>
            </div>
            <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/60 text-xs text-slate-800 leading-relaxed">
              <p className="font-semibold text-slate-900 mb-1">Remarks (including Justification for Non Payback expenditure, etc.):</p>
              <p>{proposal.remarks || "No narrative remarks provided."}</p>
              {proposal.remarks_jv && (
                <div className="mt-3 pt-3 border-t border-slate-200">
                  <p className="font-semibold text-slate-900 mb-1">Remarks on JV Risk (including risk carrying period):</p>
                  <p>{proposal.remarks_jv}</p>
                </div>
              )}
            </div>
          </div>

          {/* Section H: Attachments */}
          <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-4">
            <div className="flex items-center gap-2.5 pb-3 border-b border-slate-100">
              <Paperclip className="w-5 h-5 text-slate-700" />
              <h3 className="font-bold text-slate-900 text-sm">
                Supporting Attachments ({attachments.length})
              </h3>
            </div>
            {attachments.length === 0 ? (
              <p className="text-slate-400 text-xs py-2 italic">No attachments for this proposal.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {attachments.map((att) => (
                  <div
                    key={att.id}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3"
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
                        className="px-2.5 py-1 text-xs font-medium text-blue-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors shrink-0"
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
    </div>
  );
};
