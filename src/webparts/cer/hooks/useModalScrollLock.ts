import { useEffect } from "react";

/**
 * Global reference count for open modals to properly support nested / stacked modals
 * (e.g. RemarksDiffModal open on top of AuditTrailModal, or child dialogs).
 */
let activeModalCount = 0;

interface ISavedContainerStyle {
  el: HTMLElement;
  overflowY: string;
  overflowYPriority: string;
  overflowX: string;
  overflowXPriority: string;
  touchAction: string;
  touchActionPriority: string;
}

let savedContainerStyles: ISavedContainerStyle[] = [];

/**
 * Gathers all standard browser and SharePoint-specific scroll viewports.
 * Modern SharePoint pages frequently place the primary vertical scrollbar on
 * 'div[data-automation-id="contentScrollRegion"]' or '#spPageChromeAppDiv'
 * rather than window/body.
 */
function getScrollContainers(): HTMLElement[] {
  if (typeof document === "undefined") return [];

  const candidates: (HTMLElement | null)[] = [
    document.documentElement,
    document.body,
    document.querySelector('div[data-automation-id="contentScrollRegion"]') as HTMLElement,
    document.querySelector("#spPageChromeAppDiv") as HTMLElement,
    document.querySelector("#workbenchPageContent") as HTMLElement,
    document.querySelector(".cer-sp-root") as HTMLElement,
  ];

  return candidates.filter((el): el is HTMLElement => !!el);
}

/**
 * Locks scroll across all containers and adds helper classes to body/html.
 */
function lockScroll(): void {
  const containers = getScrollContainers();

  savedContainerStyles = containers.map((el) => ({
    el,
    overflowY: el.style.getPropertyValue("overflow-y"),
    overflowYPriority: el.style.getPropertyPriority("overflow-y"),
    overflowX: el.style.getPropertyValue("overflow-x"),
    overflowXPriority: el.style.getPropertyPriority("overflow-x"),
    touchAction: el.style.getPropertyValue("touch-action"),
    touchActionPriority: el.style.getPropertyPriority("touch-action"),
  }));

  if (document.documentElement) {
    document.documentElement.classList.add("cer-modal-open");
  }
  if (document.body) {
    document.body.classList.add("cer-modal-open");
  }

  containers.forEach((el) => {
    el.style.setProperty("overflow-y", "hidden", "important");
    el.style.setProperty("overflow-x", "hidden", "important");
    el.style.setProperty("touch-action", "none", "important");
  });
}

/**
 * Restores previous container styles and clears modal classes.
 */
function unlockScroll(): void {
  if (document.documentElement) {
    document.documentElement.classList.remove("cer-modal-open");
  }
  if (document.body) {
    document.body.classList.remove("cer-modal-open");
  }

  savedContainerStyles.forEach(
    ({
      el,
      overflowY,
      overflowYPriority,
      overflowX,
      overflowXPriority,
      touchAction,
      touchActionPriority,
    }) => {
      try {
        if (overflowY) {
          el.style.setProperty("overflow-y", overflowY, overflowYPriority);
        } else {
          el.style.removeProperty("overflow-y");
        }

        if (overflowX) {
          el.style.setProperty("overflow-x", overflowX, overflowXPriority);
        } else {
          el.style.removeProperty("overflow-x");
        }

        if (touchAction) {
          el.style.setProperty("touch-action", touchAction, touchActionPriority);
        } else {
          el.style.removeProperty("touch-action");
        }
      } catch {
        // Safe fallback in case elements were detached
      }
    }
  );

  savedContainerStyles = [];
}

/**
 * Hook to lock background scrolling when a modal or dialog is open.
 * Safely handles nested modals, SharePoint content containers, and clean cleanup.
 */
export function useModalScrollLock(isOpen: boolean): void {
  useEffect(() => {
    if (!isOpen || typeof document === "undefined") return;

    activeModalCount++;
    if (activeModalCount === 1) {
      lockScroll();
    }

    return () => {
      activeModalCount = Math.max(0, activeModalCount - 1);
      if (activeModalCount === 0) {
        unlockScroll();
      }
    };
  }, [isOpen]);
}

