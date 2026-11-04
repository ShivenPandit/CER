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
  const safeTotalItems = Number.isFinite(totalItems) && totalItems >= 0 ? Math.floor(totalItems) : 0;
  const safeCurrent = Number.isFinite(currentPage) && currentPage >= 1 ? Math.floor(currentPage) : 1;
  const safeTotal = Number.isFinite(totalPages) && totalPages >= 1 ? Math.floor(totalPages) : 1;
  const safeStartIndex = Number.isFinite(startIndex) ? Math.max(0, Math.floor(startIndex)) : 0;
  const safeEndIndex = Number.isFinite(endIndex)
    ? Math.min(safeTotalItems, Math.max(safeStartIndex, Math.floor(endIndex)))
    : safeTotalItems;

  const pageNumbers = useMemo(
    () => getPageNumbers(safeCurrent, safeTotal),
    [safeCurrent, safeTotal]
  );

  if (safeTotalItems === 0) {
    return null;
  }

  const isPrevDisabled = safeCurrent <= 1;
  const isNextDisabled = safeCurrent >= safeTotal;

  return (
    <div
      data-role="pagination-footer"
      className="px-4 py-3 sm:px-6 border-t border-slate-200/80 bg-white sm:bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs sm:text-sm select-none transition-colors"
    >
      {/* Left: Record Range Summary (e.g. Showing 1–9 of 364 records) */}
      <div className="text-xs sm:text-sm text-slate-500 font-medium text-center sm:text-left tracking-tight">
        Showing{" "}
        <span className="font-bold text-slate-900">
          {safeTotalItems > 0 ? safeStartIndex + 1 : 0}
        </span>
        –
        <span className="font-bold text-slate-900">{safeEndIndex}</span> of{" "}
        <span className="font-bold text-slate-900">{safeTotalItems}</span>{" "}
        <span className="text-slate-600">{itemName}</span>
      </div>

      {/* Right: Numbered Page Navigation */}
      <nav
        aria-label="Pagination Navigation"
        className="flex items-center gap-1 sm:gap-1.5 flex-wrap justify-center"
      >
        {/* First Page (only shown when multiple pages exist) */}
        {safeTotal > 1 && (
          <button
            type="button"
            onClick={onFirstPage}
            disabled={isPrevDisabled}
            className="h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-lg border border-slate-200/90 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none disabled:border-slate-200/60 disabled:bg-slate-50 disabled:text-slate-300 transition-all duration-150 shadow-2xs items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#012964]/20 hidden xs:inline-flex"
            title="First page"
            aria-label="First page"
          >
            <ChevronsLeft className="w-4 h-4 shrink-0" />
          </button>
        )}

        {/* Previous Page (only shown when multiple pages exist) */}
        {safeTotal > 1 && (
          <button
            type="button"
            onClick={onPrevPage}
            disabled={isPrevDisabled}
            className="h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-lg border border-slate-200/90 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none disabled:border-slate-200/60 disabled:bg-slate-50 disabled:text-slate-300 transition-all duration-150 shadow-2xs flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#012964]/20"
            title="Previous page"
            aria-label="Previous page"
          >
            <ChevronLeft className="w-4 h-4 shrink-0" />
          </button>
        )}

        {/* Numbered Page Buttons with Ellipsis */}
        <div className="flex items-center gap-1 mx-0.5">
          {pageNumbers.map((p, idx) => {
            if (p === "...") {
              return (
                <span
                  key={`ellipsis-${idx}`}
                  className="min-w-[24px] sm:min-w-[28px] h-8 sm:h-8.5 flex items-center justify-center text-slate-400 font-bold text-xs select-none"
                  aria-hidden="true"
                >
                  …
                </span>
              );
            }

            const pageNum = Number.isFinite(p) ? (p as number) : 1;
            const isCurrent = pageNum === safeCurrent;
            return (
              <button
                type="button"
                key={`page-${pageNum}-${idx}`}
                onClick={() => onPageChange(pageNum)}
                className={`min-w-[32px] sm:min-w-[34px] h-8 sm:h-8.5 px-2.5 rounded-lg font-semibold text-xs sm:text-sm transition-all duration-150 flex items-center justify-center cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-[#012964]/20 ${
                  isCurrent
                    ? "bg-[#012964] text-white border border-[#012964] shadow-xs shadow-[#012964]/25 ring-1 ring-[#012964]/20"
                    : "bg-white text-slate-700 hover:text-slate-950 hover:bg-slate-50 hover:border-slate-300 border border-slate-200/90 shadow-2xs"
                }`}
                aria-label={`Page ${pageNum}`}
                aria-current={isCurrent ? "page" : undefined}
              >
                {pageNum}
              </button>
            );
          })}
        </div>

        {/* Next Page (only shown when multiple pages exist) */}
        {safeTotal > 1 && (
          <button
            type="button"
            onClick={onNextPage}
            disabled={isNextDisabled}
            className="h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-lg border border-slate-200/90 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none disabled:border-slate-200/60 disabled:bg-slate-50 disabled:text-slate-300 transition-all duration-150 shadow-2xs flex items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#012964]/20"
            title="Next page"
            aria-label="Next page"
          >
            <ChevronRight className="w-4 h-4 shrink-0" />
          </button>
        )}

        {/* Last Page (only shown when multiple pages exist) */}
        {safeTotal > 1 && (
          <button
            type="button"
            onClick={onLastPage}
            disabled={isNextDisabled}
            className="h-8 w-8 sm:h-8.5 sm:w-8.5 rounded-lg border border-slate-200/90 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 active:bg-slate-100 disabled:opacity-30 disabled:pointer-events-none disabled:border-slate-200/60 disabled:bg-slate-50 disabled:text-slate-300 transition-all duration-150 shadow-2xs items-center justify-center cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#012964]/20 hidden xs:inline-flex"
            title="Last page"
            aria-label="Last page"
          >
            <ChevronsRight className="w-4 h-4 shrink-0" />
          </button>
        )}
      </nav>
    </div>
  );
};
