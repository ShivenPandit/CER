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
    <div className="w-full max-w-none min-h-full flex flex-col bg-[#F8FAFC]">
      {/* 1. Full-Width Hero Banner Directly Below Header */}
      <HeroBanner />

      {/* 2. Six Pastel Navigation Cards in a 3-Column Grid */}
      <div className="flex-1 w-full max-w-none min-w-0">
        <HomeCardGrid
          onNavigate={onNavigate}
          onOpenManual={onOpenManual}
          pendingApprovalsCount={pendingCount}
        />
      </div>

      {/* 3. Subtle Corporate Footer Line */}
      <footer className="py-4 2xl:py-6 px-4 sm:px-6 border-t border-slate-200/60 bg-white/50 text-center text-xs 2xl:text-sm text-slate-500 select-none">
        Capital Expenditure Request (CER) Management System &bull; Secure Enterprise Portal
      </footer>
    </div>
  );
};
