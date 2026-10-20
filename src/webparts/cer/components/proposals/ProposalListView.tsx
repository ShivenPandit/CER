import React, { useState } from "react";
import {
  Search,
  Eye,
  Edit,
  FileDown,
  FileSpreadsheet,
  PlusCircle,
} from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { IAppUser } from "../../models/UserModel";
import { StatusBadge } from "../common/StatusBadge";
import { CategoryBadge } from "../common/CategoryBadge";
import { PDFExportService } from "../../services/PDFExportService";
import { ExcelExportService } from "../../services/ExcelExportService";
import { useDynamicPagination } from "../../hooks/useDynamicPagination";
import { DataTablePagination } from "../common/DataTablePagination";

interface IProposalListViewProps {
  proposals: ICERProposal[];
  currentUser: IAppUser;
  mode: "my" | "all";
  onNavigateToCreate: () => void;
  onNavigateToDisplay: (cerprno: string) => void;
  onNavigateToChange: (cerprno: string) => void;
}

export const ProposalListView: React.FC<IProposalListViewProps> = ({
  proposals,
  currentUser,
  mode,
  onNavigateToCreate,
  onNavigateToDisplay,
  onNavigateToChange,
}) => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredProposals = proposals.filter((p) => {
    // Mode filter
    if (mode === "my") {
      const isOwner =
        p.owname.toLowerCase() === currentUser.name.toLowerCase() ||
        p.owner_email.toLowerCase() === currentUser.email.toLowerCase();
      if (!isOwner) return false;
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return p.cerprno.toLowerCase().includes(q) || p.pr_name.toLowerCase().includes(q);
    }
    return true;
  });

  // Fully Automatic Dynamic Table Pagination
  const pagination = useDynamicPagination({
    totalItems: filteredProposals.length,
    defaultRowHeight: 46,
    bufferBottom: 32,
  });

  const visibleProposals = pagination.paginateItems(filteredProposals);

  const handleDownloadPDF = async (prop: ICERProposal) => {
    try {
      await PDFExportService.generateCERPdf(prop, []);
    } catch (e: any) {
      alert("Error generating PDF: " + e.message);
    }
  };

  const handleDownloadExcel = (prop: ICERProposal) => {
    try {
      ExcelExportService.exportSingleProposal(prop);
    } catch (e: any) {
      alert("Error generating Excel: " + e.message);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header & Controls Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
            {mode === "my" ? "My CER Proposals" : "All Capital Expenditure Requests"}
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            {mode === "my"
              ? "Proposals initiated by you, current approval statuses, and revisions"
              : "Enterprise-wide capital expenditure proposals across all Strategic Business Units"}
          </p>
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
              placeholder="Filter proposals..."
              className="w-full sm:w-56 pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {(currentUser.role === "Initiator" || currentUser.role === "Admin") && (
            <button
              onClick={onNavigateToCreate}
              className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/20 transition-all hover:scale-[1.02] shrink-0"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create CER</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Container with ResizeObserver ref */}
      <div
        ref={pagination.tableContainerRef}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden flex flex-col"
      >
        {/* Desktop & Tablet Table View (hidden on small mobile screens < 640px) */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse table-fixed">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200 text-slate-500 font-semibold uppercase text-[10px] tracking-wider select-none">
                <th className="py-2.5 px-3 w-[125px]">Proposal No</th>
                <th className="py-2.5 px-3">Project Name</th>
                <th className="py-2.5 px-2.5 w-[120px] 2xl:w-[160px]">Owner</th>
                <th className="py-2.5 px-2 w-[75px] 2xl:w-[90px]">SBU</th>
                <th className="py-2.5 px-2 w-[85px] 2xl:w-[100px]">Category</th>
                <th className="py-2.5 px-3 text-right w-[125px] 2xl:w-[150px]">Amount</th>
                <th className="py-2.5 px-2 text-center w-[95px] 2xl:w-[110px]">Status</th>
                <th className="py-2.5 px-2.5 w-[165px] xl:w-[210px] 2xl:w-[240px]">Pending Level</th>
                <th className="py-2.5 px-3 text-right w-[135px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {visibleProposals.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 text-xs">
                    No proposals found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                visibleProposals.map((prop) => (
                  <tr
                    key={prop.id}
                    className="hover:bg-slate-50/80 transition-colors group"
                  >
                    <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      <button
                        onClick={() => onNavigateToDisplay(prop.cerprno)}
                        className="hover:text-blue-600 transition-colors text-left"
                        title="Display CER Proposal"
                      >
                        {prop.cerprno}
                      </button>
                    </td>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      <span className="truncate block" title={prop.pr_name}>
                        {prop.pr_name}
                      </span>
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-600">
                      <span className="truncate block max-w-[120px] 2xl:max-w-none" title={prop.owname}>
                        {prop.owname}
                      </span>
                    </td>
                    <td className="py-2.5 px-2 text-slate-600 whitespace-nowrap">
                      {prop.sbu}
                    </td>
                    <td className="py-2.5 px-2 whitespace-nowrap">
                      <CategoryBadge category={prop.cat} />
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-slate-900 whitespace-nowrap">
                      {prop.currency} {prop.amount.toLocaleString()}
                    </td>
                    <td className="py-2.5 px-2 text-center whitespace-nowrap">
                      <StatusBadge status={prop.status} size="sm" />
                    </td>
                    <td className="py-2.5 px-2.5 text-slate-500">
                      <span
                        className="truncate block max-w-[165px] xl:max-w-none"
                        title={
                          prop.status === "Approved"
                            ? "Approved"
                            : `L${prop.current_level} - ${prop.pending_with_role}`
                        }
                      >
                        {prop.status === "Approved" ? (
                          <span className="text-emerald-700 font-semibold">Approved</span>
                        ) : (
                          `L${prop.current_level} - ${prop.pending_with_role}`
                        )}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => onNavigateToDisplay(prop.cerprno)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
                          title="Display CER (FR-03)"
                          aria-label={`Display CER ${prop.cerprno}`}
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {(currentUser.role === "Initiator" || currentUser.role === "Admin") && (
                          <button
                            onClick={() => onNavigateToChange(prop.cerprno)}
                            className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Change CER (FR-02)"
                            aria-label={`Change CER ${prop.cerprno}`}
                          >
                            <Edit className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleDownloadPDF(prop)}
                          className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                          title="Download PDF"
                          aria-label={`Download PDF ${prop.cerprno}`}
                        >
                          <FileDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDownloadExcel(prop)}
                          className="p-1.5 text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="Download Excel"
                          aria-label={`Download Excel ${prop.cerprno}`}
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Adaptive Cards View (active on < 640px) */}
        <div className="sm:hidden divide-y divide-slate-100">
          {visibleProposals.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-xs px-4">
              No proposals found matching your filter criteria.
            </div>
          ) : (
            visibleProposals.map((prop) => (
              <div key={prop.id} className="p-4 space-y-2.5 hover:bg-slate-50/60 transition-colors">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                    {prop.cerprno}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <CategoryBadge category={prop.cat} />
                    <StatusBadge status={prop.status} size="sm" />
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-slate-900 text-xs leading-snug">
                    {prop.pr_name}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    {prop.owname} • SBU: {prop.sbu}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Amount
                    </span>
                    <span className="font-bold text-slate-900">
                      {prop.currency} {prop.amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">
                      Pending
                    </span>
                    <span className="text-slate-600 text-[11px]">
                      {prop.status === "Approved" ? "Approved" : `L${prop.current_level} Review`}
                    </span>
                  </div>
                </div>

                {/* Mobile Actions Bar */}
                <div className="flex items-center justify-end gap-1.5 pt-1">
                  <button
                    onClick={() => onNavigateToDisplay(prop.cerprno)}
                    className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-lg text-center flex items-center justify-center gap-1 text-[11px] transition-colors"
                  >
                    <Eye className="w-3 h-3" />
                    <span>View</span>
                  </button>
                  {(currentUser.role === "Initiator" || currentUser.role === "Admin") && (
                    <button
                      onClick={() => onNavigateToChange(prop.cerprno)}
                      className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold rounded-lg text-center flex items-center justify-center gap-1 text-[11px] transition-colors"
                    >
                      <Edit className="w-3 h-3" />
                      <span>Edit</span>
                    </button>
                  )}
                  <button
                    onClick={() => handleDownloadPDF(prop)}
                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-center transition-colors"
                    title="PDF"
                  >
                    <FileDown className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => handleDownloadExcel(prop)}
                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-center transition-colors"
                    title="Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Reusable Dynamic Table Pagination Footer */}
        <DataTablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={filteredProposals.length}
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
          itemName="proposals"
        />
      </div>
    </div>
  );
};
