import React, { useState, useEffect } from "react";
import {
  Search,
  Shield,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  ShieldAlert,
  Loader2,
  Filter,
  UserPlus,
  Edit,
} from "lucide-react";
import {
  IAppUser,
  IUserRoleAssignment,
  UserRole,
  IDirectoryUser,
} from "../../models/UserModel";
import { IWorkflowLevel, isProjectOwnerStage } from "../../models/WorkflowModel";
import { ICERDataService } from "../../services/ICERDataService";
import { useDynamicPagination } from "../../hooks/useDynamicPagination";
import { DataTablePagination } from '../Shared/DataTablePagination';

interface IUserManagementTabProps {
  dataService: ICERDataService;
  currentUser: IAppUser;
  roles: IUserRoleAssignment[];
  workflowLevels?: IWorkflowLevel[];
  isLoading?: boolean;
  onRefreshRoles: () => Promise<void>;
}

export const UserManagementTab: React.FC<IUserManagementTabProps> = ({
  dataService,
  currentUser,
  roles,
  workflowLevels,
  isLoading = false,
  onRefreshRoles,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [levels, setLevels] = useState<IWorkflowLevel[]>(workflowLevels || []);

  useEffect(() => {
    if (workflowLevels && workflowLevels.length > 0) {
      setLevels(workflowLevels);
    } else if (workflowLevels === undefined && dataService && dataService.getWorkflowLevels) {
      // Only fetch directly if parent component did not provide workflowLevels
      dataService
        .getWorkflowLevels()
        .then((fetched) => {
          if (fetched && fetched.length > 0) {
            setLevels(fetched);
          }
        })
        .catch((err) => console.warn("[UserManagementTab] Failed to fetch levels:", err));
    }
  }, [workflowLevels, dataService]);

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

  // Confirmation Modals
  const [adminConfirmationTarget, setAdminConfirmationTarget] = useState<string | null>(null);
  const [revokingAssignment, setRevokingAssignment] = useState<IUserRoleAssignment | null>(null);

  // Edit Role Modal
  const [editingAssignment, setEditingAssignment] = useState<IUserRoleAssignment | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("Initiator");
  const [editApprovalLevel, setEditApprovalLevel] = useState<number>(1);
  const [editDepartment, setEditDepartment] = useState("");
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);

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

    return matchSearch && matchRole;
  });

  // Fully Automatic Dynamic Table Pagination
  const pagination = useDynamicPagination({
    totalItems: filteredRoles.length,
    defaultRowHeight: 52,
    bufferBottom: 52,
  });

  const visibleRoles = pagination.paginateItems(filteredRoles);

  useEffect(() => {
    pagination.setCurrentPage(1);
  }, [searchTerm, roleFilter]);

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
    setApprovalLevel(levels.length > 0 ? levels[0].level_id : 1);
    setDepartment("");
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

  const handleOpenEditModal = (assignment: IUserRoleAssignment) => {
    setEditingAssignment(assignment);
    setEditRole(assignment.role);
    setEditApprovalLevel(assignment.approval_level || (levels.length > 0 ? levels[0].level_id : 1));
    setEditDepartment(assignment.department || "");
    setEditErrorMessage(null);
  };

  const handleEditRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;
    setEditErrorMessage(null);

    // Safeguard: Check if demoting the last active Admin
    if (editingAssignment.role === "Admin" && editRole !== "Admin") {
      const activeAdmins = roles.filter((r) => r.role === "Admin");
      if (activeAdmins.length <= 1) {
        setEditErrorMessage("Cannot demote the only Administrator in the system.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const updated: IUserRoleAssignment = {
        ...editingAssignment,
        role: editRole,
        approval_level: editRole === "Approver" ? Number(editApprovalLevel) : undefined,
        department: editDepartment.trim(),
        is_active: true,
      };

      await dataService.updateUserRole(updated, {
        name: currentUser.name,
        email: currentUser.email,
      });

      setSuccessMessage(`Role assignment for ${editingAssignment.user_name} updated successfully.`);
      setEditingAssignment(null);
      await onRefreshRoles();
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err: any) {
      setEditErrorMessage(err.message || "Failed to update role assignment.");
    } finally {
      setIsSubmitting(false);
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
      <div className="bg-white p-3.5 sm:p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Search */}
        <div className="flex-1 relative w-full sm:max-w-md lg:max-w-lg xl:max-w-xl 2xl:max-w-2xl">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, email, or department..."
            className="w-full pl-9 pr-3.5 py-2 text-xs 2xl:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
          />
        </div>

        {/* Filter Controls + Add Button */}
        <div className="flex flex-wrap items-center justify-between sm:justify-end gap-2.5 w-full sm:w-auto">
          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600 flex-1 sm:flex-initial">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full sm:w-auto text-xs 2xl:text-sm bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="ALL">All Roles</option>
              <option value="Admin">Admin</option>
              <option value="Approver">Approver</option>
              <option value="Initiator">Initiator</option>
              <option value="Finance_Audit">Finance & Audit</option>
            </select>
          </div>

          {/* Assign Role Button */}
          <button
            onClick={handleOpenAssignModal}
            className="flex items-center justify-center gap-1.5 px-4 py-2 2xl:px-5 2xl:py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-xs 2xl:text-sm font-semibold rounded-xl shadow-subtle hover:shadow-hover transition-all cursor-pointer w-full sm:w-auto sm:ml-auto"
          >
            <UserPlus className="w-4 h-4" />
            <span>Assign Role</span>
          </button>
        </div>
      </div>

      {/* Role Assignments Table & Mobile Card View */}
      <div
        ref={pagination.tableContainerRef}
        className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden flex flex-col"
      >
        {/* Desktop Table View (>= 640px) */}
        <div className="hidden sm:block overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse text-xs 2xl:text-sm">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px] 2xl:text-xs">
                <th className="py-3 px-4 2xl:py-4 2xl:px-6">Employee</th>
                <th className="py-3 px-4 2xl:py-4 2xl:px-6">Corporate Email</th>
                <th className="py-3 px-4 2xl:py-4 2xl:px-6">Assigned Role</th>
                <th className="py-3 px-4 2xl:py-4 2xl:px-6">Approval Level</th>
                <th className="py-3 px-4 2xl:py-4 2xl:px-6">Department</th>
                <th className="py-3 px-4 2xl:py-4 2xl:px-6">Assigned By</th>
                <th className="py-3 px-4 2xl:py-4 2xl:px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={`user-skeleton-${idx}`} className="animate-pulse">
                    <td className="py-3.5 px-4 2xl:py-4 2xl:px-6">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 2xl:w-8 2xl:h-8 rounded-full bg-slate-200 shrink-0" />
                        <div className="h-3.5 w-36 bg-slate-200 rounded" />
                      </div>
                    </td>
                    <td className="py-3.5 px-4 2xl:py-4 2xl:px-6">
                      <div className="h-3 w-44 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3.5 px-4 2xl:py-4 2xl:px-6">
                      <div className="h-5 w-20 bg-slate-200 rounded-full" />
                    </td>
                    <td className="py-3.5 px-4 2xl:py-4 2xl:px-6">
                      <div className="h-5 w-16 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3.5 px-4 2xl:py-4 2xl:px-6">
                      <div className="h-3 w-32 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3.5 px-4 2xl:py-4 2xl:px-6">
                      <div className="h-3 w-28 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3.5 px-4 2xl:py-4 2xl:px-6 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-5 w-5 bg-slate-200 rounded" />
                        <div className="h-5 w-5 bg-slate-200 rounded" />
                      </div>
                    </td>
                  </tr>
                ))
              ) : visibleRoles.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No role assignments match the selected criteria.
                  </td>
                </tr>
              ) : (
                visibleRoles.map((assignment) => {
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
                      <td className="py-3 px-4 2xl:py-4 2xl:px-6">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 2xl:w-8 2xl:h-8 rounded-full bg-[#0A1E38] text-white flex items-center justify-center font-bold text-[10px] 2xl:text-xs shrink-0">
                            {initials}
                          </div>
                          <span className="font-bold text-slate-900 2xl:text-sm">
                            {assignment.user_name}
                          </span>
                        </div>
                      </td>
                      <td className="py-3 px-4 2xl:py-4 2xl:px-6 font-mono text-[11px] 2xl:text-xs text-slate-600">
                        {assignment.user_email}
                      </td>
                      <td className="py-3 px-4 2xl:py-4 2xl:px-6">
                        <span
                          className={`inline-flex items-center gap-1 text-[10px] 2xl:text-xs font-semibold px-2 py-0.5 2xl:px-2.5 2xl:py-1 rounded-full border ${getRoleBadgeStyle(
                            assignment.role
                          )}`}
                        >
                          <Shield className="w-3 h-3" />
                          <span>{assignment.role.replace("_", " & ")}</span>
                        </span>
                      </td>
                      <td className="py-3 px-4 2xl:py-4 2xl:px-6">
                        {assignment.role === "Approver" && assignment.approval_level ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 2xl:px-2.5 2xl:py-1 rounded border border-blue-200 text-xs w-fit">
                              Level {assignment.approval_level}
                            </span>
                            {(() => {
                              const match = levels.find((l) => l.level_id === assignment.approval_level);
                              return match ? (
                                <span className="text-[10px] 2xl:text-[11px] text-slate-500 mt-0.5 truncate max-w-[140px] 2xl:max-w-[180px]">
                                  {match.role_title || match.level_name}
                                </span>
                              ) : null;
                            })()}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 2xl:py-4 2xl:px-6 text-slate-600 font-medium">
                        {assignment.department || "—"}
                      </td>
                      <td className="py-3 px-4 2xl:py-4 2xl:px-6 text-slate-500 text-[11px] 2xl:text-xs">
                        {assignment.assigned_by}
                      </td>
                      <td className="py-3 px-4 2xl:py-4 2xl:px-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Edit Role Button */}
                          <button
                            onClick={() => handleOpenEditModal(assignment)}
                            className="p-1.5 2xl:p-2 rounded-lg text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer"
                            title="Edit role assignment"
                            aria-label="Edit role assignment"
                          >
                            <Edit className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                          </button>

                          {/* Revoke Role Button */}
                          <button
                            onClick={() => setRevokingAssignment(assignment)}
                            className="p-1.5 2xl:p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Revoke role assignment"
                          >
                            <Trash2 className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
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

        {/* Mobile Card View (< 640px) */}
        <div className="block sm:hidden divide-y divide-slate-100 flex-1">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={`mob-skeleton-${idx}`} className="p-4 space-y-3 animate-pulse">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-slate-200 shrink-0" />
                  <div className="space-y-1.5 flex-1">
                    <div className="h-3.5 w-32 bg-slate-200 rounded" />
                    <div className="h-2.5 w-48 bg-slate-200 rounded" />
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="h-5 w-16 bg-slate-200 rounded-full" />
                  <div className="h-5 w-24 bg-slate-200 rounded" />
                </div>
              </div>
            ))
          ) : visibleRoles.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs px-4">
              No role assignments match the selected criteria.
            </div>
          ) : (
            visibleRoles.map((assignment) => {
              const initials = assignment.user_name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .substring(0, 2)
                .toUpperCase();

              return (
                <div
                  key={assignment.id}
                  className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors"
                >
                  {/* Top: Avatar, Name, Email */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-full bg-[#0A1E38] text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-xs truncate">
                        {assignment.user_name}
                      </h4>
                      <p className="font-mono text-[11px] text-slate-500 truncate">
                        {assignment.user_email}
                      </p>
                    </div>
                  </div>

                  {/* Badges: Assigned Role, Level, Dept/SBU */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${getRoleBadgeStyle(
                        assignment.role
                      )}`}
                    >
                      <Shield className="w-3 h-3" />
                      <span>{assignment.role.replace("_", " & ")}</span>
                    </span>

                    {assignment.role === "Approver" && assignment.approval_level && (
                      <span className="font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 text-[10px]">
                        Level {assignment.approval_level}
                      </span>
                    )}

                    {assignment.department && (
                      <span className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200 truncate max-w-[200px]">
                        {assignment.department}
                      </span>
                    )}
                  </div>

                  {/* Bottom: Assigned By & Actions */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <span className="text-[11px] text-slate-500 truncate max-w-[150px]">
                      By: <span className="font-medium text-slate-700">{assignment.assigned_by || "System"}</span>
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Edit Role Button */}
                      <button
                        onClick={() => handleOpenEditModal(assignment)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors cursor-pointer"
                        title="Edit role assignment"
                        aria-label="Edit role assignment"
                      >
                        <Edit className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      {/* Revoke Role Button */}
                      <button
                        onClick={() => setRevokingAssignment(assignment)}
                        className="p-1.5 rounded-lg text-rose-500 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                        title="Revoke role"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Dynamic Pagination Bar */}
        <DataTablePagination
          currentPage={pagination.currentPage}
          totalPages={pagination.totalPages}
          totalItems={filteredRoles.length}
          startIndex={pagination.startIndex}
          endIndex={pagination.endIndex}
          pageSizeSetting={pagination.pageSizeSetting}
          effectivePageSize={pagination.effectivePageSize}
          onPageChange={pagination.setCurrentPage}
          onPageSizeChange={pagination.setPageSizeSetting}
          onPrevPage={pagination.goToPrevPage}
          onNextPage={pagination.goToNextPage}
          onFirstPage={pagination.goToFirstPage}
          onLastPage={pagination.goToLastPage}
          itemName="roles"
        />
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                  >
                    {levels.length > 0 ? (
                      levels
                        .slice()
                        .sort((a, b) => {
                          const s = (a.sbu || "").localeCompare(b.sbu || "");
                          if (s !== 0) return s;
                          return a.level_id - b.level_id;
                        })
                        .map((lvl) => {
                          const isPO = isProjectOwnerStage(lvl);
                          return (
                            <option key={`${lvl.sbu || "ALL"}-${lvl.level_id}-${lvl.id || ""}`} value={lvl.level_id}>
                              [{lvl.sbu || "All"}] Stage {lvl.level_id} — {lvl.level_name} ({lvl.role_title}){isPO ? " — Auto-fetched per Proposal" : ""}
                            </option>
                          );
                        })
                    ) : (
                      <option value={1}>Stage 1 — Default Review Stage</option>
                    )}
                  </select>
                </div>
              )}

              {/* Department */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  placeholder="e.g. Operations, Finance, IT"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                />
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

      {/* Modal: Edit Role Assignment */}
      {editingAssignment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-bold text-slate-900">
                  Edit Role Assignment
                </h3>
              </div>
              <button
                onClick={() => setEditingAssignment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditRoleSubmit} className="p-6 space-y-4 text-xs">
              {editErrorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editErrorMessage}</span>
                </div>
              )}

              {/* Employee Details (Read-only banner) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                <div>
                  <p className="font-bold text-slate-900">{editingAssignment.user_name}</p>
                  <p className="text-[11px] text-slate-500 font-mono">{editingAssignment.user_email}</p>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200">
                  ID: {editingAssignment.id}
                </span>
              </div>

              {/* Role Selection */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Assigned Role <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as UserRole)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                >
                  <option value="Initiator">Initiator (Create & track proposals)</option>
                  <option value="Approver">Approver (Review assigned stages)</option>
                  <option value="Finance_Audit">Finance & Audit (Reporting & Compliance)</option>
                  <option value="Admin">Administrator (Console & Platform Management)</option>
                </select>
              </div>

              {/* Approval Level (If Approver) */}
              {editRole === "Approver" && (
                <div>
                  <label className="block font-semibold text-slate-800 mb-1">
                    Approval Level Stage <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editApprovalLevel}
                    onChange={(e) => setEditApprovalLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                  >
                    {levels.length > 0 ? (
                      levels
                        .slice()
                        .sort((a, b) => {
                          const s = (a.sbu || "").localeCompare(b.sbu || "");
                          if (s !== 0) return s;
                          return a.level_id - b.level_id;
                        })
                        .map((lvl) => {
                          const isPO = isProjectOwnerStage(lvl);
                          return (
                            <option key={`${lvl.sbu || "ALL"}-${lvl.level_id}-${lvl.id || ""}`} value={lvl.level_id}>
                              [{lvl.sbu || "All"}] Stage {lvl.level_id} — {lvl.level_name} ({lvl.role_title}){isPO ? " — Auto-fetched per Proposal" : ""}
                            </option>
                          );
                        })
                    ) : (
                      <option value={1}>Stage 1 — Default Review Stage</option>
                    )}
                  </select>
                </div>
              )}

              {/* Department */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={editDepartment}
                  onChange={(e) => setEditDepartment(e.target.value)}
                  placeholder="e.g. Operations, Finance, IT"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                />
              </div>

              {/* Admin Warning Note */}
              {editRole === "Admin" && (
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
                  onClick={() => setEditingAssignment(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-subtle transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
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
