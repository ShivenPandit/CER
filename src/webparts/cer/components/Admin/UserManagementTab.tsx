import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  Lock,
  Building2,
  ArrowLeft,
  Users,
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
import { UserAvatar } from "../Common/UserAvatar";
import { ROLE_MATRIX_SBUS } from "../../constants";

interface IUserManagementTabProps {
  dataService: ICERDataService;
  currentUser: IAppUser;
  roles: IUserRoleAssignment[];
  workflowLevels?: IWorkflowLevel[];
  isLoading?: boolean;
  onRefreshRoles: () => Promise<void>;
  onCancel?: () => void;
}

export const UserManagementTab: React.FC<IUserManagementTabProps> = ({
  dataService,
  currentUser,
  roles,
  workflowLevels,
  isLoading = false,
  onRefreshRoles,
  onCancel,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [sbuFilter, setSbuFilter] = useState<string>("ALL");
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
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Lock background scrolling while assign role modal is open
  useEffect(() => {
    if (isAssignModalOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isAssignModalOpen]);

  // Form Fields for Assign Modal
  const [directorySearchQuery, setDirectorySearchQuery] = useState("");
  const [directoryResults, setDirectoryResults] = useState<IDirectoryUser[]>([]);
  const [selectedDirectoryUser, setSelectedDirectoryUser] = useState<IDirectoryUser | null>(null);
  const [isSearchingDirectory, setIsSearchingDirectory] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  const [selectedRole, setSelectedRole] = useState<UserRole>("Initiator");
  const [selectedSbu, setSelectedSbu] = useState<string>("");
  const [approvalLevel, setApprovalLevel] = useState<number>(1);

  // Check if selected directory user already exists in CERRoleMatrix (Enforcing unique constraint)
  const selectedEmail = (
    selectedDirectoryUser?.mail ||
    selectedDirectoryUser?.userPrincipalName ||
    ""
  ).toLowerCase().trim();
  const selectedName = (selectedDirectoryUser?.displayName || "").toLowerCase().trim();

  const existingAssignmentForSelected = selectedDirectoryUser
    ? roles.find((r) => {
        const rEmail = (r.user_email || "").toLowerCase().trim();
        const rLogin = (r.login_name || "").toLowerCase().trim();
        const rName = (r.user_name || "").toLowerCase().trim();
        const matchEmail = !!selectedEmail && (rEmail === selectedEmail || rLogin === selectedEmail);
        const matchName = !!selectedName && rName === selectedName;
        return matchEmail || matchName;
      })
    : null;

  // Revocation Confirmation Modal
  const [revokingAssignment, setRevokingAssignment] = useState<IUserRoleAssignment | null>(null);

  // Edit Role Modal
  const [editingAssignment, setEditingAssignment] = useState<IUserRoleAssignment | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("Initiator");
  const [editSbu, setEditSbu] = useState<string>("");
  const [editApprovalLevel, setEditApprovalLevel] = useState<number>(1);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);
  const [hasAttemptedEditSubmit, setHasAttemptedEditSubmit] = useState(false);

  // Close dropdown on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        dropdownContainerRef.current &&
        !dropdownContainerRef.current.contains(e.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  // Directory Search Debounce (Supports 1-character quick lookup)
  useEffect(() => {
    if (!isAssignModalOpen) return;
    const trimmed = directorySearchQuery.trim();

    // If user is already selected and input matches their name, do not re-query
    if (selectedDirectoryUser && selectedDirectoryUser.displayName.trim().toLowerCase() === trimmed.toLowerCase()) {
      setIsSearchingDirectory(false);
      return;
    }

    if (trimmed.length >= 1) {
      setIsSearchingDirectory(true);
      setIsDropdownOpen(true);
      const timer = setTimeout(() => {
        dataService
          .searchDirectoryUsers(trimmed)
          .then((results) => {
            setDirectoryResults(results || []);
            setIsSearchingDirectory(false);
            setIsDropdownOpen(true);
          })
          .catch((err) => {
            console.warn("[UserManagementTab] Directory search failed:", err);
            setDirectoryResults([]);
            setIsSearchingDirectory(false);
          });
      }, 150);

      return () => clearTimeout(timer);
    } else {
      setDirectoryResults([]);
      setIsSearchingDirectory(false);
      setIsDropdownOpen(false);
    }
  }, [directorySearchQuery, isAssignModalOpen, selectedDirectoryUser, dataService]);

  // Filtering
  const filteredRoles = roles.filter((r) => {
    const q = searchTerm.toLowerCase().trim();
    const matchSearch =
      !q ||
      r.user_name.toLowerCase().indexOf(q) !== -1 ||
      r.user_email.toLowerCase().indexOf(q) !== -1;

    const matchRole = roleFilter === "ALL" || r.role === roleFilter;
    const matchSbu = sbuFilter === "ALL" || (r.sbu && r.sbu.toLowerCase() === sbuFilter.toLowerCase());

    return matchSearch && matchRole && matchSbu;
  });

  // Fully Automatic Dynamic Table Pagination
  const pagination = useDynamicPagination({
    totalItems: filteredRoles.length,
    defaultRowHeight: 58,
    bufferBottom: 84,
  });

  const visibleRoles = pagination.paginateItems(filteredRoles);

  useEffect(() => {
    pagination.setCurrentPage(1);
  }, [searchTerm, roleFilter, sbuFilter]);

  const getRoleBadgeStyle = (role: UserRole): string => {
    switch (role) {
      case "Admin":
        return "bg-purple-50 text-purple-700 border-purple-200";
      case "Approver":
        return "bg-[#012964]/10 text-[#012964] border-[#012964]/20";
      case "Finance_Audit":
        return "bg-emerald-50 text-emerald-700 border-emerald-200";
      case "Initiator":
      default:
        return "bg-slate-100 text-slate-700 border-slate-200";
    }
  };

  const getApproverRoleTitle = (level: number): string => {
    switch (level) {
      case 1:
        return "Finance";
      case 3:
        return "BU CFO";
      case 4:
        return "BU Director";
      case 5:
        return "VOGL CFO";
      case 6:
        return "VOGL CEO";
      default:
        return "Approver";
    }
  };

  const handleOpenAssignModal = () => {
    setSelectedDirectoryUser(null);
    setDirectorySearchQuery("");
    setDirectoryResults([]);
    setIsDropdownOpen(false);
    setSelectedRole("Initiator");
    setSelectedSbu("");
    setApprovalLevel(1);
    setErrorMessage(null);
    setHasAttemptedSubmit(false);
    setIsAssignModalOpen(true);
  };

  const handleSelectDirectoryUser = (user: IDirectoryUser) => {
    setSelectedDirectoryUser(user);
    setDirectorySearchQuery(user.displayName);
    setDirectoryResults([]);
    setIsDropdownOpen(false);
    setErrorMessage(null);
  };

  const handleAssignRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setHasAttemptedSubmit(true);
    setErrorMessage(null);

    // Inline validation blocks submission if user is missing or already assigned in CERRoleMatrix
    if (!selectedDirectoryUser || existingAssignmentForSelected) {
      return;
    }

    const email = selectedDirectoryUser.mail || selectedDirectoryUser.userPrincipalName || "";
    if (!email || email.indexOf("@") === -1) {
      setErrorMessage("Selected directory user does not possess a valid corporate email address.");
      return;
    }

    // System Admins cannot be created via the UI per security policy
    if (selectedRole === "Admin") {
      setErrorMessage("System Admin accounts cannot be created via the web interface. They must be added directly in the SharePoint CERRoleMatrix list.");
      return;
    }

    const isApprover = selectedRole === "Approver";
    if (isApprover) {
      if (!selectedSbu || !selectedSbu.trim() || selectedSbu === "All" || selectedSbu === "ALL") {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const lvl = isApprover ? Number(approvalLevel) : undefined;
      const title = isApprover && lvl ? getApproverRoleTitle(lvl) : undefined;
      const finalSbu = selectedSbu && selectedSbu.trim() !== "" && selectedSbu !== "All" && selectedSbu !== "ALL" ? selectedSbu.trim() : undefined;

      await dataService.assignUserRole(
        {
          user_name: selectedDirectoryUser.displayName,
          user_email: email,
          login_name: selectedDirectoryUser.userPrincipalName || email,
          user_id: selectedDirectoryUser.id && !isNaN(Number(selectedDirectoryUser.id)) && Number(selectedDirectoryUser.id) > 0
            ? Number(selectedDirectoryUser.id)
            : undefined,
          role: selectedRole,
          sbu: finalSbu,
          approval_level: lvl,
          approver_role_title: title,
          is_active: true,
          assigned_by: currentUser.name,
          assigned_date: new Date().toISOString(),
        },
        { name: currentUser.name, email: currentUser.email }
      );

      if (finalSbu) {
        setSuccessMessage(`Role '${selectedRole}' for SBU '${finalSbu}' successfully assigned to ${selectedDirectoryUser.displayName}.`);
      } else {
        setSuccessMessage(`Role '${selectedRole}' successfully assigned to ${selectedDirectoryUser.displayName}.`);
      }
      setIsAssignModalOpen(false);
      await onRefreshRoles();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to assign role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEditModal = (assignment: IUserRoleAssignment) => {
    if (assignment.role === "Admin") {
      // System Admins cannot be modified via UI
      return;
    }
    setEditingAssignment(assignment);
    setEditRole(assignment.role);
    setEditSbu(assignment.sbu && assignment.sbu !== "All" && assignment.sbu !== "—" ? assignment.sbu : "");
    setEditApprovalLevel(assignment.approval_level || 1);
    setEditErrorMessage(null);
    setHasAttemptedEditSubmit(false);
  };

  const handleEditRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAssignment) return;
    setHasAttemptedEditSubmit(true);
    setEditErrorMessage(null);

    // Safeguard: Cannot promote to Admin or edit Admin via UI
    if (editingAssignment.role === "Admin" || editRole === "Admin") {
      setEditErrorMessage("System Admin accounts cannot be created or modified via the UI. Manage directly in SharePoint CERRoleMatrix list.");
      return;
    }

    const isApprover = editRole === "Approver";
    if (isApprover) {
      if (!editSbu || !editSbu.trim() || editSbu === "All" || editSbu === "ALL") {
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const lvl = isApprover ? Number(editApprovalLevel) : undefined;
      const title = isApprover && lvl ? getApproverRoleTitle(lvl) : undefined;
      const finalSbu = editSbu && editSbu.trim() !== "" && editSbu !== "All" && editSbu !== "ALL" ? editSbu.trim() : undefined;

      const updated: IUserRoleAssignment = {
        ...editingAssignment,
        role: editRole,
        sbu: finalSbu,
        approval_level: lvl,
        approver_role_title: title,
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
    if (revokingAssignment.role === "Admin") {
      alert("System Admin accounts cannot be deleted through the UI. They must be managed directly in SharePoint CERRoleMatrix list.");
      setRevokingAssignment(null);
      return;
    }

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

      {/* Top Header & Actions Bar: Title, Search, Filters, and Assign Role Button */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col xl:flex-row xl:items-center justify-between gap-3.5">
        {/* Left: Optional Back button + Title & Subtitle */}
        <div className="flex items-center gap-3 shrink-0">
          {onCancel && (
            <button
              onClick={onCancel}
              className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
              title="Go back"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          {onCancel && <div className="h-6 w-px bg-slate-200 shrink-0" />}
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-[#012964]/10 flex items-center justify-center text-[#012964] shrink-0">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                User & Role Management
              </h2>
            </div>
          </div>
        </div>

        {/* Right: Search + Filters + Assign Role Button */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto xl:justify-end">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] sm:w-60 md:w-64 lg:w-72 xl:w-64 2xl:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search users..."
              className="w-full pl-11 pr-3.5 py-1.5 text-xs 2xl:text-sm bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964] focus:bg-white transition-all text-slate-900 placeholder:text-slate-400"
            />
          </div>

          {/* SBU Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={sbuFilter}
              onChange={(e) => setSbuFilter(e.target.value)}
              className="text-xs 2xl:text-sm bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964] cursor-pointer"
            >
              <option value="ALL">All SBUs</option>
              {ROLE_MATRIX_SBUS.map((sbu) => (
                <option key={sbu} value={sbu}>{sbu}</option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-600">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="text-xs 2xl:text-sm bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964] cursor-pointer"
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
            className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-[#012964] hover:bg-[#001f4d] text-white text-xs 2xl:text-sm font-semibold rounded-xl shadow-subtle hover:shadow-hover transition-all cursor-pointer shrink-0"
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
                <th className="py-3 px-4 2xl:py-4 2xl:px-6">Assigned Role</th>
                <th className="py-3 px-4 2xl:py-4 2xl:px-6">SBU</th>
                <th className="py-3 px-4 2xl:py-4 2xl:px-6">Approval Level Stage</th>
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
                      <div className="h-5 w-20 bg-slate-200 rounded-full" />
                    </td>
                    <td className="py-3.5 px-4 2xl:py-4 2xl:px-6">
                      <div className="h-5 w-16 bg-slate-200 rounded" />
                    </td>
                    <td className="py-3.5 px-4 2xl:py-4 2xl:px-6">
                      <div className="h-5 w-24 bg-slate-200 rounded" />
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
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No role assignments match the selected criteria.
                  </td>
                </tr>
              ) : (
                visibleRoles.map((assignment) => {
                  return (
                    <tr
                      key={assignment.id}
                      className="hover:bg-slate-50/60 transition-colors"
                    >
                      <td className="py-3 px-4 2xl:py-4 2xl:px-6">
                        <div className="flex items-center gap-2.5">
                          <UserAvatar
                            name={assignment.user_name}
                            email={assignment.user_email}
                            size="sm"
                          />
                          <div className="flex flex-col min-w-0">
                            <span className="font-bold text-slate-900 2xl:text-sm truncate">
                              {assignment.user_name}
                            </span>
                            {assignment.user_email && (
                              <span className="text-[11px] text-slate-400 font-mono truncate">
                                {assignment.user_email}
                              </span>
                            )}
                          </div>
                        </div>
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
                        {assignment.sbu && assignment.sbu !== "All" && assignment.sbu !== "—" && assignment.sbu.trim() !== "" ? (
                          <span className="font-semibold text-xs px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                            {assignment.sbu}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-medium text-xs">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 2xl:py-4 2xl:px-6">
                        {assignment.role === "Approver" && assignment.approval_level ? (
                          <div className="flex flex-col">
                            <span className="font-semibold text-[#012964] bg-[#012964]/10 px-2 py-0.5 2xl:px-2.5 2xl:py-1 rounded border border-[#012964]/20 text-xs w-fit">
                              Stage L{assignment.approval_level}
                            </span>
                            <span className="text-[11px] text-slate-600 font-medium mt-0.5 truncate max-w-[160px] 2xl:max-w-[200px]">
                              {assignment.approver_role_title || getApproverRoleTitle(assignment.approval_level)}
                            </span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs font-medium">—</span>
                        )}
                      </td>
                      <td className="py-3 px-4 2xl:py-4 2xl:px-6 text-right">
                        {assignment.role === "Admin" ? (
                          <div className="flex items-center justify-end">
                            <span
                              className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-700 bg-purple-50 px-2 py-1 rounded-md border border-purple-200"
                              title="System Admin accounts cannot be edited or deleted via the UI. Manage directly in SharePoint CERRoleMatrix list."
                            >
                              <Lock className="w-3 h-3 text-purple-600" />
                              <span>Managed in SP</span>
                            </span>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Edit Role Button */}
                            <button
                              onClick={() => handleOpenEditModal(assignment)}
                              className="p-1.5 2xl:p-2 rounded-lg text-[#012964] hover:bg-[#012964]/10 transition-colors cursor-pointer"
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
                        )}
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
              return (
                <div
                  key={assignment.id}
                  className="p-4 space-y-3 bg-white hover:bg-slate-50/50 transition-colors"
                >
                  {/* Top: Avatar, Name, Email */}
                  <div className="flex items-center gap-2.5 min-w-0">
                    <UserAvatar
                      name={assignment.user_name}
                      email={assignment.user_email}
                      size="md"
                    />
                    <div className="min-w-0">
                      <h4 className="font-bold text-slate-900 text-xs truncate">
                        {assignment.user_name}
                      </h4>
                      <p className="font-mono text-[11px] text-slate-500 truncate">
                        {assignment.user_email}
                      </p>
                    </div>
                  </div>

                  {/* Badges: Assigned Role, SBU, Level, Dept */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span
                      className={`inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${getRoleBadgeStyle(
                        assignment.role
                      )}`}
                    >
                      <Shield className="w-3 h-3" />
                      <span>{assignment.role.replace("_", " & ")}</span>
                    </span>

                    {assignment.sbu && assignment.sbu !== "All" && assignment.sbu !== "—" && assignment.sbu.trim() !== "" ? (
                      <span className="text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                        SBU: {assignment.sbu}
                      </span>
                    ) : (
                      <span className="text-[10px] font-semibold text-slate-400 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                        SBU: —
                      </span>
                    )}

                    {assignment.role === "Approver" && assignment.approval_level && (
                      <span className="font-semibold text-[#012964] bg-[#012964]/10 px-2 py-0.5 rounded border border-[#012964]/20 text-[10px]">
                        L{assignment.approval_level} ({assignment.approver_role_title || getApproverRoleTitle(assignment.approval_level)})
                      </span>
                    )}
                  </div>

                  {/* Bottom: Actions */}
                  <div className="flex items-center justify-end pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                    <div>
                      {assignment.role === "Admin" ? (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-medium text-purple-700 bg-purple-50 px-2 py-0.5 rounded border border-purple-200"
                          title="System Admin accounts cannot be edited or deleted via the UI"
                        >
                          <Lock className="w-3 h-3 text-purple-600" />
                          <span>Managed in SP</span>
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          {/* Edit Role Button */}
                          <button
                            onClick={() => handleOpenEditModal(assignment)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-[#012964]/10 text-[#012964] border border-[#012964]/20 hover:bg-[#012964]/20 transition-colors cursor-pointer"
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
                      )}
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
      {isAssignModalOpen && createPortal(
        <div className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] my-auto">
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#012964]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Assign Role
                </h3>
              </div>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAssignRoleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1 min-h-0">

              {/* Error Message Alert */}
              {errorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2 animate-fade-in">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-relaxed font-medium">{errorMessage}</span>
                </div>
              )}

              {/* Directory Search & People Picker */}
              <div className="relative" ref={dropdownContainerRef}>
                <label className="block font-semibold text-slate-800 mb-1">
                  Employee Directory <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    value={directorySearchQuery}
                    onChange={(e) => {
                      const val = e.target.value;
                      setDirectorySearchQuery(val);
                      if (selectedDirectoryUser && val !== selectedDirectoryUser.displayName) {
                        setSelectedDirectoryUser(null);
                      }
                      if (val.trim().length >= 1) {
                        setIsDropdownOpen(true);
                      } else {
                        setIsDropdownOpen(false);
                        setDirectoryResults([]);
                      }
                    }}
                    onFocus={() => {
                      if (directorySearchQuery.trim().length >= 1) {
                        setIsDropdownOpen(true);
                      }
                    }}
                    placeholder="Search directory..."
                    className={`w-full pl-9 pr-9 py-2 bg-slate-50 border rounded-xl text-xs focus:bg-white focus:outline-none transition-colors ${
                      hasAttemptedSubmit && !selectedDirectoryUser
                        ? "border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-200 text-slate-900"
                        : "border-slate-300 focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964]"
                    }`}
                  />
                  {isSearchingDirectory ? (
                    <Loader2 className="w-4 h-4 text-[#012964] animate-spin absolute right-3 top-1/2 -translate-y-1/2" />
                  ) : directorySearchQuery ? (
                    <button
                      type="button"
                      onClick={() => {
                        setDirectorySearchQuery("");
                        setSelectedDirectoryUser(null);
                        setDirectoryResults([]);
                        setIsDropdownOpen(false);
                      }}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-0.5 rounded-full hover:bg-slate-200 transition-colors"
                      title="Clear search"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  ) : null}
                </div>

                {/* Inline validation when no employee selected */}
                {hasAttemptedSubmit && !selectedDirectoryUser && (
                  <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1 animate-fade-in">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>Select an employee from the directory.</span>
                  </p>
                )}

                {/* Directory Dropdown Results (Only shown after typing 1 or more characters) */}
                {isDropdownOpen && directorySearchQuery.trim().length >= 1 && isSearchingDirectory && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-elevated p-3 z-50 flex items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="w-4 h-4 text-[#012964] animate-spin shrink-0" />
                    <span className="text-xs text-slate-600 font-medium">Searching directory...</span>
                  </div>
                )}

                {isDropdownOpen && directorySearchQuery.trim().length >= 1 && !isSearchingDirectory && directoryResults.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-elevated max-h-56 overflow-y-auto z-50 divide-y divide-slate-100">
                    {directoryResults.map((u) => {
                      const email = u.mail || u.userPrincipalName || "";
                      const uEmail = email.toLowerCase().trim();
                      const uName = (u.displayName || "").toLowerCase().trim();
                      const uExisting = roles.find((r) => {
                        if (!r.is_active) return false;
                        const rEmail = (r.user_email || "").toLowerCase().trim();
                        const rLogin = (r.login_name || "").toLowerCase().trim();
                        const rName = (r.user_name || "").toLowerCase().trim();
                        return (!!uEmail && (rEmail === uEmail || rLogin === uEmail)) || (!!uName && rName === uName);
                      });

                      return (
                        <div
                          key={u.id || email || u.displayName}
                          onClick={() => handleSelectDirectoryUser(u)}
                          className="p-2.5 hover:bg-[#012964]/5 cursor-pointer flex items-center justify-between transition-colors gap-2.5 group"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <UserAvatar
                              name={u.displayName}
                              email={email}
                              size="md"
                            />
                            <div className="min-w-0">
                              <p className="font-bold text-slate-900 group-hover:text-[#012964] transition-colors truncate">
                                {u.displayName}
                              </p>
                              <p className="text-[11px] text-slate-500 truncate">
                                {email}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            {uExisting && (
                              <span className="text-[10px] text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-md font-semibold">
                                Already Exists ({uExisting.role})
                              </span>
                            )}
                            {u.department && (
                              <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md font-medium">
                                {u.department}
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* No matching employees fallback */}
                {isDropdownOpen && !isSearchingDirectory && directorySearchQuery.trim().length >= 1 && directoryResults.length === 0 && !selectedDirectoryUser && (
                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-elevated p-4 z-50 text-center">
                    <p className="font-semibold text-slate-700 text-xs">No users found</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      No matches for &ldquo;{directorySearchQuery.trim()}&rdquo;
                    </p>
                  </div>
                )}

                {selectedDirectoryUser && (
                  <div className={`mt-2 p-2.5 rounded-xl flex items-center justify-between gap-3 border transition-colors ${
                    existingAssignmentForSelected
                      ? "bg-rose-50/40 border-rose-300"
                      : "bg-[#012964]/5 border-[#012964]/20"
                  }`}>
                    <div className="flex items-center gap-2.5 min-w-0">
                      <UserAvatar
                        name={selectedDirectoryUser.displayName}
                        email={selectedDirectoryUser.mail || selectedDirectoryUser.userPrincipalName}
                        size="md"
                      />
                      <div className="min-w-0">
                        <p className={`font-bold truncate ${
                          existingAssignmentForSelected ? "text-rose-950" : "text-[#012964]"
                        }`}>
                          {selectedDirectoryUser.displayName}
                        </p>
                        <p className={`text-[11px] truncate ${
                          existingAssignmentForSelected ? "text-rose-700" : "text-[#012964]/80"
                        }`}>
                          {selectedDirectoryUser.mail || selectedDirectoryUser.userPrincipalName}
                        </p>
                      </div>
                    </div>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border shrink-0 ${
                      existingAssignmentForSelected
                        ? "text-rose-800 bg-white border-rose-300"
                        : "text-[#012964] bg-white border-[#012964]/20"
                    }`}>
                      {existingAssignmentForSelected ? `Already Assigned (${existingAssignmentForSelected.role})` : "Selected Employee"}
                    </span>
                  </div>
                )}

                {/* Compact Inline Duplicate Validation Notice */}
                {selectedDirectoryUser && existingAssignmentForSelected && (
                  <div className="mt-1.5 px-2.5 py-1.5 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-1.5 text-rose-700 text-xs animate-fade-in">
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                    <span className="truncate">
                      Already assigned role <strong>'{existingAssignmentForSelected.role}'</strong>. Employee must be unique.
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964]"
                >
                  <option value="Initiator">Initiator</option>
                  <option value="Approver">Approver</option>
                  <option value="Finance_Audit">Finance & Audit</option>
                </select>
              </div>

              {/* SBU Selection */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Strategic Business Unit (SBU){" "}
                  {selectedRole === "Approver" ? (
                    <span className="text-rose-500">*</span>
                  ) : (
                    <span className="text-xs text-slate-400 font-normal">(Optional)</span>
                  )}
                </label>
                <select
                  value={selectedSbu}
                  onChange={(e) => {
                    setSelectedSbu(e.target.value);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs focus:bg-white focus:outline-none transition-colors font-medium cursor-pointer ${
                    hasAttemptedSubmit && selectedRole === "Approver" && (!selectedSbu || !selectedSbu.trim() || selectedSbu === "All" || selectedSbu === "ALL")
                      ? "border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-200 text-slate-900"
                      : "border-slate-300 focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964]"
                  }`}
                >
                  <option value="">-- Select SBU --</option>
                  {ROLE_MATRIX_SBUS.map((sbu) => (
                    <option key={sbu} value={sbu}>{sbu}</option>
                  ))}
                </select>

                {/* Inline SBU validation error */}
                {hasAttemptedSubmit && selectedRole === "Approver" && (!selectedSbu || !selectedSbu.trim() || selectedSbu === "All" || selectedSbu === "ALL") && (
                  <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1 animate-fade-in">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>Select an SBU for this role.</span>
                  </p>
                )}
              </div>

              {/* Approval Level (If Approver) */}
              {selectedRole === "Approver" && (
                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-800 mb-1">
                    Approval Stage <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={approvalLevel}
                    onChange={(e) => setApprovalLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964] font-medium"
                  >
                    <option value={1}>Stage L1 — Finance</option>
                    <option value={3}>Stage L3 — BU CFO</option>
                    <option value={4}>Stage L4 — BU Director</option>
                    <option value={5}>Stage L5 — VOGL CFO</option>
                    <option value={6}>Stage L6 — VOGL CEO</option>
                  </select>
                  <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    ℹ️ Stage L2 (Project Owner) is derived dynamically from each proposal.
                  </p>
                </div>
              )}

              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !selectedDirectoryUser || !!existingAssignmentForSelected}
                  className={`px-5 py-2 text-xs font-semibold rounded-xl transition-all flex items-center gap-1.5 ${
                    isSubmitting || !selectedDirectoryUser || !!existingAssignmentForSelected
                      ? "bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none"
                      : "bg-[#012964] hover:bg-[#001f4d] text-white shadow-subtle hover:shadow-hover cursor-pointer"
                  }`}
                  title={
                    !selectedDirectoryUser
                      ? "Please select a verified employee from directory search"
                      : existingAssignmentForSelected
                      ? `Cannot assign: ${selectedDirectoryUser?.displayName} already exists with role '${existingAssignmentForSelected.role}'`
                      : undefined
                  }
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Assigning...</span>
                    </>
                  ) : (
                    <span>Assign Role</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Modal: Edit Role Assignment */}
      {editingAssignment && createPortal(
        <div className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] my-auto">
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-[#012964]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Edit Role
                </h3>
              </div>
              <button
                onClick={() => setEditingAssignment(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditRoleSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1 min-h-0">
              {editErrorMessage && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editErrorMessage}</span>
                </div>
              )}

              {/* Employee Details (Read-only banner) */}
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <UserAvatar
                    name={editingAssignment.user_name}
                    email={editingAssignment.user_email}
                    size="md"
                  />
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900 truncate">{editingAssignment.user_name}</p>
                    <p className="text-[11px] text-slate-500 font-mono truncate">{editingAssignment.user_email}</p>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 bg-white px-2 py-0.5 rounded-full border border-slate-200 shrink-0">
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
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964]"
                >
                  <option value="Initiator">Initiator</option>
                  <option value="Approver">Approver</option>
                  <option value="Finance_Audit">Finance & Audit</option>
                </select>
              </div>

              {/* SBU Selection */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Strategic Business Unit (SBU){" "}
                  {editRole === "Approver" ? (
                    <span className="text-rose-500">*</span>
                  ) : (
                    <span className="text-xs text-slate-400 font-normal">(Optional)</span>
                  )}
                </label>
                <select
                  value={editSbu}
                  onChange={(e) => {
                    setEditSbu(e.target.value);
                    if (editErrorMessage) setEditErrorMessage(null);
                  }}
                  className={`w-full px-3 py-2 bg-slate-50 border rounded-xl text-xs focus:bg-white focus:outline-none transition-colors font-medium cursor-pointer ${
                    hasAttemptedEditSubmit && editRole === "Approver" && (!editSbu || !editSbu.trim() || editSbu === "All" || editSbu === "ALL")
                      ? "border-rose-500 bg-rose-50/20 focus:border-rose-600 focus:ring-2 focus:ring-rose-200 text-slate-900"
                      : "border-slate-300 focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964]"
                  }`}
                >
                  <option value="">-- Select SBU --</option>
                  {ROLE_MATRIX_SBUS.map((sbu) => (
                    <option key={sbu} value={sbu}>{sbu}</option>
                  ))}
                </select>

                {/* Inline SBU validation error */}
                {hasAttemptedEditSubmit && editRole === "Approver" && (!editSbu || !editSbu.trim() || editSbu === "All" || editSbu === "ALL") && (
                  <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1 animate-fade-in">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-rose-500" />
                    <span>Select an SBU for this role.</span>
                  </p>
                )}
              </div>

              {/* Approval Level (If Approver) */}
              {editRole === "Approver" && (
                <div className="space-y-1.5">
                  <label className="block font-semibold text-slate-800 mb-1">
                    Approval Stage <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={editApprovalLevel}
                    onChange={(e) => setEditApprovalLevel(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964] font-medium"
                  >
                    <option value={1}>Stage L1 — Finance</option>
                    <option value={3}>Stage L3 — BU CFO</option>
                    <option value={4}>Stage L4 — BU Director</option>
                    <option value={5}>Stage L5 — VOGL CFO</option>
                    <option value={6}>Stage L6 — VOGL CEO</option>
                  </select>
                  <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-200">
                    ℹ️ Stage L2 (Project Owner) is derived dynamically from each proposal.
                  </p>
                </div>
              )}

              </div>

              {/* Buttons */}
              <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingAssignment(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex items-center gap-1.5 px-4 py-2 bg-[#012964] hover:bg-[#001f4d] text-white text-xs font-semibold rounded-xl shadow-subtle transition-all disabled:opacity-50 cursor-pointer"
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
        </div>,
        document.body
      )}

      {/* Modal: Confirmation for Revoking Role */}
      {revokingAssignment && createPortal(
        <div className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
          <div className="max-w-md w-full bg-white rounded-2xl shadow-elevated border border-slate-200 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Revoke Role?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Revoke <strong>{revokingAssignment.role}</strong> role from <strong>{revokingAssignment.user_name}</strong>?
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
                {isSubmitting ? "Revoking..." : "Revoke Role"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
