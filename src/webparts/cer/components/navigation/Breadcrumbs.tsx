import React from "react";
import { ChevronRight, Home } from "lucide-react";
import { NavView } from "./Sidebar";

interface IBreadcrumbsProps {
  currentView: NavView;
  proposalId?: string;
  onNavigate: (view: NavView) => void;
}

export const Breadcrumbs: React.FC<IBreadcrumbsProps> = ({
  currentView,
  proposalId,
  onNavigate,
}) => {
  const getViewLabel = (view: NavView): string => {
    switch (view) {
      case "dashboard":
        return "Dashboard";
      case "create":
        return "Create CER Proposal";
      case "change":
        return "Change CER Proposal";
      case "display":
        return "Display CER Proposal";
      case "my-proposals":
        return "My CER Proposals";
      case "all-proposals":
        return "All CER Proposals";
      case "pending-approvals":
        return "Pending Approvals";
      case "approval-history":
        return "Approval History";
      case "reports":
        return "Reports & Analytics";
      case "audit-trail":
        return "Field-Level Audit Trail";
      case "workflow-config":
        return "Workflow Configuration";
      default:
        return view;
    }
  };

  return (
    <nav className="flex items-center gap-2 text-xs text-slate-500 mb-4 select-none">
      <button
        onClick={() => onNavigate("dashboard")}
        className="flex items-center gap-1 hover:text-blue-600 transition-colors"
      >
        <Home className="w-3.5 h-3.5" />
        <span>SPX CER</span>
      </button>

      {currentView !== "dashboard" && (
        <>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <button
            onClick={() => onNavigate(currentView)}
            className={`font-medium ${
              !proposalId ? "text-slate-900" : "hover:text-blue-600"
            } transition-colors`}
          >
            {getViewLabel(currentView)}
          </button>
        </>
      )}

      {proposalId && (
        <>
          <ChevronRight className="w-3 h-3 text-slate-300" />
          <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
            {proposalId}
          </span>
        </>
      )}
    </nav>
  );
};
