import React, { useState, useEffect } from "react";
import {
  Search,
  Plus,
  Shield,
  UserCheck,
  Trash2,
  Power,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldAlert,
  Loader2,
  Filter,
  UserPlus,
  Building,
} from "lucide-react";
import {
  IAppUser,
  IUserRoleAssignment,
  UserRole,
  IDirectoryUser,
} from "../../models/UserModel";
import { ICERDataService } from "../../services/ICERDataService";

interface IUserManagementTabProps {
  dataService: ICERDataService;
  currentUser: IAppUser;
  roles: IUserRoleAssignment[];
  onRefreshRoles: () => Promise<void>;
}

export const UserManagementTab: React.FC<IUserManagementTabProps> = ({
  dataService,
  currentUser,
  roles,
  onRefreshRoles,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");

  // Assignment Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Form Fields
  const [directorySearchQuery, setDirectorySearchQuery] = useState("");
  const [directoryResults, setDirectoryResults] = useState<IDirectoryUser[]>([]);
  const [selectedDirectoryUser, setSelectedDirectoryUser] = useState<IDirectoryUser | null>(null);
  const [isSearchingDirectory, setIsSearchingDirectory] = useState(false);

  const [selectedRole, setSelectedRole] = useState<UserRole>("Initiator");
  const [approvalLevel, setApprovalLevel] = useState<number>(1);
  const [department, setDepartment] = useState("");
  const [sbu, setSbu] = useState("");

  // Confirmation Modals
  const [adminConfirmationTarget, setAdminConfirmationTarget] = useState<string | null>(null);
  const [revokingAssignment, setRevokingAssignment] = useState<IUserRoleAssignment | null>(null);

  // Directory Search Debounce
  useEffect(() => {
    if (!isAssignModalOpen) return;
    const timer = setTimeout(() => {
      if (directorySearchQuery.trim().length >= 2) {
        setIsSearchingDirectory(true);
        dataService
          .searchDirectoryUsers(directorySearchQuery.trim())
          .then((results) => {
            setDirectoryResults(results);
            setIsSearchingDirectory(false);
          })
          .catch((err) => {
            console.warn(err);
            setIsSearchingDirectory(false);
          });
      } else {
        setDirectoryResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [directorySearchQuery, isAssignModalOpen]);

  // Filtering
  const filteredRoles = roles.filter((r) => {
    const q = searchTerm.toLowerCase().trim();
    const matchSearch =
      !q ||
      r.user_name.toLowerCase().indexOf(q) !== -1 ||
      r.user_email.toLowerCase().indexOf(q) !== -1 ||
      (r.department && r.department.toLowerCase().indexOf(q) !== -1);

    const matchRole = roleFilter === "ALL" || r.role === roleFilter;
    const matchStatus =
      statusFilter === "ALL" ||
      (statusFilter === "ACTIVE" ? r.is_active : !r.is_active);

    return matchSearch && matchRole && matchStatus;
  });

  const getRoleBadgeStyle = (role: UserRole): string => {
    switch (role) {
      case "Admin":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Approver":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "Finance_Audit":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Initiator":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const handleOpenAssignModal = () => {
    setSelectedDirectoryUser(null);
    setDirectorySearchQuery("");
    setDirectoryResults([]);
    setSelectedRole("Initiator");
    setApprovalLevel(1);
    setDepartment("");
    setSbu("");
    setErrorMessage(null);
    setIsAssignModalOpen(true);
  };

  const handleSelectDirectoryUser = (user: IDirectoryUser) => {
    setSelectedDirectoryUser(user);
    setDirectorySearchQuery(user.displayName);
    setDirectoryResults([]);
    if (user.department) {
      setDepartment(user.department);
    }
  };

  const handleAssignRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!selectedDirectoryUser) {
      setErrorMessage("Please select a verified employee from the directory search.");
      return;
    }

    const email = selectedDirectoryUser.mail || selectedDirectoryUser.userPrincipalName || "";
    if (!email || email.indexOf("@") === -1) {
      setErrorMessage("Selected directory user does not possess a valid corporate email address.");
      return;
    }

    // Explicit confirmation check before granting Admin role
    if (selectedRole === "Admin" && !adminConfirmationTarget) {
      setAdminConfirmationTarget(selectedDirectoryUser.displayName);
      return;
    }

    setIsSubmitting(true);
    try {
      await dataService.assignUserRole(
        {
          user_name: selectedDirectoryUser.displayName,
          user_email: email,
          login_name: selectedDirectoryUser.userPrincipalName || email,
          role: selectedRole,
          approval_level: selectedRole === "Approver" ? Number(approvalLevel) : undefined,
          department: department.trim() || selectedDirectoryUser.department,
          sbu: sbu.trim() || undefined,
          is_active: true,
          assigned_by: currentUser.name,
          assigned_date: new Date().toISOString(),
        },
        { name: currentUser.name, email: currentUser.email }
      );

      setSuccessMessage(`Role '${selectedRole}' successfully assigned to ${selectedDirectoryUser.displayName}.`);
      setIsAssignModalOpen(false);
      setAdminConfirmationTarget(null);
      await onRefreshRoles();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to assign role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (assignment: IUserRoleAssignment) => {
    try {
      await dataService.updateUserRole(
        {
          ...assignment,
          is_active: !assignment.is_active,
        },
        { name: currentUser.name, email: currentUser.email }
      );
      setSuccessMessage(
        `Role assignment for ${assignment.user_name} marked as ${!assignment.is_active ? "Active" : "Inactive"}.`
      );
      await onRefreshRoles();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to update role status.");
    }
  };

  const handleConfirmRevoke = async () => {
    if (!revokingAssignment) return;
    setIsSubmitting(true);
    try {
      await dataService.revokeUserRole(revokingAssignment.id, {
        name: currentUser.name,
        email: currentUser.email,
      });
      setSuccessMessage(`Role '${revokingAssignment.role}' revoked from ${revokingAssignment.user_name}.`);
      setRevokingAssignment(null);
      await onRefreshRoles();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      alert(err.message || "Failed to revoke role assignment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Success Notification Banner */}
      {successMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-700 hover:text-emerald-900"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Actions & Filters */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search */}
        <div className="flex-1 relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or department..."
            className="w-full pl-9 pr-3.5 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
          />
        </div>

        {/* Filter Controls + Add Button */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Roles ({roles.length})</option>
              <option value="Admin">Admin</option>
              <option value="Approver">Approver</option>
              <option value="Initiator">Initiator</option>
              <option value="Finance_Audit">Finance & Audit</option>
            </select>
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="ALL">All Status</option>
            <option value="ACTIVE">Active Only</option>
            <option value="INACTIVE">Inactive Only</option>
          </select>

          {/* Assign Role Button */}
          <button
            onClick={handleOpenAssignModal}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-subtle hover:shadow-hover transition-all cursor-pointer ml-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Assign Role</span>
          </button>
        </div>
      </div>

      {/* Role Assignments Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Employee</th>
                <th className="py-3 px-4">Corporate Email</th>
                <th className="py-3 px-4">Assigned Role</th>
                <th className="py-3 px-4">Approval Level</th>
                <th className="py-3 px-4">Department / SBU</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Assigned By</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center text-slate-400">
                    No role assignments match the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredRoles.map((assignment) => {
                  const initials = assignment.user_name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .substring(0, 2)
                    .toUpperCase();

                  return (
                    <tr
                      key={assignment.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-[#0A1E38] text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                            {initials}
                          </div>
                          <span className="font-bold text-slate-900">
                            {assignment.user_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-600">
                        {assignment.user_email}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getRoleBadgeStyle(
                            assignment.role
                          )}`}
                        >
                          <Shield className="w-3 h-3" />
                          <span>{assignment.role.replace("_", " & ")}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {assignment.role === "Approver" && assignment.approval_level ? (
                          <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                            Level {assignment.approval_level}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {assignment.department || assignment.sbu || "—"}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${
                            assignment.is_active
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-500 border-slate-200"
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              assignment.is_active ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          <span>{assignment.is_active ? "Active" : "Inactive"}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {assignment.assigned_by}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Toggle Active Button */}
                          <button
                            onClick={() => handleToggleActive(assignment)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              assignment.is_active
                                ? "text-emerald-700 hover:bg-emerald-50"
                                : "text-slate-400 hover:bg-slate-100"
                            }`}
                            title={assignment.is_active ? "Deactivate role" : "Activate role"}
                          >
                            <Power className="w-3.5 h-3.5" />
                          </button>

                          {/* Revoke Role Button */}
                          <button
                            onClick={() => setRevokingAssignment(assignment)}
                            className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Revoke role assignment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Assign Role */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Assign Enterprise Role
                </h3>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignRoleSubmit} className="p-6 space-y-4 text-xs">
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              {/* Directory Search & People Picker */}
              <div className="relative">
                <label className="block font-semibold text-slate-800 mb-1">
                  Employee Directory Search <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={directorySearchQuery}
                    onChange={(e) => setDirectorySearchQuery(e.target.value)}
                    placeholder="Search employee by name or cairnindia email..."
                    className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  />
                  {isSearchingDirectory && (
                    <Loader2 className="w-4 h-4 text-blue-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  )}
                </div>

                {/* Directory Dropdown Results */}
                {directoryResults.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-elevated max-h-48 overflow-y-auto z-50 divide-y divide-slate-100">
                    {directoryResults.map((u) => (
                      <div
                        key={u.id}
                        onClick={() => handleSelectDirectoryUser(u)}
                        className="p-2.5 hover:bg-blue-50/60 cursor-pointer flex items-center justify-between transition-colors"
                      >
                        <div>
                          <p className="font-bold text-slate-900">{u.displayName}</p>
                          <p className="text-[11px] text-slate-500">
                            {u.mail || u.userPrincipalName}
                          </p>
                        </div>
                        {u.department && (
                          <span className="text-[10px] text-slate-400 bg-slate-100 px-2 py-0.5 rounded">
                            {u.department}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {selectedDirectoryUser && (
                  <div className="mt-2 p-2.5 bg-blue-50/60 border border-blue-200 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="font-bold text-blue-900">{selectedDirectoryUser.displayName}</p>
                      <p className="text-[11px] text-blue-700">
                        {selectedDirectoryUser.mail || selectedDirectoryUser.userPrincipalName}
                      </p>
                    </div>
                    <span className="text-[10px] font-semibold text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200">
                      Selected Employee
                    </span>
                  </div>
                )}
              </div>

              {/* Role Selection */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Assign Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="Initiator">Initiator (Create & track proposals)</option>
                  <option value="Approver">Approver (Review assigned stages)</option>
                  <option value="Finance_Audit">Finance & Audit (Reporting & Compliance)</option>
                  <option value="Admin">Administrator (Console & Platform Management)</option>
                </select>
              </div>

              {/* Approval Level (If Approver) */}
              {selectedRole === "Approver" && (
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Approval Level Stage <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={approvalLevel}
                    onChange={(e) => setApprovalLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                  >
                    <option value={1}>Level 1 — Technical & SBU Review</option>
                    <option value={2}>Level 2 — Commercial & Financial Review</option>
                    <option value={3}>Level 3 — Executive Committee Sign-off</option>
                    <option value={4}>Level 4 — Board / Highest Authority</option>
                  </select>
                </div>
              )}

              {/* Department / SBU */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Department
                  </label>
                  <input
                    type="text"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="e.g. Operations, Finance"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    SBU Scope
                  </label>
                  <input
                    type="text"
                    value={sbu}
                    onChange={(e) => setSbu(e.target.value)}
                    placeholder="e.g. RJ North, CBOS"
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Admin Warning Note */}
              {selectedRole === "Admin" && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-[11px] flex items-start gap-2">
                  <ShieldAlert className="w-4 h-4 text-purple-600 shrink-0 mt-0.5" />
                  <span>
                    Granting Administrator access provides elevated privileges over user roles, workflow configurations, and administrative audit logs.
                  </span>
                </div>
              )}

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-subtle hover:shadow-hover transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <span>Confirm Assignment</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Explicit Confirmation for Granting Admin */}
      {adminConfirmationTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-elevated border border-slate-200 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-100 text-purple-700 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Grant Administrator Privileges?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to grant <strong>Administrator</strong> privileges to <strong>{adminConfirmationTarget}</strong>? This user will gain full management rights over user roles and approval workflows.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setAdminConfirmationTarget(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={(e) => handleAssignRoleSubmit(e as any)}
                className="px-5 py-2 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-700 rounded-xl shadow-subtle cursor-pointer"
              >
                Yes, Grant Admin Privileges
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirmation for Revoking Role */}
      {revokingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-elevated border border-slate-200 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Revoke Role Assignment?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Are you sure you want to revoke the <strong>{revokingAssignment.role}</strong> role from <strong>{revokingAssignment.user_name}</strong>? This action will be recorded in the security audit log.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setRevokingAssignment(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRevoke}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-subtle cursor-pointer"
              >
                {isSubmitting ? "Revoking..." : "Confirm Revocation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
