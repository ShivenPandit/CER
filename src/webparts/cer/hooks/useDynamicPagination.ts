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
  minPageSize = 3,
  maxPageSize = 100,
  defaultRowHeight = 44,
  bufferBottom = 52,
}: IUseDynamicPaginationOptions): IUseDynamicPaginationReturn {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  // Initial estimate based on window.innerHeight and defaultRowHeight
  const getInitialEstimate = (): number => {
    if (initialPageSize && initialPageSize > 0) return initialPageSize;
    if (typeof window === "undefined") return 10;
    const vh = window.innerHeight;
    const factor = defaultRowHeight > 55 ? Math.max(0.3, 44 / defaultRowHeight) : 1;
    if (vh >= 1800) return Math.max(minPageSize, Math.round(36 * factor)); // 4K display
    if (vh >= 1300) return Math.max(minPageSize, Math.round(22 * factor)); // 1440p QHD display
    if (vh >= 950) return Math.max(minPageSize, Math.round(14 * factor));  // 1080p display
    if (vh >= 800) return Math.max(minPageSize, Math.round(10 * factor));  // 900p display
    if (vh >= 650) return Math.max(minPageSize, Math.round(7 * factor));   // 768p laptop display
    return Math.max(minPageSize, Math.round(5 * factor));                  // small laptop/tablet
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
      const availableHeight = Math.max(120, viewportHeight - containerRect.top - bufferBottom);

      // Measure actual rendered header height
      const thead = container.querySelector("thead") as HTMLElement | null;
      const theadHeight = thead ? thead.offsetHeight : (container.querySelector("table") ? 40 : 0);

      // Measure actual rendered non-table elements inside container (e.g. filter bars, search bars, footer)
      let nonTableOverhead = 0;
      Array.from(container.children).forEach((child) => {
        const el = child as HTMLElement;
        const isTable = el.tagName === "TABLE" || !!el.querySelector("table");
        const isListItem =
          el.getAttribute("data-role") === "list-item" ||
          !!el.querySelector("[data-role='list-item']");
        if (!isTable && !isListItem) {
          nonTableOverhead += el.offsetHeight;
        }
      });

      // If nonTableOverhead didn't find pagination footer (e.g. if rendered inside table wrapper)
      const footer =
        (container.querySelector("[data-role='pagination-footer']") as HTMLElement | null) ||
        (container.querySelector(".border-t") as HTMLElement | null);
      const footerHeight = footer ? footer.offsetHeight : 46;
      if (nonTableOverhead === 0) {
        nonTableOverhead = footerHeight;
      }

      // Use stable row height to prevent page size fluctuation when different pages render rows of varying height
      const measuredRowHeight = defaultRowHeight;

      // Overhead = nonTableOverhead + theadHeight + borders/safety margin
      const overhead = nonTableOverhead + theadHeight + 10;
      const netRowSpace = Math.max(0, availableHeight - overhead);

      // Calculate optimal row count
      let optimalRows = Math.floor(netRowSpace / measuredRowHeight);
      optimalRows = Math.max(minPageSize, Math.min(maxPageSize, optimalRows));

      // Guard: only update state if changed to avoid unnecessary re-renders
      if (optimalRows !== lastCalculatedSizeRef.current) {
        lastCalculatedSizeRef.current = optimalRows;

        setEffectivePageSize(optimalRows);

        // Keep currentPage within valid bounds without forcing user back to page 1
        setCurrentPage((prevPage) => {
          const newTotal = Math.max(1, Math.ceil(totalItems / optimalRows));
          return Math.max(1, Math.min(prevPage, newTotal));
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
    let lastWidth = container.offsetWidth;
    let observer: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver((entries) => {
        let shouldRecalculate = false;
        for (const entry of entries) {
          if (entry.target === container) {
            // Only trigger if container width changed (layout/window resize), not on vertical height change caused by rendering fewer items
            const currentWidth = Math.round(entry.contentRect.width);
            if (currentWidth !== lastWidth) {
              lastWidth = currentWidth;
              shouldRecalculate = true;
            }
          } else {
            shouldRecalculate = true;
          }
        }
        if (shouldRecalculate) {
          debouncedCalculate();
        }
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
