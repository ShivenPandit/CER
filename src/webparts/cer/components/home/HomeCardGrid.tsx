import React, { useRef, useState, useEffect } from "react";
import {
  FilePlus,
  ListFilter,
  UserCheck,
  BarChart3,
  Settings,
  BookOpen,
  ArrowRight,
} from "lucide-react";
import { NavView } from "../navigation/Sidebar";
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
}

export const HomeCardGrid: React.FC<IHomeCardGridProps> = ({
  currentUser,
  onNavigate,
  onOpenManual,
  pendingApprovalsCount = 0,
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
      iconBg: "bg-[#1A73E8]",
      icon: FilePlus,
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
      iconBg: "bg-[#10B981]",
      icon: ListFilter,
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
      iconBg: "bg-[#F59E0B]",
      icon: UserCheck,
      dotColor: "text-[#FCD34D]",
      actionColor: "text-[#D97706]",
      illustration: ApprovalsIllustration,
      onClick: () => onNavigate("pending-approvals"),
    },
    {
      id: "reports",
      title: "Report and Dashboard",
      description:
        "View reports, analytics and key insights for better decision-making.",
      actionLabel: "View Reports",
      bgGradient: "from-[#F5F3FF] via-[#F3EEFF] to-[#E9E1FC]",
      borderClass: "border-[#DDD6FE] hover:border-[#C4B5FD]",
      iconBg: "bg-[#8B5CF6]",
      icon: BarChart3,
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
      iconBg: "bg-[#E11D48]",
      icon: Settings,
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
      iconBg: "bg-[#0891B2]",
      icon: BookOpen,
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

  const visibleCards = cards.filter((card) => {
    if (card.id === "workflow-config" && !isAdmin) return false;
    if (card.id === "pending-approvals" && !isApproverOrAdmin) return false;
    if (card.id === "create" && !canCreate) return false;
    return true;
  });

  return (
    <div
      ref={containerRef}
      className="w-full max-w-none px-3.5 xs:px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 pt-2 pb-2 sm:pt-2.5 sm:pb-2.5 lg:pt-3 lg:pb-3 2xl:pt-4 2xl:pb-5 min-w-0 touch-pan-y"
    >
      {/* Container-aware responsive card grid: 1 col (<580px / mobile), 2 cols (tablet), 3 cols (desktop / laptop) */}
      <div
        className={`grid ${
          cols === 3
            ? "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"
            : cols === 2
            ? "grid-cols-1 sm:grid-cols-2"
            : "grid-cols-1"
        } gap-2.5 sm:gap-3 lg:gap-3 2xl:gap-4.5 min-w-0 touch-pan-y`}
      >
        {visibleCards.map((card) => {
          const Icon = card.icon;
          const Illustration = card.illustration;

          return (
            <div
              key={card.id}
              onClick={card.onClick}
              className={`group relative flex flex-col justify-between p-2.5 xs:p-3 sm:p-3.5 2xl:p-4 rounded-xl sm:rounded-2xl bg-gradient-to-br ${card.bgGradient} border ${card.borderClass} shadow-subtle hover:shadow-card hover:-translate-y-0.5 transition-all duration-300 cursor-pointer overflow-hidden min-h-[112px] xs:min-h-[118px] sm:min-h-[124px] lg:min-h-[130px] 2xl:min-h-[160px] select-none min-w-0 touch-pan-y`}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  card.onClick();
                }
              }}
            >
              {/* Three Decorative Dots in Upper Right Corner */}
              <div
                className={`absolute top-2.5 right-2.5 sm:top-3 sm:right-3.5 text-xs sm:text-sm tracking-widest font-black leading-none ${card.dotColor} opacity-75 pointer-events-none select-none`}
              >
                •••
              </div>

              {/* Main Content Layout (Left Text, Right Illustration) */}
              <div className="flex items-start justify-between gap-2 z-10 min-w-0">
                {/* Left Side: Icon, Title, Description */}
                <div className="flex-1 pr-1 xs:pr-2 min-w-0">
                  {/* Circular Icon with Shadow */}
                  <div className="relative inline-block mb-1 xs:mb-1.5 sm:mb-2">
                    <div
                      className={`w-7 h-7 xs:w-7.5 xs:h-7.5 sm:w-8 sm:h-8 2xl:w-10 2xl:h-10 rounded-full ${card.iconBg} text-white flex items-center justify-center shadow-xs transform group-hover:scale-105 transition-transform duration-200`}
                    >
                      <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 2xl:w-5 2xl:h-5" />
                    </div>

                    {/* Pending Count Badge if applicable */}
                    {card.badgeCount && card.badgeCount > 0 ? (
                      <span className="absolute -top-1 -right-1 min-w-[15px] xs:min-w-[16px] h-[15px] xs:h-[16px] px-1 rounded-full bg-rose-600 text-white text-[9px] font-bold flex items-center justify-center border-2 border-white shadow-xs">
                        {card.badgeCount}
                      </span>
                    ) : null}
                  </div>

                  {/* Heading */}
                  <h3 className="text-xs xs:text-[13px] sm:text-[13.5px] lg:text-[14px] 2xl:text-base font-bold text-slate-900 tracking-tight leading-snug group-hover:text-blue-950 transition-colors">
                    {card.title}
                  </h3>

                  {/* Description - fluid text that wraps naturally without arbitrary max-width constraints */}
                  <p className="text-[9.5px] xs:text-[10px] sm:text-[10.5px] lg:text-[11px] 2xl:text-xs text-slate-600 leading-snug mt-0.5 sm:mt-1 line-clamp-2">
                    {card.description}
                  </p>
                </div>

                {/* Right Side: Themed Responsive Vector Illustration */}
                <div className="shrink-0 flex items-center justify-end pointer-events-none select-none pl-1">
                  <Illustration className="w-14 h-14 xs:w-15 xs:h-15 sm:w-16 sm:h-16 lg:w-17 lg:h-17 2xl:w-20 2xl:h-20 transition-transform duration-300 group-hover:scale-105" />
                </div>
              </div>

              {/* Bottom Action Link with Arrow */}
              <div className="mt-1.5 sm:mt-2 pt-0.5 z-10">
                <span
                  className={`inline-flex items-center gap-1 text-[11px] sm:text-xs 2xl:text-sm font-bold ${card.actionColor} group-hover:gap-1.5 transition-all duration-200`}
                >
                  <span>{card.actionLabel}</span>
                  <ArrowRight className="w-2.5 h-2.5 sm:w-3 sm:h-3 transform group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
