import React, { useState, useEffect, useRef } from "react";
import {
  CheckCircle2,
  Eye,
  CheckSquare,
  Search,
  ArrowLeft,
  RotateCw,
  ArrowUpDown,
} from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { IWorkflowLevel } from "../../models/WorkflowModel";
import { ICERAttachment } from "../../models/AttachmentModel";
import { IAppUser } from "../../models/UserModel";
import { ICERDataService } from "../../services/ICERDataService";
import { CategoryBadge } from "../Shared/CategoryBadge";
import { ApprovalDecisionModal } from "../ApprovalWorkflow/ApprovalDecisionModal";
import { BulkApprovalModal } from "./BulkApprovalModal";
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
  const [sortField, setSortField] = useState<string>("amount");
  const [sortAsc, setSortAsc] = useState<boolean>(false);
  const [selectedProposal, setSelectedProposal] = useState<ICERProposal | null>(null);
  const [selectedAttachments, setSelectedAttachments] = useState<ICERAttachment[]>([]);
  const [isDecisionModalOpen, setIsDecisionModalOpen] = useState(false);
  const [openingProposalId, setOpeningProposalId] = useState<string | null>(null);
  const activeRequestIdRef = useRef<string | null>(null);
  const [feedbackNotice, setFeedbackNotice] = useState<string | null>(null);

  // Bulk Approval State
  const [selectedProposalIds, setSelectedProposalIds] = useState<Set<string>>(new Set());
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkProgressText, setBulkProgressText] = useState("");

  useEffect(() => {
    if (initialProposals !== undefined) {
      setProposals(initialProposals);
      setIsLoading(false);
    }
  }, [initialProposals]);

  useEffect(() => {
    if (initialWorkflowLevels !== undefined && initialWorkflowLevels.length > 0) {
      setLevels(initialWorkflowLevels);
    }
  }, [initialWorkflowLevels]);

  const loadData = async (force: boolean = false): Promise<void> => {
    try {
      if (!force && initialProposals !== undefined && initialWorkflowLevels !== undefined) {
        setIsLoading(false);
        return;
      }
      // Zero flicker: Only show skeleton loader if there is genuinely no data yet
      if (proposals.length === 0 && (!initialProposals || initialProposals.length === 0)) {
        setIsLoading(true);
      }
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

  const handleSilentRefresh = async (): Promise<void> => {
    if (isDecisionModalOpen || openingProposalId || isBulkProcessing) return;
    try {
      if (onRefreshProposals) {
        await onRefreshProposals();
      } else {
        await loadData(true);
      }
    } catch (e) {
      console.error("Error refreshing pending approvals queue:", e);
    }
  };

  // Window Focus & Tab Visibility Auto-Revalidation (SWR Pattern)
  useEffect(() => {
    let lastCheck = Date.now();
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible" && !isDecisionModalOpen && !openingProposalId && !isBulkProcessing) {
        const now = Date.now();
        if (now - lastCheck > 25000) {
          lastCheck = now;
          handleSilentRefresh().catch((err) => console.error(err));
        }
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("focus", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("focus", handleVisibilityChange);
    };
  }, [isDecisionModalOpen, openingProposalId, isBulkProcessing]);

  useEffect(() => {
    if (!initialProposals || initialProposals.length === 0 || !initialWorkflowLevels || initialWorkflowLevels.length === 0) {
      loadData().catch((e) => console.error(e));
    }
  }, [currentUser]);

  // Filter proposals awaiting action by current user:
  // Only proposals where the current user is the designated Project Owner (on PO stages)
  // or the explicitly assigned Approver for that specific level in their assigned SBU
  const pendingList = React.useMemo(() => {
    return proposals.filter((p) => {
      if (p.status !== "In Approval") return false;

      // SBU Alignment (supports multi-SBU assignments):
      // If current user is assigned to specific SBUs (not 'All'), they can ONLY see:
      // 1. Proposals belonging to their assigned SBU(s), OR
      // 2. Proposals where they are the designated Project Owner (on dynamic PO stage)
      const userSbus = (currentUser.sbus && currentUser.sbus.length > 0 ? currentUser.sbus : [currentUser.sbu || "All"])
        .map((s) => (s || "").trim().toLowerCase());
      const propSbu = (p.sbu || "").trim().toLowerCase();
      const isAllSbu = userSbus.length === 0 || userSbus.indexOf("all") !== -1 || userSbus.indexOf("") !== -1;
      const isSbuMatch = isAllSbu || userSbus.indexOf(propSbu) !== -1;
      const isProjectOwner = PermissionService.isProjectOwner(p, currentUser);

      if (!isSbuMatch && !isProjectOwner) {
        return false;
      }

      // SBU-specific stage lookup with fallback to "All" (Strictly no cross-SBU leakage)
      const stageConfig =
        levels.find(
          (l) =>
            (l.sbu || "").trim().toLowerCase() === propSbu &&
            l.level_id === p.current_level
        ) ||
        levels.find(
          (l) =>
            (l.sbu || "").trim().toLowerCase() === "all" &&
            l.level_id === p.current_level
        );

      return PermissionService.canApproveCER(p, currentUser, stageConfig).allowed;
    }).filter((p) => {
      // Search query across ID, Number, Project Name, Owner, SBU
      if (!searchTerm.trim()) return true;
      const q = searchTerm.toLowerCase();
      const idMatch = (p.cer_proposal_id || "").toLowerCase().includes(q);
      const noMatch = (p.proposal_no || "").toLowerCase().includes(q);
      const cerMatch = (p.cerprno || "").toLowerCase().includes(q);
      const nameMatch = (p.pr_name || "").toLowerCase().includes(q);
      const ownerMatch = (p.owname || "").toLowerCase().includes(q);
      const sbuMatch = (p.sbu || "").toLowerCase().includes(q);
      return idMatch || noMatch || cerMatch || nameMatch || ownerMatch || sbuMatch;
    });
  }, [proposals, levels, currentUser, searchTerm]);

  // Column Sorting Logic
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // Default descending for financial metrics
    }
  };

  const sortedPendingList = React.useMemo(() => {
    const list = [...pendingList];
    list.sort((a, b) => {
      let valA: any;
      let valB: any;

      switch (sortField) {
        case "cer_proposal_id":
          valA = a.cer_proposal_id || a.cerprno || "";
          valB = b.cer_proposal_id || b.cerprno || "";
          break;
        case "pr_name":
          valA = a.pr_name || "";
          valB = b.pr_name || "";
          break;
        case "cat":
          valA = a.cat || "";
          valB = b.cat || "";
          break;
        case "current_level":
          valA = a.current_level ?? 0;
          valB = b.current_level ?? 0;
          break;
        case "payable":
          valA = a.payable || "";
          valB = b.payable || "";
          break;
        case "ben_npv":
          valA = a.ben_npv ?? 0;
          valB = b.ben_npv ?? 0;
          break;
        case "cb_amnt":
          valA = a.cb_amnt ?? 0;
          valB = b.cb_amnt ?? 0;
          break;
        case "amount":
        default:
          valA = a.amount ?? 0;
          valB = b.amount ?? 0;
          break;
      }

      if (valA === valB) return 0;
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;

      if (typeof valA === "number" && typeof valB === "number") {
        return sortAsc ? valA - valB : valB - valA;
      }
      return sortAsc
        ? String(valA).localeCompare(String(valB))
        : String(valB).localeCompare(String(valA));
    });
    return list;
  }, [pendingList, sortField, sortAsc]);

  // Bulk Selection Calculations
  const selectedProposalsList = React.useMemo(() => {
    return sortedPendingList.filter((p) => selectedProposalIds.has(p.cerprno));
  }, [sortedPendingList, selectedProposalIds]);

  const totalPendingAmount = React.useMemo(() => {
    return pendingList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [pendingList]);

  const selectedPendingAmount = React.useMemo(() => {
    return selectedProposalsList.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [selectedProposalsList]);

  const allVisibleSelected =
    sortedPendingList.length > 0 &&
    sortedPendingList.every((p) => selectedProposalIds.has(p.cerprno));

  const handleToggleSelectOne = (cerprno: string) => {
    setSelectedProposalIds((prev) => {
      const next = new Set(prev);
      if (next.has(cerprno)) {
        next.delete(cerprno);
      } else {
        next.add(cerprno);
      }
      return next;
    });
  };

  const handleToggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedProposalIds(new Set());
    } else {
      const allIds = new Set(sortedPendingList.map((p) => p.cerprno));
      setSelectedProposalIds(allIds);
    }
  };

  // Bulk Approval Execution (Sequential loop with full safeguard compliance)
  const handleConfirmBulkApprove = async (bulkComments: string) => {
    if (selectedProposalsList.length === 0) return;
    setIsBulkProcessing(true);
    const totalToApprove = selectedProposalsList.length;
    let approvedCount = 0;
    const errors: string[] = [];

    try {
      for (let i = 0; i < selectedProposalsList.length; i++) {
        const prop = selectedProposalsList[i];
        setBulkProgressText(
          `Approving proposal ${i + 1} of ${totalToApprove} (${prop.cer_proposal_id || prop.cerprno})...`
        );
        try {
          await dataService.recordDecision({
            cerprno: prop.cerprno,
            level_id: prop.current_level,
            approver_name: currentUser.name,
            approver_email: currentUser.email,
            decision: "APPROVED",
            comments: bulkComments,
          });
          approvedCount++;
        } catch (err: any) {
          console.error(`[PendingApprovalsView] Failed to bulk approve ${prop.cerprno}:`, err);
          errors.push(`${prop.cer_proposal_id || prop.cerprno}: ${err?.message || "Approval failed"}`);
        }
      }

      if (errors.length === 0) {
        setFeedbackNotice(
          `Successfully approved all ${approvedCount} proposal${approvedCount === 1 ? "" : "s"}. Advanced to respective next approval levels.`
        );
      } else {
        setFeedbackNotice(
          `Approved ${approvedCount} of ${totalToApprove} proposals. ${errors.length} proposal(s) encountered an issue.`
        );
      }

      setSelectedProposalIds(new Set());
      setIsBulkModalOpen(false);
      await onRefreshProposals();
      await loadData(true);
    } finally {
      setIsBulkProcessing(false);
      setBulkProgressText("");
    }
  };

  const handleOpenDecision = async (prop: ICERProposal) => {
    const requestId = prop.cerprno;
    activeRequestIdRef.current = requestId;

    try {
      setOpeningProposalId(prop.cerprno);
      setSelectedProposal(prop);

      const targetSbu = prop.sbu ? prop.sbu.trim() : "";

      // Safeguard: Parallelize independent pre-flight reads (Workflow levels & Attachments)
      const [freshLevels, atts] = await Promise.all([
        targetSbu && dataService.getWorkflowLevels
          ? dataService.getWorkflowLevels(targetSbu, false).catch((levelErr) => {
              console.warn("[PendingApprovalsView] Failed to refresh SBU-specific workflow levels:", levelErr);
              return null;
            })
          : Promise.resolve(null),
        dataService.getAttachments(prop.cerprno, { proposal: prop, forceRefresh: false }).catch((attErr) => {
          console.warn("[PendingApprovalsView] Failed to load attachments:", attErr);
          return [];
        }),
      ]);

      // Safeguard 6: Stale response protection (if user clicked or switched proposals while loading, discard!)
      if (activeRequestIdRef.current !== requestId) {
        return;
      }

      if (freshLevels && freshLevels.length > 0) {
        setLevels((prev) => {
          const others = prev.filter(
            (l) => (l.sbu || "").trim().toLowerCase() !== targetSbu.toLowerCase()
          );
          return [...others, ...freshLevels];
        });
      }

      setSelectedAttachments(atts || []);
      setIsDecisionModalOpen(true);
    } catch (err) {
      if (activeRequestIdRef.current === requestId) {
        console.error("Error opening approval decision:", err);
      }
    } finally {
      if (activeRequestIdRef.current === requestId) {
        setOpeningProposalId(null);
      }
    }
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
        : decision === "SENT_BACK" || (decision as any) === "SEND_BACK"
        ? `Proposal ${selectedProposal.cerprno} SENT BACK to Initiator for revision.`
        : `Proposal ${selectedProposal.cerprno} REJECTED.`
    );

    await onRefreshProposals();
    await loadData(true);
  };

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Header & Controls */}
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
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Pending Approvals
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Review and act on capital expenditure requests awaiting your approval
            </p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
          {/* Search proposals */}
          <div className="relative w-full sm:w-56 md:w-60">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search queue..."
              className="w-full h-10 pl-9 pr-3.5 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964] transition-all"
            />
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 w-full sm:w-auto">
            {/* CER Amount Total */}
            <div className="flex-1 sm:flex-initial flex items-center gap-2 h-10 px-3.5 bg-slate-50 border border-slate-200/90 rounded-xl shadow-2xs whitespace-nowrap">
              <span className="text-xs text-slate-500 font-medium">Total CER:</span>
              <span className="font-mono font-extrabold text-xs sm:text-sm text-slate-900">
                USD {totalPendingAmount.toLocaleString()}
              </span>
              {selectedProposalIds.size > 0 && (
                <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  {selectedProposalIds.size} sel (USD {selectedPendingAmount.toLocaleString()})
                </span>
              )}
            </div>

            {/* Bulk Approve Button: Disabled/grey when 0 selected, clickable light green when >= 1 selected */}
            <button
              type="button"
              onClick={() => setIsBulkModalOpen(true)}
              disabled={selectedProposalIds.size === 0}
              className={`flex-1 sm:flex-initial flex items-center justify-center gap-1.5 h-10 px-4 rounded-xl text-xs sm:text-sm font-bold transition-all shadow-2xs select-none ${
                selectedProposalIds.size > 0
                  ? "bg-emerald-500 hover:bg-emerald-600 active:bg-emerald-700 text-white shadow-emerald-500/20 cursor-pointer hover:scale-[1.02]"
                  : "bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-90"
              }`}
              title={
                selectedProposalIds.size > 0
                  ? `Click to bulk approve ${selectedProposalIds.size} selected proposal${selectedProposalIds.size === 1 ? "" : "s"}`
                  : "Select one or more proposals via checkbox to enable bulk approval"
              }
            >
              <CheckSquare className="w-4 h-4" />
              <span>Bulk Approve {selectedProposalIds.size > 0 ? `(${selectedProposalIds.size})` : ""}</span>
            </button>
          </div>
        </div>
      </div>

      {feedbackNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center justify-between animate-fade-in shadow-2xs">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span className="font-semibold">{feedbackNotice}</span>
          </div>
          <button
            onClick={() => setFeedbackNotice(null)}
            className="text-sm font-bold text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Modern Enterprise Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden flex flex-col">
        <div className="overflow-x-auto max-h-[calc(100vh-230px)] min-h-[300px] overflow-y-auto">
          <table className="w-full text-left border-collapse min-w-[980px]">
            {/* Sticky Header */}
            <thead className="bg-slate-50 border-b border-slate-200 text-[11px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wider sticky top-0 z-10 shadow-2xs">
              <tr>
                {/* 1. Proposal ID */}
                <th
                  onClick={() => handleSort("cer_proposal_id")}
                  className="py-3 px-3.5 sm:px-4 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Proposal ID</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* 2. Project Name */}
                <th
                  onClick={() => handleSort("pr_name")}
                  className="py-3 px-3.5 sm:px-4 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Project Name</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* 3. Category */}
                <th
                  onClick={() => handleSort("cat")}
                  className="py-3 px-3.5 sm:px-4 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Category</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* 4. Approval Level (e.g. L1, L2) */}
                <th
                  onClick={() => handleSort("current_level")}
                  className="py-3 px-3.5 sm:px-4 text-center cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Approval Level</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* 5. Payback */}
                <th
                  onClick={() => handleSort("payable")}
                  className="py-3 px-3.5 sm:px-4 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Payback</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* 6. NPV / IRR */}
                <th
                  onClick={() => handleSort("ben_npv")}
                  className="py-3 px-3.5 sm:px-4 cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>NPV / IRR</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* 7. Corporate Budget Amount */}
                <th
                  onClick={() => handleSort("cb_amnt")}
                  className="py-3 px-3.5 sm:px-4 text-right cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Corporate Budget</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* 8. CER Amount */}
                <th
                  onClick={() => handleSort("amount")}
                  className="py-3 px-3.5 sm:px-4 text-right cursor-pointer hover:bg-slate-100/80 transition-colors select-none"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>CER Amount</span>
                    <ArrowUpDown className="w-3 h-3 text-slate-400" />
                  </div>
                </th>

                {/* 9. Checkbox Option for Bulk Approval */}
                <th className="py-3 px-3 text-center w-12 select-none">
                  <div className="flex items-center justify-center">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={handleToggleSelectAll}
                      title={allVisibleSelected ? "Deselect all proposals" : "Select all proposals for bulk approval"}
                      aria-label="Select all proposals"
                      className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </div>
                </th>

                {/* 10. Action */}
                <th className="py-3 px-3.5 sm:px-4 text-right select-none">
                  <span>Action</span>
                </th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-100 text-xs sm:text-sm font-medium text-slate-700">
              {isLoading && proposals.length === 0 ? (
                // Compact Skeleton Rows
                <>
                  {[1, 2, 3, 4].map((idx) => (
                    <tr key={idx} className="animate-pulse">
                      <td className="py-3.5 px-3.5 sm:px-4">
                        <div className="h-4 bg-slate-200 rounded w-24" />
                      </td>
                      <td className="py-3.5 px-3.5 sm:px-4">
                        <div className="h-4 bg-slate-200 rounded w-40 mb-1.5" />
                        <div className="h-3 bg-slate-100 rounded w-24" />
                      </td>
                      <td className="py-3.5 px-3.5 sm:px-4">
                        <div className="h-5 bg-slate-200 rounded w-16" />
                      </td>
                      <td className="py-3.5 px-3.5 sm:px-4 text-center">
                        <div className="h-5 bg-slate-200 rounded w-10 mx-auto" />
                      </td>
                      <td className="py-3.5 px-3.5 sm:px-4">
                        <div className="h-4 bg-slate-200 rounded w-18" />
                      </td>
                      <td className="py-3.5 px-3.5 sm:px-4">
                        <div className="h-4 bg-slate-200 rounded w-18" />
                      </td>
                      <td className="py-3.5 px-3.5 sm:px-4 text-right">
                        <div className="h-4 bg-slate-200 rounded w-20 ml-auto" />
                      </td>
                      <td className="py-3.5 px-3.5 sm:px-4 text-right">
                        <div className="h-4 bg-slate-200 rounded w-22 ml-auto" />
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <div className="h-4 bg-slate-200 rounded w-4 mx-auto" />
                      </td>
                      <td className="py-3.5 px-3.5 sm:px-4 text-right">
                        <div className="h-8 bg-slate-200 rounded w-24 ml-auto" />
                      </td>
                    </tr>
                  ))}
                </>
              ) : sortedPendingList.length === 0 ? (
                // Empty State
                <tr>
                  <td colSpan={10} className="py-14 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <CheckCircle2 className="w-10 h-10 text-emerald-500 opacity-80" />
                      <h3 className="font-bold text-slate-800 text-base">No Pending Approvals</h3>
                      <p className="text-xs sm:text-sm text-slate-500 max-w-sm">
                        {searchTerm
                          ? "No matching tasks found for your search."
                          : "You have reviewed all pending proposals. No tasks currently awaiting your action."}
                      </p>
                      {searchTerm && (
                        <button
                          onClick={() => setSearchTerm("")}
                          className="mt-2 text-xs font-bold text-[#012964] hover:underline cursor-pointer"
                        >
                          Clear search
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                // Rendered Rows
                sortedPendingList.map((prop) => {
                  const currentLevelCfg = levels.find((l) => l.level_id === prop.current_level);
                  const isSelected = selectedProposalIds.has(prop.cerprno);

                  return (
                    <tr
                      key={prop.id || prop.cerprno}
                      data-role="list-item"
                      className={`hover:bg-slate-50/80 transition-colors group ${
                        isSelected ? "bg-emerald-50/40" : ""
                      }`}
                    >
                      {/* 1. Proposal ID */}
                      <td className="py-3 px-3.5 sm:px-4 whitespace-nowrap">
                        <div className="flex flex-col">
                          <span
                            className="font-mono font-bold text-xs sm:text-[13px] text-slate-900 group-hover:text-[#012964] transition-colors"
                            title="CER Permanent Identifier"
                          >
                            {prop.cer_proposal_id || prop.cerprno}
                          </span>
                          {prop.proposal_no && prop.proposal_no !== (prop.cer_proposal_id || prop.cerprno) && (
                            <span
                              className="text-[11px] text-slate-400 font-mono"
                              title="Initiator Alphanumeric Reference"
                            >
                              {prop.proposal_no}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 2. Project Name */}
                      <td className="py-3 px-3.5 sm:px-4 min-w-[180px] max-w-[260px] lg:max-w-[300px]">
                        <div
                          className="font-semibold text-slate-900 text-xs sm:text-sm truncate leading-snug cursor-default"
                          title={prop.pr_name}
                        >
                          {prop.pr_name}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate flex items-center gap-1.5 mt-0.5">
                          <span title={`Owner: ${prop.owname}`}>{prop.owname}</span>
                          <span>•</span>
                          <span className="font-medium text-slate-600">{prop.sbu}</span>
                        </div>
                      </td>

                      {/* 3. Category */}
                      <td className="py-3 px-3.5 sm:px-4 whitespace-nowrap">
                        <CategoryBadge category={prop.cat} />
                      </td>

                      {/* 4. Approval Level (e.g. L1, L2) */}
                      <td className="py-3 px-3.5 sm:px-4 whitespace-nowrap text-center">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-[#012964]/10 text-[#012964] border border-[#012964]/20"
                          title={currentLevelCfg?.level_name || prop.pending_with_role || `Level ${prop.current_level}`}
                        >
                          L{prop.current_level}
                        </span>
                      </td>

                      {/* 5. Payback */}
                      <td className="py-3 px-3.5 sm:px-4 whitespace-nowrap text-xs font-medium text-slate-700">
                        {prop.payable === "Non Payback" || prop.payable === "Non-Payback" ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            Non Payback
                          </span>
                        ) : prop.payback_quarters && Number(prop.payback_quarters) > 0 ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            {prop.payback_quarters} Quarters
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            Payback
                          </span>
                        )}
                      </td>

                      {/* 6. NPV / IRR */}
                      <td className="py-3 px-3.5 sm:px-4 whitespace-nowrap">
                        <div className="flex flex-col text-xs leading-tight">
                          <span className="font-semibold text-slate-800">
                            {prop.ben_npv !== undefined && prop.ben_npv !== null && Number(prop.ben_npv) !== 0
                              ? `$${Number(prop.ben_npv).toLocaleString()} mm`
                              : "—"}
                          </span>
                          <span className="text-[11px] text-slate-500 font-medium">
                            {prop.ben_irr !== undefined && prop.ben_irr !== null && Number(prop.ben_irr) !== 0
                              ? `${prop.ben_irr}% IRR`
                              : "—"}
                          </span>
                        </div>
                      </td>

                      {/* 7. Corporate Budget Amount */}
                      <td className="py-3 px-3.5 sm:px-4 text-right whitespace-nowrap">
                        <div className="font-semibold text-slate-800 text-xs sm:text-sm font-mono">
                          {prop.cb_amnt !== undefined && prop.cb_amnt !== null && Number(prop.cb_amnt) > 0
                            ? `$${Number(prop.cb_amnt).toLocaleString()} mm`
                            : "—"}
                        </div>
                      </td>

                      {/* 8. CER Amount */}
                      <td className="py-3 px-3.5 sm:px-4 text-right whitespace-nowrap">
                        <div className="font-extrabold text-slate-900 font-mono text-xs sm:text-sm">
                          {prop.currency || "USD"} {Number(prop.amount || 0).toLocaleString()}
                        </div>
                      </td>

                      {/* 9. Checkbox Option for Bulk Approval */}
                      <td className="py-3 px-3 text-center whitespace-nowrap w-12">
                        <div className="flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelectOne(prop.cerprno)}
                            title={`Select ${prop.cer_proposal_id || prop.cerprno} for bulk approval`}
                            aria-label={`Select ${prop.cer_proposal_id || prop.cerprno}`}
                            className="w-4 h-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                          />
                        </div>
                      </td>

                      {/* 10. Action */}
                      <td className="py-3 px-3.5 sm:px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {/* Details: Secondary eye-icon button */}
                          <button
                            type="button"
                            onClick={() => onNavigateToDisplay(prop.cerprno)}
                            className="inline-flex items-center justify-center p-2 text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 rounded-lg shadow-2xs transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#012964]/20"
                            title="View Proposal Details (Read-only)"
                            aria-label={`View details for ${prop.cer_proposal_id || prop.cerprno}`}
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                          </button>

                          {/* Review: Prominent primary button */}
                          <button
                            type="button"
                            onClick={() => handleOpenDecision(prop)}
                            disabled={openingProposalId === prop.cerprno}
                            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-[#012964] hover:bg-[#001f4d] active:bg-[#001737] rounded-lg shadow-xs shadow-[#012964]/20 hover:shadow-md transition-all cursor-pointer disabled:opacity-75 disabled:pointer-events-none whitespace-nowrap"
                            title="Review and Record Decision"
                          >
                            {openingProposalId === prop.cerprno ? (
                              <RotateCw className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <CheckSquare className="w-3.5 h-3.5" />
                            )}
                            <span>{openingProposalId === prop.cerprno ? "Opening..." : "Review"}</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>


      </div>

      {/* Individual Decision Modal */}
      {selectedProposal && isDecisionModalOpen && (
        <ApprovalDecisionModal
          key={`${selectedProposal.cerprno}-${selectedProposal.current_level}-${isDecisionModalOpen}`}
          proposal={selectedProposal}
          currentLevelConfig={
            levels.find(
              (l) =>
                (l.sbu || "").trim().toLowerCase() === (selectedProposal.sbu || "").trim().toLowerCase() &&
                l.level_id === selectedProposal.current_level
            ) ||
            levels.find(
              (l) =>
                (l.sbu || "").trim().toLowerCase() === "all" &&
                l.level_id === selectedProposal.current_level
            ) ||
            levels.find((l) => l.level_id === selectedProposal.current_level)
          }
          attachments={selectedAttachments}
          currentUser={currentUser}
          isOpen={isDecisionModalOpen}
          onClose={() => {
            setIsDecisionModalOpen(false);
            setSelectedProposal(null);
          }}
          onSubmitDecision={handleSubmitDecision}
        />
      )}

      {/* Bulk Approval Modal */}
      {isBulkModalOpen && (
        <BulkApprovalModal
          isOpen={isBulkModalOpen}
          onClose={() => {
            if (!isBulkProcessing) {
              setIsBulkModalOpen(false);
            }
          }}
          selectedProposals={selectedProposalsList}
          onConfirmBulkApprove={handleConfirmBulkApprove}
          isProcessing={isBulkProcessing}
          progressText={bulkProgressText}
        />
      )}
    </div>
  );
};
