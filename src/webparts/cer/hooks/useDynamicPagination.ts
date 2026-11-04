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

function safeParsePixel(val: string | undefined | null, fallback: number = 0): number {
  if (!val) return fallback;
  const parsed = parseFloat(val);
  return Number.isFinite(parsed) ? parsed : fallback;
}

/**
 * Fully automatic, container-aware dynamic pagination hook.
 * Calculates optimal page size based on available vertical space and actual rendered row heights.
 * Works completely in the background without any manual user controls or badges.
 */
export function useDynamicPagination({
  totalItems,
  initialPageSize,
  minPageSize = 1,
  maxPageSize = 100,
  defaultRowHeight = 44,
  bufferBottom = 52,
}: IUseDynamicPaginationOptions): IUseDynamicPaginationReturn {
  const tableContainerRef = useRef<HTMLDivElement>(null);

  const safeMinPageSize = Number.isFinite(minPageSize) && minPageSize >= 1 ? Math.floor(minPageSize) : 1;
  const safeMaxPageSize = Number.isFinite(maxPageSize) && maxPageSize >= safeMinPageSize ? Math.floor(maxPageSize) : 100;
  const safeDefaultRowHeight = Number.isFinite(defaultRowHeight) && defaultRowHeight > 0 ? defaultRowHeight : 44;

  // Initial estimate based on window.innerHeight and defaultRowHeight
  const getInitialEstimate = (): number => {
    if (initialPageSize && Number.isFinite(initialPageSize) && initialPageSize > 0) {
      return Math.max(safeMinPageSize, Math.min(safeMaxPageSize, Math.floor(initialPageSize)));
    }
    if (typeof window === "undefined") return 10;
    const vh = window.innerHeight;
    const factor = safeDefaultRowHeight > 55 ? Math.max(0.15, 44 / safeDefaultRowHeight) : 1;
    if (vh >= 1800) return Math.max(safeMinPageSize, Math.round(36 * factor)); // 4K display
    if (vh >= 1300) return Math.max(safeMinPageSize, Math.round(22 * factor)); // 1440p QHD display
    if (vh >= 950) return Math.max(safeMinPageSize, Math.round(14 * factor));  // 1080p display
    if (vh >= 800) return Math.max(safeMinPageSize, Math.round(10 * factor));  // 900p display
    if (vh >= 650) return Math.max(safeMinPageSize, Math.round(7 * factor));   // 768p laptop display
    return Math.max(safeMinPageSize, Math.round(5 * factor));                  // small laptop/tablet
  };

  const [effectivePageSize, setEffectivePageSize] = useState<number>(getInitialEstimate);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const lastCalculatedSizeRef = useRef<number>(effectivePageSize);
  const calculationTimerRef = useRef<number | null>(null);

  // Safe effective page size guaranteed to be integer >= 1
  const safeEffectivePageSize = useMemo(() => {
    if (Number.isFinite(effectivePageSize) && effectivePageSize >= 1) {
      return Math.max(safeMinPageSize, Math.min(safeMaxPageSize, Math.floor(effectivePageSize)));
    }
    return safeMinPageSize;
  }, [effectivePageSize, safeMinPageSize, safeMaxPageSize]);

  // Safe total pages guaranteed to be integer >= 1
  const totalPages = useMemo(() => {
    const safeTotal = Number.isFinite(totalItems) && totalItems > 0 ? totalItems : 0;
    return Math.max(1, Math.ceil(safeTotal / safeEffectivePageSize));
  }, [totalItems, safeEffectivePageSize]);

  // Safe current page guaranteed to be integer >= 1 and <= totalPages
  const safeCurrentPage = useMemo(() => {
    if (!Number.isFinite(currentPage) || currentPage < 1) return 1;
    return Math.min(Math.floor(currentPage), totalPages);
  }, [currentPage, totalPages]);

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
      const rawAvailable = viewportHeight - containerRect.top - bufferBottom;
      const availableHeight = Math.max(120, Number.isFinite(rawAvailable) ? rawAvailable : 300);

      // Measure actual rendered header height
      const thead = container.querySelector("thead") as HTMLElement | null;
      const theadHeight = thead ? thead.offsetHeight : (container.querySelector("table") ? 40 : 0);

      // Measure actual rendered non-table/non-card elements inside container (e.g. filter bars, search bars, footer)
      let nonTableOverhead = 0;
      Array.from(container.children).forEach((child) => {
        const el = child as HTMLElement;
        const isTable = el.tagName === "TABLE" || !!el.querySelector("table");
        const isListItem =
          el.getAttribute("data-role") === "list-item" ||
          !!el.querySelector("[data-role='list-item']");
        const isListWrapper =
          el.getAttribute("data-role") === "list-wrapper" ||
          el.classList.contains("space-y-4");
        if (!isTable && !isListItem && !isListWrapper) {
          const h = el.offsetHeight;
          if (Number.isFinite(h) && h > 0) {
            nonTableOverhead += h;
          }
        }
      });

      // Measure list container wrapper padding (e.g. p-4 sm:p-5 on cards wrapper)
      let listWrapperPadding = 0;
      const listWrapper =
        (container.querySelector("[data-role='list-wrapper']") as HTMLElement | null) ||
        (container.querySelector("[data-role='list-item']")?.parentElement as HTMLElement | null);
      if (listWrapper && listWrapper !== container) {
        const style = window.getComputedStyle(listWrapper);
        const pt = safeParsePixel(style.paddingTop, 0);
        const pb = safeParsePixel(style.paddingBottom, 0);
        listWrapperPadding = pt + pb;
      }

      // If nonTableOverhead didn't find pagination footer (e.g. if rendered inside table wrapper)
      const footer =
        (container.querySelector("[data-role='pagination-footer']") as HTMLElement | null) ||
        (container.querySelector(".border-t") as HTMLElement | null);
      const footerHeight = footer && Number.isFinite(footer.offsetHeight) ? footer.offsetHeight : 46;
      if (nonTableOverhead === 0) {
        nonTableOverhead = footerHeight;
      }

      // Measure actual rendered row/card height from DOM if available
      let measuredRowHeight = safeDefaultRowHeight;
      const renderedCard = container.querySelector("[data-role='list-item']") as HTMLElement | null;
      if (renderedCard && Number.isFinite(renderedCard.offsetHeight) && renderedCard.offsetHeight > 50) {
        let parentGap = 0;
        if (listWrapper) {
          const rawGap = window.getComputedStyle(listWrapper).rowGap;
          parentGap = safeParsePixel(rawGap, 0);
        }
        // Tailwind space-y-4 is 16px vertical gap
        const effectiveGap = Math.max(parentGap, 16);
        const totalCardHeight = renderedCard.offsetHeight + effectiveGap;
        if (Number.isFinite(totalCardHeight) && totalCardHeight > 0) {
          measuredRowHeight = totalCardHeight;
        }
      } else {
        const renderedTr = container.querySelector("tbody tr") as HTMLElement | null;
        if (renderedTr && Number.isFinite(renderedTr.offsetHeight) && renderedTr.offsetHeight > 20) {
          measuredRowHeight = renderedTr.offsetHeight;
        }
      }

      if (!Number.isFinite(measuredRowHeight) || measuredRowHeight <= 0) {
        measuredRowHeight = safeDefaultRowHeight;
      }

      // Overhead = nonTableOverhead + theadHeight + listWrapperPadding
      const overhead = nonTableOverhead + theadHeight + listWrapperPadding;
      const netRowSpace = Math.max(0, availableHeight - overhead);

      // Calculate optimal row count with tolerance so nearly-fitting items (e.g. 2.8 items) are not aggressively dropped
      const tolerance = Math.min(24, measuredRowHeight * 0.18);
      let optimalRows = Math.floor((netRowSpace + tolerance) / measuredRowHeight);
      if (!Number.isFinite(optimalRows) || optimalRows < 1) {
        optimalRows = safeMinPageSize;
      }
      optimalRows = Math.max(safeMinPageSize, Math.min(safeMaxPageSize, optimalRows));

      // Guard: only update state if changed to avoid unnecessary re-renders
      if (optimalRows !== lastCalculatedSizeRef.current) {
        lastCalculatedSizeRef.current = optimalRows;

        setEffectivePageSize(optimalRows);

        // Keep currentPage within valid bounds without forcing user back to page 1
        setCurrentPage((prevPage) => {
          const safePrev = Number.isFinite(prevPage) && prevPage >= 1 ? prevPage : 1;
          const safeTotal = Number.isFinite(totalItems) && totalItems >= 0 ? totalItems : 0;
          const newTotal = Math.max(1, Math.ceil(safeTotal / optimalRows));
          return Math.max(1, Math.min(safePrev, newTotal));
        });
      }
    } catch (e) {
      console.warn("[useDynamicPagination] Measurement error:", e);
    }
  }, [bufferBottom, safeDefaultRowHeight, safeMinPageSize, safeMaxPageSize, totalItems]);

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

  // Safe calculated range indices
  const safeTotalItemsCount = Number.isFinite(totalItems) && totalItems >= 0 ? totalItems : 0;
  const startIndex = Math.max(0, (safeCurrentPage - 1) * safeEffectivePageSize);
  const endIndex = Math.min(startIndex + safeEffectivePageSize, safeTotalItemsCount);

  const goToNextPage = useCallback(() => {
    setCurrentPage((prev) => {
      const safePrev = Number.isFinite(prev) && prev >= 1 ? prev : 1;
      return Math.min(totalPages, safePrev + 1);
    });
  }, [totalPages]);

  const goToPrevPage = useCallback(() => {
    setCurrentPage((prev) => {
      const safePrev = Number.isFinite(prev) && prev >= 1 ? prev : 1;
      return Math.max(1, safePrev - 1);
    });
  }, []);

  const goToFirstPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  const goToLastPage = useCallback(() => {
    setCurrentPage(totalPages);
  }, [totalPages]);

  const paginateItems = useCallback(
    <T,>(items: T[]): T[] => {
      if (!Array.isArray(items) || items.length === 0) return [];
      const start = Number.isFinite(startIndex) ? Math.max(0, startIndex) : 0;
      const end = Number.isFinite(endIndex) ? Math.max(start, endIndex) : items.length;
      return items.slice(start, end);
    },
    [startIndex, endIndex]
  );

  return {
    currentPage: safeCurrentPage,
    pageSizeSetting: safeEffectivePageSize,
    effectivePageSize: safeEffectivePageSize,
    totalPages,
    startIndex,
    endIndex,
    tableContainerRef,
    setCurrentPage,
    setPageSizeSetting: (s: number) => {
      if (Number.isFinite(s) && s >= 1) {
        setEffectivePageSize(Math.max(safeMinPageSize, Math.min(safeMaxPageSize, Math.floor(s))));
      }
    },
    goToNextPage,
    goToPrevPage,
    goToFirstPage,
    goToLastPage,
    paginateItems,
  };
}
