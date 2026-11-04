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
  isRejected?: boolean;
  rejectedLevel?: number;
  rejectedStageName?: string;
  rejectedBy?: string;
  rejectedDate?: string;
  rejectedRemarks?: string;
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
  const isPropRejected = (currentProposal.status || "").trim().toUpperCase() === "REJECTED";

  if (!versionDecisions || versionDecisions.length === 0) {
    const rejLvl = currentProposal.current_level || 1;
    const rejStageName = FIXED_APPROVAL_STAGES.find((s) => s.level === rejLvl)?.name || `Stage ${rejLvl}`;
    return [
      {
        iterationIndex: 1,
        isLatestActive: true,
        isSentBack: false,
        isRejected: isCurrentVersion && isPropRejected,
        rejectedLevel: isCurrentVersion && isPropRejected ? rejLvl : undefined,
        rejectedStageName: isCurrentVersion && isPropRejected ? rejStageName : undefined,
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
    const isRejected = (dec.decision || "").trim().toUpperCase() === "REJECTED";

    if (isSendBack || isRejected) {
      // Check if subsequent decisions exist in this list (e.g. L1 Approved after L2 Send Back/Rejected)
      const hasSubsequentDecisions = i < sorted.length - 1;
      // Or if current proposal was retriggered and is actively 'In Approval'
      const isRetriggered = hasSubsequentDecisions || (isCurrentVersion && currentProposal.status === "In Approval");

      if (isRetriggered) {
        const stageName = FIXED_APPROVAL_STAGES.find((s) => s.level === dec.level_id)?.name || `Stage ${dec.level_id}`;
        iterations.push({
          iterationIndex: iterations.length + 1,
          isLatestActive: false,
          isSentBack: isSendBack,
          sentBackLevel: isSendBack ? dec.level_id : undefined,
          sentBackStageName: isSendBack ? stageName : undefined,
          sentBackBy: isSendBack ? dec.approver_name || dec.approver_email || "—" : undefined,
          sentBackDate: isSendBack
            ? formatDecisionDateTime((dec as any).decision_date || (dec as any).decidedAt || dec.timestamp || (dec as any).Created)
            : undefined,
          sentBackRemarks: isSendBack ? dec.comments || (dec as any).remarks || "" : undefined,
          isRejected,
          rejectedLevel: isRejected ? dec.level_id : undefined,
          rejectedStageName: isRejected ? stageName : undefined,
          rejectedBy: isRejected ? dec.approver_name || dec.approver_email || "—" : undefined,
          rejectedDate: isRejected
            ? formatDecisionDateTime((dec as any).decision_date || (dec as any).decidedAt || dec.timestamp || (dec as any).Created)
            : undefined,
          rejectedRemarks: isRejected ? dec.comments || (dec as any).remarks || "" : undefined,
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

  const rejectedDec = currentRunDecs.find(
    (d) => (d.decision || "").trim().toUpperCase() === "REJECTED"
  );
  const isLatestRejected = !!rejectedDec || (isCurrentVersion && isPropRejected);
  const rejLvl = rejectedDec?.level_id || (isCurrentVersion ? currentProposal.current_level : 1) || 1;
  const rejStageName = FIXED_APPROVAL_STAGES.find((s) => s.level === rejLvl)?.name || `Stage ${rejLvl}`;
  const rejBy = rejectedDec ? rejectedDec.approver_name || rejectedDec.approver_email || "—" : undefined;
  const rejDate = rejectedDec
    ? formatDecisionDateTime((rejectedDec as any).decision_date || (rejectedDec as any).decidedAt || rejectedDec.timestamp || (rejectedDec as any).Created)
    : undefined;
  const rejRemarks = rejectedDec ? rejectedDec.comments || (rejectedDec as any).remarks || "" : undefined;

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
    isRejected: !!isLatestRejected,
    rejectedLevel: isLatestRejected ? rejLvl : undefined,
    rejectedStageName: isLatestRejected ? rejStageName : undefined,
    rejectedBy: isLatestRejected ? rejBy : undefined,
    rejectedDate: isLatestRejected ? rejDate : undefined,
    rejectedRemarks: isLatestRejected ? rejRemarks : undefined,
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
    // 1. Strict Sequential Limit for Sent Back:
    // In any iteration where a stage was Sent Back, stages higher than the sent-back level were never reached!
    if (iteration.isSentBack && iteration.sentBackLevel && stage.level > iteration.sentBackLevel) {
      return {
        stage,
        statusText: "Not Started",
        updatedBy: "—",
        dateTime: "—",
        remarks: "",
      };
    }

    // 2. Strict Sequential Limit for Rejected:
    // In any iteration where a stage was Rejected, stages higher than the rejected level were never reached!
    if (iteration.isRejected && iteration.rejectedLevel && stage.level > iteration.rejectedLevel) {
      return {
        stage,
        statusText: "Not Started",
        updatedBy: "—",
        dateTime: "—",
        remarks: "",
      };
    }

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
          } else if (propStatus === "Approved") {
            statusText = "Approved";
          } else if (propStatus === "Rejected") {
            const rejLevel =
              iteration.decisions.find(
                (d) => (d.decision || "").trim().toUpperCase() === "REJECTED"
              )?.level_id || currentLvl;
            if (stage.level < rejLevel) {
              statusText = "Approved";
            } else if (stage.level === rejLevel) {
              statusText = "Rejected";
            } else {
              statusText = "Not Started";
            }
          } else if (propStatus === "Send Back" || propStatus === "Revised" || propStatus === "Sent Back") {
            const sbLevel = iteration.sentBackLevel || currentLvl;
            if (stage.level < sbLevel) {
              statusText = "Approved";
            } else if (stage.level === sbLevel) {
              statusText = "Send Back";
            } else {
              statusText = "Not Started";
            }
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
 * 1. Primary: Matches explicit proposal numbers if distinct (e.g. 'PR-2026/02-R1' vs 'PR-2026/02').
 * 2. Secondary: Direct 'version' column matching (e.g. 'V1', 'V2').
 * 3. Fallback: Chronological boundary against historical snapshot archive timestamps.
 * 4. Workflow Continuity Safeguard: Reconciles preceding level approvals (e.g. L1) into active cycles.
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

  const currentVer = versionEntries.find((v) => v.isCurrent) || versionEntries[0];
  const historicalVersAsc = [...versionEntries]
    .filter((v) => !v.isCurrent)
    .sort((a, b) => a.serialNo - b.serialNo);

  sorted.forEach((d) => {
    const rawV = String((d as any).version || (d as any).Version || "").trim().toUpperCase();
    const dNo = (d.cerprno || "").trim().toUpperCase();
    const dTitle = ((d as any).Title || "").trim().toUpperCase();
    const dTime = new Date((d as any).decision_date || (d as any).decidedAt || d.timestamp || (d as any).Created || 0).getTime();

    // 1. Check exact proposal number match if versions have distinct proposal numbers
    const explicitNoVer = versionEntries.find((v) => {
      const pNo = (v.proposalNo || "").trim().toUpperCase();
      const pId = (v.rawProposal.cer_proposal_id || "").trim().toUpperCase();
      if (!pNo) return false;
      return (dNo === pNo || dTitle === pNo) && pNo !== pId;
    });
    if (explicitNoVer) {
      result[explicitNoVer.id].push(d);
      return;
    }

    // 2. Direct 'version' Column Matching (e.g. 'V1', 'V2', '1', '2')
    if (rawV) {
      const matchedVer = versionEntries.find((v) => {
        const vExpected = `V${v.serialNo}`.toUpperCase();
        const vNumExpected = String(v.serialNo);
        return rawV === vExpected || rawV === vNumExpected;
      });

      if (matchedVer) {
        result[matchedVer.id].push(d);
        return;
      }

      if (rawV.startsWith("V")) {
        const tagNum = parseInt(rawV.substring(1), 10);
        const maxSerial = Math.max(...versionEntries.map((v) => v.serialNo), 1);
        if (tagNum >= maxSerial) {
          result[currentVer.id].push(d);
          return;
        }
      }
    }

    // 3. Fallback for untagged / unversioned decisions:
    // Route to historical versions sequentially until each is fully approved, then route remaining to CURRENT
    let assigned = false;
    for (const hist of historicalVersAsc) {
      const histDecs = result[hist.id];
      const hasFinalApproval = histDecs.some(
        (hd) => hd.level_id === 6 && (hd.decision || "").trim().toUpperCase() === "APPROVED"
      );

      // If hist already has its complete approved run (reached level 6), it is closed
      if (hasFinalApproval) {
        continue;
      }

      // If hist already has an approved Level 1 and higher levels, and d is an L1 decision:
      // this marks the start of the next version/cycle!
      const hasL1 = histDecs.some((hd) => hd.level_id === 1 && (hd.decision || "").trim().toUpperCase() === "APPROVED");
      const maxLvlInHist = Math.max(...histDecs.map((hd) => hd.level_id), 0);
      if (hasL1 && maxLvlInHist >= 2 && d.level_id === 1) {
        continue;
      }

      // Check chronological boundary if available
      const histArchiveDate = new Date(hist.rawProposal.modified_date || hist.rawProposal.created_date || 0).getTime();
      if (histArchiveDate > 0 && dTime > histArchiveDate && histDecs.length >= 6) {
        continue;
      }

      result[hist.id].push(d);
      assigned = true;
      break;
    }

    if (!assigned) {
      result[currentVer.id].push(d);
    }
  });

  // 4. Workflow Continuity Safeguard:
  // If active cycle (or any cycle) has higher level decisions (e.g. L2) but is missing L1,
  // check if an L1 approval was placed in other partitions that chronologically belongs to this cycle
  for (const v of versionEntries) {
    const decs = result[v.id];
    const hasL2Plus = decs.some((d) => d.level_id >= 2);
    const hasL1 = decs.some((d) => d.level_id === 1);

    if (hasL2Plus && !hasL1) {
      for (const otherVer of versionEntries) {
        if (otherVer.id === v.id) continue;
        const otherDecs = result[otherVer.id];
        const minVTime = Math.min(
          ...decs.map((d) => new Date((d as any).decision_date || (d as any).decidedAt || d.timestamp || (d as any).Created || 0).getTime())
        );
        const candidateIdx = otherDecs.findIndex((d) => {
          if (d.level_id !== 1 || (d.decision || "").trim().toUpperCase() !== "APPROVED") return false;
          const t = new Date((d as any).decision_date || (d as any).decidedAt || d.timestamp || (d as any).Created || 0).getTime();
          return t <= minVTime;
        });

        if (candidateIdx !== -1) {
          const [migrated] = otherDecs.splice(candidateIdx, 1);
          decs.push(migrated);
          decs.sort((a, b) => {
            const tA = new Date((a as any).decision_date || (a as any).decidedAt || a.timestamp || (a as any).Created || 0).getTime();
            const tB = new Date((b as any).decision_date || (b as any).decidedAt || b.timestamp || (b as any).Created || 0).getTime();
            return tA - tB;
          });
          break;
        }
      }
    }
  }

  return result;
}

export interface IViewingCommentsData {
  stageName: string;
  levelBadge: string;
  statusText: string;
  updatedBy: string;
  dateTime: string;
  remarks: string;
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
  const [viewingComments, setViewingComments] = useState<IViewingCommentsData | null>(null);

  const permanentCerId = proposal?.cer_proposal_id || proposal?.cerprno || "—";

  // Handle ESC key to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (viewingComments) {
          setViewingComments(null);
        } else {
          onClose();
        }
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose, viewingComments]);

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

  // Check if version entries have distinct proposal numbers
  const hasDistinctProposalNos = useMemo(() => {
    return new Set(versionEntries.map((v) => (v.proposalNo || "").trim().toUpperCase())).size > 1;
  }, [versionEntries]);

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
    } else if (status === "Send Back" || status === "Revised" || status === "Sent Back") {
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
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs sm:text-[13px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Approved</span>
          </span>
        );
      case "Send Back":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs sm:text-[13px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 shadow-2xs">
            <RotateCcw className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Send Back</span>
          </span>
        );
      case "Rejected":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs sm:text-[13px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 shadow-2xs">
            <XCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
            <span>Rejected</span>
          </span>
        );
      case "Pending":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs sm:text-[13px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
            <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
            <span>Pending</span>
          </span>
        );
      case "Not Started":
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs sm:text-[13px] font-semibold bg-slate-100 text-slate-600 border border-slate-200 shadow-2xs">
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
          <span className="inline-block px-2.5 py-0.5 rounded-md font-mono text-xs sm:text-[13px] font-bold bg-[#012964]/10 text-[#012964] border border-[#012964]/20">
            {stage.levelBadge}
          </span>
        </td>

        {/* Column 2: Level Name */}
        <td className="py-3 px-3.5">
          <span className="font-bold text-slate-900 text-sm">
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
            <span className="font-semibold text-slate-800 text-sm">
              {updatedBy}
            </span>
          ) : (
            <span className="text-slate-400 font-medium text-sm">—</span>
          )}
        </td>

        {/* Column 5: Date & Time */}
        <td className="py-3 px-3.5">
          {dateTime !== "—" ? (
            <span className="font-medium text-slate-700 text-xs sm:text-[13px] whitespace-nowrap">
              {dateTime}
            </span>
          ) : (
            <span className="text-slate-400 font-medium text-sm">—</span>
          )}
        </td>

        {/* Column 6: Comments */}
        <td className="py-3 px-3.5 text-center">
          {remarks ? (
            <button
              type="button"
              onClick={() =>
                setViewingComments({
                  stageName: stage.name,
                  levelBadge: stage.levelBadge,
                  statusText,
                  updatedBy,
                  dateTime,
                  remarks,
                })
              }
              className="inline-flex items-center justify-center p-2 rounded-lg text-[#012964] hover:bg-[#012964]/10 transition-colors border border-[#012964]/20 shadow-2xs group cursor-pointer"
              title="View Reviewer Comments & Justification"
              aria-label={`View comments from ${updatedBy}`}
            >
              <MessageSquare className="w-4 h-4 text-[#012964] group-hover:scale-110 transition-transform" />
            </button>
          ) : (
            <span className="text-slate-300 font-medium text-sm select-none">—</span>
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
              <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
                Status & Approval History ({permanentCerId})
              </h2>
              {proposal.pr_name && (
                <span className="text-sm sm:text-base font-semibold text-slate-700 truncate max-w-xs md:max-w-md hidden sm:inline">
                  — {proposal.pr_name}
                </span>
              )}
              {proposal.cat && <CategoryBadge category={proposal.cat} />}
              <StatusBadge status={proposal.status} size="sm" />
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {isLoadingDecisions && (
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mr-1">
                <div className="w-3.5 h-3.5 border-2 border-[#012964] border-t-transparent rounded-full animate-spin" />
                <span>Updating...</span>
              </div>
            )}
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
                <span className="font-bold text-slate-800 text-sm tracking-tight">
                  Proposal Versions
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                {versionEntries.length} {versionEntries.length === 1 ? "Version" : "Versions"}
              </span>
            </div>

            {/* Version Cards Scrollable List */}
            <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
              {isLoadingHistory && versionEntries.length <= 1 ? (
                <div className="py-8 text-center text-slate-500 text-sm space-y-2">
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
                    className={`p-3.5 rounded-xl transition-all cursor-pointer relative ${
                      isSelected
                        ? "bg-white border-2 border-[#012964] shadow-xs ring-1 ring-[#012964]/10"
                        : "bg-white/90 hover:bg-white border border-slate-200/90 hover:border-slate-300 shadow-2xs"
                    }`}
                  >
                    {/* Top Header: Serial No, Version tag & Status */}
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span
                          className={`text-xs sm:text-[13px] font-bold px-2.5 py-0.5 rounded-md ${
                            isSelected
                              ? "bg-[#012964] text-white"
                              : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}
                        >
                          Serial No. {ver.serialNo}
                        </span>
                        <span
                          className={`text-xs font-semibold px-2 py-0.5 rounded border ${
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
                      <span className="font-mono font-bold text-sm sm:text-[15px] text-[#012964]">
                        {ver.proposalNo}
                      </span>
                      {isSelected && (
                        <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#012964] bg-[#012964]/10 px-2 py-0.5 rounded">
                          <Check className="w-3.5 h-3.5 text-[#012964]" />
                          Selected
                        </span>
                      )}
                    </div>

                    {/* Metadata: Amount & Date */}
                    <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs sm:text-[13px] text-slate-600">
                      <span className="font-bold text-slate-900">
                        {ver.currency} {ver.amount.toLocaleString()}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
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
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 flex flex-col justify-between">
                <span className="text-xs sm:text-[13px] uppercase font-bold text-slate-500 tracking-wider">
                  Total Approval Levels
                </span>
                <div className="flex items-baseline gap-1.5 mt-1.5">
                  <span className="text-2xl font-extrabold text-slate-900 leading-none">
                    {totalLevels}
                  </span>
                  <span className="text-xs sm:text-[13px] font-semibold text-slate-500">
                    Fixed Stages
                  </span>
                </div>
              </div>

              {/* Card 2: Approved Levels */}
              <div className="bg-emerald-50/50 border border-emerald-200/80 rounded-xl p-3.5 flex flex-col justify-between">
                <span className="text-xs sm:text-[13px] uppercase font-bold text-emerald-800 tracking-wider">
                  Approved Levels
                </span>
                <div className="flex items-baseline gap-1.5 mt-1.5">
                  <span className="text-2xl font-extrabold text-emerald-700 leading-none">
                    {approvedLevelsCount}
                  </span>
                  <span className="text-xs sm:text-[13px] font-semibold text-emerald-700">
                    of {totalLevels} Stages
                  </span>
                </div>
              </div>

              {/* Card 3: Current / Pending Level */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 flex flex-col justify-between min-w-0">
                <span className="text-xs sm:text-[13px] uppercase font-bold text-slate-500 tracking-wider">
                  Current / Pending Level
                </span>
                <div className="mt-1.5">
                  <span className="text-sm sm:text-base font-bold text-[#012964] leading-tight block truncate" title={currentPendingStageText}>
                    {currentPendingStageText}
                  </span>
                </div>
              </div>

              {/* Card 4: Sanction Amount */}
              <div className="bg-slate-50 border border-slate-200/90 rounded-xl p-3.5 flex flex-col justify-between">
                <span className="text-xs sm:text-[13px] uppercase font-bold text-slate-500 tracking-wider">
                  Sanction Amount
                </span>
                <div className="mt-1.5">
                  <span className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight block truncate">
                    {sanctionAmountFormatted}
                  </span>
                </div>
              </div>
            </div>

            {/* UNIFIED APPROVAL HISTORY BOX (Contains Active Iteration + All Prior Iterations in One Box) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col shrink-0">
              {/* Active Iteration Sub-Header Banner */}
              {activeIteration.isRejected ? (
                <div className="px-4 py-3 bg-rose-50/80 border-b border-rose-200/80 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-rose-700 shrink-0" />
                    <span className="font-bold text-xs sm:text-[13px] text-rose-950 uppercase tracking-wider">
                      {iterations.length > 1
                        ? `Active Workflow Cycle (Iteration ${activeIteration.iterationIndex}) — Rejected at Level ${activeIteration.rejectedLevel} (${activeIteration.rejectedStageName})`
                        : `Workflow Rejected at Level ${activeIteration.rejectedLevel} (${activeIteration.rejectedStageName})`}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300 shrink-0">
                    Rejected
                  </span>
                </div>
              ) : activeIteration.isSentBack ? (
                <div className="px-4 py-3 bg-amber-50/80 border-b border-amber-200/80 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <RotateCcw className="w-4 h-4 text-amber-700 shrink-0" />
                    <span className="font-bold text-xs sm:text-[13px] text-amber-950 uppercase tracking-wider">
                      {iterations.length > 1
                        ? `Active Workflow Cycle (Iteration ${activeIteration.iterationIndex}) — Sent Back at Level ${activeIteration.sentBackLevel} (${activeIteration.sentBackStageName})`
                        : `Workflow Sent Back at Level ${activeIteration.sentBackLevel} (${activeIteration.sentBackStageName})`}
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                    Sent Back for Revision
                  </span>
                </div>
              ) : !selectedVersion.isCurrent && selectedVersion.status === "Approved" ? (
                <div className="px-4 py-2.5 bg-emerald-50/70 border-b border-emerald-200/80 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                    <span className="font-bold text-xs sm:text-[13px] text-emerald-950 uppercase tracking-wider">
                      Approved Proposal Snapshot
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                    All Approved
                  </span>
                </div>
              ) : priorIterations.length > 0 ? (
                <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 animate-pulse shrink-0" />
                    <span className="text-xs sm:text-[13px] font-bold text-slate-800 uppercase tracking-wide">
                      Active Workflow Cycle (Iteration {activeIteration.iterationIndex})
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-600">
                    Current Status: <strong className="font-semibold text-slate-900">{selectedVersion.status}</strong>
                  </span>
                </div>
              ) : (
                <div className="px-4 py-2.5 bg-slate-100/70 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-emerald-200 animate-pulse shrink-0" />
                    <span className="text-xs sm:text-[13px] font-bold text-slate-800 uppercase tracking-wide">
                      Active Workflow Cycle
                    </span>
                  </div>
                  <span className="text-xs font-medium text-slate-600">
                    Current Status: <strong className="font-semibold text-slate-900">{selectedVersion.status}</strong>
                  </span>
                </div>
              )}

              {/* Active Iteration Table */}
              <div className="overflow-x-auto overflow-y-hidden">
                <table className="w-full text-left border-collapse text-sm">
                  <thead>
                    <tr
                      className={
                        activeIteration.isRejected
                          ? "bg-rose-50/40 border-b border-rose-100 text-slate-700 font-bold uppercase text-xs sm:text-[13px] tracking-wider"
                          : activeIteration.isSentBack
                          ? "bg-amber-50/40 border-b border-amber-100 text-slate-700 font-bold uppercase text-xs sm:text-[13px] tracking-wider"
                          : "bg-slate-100/80 border-b border-slate-200 text-slate-700 font-bold uppercase text-xs sm:text-[13px] tracking-wider"
                      }
                    >
                      <th className="py-3 px-3.5 w-16">Level</th>
                      <th className="py-3 px-3.5 w-52">Level Name</th>
                      <th className="py-3 px-3.5 w-40">Status</th>
                      <th className="py-3 px-3.5">Status Updated By</th>
                      <th className="py-3 px-3.5 w-48">Date & Time</th>
                      <th className="py-3 px-3.5 w-28 text-center">Comments</th>
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
                const isIterRejected = iter.isRejected;

                return (
                  <div
                    key={`prior-iter-${iter.iterationIndex}`}
                    className={isIterRejected ? "border-t-2 border-rose-200/90" : "border-t-2 border-amber-200/90"}
                  >
                    {/* Prior Iteration Divider Header */}
                    <div
                      className={`px-4 py-3 border-b flex items-center justify-between flex-wrap gap-2 ${
                        isIterRejected
                          ? "bg-rose-50/80 border-rose-200/80"
                          : "bg-amber-50/80 border-amber-200/80"
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isIterRejected ? (
                          <XCircle className="w-4 h-4 text-rose-700 shrink-0" />
                        ) : (
                          <RotateCcw className="w-4 h-4 text-amber-700 shrink-0" />
                        )}
                        <span
                          className={`font-bold text-xs sm:text-[13px] uppercase tracking-wider ${
                            isIterRejected ? "text-rose-950" : "text-amber-950"
                          }`}
                        >
                          {isIterRejected
                            ? `Prior Iteration ${iter.iterationIndex} — Rejected at Level ${iter.rejectedLevel} (${iter.rejectedStageName})`
                            : `Prior Iteration ${iter.iterationIndex} — Sent Back at Level ${iter.sentBackLevel} (${iter.sentBackStageName})`}
                        </span>
                      </div>
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-xs font-bold border shrink-0 ${
                          isIterRejected
                            ? "bg-rose-100 text-rose-800 border-rose-300"
                            : "bg-amber-100 text-amber-800 border-amber-300"
                        }`}
                      >
                        {isIterRejected ? "Rejected" : "Sent Back for Revision"}
                      </span>
                    </div>

                    {/* Prior Iteration Table */}
                    <div className="overflow-x-auto overflow-y-hidden">
                      <table className="w-full text-left border-collapse text-sm">
                        <thead>
                          <tr
                            className={`border-b text-slate-700 font-bold uppercase text-xs sm:text-[13px] tracking-wider ${
                              isIterRejected
                                ? "bg-rose-50/40 border-rose-100"
                                : "bg-amber-50/40 border-amber-100"
                            }`}
                          >
                            <th className="py-3 px-3.5 w-16">Level</th>
                            <th className="py-3 px-3.5 w-52">Level Name</th>
                            <th className="py-3 px-3.5 w-40">Status</th>
                            <th className="py-3 px-3.5">Status Updated By</th>
                            <th className="py-3 px-3.5 w-48">Date & Time</th>
                            <th className="py-3 px-3.5 w-28 text-center">Comments</th>
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
        <div className="flex items-center justify-end px-5 py-3 border-t border-slate-200 bg-slate-50/80 shrink-0">
          <button
            onClick={onClose}
            className="h-10 px-6 rounded-xl text-sm font-semibold text-white bg-[#012964] hover:bg-[#001f4d] transition-colors shadow-2xs cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Reviewer Comments & Justification Modal Popup */}
      {viewingComments && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setViewingComments(null)}
          role="dialog"
          aria-modal="true"
          aria-labelledby="reviewer-comments-title"
        >
          <div
            className="relative w-full max-w-lg bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden flex flex-col animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200 bg-white">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-xl bg-[#012964]/10 border border-[#012964]/20 text-[#012964] shrink-0">
                  <MessageSquare className="w-5 h-5 text-[#012964]" />
                </div>
                <div className="min-w-0">
                  <h3 id="reviewer-comments-title" className="text-base font-bold text-slate-900 leading-tight">
                    Reviewer Comments & Justification
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5 font-medium">
                    {viewingComments.levelBadge} • {viewingComments.stageName}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingComments(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                title="Close"
                aria-label="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4">
              {/* Metadata Banner */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200/80 text-xs">
                <div>
                  <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Decision Status
                  </span>
                  <div>{renderStatusBadge(viewingComments.statusText)}</div>
                </div>
                <div>
                  <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-1">
                    Date & Time
                  </span>
                  <span className="font-semibold text-slate-800 text-[13px]">
                    {viewingComments.dateTime}
                  </span>
                </div>
                <div className="col-span-2 pt-2 border-t border-slate-200/60">
                  <span className="font-semibold text-slate-500 uppercase tracking-wider block mb-0.5">
                    Status Updated By
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    {viewingComments.updatedBy}
                  </span>
                </div>
              </div>

              {/* Justification Text Area */}
              <div>
                <label className="text-xs uppercase font-bold text-slate-700 tracking-wider block mb-1.5">
                  Comments & Justification
                </label>
                <div className="bg-slate-50/80 border border-slate-200 rounded-xl p-4 text-slate-800 text-sm leading-relaxed whitespace-pre-wrap max-h-56 overflow-y-auto font-normal shadow-2xs">
                  {viewingComments.remarks}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-end px-5 py-3 border-t border-slate-200 bg-slate-50/80">
              <button
                type="button"
                onClick={() => setViewingComments(null)}
                className="px-4 py-2 text-sm font-semibold rounded-xl bg-[#012964] text-white hover:bg-[#001f4d] transition-colors shadow-2xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
