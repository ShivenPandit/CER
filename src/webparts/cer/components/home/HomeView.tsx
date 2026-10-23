import React from "react";
import { NavView } from "../navigation/Sidebar";
import { IAppUser } from "../../models/UserModel";
import { HeroBanner } from "./HeroBanner";
import { HomeCardGrid } from "./HomeCardGrid";

interface IHomeViewProps {
  currentUser: IAppUser;
  onNavigate: (view: NavView) => void;
  onOpenManual: () => void;
  pendingCount?: number;
}

export const HomeView: React.FC<IHomeViewProps> = ({
  currentUser,
  onNavigate,
  onOpenManual,
  pendingCount = 0,
}) => {
  return (
    <div className="w-full max-w-none flex-1 flex flex-col justify-between bg-[#F8FAFC]">
      {/* 1. Full-Width Hero Banner Directly Below Header */}
      <HeroBanner />

      {/* 2. Six Pastel Navigation Cards in a 3-Column Grid */}
      <div className="flex-1 w-full max-w-none min-w-0 flex flex-col justify-center">
        <HomeCardGrid
          currentUser={currentUser}
          onNavigate={onNavigate}
          onOpenManual={onOpenManual}
          pendingApprovalsCount={pendingCount}
        />
      </div>

      {/* 3. Subtle Corporate Footer Line */}
      <footer
        style={{ backgroundColor: "#F8FAFC", borderTop: "1px solid #E2E8F0" }}
        className="py-1.5 sm:py-2 px-4 text-center text-[10px] sm:text-[11px] text-slate-500 select-none shrink-0"
      >
        Capital Expenditure Request (CER) Management System &bull; Secure Enterprise Portal
      </footer>
    </div>
  );
};
