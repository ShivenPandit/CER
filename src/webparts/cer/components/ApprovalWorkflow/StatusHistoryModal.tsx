import React, { useState, useEffect, useMemo } from "react";
import {
  History,
  X,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  FileText,
  ShieldCheck,
  Check,
  MessageSquare,
  AlertTriangle,
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

export interface IIterationRun {
  iterationIndex: number;
  isLatestActive: boolean;
  isSentBack: boolean;
  sentBackLevel?: number;
  sentBackStageName?: string;
  sentBackBy?: string;
  sentBackDate?: string;
  sentBackRemarks?: string;
  decisions: IApprovalDecision[];
}

export interface ITableRowData {
  stage: IFixedApprovalStage;
  statusText: "Approved" | "Send Back" | "Rejected" | "Pending" | "Not Started";
  updatedBy: string;
  dateTime: string;
  remarks: string;
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

/**
 * Splits a version's sequential decisions into approval iteration runs.
 * When a level is sent back and the proposal is subsequently retriggered / resubmitted,
 * each run is isolated so that the active retriggered workflow appears on top and the prior sent-back run appears below.
 */
export function splitDecisionsIntoIterations(
  versionDecisions: IApprovalDecision[],
  isCurrentVersion: boolean,
  currentProposal: ICERProposal
): IIterationRun[] {
  if (!versionDecisions || versionDecisions.length === 0) {
    return [
      {
        iterationIndex: 1,
        isLatestActive: true,
        isSentBack: false,
        decisions: [],
      },
    ];
  }

  // Sort decisions chronologically ascending (oldest first)
  const sorted = [...versionDecisions].sort((a, b) => {
    const tA = new Date((a as any).decision_date || (a as any).decidedAt || a.timestamp || (a as any).Created || 0).getTime();
    const tB = new Date((b as any).decision_date || (b as any).decidedAt || b.timestamp || (b as any).Created || 0).getTime();
    return tA - tB;
  });

  const iterations: IIterationRun[] = [];
  let currentRunDecs: IApprovalDecision[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const dec = sorted[i];
    currentRunDecs.push(dec);

    const isSendBack =
      (dec.decision || "").trim().toUpperCase() === "SENT_BACK" ||
      (dec.decision || "").trim().toUpperCase() === "SENT BACK";

    if (isSendBack) {
      // Check if subsequent decisions exist in this list (e.g. L1 Approved after L2 Send Back)
      const hasSubsequentDecisions = i < sorted.length - 1;
      // Or if current proposal was retriggered and is actively 'In Approval'
      const isRetriggered = hasSubsequentDecisions || (isCurrentVersion && currentProposal.status === "In Approval");

      if (isRetriggered) {
        const stageName = FIXED_APPROVAL_STAGES.find((s) => s.level === dec.level_id)?.name || `Stage ${dec.level_id}`;
        iterations.push({
          iterationIndex: iterations.length + 1,
          isLatestActive: false,
          isSentBack: true,
          sentBackLevel: dec.level_id,
          sentBackStageName: stageName,
          sentBackBy: dec.approver_name || dec.approver_email || "—",
          sentBackDate: formatDecisionDateTime((dec as any).decision_date || (dec as any).decidedAt || dec.timestamp || (dec as any).Created),
          sentBackRemarks: dec.comments || (dec as any).remarks || "",
          decisions: [...currentRunDecs],
        });
        currentRunDecs = [];
      }
    }
  }

  // Final / active iteration
  const latestDec = currentRunDecs[currentRunDecs.length - 1];
  const isLatestSentBack =
    latestDec &&
    ((latestDec.decision || "").trim().toUpperCase() === "SENT_BACK" ||
      (latestDec.decision || "").trim().toUpperCase() === "SENT BACK");

  iterations.push({
    iterationIndex: iterations.length + 1,
    isLatestActive: true,
    isSentBack: !!isLatestSentBack,
    sentBackLevel: isLatestSentBack ? latestDec.level_id : undefined,
    sentBackStageName: isLatestSentBack
      ? FIXED_APPROVAL_STAGES.find((s) => s.level === latestDec.level_id)?.name
      : undefined,
    sentBackBy: isLatestSentBack ? latestDec.approver_name || latestDec.approver_email || "—" : undefined,
    sentBackDate: isLatestSentBack
      ? formatDecisionDateTime((latestDec as any).decision_date || (latestDec as any).decidedAt || latestDec.timestamp || (latestDec as any).Created)
      : undefined,
    sentBackRemarks: isLatestSentBack ? latestDec.comments || (latestDec as any).remarks || "" : undefined,
    decisions: currentRunDecs,
  });

  return iterations;
}

/**
 * Builds table row definitions for all 6 fixed workflow levels for a given iteration run.
 */
export function buildTableRowsForIteration(
  iteration: IIterationRun,
  proposalVersion: IProposalVersionEntry
): ITableRowData[] {
  const isApprovedHistorical = !proposalVersion.isCurrent && proposalVersion.status === "Approved";

  // Determine highest level approved in this iteration's decisions
  const approvedLevelsInDecs = iteration.decisions
    .filter((d) => (d.decision || "").trim().toUpperCase() === "APPROVED")
    .map((d) => d.level_id);
  const maxApprovedLevelInDecs = approvedLevelsInDecs.length > 0 ? Math.max(...approvedLevelsInDecs) : 0;

  return FIXED_APPROVAL_STAGES.map((stage) => {
    const matchingDecs = iteration.decisions
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
      if (isApprovedHistorical) {
        // Historical snapshots in CERProposalHistory are fully approved proposals
        statusText = "Approved";
        updatedBy = "Designated Approver";
        dateTime = proposalVersion.dateStr;
      } else if (iteration.isLatestActive) {
        if (proposalVersion.isCurrent) {
          const propStatus = proposalVersion.status;
          const currentLvl = proposalVersion.rawProposal.current_level || 1;

          if (propStatus === "In Approval") {
            if (stage.level === currentLvl) {
              statusText = "Pending";
            } else if (stage.level > currentLvl) {
              statusText = "Not Started";
            } else if (stage.level < currentLvl) {
              // If stage is below current level, it was approved in the active iteration or predecessor
              statusText = "Approved";
            }
          } else if (propStatus === "Revised") {
            if (stage.level === currentLvl) {
              statusText = "Pending";
            } else {
              statusText = "Not Started";
            }
          } else if (propStatus === "Approved") {
            statusText = "Approved";
          } else {
            statusText = "Not Started";
          }
        } else {
          statusText = "Not Started";
        }
      } else {
        // In a sent-back prior iteration, stages beyond the sent-back level were not started
        if (iteration.sentBackLevel && stage.level > iteration.sentBackLevel) {
          statusText = "Not Started";
        } else {
          statusText = "Not Started";
        }
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
}

/**
 * Robustly partitions a master list of approval decisions across proposal versions.
 * Discovers whether decisions share the root permanentCerId or have distinct proposal numbers,
 * and splits them along version completion boundaries.
 */
export function partitionDecisionsByVersion(
  allDecisions: IApprovalDecision[],
  versionEntries: IProposalVersionEntry[]
): Record<string, IApprovalDecision[]> {
  const result: Record<string, IApprovalDecision[]> = {};
  versionEntries.forEach((v) => {
    result[v.id] = [];
  });

  if (!allDecisions || allDecisions.length === 0) return result;

  // Sort all decisions chronologically ascending (oldest first)
  const sorted = [...allDecisions].sort((a, b) => {
    const tA = new Date((a as any).decision_date || (a as any).decidedAt || a.timestamp || (a as any).Created || 0).getTime();
    const tB = new Date((b as any).decision_date || (b as any).decidedAt || b.timestamp || (b as any).Created || 0).getTime();
    return tA - tB;
  });

  // Check if decisions explicitly contain the version's proposalNo
  const hasExplicitMatching = sorted.some((d) => {
    const dNo = (d.cerprno || "").trim().toUpperCase();
    return versionEntries.some(
      (v) => (v.proposalNo || "").trim().toUpperCase() === dNo && dNo !== (v.rawProposal.cer_proposal_id || "").trim().toUpperCase()
    );
  });

  if (hasExplicitMatching) {
    sorted.forEach((d) => {
      const dNo = (d.cerprno || "").trim().toUpperCase();
      const matchedVer = versionEntries.find((v) => (v.proposalNo || "").trim().toUpperCase() === dNo);
      if (matchedVer) {
        result[matchedVer.id].push(d);
      } else {
        const currentVer = versionEntries.find((v) => v.isCurrent) || versionEntries[0];
        result[currentVer.id].push(d);
      }
    });
    return result;
  }

  // If all decisions share the same root CER Proposal ID (e.g. CER-2026-0002):
  // Boundary Partitioning:
  // Chronological order: [Historical 1, ..., Current]
  if (versionEntries.length === 1) {
    result[versionEntries[0].id] = sorted;
    return result;
  }

  const chronologicalVersions = [...versionEntries].reverse(); // e.g. [Historical 1, Current]
  const currentVer = versionEntries.find((v) => v.isCurrent) || versionEntries[0];
  const histVer = chronologicalVersions[0];

  // Find the boundary where Historical 1 ended:
  // Historical 1 achieved full final approval (e.g. Level 6 Approved, or highest level approved before a post-approval amendment send-back)
  let boundaryIndex = -1;
  for (let i = 0; i < sorted.length; i++) {
    const dec = sorted[i];
    const isL6Approved = dec.level_id === 6 && (dec.decision || "").trim().toUpperCase() === "APPROVED";
    const isSendBack = (dec.decision || "").trim().toUpperCase() === "SENT_BACK" || (dec.decision || "").trim().toUpperCase() === "SENT BACK";

    if (isL6Approved) {
      boundaryIndex = i;
      break;
    }
    if (isSendBack && i > 0) {
      boundaryIndex = i - 1;
      break;
    }
  }

  if (boundaryIndex !== -1) {
    result[histVer.id] = sorted.slice(0, boundaryIndex + 1);
    result[currentVer.id] = sorted.slice(boundaryIndex + 1);
  } else {
    // If no clear boundary, assign all historical decisions to Historical 1 if it is Approved
    if (histVer.status === "Approved") {
      result[histVer.id] = sorted.filter((d) => (d.decision || "").trim().toUpperCase() === "APPROVED");
      result[currentVer.id] = sorted;
    } else {
      result[currentVer.id] = sorted;
    }
  }

  return result;
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

  // Unified decision loading across the entire CER lifecycle
  useEffect(() => {
    if (!isOpen || !proposal) return;

    let isMounted = true;
    const loadAllDecisions = async () => {
      setIsLoadingDecisions(true);
      try {
        // Query root permanent CER ID to fetch all decisions across all cycles
        const queryPromises: Array<Promise<IApprovalDecision[]>> = [
          dataService.getApprovalDecisions(permanentCerId, true),
        ];

        // Also query current proposal_no if distinct
        if (proposal.proposal_no && proposal.proposal_no !== permanentCerId) {
          queryPromises.push(dataService.getApprovalDecisions(proposal.proposal_no, true));
        }

        // Query historical proposal numbers if distinct
        historyList.forEach((hp) => {
          if (hp.proposal_no && hp.proposal_no !== permanentCerId) {
            queryPromises.push(dataService.getApprovalDecisions(hp.proposal_no, true));
          }
        });

        const results = await Promise.all(queryPromises);
        const combined: IApprovalDecision[] = [];
        const seenKeys = new Set<string>();

        results.forEach((list) => {
          (list || []).forEach((d) => {
            const key = d.id || `${d.level_id}_${(d as any).decision_date || d.timestamp}_${d.approver_name}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              combined.push(d);
            }
          });
        });

        // Also include initialDecisions if provided
        if (initialDecisions && initialDecisions.length > 0) {
          initialDecisions.forEach((d) => {
            const key = d.id || `${d.level_id}_${(d as any).decision_date || d.timestamp}_${d.approver_name}`;
            if (!seenKeys.has(key)) {
              seenKeys.add(key);
              combined.push(d);
            }
          });
        }

        // Partition decisions accurately across all versions
        const partitioned = partitionDecisionsByVersion(combined, versionEntries);

        if (isMounted) {
          setVersionDecisionsMap(partitioned);
        }
      } catch (err) {
        console.warn("[StatusHistoryModal] Error querying unified approval decisions:", err);
      } finally {
        if (isMounted) setIsLoadingDecisions(false);
      }
    };

    loadAllDecisions().catch((e) => console.error(e));

    return () => {
      isMounted = false;
    };
  }, [isOpen, permanentCerId, proposal, historyList, versionEntries, dataService, initialDecisions]);

  if (!isOpen || !proposal) return null;

  // Retrieve decisions for the selected version and split into iterations
  const versionDecisions = (selectedVersion && versionDecisionsMap[selectedVersion.id]) || [];
  const iterations = splitDecisionsIntoIterations(versionDecisions, selectedVersion.isCurrent, selectedVersion.rawProposal);

  // Active iteration (top table) and prior iterations (lower tables)
  const activeIteration = iterations[iterations.length - 1];
  const priorIterations = iterations.slice(0, -1).reverse();

  // Active table rows
  const activeRows = buildTableRowsForIteration(activeIteration, selectedVersion);

  // Summary Metrics calculations based strictly on the active iteration
  const totalLevels = 6;
  const approvedLevelsCount = activeRows.filter((r) => r.statusText === "Approved").length;

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
  } else {
    currentPendingStageText = "All Approved";
  }

  const sanctionAmountFormatted = `${selectedVersion.currency} ${selectedVersion.amount.toLocaleString()}`;

  // Helper to render standard status badge
  const renderStatusBadge = (statusText: string) => {
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

  // Helper to render a table row
  const renderTableRow = (row: ITableRowData) => {
    const { stage, statusText, updatedBy, dateTime, remarks } = row;
    return (
      <tr key={stage.level} className="hover:bg-slate-50/70 transition-colors">
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
          {renderStatusBadge(statusText)}
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
  };

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
          {/* RIGHT PANEL (~70% width): Summary Cards & Multi-Iteration Tables */}
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

            {/* UNIFIED APPROVAL HISTORY BOX (Contains Active Iteration + All Prior Iterations in One Box) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col shrink-0">
              {/* Box Master Header */}
              <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#012964] shrink-0" />
                  <h3 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                    Workflow Stages & Approval History ({selectedVersion.proposalNo})
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  {isLoadingDecisions && (
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <div className="w-3.5 h-3.5 border-2 border-[#012964] border-t-transparent rounded-full animate-spin" />
                      <span>Updating...</span>
                    </div>
                  )}
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-[#012964] border border-blue-200">
                    {priorIterations.length > 0
                      ? `${iterations.length} Iterations (${priorIterations.length} Sent Back)`
                      : selectedVersion.isCurrent
                      ? "Active Workflow"
                      : "Approved Snapshot"}
                  </span>
                </div>
              </div>

              {/* Active Iteration Sub-Header (Shown when prior iterations exist to differentiate active run) */}
              {priorIterations.length > 0 && (
                <div className="px-4 py-2 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 animate-pulse shrink-0" />
                    <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wide">
                      Active Workflow Cycle (Iteration {activeIteration.iterationIndex})
                    </span>
                  </div>
                  <span className="text-[11px] font-medium text-slate-600">
                    Current Status: <strong className="font-semibold text-slate-900">{selectedVersion.status}</strong>
                  </span>
                </div>
              )}

              {/* Active Iteration Table */}
              <div className="overflow-x-auto overflow-y-hidden">
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
                    {activeRows.map((row) => renderTableRow(row))}
                  </tbody>
                </table>
              </div>

              {/* Prior Iteration Tables inside the same unified box */}
              {priorIterations.map((iter) => {
                const iterRows = buildTableRowsForIteration(iter, selectedVersion);

                return (
                  <div key={`prior-iter-${iter.iterationIndex}`} className="border-t-2 border-amber-200/90">
                    {/* Prior Iteration Divider Header */}
                    <div className="px-4 py-2.5 bg-amber-50/80 border-b border-amber-200/80 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <RotateCcw className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <div>
                          <span className="font-bold text-xs text-amber-950 uppercase tracking-wider">
                            Prior Iteration {iter.iterationIndex} — Sent Back at Level {iter.sentBackLevel} ({iter.sentBackStageName})
                          </span>
                          {iter.sentBackBy && (
                            <p className="text-[11px] text-amber-800 mt-0.5">
                              Returned to Initiator by <strong>{iter.sentBackBy}</strong>
                              {iter.sentBackDate && iter.sentBackDate !== "—" ? ` on ${iter.sentBackDate}` : ""}
                              {iter.sentBackRemarks ? ` • "${iter.sentBackRemarks}"` : ""}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                        Sent Back for Revision
                      </span>
                    </div>

                    {/* Prior Iteration Table */}
                    <div className="overflow-x-auto overflow-y-hidden">
                      <table className="w-full text-left border-collapse text-xs">
                        <thead>
                          <tr className="bg-amber-50/40 border-b border-amber-100 text-slate-700 font-bold uppercase text-[11px] tracking-wider">
                            <th className="py-2.5 px-3.5 w-16">Level</th>
                            <th className="py-2.5 px-3.5 w-48">Level Name</th>
                            <th className="py-2.5 px-3.5 w-36">Status</th>
                            <th className="py-2.5 px-3.5">Status Updated By</th>
                            <th className="py-2.5 px-3.5 w-44">Date & Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {iterRows.map((row) => renderTableRow(row))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
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
