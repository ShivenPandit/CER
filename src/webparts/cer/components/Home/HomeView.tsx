import React from "react";
import { NavView } from "../Navigation/Sidebar";
import { IAppUser } from "../../models/UserModel";
import { HeroBanner } from "./HeroBanner";
import { HomeCardGrid } from "./HomeCardGrid";

interface IHomeViewProps {
  currentUser: IAppUser;
  onNavigate: (view: NavView) => void;
  onOpenManual: () => void;
  pendingCount?: number;
  availableHeight?: number;
  hasOwnedProposals?: boolean;
}

export const HomeView: React.FC<IHomeViewProps> = ({
  currentUser,
  onNavigate,
  onOpenManual,
  pendingCount = 0,
  availableHeight,
  hasOwnedProposals,
}) => {
  return (
    <div className="w-full max-w-none flex-1 flex flex-col min-h-0 h-full bg-[#F8FAFC] overflow-hidden">
      {/* 1. Full-Width Hero Banner Directly Below Header */}
      <HeroBanner availableHeight={availableHeight} />

      {/* 2. Six Pastel Navigation Cards in a 3-Column Auto-Fit Grid */}
      <div className="w-full max-w-none min-w-0 flex-1 flex flex-col min-h-0 overflow-hidden">
        <HomeCardGrid
          currentUser={currentUser}
          onNavigate={onNavigate}
          onOpenManual={onOpenManual}
          pendingApprovalsCount={pendingCount}
          availableHeight={availableHeight}
          hasOwnedProposals={hasOwnedProposals}
        />
      </div>

      {/* 3. Subtle Corporate Footer Line */}
      <footer
        style={{ backgroundColor: "#F8FAFC", borderTop: "1px solid #E2E8F0" }}
        className="py-1 sm:py-1.5 lg:py-2 px-4 text-center select-none shrink-0"
      >
        <div className="w-full max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 3xl:px-16 flex items-center justify-center text-[11px] sm:text-xs xl:text-[12.5px] 2xl:text-sm text-slate-500 font-medium">
          <span>Capital Expenditure Request (CER) Management System &bull; Secure Enterprise Portal</span>
        </div>
      </footer>
    </div>
  );
};
