import React from "react";
import {
  FileText,
  Clock,
  CheckCircle2,
  XCircle,
  TrendingUp,
  DollarSign,
  PlusCircle,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
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
  const draftCount = proposals.filter((p) => p.status === "Draft" || p.status === "Revised").length;
  const rejectedCount = proposals.filter((p) => p.status === "Rejected").length;

  const totalCommittedCapex = proposals
    .filter((p) => p.status === "Approved")
    .reduce((sum, p) => sum + (p.amount || 0), 0);

  const totalPipelineCapex = proposals
    .filter((p) => p.status === "In Approval")
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
    .slice(0, 5);

  // Category Breakdown Counts
  const vitalCount = proposals.filter((p) => p.cat === "Vital").length;
  const essentialCount = proposals.filter((p) => p.cat === "Essential").length;
  const desirableCount = proposals.filter((p) => p.cat === "Desirable").length;

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="p-6 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-950 rounded-2xl text-white shadow-card flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
              {currentUser.role.replace("_", " & ")} Portal
            </span>
            <span className="text-xs text-slate-400">Vedanta Limited / SPX</span>
          </div>
          <h2 className="text-xl md:text-2xl font-bold tracking-tight">
            Welcome back, {currentUser.name}
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-xl leading-relaxed">
            Capital Expenditure Request Management System. Monitor approval pipelines,
            inspect field-level audit trails, and maintain governance compliance.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          {(currentUser.role === "Initiator" || currentUser.role === "Admin") && (
            <button
              onClick={() => onNavigate("create")}
              className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs rounded-xl shadow-md shadow-blue-600/30 transition-all hover:scale-[1.02]"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Create New CER</span>
            </button>
          )}

          {currentUser.role === "Approver" && (
            <button
              onClick={() => onNavigate("pending-approvals")}
              className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs rounded-xl shadow-md shadow-amber-500/20 transition-all"
            >
              <Clock className="w-4 h-4" />
              <span>Review Tasks ({awaitingMyAction.length})</span>
            </button>
          )}

          <button
            onClick={() => onNavigate("reports")}
            className="flex items-center gap-2 px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-colors"
          >
            <span>Analytics & Reports</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total CER Proposals"
          value={totalCount}
          subtitle="All active and archived records"
          icon={FileText}
          iconBgColor="bg-slate-100"
          iconColor="text-slate-800"
          onClick={() => onNavigate("all-proposals")}
        />

        <StatCard
          title="Pending Approvals"
          value={inApprovalCount}
          subtitle={`Pipeline: $${(totalPipelineCapex / 1000000).toFixed(1)}M`}
          icon={Clock}
          iconBgColor="bg-blue-50"
          iconColor="text-blue-600"
          onClick={() => onNavigate("pending-approvals")}
        />

        <StatCard
          title="Approved Capex"
          value={`$${(totalCommittedCapex / 1000000).toFixed(1)}M`}
          subtitle={`${approvedCount} proposals sanctioned`}
          icon={CheckCircle2}
          iconBgColor="bg-emerald-50"
          iconColor="text-emerald-600"
          onClick={() => onNavigate("all-proposals")}
        />

        <StatCard
          title="Action Queue"
          value={awaitingMyAction.length}
          subtitle={
            currentUser.role === "Approver"
              ? "Awaiting your decision"
              : currentUser.role === "Initiator"
              ? "Drafts & Revisions"
              : "Active reviews"
          }
          icon={AlertTriangle}
          iconBgColor="bg-amber-50"
          iconColor="text-amber-600"
          onClick={() =>
            currentUser.role === "Approver"
              ? onNavigate("pending-approvals")
              : onNavigate("my-proposals")
          }
        />
      </div>

      {/* Main Grid: Action Queue & Category Balance */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Awaiting Action Table (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-bold text-slate-900 text-sm">
                  Items Awaiting Action ({awaitingMyAction.length})
                </h3>
                <p className="text-xs text-slate-500">
                  Tasks requiring input based on your role ({currentUser.role})
                </p>
              </div>
              <button
                onClick={() =>
                  currentUser.role === "Approver"
                    ? onNavigate("pending-approvals")
                    : onNavigate("my-proposals")
                }
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {awaitingMyAction.length === 0 ? (
              <div className="py-12 text-center text-slate-400">
                <CheckCircle2 className="w-8 h-8 mx-auto text-emerald-500 mb-2 opacity-80" />
                <p className="text-xs font-medium text-slate-700">All caught up!</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  No pending action items assigned to you right now.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {awaitingMyAction.slice(0, 4).map((prop) => (
                  <div
                    key={prop.id}
                    className="p-3.5 rounded-xl border border-slate-100 bg-slate-50/50 hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">
                          {prop.cerprno}
                        </span>
                        <CategoryBadge category={prop.cat} />
                        <StatusBadge status={prop.status} size="sm" />
                      </div>
                      <p className="text-xs font-medium text-slate-700 truncate">
                        {prop.pr_name}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        {prop.currency} {prop.amount.toLocaleString()} • Owner: {prop.owname} • SBU: {prop.sbu}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => onNavigate("display", prop.cerprno)}
                        className="px-2.5 py-1 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors"
                      >
                        Display
                      </button>
                      {(currentUser.role === "Initiator" || currentUser.role === "Admin") && (
                        <button
                          onClick={() => onNavigate("change", prop.cerprno)}
                          className="px-2.5 py-1 text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                        >
                          Change
                        </button>
                      )}
                      {currentUser.role === "Approver" && (
                        <button
                          onClick={() => onNavigate("pending-approvals", prop.cerprno)}
                          className="px-3 py-1 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors"
                        >
                          Review
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Category Breakdown & Governance card (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle flex flex-col justify-between">
          <div>
            <h3 className="font-bold text-slate-900 text-sm mb-1">
              Category Distribution
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Strategic allocation across urgency tiers
            </p>

            <div className="space-y-3">
              {/* Vital */}
              <div className="p-3 rounded-xl border border-rose-100 bg-rose-50/30">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-rose-800">Vital ({vitalCount})</span>
                  <span className="text-rose-700 font-bold">
                    {totalCount > 0 ? Math.round((vitalCount / totalCount) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-rose-100 overflow-hidden">
                  <div
                    className="h-full bg-rose-500 rounded-full"
                    style={{
                      width: `${totalCount > 0 ? (vitalCount / totalCount) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Mission-critical operations; zero postponement tolerance.
                </p>
              </div>

              {/* Essential */}
              <div className="p-3 rounded-xl border border-amber-100 bg-amber-50/30">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-amber-800">Essential ({essentialCount})</span>
                  <span className="text-amber-700 font-bold">
                    {totalCount > 0 ? Math.round((essentialCount / totalCount) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-amber-100 overflow-hidden">
                  <div
                    className="h-full bg-amber-500 rounded-full"
                    style={{
                      width: `${totalCount > 0 ? (essentialCount / totalCount) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Smooth operational continuity with rapid payback.
                </p>
              </div>

              {/* Desirable */}
              <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/30">
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <span className="font-semibold text-blue-800">Desirable ({desirableCount})</span>
                  <span className="text-blue-700 font-bold">
                    {totalCount > 0 ? Math.round((desirableCount / totalCount) * 100) : 0}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-blue-100 overflow-hidden">
                  <div
                    className="h-full bg-blue-500 rounded-full"
                    style={{
                      width: `${totalCount > 0 ? (desirableCount / totalCount) * 100 : 0}%`,
                    }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 mt-1.5">
                  Deferrable optimizations without immediate operational risk.
                </p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 mt-4 text-[11px] text-slate-500 flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600" /> Audit trail active
            </span>
            <button
              onClick={() => onNavigate("audit-trail")}
              className="font-medium text-blue-600 hover:underline"
            >
              View audit log
            </button>
          </div>
        </div>
      </div>

      {/* Recent Proposals Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Recently Updated Proposals
            </h3>
            <p className="text-xs text-slate-500">
              Latest activity across all business units
            </p>
          </div>
          <button
            onClick={() => onNavigate("all-proposals")}
            className="text-xs font-semibold text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            <span>View All CERs ({totalCount})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-100 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="pb-3 pl-2">Proposal No</th>
                <th className="pb-3">Project Name</th>
                <th className="pb-3">Owner</th>
                <th className="pb-3">SBU</th>
                <th className="pb-3">Category</th>
                <th className="pb-3 text-right">Amount</th>
                <th className="pb-3 text-center">Status</th>
                <th className="pb-3">Pending Level</th>
                <th className="pb-3 pr-2 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentProposals.map((prop) => (
                <tr
                  key={prop.id}
                  className="hover:bg-slate-50/70 transition-colors group"
                >
                  <td className="py-3 pl-2 font-semibold text-slate-900">
                    {prop.cerprno}
                  </td>
                  <td className="py-3 font-medium text-slate-800 max-w-[200px] truncate" title={prop.pr_name}>
                    {prop.pr_name}
                  </td>
                  <td className="py-3 text-slate-600">{prop.owname}</td>
                  <td className="py-3 text-slate-600">{prop.sbu}</td>
                  <td className="py-3">
                    <CategoryBadge category={prop.cat} />
                  </td>
                  <td className="py-3 text-right font-semibold text-slate-900">
                    {prop.currency} {prop.amount.toLocaleString()}
                  </td>
                  <td className="py-3 text-center">
                    <StatusBadge status={prop.status} size="sm" />
                  </td>
                  <td className="py-3 text-slate-500">
                    {prop.status === "Approved" ? (
                      <span className="text-emerald-700 font-medium">Approved</span>
                    ) : (
                      `L${prop.current_level} - ${prop.pending_with_role}`
                    )}
                  </td>
                  <td className="py-3 pr-2 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => onNavigate("display", prop.cerprno)}
                        className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded text-xs transition-colors"
                      >
                        Display
                      </button>
                      <button
                        onClick={() => onNavigate("change", prop.cerprno)}
                        className="px-2 py-1 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded text-xs transition-colors"
                      >
                        Change
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
