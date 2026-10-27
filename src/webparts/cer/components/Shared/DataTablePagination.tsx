import React, { useMemo } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

interface IDataTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  startIndex: number;
  endIndex: number;
  pageSizeSetting?: any;
  effectivePageSize?: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (setting: any) => void;
  onPrevPage: () => void;
  onNextPage: () => void;
  onFirstPage: () => void;
  onLastPage: () => void;
  itemName?: string;
}

/**
 * Calculates page numbers to display with smart ellipsis for compact enterprise pagination
 */
function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  if (currentPage <= 4) {
    return [1, 2, 3, 4, 5, "...", totalPages];
  }

  if (currentPage >= totalPages - 3) {
    return [1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
  }

  return [1, "...", currentPage - 1, currentPage, currentPage + 1, "...", totalPages];
}

export const DataTablePagination: React.FC<IDataTablePaginationProps> = ({
  currentPage,
  totalPages,
  totalItems,
  startIndex,
  endIndex,
  onPageChange,
  onPrevPage,
  onNextPage,
  onFirstPage,
  onLastPage,
  itemName = "records",
}) => {
  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages]
  );

  if (totalItems === 0) {
    return null;
  }

  return (
    <div
      data-role="pagination-footer"
      className="px-4 py-2.5 border-t border-slate-200/80 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-xs select-none"
    >
      {/* Left: Record Range Summary (e.g. Showing 1–9 of 364 records) */}
      <div className="text-slate-500 font-medium text-center sm:text-left text-xs">
        Showing{" "}
        <strong className="text-slate-800 font-semibold">
          {totalItems > 0 ? startIndex + 1 : 0}
        </strong>
        –
        <strong className="text-slate-800 font-semibold">{endIndex}</strong> of{" "}
        <strong className="text-slate-900 font-bold">{totalItems}</strong> {itemName}
      </div>

      {/* Right: Numbered Page Navigation */}
      <div className="flex items-center gap-1 flex-wrap justify-center">
        {/* First Page */}
        <button
          onClick={onFirstPage}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs"
          title="First page"
          aria-label="First page"
        >
          <ChevronsLeft className="w-3.5 h-3.5" />
        </button>

        {/* Previous Page */}
        <button
          onClick={onPrevPage}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs"
          title="Previous page"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        {/* Numbered Page Buttons with Ellipsis */}
        <div className="flex items-center gap-1 mx-0.5">
          {pageNumbers.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1 text-slate-400 font-bold text-xs select-none"
                >
                  …
                </span>
              );
            }

            const isCurrent = p === currentPage;
            return (
              <button
                key={`page-${p}`}
                onClick={() => onPageChange(p as number)}
                className={`min-w-[28px] h-7 px-2 rounded-lg font-semibold text-xs transition-colors flex items-center justify-center ${
                  isCurrent
                    ? "bg-blue-600 text-white shadow-2xs"
                    : "bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900 border border-slate-200 shadow-2xs"
                }`}
                aria-label={`Page ${p}`}
                aria-current={isCurrent ? "page" : undefined}
              >
                {p}
              </button>
            );
          })}
        </div>

        {/* Next Page */}
        <button
          onClick={onNextPage}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs"
          title="Next page"
          aria-label="Next page"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>

        {/* Last Page */}
        <button
          onClick={onLastPage}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs"
          title="Last page"
          aria-label="Last page"
        >
          <ChevronsRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
