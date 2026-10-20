import React from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight,
  BarChart3,
  ExternalLink,
  FileEdit,
  Search,
} from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { IAppUser } from "../../models/UserModel";
import { StatCard } from "./StatCard";
import { StatusBadge } from "../common/StatusBadge";
import { CategoryBadge } from "../common/CategoryBadge";
import { NavView } from "../navigation/Sidebar";

interface IDashboardViewProps {
  proposals: ICERProposal[];
  currentUser: IAppUser;
  onNavigate: (view: NavView, proposalId?: string) => void;
}

export const DashboardView: React.FC<IDashboardViewProps> = ({
  proposals,
  currentUser,
  onNavigate,
}) => {
  // Aggregate real dynamic metrics
  const totalCount = proposals.length;
  const inApprovalCount = proposals.filter((p) => p.status === "In Approval").length;
  const approvedCount = proposals.filter((p) => p.status === "Approved").length;

  const totalCommittedCapex = proposals
    .filter((p) => p.status === "Approved")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  // Items Awaiting Action by current user
  const awaitingMyAction = proposals.filter((p) => {
    if (currentUser.role === "Approver") {
      return (
        p.status === "In Approval" &&
        p.current_level === (currentUser.approval_level || 1)
      );
    }
    if (currentUser.role === "Initiator") {
      return (
        (p.status === "Draft" || p.status === "Rejected") &&
        (p.owname === currentUser.name || p.owner_email === currentUser.email)
      );
    }
    if (currentUser.role === "Admin" || currentUser.role === "Finance_Audit") {
      return p.status === "In Approval";
    }
    return false;
  });

  // Recent Proposals (sorted by modified date)
  const recentProposals = [...proposals]
    .sort((a, b) => new Date(b.modified_date).getTime() - new Date(a.modified_date).getTime())
    .slice(0, 8);

  // Category Breakdown Counts
  const vitalCount = proposals.filter((p) => p.cat === "Vital").length;
  const essentialCount = proposals.filter((p) => p.cat === "Essential").length;
  const desirableCount = proposals.filter((p) => p.cat === "Desirable").length;

  const vitalPercent = totalCount > 0 ? Math.round((vitalCount / totalCount) * 100) : 0;
  const essentialPercent = totalCount > 0 ? Math.round((essentialCount / totalCount) * 100) : 0;
  const desirablePercent = totalCount > 0 ? Math.round((desirableCount / totalCount) * 100) : 0;

  // Format currency consistently according to business data
  const formatCurrency = (amount: number, currency: string = "INR"): string => {
    const symbol = currency === "USD" ? "$" : "₹";
    if (amount >= 10000000) {
      return `${symbol}${(amount / 10000000).toFixed(2)} Cr`;
    }
    if (amount >= 100000) {
      return `${symbol}${(amount / 100000).toFixed(2)} L`;
    }
    return `${symbol}${amount.toLocaleString("en-IN")}`;
  };

  const formatDate = (dateStr?: string): string => {
    if (!dateStr) return "—";
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? "—"
      : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  };

  return (
    <div className="space-y-5">
      {/* 2A: Compact Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            CER Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Capital Expenditure Request Management System
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onNavigate("display")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
            title="Display CER proposal by Proposal No. (FR-03)"
          >
            <Search className="w-3.5 h-3.5 text-slate-500" />
            <span>Display CER</span>
          </button>

          {(currentUser.role === "Initiator" || currentUser.role === "Admin") && (
            <button
              onClick={() => onNavigate("change")}
              className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
              title="Change CER proposal by Proposal No. (FR-02)"
            >
              <FileEdit className="w-3.5 h-3.5 text-slate-500" />
              <span>Change CER</span>
            </button>
          )}

          <button
            onClick={() => onNavigate("reports")}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
            title="CER Reports & Analytics (FR-04)"
          >
            <BarChart3 className="w-3.5 h-3.5 text-slate-500" />
            <span>View Reports</span>
          </button>

          {(currentUser.role === "Initiator" || currentUser.role === "Admin") && (
            <button
              onClick={() => onNavigate("create")}
              className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
              title="Create new CER proposal (FR-01)"
            >
              <Plus className="w-4 h-4" />
              <span>Create CER</span>
            </button>
          )}
        </div>
      </div>

      {/* 2B: KPI Summary (Row of 4 Metrics) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 2xl:gap-6">
        <StatCard
          title="Total CER Proposals"
          value={totalCount}
          subtitle="All active and archived records"
          icon={FileText}
          onClick={() => onNavigate("all-proposals")}
        />

        <StatCard
          title="Pending Approvals"
          value={inApprovalCount}
          subtitle={totalCount > 0 ? `${Math.round((inApprovalCount / totalCount) * 100)}% of pipeline` : "None in queue"}
          icon={Clock}
          onClick={() => onNavigate("pending-approvals")}
        />

        <StatCard
          title="Approved CAPEX"
          value={formatCurrency(totalCommittedCapex)}
          subtitle={`${approvedCount} proposal${approvedCount === 1 ? "" : "s"} sanctioned`}
          icon={CheckCircle2}
          onClick={() => onNavigate("all-proposals")}
        />

        <StatCard
          title="Action Required"
          value={awaitingMyAction.length}
          subtitle={
            currentUser.role === "Approver"
              ? "Awaiting your decision"
              : currentUser.role === "Initiator"
              ? "Drafts & revisions"
              : "Active reviews"
          }
          icon={AlertCircle}
          onClick={() =>
            currentUser.role === "Approver"
              ? onNavigate("pending-approvals")
              : onNavigate("my-proposals")
          }
        />
      </div>

      {/* 2C: Main Content (Fluid Responsive Layout for Widescreen & 4K) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-4 gap-5 2xl:gap-6">
        {/* Left Column: Recent CER Proposals (Uses 3 cols on xl/2xl) */}
        <div className="lg:col-span-2 xl:col-span-3 2xl:col-span-3 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-sm sm:text-base">
                  Recent CER Proposals
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Latest capital expenditure requests across strategic business units
                </p>
              </div>
              <button
                onClick={() => onNavigate("all-proposals")}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1 hover:underline"
              >
                <span>View all ({totalCount})</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {recentProposals.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <p className="text-xs font-medium text-slate-600">No proposals available</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Click 'Create CER' to initiate your first proposal.
                </p>
              </div>
            ) : (
              <>
                {/* Desktop / Tablet Table (sm:block) */}
                <div className="hidden sm:block overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 font-semibold text-[11px] uppercase tracking-wider">
                        <th className="pb-2.5 pl-1 w-[130px]">Proposal No.</th>
                        <th className="pb-2.5">Project Name</th>
                        <th className="pb-2.5 hidden xl:table-cell w-[140px]">Owner</th>
                        <th className="pb-2.5 hidden 2xl:table-cell w-[90px]">SBU</th>
                        <th className="pb-2.5 w-[90px]">Category</th>
                        <th className="pb-2.5 text-right w-[120px]">Amount</th>
                        <th className="pb-2.5 text-center w-[100px]">Status</th>
                        <th className="pb-2.5 w-[110px]">Last Updated</th>
                        <th className="pb-2.5 pr-1 text-right w-[70px]">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {recentProposals.map((prop) => (
                        <tr
                          key={prop.id}
                          className="hover:bg-slate-50/70 transition-colors"
                        >
                          <td className="py-2.5 pl-1 font-mono font-bold text-slate-900 whitespace-nowrap">
                            <button
                              onClick={() => onNavigate("display", prop.cerprno)}
                              className="hover:text-blue-600 transition-colors text-left"
                            >
                              {prop.cerprno}
                            </button>
                          </td>
                          <td
                            className="py-2.5 font-medium text-slate-800 truncate"
                            title={prop.pr_name}
                          >
                            {prop.pr_name}
                          </td>
                          <td className="py-2.5 text-slate-600 hidden xl:table-cell whitespace-nowrap truncate max-w-[140px]" title={prop.owname}>
                            {prop.owname}
                          </td>
                          <td className="py-2.5 text-slate-600 hidden 2xl:table-cell whitespace-nowrap">
                            {prop.sbu}
                          </td>
                          <td className="py-2.5 whitespace-nowrap">
                            <CategoryBadge category={prop.cat} />
                          </td>
                          <td className="py-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                            {formatCurrency(prop.amount, prop.currency)}
                          </td>
                          <td className="py-2.5 text-center whitespace-nowrap">
                            <StatusBadge status={prop.status} size="sm" />
                          </td>
                          <td className="py-2.5 text-slate-500 whitespace-nowrap">
                            {formatDate(prop.modified_date)}
                          </td>
                          <td className="py-2.5 pr-1 text-right whitespace-nowrap">
                            <button
                              onClick={() => onNavigate("display", prop.cerprno)}
                              className="px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-blue-600 hover:bg-slate-100 rounded-lg border border-slate-200 transition-colors shadow-2xs"
                            >
                              Open
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Cards (sm:hidden) */}
                <div className="sm:hidden divide-y divide-slate-100">
                  {recentProposals.map((prop) => (
                    <div key={prop.id} className="py-3 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                          {prop.cerprno}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <CategoryBadge category={prop.cat} />
                          <StatusBadge status={prop.status} size="sm" />
                        </div>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-xs text-slate-900 line-clamp-1">
                            {prop.pr_name}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">
                            {formatCurrency(prop.amount, prop.currency)} • {formatDate(prop.modified_date)}
                          </p>
                        </div>

                        <button
                          onClick={() => onNavigate("display", prop.cerprno)}
                          className="px-3 py-1 text-xs font-semibold text-slate-700 hover:text-blue-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors shrink-0"
                        >
                          Open
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right Column: Pending Actions & Category Distribution (1 col) */}
        <div className="space-y-4">
          {/* Card 1: Items Awaiting Action */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">
                  Items Awaiting Action ({awaitingMyAction.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Tasks requiring your review or input
                </p>
              </div>
              {awaitingMyAction.length > 0 && (
                <button
                  onClick={() =>
                    currentUser.role === "Approver"
                      ? onNavigate("pending-approvals")
                      : onNavigate("my-proposals")
                  }
                  className="text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-0.5"
                >
                  <span>All</span>
                  <ArrowRight className="w-3 h-3" />
                </button>
              )}
            </div>

            {awaitingMyAction.length === 0 ? (
              <div className="py-6 text-center text-slate-400">
                <CheckCircle2 className="w-5 h-5 mx-auto text-emerald-500 mb-1 opacity-80" />
                <p className="text-xs font-medium text-slate-700">All caught up</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No pending action items assigned to you right now.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {awaitingMyAction.slice(0, 3).map((prop) => (
                  <div
                    key={prop.id}
                    className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/60 hover:bg-slate-50 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-xs text-slate-900">
                          {prop.cerprno}
                        </span>
                        <CategoryBadge category={prop.cat} />
                      </div>
                      <p className="text-xs text-slate-700 truncate font-medium max-w-[180px]">
                        {prop.pr_name}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {formatCurrency(prop.amount, prop.currency)} •{" "}
                        {prop.status === "In Approval"
                          ? `Level ${prop.current_level} Review`
                          : prop.status}
                      </p>
                    </div>

                    <button
                      onClick={() =>
                        currentUser.role === "Approver"
                          ? onNavigate("pending-approvals", prop.cerprno)
                          : onNavigate("change", prop.cerprno)
                      }
                      className="px-2.5 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded transition-colors shrink-0"
                    >
                      {currentUser.role === "Approver" ? "Review" : "Edit"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Card 2: Category Distribution */}
          <div className="bg-white rounded-xl border border-slate-200/80 p-4 shadow-sm">
            <div className="mb-3 pb-2 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900 text-sm">
                Category Distribution
              </h3>
              <p className="text-[11px] text-slate-500">
                Breakdown by urgency classification
              </p>
            </div>

            <div className="space-y-2.5">
              {/* Vital */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">Vital ({vitalCount})</span>
                  <span className="text-slate-900 font-semibold">{vitalPercent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full transition-all"
                    style={{ width: `${vitalPercent}%` }}
                  />
                </div>
              </div>

              {/* Essential */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">Essential ({essentialCount})</span>
                  <span className="text-slate-900 font-semibold">{essentialPercent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full transition-all"
                    style={{ width: `${essentialPercent}%` }}
                  />
                </div>
              </div>

              {/* Desirable */}
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-slate-700">Desirable ({desirableCount})</span>
                  <span className="text-slate-900 font-semibold">{desirablePercent}%</span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-600 rounded-full transition-all"
                    style={{ width: `${desirablePercent}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
