import React, { useState, useEffect } from "react";
import {
  CheckCircle2,
  Eye,
  CheckSquare,
  Search,
  ArrowLeft,
} from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { IWorkflowLevel, isProjectOwnerStage } from "../../models/WorkflowModel";
import { ICERAttachment } from "../../models/AttachmentModel";
import { IAppUser } from "../../models/UserModel";
import { ICERDataService } from "../../services/ICERDataService";
import { StatusBadge } from '../Shared/StatusBadge';
import { CategoryBadge } from '../Shared/CategoryBadge';
import { ApprovalDecisionModal } from '../ApprovalWorkflow/ApprovalDecisionModal';
import { useDynamicPagination } from "../../hooks/useDynamicPagination";
import { DataTablePagination } from '../Shared/DataTablePagination';
import { PermissionService } from "../../services/PermissionService";

interface IPendingApprovalsViewProps {
  dataService: ICERDataService;
  currentUser: IAppUser;
  onNavigateToDisplay: (cerprno: string) => void;
  onRefreshProposals: () => Promise<void>;
  onCancel?: () => void;
  initialProposals?: ICERProposal[];
  initialWorkflowLevels?: IWorkflowLevel[];
}

export const PendingApprovalsView: React.FC<IPendingApprovalsViewProps> = ({
  dataService,
  currentUser,
  onNavigateToDisplay,
  onRefreshProposals,
  onCancel,
  initialProposals,
  initialWorkflowLevels,
}) => {
  const [proposals, setProposals] = useState<ICERProposal[]>(initialProposals || []);
  const [levels, setLevels] = useState<IWorkflowLevel[]>(initialWorkflowLevels || []);
  const [isLoading, setIsLoading] = useState<boolean>(!initialProposals || initialProposals.length === 0);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedProposal, setSelectedProposal] = useState<ICERProposal | null>(null);
  const [selectedAttachments, setSelectedAttachments] = useState<ICERAttachment[]>([]);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  useEffect(() => {
    if (initialProposals && initialProposals.length > 0) {
      setProposals(initialProposals);
      setIsLoading(false);
    }
  }, [initialProposals]);

  useEffect(() => {
    if (initialWorkflowLevels && initialWorkflowLevels.length > 0) {
      setLevels(initialWorkflowLevels);
    }
  }, [initialWorkflowLevels]);

  const loadData = async (force: boolean = false): Promise<void> => {
    try {
      if (!force && initialProposals && initialProposals.length > 0 && initialWorkflowLevels && initialWorkflowLevels.length > 0) {
        setIsLoading(false);
        return;
      }
      setIsLoading(true);
      const [allProps, allLevels] = await Promise.all([
        dataService.getAllProposals(force),
        dataService.getWorkflowLevels(undefined, force),
      ]);
      setProposals(allProps);
      setLevels(allLevels);
    } catch (e) {
      console.error("Error loading pending approvals:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!initialProposals || initialProposals.length === 0 || !initialWorkflowLevels || initialWorkflowLevels.length === 0) {
      loadData().catch((e) => console.error(e));
    }
  }, [currentUser]);

  // Filter proposals awaiting action by current user:
  // Only proposals where the current user is the designated Project Owner (on PO stages)
  // or the explicitly assigned Approver for that specific level
  const pendingList = React.useMemo(() => {
    return proposals.filter((p) => {
      if (p.status !== "In Approval") return false;

      // SBU-specific stage lookup
      const propSbu = (p.sbu || "").trim().toLowerCase();
      const stageConfig = levels.find(
        (l) =>
          (l.sbu || "").trim().toLowerCase() === propSbu &&
          l.level_id === p.current_level
      );

      return PermissionService.canApproveCER(p, currentUser, stageConfig).allowed;
    }).filter((p) => {
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const idMatch = (p.cer_proposal_id || "").toLowerCase().includes(q);
      const noMatch = (p.proposal_no || "").toLowerCase().includes(q);
      const cerMatch = (p.cerprno || "").toLowerCase().includes(q);
      const nameMatch = (p.pr_name || "").toLowerCase().includes(q);
      const ownerMatch = (p.owname || "").toLowerCase().includes(q);
      return idMatch || noMatch || cerMatch || nameMatch || ownerMatch;
    });
  }, [proposals, levels, currentUser, searchTerm]);

  // Fully Automatic Dynamic Table Pagination
  const pagination = useDynamicPagination({
    totalItems: pendingList.length,
    defaultRowHeight: 140,
    bufferBottom: 52,
  });

  const visiblePendingList = pagination.paginateItems(pendingList);

  const handleOpenDecision = async (prop: ICERProposal) => {
    setSelectedProposal(prop);
    const atts = await dataService.getAttachments(prop.cerprno);
    setSelectedAttachments(atts);
    setIsDecisionModalOpen(true);
  };

  const handleSubmitDecision = async (
    decision: "APPROVED" | "REJECTED" | "SENT_BACK",
    comments: string
  ) => {
    if (!selectedProposal) return;

    const result = await dataService.recordDecision({
      cerprno: selectedProposal.cerprno,
      level_id: selectedProposal.current_level,
      approver_name: currentUser.name,
      approver_email: currentUser.email,
      decision,
      comments,
    });

    setFeedbackNotice(
      decision === "APPROVED"
        ? `Proposal ${selectedProposal.cerprno} successfully APPROVED. Advanced to ${result.newStatus}.`
        : decision === "SENT_BACK"
        ? `Proposal ${selectedProposal.cerprno} SENT BACK to Initiator for revision.`
        : `Proposal ${selectedProposal.cerprno} REJECTED.`
    );

    await onRefreshProposals();
    await loadData(true);
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0"
              title="Go back"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Pending Approval Tasks & Decision Queue
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Form FR-05: Review proposal details, examine supporting attachments, and record formal decisions
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative flex-1 sm:flex-initial">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                pagination.setCurrentPage(1);
              }}
              placeholder="Search queue..."
              className="w-full sm:w-48 pl-8 pr-3 py-1.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964] transition-all"
            />
          </div>

          <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 shrink-0">
            {pendingList.length} Tasks Pending Review
          </span>
        </div>
      </div>

      {feedbackNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between animate-fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{feedbackNotice}</span>
          </div>
          <button
            onClick={() => setFeedbackNotice(null)}
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Pending Items Cards Grid */}
      <div
        ref={pagination.tableContainerRef}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden flex flex-col"
      >
        <div className="p-4 sm:p-5 space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2].map((idx) => (
                <div key={idx} className="bg-slate-50/50 rounded-xl border border-slate-200 p-4 sm:p-5 animate-pulse">
                  <div className="h-4 bg-slate-200 rounded w-1/4 mb-3" />
                  <div className="h-6 bg-slate-200 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-slate-200 rounded w-1/3" />
                </div>
              ))}
            </div>
          ) : visiblePendingList.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <CheckCircle2 className="w-10 h-10 mx-auto text-emerald-500 mb-2 opacity-80" />
              <h3 className="font-bold text-slate-800 text-sm">No Pending Approvals</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                {searchTerm
                  ? "No tasks match your search filter."
                  : "There are no CER proposals currently awaiting your approval level. New workflow items will appear here when submitted."}
              </p>
            </div>
          ) : (
            visiblePendingList.map((prop) => {
              const currentLevelCfg = levels.find((l) => l.level_id === prop.current_level);

              return (
                <div
                  key={prop.id}
                  data-role="list-item"
                  className="bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-200 p-4 sm:p-5 shadow-2xs hover:shadow-subtle transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                      <span className="font-mono font-bold text-xs text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200" title="CER Proposal ID">
                        {prop.cer_proposal_id || prop.cerprno}
                      </span>
                      <CategoryBadge category={prop.cat} />
                      <StatusBadge status={prop.status} size="sm" />
                      <span className="text-[11px] font-semibold text-[#012964] bg-[#012964]/10 px-2 py-0.5 rounded border border-[#012964]/20">
                        Level {prop.current_level}: {currentLevelCfg ? currentLevelCfg.level_name : prop.pending_with_role}
                      </span>
                    </div>

                    <h3 className="font-bold text-sm text-slate-900 leading-snug">
                      {prop.pr_name}
                    </h3>

                    <p className="text-xs text-slate-500 flex flex-wrap gap-x-2 gap-y-0.5">
                      <span>Owner: <strong className="text-slate-700">{prop.owname}</strong></span>
                      <span>•</span>
                      <span>SBU: <strong className="text-slate-700">{prop.sbu}</strong></span>
                      <span>•</span>
                      <span>Duration: {prop.period}</span>
                    </p>

                    <p className="text-xs text-slate-600 line-clamp-2 bg-white p-2.5 rounded-lg border border-slate-200/70 mt-1">
                      {prop.remarks || "No narrative remarks provided."}
                    </p>
                  </div>

                  <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end justify-between shrink-0 gap-3 border-t md:border-t-0 pt-3 md:pt-0 border-slate-200">
                    <div>
                      <span className="text-[10px] uppercase font-bold text-slate-400 block md:text-right">
                        Expenditure Amount
                      </span>
                      <p className="text-lg sm:text-xl font-extrabold text-slate-900 md:text-right">
                        {prop.currency} {prop.amount.toLocaleString()}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 w-full sm:w-auto">
                      <button
                        onClick={() => onNavigateToDisplay(prop.cerprno)}
                        className="flex-1 sm:flex-initial px-3 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl transition-colors flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Details</span>
                      </button>

                      <button
                        onClick={() => handleOpenDecision(prop)}
                        className="flex-1 sm:flex-initial px-4 py-2 text-xs font-semibold text-white bg-[#012964] hover:bg-[#001f4d] rounded-xl shadow-md shadow-[#012964]/25 transition-all hover:scale-[1.02] flex items-center justify-center gap-1.5 cursor-pointer"
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        <span>Review & Decide</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Dynamic Pagination Bar */}
        <DataTablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={pendingList.length}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          pageSizeSetting={pagination.pageSizeSetting}
          effectivePageSize={pagination.effectivePageSize}
          onPageChange={pagination.setCurrentPage}
          onPageSizeChange={pagination.setPageSizeSetting}
          onPrevPage={pagination.goToPrevPage}
          onNextPage={pagination.goToNextPage}
          onFirstPage={pagination.goToFirstPage}
          onLastPage={pagination.goToLastPage}
          itemName="tasks"
        />
      </div>

      {/* Decision Modal */}
      {selectedProposal && (
        <ApprovalDecisionModal
          proposal={selectedProposal}
          currentLevelConfig={levels.find(
            (l) =>
              (l.sbu || "").trim().toLowerCase() === (selectedProposal.sbu || "").trim().toLowerCase() &&
              l.level_id === selectedProposal.current_level
          )}
          attachments={selectedAttachments}
          currentUser={currentUser}
          isOpen={isDecisionModalOpen}
          onClose={() => setIsDecisionModalOpen(false)}
          onSubmitDecision={handleSubmitDecision}
        />
      )}
    </div>
  );
};
