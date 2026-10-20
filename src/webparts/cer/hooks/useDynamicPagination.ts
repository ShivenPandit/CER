import { useState, useEffect, useRef, useCallback, useMemo } from "react";

export type PageSizeOption = number;

export interface IUseDynamicPaginationOptions {
  totalItems: number;
  initialPageSize?: number;
  minPageSize?: number;
  maxPageSize?: number;
  defaultRowHeight?: number;
  bufferBottom?: number;
}

export interface IUseDynamicPaginationReturn {
  currentPage: number;
  pageSizeSetting?: number;
  effectivePageSize: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  tableContainerRef: React.RefObject<HTMLDivElement>;
  setCurrentPage: (page: number | ((prev: number) => number)) => void;
  setPageSizeSetting?: (setting: number) => void;
  goToNextPage: () => void;
  goToPrevPage: () => void;
  goToFirstPage: () => void;
  goToLastPage: () => void;
  paginateItems: <T>(items: T[]) => T[];
}

/**
 * Fully automatic, container-aware dynamic pagination hook.
 * Calculates optimal page size based on available vertical space and actual rendered row heights.
 * Works completely in the background without any manual user controls or badges.
 */
export function useDynamicPagination({
  totalItems,
  initialPageSize,
  minPageSize = 5,
  maxPageSize = 100,
  defaultRowHeight = 46,
  bufferBottom = 28,
}: IUseDynamicPaginationOptions): IUseDynamicPaginationReturn {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Initial estimate based on window.innerHeight
  const getInitialEstimate = (): number => {
    if (initialPageSize && initialPageSize > 0) return initialPageSize;
    if (typeof window === "undefined") return 10;
    const vh = window.innerHeight;
    if (vh >= 1800) return 36; // 4K display
    if (vh >= 1300) return 22; // 1440p QHD display
    if (vh >= 950) return 15;  // 1080p display
    if (vh >= 800) return 11;  // 900p display
    if (vh >= 650) return 8;   // 768p laptop display
    return 6;                  // small laptop/tablet
  };

  const [effectivePageSize, setEffectivePageSize] = useState<number>(getInitialEstimate);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const lastCalculatedSizeRef = useRef<number>(effectivePageSize);
  const calculationTimerRef = useRef<number | null>(null);

  // Calculate total pages
  const totalPages = useMemo(() => {
    return Math.max(1, Math.ceil(totalItems / effectivePageSize));
  }, [totalItems, effectivePageSize]);

  // Keep currentPage within valid bounds
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    } else if (currentPage < 1 && totalItems > 0) {
      setCurrentPage(1);
    }
  }, [totalPages, currentPage, totalItems]);

  // Recalculate optimal page size based on real DOM measurements
  const recalculatePageSize = useCallback(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    try {
      const containerRect = container.getBoundingClientRect();
      const viewportHeight = window.innerHeight;

      // Skip measurement if element is hidden
      if (containerRect.height === 0 && containerRect.width === 0) return;

      // Available vertical space from top of table container to bottom of viewport (minus buffer)
      const availableHeight = Math.max(150, viewportHeight - containerRect.top - bufferBottom);

      // Measure actual rendered header height
      const thead = container.querySelector("thead") as HTMLElement | null;
      const theadHeight = thead ? thead.offsetHeight : 40;

      // Measure actual rendered pagination footer height
      const footer =
        (container.querySelector("[data-role='pagination-footer']") as HTMLElement | null) ||
        (container.querySelector(".border-t") as HTMLElement | null);
      const footerHeight = footer ? footer.offsetHeight : 46;

      // Measure actual rendered row heights (accounting for multiline cells/wrapping)
      let measuredRowHeight = defaultRowHeight;
      const tbody = container.querySelector("tbody");
      if (tbody) {
        const renderedRows = Array.from(tbody.querySelectorAll("tr")) as HTMLElement[];
        if (renderedRows.length > 0) {
          const totalRowHeights = renderedRows.reduce((sum, r) => sum + r.offsetHeight, 0);
          const avg = totalRowHeights / renderedRows.length;
          if (avg >= 30 && avg <= 200) {
            measuredRowHeight = Math.round(avg);
          }
        }
      } else {
        const listItems = container.querySelectorAll("[data-role='list-item']") as NodeListOf<HTMLElement>;
        if (listItems.length > 0) {
          const totalHeight = Array.from(listItems).reduce((sum, item) => sum + item.offsetHeight, 0);
          const avg = totalHeight / listItems.length;
          if (avg >= 40 && avg <= 300) {
            measuredRowHeight = Math.round(avg);
          }
        }
      }

      // Overhead = header + footer + borders/padding
      const overhead = theadHeight + footerHeight + 14;
      const netRowSpace = Math.max(0, availableHeight - overhead);

      // Calculate optimal row count
      let optimalRows = Math.floor(netRowSpace / measuredRowHeight);
      optimalRows = Math.max(minPageSize, Math.min(maxPageSize, optimalRows));

      // Guard: only update state if changed to avoid unnecessary re-renders
      if (optimalRows !== lastCalculatedSizeRef.current) {
        const prevSize = lastCalculatedSizeRef.current;
        lastCalculatedSizeRef.current = optimalRows;

        setEffectivePageSize(optimalRows);

        // Adjust currentPage to keep the currently viewed item in view
        setCurrentPage((prevPage) => {
          const firstItemIndex = (prevPage - 1) * prevSize;
          const newTotal = Math.max(1, Math.ceil(totalItems / optimalRows));
          const adjustedPage = Math.max(1, Math.min(Math.floor(firstItemIndex / optimalRows) + 1, newTotal));
          return adjustedPage;
        });
      }
    } catch (e) {
      console.warn("[useDynamicPagination] Measurement error:", e);
    }
  }, [bufferBottom, defaultRowHeight, minPageSize, maxPageSize, totalItems]);

  // Setup ResizeObserver and window resize listener
  useEffect(() => {
    const container = tableContainerRef.current;
    if (!container) return;

    const debouncedCalculate = () => {
      if (calculationTimerRef.current !== null) {
        window.cancelAnimationFrame(calculationTimerRef.current);
      }
      calculationTimerRef.current = window.requestAnimationFrame(() => {
        recalculatePageSize();
      });
    };

    // Calculate immediately and shortly after mount for settled layout
    recalculatePageSize();
    const initialTimer = setTimeout(() => {
      recalculatePageSize();
    }, 60);

    const scrollParent = container.closest("main") || document.body;
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(() => {
        debouncedCalculate();
      });
      observer.observe(container);
      if (scrollParent && scrollParent !== container) {
        observer.observe(scrollParent);
      }
    }

    window.addEventListener("resize", debouncedCalculate, { passive: true });

    return () => {
      clearTimeout(initialTimer);
      if (calculationTimerRef.current !== null) {
        window.cancelAnimationFrame(calculationTimerRef.current);
      }
      if (observer) {
        observer.disconnect();
      }
      window.removeEventListener("resize", debouncedCalculate);
    };
  }, [recalculatePageSize]);

  const startIndex = (currentPage - 1) * effectivePageSize;
  const endIndex = Math.min(startIndex + effectivePageSize, totalItems);

  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => Math.min(totalPages, prev + 1));
  }, [totalPages]);

  const goToPrevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1));
  }, []);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const paginateItems = useCallback(
    <T,>(items: T[]): T[] => {
      return items.slice(startIndex, endIndex);
    },
    [startIndex, endIndex]
  );

  return {
    currentPage,
    pageSizeSetting: effectivePageSize,
    effectivePageSize,
    totalPages,
    startIndex,
    endIndex,
    tableContainerRef,
    setCurrentPage,
    setPageSizeSetting: (s: number) => setEffectivePageSize(s),
    goToNextPage,
    goToPrevPage,
    goToFirstPage,
    goToLastPage,
    paginateItems,
  };
}
