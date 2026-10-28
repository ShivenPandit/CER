import React, { useRef, useState, useEffect } from "react";
import {
  ArrowRight,
} from "lucide-react";
import { NavView } from "../Navigation/Sidebar";
import { IAppUser } from "../../models/UserModel";
import { PermissionService } from "../../services/PermissionService";
import {
  CreateCERIllustration,
  MyRequestsIllustration,
  ApprovalsIllustration,
  ReportsIllustration,
  AdminIllustration,
  UserManualIllustration,
} from "./HomeIllustrations";

interface IHomeCardGridProps {
  currentUser?: IAppUser;
  onNavigate: (view: NavView) => void;
  onOpenManual: () => void;
  pendingApprovalsCount?: number;
  availableHeight?: number;
}

export const HomeCardGrid: React.FC<IHomeCardGridProps> = ({
  currentUser,
  onNavigate,
  onOpenManual,
  pendingApprovalsCount = 0,
  availableHeight,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(1200);

  // Measure actual available container width inside SharePoint canvas
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    if (el.offsetWidth > 0) {
      setContainerWidth(el.offsetWidth);
    }

    if (typeof ResizeObserver !== "undefined") {
      const observer = new ResizeObserver((entries) => {
        for (const entry of entries) {
          if (entry.contentRect.width > 0) {
            setContainerWidth(entry.contentRect.width);
          }
        }
      });
      observer.observe(el);
      return () => observer.disconnect();
    }
  }, []);

  // Determine column count based on available container width:
  // - Large width (>= 940px): 3 columns per row
  // - Medium width (580px - 939px): 2 columns per row
  // - Mobile / narrow (< 580px): 1 column per row
  const cols = containerWidth >= 940 ? 3 : containerWidth >= 580 ? 2 : 1;

  const cards = [
    {
      id: "create",
      title: "Create CER Request",
      description:
        "Submit a new capital expenditure request with required details, attachments and justification.",
      actionLabel: "Create Request",
      bgGradient: "from-[#EFF6FF] via-[#EBF4FE] to-[#DCEEFE]",
      borderClass: "border-[#BFDBFE] hover:border-[#93C5FD]",
      dotColor: "text-[#93C5FD]",
      actionColor: "text-[#1A73E8]",
      illustration: CreateCERIllustration,
      onClick: () => onNavigate("create"),
    },
    {
      id: "my-proposals",
      title: "My CER Request",
      description:
        "View and track your submitted CER requests with current status, history and actions.",
      actionLabel: "View My Requests",
      bgGradient: "from-[#ECFDF5] via-[#E6F9F0] to-[#D4F5E6]",
      borderClass: "border-[#A7F3D0] hover:border-[#6EE7B7]",
      dotColor: "text-[#A7F3D0]",
      actionColor: "text-[#059669]",
      illustration: MyRequestsIllustration,
      onClick: () => onNavigate("my-proposals"),
    },
    {
      id: "pending-approvals",
      title: "My CER Approvals",
      description:
        "Review and take action on pending CER approvals assigned to you.",
      actionLabel: "View Pending Approvals",
      badgeCount: pendingApprovalsCount,
      bgGradient: "from-[#FFFBEB] via-[#FFF8E7] to-[#FEF2D6]",
      borderClass: "border-[#FDE68A] hover:border-[#FCD34D]",
      dotColor: "text-[#FCD34D]",
      actionColor: "text-[#D97706]",
      illustration: ApprovalsIllustration,
      onClick: () => onNavigate("pending-approvals"),
    },
    {
      id: "Reports",
      title: "Report and Dashboard",
      description:
        "View reports, analytics and key insights for better decision-making.",
      actionLabel: "View Reports",
      bgGradient: "from-[#F5F3FF] via-[#F3EEFF] to-[#E9E1FC]",
      borderClass: "border-[#DDD6FE] hover:border-[#C4B5FD]",
      dotColor: "text-[#C4B5FD]",
      actionColor: "text-[#7C3AED]",
      illustration: ReportsIllustration,
      onClick: () => onNavigate("reports"),
    },
    {
      id: "workflow-config",
      title: "Admin Console",
      description:
        "Manage enterprise roles, approval hierarchy, master settings, and security audit log.",
      actionLabel: "Open Admin Console",
      bgGradient: "from-[#FFF1F2] via-[#FEECEF] to-[#FDDDE3]",
      borderClass: "border-[#FECDD3] hover:border-[#FDA4AF]",
      dotColor: "text-[#FDA4AF]",
      actionColor: "text-[#E11D48]",
      illustration: AdminIllustration,
      onClick: () => onNavigate("workflow-config"),
    },
    {
      id: "manual",
      title: "User Manual",
      description:
        "Access user guides, process flows and help documentation.",
      actionLabel: "Read Guide",
      bgGradient: "from-[#ECFEFF] via-[#E6FCFD] to-[#D0F7F9]",
      borderClass: "border-[#A5F3FC] hover:border-[#67E8F9]",
      dotColor: "text-[#67E8F9]",
      actionColor: "text-[#0891B2]",
      illustration: UserManualIllustration,
      onClick: onOpenManual,
    },
  ];

  // Role-based visibility filtering
  const isApproverOrAdmin = currentUser
    ? PermissionService.hasRole(currentUser, "Approver") || PermissionService.hasRole(currentUser, "Admin")
    : true;
  const isAdmin = currentUser ? PermissionService.canAccessAdmin(currentUser) : true;
  const canCreate = currentUser ? PermissionService.canCreateCER(currentUser) : true;
  const canViewMyRequests = currentUser ? PermissionService.canViewMyRequests(currentUser) : true;

  const visibleCards = cards.filter((card) => {
    if (card.id === "workflow-config" && !isAdmin) return false;
    if (card.id === "pending-approvals" && !isApproverOrAdmin) return false;
    if (card.id === "create" && !canCreate) return false;
    if (card.id === "my-proposals" && !canViewMyRequests) return false;
    return true;
  });

  const isTall = availableHeight !== undefined ? availableHeight >= 850 : false;
  const isVeryTall = availableHeight !== undefined ? availableHeight >= 1050 : false;

  const containerPaddingClass = isVeryTall
    ? "py-4 sm:py-6 lg:py-8 2xl:py-10"
    : isTall
    ? "py-3 sm:py-4 lg:py-6"
    : "py-1 sm:py-1.5 lg:py-2 xl:py-2.5 2xl:py-3.5";

  const gridMaxHeightStyle = isVeryTall
    ? { maxHeight: `${Math.min(760, (availableHeight || 1200) - 340)}px` }
    : undefined;

  const cardPaddingClass = isVeryTall
    ? "p-4.5 sm:p-5.5 lg:p-6 2xl:p-7"
    : "p-2.5 sm:p-3 lg:p-3.5 xl:p-4 2xl:p-6 3xl:p-7";

  const cardMinHeightClass = isVeryTall
    ? "min-h-[140px] sm:min-h-[160px] lg:min-h-[180px] xl:min-h-[200px]"
    : "min-h-[90px] sm:min-h-[100px] lg:min-h-[110px] xl:min-h-[115px] 2xl:min-h-[160px] 3xl:min-h-[190px]";

  const illustrationClass = isVeryTall
    ? "w-14 h-14 sm:w-16 sm:h-16 lg:w-18 lg:h-18 xl:w-20 xl:h-20 2xl:w-24 2xl:h-24"
    : "w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 xl:w-14 xl:h-14 2xl:w-20 2xl:h-20 3xl:w-24 3xl:h-24";

  const gridGapClass = isVeryTall
    ? "gap-3 sm:gap-3.5 lg:gap-4 xl:gap-5 2xl:gap-6"
    : "gap-2 sm:gap-2.5 lg:gap-3 xl:gap-3.5 2xl:gap-5 3xl:gap-6";

  const actionMarginClass = isVeryTall
    ? "mt-auto pt-2.5 sm:pt-3"
    : "mt-1.5 sm:mt-2 xl:mt-2.5 2xl:mt-auto pt-0.5";

  return (
    <div
      ref={containerRef}
      className={`w-full max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 3xl:px-16 ${containerPaddingClass} h-full flex-1 flex flex-col justify-center min-h-0 min-w-0 touch-pan-y short:py-1 tall:py-4 very-tall:py-8`}
    >
      {/* Container-aware responsive card grid: 1 col (<580px / mobile), 2 cols (tablet), 3 cols (desktop / laptop) */}
      <div
        style={gridMaxHeightStyle}
        className={`grid ${
          cols === 3
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 lg:grid-rows-2"
            : cols === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1"
        } ${gridGapClass} h-full flex-1 max-h-[460px] lg:max-h-[500px] xl:max-h-[540px] 2xl:max-h-[600px] 3xl:max-h-[680px] min-h-0 min-w-0 touch-pan-y short:max-h-[440px] tall:max-h-[640px] very-tall:max-h-[760px]`}
      >
        {visibleCards.map((card) => {
          const Illustration = card.illustration;

          return (
            <div
              key={card.id}
              onClick={card.onClick}
              className={`group relative flex flex-col justify-between ${cardPaddingClass} rounded-xl sm:rounded-2xl bg-gradient-to-br ${card.bgGradient} border ${card.borderClass} shadow-subtle hover:shadow-elevated hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden h-full ${cardMinHeightClass} select-none min-w-0 touch-pan-y`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  card.onClick();
                }
              }}
            >
              {/* Main Content Layout (Left Text, Right Illustration) */}
              <div className="flex items-start justify-between gap-3 sm:gap-4 2xl:gap-5 z-10 min-w-0">
                {/* Left Side: Title, Description */}
                <div className="flex-1 pr-1 xs:pr-2 min-w-0">
                  {/* Heading & Badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3
                      style={{
                        fontSize: isVeryTall
                          ? "clamp(15px, 1.2vw, 24px)"
                          : "clamp(13.5px, 1.15vw, 24px)",
                      }}
                      className="font-bold text-slate-900 tracking-tight leading-snug group-hover:text-blue-950 transition-colors 2xl:text-[22px] 3xl:text-2xl"
                    >
                      {card.title}
                    </h3>
                    {card.badgeCount && card.badgeCount > 0 ? (
                      <span className="inline-flex items-center justify-center px-1.5 py-0.2 2xl:px-2.5 2xl:py-0.5 rounded-full bg-rose-600 text-white text-[10px] 2xl:text-xs 3xl:text-sm font-bold shadow-xs">
                        {card.badgeCount}
                      </span>
                    ) : null}
                  </div>

                  {/* Description - fluid text that wraps naturally with expanded horizontal room */}
                  <p
                    style={{
                      fontSize: isVeryTall
                        ? "clamp(12.5px, 0.95vw, 16px)"
                        : "clamp(11px, 0.88vw, 16.5px)",
                      lineHeight: 1.55,
                    }}
                    className="text-slate-600 mt-1 sm:mt-1.5 2xl:mt-2.5 3xl:mt-3 2xl:text-[15px] 3xl:text-base"
                  >
                    {card.description}
                  </p>
                </div>

                {/* Right Side: Themed Responsive Vector Illustration */}
                <div className="shrink-0 flex items-center justify-end pointer-events-none select-none pl-1 self-start pt-0.5">
                  <Illustration className={`${illustrationClass} transition-transform duration-300 group-hover:scale-105`} />
                </div>
              </div>

              {/* Bottom Action Link with Arrow */}
              <div className={`${actionMarginClass} z-10`}>
                <span
                  style={{
                    fontSize: isVeryTall
                      ? "clamp(13px, 0.95vw, 16.5px)"
                      : "clamp(11.5px, 0.9vw, 16.5px)",
                  }}
                  className={`inline-flex items-center gap-1.5 2xl:gap-2.5 font-bold ${card.actionColor} 2xl:text-[15px] 3xl:text-base group-hover:gap-2 2xl:group-hover:gap-3 transition-all duration-200`}
                >
                  <span>{card.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 2xl:w-5 2xl:h-5 transform group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
