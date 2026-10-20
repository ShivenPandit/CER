import React, { useState, useEffect } from "react";
import { History, Search, CheckCircle2, XCircle, Eye } from "lucide-react";
import { IApprovalDecision } from "../../models/WorkflowModel";
import { ICERProposal } from "../../models/CERModel";
import { ICERDataService } from "../../services/ICERDataService";
import { useDynamicPagination } from "../../hooks/useDynamicPagination";
import { DataTablePagination } from "../common/DataTablePagination";

interface IApprovalHistoryViewProps {
  dataService: ICERDataService;
  proposals: ICERProposal[];
  onNavigateToDisplay: (cerprno: string) => void;
}

export const ApprovalHistoryView: React.FC<IApprovalHistoryViewProps> = ({
  dataService,
  proposals,
  onNavigateToDisplay,
}) => {
  const [decisions, setDecisions] = useState<IApprovalDecision[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  const loadDecisions = async (): Promise<void> => {
    setIsLoading(true);
    try {
      const results: IApprovalDecision[] = [];
      for (const p of proposals) {
        const decs = await dataService.getApprovalDecisions(p.cerprno);
        results.push(...decs);
      }
      results.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setDecisions(results);
    } catch (e) {
      console.error("Error loading approval history:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDecisions().catch((e) => console.error(e));
  }, []);

  const filteredDecisions = decisions.filter((d) => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return (
      d.cerprno.toLowerCase().includes(q) ||
      d.approver_name.toLowerCase().includes(q) ||
      d.level_name.toLowerCase().includes(q) ||
      d.comments.toLowerCase().includes(q)
    );
  });

  // Fully Automatic Dynamic Table Pagination
  const pagination = useDynamicPagination({
    totalItems: filteredDecisions.length,
    defaultRowHeight: 46,
    bufferBottom: 32,
  });

  const visibleDecisions = pagination.paginateItems(filteredDecisions);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            Workflow Decision History & Audit Trail
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable log of all reviewer approvals, endorsements, and rejections
          </p>
        </div>

        <div className="relative w-full sm:w-auto">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              pagination.setCurrentPage(1);
            }}
            placeholder="Search by proposal or reviewer..."
            className="w-full sm:w-64 pl-8 pr-3 py-2 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
          />
        </div>
      </div>

      {/* Grid Container */}
      <div
        ref={pagination.tableContainerRef}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden flex flex-col"
      >
        {/* Desktop / Tablet Table */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider select-none">
                <th className="py-2.5 px-3 w-[125px]">Proposal No</th>
                <th className="py-2.5 px-3 w-[180px]">Stage / Approval Level</th>
                <th className="py-2.5 px-2.5 w-[140px]">Approver Name</th>
                <th className="py-2.5 px-2 text-center w-[110px]">Decision</th>
                <th className="py-2.5 px-3">Reviewer Comments</th>
                <th className="py-2.5 px-3 w-[145px]">Date & Time</th>
                <th className="py-2.5 px-3 text-right w-[80px]">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleDecisions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-slate-400 text-xs">
                    {isLoading ? "Loading decision history..." : "No approval decisions recorded yet."}
                  </td>
                </tr>
              ) : (
                visibleDecisions.map((dec) => {
                  const isApproved = dec.decision === "APPROVED";

                  return (
                    <tr
                      key={dec.id}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                        <button
                          onClick={() => onNavigateToDisplay(dec.cerprno)}
                          className="hover:text-blue-600 transition-colors"
                        >
                          {dec.cerprno}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-slate-800 whitespace-nowrap">
                        Level {dec.level_id}: {dec.level_name}
                      </td>
                      <td className="py-2.5 px-2.5 text-slate-700 font-medium truncate max-w-[140px]">
                        {dec.approver_name}
                      </td>
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                            isApproved
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-rose-50 text-rose-700 border border-rose-200"
                          }`}
                        >
                          {isApproved ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <XCircle className="w-3 h-3 text-rose-600" />
                          )}
                          {dec.decision}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 max-w-xs truncate" title={dec.comments}>
                        "{dec.comments || "No comments"}"
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 whitespace-nowrap">
                        {new Date(dec.timestamp).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => onNavigateToDisplay(dec.cerprno)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Display Proposal"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile View (< 640px) */}
        <div className="sm:hidden divide-y divide-slate-100">
          {visibleDecisions.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs px-4">
              {isLoading ? "Loading decision history..." : "No approval decisions recorded yet."}
            </div>
          ) : (
            visibleDecisions.map((dec) => {
              const isApproved = dec.decision === "APPROVED";

              return (
                <div key={dec.id} className="p-4 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                      {dec.cerprno}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                        isApproved
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : "bg-rose-50 text-rose-700 border border-rose-200"
                      }`}
                    >
                      {isApproved ? (
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <XCircle className="w-3 h-3 text-rose-600" />
                      )}
                      {dec.decision}
                    </span>
                  </div>

                  <div>
                    <p className="font-semibold text-xs text-slate-900">
                      Level {dec.level_id}: {dec.level_name}
                    </p>
                    <p className="text-[11px] text-slate-500">
                      By {dec.approver_name} •{" "}
                      {new Date(dec.timestamp).toLocaleDateString("en-GB", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </p>
                  </div>

                  {dec.comments && (
                    <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                      "{dec.comments}"
                    </p>
                  )}

                  <div className="flex justify-end pt-1">
                    <button
                      onClick={() => onNavigateToDisplay(dec.cerprno)}
                      className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg flex items-center gap-1.5 text-xs transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Display CER</span>
                    </button>
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
          totalItems={filteredDecisions.length}
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
          itemName="decisions"
        />
      </div>
    </div>
  );
};
