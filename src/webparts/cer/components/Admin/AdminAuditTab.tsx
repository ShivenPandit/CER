import * as React from "react";
import {
  IAdminAuditRecord,
  AdminAuditAction,
  IAppUser,
} from "../../models/UserModel";

export interface IAdminAuditTabProps {
  auditLog: IAdminAuditRecord[];
  currentUser: IAppUser;
  isLoading?: boolean;
}

export const AdminAuditTab: React.FC<IAdminAuditTabProps> = ({
  auditLog,
  currentUser,
  isLoading = false,
}) => {
  const [searchTerm, setSearchTerm] = React.useState<string>("");
  const [actionFilter, setActionFilter] = React.useState<string>("ALL");
  const [targetFilter, setTargetFilter] = React.useState<string>("ALL");
  const [selectedRecord, setSelectedRecord] =
    React.useState<IAdminAuditRecord | null>(null);

  // Filtered log
  const filteredLogs = React.useMemo(() => {
    return auditLog.filter((item) => {
      // Action filter
      if (actionFilter !== "ALL" && item.action !== actionFilter) {
        return false;
      }
      // Target filter
      if (targetFilter !== "ALL" && item.target_type !== targetFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase();
        const actorMatch =
          (item.actor_name && item.actor_name.toLowerCase().indexOf(query) !== -1) ||
          (item.actor_email && item.actor_email.toLowerCase().indexOf(query) !== -1);
        const targetMatch =
          item.target_id && item.target_id.toLowerCase().indexOf(query) !== -1;
        const detailsMatch =
          item.details && item.details.toLowerCase().indexOf(query) !== -1;
        if (!actorMatch && !targetMatch && !detailsMatch) {
          return false;
        }
      }
      return true;
    });
  }, [auditLog, actionFilter, targetFilter, searchTerm]);

  // Statistics
  const stats = React.useMemo(() => {
    let roleCount = 0;
    let workflowCount = 0;
    let settingsCount = 0;

    auditLog.forEach((item) => {
      if (item.target_type === "USER") roleCount++;
      else if (item.target_type === "WORKFLOW") workflowCount++;
      else if (item.target_type === "SETTINGS") settingsCount++;
    });

    return {
      total: auditLog.length,
      roles: roleCount,
      workflow: workflowCount,
      settings: settingsCount,
    };
  }, [auditLog]);

  const getActionBadge = (action: AdminAuditAction) => {
    switch (action) {
      case "ROLE_ASSIGNED":
        return {
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200",
          label: "Role Assigned",
          icon: "fa-user-plus",
        };
      case "ROLE_UPDATED":
        return {
          bg: "bg-blue-50 text-blue-800 border-blue-200",
          label: "Role Updated",
          icon: "fa-user-cog",
        };
      case "ROLE_REVOKED":
        return {
          bg: "bg-red-50 text-red-800 border-red-200",
          label: "Role Revoked",
          icon: "fa-user-slash",
        };
      case "ROLE_STATUS_TOGGLED":
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200",
          label: "Status Toggled",
          icon: "fa-toggle-on",
        };
      case "WORKFLOW_UPDATED":
        return {
          bg: "bg-purple-50 text-purple-800 border-purple-200",
          label: "Workflow Modified",
          icon: "fa-sitemap",
        };
      case "SETTINGS_UPDATED":
        return {
          bg: "bg-cyan-50 text-cyan-800 border-cyan-200",
          label: "Settings Updated",
          icon: "fa-sliders-h",
        };
      default:
        return {
          bg: "bg-gray-100 text-gray-800 border-gray-200",
          label: action,
          icon: "fa-shield-alt",
        };
    }
  };

  const formatTimestamp = (isoString: string): string => {
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
    } catch {
      return isoString;
    }
  };

  const handleExportCSV = () => {
    if (filteredLogs.length === 0) return;
    const headers = [
      "ID",
      "Timestamp",
      "Actor Name",
      "Actor Email",
      "Action",
      "Target Type",
      "Target ID",
      "Details",
      "Before Value",
      "After Value",
    ];

    const rows = filteredLogs.map((log) => [
      `"${log.id}"`,
      `"${log.timestamp}"`,
      `"${log.actor_name || ""}"`,
      `"${log.actor_email || ""}"`,
      `"${log.action}"`,
      `"${log.target_type}"`,
      `"${log.target_id || ""}"`,
      `"${(log.details || "").replace(/"/g, '""')}"`,
      `"${(log.before_value || "").replace(/"/g, '""')}"`,
      `"${(log.after_value || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `CER_Admin_Audit_Log_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner / Explanation */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="p-1.5 rounded-lg bg-red-500/20 text-red-400">
              <i className="fas fa-shield-alt text-base"></i>
            </span>
            <h3 className="text-base font-bold text-white">
              Enterprise Administrative Audit Log
            </h3>
          </div>
          <p className="text-xs text-slate-300">
            Immutable tracking of role assignments, privileges, approval hierarchies, and
            governance configuration changes with actor attribution and forensic diffs.
          </p>
        </div>
        <div className="flex items-center gap-2 self-start md:self-auto">
          <button
            onClick={handleExportCSV}
            disabled={filteredLogs.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg border border-slate-700 transition disabled:opacity-40"
            title="Export filtered audit logs to CSV"
          >
            <i className="fas fa-file-export"></i>
            Export Audit Trail (CSV)
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-gray-500 text-xs font-medium">
            <span>Total Logged Events</span>
            <i className="fas fa-history text-gray-400"></i>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {stats.total}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">Recorded in session / list</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-emerald-600 text-xs font-medium">
            <span>Role & Privilege Events</span>
            <i className="fas fa-user-shield text-emerald-500"></i>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {stats.roles}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">Assignments & revocations</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-purple-600 text-xs font-medium">
            <span>Workflow Changes</span>
            <i className="fas fa-sitemap text-purple-500"></i>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {stats.workflow}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">Approval matrix updates</div>
        </div>

        <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
          <div className="flex items-center justify-between text-cyan-600 text-xs font-medium">
            <span>System Settings</span>
            <i className="fas fa-sliders-h text-cyan-500"></i>
          </div>
          <div className="text-2xl font-bold text-gray-900 mt-2">
            {stats.settings}
          </div>
          <div className="text-[11px] text-gray-400 mt-0.5">Policy & parameters</div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="relative flex-1">
          <i className="fas fa-search absolute left-3 top-3 text-gray-400 text-xs"></i>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by actor name, email, target ID, or action keywords..."
            className="w-full pl-9 pr-3 py-2 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Action Filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="ALL">All Actions</option>
            <option value="ROLE_ASSIGNED">Role Assigned</option>
            <option value="ROLE_UPDATED">Role Updated</option>
            <option value="ROLE_REVOKED">Role Revoked</option>
            <option value="ROLE_STATUS_TOGGLED">Status Toggled</option>
            <option value="WORKFLOW_UPDATED">Workflow Updated</option>
            <option value="SETTINGS_UPDATED">Settings Updated</option>
          </select>

          {/* Target Filter */}
          <select
            value={targetFilter}
            onChange={(e) => setTargetFilter(e.target.value)}
            className="px-3 py-2 text-xs border border-gray-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-600"
          >
            <option value="ALL">All Target Types</option>
            <option value="USER">User / Role</option>
            <option value="WORKFLOW">Workflow / Hierarchy</option>
            <option value="SETTINGS">Master Settings</option>
          </select>

          {(searchTerm || actionFilter !== "ALL" || targetFilter !== "ALL") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setActionFilter("ALL");
                setTargetFilter("ALL");
              }}
              className="text-xs text-gray-500 hover:text-gray-700 px-2 py-2"
              title="Reset Filters"
            >
              <i className="fas fa-times-circle mr-1"></i> Reset
            </button>
          )}
        </div>
      </div>

      {/* Audit Log Table */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400">
            <i className="fas fa-circle-notch fa-spin text-2xl mb-2 text-blue-600"></i>
            <p className="text-xs">Loading administrative audit records...</p>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <i className="fas fa-clipboard-check text-4xl mb-3 text-gray-300"></i>
            <h4 className="text-sm font-semibold text-gray-700">No Audit Events Found</h4>
            <p className="text-xs text-gray-500 mt-1 max-w-sm mx-auto">
              {auditLog.length === 0
                ? "No administrative events have been recorded yet. Role changes, workflow updates, and configuration actions will automatically be logged here."
                : "No audit events match your filter criteria. Try adjusting the search term or action filters."}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
              <thead className="bg-gray-50 text-gray-600 font-semibold uppercase tracking-wider text-[11px]">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Timestamp
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Action
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Actor
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Target
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Details
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Forensics
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filteredLogs.map((log) => {
                  const badge = getActionBadge(log.action);
                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50/80 transition-colors"
                    >
                      {/* Timestamp */}
                      <td className="px-4 py-3 whitespace-nowrap text-gray-600 font-mono text-[11px]">
                        {formatTimestamp(log.timestamp)}
                      </td>

                      {/* Action */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-semibold border ${badge.bg}`}
                        >
                          <i className={`fas ${badge.icon} text-[10px]`}></i>
                          {badge.label}
                        </span>
                      </td>

                      {/* Actor */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-gray-900">
                          {log.actor_name || "System"}
                        </div>
                        {log.actor_email && (
                          <div className="text-[11px] text-gray-400">
                            {log.actor_email}
                          </div>
                        )}
                      </td>

                      {/* Target */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-gray-100 text-gray-700">
                            {log.target_type}
                          </span>
                          <span className="text-gray-900 font-medium truncate max-w-[150px]">
                            {log.target_id}
                          </span>
                        </div>
                      </td>

                      {/* Details */}
                      <td className="px-4 py-3">
                        <p className="text-gray-700 text-xs line-clamp-2 max-w-md">
                          {log.details}
                        </p>
                      </td>

                      {/* Forensics / View Details */}
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <button
                          onClick={() => setSelectedRecord(log)}
                          className="px-2.5 py-1 text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded border border-blue-200 transition"
                        >
                          <i className="fas fa-eye mr-1"></i> Details
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>
            Showing <strong>{filteredLogs.length}</strong> of{" "}
            <strong>{auditLog.length}</strong> events
          </span>
          <span className="text-[11px] text-gray-400 flex items-center gap-1">
            <i className="fas fa-lock text-emerald-600"></i>
            Compliance retention enforced
          </span>
        </div>
      </div>

      {/* Forensic Detail Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full border border-gray-200 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="bg-slate-900 text-white p-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-blue-500/20 text-blue-400">
                  <i className="fas fa-file-invoice text-sm"></i>
                </span>
                <div>
                  <h4 className="text-sm font-bold text-white">
                    Audit Record #{selectedRecord.id}
                  </h4>
                  <p className="text-[11px] text-slate-300">
                    {formatTimestamp(selectedRecord.timestamp)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setSelectedRecord(null)}
                className="text-slate-400 hover:text-white transition p-1"
              >
                <i className="fas fa-times text-base"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 overflow-y-auto flex-1 text-xs">
              {/* Event Attributes */}
              <div className="grid grid-cols-2 gap-4 bg-gray-50 p-3.5 rounded-xl border border-gray-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                    Action Type
                  </span>
                  <span
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold border ${
                      getActionBadge(selectedRecord.action).bg
                    }`}
                  >
                    {getActionBadge(selectedRecord.action).label}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                    Target Entity
                  </span>
                  <div className="font-semibold text-gray-900">
                    <span className="px-1.5 py-0.2 bg-gray-200 rounded text-[10px] mr-1">
                      {selectedRecord.target_type}
                    </span>
                    {selectedRecord.target_id}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                    Authorized Actor
                  </span>
                  <div className="font-semibold text-gray-900">
                    {selectedRecord.actor_name}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {selectedRecord.actor_email}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] uppercase font-bold text-gray-400 block mb-0.5">
                    Exact Timestamp
                  </span>
                  <div className="font-mono text-gray-700">
                    {selectedRecord.timestamp}
                  </div>
                </div>
              </div>

              {/* Event Summary */}
              <div>
                <label className="text-[11px] font-bold text-gray-700 block mb-1">
                  Action Summary
                </label>
                <div className="p-3 bg-white border border-gray-200 rounded-lg text-gray-800 leading-relaxed">
                  {selectedRecord.details}
                </div>
              </div>

              {/* Before & After Forensic Diff */}
              {(selectedRecord.before_value || selectedRecord.after_value) && (
                <div className="space-y-2">
                  <label className="text-[11px] font-bold text-gray-700 block">
                    Forensic State Comparison
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {/* Before Value */}
                    <div className="border border-red-200 bg-red-50/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-red-800 font-bold text-[11px] mb-1.5">
                        <i className="fas fa-minus-circle"></i> State Before
                      </div>
                      <pre className="font-mono text-[11px] text-gray-800 bg-white p-2.5 rounded border border-red-100 overflow-x-auto whitespace-pre-wrap">
                        {selectedRecord.before_value || "(none / initial state)"}
                      </pre>
                    </div>

                    {/* After Value */}
                    <div className="border border-emerald-200 bg-emerald-50/50 rounded-lg p-3">
                      <div className="flex items-center gap-1.5 text-emerald-800 font-bold text-[11px] mb-1.5">
                        <i className="fas fa-plus-circle"></i> State After
                      </div>
                      <pre className="font-mono text-[11px] text-gray-800 bg-white p-2.5 rounded border border-emerald-100 overflow-x-auto whitespace-pre-wrap">
                        {selectedRecord.after_value || "(none / revoked)"}
                      </pre>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 font-semibold rounded-lg transition text-xs"
              >
                Close Record
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
