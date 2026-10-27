import React from "react";
import { CERStatus } from "../../models/CERModel";

interface IStatusBadgeProps {
  status: CERStatus | string;
  size?: "sm" | "md" | "lg";
}

export const StatusBadge: React.FC<IStatusBadgeProps> = ({ status, size = "md" }) => {
  const getStyles = () => {
    switch (status) {
      case "Approved":
        return "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/10";
      case "In Approval":
        return "bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/10";
      case "Draft":
        return "bg-slate-50 text-slate-700 border-slate-200 ring-slate-500/10";
      case "Rejected":
        return "bg-rose-50 text-rose-700 border-rose-200 ring-rose-500/10";
      case "Revised":
        return "bg-purple-50 text-purple-700 border-purple-200 ring-purple-500/10";
      default:
        return "bg-gray-50 text-gray-700 border-gray-200 ring-gray-500/10";
    }
  };

  const getDotColor = () => {
    switch (status) {
      case "Approved":
        return "bg-emerald-500";
      case "In Approval":
        return "bg-blue-500 animate-pulse";
      case "Draft":
        return "bg-slate-400";
      case "Rejected":
        return "bg-rose-500";
      case "Revised":
        return "bg-purple-500";
      default:
        return "bg-gray-400";
    }
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-xs",
    lg: "px-3 py-1.5 text-sm",
  }[size];

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium rounded-full border ring-1 ring-inset ${getStyles()} ${sizeClasses}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${getDotColor()}`} />
      {status}
    </span>
  );
};
