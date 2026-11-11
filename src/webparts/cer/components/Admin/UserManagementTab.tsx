import React, { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  Shield,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  UserPlus,
  Edit,
  Lock,
  ArrowLeft,
  Users,
  ShieldCheck,
  ChevronDown,
  Info,
} from "lucide-react";
import {
  IAppUser,
  IUserRoleAssignment,
  UserRole,
  IDirectoryUser,
} from "../../models/UserModel";
import { IWorkflowLevel } from "../../models/WorkflowModel";
import { ICERDataService } from "../../services/ICERDataService";
import { useDynamicPagination } from "../../hooks/useDynamicPagination";
import { useModalScrollLock } from "../../hooks/useModalScrollLock";
import { DataTablePagination } from "../Shared/DataTablePagination";
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

// Fixed 4 SBU blocks in the exact required matrix order
const MATRIX_BLOCKS = ["RJ North", "RJ South", "CBOS", "RAVA"] as const;

// 6 Approval workflow stages config
interface IMatrixLevelConfig {
  level: number;
  label: string;
  roleTitle: string;
  isDynamic?: boolean;
}

const MATRIX_LEVELS: readonly IMatrixLevelConfig[] = [
  { level: 1, label: "L1 - Finance", roleTitle: "Finance" },
  { level: 2, label: "L2 - Project Owner", roleTitle: "Project Owner", isDynamic: true },
  { level: 3, label: "L3 - BU CFO", roleTitle: "BU CFO" },
  { level: 4, label: "L4 - BU Director", roleTitle: "BU Director" },
  { level: 5, label: "L5 - VOGL CFO", roleTitle: "VOGL CFO" },
  { level: 6, label: "L6 - VOGL CEO", roleTitle: "VOGL CEO" },
] as const;

export const UserManagementTab: React.FC<IUserManagementTabProps> = ({
  dataService,
  currentUser,
  roles,
  workflowLevels,
  isLoading = false,
  onRefreshRoles,
  onCancel,
}) => {
  // Main Segmented Navigation: "directory" vs "matrix"
  const [activeTab, setActiveTab] = useState<"directory" | "matrix">("directory");

  const [levels, setLevels] = useState<IWorkflowLevel[]>(workflowLevels || []);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (workflowLevels && workflowLevels.length > 0) {
      setLevels(workflowLevels);
    } else if (workflowLevels === undefined && dataService && dataService.getWorkflowLevels) {
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

  // ---------------------------------------------------------------------------
  // Update Approval Assignment Modal (Matrix Row Update)
  // ---------------------------------------------------------------------------
  const [updateModalBlock, setUpdateModalBlock] = useState<string | null>(null);
  // Staged approver user assignments keyed by approval level (1, 3, 4, 5, 6)
  const [stagedApproversByLevel, setStagedApproversByLevel] = useState<Record<number, IUserRoleAssignment[]>>({});
  const [openDropdownLevel, setOpenDropdownLevel] = useState<number | null>(null);
  const [approverSearchQueries, setApproverSearchQueries] = useState<Record<number, string>>({});
  const [updateModalError, setUpdateModalError] = useState<string | null>(null);

  // ---------------------------------------------------------------------------
  // Assign / Add User Modal (Onboard new employee into directory)
  // ---------------------------------------------------------------------------
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);
  const [directorySearchQuery, setDirectorySearchQuery] = useState("");
  const [directoryResults, setDirectoryResults] = useState<IDirectoryUser[]>([]);
  const [selectedDirectoryUser, setSelectedDirectoryUser] = useState<IDirectoryUser | null>(null);
  const [isSearchingDirectory, setIsSearchingDirectory] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownContainerRef = useRef<HTMLDivElement>(null);

  const [selectedRole, setSelectedRole] = useState<UserRole>("Initiator");
  const [selectedSbu, setSelectedSbu] = useState<string>("");
  const [approvalLevel, setApprovalLevel] = useState<number>(1);

  // Check if selected directory user already exists in CERRoleMatrix
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

  // ---------------------------------------------------------------------------
  // Edit & Revoke Modals (Employee Directory)
  // ---------------------------------------------------------------------------
  const [editingAssignment, setEditingAssignment] = useState<IUserRoleAssignment | null>(null);
  const [editRole, setEditRole] = useState<UserRole>("Initiator");
  const [editSbu, setEditSbu] = useState<string>("");
  const [editApprovalLevel, setEditApprovalLevel] = useState<number>(1);
  const [editErrorMessage, setEditErrorMessage] = useState<string | null>(null);
  const [hasAttemptedEditSubmit, setHasAttemptedEditSubmit] = useState(false);

  const [revokingAssignment, setRevokingAssignment] = useState<IUserRoleAssignment | null>(null);

  // Modal Scroll Lock
  useModalScrollLock(Boolean(isAssignModalOpen || editingAssignment || revokingAssignment || updateModalBlock));

  // Dynamic Table Pagination for Employee Directory
  const pagination = useDynamicPagination({
    totalItems: roles.length,
    defaultRowHeight: 58,
    bufferBottom: 84,
  });

  const visibleDirectoryUsers = pagination.paginateItems(roles);

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
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  // Directory Search Debounce for Add User
  useEffect(() => {
    if (!isAssignModalOpen) return;
    const trimmed = directorySearchQuery.trim();

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

  // ---------------------------------------------------------------------------
  // Helper Queries & Lookups
  // ---------------------------------------------------------------------------

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
      case 2:
        return "Project Owner";
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

  // Retrieve assigned approvers for a given block and approval level
  const getApproversForBlockAndLevel = (block: string, level: number): IUserRoleAssignment[] => {
    const targetBlock = block.trim().toLowerCase();
    const matching = roles.filter(
      (r) =>
        r.is_active !== false &&
        r.role === "Approver" &&
        Number(r.approval_level) === level &&
        (Boolean(r.sbu && r.sbu.toLowerCase() === targetBlock) ||
         Boolean(r.sbu && r.sbu.toLowerCase() === "all"))
    );

    // Deduplicate by normalized user email / login
    const seen = new Set<string>();
    const deduped: IUserRoleAssignment[] = [];
    for (const item of matching) {
      const key = (item.user_email || item.login_name || item.user_name).trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        deduped.push(item);
      }
    }
    return deduped;
  };

  // Distinct pool of registered Approvers available for selection in the modal
  const eligibleApproverPool = React.useMemo(() => {
    const approverRoles = roles.filter((r) => r.is_active !== false && r.role === "Approver");
    const seen = new Set<string>();
    const pool: IUserRoleAssignment[] = [];
    for (const r of approverRoles) {
      const key = (r.user_email || r.login_name || r.user_name).trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        pool.push(r);
      }
    }
    return pool;
  }, [roles]);

  // ---------------------------------------------------------------------------
  // Handlers: Update Approval Assignment Modal
  // ---------------------------------------------------------------------------

  const handleOpenUpdateModal = (block: string) => {
    setUpdateModalBlock(block);
    setUpdateModalError(null);
    setOpenDropdownLevel(null);
    setApproverSearchQueries({});

    // Pre-populate staged approvers for levels 1, 3, 4, 5, 6
    const initialStaged: Record<number, IUserRoleAssignment[]> = {};
    for (const lvl of [1, 3, 4, 5, 6]) {
      initialStaged[lvl] = getApproversForBlockAndLevel(block, lvl);
    }
    setStagedApproversByLevel(initialStaged);
  };

  const handleCloseUpdateModal = () => {
    setUpdateModalBlock(null);
    setStagedApproversByLevel({});
    setOpenDropdownLevel(null);
    setApproverSearchQueries({});
    setUpdateModalError(null);
  };

  const handleRemoveApproverFromLevel = (level: number, approverToRemove: IUserRoleAssignment) => {
    setStagedApproversByLevel((prev) => {
      const current = prev[level] || [];
      const removeKey = (approverToRemove.user_email || approverToRemove.login_name || approverToRemove.user_name).trim().toLowerCase();
      return {
        ...prev,
        [level]: current.filter((a) => {
          const k = (a.user_email || a.login_name || a.user_name).trim().toLowerCase();
          return k !== removeKey;
        }),
      };
    });
  };

  const handleAddApproverToLevel = (level: number, approverToAdd: IUserRoleAssignment) => {
    const addKey = (approverToAdd.user_email || approverToAdd.login_name || approverToAdd.user_name).trim().toLowerCase();
    setStagedApproversByLevel((prev) => {
      const updated: Record<number, IUserRoleAssignment[]> = {};
      const keys = Object.keys(prev);
      for (let i = 0; i < keys.length; i++) {
        const lvl = Number(keys[i]);
        const list = prev[lvl] || [];
        // Remove from any other level so an approver cannot be assigned to two levels simultaneously
        updated[lvl] = list.filter(
          (a: IUserRoleAssignment) => (a.user_email || a.login_name || a.user_name).trim().toLowerCase() !== addKey
        );
      }
      const current = updated[level] || [];
      updated[level] = [...current, approverToAdd];
      return updated;
    });
    setOpenDropdownLevel(null);
    setApproverSearchQueries((prev) => ({ ...prev, [level]: "" }));
  };

  const handleSaveApprovalAssignments = async () => {
    if (!updateModalBlock) return;
    setIsSubmitting(true);
    setUpdateModalError(null);

    const block = updateModalBlock;
    const actor = { name: currentUser.name, email: currentUser.email };

    try {
      const levelsToProcess = [1, 3, 4, 5, 6];

      // Helper to compute a normalized user identity key
      const getUserKey = (u: { user_email?: string; login_name?: string; user_name?: string }) =>
        (u.user_email || u.login_name || u.user_name || "").trim().toLowerCase();

      interface IAssignedRecord {
        key: string;
        approver: IUserRoleAssignment;
        level: number;
      }

      // 1. Gather all currently assigned approvers in this block across levels 1, 3, 4, 5, 6
      const currentInBlockList: IAssignedRecord[] = [];
      const currentInBlockKeys = new Set<string>();
      for (let i = 0; i < levelsToProcess.length; i++) {
        const lvl = levelsToProcess[i];
        const assigned = getApproversForBlockAndLevel(block, lvl);
        for (let j = 0; j < assigned.length; j++) {
          const a = assigned[j];
          const k = getUserKey(a);
          if (k && !currentInBlockKeys.has(k)) {
            currentInBlockKeys.add(k);
            currentInBlockList.push({ key: k, approver: a, level: lvl });
          }
        }
      }

      // 2. Gather all staged approvers in this block across levels 1, 3, 4, 5, 6
      const stagedInBlockList: IAssignedRecord[] = [];
      const stagedInBlockKeys = new Set<string>();
      for (let i = 0; i < levelsToProcess.length; i++) {
        const lvl = levelsToProcess[i];
        const staged = stagedApproversByLevel[lvl] || [];
        for (let j = 0; j < staged.length; j++) {
          const a = staged[j];
          const k = getUserKey(a);
          if (k && !stagedInBlockKeys.has(k)) {
            stagedInBlockKeys.add(k);
            stagedInBlockList.push({ key: k, approver: a, level: lvl });
          }
        }
      }

      // 3. Process Approvers Removed from this Block (were assigned in currentInBlockKeys, but not in stagedInBlockKeys)
      for (let i = 0; i < currentInBlockList.length; i++) {
        const currentItem = currentInBlockList[i];
        if (!stagedInBlockKeys.has(currentItem.key)) {
          // Approver unassigned from this SBU
          const rem = currentItem.approver;
          const userRows = roles.filter((r) => getUserKey(r) === currentItem.key);
          if (userRows.length > 1) {
            await dataService.revokeUserRole(rem.id, actor);
          } else {
            // Update row to clear SBU & approval level while preserving role = Approver
            await dataService.updateUserRole(
              {
                ...rem,
                sbu: "",
                approval_level: undefined,
                approver_role_title: undefined,
                is_active: true,
              },
              actor
            );
          }
        }
      }

      // 4. Process Staged Approvers (assigned, reassigned, or moved across levels)
      for (let i = 0; i < stagedInBlockList.length; i++) {
        const stagedItem = stagedInBlockList[i];
        const currentAssignment = currentInBlockList.find((c) => c.key === stagedItem.key);
        // If the approver was already assigned to this block at the exact same level, no change needed
        if (currentAssignment && currentAssignment.level === stagedItem.level) {
          continue;
        }

        const title = getApproverRoleTitle(stagedItem.level);
        const staged = stagedItem.approver;

        // Find this user's existing record in the role matrix
        const existingRole = roles.find(
          (r) =>
            (staged.id && r.id === staged.id) ||
            getUserKey(r) === stagedItem.key ||
            (staged.user_id && r.user_id && Number(r.user_id) === Number(staged.user_id))
        );

        if (existingRole) {
          // Update the existing record in CERRoleMatrix (respects SharePoint uniqueness on [User])
          await dataService.updateUserRole(
            {
              ...existingRole,
              sbu: block,
              approval_level: stagedItem.level,
              approver_role_title: title,
              is_active: true,
            },
            actor
          );
        } else {
          // Create a new assignment record in CERRoleMatrix only if user is brand new to the matrix
          await dataService.assignUserRole(
            {
              user_name: staged.user_name,
              user_email: staged.user_email,
              login_name: staged.login_name || staged.user_email,
              user_id: staged.user_id,
              role: "Approver",
              sbu: block,
              approval_level: stagedItem.level,
              approver_role_title: title,
              is_active: true,
              assigned_by: currentUser.name,
              assigned_date: new Date().toISOString(),
            },
            actor
          );
        }
      }

      await onRefreshRoles();
      setSuccessMessage(`Approval assignments for ${block} updated successfully.`);
      handleCloseUpdateModal();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error("[UserManagementTab] Failed to save approval assignments:", err);
      setUpdateModalError(err.message || "Failed to update approval assignments in SharePoint.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Add User & Role Assignment
  // ---------------------------------------------------------------------------

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

    if (!selectedDirectoryUser || existingAssignmentForSelected) {
      return;
    }

    const email = selectedDirectoryUser.mail || selectedDirectoryUser.userPrincipalName || "";
    if (!email || email.indexOf("@") === -1) {
      setErrorMessage("Selected directory user does not possess a valid corporate email address.");
      return;
    }

    if (selectedRole === "Admin") {
      setErrorMessage("System Admin accounts cannot be created via the web interface. Manage directly in SharePoint CERRoleMatrix list.");
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

      setSuccessMessage(`Role '${selectedRole}' successfully assigned to ${selectedDirectoryUser.displayName}.`);
      setIsAssignModalOpen(false);
      await onRefreshRoles();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to assign role.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Handlers: Edit Role
  // ---------------------------------------------------------------------------

  const handleOpenEditModal = (assignment: IUserRoleAssignment) => {
    if (assignment.role === "Admin") return;
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

  // ---------------------------------------------------------------------------
  // Handlers: Revoke Role
  // ---------------------------------------------------------------------------

  const handleConfirmRevoke = async () => {
    if (!revokingAssignment) return;
    if (revokingAssignment.role === "Admin") {
      alert("System Admin accounts cannot be deleted through the UI. Manage directly in SharePoint CERRoleMatrix list.");
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
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Top Bar: Back button, Page Title, and 2-Option Segmented Navigation */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3.5">
        {/* Left: Back button + Title */}
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

        {/* Right: Only Two Main Navigation Options: 1. Employee Directory, 2. Assign Role */}
        <div className="inline-flex p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 shrink-0">
          <button
            onClick={() => setActiveTab("directory")}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "directory"
                ? "bg-[#012964] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Employee Directory</span>
          </button>
          <button
            onClick={() => setActiveTab("matrix")}
            className={`flex items-center gap-2 px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg transition-all cursor-pointer ${
              activeTab === "matrix"
                ? "bg-[#012964] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Assign Role</span>
          </button>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* SECTION 1: EMPLOYEE DIRECTORY                                          */}
      {/* ======================================================================= */}
      {activeTab === "directory" && (
        <div className="space-y-4 animate-fade-in">
          {/* Subheader: Clear "List of Users" display button & "+ Add User" */}
          <div className="flex items-center justify-between gap-3 bg-white px-4 py-3 rounded-2xl border border-slate-200/80 shadow-subtle">
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#012964]/10 text-[#012964] text-xs sm:text-sm font-bold rounded-xl border border-[#012964]/20 cursor-default"
              >
                <Users className="w-4 h-4" />
                <span>List of Users ({roles.length})</span>
              </button>
            </div>

            <button
              onClick={handleOpenAssignModal}
              className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-[#012964] hover:bg-[#001f4d] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-subtle hover:shadow-hover transition-all cursor-pointer shrink-0"
            >
              <UserPlus className="w-4 h-4" />
              <span>Add User</span>
            </button>
          </div>

          {/* Directory Users Table */}
          <div
            ref={pagination.tableContainerRef}
            className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden flex flex-col"
          >
            <div className="overflow-x-auto flex-1">
              <table className="w-full text-left border-collapse text-xs 2xl:text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-200/80 text-slate-500 font-semibold uppercase tracking-wider text-[10px] 2xl:text-xs">
                    <th className="py-3 px-4 2xl:py-4 2xl:px-6">Employee Name</th>
                    <th className="py-3 px-4 2xl:py-4 2xl:px-6">Email Address</th>
                    <th className="py-3 px-4 2xl:py-4 2xl:px-6">Assigned Role</th>
                    <th className="py-3 px-4 2xl:py-4 2xl:px-6 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {isLoading ? (
                    Array.from({ length: 4 }).map((_, idx) => (
                      <tr key={`dir-skeleton-${idx}`} className="animate-pulse">
                        <td className="py-3.5 px-4 2xl:py-4 2xl:px-6">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-slate-200 shrink-0" />
                            <div className="h-3.5 w-36 bg-slate-200 rounded" />
                          </div>
                        </td>
                        <td className="py-3.5 px-4 2xl:py-4 2xl:px-6">
                          <div className="h-3.5 w-48 bg-slate-200 rounded" />
                        </td>
                        <td className="py-3.5 px-4 2xl:py-4 2xl:px-6">
                          <div className="h-5 w-20 bg-slate-200 rounded-full" />
                        </td>
                        <td className="py-3.5 px-4 2xl:py-4 2xl:px-6 text-right">
                          <div className="h-5 w-12 bg-slate-200 rounded ml-auto" />
                        </td>
                      </tr>
                    ))
                  ) : visibleDirectoryUsers.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400">
                        No users registered in the system.
                      </td>
                    </tr>
                  ) : (
                    visibleDirectoryUsers.map((user) => {
                      const isAdmin = user.role === "Admin";
                      return (
                        <tr
                          key={user.id}
                          className="hover:bg-slate-50/60 transition-colors"
                        >
                          {/* Employee Name */}
                          <td className="py-3 px-4 2xl:py-4 2xl:px-6">
                            <div className="flex items-center gap-2.5">
                              <UserAvatar
                                name={user.user_name}
                                email={user.user_email}
                                size="sm"
                              />
                              <span className="font-bold text-slate-900 2xl:text-sm truncate">
                                {user.user_name}
                              </span>
                            </div>
                          </td>

                          {/* Email Address */}
                          <td className="py-3 px-4 2xl:py-4 2xl:px-6">
                            <span className="font-mono text-xs text-slate-600 truncate block">
                              {user.user_email || "—"}
                            </span>
                          </td>

                          {/* Assigned Role */}
                          <td className="py-3 px-4 2xl:py-4 2xl:px-6">
                            <span
                              className={`inline-flex items-center gap-1 text-[10px] 2xl:text-xs font-semibold px-2.5 py-0.5 rounded-full border ${getRoleBadgeStyle(
                                user.role
                              )}`}
                            >
                              <Shield className="w-3 h-3" />
                              <span>{user.role.replace("_", " & ")}</span>
                            </span>
                          </td>

                          {/* Actions: Edit & Delete (Admin Protected) */}
                          <td className="py-3 px-4 2xl:py-4 2xl:px-6 text-right">
                            {isAdmin ? (
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
                                <button
                                  onClick={() => handleOpenEditModal(user)}
                                  className="p-1.5 2xl:p-2 rounded-lg text-[#012964] hover:bg-[#012964]/10 transition-colors cursor-pointer"
                                  title="Edit user"
                                  aria-label="Edit user"
                                >
                                  <Edit className="w-3.5 h-3.5 2xl:w-4 2xl:h-4" />
                                </button>
                                <button
                                  onClick={() => setRevokingAssignment(user)}
                                  className="p-1.5 2xl:p-2 rounded-lg text-rose-500 hover:bg-rose-50 transition-colors cursor-pointer"
                                  title="Delete user"
                                  aria-label="Delete user"
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

            {/* Pagination */}
            <DataTablePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={roles.length}
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
              itemName="users"
            />
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* SECTION 2: ASSIGN ROLE — APPROVAL LEVEL ASSIGNMENT MATRIX               */}
      {/* Exactly 8 Columns and 4 Data Rows for RJ North, RJ South, CBOS, RAVA    */}
      {/* ======================================================================= */}
      {activeTab === "matrix" && (
        <div className="space-y-3 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-3 px-4 w-[160px] min-w-[150px] bg-slate-100/80 border-r border-slate-200">
                      Block/SBU/Field *
                    </th>
                    <th className="py-3 px-3 min-w-[140px]">L1 - Finance</th>
                    <th className="py-3 px-3 min-w-[150px] bg-slate-50/50">L2 - Project Owner</th>
                    <th className="py-3 px-3 min-w-[140px]">L3 - BU CFO</th>
                    <th className="py-3 px-3 min-w-[140px]">L4 - BU Director</th>
                    <th className="py-3 px-3 min-w-[140px]">L5 - VOGL CFO</th>
                    <th className="py-3 px-3 min-w-[140px]">L6 - VOGL CEO</th>
                    <th className="py-3 px-4 w-[110px] min-w-[100px] text-right border-l border-slate-200">
                      Action
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {MATRIX_BLOCKS.map((block) => {
                    return (
                      <tr key={block} className="hover:bg-slate-50/50 transition-colors">
                        {/* 1. First Column: Block/SBU/Field * (Visually Distinct) */}
                        <td className="py-3 px-4 font-bold text-slate-900 bg-slate-50/80 border-r border-slate-200">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full bg-[#012964]" />
                            <span>{block}</span>
                          </div>
                        </td>

                        {/* 2. L1 - Finance */}
                        <td className="py-3 px-3">
                          {renderMatrixApproverCell(getApproversForBlockAndLevel(block, 1))}
                        </td>

                        {/* 3. L2 - Project Owner (Dynamic) */}
                        <td className="py-3 px-3 bg-slate-50/30">
                          <span
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200/80 cursor-help"
                            title="Stage L2 is dynamic: resolved per proposal from the designated CER Owner upon submission."
                          >
                            <Info className="w-3 h-3 text-amber-700" />
                            <span>Dynamic (Project Owner)</span>
                          </span>
                        </td>

                        {/* 4. L3 - BU CFO */}
                        <td className="py-3 px-3">
                          {renderMatrixApproverCell(getApproversForBlockAndLevel(block, 3))}
                        </td>

                        {/* 5. L4 - BU Director */}
                        <td className="py-3 px-3">
                          {renderMatrixApproverCell(getApproversForBlockAndLevel(block, 4))}
                        </td>

                        {/* 6. L5 - VOGL CFO */}
                        <td className="py-3 px-3">
                          {renderMatrixApproverCell(getApproversForBlockAndLevel(block, 5))}
                        </td>

                        {/* 7. L6 - VOGL CEO */}
                        <td className="py-3 px-3">
                          {renderMatrixApproverCell(getApproversForBlockAndLevel(block, 6))}
                        </td>

                        {/* 8. Action: Update */}
                        <td className="py-3 px-4 text-right border-l border-slate-200">
                          <button
                            onClick={() => handleOpenUpdateModal(block)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#012964] hover:bg-[#001f4d] text-white text-xs font-semibold rounded-xl shadow-subtle hover:shadow-hover transition-all cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Update</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================================= */}
      {/* SECTION 3: UPDATE POPUP — ASSIGN APPROVERS                             */}
      {/* Opened via Update button on any block row                               */}
      {/* ======================================================================= */}
      {updateModalBlock && createPortal(
        <div
          className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm overscroll-contain animate-fade-in overflow-y-auto"
          style={{ overscrollBehavior: "contain" }}
          onWheel={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
        >
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/70 shrink-0">
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  Update Approval Assignment
                </h3>
                <p className="text-xs text-slate-500 font-medium mt-0.5 flex items-center gap-1">
                  <span>Strategic Business Unit / Block:</span>
                  <span className="font-bold text-[#012964] bg-[#012964]/10 px-2 py-0.5 rounded border border-[#012964]/20">
                    {updateModalBlock}
                  </span>
                </p>
              </div>
              <button
                onClick={handleCloseUpdateModal}
                disabled={isSubmitting}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content: Exactly 6 Fields */}
            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1 min-h-0">
              {updateModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-relaxed font-medium">{updateModalError}</span>
                </div>
              )}

              {MATRIX_LEVELS.map((stage) => {
                const lvl = stage.level;

                // Field 2: L2 Project Owner (Dynamic Presentation)
                if (stage.isDynamic) {
                  return (
                    <div
                      key={stage.label}
                      className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <label className="font-bold text-slate-900">
                          {stage.label}
                        </label>
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          Dynamic Resolution
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 leading-relaxed">
                        Project Owner is resolved dynamically from each CER proposal upon submission based on the project initiator.
                      </p>
                    </div>
                  );
                }

                // Fields 1, 3, 4, 5, 6: Multi-Select Approver Dropdown with Chips
                const stagedForLevel = stagedApproversByLevel[lvl] || [];
                const searchQuery = approverSearchQueries[lvl] || "";
                const isDropdownOpenForThisLevel = openDropdownLevel === lvl;

                // Candidates: users with role = "Approver" who are NOT yet selected in this level
                const stagedKeys = new Set(
                  stagedForLevel.map((a) => (a.user_email || a.login_name || a.user_name).trim().toLowerCase())
                );
                const selectableCandidates = eligibleApproverPool.filter((u) => {
                  const key = (u.user_email || u.login_name || u.user_name).trim().toLowerCase();
                  if (stagedKeys.has(key)) return false;
                  if (!searchQuery.trim()) return true;
                  const q = searchQuery.trim().toLowerCase();
                  return (
                    u.user_name.toLowerCase().includes(q) ||
                    (u.user_email && u.user_email.toLowerCase().includes(q))
                  );
                });

                return (
                  <div key={stage.label} className="space-y-1.5">
                    <label className="block font-bold text-slate-900">
                      {stage.label} <span className="text-rose-500">*</span>
                    </label>

                    {/* Chips Display Area */}
                    <div className="min-h-[42px] p-2 bg-slate-50 border border-slate-300 rounded-xl flex flex-wrap items-center gap-1.5">
                      {stagedForLevel.length === 0 ? (
                        <span className="text-slate-400 text-xs italic px-1">
                          No approvers assigned to this level yet.
                        </span>
                      ) : (
                        stagedForLevel.map((approver) => {
                          const chipKey = (approver.user_email || approver.login_name || approver.user_name).trim().toLowerCase();
                          return (
                            <span
                              key={chipKey}
                              className="inline-flex items-center gap-1.5 bg-white text-[#012964] border border-[#012964]/20 px-2.5 py-1 rounded-lg text-xs font-semibold shadow-2xs"
                            >
                              <UserAvatar
                                name={approver.user_name}
                                email={approver.user_email}
                                size="sm"
                              />
                              <span className="truncate max-w-[160px]">
                                {approver.user_name}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleRemoveApproverFromLevel(lvl, approver)}
                                className="text-slate-400 hover:text-rose-600 transition-colors p-0.5 rounded cursor-pointer"
                                title={`Remove ${approver.user_name}`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </span>
                          );
                        })
                      )}
                    </div>

                    {/* Search & Add Dropdown for Approver Role Only */}
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <div className="relative flex-1">
                          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                          <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => {
                              const val = e.target.value;
                              setApproverSearchQueries((prev) => ({ ...prev, [lvl]: val }));
                              setOpenDropdownLevel(lvl);
                            }}
                            onFocus={() => setOpenDropdownLevel(lvl)}
                            placeholder={`Search and select approvers for ${stage.label}...`}
                            className="w-full pl-8 pr-8 py-1.5 bg-white border border-slate-300 rounded-lg text-xs focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964] focus:outline-none"
                          />
                          <button
                            type="button"
                            onClick={() => setOpenDropdownLevel(isDropdownOpenForThisLevel ? null : lvl)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                          >
                            <ChevronDown className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Dropdown Options List: Filtered strictly to role === "Approver" */}
                      {isDropdownOpenForThisLevel && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-elevated max-h-48 overflow-y-auto z-50 divide-y divide-slate-100">
                          {selectableCandidates.length === 0 ? (
                            <div className="p-3 text-center text-slate-400 text-xs">
                              {searchQuery.trim()
                                ? `No available Approvers match "${searchQuery.trim()}"`
                                : "All registered Approvers are already selected."}
                            </div>
                          ) : (
                            selectableCandidates.map((cand) => {
                              const candKey = (cand.user_email || cand.login_name || cand.user_name).trim().toLowerCase();
                              return (
                                <div
                                  key={candKey}
                                  onClick={() => handleAddApproverToLevel(lvl, cand)}
                                  className="p-2.5 hover:bg-[#012964]/5 cursor-pointer flex items-center justify-between transition-colors gap-2"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <UserAvatar
                                      name={cand.user_name}
                                      email={cand.user_email}
                                      size="sm"
                                    />
                                    <div className="min-w-0">
                                      <p className="font-semibold text-slate-900 truncate">
                                        {cand.user_name}
                                      </p>
                                      {cand.user_email && (
                                        <p className="text-[11px] text-slate-500 font-mono truncate">
                                          {cand.user_email}
                                        </p>
                                      )}
                                    </div>
                                  </div>
                                  <span className="text-[10px] font-semibold text-[#012964] bg-[#012964]/10 px-2 py-0.5 rounded border border-[#012964]/20 shrink-0">
                                    + Add
                                  </span>
                                </div>
                              );
                            })
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-100 bg-slate-50/70 shrink-0">
              <button
                type="button"
                onClick={handleCloseUpdateModal}
                disabled={isSubmitting}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveApprovalAssignments}
                disabled={isSubmitting}
                className="flex items-center gap-1.5 px-5 py-2 bg-[#012964] hover:bg-[#001f4d] text-white text-xs font-semibold rounded-xl shadow-subtle hover:shadow-hover transition-all disabled:opacity-50 cursor-pointer"
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
          </div>
        </div>,
        document.body
      )}

      {/* ======================================================================= */}
      {/* MODAL: ADD USER (Azure AD Directory Picker to CERRoleMatrix)            */}
      {/* ======================================================================= */}
      {isAssignModalOpen && createPortal(
        <div
          className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm overscroll-contain animate-fade-in overflow-y-auto"
          style={{ overscrollBehavior: "contain" }}
          onWheel={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
        >
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] my-auto">
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-[#012964]" />
                <h3 className="text-sm font-bold text-slate-900">
                  Add User
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
                {errorMessage && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                    <span className="leading-relaxed font-medium">{errorMessage}</span>
                  </div>
                )}

                {/* Directory Search */}
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
                        if (directorySearchQuery.trim().length >= 1) setIsDropdownOpen(true);
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
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    ) : null}
                  </div>

                  {hasAttemptedSubmit && !selectedDirectoryUser && (
                    <p className="mt-1 text-xs text-rose-600 font-medium flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                      <span>Select an employee from the directory.</span>
                    </p>
                  )}

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
                        {existingAssignmentForSelected ? `Already Assigned (${existingAssignmentForSelected.role})` : "Selected"}
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
                    onChange={(e) => setSelectedSbu(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964] font-medium cursor-pointer"
                  >
                    <option value="">-- Select SBU --</option>
                    {ROLE_MATRIX_SBUS.map((sbu) => (
                      <option key={sbu} value={sbu}>{sbu}</option>
                    ))}
                  </select>
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
                  </div>
                )}
              </div>

              {/* Modal Buttons */}
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

      {/* ======================================================================= */}
      {/* MODAL: EDIT ROLE ASSIGNMENT                                            */}
      {/* ======================================================================= */}
      {editingAssignment && createPortal(
        <div
          className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm overscroll-contain animate-fade-in overflow-y-auto"
          style={{ overscrollBehavior: "contain" }}
          onWheel={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
        >
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

                {/* Readonly details */}
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
                </div>

                {/* Role */}
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

                {/* SBU */}
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
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964] font-medium cursor-pointer"
                  >
                    <option value="">-- Select SBU --</option>
                    {ROLE_MATRIX_SBUS.map((sbu) => (
                      <option key={sbu} value={sbu}>{sbu}</option>
                    ))}
                  </select>
                </div>

                {/* Level */}
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
                  </div>
                )}
              </div>

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

      {/* ======================================================================= */}
      {/* MODAL: REVOKE CONFIRMATION                                             */}
      {/* ======================================================================= */}
      {revokingAssignment && createPortal(
        <div
          className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm overscroll-contain animate-fade-in"
          style={{ overscrollBehavior: "contain" }}
          onWheel={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
        >
          <div className="max-w-md w-full bg-white rounded-2xl shadow-elevated border border-slate-200 p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-700 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-slate-900">
              Delete User Assignment?
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Remove role <strong>{revokingAssignment.role}</strong> from <strong>{revokingAssignment.user_name}</strong>?
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setRevokingAssignment(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRevoke}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-subtle cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? "Deleting..." : "Delete User"}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// -----------------------------------------------------------------------------
// Matrix Approver Cell Renderer (Compact names + +N badge on overflow)
// -----------------------------------------------------------------------------
function renderMatrixApproverCell(approvers: IUserRoleAssignment[]): React.ReactNode {
  if (!approvers || approvers.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50/70 border border-amber-200/60 px-2 py-0.5 rounded-md">
        ⚠️ Unassigned
      </span>
    );
  }

  const MAX_DISPLAY = 2;
  const visible = approvers.slice(0, MAX_DISPLAY);
  const overflow = approvers.length - MAX_DISPLAY;
  const allNames = approvers.map((a) => a.user_name).join(", ");

  return (
    <div className="flex flex-wrap items-center gap-1" title={allNames}>
      {visible.map((a) => (
        <span
          key={a.id || a.user_email}
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#012964] bg-[#012964]/10 border border-[#012964]/20 px-2 py-0.5 rounded-md truncate max-w-[130px]"
        >
          {a.user_name}
        </span>
      ))}
      {overflow > 0 && (
        <span
          className="inline-flex items-center text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-300 px-1.5 py-0.5 rounded-md cursor-help"
          title={`+${overflow} more: ${approvers.slice(MAX_DISPLAY).map((a) => a.user_name).join(", ")}`}
        >
          +{overflow}
        </span>
      )}
    </div>
  );
}
