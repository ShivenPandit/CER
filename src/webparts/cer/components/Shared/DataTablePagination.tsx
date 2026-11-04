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
  const safeCurrent = Number.isFinite(currentPage) && currentPage >= 1 ? Math.floor(currentPage) : 1;
  const safeTotal = Number.isFinite(totalPages) && totalPages >= 1 ? Math.floor(totalPages) : 1;

  if (safeTotal <= 7) {
    return Array.from({ length: safeTotal }, (_, i) => i + 1);
  }

  if (safeCurrent <= 4) {
    return [1, 2, 3, 4, 5, "...", safeTotal];
  }

  if (safeCurrent >= safeTotal - 3) {
    return [1, "...", safeTotal - 4, safeTotal - 3, safeTotal - 2, safeTotal - 1, safeTotal];
  }

  return [1, "...", safeCurrent - 1, safeCurrent, safeCurrent + 1, "...", safeTotal];
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
  const safeTotalItems = Number.isFinite(totalItems) && totalItems >= 0 ? totalItems : 0;
  const safeStartIndex = Number.isFinite(startIndex) ? Math.max(0, startIndex) : 0;
  const safeEndIndex = Number.isFinite(endIndex)
    ? Math.max(safeStartIndex, endIndex)
    : safeTotalItems;

  const pageNumbers = useMemo(
    () => getPageNumbers(currentPage, totalPages),
    [currentPage, totalPages]
  );

  if (safeTotalItems === 0) {
    return null;
  }

  return (
    <div
      data-role="pagination-footer"
      className="px-4 py-2.5 border-t border-slate-200/80 bg-slate-50/90 flex flex-col sm:flex-row items-center justify-between gap-2.5 text-sm select-none"
    >
      {/* Left: Record Range Summary (e.g. Showing 1–9 of 364 records) */}
      <div className="text-slate-700 font-medium text-center sm:text-left text-sm">
        Showing{" "}
        <strong className="text-slate-900 font-bold">
          {safeTotalItems > 0 ? safeStartIndex + 1 : 0}
        </strong>
        –
        <strong className="text-slate-900 font-bold">{safeEndIndex}</strong> of{" "}
        <strong className="text-slate-900 font-bold">{safeTotalItems}</strong> {itemName}
      </div>

      {/* Right: Numbered Page Navigation */}
      <div className="flex items-center gap-1.5 flex-wrap justify-center">
        {/* First Page */}
        <button
          onClick={onFirstPage}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
          title="First page"
          aria-label="First page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          onClick={onPrevPage}
          disabled={currentPage <= 1}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
          title="Previous page"
          aria-label="Previous page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Numbered Page Buttons with Ellipsis */}
        <div className="flex items-center gap-1 mx-0.5">
          {pageNumbers.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="px-1 text-slate-400 font-bold text-sm select-none"
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
                className={`min-w-[32px] h-8 px-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-colors flex items-center justify-center cursor-pointer ${
                  isCurrent
                    ? "bg-[#012964] text-white shadow-2xs"
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
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
          title="Next page"
          aria-label="Next page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          onClick={onLastPage}
          disabled={currentPage >= totalPages}
          className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-2xs cursor-pointer"
          title="Last page"
          aria-label="Last page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
