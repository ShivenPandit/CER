import React, { useState, useEffect, useMemo } from "react";
import {
  History,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  FileText,
  Layers,
  ShieldCheck,
  Check,
  MessageSquare,
} from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { IWorkflowLevel, IApprovalDecision } from "../../models/WorkflowModel";
import { ICERDataService } from "../../services/ICERDataService";
import { StatusBadge } from "../Shared/StatusBadge";
import { CategoryBadge } from "../Shared/CategoryBadge";

export interface IStatusHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  proposal: ICERProposal;
  levels?: IWorkflowLevel[];
  decisions?: IApprovalDecision[];
  dataService: ICERDataService;
  historyProposals?: ICERProposal[];
}

export interface IFixedApprovalStage {
  level: number;
  levelBadge: string;
  name: string;
}

export const FIXED_APPROVAL_STAGES: readonly IFixedApprovalStage[] = [
  { level: 1, levelBadge: "L1", name: "Finance" },
  { level: 2, levelBadge: "L2", name: "Project Owner" },
  { level: 3, levelBadge: "L3", name: "BU CFO" },
  { level: 4, levelBadge: "L4", name: "BU Director" },
  { level: 5, levelBadge: "L5", name: "VOGL CFO" },
  { level: 6, levelBadge: "L6", name: "VOGL CEO" },
] as const;

export interface IProposalVersionEntry {
  id: string;
  serialNo: number;
  versionLabel: string;
  isCurrent: boolean;
  proposalNo: string;
  status: string;
  amount: number;
  currency: string;
  dateStr: string;
  rawProposal: ICERProposal;
}

export function formatDecisionDateTime(timestamp?: string | Date): string {
  if (!timestamp) return "—";
  let d: Date;
  if (timestamp instanceof Date) {
    d = timestamp;
  } else {
    let str = String(timestamp).trim();
    if (!str) return "—";
    if (str.includes("T") && !str.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(str)) {
      str = str + "Z";
    }
    d = new Date(str);
  }
  if (isNaN(d.getTime())) return String(timestamp);
  return (
    d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }) +
    ", " +
    d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })
  );
}

export function formatVersionDate(timestamp?: string | Date): string {
  if (!timestamp) return "—";
  let d: Date;
  if (timestamp instanceof Date) {
    d = timestamp;
  } else {
    let str = String(timestamp).trim();
    if (!str) return "—";
    if (str.includes("T") && !str.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(str)) {
      str = str + "Z";
    }
    d = new Date(str);
  }
  if (isNaN(d.getTime())) return String(timestamp);
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export const StatusHistoryModal: React.FC<IStatusHistoryModalProps> = ({
  isOpen,
  onClose,
  proposal,
  decisions: initialDecisions,
  dataService,
  historyProposals: propHistoryProposals,
}) => {
  const [historyList, setHistoryList] = useState<ICERProposal[]>(propHistoryProposals || []);
  const [selectedVersionId, setSelectedVersionId] = useState<string>("CURRENT");
  const [versionDecisionsMap, setVersionDecisionsMap] = useState<Record<string, IApprovalDecision[]>>({});
  const [isLoadingDecisions, setIsLoadingDecisions] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);

  const permanentCerId = proposal?.cer_proposal_id || proposal?.cerprno || "—";

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Load historical proposal snapshots if not supplied via props
  useEffect(() => {
    if (!isOpen || !proposal) return;
    if (propHistoryProposals && propHistoryProposals.length > 0) {
      setHistoryList(propHistoryProposals);
      return;
    }

    let isMounted = true;
    const fetchHistory = async () => {
      setIsLoadingHistory(true);
      try {
        const hist = await dataService.getProposalHistory(permanentCerId);
        if (isMounted) {
          setHistoryList(hist || []);
        }
      } catch (err) {
        console.warn("[StatusHistoryModal] Error fetching proposal history:", err);
      } finally {
        if (isMounted) setIsLoadingHistory(false);
      }
    };

    fetchHistory().catch((e) => console.error(e));

    return () => {
      isMounted = false;
    };
  }, [isOpen, proposal, permanentCerId, propHistoryProposals, dataService]);

  // Initialize decisions for current proposal if passed in initialDecisions
  useEffect(() => {
    if (initialDecisions && initialDecisions.length > 0) {
      setVersionDecisionsMap((prev) => ({
        ...prev,
        CURRENT: initialDecisions,
      }));
    }
  }, [initialDecisions]);

  // Build sorted version entries (Current + Historical Snapshots, newest first)
  const versionEntries: IProposalVersionEntry[] = useMemo(() => {
    if (!proposal) return [];

    const sortedHist = [...historyList].sort((a, b) => {
      const dateA = new Date(a.modified_date || a.created_date || 0).getTime();
      const dateB = new Date(b.modified_date || b.created_date || 0).getTime();
      return dateB - dateA;
    });

    const totalVersions = sortedHist.length + 1;
    const entries: IProposalVersionEntry[] = [];

    // Current version at top (Serial No. = totalVersions)
    entries.push({
      id: "CURRENT",
      serialNo: totalVersions,
      versionLabel: `v${totalVersions} Active`,
      isCurrent: true,
      proposalNo: proposal.proposal_no || proposal.cerprno,
      status: proposal.status,
      amount: proposal.amount || 0,
      currency: proposal.currency || "USD",
      dateStr: formatVersionDate(proposal.modified_date || proposal.created_date),
      rawProposal: proposal,
    });

    // Historical versions
    sortedHist.forEach((hp, idx) => {
      const serialNo = totalVersions - 1 - idx;
      const vId = `HIST_${hp.id || hp.proposal_no || hp.cerprno || idx}`;
      entries.push({
        id: vId,
        serialNo,
        versionLabel: `v${serialNo} Snapshot`,
        isCurrent: false,
        proposalNo: hp.proposal_no || hp.cerprno,
        status: hp.status || "Approved",
        amount: hp.amount || 0,
        currency: hp.currency || "USD",
        dateStr: formatVersionDate(hp.modified_date || hp.created_date),
        rawProposal: hp,
      });
    });

    return entries;
  }, [proposal, historyList]);

  // Active selected version entry
  const selectedVersion = useMemo(() => {
    return versionEntries.find((v) => v.id === selectedVersionId) || versionEntries[0];
  }, [versionEntries, selectedVersionId]);

  // Fetch approval decisions for the selected version if not already cached
  useEffect(() => {
    if (!isOpen || !selectedVersion) return;
    const vId = selectedVersion.id;

    if (versionDecisionsMap[vId]) {
      return;
    }

    let isMounted = true;
    const fetchDecisions = async () => {
      setIsLoadingDecisions(true);
      try {
        const targetProposal = selectedVersion.rawProposal;
        const queryKey = selectedVersion.isCurrent
          ? targetProposal.cerprno
          : targetProposal.proposal_no || targetProposal.cerprno;

        let decs = await dataService.getApprovalDecisions(queryKey, true);

        // If query by cerprno returned empty for current, also check proposal_no
        if ((!decs || decs.length === 0) && targetProposal.proposal_no && targetProposal.proposal_no !== targetProposal.cerprno) {
          decs = await dataService.getApprovalDecisions(targetProposal.proposal_no, true);
        }

        if (isMounted) {
          setVersionDecisionsMap((prev) => ({
            ...prev,
            [vId]: decs || [],
          }));
        }
      } catch (err) {
        console.warn(`[StatusHistoryModal] Failed to load decisions for version ${vId}:`, err);
        if (isMounted) {
          setVersionDecisionsMap((prev) => ({ ...prev, [vId]: [] }));
        }
      } finally {
        if (isMounted) setIsLoadingDecisions(false);
      }
    };

    fetchDecisions().catch((e) => console.error(e));

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedVersion, dataService, versionDecisionsMap]);

  if (!isOpen || !proposal) return null;

  const currentDecisions = (selectedVersion && versionDecisionsMap[selectedVersion.id]) || [];

  // Table rows computation for exactly 6 fixed workflow levels
  const tableRows = FIXED_APPROVAL_STAGES.map((stage) => {
    const matchingDecs = currentDecisions
      .filter((d) => d.level_id === stage.level || (d as any).levelId === stage.level)
      .sort((a, b) => {
        const tA = new Date((a as any).decision_date || (a as any).decidedAt || a.timestamp || (a as any).Created || 0).getTime();
        const tB = new Date((b as any).decision_date || (b as any).decidedAt || b.timestamp || (b as any).Created || 0).getTime();
        return tB - tA;
      });

    const latestDec = matchingDecs[0];

    let statusText: "Approved" | "Send Back" | "Rejected" | "Pending" | "Not Started" = "Not Started";
    let updatedBy = "—";
    let dateTime = "—";
    let remarks = "";

    if (latestDec) {
      const decUpper = (latestDec.decision || "").trim().toUpperCase();
      if (decUpper === "APPROVED") {
        statusText = "Approved";
      } else if (decUpper === "SENT_BACK" || decUpper === "SENT BACK") {
        statusText = "Send Back";
      } else if (decUpper === "REJECTED") {
        statusText = "Rejected";
      }

      updatedBy = latestDec.approver_name || latestDec.approver_email || "—";
      dateTime = formatDecisionDateTime(
        (latestDec as any).decision_date ||
        (latestDec as any).decidedAt ||
        latestDec.timestamp ||
        (latestDec as any).Created
      );
      remarks = latestDec.comments || (latestDec as any).remarks || "";
    } else {
      // Determine pending vs not started if no decision recorded
      if (selectedVersion.isCurrent) {
        const propStatus = selectedVersion.status;
        const currentLvl = selectedVersion.rawProposal.current_level || 1;

        if (propStatus === "In Approval") {
          if (stage.level === currentLvl) {
            statusText = "Pending";
          } else if (stage.level > currentLvl) {
            statusText = "Not Started";
          } else {
            statusText = "Not Started";
          }
        } else if (propStatus === "Revised") {
          if (stage.level === currentLvl) {
            statusText = "Pending";
          } else {
            statusText = "Not Started";
          }
        } else {
          statusText = "Not Started";
        }
      } else {
        // Historical snapshots are completed prior approved proposals
        statusText = "Not Started";
      }
    }

    return {
      stage,
      statusText,
      updatedBy,
      dateTime,
      remarks,
    };
  });

  // Summary Metrics calculations
  const totalLevels = 6;
  const approvedLevelsCount = tableRows.filter((r) => r.statusText === "Approved").length;

  let currentPendingStageText = "All Approved";
  if (selectedVersion.isCurrent) {
    const status = selectedVersion.status;
    if (status === "In Approval") {
      const currLvl = selectedVersion.rawProposal.current_level || 1;
      const stageName = FIXED_APPROVAL_STAGES.find((s) => s.level === currLvl)?.name || "Approver";
      currentPendingStageText = `L${currLvl} - ${stageName}`;
    } else if (status === "Revised") {
      currentPendingStageText = "Initiator (Rework)";
    } else if (status === "Draft") {
      currentPendingStageText = "Initiator (Draft)";
    } else if (status === "Rejected") {
      currentPendingStageText = "Rejected";
    } else if (status === "Approved") {
      currentPendingStageText = "All Approved";
    }
  }

  const sanctionAmountFormatted = `${selectedVersion.currency} ${selectedVersion.amount.toLocaleString()}`;

  return (
    <div className="cer-display-scope fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/60 backdrop-blur-xs animate-fade-in">
      <div className="relative w-full max-w-6xl 2xl:max-w-7xl bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] min-h-[580px]">
        {/* Top Header - White Background matching Proposal History */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-[#012964]/10 border border-[#012964]/20 text-[#012964] shrink-0">
              <History className="w-5 h-5 text-[#012964]" />
            </div>
            <div className="min-w-0 flex items-center flex-wrap gap-2.5">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight truncate">
                Status & Approval History ({permanentCerId})
              </h2>
              {proposal.pr_name && (
                <span className="text-sm font-semibold text-slate-600 truncate max-w-xs md:max-w-md hidden sm:inline">
                  — {proposal.pr_name}
                </span>
              )}
              {proposal.cat && <CategoryBadge category={proposal.cat} />}
              <StatusBadge status={proposal.status} size="sm" />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Close modal"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Master-Detail Two-Panel Container */}
        <div className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden">
          {/* ========================================================================================= */}
          {/* LEFT PANEL (~30% width): Proposal Versions Selector */}
          {/* ========================================================================================= */}
          <div className="w-full md:w-[32%] lg:w-[30%] shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/70 flex flex-col overflow-hidden max-h-56 md:max-h-none">
            {/* Sidebar Title */}
            <div className="px-4 py-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#012964]" />
                <span className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                  Proposal Versions
                </span>
              </div>
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                {versionEntries.length} {versionEntries.length === 1 ? "Version" : "Versions"}
              </span>
            </div>

            {/* Version Cards Scrollable List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {isLoadingHistory && versionEntries.length <= 1 ? (
                <div className="py-8 text-center text-slate-400 text-xs space-y-2">
                  <div className="w-5 h-5 border-2 border-[#012964] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-medium">Loading versions...</p>
                </div>
              ) : null}

              {versionEntries.map((ver) => {
                const isSelected = selectedVersion.id === ver.id;

                return (
                  <div
                    key={ver.id}
                    onClick={() => setSelectedVersionId(ver.id)}
                    className={`p-3 rounded-xl transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-white border-2 border-[#012964] shadow-xs ring-1 ring-[#012964]/10"
                        : "bg-white/90 hover:bg-white border border-slate-200/90 hover:border-slate-300 shadow-2xs"
                    }`}
                  >
                    {/* Top Header: Serial No, Version tag & Status */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            isSelected
                              ? "bg-[#012964] text-white"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          Serial No. {ver.serialNo}
                        </span>
                        <span
                          className={`text-[10px] font-semibold px-1.5 py-0.5 rounded border ${
                            ver.isCurrent
                              ? "bg-blue-50 text-blue-700 border-blue-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {ver.isCurrent ? "Active Cycle" : "Archived"}
                        </span>
                      </div>
                      <StatusBadge status={ver.status} size="sm" />
                    </div>

                    {/* Proposal No Reference */}
                    <div className="flex items-center justify-between gap-2 mt-1">
                      <span className="font-mono font-bold text-sm text-[#012964]">
                        {ver.proposalNo}
                      </span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#012964] bg-[#012964]/10 px-1.5 py-0.5 rounded">
                          <Check className="w-3 h-3 text-[#012964]" />
                          Selected
                        </span>
                      )}
                    </div>

                    {/* Metadata: Amount & Date */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <span className="font-bold text-slate-900">
                        {ver.currency} {ver.amount.toLocaleString()}
                      </span>
                      <span className="text-[11px] text-slate-500">
                        {ver.dateStr}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* ========================================================================================= */}
          {/* RIGHT PANEL (~70% width): Summary Cards & 6-Level Approval History Table */}
          {/* ========================================================================================= */}
          <div className="flex-1 flex flex-col overflow-y-auto bg-white p-5 lg:p-6 space-y-5 min-w-0">
            {/* 4 Compact Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
              {/* Card 1: Total Approval Levels */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Total Approval Levels
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-extrabold text-slate-900 leading-none">
                    {totalLevels}
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Fixed Stages
                  </span>
                </div>
              </div>

              {/* Card 2: Approved Levels */}
              <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-emerald-700/80 tracking-wider">
                  Approved Levels
                </span>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <span className="text-xl font-extrabold text-emerald-700 leading-none">
                    {approvedLevelsCount}
                  </span>
                  <span className="text-[11px] font-semibold text-emerald-600/90">
                    of {totalLevels} Stages
                  </span>
                </div>
              </div>

              {/* Card 3: Current / Pending Level */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex flex-col justify-between min-w-0">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Current / Pending Level
                </span>
                <div className="mt-1">
                  <span className="text-sm font-bold text-[#012964] leading-tight block truncate" title={currentPendingStageText}>
                    {currentPendingStageText}
                  </span>
                </div>
              </div>

              {/* Card 4: Sanction Amount */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3 flex flex-col justify-between">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Sanction Amount
                </span>
                <div className="mt-1">
                  <span className="text-base lg:text-lg font-extrabold text-slate-900 leading-tight block truncate">
                    {sanctionAmountFormatted}
                  </span>
                </div>
              </div>
            </div>

            {/* Approval History Table Header Section */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col flex-1">
              <div className="px-4 py-3 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#012964]" />
                  <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    Workflow Stages & Approval History ({selectedVersion.proposalNo})
                  </h3>
                </div>
                {isLoadingDecisions && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <div className="w-3.5 h-3.5 border-2 border-[#012964] border-t-transparent rounded-full animate-spin" />
                    <span>Updating...</span>
                  </div>
                )}
              </div>

              {/* Table Container */}
              <div className="overflow-x-auto flex-1">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/70 border-b border-slate-200 text-slate-700 font-bold uppercase text-[11px] tracking-wider">
                      <th className="py-2.5 px-3.5 w-16">Level</th>
                      <th className="py-2.5 px-3.5 w-48">Level Name</th>
                      <th className="py-2.5 px-3.5 w-36">Status</th>
                      <th className="py-2.5 px-3.5">Status Updated By</th>
                      <th className="py-2.5 px-3.5 w-44">Date & Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {tableRows.map((row) => {
                      const { stage, statusText, updatedBy, dateTime, remarks } = row;

                      // Professional Status Badges
                      const renderStatusBadge = () => {
                        switch (statusText) {
                          case "Approved":
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                <span>Approved</span>
                              </span>
                            );
                          case "Send Back":
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
                                <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                <span>Send Back</span>
                              </span>
                            );
                          case "Rejected":
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
                                <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                <span>Rejected</span>
                              </span>
                            );
                          case "Pending":
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                                <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                                <span>Pending</span>
                              </span>
                            );
                          case "Not Started":
                          default:
                            return (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
                                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                                <span>Not Started</span>
                              </span>
                            );
                        }
                      };

                      return (
                        <tr
                          key={stage.level}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          {/* Column 1: Level */}
                          <td className="py-3 px-3.5 font-bold">
                            <span className="inline-block px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-[#012964]/10 text-[#012964] border border-[#012964]/20">
                              {stage.levelBadge}
                            </span>
                          </td>

                          {/* Column 2: Level Name */}
                          <td className="py-3 px-3.5">
                            <span className="font-semibold text-slate-900 text-xs">
                              {stage.name}
                            </span>
                          </td>

                          {/* Column 3: Status */}
                          <td className="py-3 px-3.5">
                            {renderStatusBadge()}
                          </td>

                          {/* Column 4: Status Updated By */}
                          <td className="py-3 px-3.5">
                            {updatedBy !== "—" ? (
                              <div>
                                <span className="font-semibold text-slate-800 text-xs">
                                  {updatedBy}
                                </span>
                                {remarks && (
                                  <div
                                    className="text-[11px] text-slate-500 italic mt-0.5 flex items-center gap-1 max-w-md truncate"
                                    title={remarks}
                                  >
                                    <MessageSquare className="w-3 h-3 text-slate-400 shrink-0" />
                                    <span className="truncate">"{remarks}"</span>
                                  </div>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-400 font-medium">—</span>
                            )}
                          </td>

                          {/* Column 5: Date & Time */}
                          <td className="py-3 px-3.5">
                            {dateTime !== "—" ? (
                              <span className="font-medium text-slate-700 text-xs whitespace-nowrap">
                                {dateTime}
                              </span>
                            ) : (
                              <span className="text-slate-400 font-medium">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between px-5 py-3 border-t border-slate-200 bg-slate-50/80 shrink-0">
          <p className="text-[11px] text-slate-500">
            Records stored permanently in SharePoint list{" "}
            <span className="font-mono font-medium text-slate-700">CERApprovalDecisions</span>
          </p>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-[#012964] hover:bg-[#001f4d] transition-colors shadow-2xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
