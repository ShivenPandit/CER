import React from "react";
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
import {
  CreateCERIllustration,
  MyRequestsIllustration,
  ApprovalsIllustration,
  ReportsIllustration,
  AdminIllustration,
  UserManualIllustration,
} from "./HomeIllustrations";

interface IHomeCardGridProps {
  onNavigate: (view: NavView) => void;
  onOpenManual: () => void;
  pendingApprovalsCount?: number;
}

export const HomeCardGrid: React.FC<IHomeCardGridProps> = ({
  onNavigate,
  onOpenManual,
  pendingApprovalsCount = 0,
}) => {
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
      title: "Admin Page",
      description:
        "Manage users, settings, masters and system configuration.",
      actionLabel: "Go to Admin",
      bgGradient: "from-[#FFF1F2] via-[#FEECEF] to-[#FDDDE3]",
      borderClass: "border-[#FECDD3] hover:border-[#FDA4AF]",
      iconBg: "bg-[#EF4444]",
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
      actionLabel: "View Manual",
      bgGradient: "from-[#ECFEFF] via-[#E6FAFC] to-[#D5F6FA]",
      borderClass: "border-[#A5F3FC] hover:border-[#67E8F9]",
      iconBg: "bg-[#06B6D4]",
      icon: BookOpen,
      dotColor: "text-[#67E8F9]",
      actionColor: "text-[#0891B2]",
      illustration: UserManualIllustration,
      onClick: onOpenManual,
    },
  ];

  return (
    <div className="w-full max-w-7xl xl:max-w-[1360px] 2xl:max-w-[1600px] 3xl:max-w-[1880px] mx-auto px-3.5 xs:px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-6 sm:py-8 lg:py-10 2xl:py-14">
      {/* 1 col (mobile) -> 2 cols (tablet) -> 3 cols (desktop/4K) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 xs:gap-5 sm:gap-6 2xl:gap-8">
        {cards.map((card) => {
          const Icon = card.icon;
          const Illustration = card.illustration;

          return (
            <div
              key={card.id}
              onClick={card.onClick}
              className={`group relative flex flex-col justify-between p-4 xs:p-5 sm:p-6 2xl:p-7 rounded-2xl sm:rounded-3xl bg-gradient-to-br ${card.bgGradient} border ${card.borderClass} shadow-subtle hover:shadow-card hover:-translate-y-1 transition-all duration-300 cursor-pointer overflow-hidden min-h-[195px] xs:min-h-[210px] sm:min-h-[225px] 2xl:min-h-[250px] select-none`}
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
                className={`absolute top-3.5 right-4 xs:top-4 xs:right-5 sm:top-5 sm:right-6 text-lg xs:text-xl tracking-widest font-black leading-none ${card.dotColor} opacity-75 pointer-events-none select-none`}
              >
                •••
              </div>

              {/* Main Content Layout (Left Text, Right Illustration) */}
              <div className="flex items-start justify-between gap-1 xs:gap-2 z-10 min-w-0">
                {/* Left Side: Icon, Title, Description */}
                <div className="flex-1 pr-1 xs:pr-2 min-w-0">
                  {/* Circular Icon with Shadow */}
                  <div className="relative inline-block mb-2.5 xs:mb-3.5 sm:mb-4">
                    <div
                      className={`w-10 h-10 xs:w-11 xs:h-11 sm:w-12 sm:h-12 2xl:w-14 2xl:h-14 rounded-full ${card.iconBg} text-white flex items-center justify-center shadow-md transform group-hover:scale-105 transition-transform duration-200`}
                    >
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 2xl:w-7 2xl:h-7" />
                    </div>

                    {/* Pending Count Badge if applicable */}
                    {card.badgeCount && card.badgeCount > 0 ? (
                      <span className="absolute -top-1 -right-1 min-w-[18px] xs:min-w-[20px] h-[18px] xs:h-[20px] px-1 rounded-full bg-rose-600 text-white text-[10px] xs:text-[11px] font-bold flex items-center justify-center border-2 border-white shadow-xs">
                        {card.badgeCount}
                      </span>
                    ) : null}
                  </div>

                  {/* Heading */}
                  <h3 className="text-sm xs:text-base sm:text-lg 2xl:text-xl font-bold text-slate-900 tracking-tight leading-snug group-hover:text-blue-950 transition-colors">
                    {card.title}
                  </h3>

                  {/* Description */}
                  <p className="text-[11px] xs:text-xs sm:text-[13px] 2xl:text-sm text-slate-600 leading-relaxed mt-1 xs:mt-1.5 max-w-[280px] 2xl:max-w-[340px]">
                    {card.description}
                  </p>
                </div>

                {/* Right Side: Themed Responsive Vector Illustration */}
                <div className="shrink-0 flex items-center justify-end -mr-1 xs:-mr-2 sm:mr-0">
                  <Illustration />
                </div>
              </div>

              {/* Bottom Action Link with Arrow */}
              <div className="mt-3.5 sm:mt-4 pt-1 sm:pt-2 z-10">
                <span
                  className={`inline-flex items-center gap-1.5 text-xs sm:text-sm 2xl:text-base font-bold ${card.actionColor} group-hover:gap-2.5 transition-all duration-200`}
                >
                  <span>{card.actionLabel}</span>
                  <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4 transform group-hover:translate-x-1 transition-transform" />
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
