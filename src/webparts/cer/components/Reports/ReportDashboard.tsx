import React, { useMemo } from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  RotateCcw,
  XCircle,
  DollarSign,
} from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { getProposalFiscalYear } from "../../utils/dateUtils";
import {
  StatusDoughnutChart,
  MonthlyTrendChart,
  SbuBarChart,
  FinancialSbuBarChart,
  WorkflowStageChart,
} from "./ReportCharts";

export interface IReportDashboardProps {
  proposals: ICERProposal[];
  financialYearFilter?: string;
}

export const ReportDashboard: React.FC<IReportDashboardProps> = ({
  proposals,
  financialYearFilter = "ALL",
}) => {
  // Filtered dataset for dashboard based on selected Financial Year
  const filteredProposals = useMemo(() => {
    if (!financialYearFilter || financialYearFilter === "ALL") {
      return proposals;
    }
    return proposals.filter((p) => getProposalFiscalYear(p) === financialYearFilter);
  }, [proposals, financialYearFilter]);

  // KPI calculations
  const kpis = useMemo(() => {
    const total = filteredProposals.length;
    const inApproval = filteredProposals.filter((p) =>
      ["Pending Approval", "In Approval", "Submitted"].indexOf(p.status) !== -1
    ).length;
    const approved = filteredProposals.filter((p) => p.status === "Approved").length;
    const sendBack = filteredProposals.filter((p) =>
      ["Send Back", "Revised", "Sent Back"].indexOf(p.status) !== -1
    ).length;
    const rejected = filteredProposals.filter((p) => p.status === "Rejected").length;

    let totalAmount = 0;
    filteredProposals.forEach((p) => {
      totalAmount += Number(p.amount) || 0;
    });

    return {
      total,
      inApproval,
      approved,
      sendBack,
      rejected,
      totalAmount,
      inApprovalPct: total > 0 ? Math.round((inApproval / total) * 100) : 0,
      approvedPct: total > 0 ? Math.round((approved / total) * 100) : 0,
    };
  }, [filteredProposals]);

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* 1. Compact 6-KPI Summary Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
        {/* Card 1: Total Proposals */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total Proposals</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-slate-900 leading-none">{kpis.total}</div>
            <div className="text-[11px] font-medium text-slate-400 mt-1">Active directory</div>
          </div>
        </div>

        {/* Card 2: In Approval */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between text-blue-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">In Approval</span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-blue-700 leading-none">{kpis.inApproval}</div>
            <div className="text-[11px] font-semibold text-blue-600 mt-1">
              {kpis.inApprovalPct}% of proposals
            </div>
          </div>
        </div>

        {/* Card 3: Approved */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Approved</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-emerald-700 leading-none">{kpis.approved}</div>
            <div className="text-[11px] font-semibold text-emerald-600 mt-1">
              {kpis.approvedPct}% sanction rate
            </div>
          </div>
        </div>

        {/* Card 4: Send Back */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Send Back</span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-amber-700 leading-none">{kpis.sendBack}</div>
            <div className="text-[11px] font-medium text-amber-600 mt-1">Initiator rework</div>
          </div>
        </div>

        {/* Card 5: Rejected */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Rejected</span>
            <div className="w-8 h-8 rounded-xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0">
              <XCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-rose-700 leading-none">{kpis.rejected}</div>
            <div className="text-[11px] font-medium text-rose-500 mt-1">Closed / Denied</div>
          </div>
        </div>

        {/* Card 6: Total Proposed Amount */}
        <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
          <div className="flex items-center justify-between text-purple-600">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Proposed Value</span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2.5">
            <div className="text-2xl font-black text-purple-900 truncate leading-none">
              ${kpis.totalAmount.toLocaleString()}
            </div>
            <div className="text-[11px] font-medium text-slate-400 mt-1">Cumulative spend</div>
          </div>
        </div>
      </div>

      {/* 3. Row 1 Charts: Status Doughnut & Monthly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <StatusDoughnutChart proposals={filteredProposals} />
        <MonthlyTrendChart proposals={filteredProposals} />
      </div>

      {/* 4. Row 2 Charts: SBU Volume & Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
        <SbuBarChart proposals={filteredProposals} />
        <FinancialSbuBarChart proposals={filteredProposals} />
      </div>

      {/* 5. Row 3 Chart: Sequential Approval Pipeline */}
      <div>
        <WorkflowStageChart proposals={filteredProposals} />
      </div>
    </div>
  );
};
