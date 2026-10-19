import React from "react";
import { LucideIcon } from "lucide-react";

interface IStatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon?: LucideIcon;
  iconBgColor?: string;
  iconColor?: string;
  onClick?: () => void;
}

export const StatCard: React.FC<IStatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  onClick,
}) => {
  return (
    <div
      onClick={onClick}
      className={`p-4 bg-white rounded-xl border border-slate-200/80 transition-colors ${
        onClick ? "cursor-pointer hover:border-slate-300 hover:bg-slate-50/50" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-slate-500">{title}</p>
        {Icon && (
          <div className="p-1.5 rounded-lg text-slate-400 bg-slate-50 border border-slate-100">
            <Icon className="w-3.5 h-3.5" />
          </div>
        )}
      </div>

      <div className="mt-1.5">
        <h3 className="text-2xl font-bold text-slate-900 tracking-tight leading-none">
          {value}
        </h3>
        {subtitle && (
          <p className="text-[11px] text-slate-400 mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
};
