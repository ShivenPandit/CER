import React, { useState, useEffect, useMemo } from "react";
import {
  X,
  History,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FolderGit2,
  DollarSign,
  Landmark,
  BarChart2,
  Calculator,
  MessageSquare,
  Paperclip,
  User,
  Layers,
  UserCheck,
  Check,
  ChevronRight,
  Download,
  FileText,
} from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { ICERAttachment } from "../../models/AttachmentModel";
import { ICERDataService } from "../../services/ICERDataService";
import { StatusBadge } from "../Shared/StatusBadge";
import { CategoryBadge } from "../Shared/CategoryBadge";
import { UserAvatar } from "../Common/UserAvatar";
import { calculateExactDays, getCurrentFiscalYearPhasingLabels } from "../../utils/dateUtils";
import { useModalScrollLock } from "../../hooks/useModalScrollLock";

interface IProposalHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  cerProposalId: string;
  dataService: ICERDataService;
  initialHistory?: ICERProposal[];
}

export const ProposalHistoryModal: React.FC<IProposalHistoryModalProps> = ({
  isOpen,
  onClose,
  cerProposalId,
  dataService,
  initialHistory,
}) => {
  const [historyProposals, setHistoryProposals] = useState<ICERProposal[]>(initialHistory || []);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState<number>(0);
  const [selectedAttachments, setSelectedAttachments] = useState<ICERAttachment[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(!initialHistory?.length);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Lock background scrolling across SharePoint page containers while modal is open
  useModalScrollLock(isOpen);

  // Sync props when opening
  useEffect(() => {
    if (initialHistory && initialHistory.length > 0) {
      setHistoryProposals(initialHistory);
    }
  }, [initialHistory]);

  // Reset selected version index whenever modal opens or CER Proposal ID changes
  useEffect(() => {
    if (isOpen) {
      setSelectedVersionIndex(0);
    }
  }, [isOpen, cerProposalId]);

  // Load historical snapshots strictly from CERProposalsHistory
  useEffect(() => {
    if (!isOpen || !cerProposalId) return;

    let isMounted = true;
    const fetchHistory = async (): Promise<void> => {
      if (!initialHistory || initialHistory.length === 0) {
        setIsLoading(true);
      }
      setError(null);
      try {
        const hist = await dataService.getProposalHistory(cerProposalId);
        if (isMounted) {
          setHistoryProposals(hist || []);
        }
      } catch (err: unknown) {
        if (isMounted) {
          console.error("Failed to fetch historical snapshots for CER Proposal ID:", err);
          setError("Failed to load historical snapshots for this proposal.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    fetchHistory().catch((e) => console.error(e));
    return () => {
      isMounted = false;
    };
  }, [isOpen, cerProposalId, dataService, initialHistory]);

  // Sort history proposals descending by date (newest first: Serial No. 3, 2, 1)
  const sortedHistory = useMemo(() => {
    return [...historyProposals].sort((a, b) => {
      const dateA = new Date(a.modified_date || a.created_date || 0).getTime();
      const dateB = new Date(b.modified_date || b.created_date || 0).getTime();
      return dateB - dateA;
    });
  }, [historyProposals]);

  // Derive the active selected index and snapshot safely
  const activeVersionIndex = sortedHistory.length > 0
    ? Math.min(Math.max(0, selectedVersionIndex), sortedHistory.length - 1)
    : 0;

  const selectedProposal = sortedHistory.length > 0 ? sortedHistory[activeVersionIndex] : null;

  // Load attachments for the selected historical snapshot
  useEffect(() => {
    if (!selectedProposal) {
      setSelectedAttachments([]);
      return;
    }

    let isMounted = true;
    const loadAtts = async (): Promise<void> => {
      setIsLoadingAttachments(true);
      try {
        // 1. Check if selectedProposal has direct attachments_manifest
        const manifestRaw = (selectedProposal as any).attachments_manifest || (selectedProposal as any).attachments;
        if (manifestRaw) {
          try {
            const parsed = typeof manifestRaw === "string" ? JSON.parse(manifestRaw) : manifestRaw;
            if (Array.isArray(parsed) && parsed.length > 0) {
              if (isMounted) {
                setSelectedAttachments(parsed);
                setIsLoadingAttachments(false);
              }
              return;
            }
          } catch { /* fallback to getAttachments */ }
        }

        // 2. Check if embedded inside remarks as a manifest marker
        const remarksText = String(selectedProposal.remarks || "");
        const match = remarksText.match(/<!--\s*CER_ATTACHMENTS_MANIFEST:([\s\S]*?)-->/i);
        if (match && match[1]) {
          try {
            const parsed = JSON.parse(match[1].trim());
            if (Array.isArray(parsed) && parsed.length > 0) {
              if (isMounted) {
                setSelectedAttachments(parsed);
                setIsLoadingAttachments(false);
              }
              return;
            }
          } catch { /* fallback */ }
        }

        const targetId = (
          selectedProposal.cerprno ||
          selectedProposal.proposal_no ||
          selectedProposal.cer_proposal_id ||
          ""
        ).trim();
        if (!targetId) {
          if (isMounted) setSelectedAttachments([]);
          return;
        }
        const vTag = (selectedProposal as any).version || undefined;
        const atts = await dataService.getAttachments(targetId, {
          versionTag: vTag,
          proposalNo: selectedProposal.proposal_no,
        });
        if (isMounted) {
          setSelectedAttachments(atts || []);
        }
      } catch (e) {
        if (isMounted) {
          console.warn("Failed to load attachments for historical snapshot:", e);
          setSelectedAttachments([]);
        }
      } finally {
        if (isMounted) {
          setIsLoadingAttachments(false);
        }
      }
    };

    loadAtts().catch((e) => console.error(e));
    return () => {
      isMounted = false;
    };
  }, [selectedProposal, dataService]);

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

  if (!isOpen) return null;

  const projectName =
    selectedProposal?.pr_name ||
    historyProposals[0]?.pr_name ||
    "Capital Expenditure Request";

  const formatSnapshotDate = (dateVal?: string): string => {
    if (!dateVal) return "—";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return dateVal;
      return d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      });
    } catch {
      return dateVal;
    }
  };

  const isINR = selectedProposal?.currency === "INR";
  const currSymbol = isINR ? "₹" : "$";
  const currUnit = isINR ? "" : " mm";

  // Phasing periods for selected snapshot
  const defaultPhasing = getCurrentFiscalYearPhasingLabels(
    selectedProposal?.created_date ? new Date(selectedProposal.created_date) : new Date()
  );
  const period1Display = selectedProposal?.ph_till_label || defaultPhasing.ph_till_label;
  const period2Display = selectedProposal?.ph_fy_label || defaultPhasing.ph_fy_label;
  const period3Display = selectedProposal?.ph_beyond_label || defaultPhasing.ph_beyond_label;

  const durationDisplay =
    selectedProposal?.st_date && selectedProposal?.com_date
      ? `${calculateExactDays(selectedProposal.st_date, selectedProposal.com_date)} Days`
      : selectedProposal?.period || `${selectedProposal?.duration_months || 0} Months`;

  return (
    <div
      className="cer-display-scope fixed inset-0 z-[9999] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-slate-900/70 backdrop-blur-xs overscroll-contain animate-fade-in"
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
        boxSizing: "border-box",
        overscrollBehavior: "contain",
      }}
      onWheel={(e) => {
        if (e.target === e.currentTarget) {
          e.preventDefault();
        }
      }}
    >
      <div
        className="relative w-full max-w-7xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col overscroll-contain"
        style={{
          width: "100%",
          maxWidth: "1380px",
          height: "calc(100vh - 40px)",
          maxHeight: "860px",
          display: "flex",
          flexDirection: "column",
          borderRadius: "16px",
          backgroundColor: "#ffffff",
          overflow: "hidden",
          overscrollBehavior: "contain",
        }}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-200 bg-white shrink-0 gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2 rounded-xl bg-[#012964]/10 border border-[#012964]/20 text-[#012964] shrink-0">
              <History className="w-5 h-5 text-[#012964]" />
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight truncate">
              Proposal History ({cerProposalId || "—"})
            </h2>
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
        <div
          className="flex flex-col md:flex-row flex-1 min-h-0 overflow-hidden"
          style={{ display: "flex", flex: 1, minHeight: 0, overflow: "hidden" }}
        >
          {/* ========================================================================================= */}
          {/* LEFT SIDEBAR (~25% width on desktop): Proposal History Version Selector */}
          {/* ========================================================================================= */}
          <div
            className="w-full md:w-80 lg:w-96 shrink-0 border-b md:border-b-0 md:border-r border-slate-200 bg-slate-50/70 flex flex-col overflow-hidden max-h-56 md:max-h-none"
            style={{
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Sidebar Title */}
            <div className="px-4 py-3 bg-slate-100/80 border-b border-slate-200 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-[#012964]" />
                <span className="font-bold text-slate-800 text-sm tracking-tight">
                  Proposal Versions
                </span>
              </div>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-white text-slate-700 border border-slate-200 shadow-2xs">
                {sortedHistory.length} {sortedHistory.length === 1 ? "Version" : "Versions"}
              </span>
            </div>

            {/* Version Cards Scrollable List */}
            <div
              className="flex-1 overflow-y-auto p-3 space-y-2.5 overscroll-contain cer-modal-scrollable"
              style={{ overscrollBehavior: "contain" }}
            >
              {isLoading ? (
                <div className="py-12 text-center text-slate-500 text-sm space-y-2">
                  <div className="w-6 h-6 border-2 border-[#012964] border-t-transparent rounded-full animate-spin mx-auto" />
                  <p className="font-medium">Loading versions...</p>
                </div>
              ) : sortedHistory.length === 0 ? (
                <div className="p-6 text-center space-y-2 bg-white rounded-xl border border-slate-200/80">
                  <History className="w-8 h-8 text-slate-400 mx-auto" />
                  <p className="font-bold text-slate-700 text-sm">No Prior Versions</p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    No historical versions have been archived for this proposal yet.
                  </p>
                </div>
              ) : (
                sortedHistory.map((prop, idx) => {
                  const serialNo = sortedHistory.length - idx;
                  const revNum = sortedHistory.length - idx;
                  const effectiveNo = prop.proposal_no || prop.cerprno;
                  const isSelected = activeVersionIndex === idx;

                  return (
                    <div
                      key={prop.id ? `hist-${prop.id}` : `hist-${effectiveNo}-${idx}`}
                      onClick={() => setSelectedVersionIndex(idx)}
                      className={`p-3.5 rounded-xl transition-all cursor-pointer relative ${
                        isSelected
                          ? "bg-white border-2 border-[#012964] shadow-xs ring-1 ring-[#012964]/10"
                          : "bg-white/90 hover:bg-white border border-slate-200/90 hover:border-slate-300 shadow-2xs"
                      }`}
                    >
                      {/* Top Header: Serial No & Status */}
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-xs sm:text-[13px] font-bold px-2.5 py-0.5 rounded-md ${
                              isSelected
                                ? "bg-[#012964] text-white"
                                : "bg-slate-100 text-slate-700 border border-slate-200"
                            }`}
                          >
                            Serial No. {serialNo}
                          </span>
                          <span className="text-xs font-semibold text-slate-500">
                            v{revNum} Snapshot
                          </span>
                        </div>
                        <StatusBadge status="Approved" size="sm" />
                      </div>

                      {/* Proposal No Reference */}
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-sm sm:text-[15px] text-[#012964]">
                          {effectiveNo}
                        </span>
                      </div>

                      {/* Metadata: Amount & Archive Date */}
                      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs sm:text-[13px] text-slate-600">
                        <span className="font-bold text-slate-900">
                          {prop.currency || "USD"} {Number(prop.amount || 0).toLocaleString()}
                        </span>
                        <div className="flex items-center gap-1 text-slate-500 text-xs">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatSnapshotDate(prop.modified_date || prop.created_date)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ========================================================================================= */}
          {/* RIGHT PANEL (~75% width on desktop): Complete Read-Only Proposal Data */}
          {/* ========================================================================================= */}
          <div
            className="flex-1 min-w-0 overflow-y-auto bg-slate-50/40 p-4 sm:p-5 lg:p-6 space-y-4 overscroll-contain cer-modal-scrollable"
            style={{
              flex: 1,
              minWidth: 0,
              overflowY: "auto",
              overscrollBehavior: "contain",
            }}
          >
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {isLoading ? (
              <div className="py-24 text-center text-slate-500 text-sm space-y-2">
                <div className="w-7 h-7 border-2 border-[#012964] border-t-transparent rounded-full animate-spin mx-auto" />
                <p className="font-medium">Loading proposal snapshot...</p>
              </div>
            ) : !selectedProposal ? (
              <div className="bg-white rounded-2xl border border-slate-200/90 p-12 text-center space-y-3 shadow-2xs">
                <div className="w-14 h-14 rounded-full bg-blue-50 text-[#012964] border border-blue-200 flex items-center justify-center mx-auto">
                  <History className="w-7 h-7 text-[#012964]" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-800 text-base">No Historical Snapshots Available</h4>
                  <p className="text-sm text-slate-500 max-w-lg mx-auto mt-1 leading-relaxed">
                    This proposal is currently in its initial cycle without previous approved versions. Historical versions are archived whenever post-approval amendments are processed.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {/* 1. Executive Proposal Summary Card */}
                <div className="p-4 sm:p-5 bg-white rounded-2xl border border-slate-200/80 shadow-subtle space-y-3">
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Historical Snapshot Reference
                      </p>
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span
                          className="text-xl sm:text-2xl font-bold font-mono text-slate-900 tracking-tight"
                          title="System-generated CER Proposal ID"
                        >
                          {selectedProposal.cer_proposal_id || selectedProposal.cerprno}
                        </span>
                        {selectedProposal.proposal_no &&
                          selectedProposal.proposal_no !==
                            (selectedProposal.cer_proposal_id || selectedProposal.cerprno) && (
                            <span
                              className="inline-flex items-center px-2.5 py-0.5 rounded text-xs sm:text-[13px] font-mono font-bold bg-slate-100 text-slate-800 border border-slate-200"
                              title="Business Reference Proposal Number"
                            >
                              No: {selectedProposal.proposal_no}
                            </span>
                          )}
                        <StatusBadge status="Approved" size="sm" />
                        {selectedProposal.cat && (
                          <CategoryBadge category={selectedProposal.cat} />
                        )}
                      </div>
                    </div>

                    {/* Sanction Amount */}
                    <div className="text-left md:text-right shrink-0">
                      <p className="text-xs sm:text-[13px] font-semibold text-slate-500">Approved Sanction Amount</p>
                      <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-0.5">
                        {selectedProposal.currency} {Number(selectedProposal.amount || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {/* Project Title */}
                  <div className="pt-0.5 pb-1">
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900 leading-snug">
                      {selectedProposal.pr_name}
                    </h1>
                  </div>

                  {/* Metadata Row */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 py-3 border-y border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <UserAvatar name={selectedProposal.owname} email={selectedProposal.owner_email} size="sm" />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Project Owner</p>
                        <p className="font-bold text-slate-900 text-sm sm:text-[15px] truncate" title={selectedProposal.owname}>
                          {selectedProposal.owname}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 lg:border-l lg:border-slate-150 lg:pl-3.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0">
                        <Layers className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Block / SBU</p>
                        <p className="font-bold text-slate-900 text-sm sm:text-[15px] truncate">{selectedProposal.sbu}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 lg:border-l lg:border-slate-150 lg:pl-3.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0">
                        <Calendar className="w-4 h-4 text-slate-500" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Duration</p>
                        <p className="font-bold text-slate-900 text-sm sm:text-[15px] truncate">{durationDisplay}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5 lg:border-l lg:border-slate-150 lg:pl-3.5">
                      <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-200/80 flex items-center justify-center shrink-0">
                        <Clock className="w-4 h-4 text-emerald-600" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Archived Date</p>
                        <p className="font-bold text-slate-900 text-sm sm:text-[15px] truncate">
                          {formatSnapshotDate(selectedProposal.modified_date || selectedProposal.created_date)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. Section A & B: Project Details & Financials */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Section A: Project Details */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                      <FolderGit2 className="w-5 h-5 text-[#012964]" />
                      <h3 className="font-bold text-slate-900 text-lg">
                        Project Details
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="col-span-2">
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Name of Project</p>
                        <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{selectedProposal.pr_name}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">CER Proposal No.</p>
                        <p className="font-mono font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">
                          {selectedProposal.proposal_no || selectedProposal.cerprno}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">CER Proposal ID</p>
                        <p className="font-mono font-bold text-[#012964] text-sm sm:text-[15px] mt-0.5">
                          {selectedProposal.cer_proposal_id || selectedProposal.cerprno}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">CER Owner Name</p>
                        <div className="flex items-center gap-2 mt-1">
                          <UserAvatar
                            name={selectedProposal.owname}
                            email={selectedProposal.owner_email}
                            size="xs"
                          />
                          <span className="font-bold text-slate-900 text-sm sm:text-[15px]">{selectedProposal.owname}</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Block/SBU/Field</p>
                        <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{selectedProposal.sbu}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Category</p>
                        <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{selectedProposal.cat}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Start Date of Project</p>
                        <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{selectedProposal.st_date || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Completion Date of Project</p>
                        <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{selectedProposal.com_date || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Total Duration</p>
                        <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{durationDisplay}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Owner Email</p>
                        <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5 truncate">
                          {selectedProposal.owner_email || "—"}
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Objectives of CER</p>
                        <p className="font-medium text-slate-800 text-sm mt-1 bg-slate-50 p-3 rounded-xl border border-slate-200/80 whitespace-pre-wrap leading-relaxed">
                          {selectedProposal.object || "N/A"}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section B: Financials */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                      <DollarSign className="w-5 h-5 text-emerald-600" />
                      <h3 className="font-bold text-slate-900 text-lg">
                        Financial Metrics
                      </h3>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Amount of CER</p>
                        <p className="font-extrabold text-[#012964] mt-0.5 text-lg sm:text-xl">
                          {selectedProposal.currency} {Number(selectedProposal.amount || 0).toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Payback / Non Payback</p>
                        <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{selectedProposal.payable || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Payback Period (Quarters)</p>
                        <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">
                          {selectedProposal.payback_quarters ? `${selectedProposal.payback_quarters} Quarters` : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Financial Benefits – NPV ($mm)</p>
                        <p className="font-bold text-[#012964] mt-0.5 text-base">
                          {selectedProposal.ben_npv ? `$${selectedProposal.ben_npv} mm` : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Financial Benefit – IRR (%)</p>
                        <p className="font-bold text-[#012964] mt-0.5 text-base">
                          {selectedProposal.ben_irr ? `${selectedProposal.ben_irr}%` : "N/A"}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Revisions Count</p>
                        <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{selectedProposal.revision_count || 0}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Key Assumptions to Financial Benefit / Costs</p>
                        <p className="font-medium text-slate-800 text-sm mt-1 bg-slate-50 p-3 rounded-xl border border-slate-200/80 whitespace-pre-wrap leading-relaxed">
                          {selectedProposal.cost_assumptions || "None recorded."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 3. Section C: Expenditure Phasing Matrix */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <BarChart2 className="w-5 h-5 text-[#012964]" />
                      <h3 className="font-bold text-slate-900 text-lg">
                        Expenditure Phasing
                      </h3>
                    </div>
                    <span className="text-xs sm:text-[13px] font-bold text-[#012964] bg-blue-50/80 px-3 py-1 rounded-full border border-blue-200">
                      Indian FY ({period2Display})
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-700 font-bold bg-slate-100/80">
                          <th className="py-3 px-4">Expenditure Stream</th>
                          <th className="py-3 px-4 text-right">{period1Display}</th>
                          <th className="py-3 px-4 text-right">{period2Display}</th>
                          <th className="py-3 px-4 text-right">{period3Display}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-800">Production (in mmbbls)</td>
                          <td className="py-2.5 px-4 text-right font-medium text-slate-700">{Number(selectedProposal.prod_till || 0).toLocaleString()}</td>
                          <td className="py-2.5 px-4 text-right font-medium text-slate-700">{Number(selectedProposal.prod_fy || 0).toLocaleString()}</td>
                          <td className="py-2.5 px-4 text-right font-medium text-slate-700">{Number(selectedProposal.prod_beyond || 0).toLocaleString()}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-800">Capex ($mm)</td>
                          <td className="py-2.5 px-4 text-right font-medium text-slate-700">{Number(selectedProposal.capex_till || 0).toLocaleString()}</td>
                          <td className="py-2.5 px-4 text-right font-medium text-slate-700">{Number(selectedProposal.capex_fy || 0).toLocaleString()}</td>
                          <td className="py-2.5 px-4 text-right font-medium text-slate-700">{Number(selectedProposal.capex_beyond || 0).toLocaleString()}</td>
                        </tr>
                        <tr className="hover:bg-slate-50/50 transition-colors">
                          <td className="py-2.5 px-4 font-semibold text-slate-800">Opex ($mm)</td>
                          <td className="py-2.5 px-4 text-right font-medium text-slate-700">{Number(selectedProposal.opex_till || 0).toLocaleString()}</td>
                          <td className="py-2.5 px-4 text-right font-medium text-slate-700">{Number(selectedProposal.opex_fy || 0).toLocaleString()}</td>
                          <td className="py-2.5 px-4 text-right font-medium text-slate-700">{Number(selectedProposal.opex_beyond || 0).toLocaleString()}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 4. Section D: CAPEX Cost Estimates Basis */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <Calculator className="w-5 h-5 text-[#012964]" />
                      <h3 className="font-bold text-slate-900 text-lg">
                        Cost Breakdown
                      </h3>
                    </div>
                    <span className="text-xs sm:text-[13px] font-semibold text-slate-500">
                      Values in {isINR ? "INR (₹)" : "USD ($mm)"}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-semibold block text-xs sm:text-[13px]">Engineering</span>
                      <span className="font-bold text-slate-900 mt-1 block text-sm sm:text-base font-mono">
                        {currSymbol}{Number(selectedProposal.engineer || 0).toLocaleString()}{currUnit}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-semibold block text-xs sm:text-[13px]">Surface Facilities</span>
                      <span className="font-bold text-slate-900 mt-1 block text-sm sm:text-base font-mono">
                        {currSymbol}{Number(selectedProposal.s_fac || 0).toLocaleString()}{currUnit}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-semibold block text-xs sm:text-[13px]">Commissioning</span>
                      <span className="font-bold text-slate-900 mt-1 block text-sm sm:text-base font-mono">
                        {currSymbol}{Number(selectedProposal.comis || 0).toLocaleString()}{currUnit}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-semibold block text-xs sm:text-[13px]">Pre Operations</span>
                      <span className="font-bold text-slate-900 mt-1 block text-sm sm:text-base font-mono">
                        {currSymbol}{Number(selectedProposal.preop || 0).toLocaleString()}{currUnit}
                      </span>
                    </div>
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <span className="text-slate-500 font-semibold block text-xs sm:text-[13px]">Others</span>
                      <span className="font-bold text-slate-900 mt-1 block text-sm sm:text-base font-mono">
                        {currSymbol}{Number(selectedProposal.others || 0).toLocaleString()}{currUnit}
                      </span>
                    </div>
                    <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200">
                      <span className="text-[#012964] font-bold block text-xs sm:text-[13px]">Total Capex</span>
                      <span className="font-extrabold text-[#012964] mt-1 block text-base sm:text-lg font-mono">
                        {currSymbol}{Number(selectedProposal.total || 0).toLocaleString()}{currUnit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 5. Section E & F: Corporate Budget & Joint Venture */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Section E */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                      <Landmark className="w-5 h-5 text-slate-700" />
                      <h3 className="font-bold text-slate-900 text-lg">
                        Corporate Budget
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Corporate Budget (Yes/No)</p>
                        <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{selectedProposal.cbudget || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Corporate Budget Amount ($mm)</p>
                        <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">
                          ${Number(selectedProposal.cb_amnt || 0).toLocaleString()} mm
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Reason if not / partially budgeted</p>
                        <p className="font-medium text-slate-800 text-sm mt-1 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                          {selectedProposal.reason || "Within standard budgetary envelope."}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Section F */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
                    <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                      <DollarSign className="w-5 h-5 text-slate-700" />
                      <h3 className="font-bold text-slate-900 text-lg">
                        Joint Venture Details
                      </h3>
                    </div>
                    <div className="grid grid-cols-2 gap-3.5">
                      <div>
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Aligned with JV</p>
                        <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{selectedProposal.jv || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">JV Cost Recoverable</p>
                        <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{selectedProposal.jv_recoverable || "No"}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">JV Budget</p>
                        <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">{selectedProposal.jv_budget || "—"}</p>
                      </div>
                      <div>
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">JV Budget Amount ($mm)</p>
                        <p className="font-bold text-slate-900 text-sm sm:text-[15px] mt-0.5">
                          ${Number(selectedProposal.jv_amnt || 0).toLocaleString()} mm
                        </p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs sm:text-[13px] text-slate-500 font-semibold">Reason if not / partially budgeted</p>
                        <p className="font-medium text-slate-800 text-sm mt-1 bg-slate-50 p-3 rounded-xl border border-slate-200/80 leading-relaxed">
                          {selectedProposal.jv_reason || "Approved by Operating Committee / TCM."}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 6. Section G: Remarks and Justification */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
                  <div className="flex items-center gap-2.5 pb-2.5 border-b border-slate-100">
                    <MessageSquare className="w-5 h-5 text-[#012964]" />
                    <h3 className="font-bold text-slate-900 text-lg">
                      Remarks & Justification
                    </h3>
                  </div>
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 text-sm text-slate-800 leading-relaxed space-y-3">
                    <div>
                      <p className="font-bold text-slate-900 mb-1 text-sm">
                        Remarks (including justification for Non Payback expenditure, etc.):
                      </p>
                      <p className="whitespace-pre-wrap">{selectedProposal.remarks || "No narrative remarks provided."}</p>
                    </div>
                    {selectedProposal.remarks_jv && (
                      <div className="pt-3 border-t border-slate-200">
                        <p className="font-bold text-slate-900 mb-1 text-sm">
                          Remarks on JV Risk (including risk carrying period):
                        </p>
                        <p className="whitespace-pre-wrap">{selectedProposal.remarks_jv}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* 7. Section H: Supporting Attachments */}
                <div className="bg-white rounded-2xl border border-slate-200/80 p-4 sm:p-5 shadow-subtle space-y-3">
                  <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                      <Paperclip className="w-5 h-5 text-slate-700" />
                      <h3 className="font-bold text-slate-900 text-lg">
                        Attachments ({selectedAttachments.length})
                      </h3>
                    </div>
                    {isLoadingAttachments && (
                      <span className="text-xs text-slate-400 font-medium animate-pulse">
                        Loading documents...
                      </span>
                    )}
                  </div>

                  {selectedAttachments.length === 0 ? (
                    <p className="text-slate-500 text-sm py-2 italic font-medium">
                      No attachments.
                    </p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedAttachments.map((att) => (
                        <div
                          key={att.id}
                          className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 hover:bg-slate-100/60 transition-colors"
                        >
                          <div className="truncate">
                            <p className="font-bold text-slate-900 truncate text-sm" title={att.name}>
                              {att.name}
                            </p>
                            <p className="text-xs text-slate-500 font-medium mt-0.5">
                              {((att.size || 0) / 1024).toFixed(0)} KB • by {att.uploaded_by || "User"}
                            </p>
                          </div>
                          {(att.server_relative_url || att.data_url) && (
                            <a
                              href={att.server_relative_url || att.data_url}
                              download={att.name}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs sm:text-[13px] font-semibold text-[#012964] bg-white border border-[#012964]/30 rounded-lg hover:bg-blue-50 transition-colors shrink-0 shadow-2xs"
                            >
                              <Download className="w-3.5 h-3.5" />
                              <span>Download</span>
                            </a>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
export default ProposalHistoryModal;
