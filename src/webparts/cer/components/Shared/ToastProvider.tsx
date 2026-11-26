import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Info,
  Loader2,
  X,
} from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info" | "loading";

export interface IToastOptions {
  id?: string;
  type: ToastType;
  title?: string;
  message: string;
  /** Duration in ms before auto-dismiss. Pass 0 for persistent (default for loading). */
  duration?: number;
}

interface IToastItem extends IToastOptions {
  id: string;
  createdAt: number;
  isExiting?: boolean;
}

export interface IToastContextValue {
  showToast: (options: IToastOptions) => string;
  updateToast: (id: string, options: Partial<IToastOptions>) => void;
  update: (id: string, options: Partial<IToastOptions>) => void;
  dismissToast: (id: string) => void;
  dismiss: (id: string) => void;
  success: (message: string, title?: string, duration?: number) => string;
  error: (message: string, title?: string, duration?: number) => string;
  warning: (message: string, title?: string, duration?: number) => string;
  info: (message: string, title?: string, duration?: number) => string;
  loading: (message: string, title?: string) => string;
}

const DEFAULT_DURATIONS: Record<ToastType, number> = {
  success: 3600,
  info: 3600,
  warning: 5000,
  error: 5500,
  loading: 0,
};

const NOOP_TOAST_API: IToastContextValue = {
  showToast: () => "",
  updateToast: () => undefined,
  update: () => undefined,
  dismissToast: () => undefined,
  dismiss: () => undefined,
  success: () => "",
  error: () => "",
  warning: () => "",
  info: () => "",
  loading: () => "",
};

const ToastContext = createContext<IToastContextValue>(NOOP_TOAST_API);

export const useToast = (): IToastContextValue => useContext(ToastContext);

interface IToastPillProps {
  toast: IToastItem;
  onDismiss: (id: string) => void;
}

const ToastPill: React.FC<IToastPillProps> = ({ toast, onDismiss }) => {
  const [isPaused, setIsPaused] = useState(false);
  const remainingRef = useRef<number>(
    toast.duration !== undefined ? toast.duration : DEFAULT_DURATIONS[toast.type]
  );
  const startTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const duration =
    toast.duration !== undefined ? toast.duration : DEFAULT_DURATIONS[toast.type];

  useEffect(() => {
    remainingRef.current = duration;
    startTimeRef.current = Date.now();
  }, [toast.type, toast.message, duration]);

  useEffect(() => {
    if (duration <= 0 || toast.isExiting) {
      return undefined;
    }

    if (isPaused) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      remainingRef.current = Math.max(
        0,
        remainingRef.current - (Date.now() - startTimeRef.current)
      );
      return undefined;
    }

    startTimeRef.current = Date.now();
    timerRef.current = setTimeout(() => {
      onDismiss(toast.id);
    }, Math.max(200, remainingRef.current));

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [duration, isPaused, onDismiss, toast.id, toast.isExiting, toast.type, toast.message]);

  const themeMap: Record<
    ToastType,
    {
      borderColor: string;
      iconBg: string;
      iconColor: string;
      Icon: React.ComponentType<{ className?: string }>;
      isSpinning?: boolean;
    }
  > = {
    success: {
      borderColor: "#A7F3D0",
      iconBg: "#ECFDF5",
      iconColor: "#059669",
      Icon: CheckCircle2,
    },
    error: {
      borderColor: "#FECDD3",
      iconBg: "#FFF1F2",
      iconColor: "#E11D48",
      Icon: AlertCircle,
    },
    warning: {
      borderColor: "#FDE68A",
      iconBg: "#FFFBEB",
      iconColor: "#D97706",
      Icon: AlertTriangle,
    },
    info: {
      borderColor: "#BFDBFE",
      iconBg: "#EFF6FF",
      iconColor: "#012964",
      Icon: Info,
    },
    loading: {
      borderColor: "#CBD5E1",
      iconBg: "#F1F5F9",
      iconColor: "#012964",
      Icon: Loader2,
      isSpinning: true,
    },
  };

  const theme = themeMap[toast.type];
  const Icon = theme.Icon;

  return (
    <div
      role={toast.type === "error" ? "alert" : "status"}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      className={toast.isExiting ? "cer-pill-toast cer-pill-exit" : "cer-pill-toast cer-pill-enter"}
      style={{
        borderColor: theme.borderColor,
      }}
    >
      <span
        className="cer-pill-icon"
        style={{
          backgroundColor: theme.iconBg,
          color: theme.iconColor,
        }}
      >
        <Icon className={theme.isSpinning ? "w-3.5 h-3.5 animate-spin" : "w-3.5 h-3.5"} />
      </span>

      <span className="cer-pill-text" title={toast.message}>
        {toast.message}
      </span>

      <button
        type="button"
        onClick={() => onDismiss(toast.id)}
        aria-label="Close notification"
        className="cer-pill-close"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [toasts, setToasts] = useState<IToastItem[]>([]);
  const counterRef = useRef<number>(0);

  const dismissToast = useCallback((id: string): void => {
    setToasts((prev) =>
      prev.map((t) => (t.id === id ? { ...t, isExiting: true } : t))
    );
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 160);
  }, []);

  const showToast = useCallback((options: IToastOptions): string => {
    const id =
      options.id || `cer-toast-${Date.now()}-${++counterRef.current}`;

    setToasts((prev) => {
      const now = Date.now();
      const hasRecentDup = prev.some(
        (t) =>
          !t.isExiting &&
          t.id !== id &&
          t.type === options.type &&
          t.message === options.message &&
          now - t.createdAt < 1500
      );
      if (hasRecentDup) {
        return prev;
      }

      const existingIdx = prev.findIndex((t) => t.id === id);
      if (existingIdx !== -1) {
        const copy = [...prev];
        copy[existingIdx] = {
          ...copy[existingIdx],
          ...options,
          id,
          isExiting: false,
          createdAt: now,
        };
        return copy;
      }

      const next: IToastItem[] = [
        ...prev,
        {
          ...options,
          id,
          createdAt: now,
          isExiting: false,
        },
      ];
      return next.length > 3 ? next.slice(next.length - 3) : next;
    });

    return id;
  }, []);

  const updateToast = useCallback(
    (id: string, options: Partial<IToastOptions>): void => {
      if (!id) return;
      setToasts((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                ...options,
                isExiting: false,
                createdAt: Date.now(),
              }
            : t
        )
      );
    },
    []
  );

  const api = useMemo<IToastContextValue>(
    () => ({
      showToast,
      updateToast,
      update: updateToast,
      dismissToast,
      dismiss: dismissToast,
      success: (message: string, title?: string, duration?: number) =>
        showToast({ type: "success", message, title, duration }),
      error: (message: string, title?: string, duration?: number) =>
        showToast({ type: "error", message, title, duration }),
      warning: (message: string, title?: string, duration?: number) =>
        showToast({ type: "warning", message, title, duration }),
      info: (message: string, title?: string, duration?: number) =>
        showToast({ type: "info", message, title, duration }),
      loading: (message: string, title?: string) =>
        showToast({ type: "loading", message, title, duration: 0 }),
    }),
    [showToast, updateToast, dismissToast]
  );

  return (
    <ToastContext.Provider value={api}>
      {children}
      {typeof document !== "undefined" &&
        toasts.length > 0 &&
        createPortal(
          <>
            <style>{`
              @keyframes cerPillSlideDown {
                from {
                  opacity: 0;
                  transform: translate3d(0, -10px, 0) scale(0.96);
                }
                to {
                  opacity: 1;
                  transform: translate3d(0, 0, 0) scale(1);
                }
              }
              .cer-pill-stack {
                position: fixed;
                top: 12px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 10000;
                display: flex;
                flex-direction: column;
                align-items: center;
                gap: 6px;
                width: max-content;
                max-width: calc(100vw - 24px);
                pointer-events: none;
                font-family: "Inter", system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
              }
              .cer-pill-toast {
                pointer-events: auto;
                display: inline-flex;
                align-items: center;
                gap: 8px;
                padding: 5px 10px 5px 6px;
                border-radius: 9999px;
                border: 1px solid #E2E8F0;
                background: rgba(255, 255, 255, 0.96);
                backdrop-filter: blur(10px);
                -webkit-backdrop-filter: blur(10px);
                box-shadow: 0 8px 22px -6px rgba(15, 23, 42, 0.16), 0 2px 6px -2px rgba(15, 23, 42, 0.06);
                max-width: min(560px, calc(100vw - 24px));
                transition: opacity 0.16s ease, transform 0.16s ease;
              }
              .cer-pill-enter {
                animation: cerPillSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards;
              }
              .cer-pill-exit {
                opacity: 0;
                transform: translate3d(0, -8px, 0) scale(0.95);
              }
              .cer-pill-icon {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 22px;
                height: 22px;
                border-radius: 9999px;
                flex-shrink: 0;
              }
              .cer-pill-text {
                font-size: 12px;
                font-weight: 600;
                color: #1E293B;
                line-height: 1.3;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              }
              .cer-pill-close {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 20px;
                height: 20px;
                border-radius: 9999px;
                color: #94A3B8;
                background: transparent;
                border: none;
                cursor: pointer;
                flex-shrink: 0;
                transition: background-color 0.15s ease, color 0.15s ease;
              }
              .cer-pill-close:hover {
                background-color: #F1F5F9;
                color: #334155;
              }
            `}</style>
            <div
              aria-live="polite"
              aria-label="Notifications"
              className="cer-pill-stack"
            >
              {toasts.map((item) => (
                <ToastPill
                  key={item.id}
                  toast={item}
                  onDismiss={dismissToast}
                />
              ))}
            </div>
          </>,
          document.body
        )}
    </ToastContext.Provider>
  );
};
