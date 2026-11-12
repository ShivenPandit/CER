import React, { useState, useEffect, useMemo } from "react";
import { createPortal } from "react-dom";
import {
  Search,
  AlertTriangle,
  CheckCircle2,
  X,
  Loader2,
  Edit,
  ArrowLeft,
  ShieldCheck,
  ChevronDown,
  Info,
  Sparkles,
  Lock,
} from "lucide-react";
import {
  IAppUser,
  IUserRoleAssignment,
  IDirectoryUser,
} from "../../models/UserModel";
import { IWorkflowLevel } from "../../models/WorkflowModel";
import { ICERDataService } from "../../services/ICERDataService";
import { useModalScrollLock } from "../../hooks/useModalScrollLock";
import { UserAvatar } from "../Common/UserAvatar";

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

  // Live Directory search candidates when typing in the modal
  const [directoryResultsByLevel, setDirectoryResultsByLevel] = useState<Record<number, IDirectoryUser[]>>({});
  const [isSearchingDirectory, setIsSearchingDirectory] = useState(false);

  // Modal Scroll Lock
  useModalScrollLock(Boolean(updateModalBlock));

  // Hovered tooltip for +N more assignees
  const [hoveredTooltipCell, setHoveredTooltipCell] = useState<{ block: string; level: number } | null>(null);

  // ---------------------------------------------------------------------------
  // Helper Queries & Lookups
  // ---------------------------------------------------------------------------

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

  // Count how many assignable levels (1, 3, 4, 5, 6) have at least 1 approver assigned for a given block
  const getAssignedCountForBlock = (block: string): number => {
    let count = 0;
    for (const lvl of [1, 3, 4, 5, 6]) {
      if (getApproversForBlockAndLevel(block, lvl).length > 0) {
        count++;
      }
    }
    return count;
  };

  const modalAssignedCount = useMemo(() => {
    let count = 0;
    for (const lvl of [1, 3, 4, 5, 6]) {
      if ((stagedApproversByLevel[lvl] || []).length > 0) {
        count++;
      }
    }
    return count;
  }, [stagedApproversByLevel]);

  const handleClearAllApproversForLevel = (level: number) => {
    setStagedApproversByLevel((prev) => ({
      ...prev,
      [level]: [],
    }));
  };

  // Distinct pool of active users available for immediate selection
  const eligibleApproverPool = React.useMemo(() => {
    const activeRoles = roles.filter((r) => r.is_active !== false);
    const seen = new Set<string>();
    const pool: IUserRoleAssignment[] = [];
    for (const r of activeRoles) {
      const key = (r.user_email || r.login_name || r.user_name).trim().toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        pool.push(r);
      }
    }
    return pool;
  }, [roles]);

  // Live directory search debounce within update modal
  useEffect(() => {
    if (openDropdownLevel === null || !updateModalBlock) return;
    const query = (approverSearchQueries[openDropdownLevel] || "").trim();

    if (query.length < 1) {
      setDirectoryResultsByLevel((prev) => ({ ...prev, [openDropdownLevel]: [] }));
      setIsSearchingDirectory(false);
      return;
    }

    setIsSearchingDirectory(true);
    const timer = setTimeout(() => {
      dataService
        .searchDirectoryUsers(query)
        .then((res) => {
          setDirectoryResultsByLevel((prev) => ({ ...prev, [openDropdownLevel]: res || [] }));
          setIsSearchingDirectory(false);
        })
        .catch((err) => {
          console.warn("[UserManagementTab] Modal directory search failed:", err);
          setDirectoryResultsByLevel((prev) => ({ ...prev, [openDropdownLevel]: [] }));
          setIsSearchingDirectory(false);
        });
    }, 200);

    return () => clearTimeout(timer);
  }, [openDropdownLevel, approverSearchQueries, updateModalBlock, dataService]);

  // ---------------------------------------------------------------------------
  // Handlers: Update Approval Assignment Modal
  // ---------------------------------------------------------------------------

  const handleOpenUpdateModal = (block: string) => {
    setUpdateModalBlock(block);
    setUpdateModalError(null);
    setOpenDropdownLevel(null);
    setApproverSearchQueries({});
    setDirectoryResultsByLevel({});

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
    setDirectoryResultsByLevel({});
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

  const handleAddDirectoryUserToLevel = (level: number, dirUser: IDirectoryUser) => {
    const email = dirUser.mail || dirUser.userPrincipalName || "";
    const cleanDirName = (dirUser.displayName || "")
      .replace(/\s*\([^)]*\)/g, "")
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .toLowerCase();

    // Find any existing entry for this directory user in CERRoleMatrix
    const existingUser = roles.find((r) => {
      const rEmail = (r.user_email || "").trim().toLowerCase();
      const rLogin = (r.login_name || "").trim().toLowerCase();
      const rCleanName = (r.user_name || "")
        .replace(/\s*\([^)]*\)/g, "")
        .replace(/[^a-zA-Z0-9\s]/g, "")
        .replace(/\s+/g, " ")
        .trim()
        .toLowerCase();
      const targetEmail = email.trim().toLowerCase();
      const targetLogin = (dirUser.userPrincipalName || "").trim().toLowerCase();
      return (
        (targetEmail && (rEmail === targetEmail || rLogin === targetEmail)) ||
        (targetLogin && (rLogin === targetLogin || rEmail === targetLogin)) ||
        (cleanDirName && rCleanName && cleanDirName === rCleanName)
      );
    });

    const isExistingAdmin = existingUser && String(existingUser.role || "").trim().toLowerCase() === "admin";

    const newApprover: IUserRoleAssignment = {
      id: existingUser ? existingUser.id : `dir-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_name: dirUser.displayName,
      user_email: email || existingUser?.user_email || "",
      login_name: dirUser.userPrincipalName || email || existingUser?.login_name || "",
      user_id: existingUser?.user_id,
      role: isExistingAdmin ? "Admin" : ((existingUser?.role || "") as any),
      sbu: updateModalBlock || "",
      approval_level: level,
      approver_role_title: getApproverRoleTitle(level),
      is_active: true,
      assigned_by: currentUser.name,
      assigned_date: new Date().toISOString(),
    };
    handleAddApproverToLevel(level, newApprover);
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

      // 3. Process Approvers Removed from this Block
      for (let i = 0; i < currentInBlockList.length; i++) {
        const currentItem = currentInBlockList[i];
        if (!stagedInBlockKeys.has(currentItem.key)) {
          const rem = currentItem.approver;
          const isAdmin = String(rem.role || "").trim().toLowerCase() === "admin";
          await dataService.updateUserRole(
            {
              ...rem,
              role: isAdmin ? "Admin" : ("" as any),
              sbu: "",
              approval_level: undefined,
              approver_role_title: undefined,
              is_active: true,
            },
            actor
          );
        }
      }

      // 4. Process Staged Approvers (assigned, reassigned, or moved across levels)
      for (let i = 0; i < stagedInBlockList.length; i++) {
        const stagedItem = stagedInBlockList[i];
        const currentAssignment = currentInBlockList.find((c) => c.key === stagedItem.key);
        if (currentAssignment && currentAssignment.level === stagedItem.level) {
          continue;
        }

        const title = getApproverRoleTitle(stagedItem.level);
        const staged = stagedItem.approver;

        const stagedCleanName = (staged.user_name || "")
          .replace(/\s*\([^)]*\)/g, "")
          .replace(/[^a-zA-Z0-9\s]/g, "")
          .replace(/\s+/g, " ")
          .trim()
          .toLowerCase();

        const existingRole = roles.find((r) => {
          const rCleanName = (r.user_name || "")
            .replace(/\s*\([^)]*\)/g, "")
            .replace(/[^a-zA-Z0-9\s]/g, "")
            .replace(/\s+/g, " ")
            .trim()
            .toLowerCase();
          return (
            (staged.id && r.id === staged.id) ||
            getUserKey(r) === stagedItem.key ||
            (staged.user_id && r.user_id && Number(r.user_id) === Number(staged.user_id)) ||
            (stagedCleanName && rCleanName && stagedCleanName === rCleanName)
          );
        });

        const isAdmin =
          (existingRole && String(existingRole.role || "").trim().toLowerCase() === "admin") ||
          (staged && String(staged.role || "").trim().toLowerCase() === "admin");
        const roleToSave = isAdmin ? "Admin" : (existingRole?.role || staged?.role || ("" as any));

        if (existingRole) {
          await dataService.updateUserRole(
            {
              ...existingRole,
              role: roleToSave,
              sbu: block,
              approval_level: stagedItem.level,
              approver_role_title: title,
              is_active: true,
            },
            actor
          );
        } else {
          await dataService.assignUserRole(
            {
              user_name: staged.user_name,
              user_email: staged.user_email,
              login_name: staged.login_name || staged.user_email,
              user_id: staged.user_id,
              role: roleToSave,
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
      setSuccessMessage(`Approval role matrix successfully updated for ${block}.`);
      handleCloseUpdateModal();
    } catch (err: any) {
      console.error("[UserManagementTab] Failed to save approval assignments:", err);
      setUpdateModalError(err?.message || "Failed to save approval assignments to SharePoint list.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // -----------------------------------------------------------------------------
  // Matrix Approver Cell Renderer (Pills + +N more badge with Hover Popover)
  // -----------------------------------------------------------------------------
  const renderMatrixApproverCell = (
    approvers: IUserRoleAssignment[],
    block: string,
    level: number
  ): React.ReactNode => {
    if (!approvers || approvers.length === 0) {
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50/60 text-amber-800 border border-dashed border-amber-300">
          <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
          <span>Unassigned</span>
        </span>
      );
    }

    const isHovered =
      hoveredTooltipCell?.block === block && hoveredTooltipCell?.level === level;

    if (approvers.length <= 2) {
      return (
        <div className="flex flex-col gap-1.5">
          {approvers.map((a) => (
            <div
              key={a.id || a.user_email || a.user_name}
              className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200 px-2 py-1 rounded-lg text-xs font-semibold shadow-2xs hover:bg-slate-200/70 transition"
              title={`${a.user_name} (${a.user_email || ""})`}
            >
              <UserAvatar name={a.user_name} email={a.user_email} size="xs" />
              <span className="truncate max-w-[145px]">{a.user_name}</span>
            </div>
          ))}
        </div>
      );
    }

    // 3+ assignees: Show first user pill + "+N more" badge with sleek popover
    const firstUser = approvers[0];
    const moreCount = approvers.length - 1;

    return (
      <div
        className="relative inline-flex items-center gap-1.5"
        onMouseEnter={() => setHoveredTooltipCell({ block, level })}
        onMouseLeave={() => setHoveredTooltipCell(null)}
      >
        <div
          className="inline-flex items-center gap-1.5 bg-slate-100 text-slate-800 border border-slate-200 px-2 py-1 rounded-lg text-xs font-semibold shadow-2xs"
          title={`${firstUser.user_name} (${firstUser.user_email || ""})`}
        >
          <UserAvatar name={firstUser.user_name} email={firstUser.user_email} size="xs" />
          <span className="truncate max-w-[110px]">{firstUser.user_name}</span>
        </div>
        <span className="inline-flex items-center px-2 py-1 rounded-lg text-[11px] font-bold bg-[#012964]/10 text-[#012964] border border-[#012964]/20 cursor-pointer hover:bg-[#012964]/20 transition shadow-2xs">
          +{moreCount} more
        </span>

        {/* Hover Popover Tooltip */}
        {isHovered && (
          <div className="absolute left-0 top-full mt-1.5 w-64 bg-slate-900 text-white rounded-xl shadow-2xl p-3 z-50 animate-in fade-in zoom-in-95 duration-150 border border-slate-700/80">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 pb-1.5 border-b border-slate-800 mb-2 flex items-center justify-between">
              <span>All Approvers ({approvers.length})</span>
              <span className="text-emerald-400 font-medium">Any 1 approves</span>
            </div>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {approvers.map((a) => (
                <div key={a.id || a.user_email || a.user_name} className="flex items-center gap-2">
                  <UserAvatar name={a.user_name} email={a.user_email} size="xs" />
                  <div className="min-w-0">
                    <p className="text-xs font-semibold text-white truncate">{a.user_name}</p>
                    {a.user_email && (
                      <p className="text-[10px] text-slate-400 truncate">{a.user_email}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4 animate-fade-in">
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

      {/* Error Notification Banner */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Main Top Bar: Back button, Page Title */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-3.5">
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
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight leading-tight">
                Approval Role Matrix
              </h2>
              <p className="text-xs text-slate-500">
                Single source of truth for sequential approval authority across SBUs
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================================= */}
      {/* APPROVAL LEVEL ASSIGNMENT MATRIX TABLE                                 */}
      {/* Sticky First & Last Columns with Responsive Horizontal Scrolling       */}
      {/* ======================================================================= */}
      <div className="space-y-3 animate-fade-in">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden">
          <div className="overflow-x-auto relative">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 font-bold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 min-w-[170px] sticky left-0 bg-slate-100 z-30 border-r border-slate-200 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)]">
                    Block/SBU/Field *
                  </th>
                  <th className="py-3.5 px-3 min-w-[160px]">L1 - Finance</th>
                  <th className="py-3.5 px-3 min-w-[170px] bg-slate-50/50">L2 - Project Owner</th>
                  <th className="py-3.5 px-3 min-w-[160px]">L3 - BU CFO</th>
                  <th className="py-3.5 px-3 min-w-[160px]">L4 - BU Director</th>
                  <th className="py-3.5 px-3 min-w-[160px]">L5 - VOGL CFO</th>
                  <th className="py-3.5 px-3 min-w-[160px]">L6 - VOGL CEO</th>
                  <th className="py-3.5 px-4 min-w-[110px] text-right sticky right-0 bg-slate-100 z-30 border-l border-slate-200 shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.05)]">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {MATRIX_BLOCKS.map((block) => {
                  const assignedCount = getAssignedCountForBlock(block);
                  return (
                      <tr key={block} className="hover:bg-slate-50/80 transition-colors group">
                        {/* 1. SBU Column (Sticky Left) */}
                        <td className="py-4 px-4 font-bold text-slate-900 sticky left-0 bg-white group-hover:bg-slate-50/90 z-20 border-r border-slate-200 shadow-[4px_0_10px_-2px_rgba(0,0,0,0.05)]">
                          <div className="space-y-1.5">
                            <div className="flex items-center gap-2">
                              <span
                                className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                                  assignedCount === 5 ? "bg-emerald-500 shadow-xs" : "bg-[#012964]"
                                }`}
                              />
                              <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                {block}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden border border-slate-200/60">
                                <div
                                  className={`h-full transition-all duration-300 ${
                                    assignedCount === 5 ? "bg-emerald-500" : "bg-[#012964]"
                                  }`}
                                  style={{ width: `${(assignedCount / 5) * 100}%` }}
                                />
                              </div>
                              <span className="text-[10px] font-semibold text-slate-500">
                                {assignedCount}/5 levels
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 2. L1 - Finance */}
                        <td className="py-4 px-3">
                          {renderMatrixApproverCell(getApproversForBlockAndLevel(block, 1), block, 1)}
                        </td>

                        {/* 3. L2 - Project Owner (Dynamic) */}
                        <td className="py-4 px-3 bg-slate-50/30">
                          <span
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50/80 text-amber-800 border border-amber-200 cursor-help"
                            title="Stage L2 is dynamic: resolved per proposal from the designated CER Owner upon submission."
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                            <span>Dynamic (Project Owner)</span>
                          </span>
                        </td>

                        {/* 4. L3 - BU CFO */}
                        <td className="py-4 px-3">
                          {renderMatrixApproverCell(getApproversForBlockAndLevel(block, 3), block, 3)}
                        </td>

                        {/* 5. L4 - BU Director */}
                        <td className="py-4 px-3">
                          {renderMatrixApproverCell(getApproversForBlockAndLevel(block, 4), block, 4)}
                        </td>

                        {/* 6. L5 - VOGL CFO */}
                        <td className="py-4 px-3">
                          {renderMatrixApproverCell(getApproversForBlockAndLevel(block, 5), block, 5)}
                        </td>

                        {/* 7. L6 - VOGL CEO */}
                        <td className="py-4 px-3">
                          {renderMatrixApproverCell(getApproversForBlockAndLevel(block, 6), block, 6)}
                        </td>

                        {/* 8. Action (Sticky Right) */}
                        <td className="py-4 px-4 text-right sticky right-0 bg-white group-hover:bg-slate-50/90 z-20 border-l border-slate-200 shadow-[-4px_0_10px_-2px_rgba(0,0,0,0.05)]">
                          <button
                            onClick={() => handleOpenUpdateModal(block)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#012964] hover:bg-[#001f4d] text-white text-xs font-semibold rounded-xl shadow-subtle hover:shadow-hover transition-all cursor-pointer"
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

      {/* ======================================================================= */}
      {/* MODAL: UPDATE APPROVAL ASSIGNMENT (Enterprise Stepper Modal)            */}
      {/* ======================================================================= */}
      {updateModalBlock && createPortal(
        <div
          className="fixed inset-0 !m-0 !top-0 !left-0 !right-0 !bottom-0 z-[9999] flex items-center justify-center p-3 sm:p-4 bg-slate-900/50 backdrop-blur-xs overscroll-contain animate-fade-in overflow-y-auto"
          style={{ overscrollBehavior: "contain" }}
          onWheel={(e) => {
            if (e.target === e.currentTarget) e.preventDefault();
          }}
        >
          <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] my-auto">
            {/* Sticky Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/90 shrink-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#012964]" />
                  <h3 className="text-base font-bold text-slate-900">
                    Update Approval Assignment
                  </h3>
                </div>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <span className="text-xs text-slate-500 font-medium">
                    Strategic Business Unit / Block:
                  </span>
                  <span className="font-bold text-xs text-[#012964] bg-[#012964]/10 px-2.5 py-0.5 rounded-lg border border-[#012964]/20">
                    {updateModalBlock}
                  </span>
                  <span
                    className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                      modalAssignedCount === 5
                        ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                        : "bg-blue-50 text-blue-800 border-blue-200"
                    }`}
                  >
                    {modalAssignedCount} of 5 Assignable Levels Configured
                  </span>
                </div>
              </div>
              <button
                onClick={handleCloseUpdateModal}
                disabled={isSubmitting}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 transition cursor-pointer disabled:opacity-50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body: Sequential Stepper Timeline */}
            <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1 min-h-0 bg-slate-50/40">
              {updateModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-start gap-2 mb-3">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
                  <span className="leading-relaxed font-medium">{updateModalError}</span>
                </div>
              )}

              {/* Sequential Stepper Container */}
              <div className="relative pl-8 sm:pl-9 space-y-4">
                {/* Visual vertical connector line */}
                <div className="absolute left-3 sm:left-3.5 top-5 bottom-6 w-0.5 bg-slate-200" />

                {MATRIX_LEVELS.map((stage) => {
                  const lvl = stage.level;
                  const stagedForLevel = stagedApproversByLevel[lvl] || [];
                  const isAssigned = stage.isDynamic || stagedForLevel.length > 0;

                  return (
                    <div key={stage.label} className="relative">
                      {/* Step Circle Indicator */}
                      <div
                        className={`absolute -left-8 sm:-left-9 top-3.5 w-6 h-6 rounded-full flex items-center justify-center text-[11px] font-bold border-2 transition-all shadow-2xs z-10 ${
                          stage.isDynamic
                            ? "bg-amber-100 text-amber-800 border-amber-300"
                            : isAssigned
                            ? "bg-[#012964] text-white border-white ring-2 ring-[#012964]/20"
                            : "bg-white text-slate-400 border-slate-300"
                        }`}
                      >
                        {stage.isDynamic ? (
                          <Sparkles className="w-3 h-3 text-amber-700" />
                        ) : (
                          stage.level
                        )}
                      </div>

                      {/* Level Card */}
                      <div
                        className={`rounded-xl border transition-all ${
                          stage.isDynamic
                            ? "bg-amber-50/40 border-amber-200/80 p-4"
                            : "bg-white border-slate-200/90 hover:border-slate-300 p-4 shadow-2xs"
                        }`}
                      >
                        {/* Dynamic L2 (Project Owner) */}
                        {stage.isDynamic ? (
                          <div className="space-y-1.5">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Lock className="w-4 h-4 text-amber-700" />
                                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                                  {stage.label}
                                </h4>
                              </div>
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100/80 border border-amber-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                <Sparkles className="w-3 h-3 text-amber-700" />
                                <span>Dynamic Resolution</span>
                              </span>
                            </div>
                            <p className="text-xs text-slate-600 leading-relaxed">
                              Project Owner is resolved dynamically from each CER proposal upon submission based on the project initiator.
                            </p>
                          </div>
                        ) : (
                          /* Assignable Levels L1, L3, L4, L5, L6 */
                          <div>
                            {/* Card Header: Title & Counter / Routing Logic */}
                            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-100">
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                                  {stage.label}
                                </h4>
                                <span className="text-rose-500 font-bold">*</span>
                              </div>

                              <div className="flex items-center gap-2">
                                {stagedForLevel.length === 0 ? (
                                  <span className="text-[10px] font-bold text-rose-700 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded-full">
                                    Required
                                  </span>
                                ) : stagedForLevel.length === 1 ? (
                                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                                    1 Approver Assigned
                                  </span>
                                ) : (
                                  <>
                                    <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                                      <span>{stagedForLevel.length} Approvers Assigned</span>
                                      <span className="text-slate-300">•</span>
                                      <span className="text-indigo-600 font-medium">Any 1 can approve</span>
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleClearAllApproversForLevel(lvl)}
                                      className="text-[10px] font-semibold text-slate-400 hover:text-rose-600 cursor-pointer transition ml-1"
                                    >
                                      Clear all
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Chips Display Area (Removable User Chips) */}
                            <div className="min-h-[42px] p-2 bg-slate-50/70 border border-slate-200 rounded-xl flex flex-wrap items-center gap-1.5 mb-2.5">
                              {stagedForLevel.length === 0 ? (
                                <span className="text-slate-400 text-xs italic px-1">
                                  No approvers assigned to this level yet. Search below to add approvers.
                                </span>
                              ) : (
                                stagedForLevel.map((approver) => {
                                  const chipKey = (approver.user_email || approver.login_name || approver.user_name).trim().toLowerCase();
                                  return (
                                    <span
                                      key={chipKey}
                                      className="inline-flex items-center gap-1.5 bg-white text-[#012964] border border-[#012964]/20 pl-1.5 pr-2 py-1 rounded-lg text-xs font-semibold shadow-2xs hover:border-[#012964]/40 transition"
                                    >
                                      <UserAvatar
                                        name={approver.user_name}
                                        email={approver.user_email}
                                        size="xs"
                                      />
                                      <span className="truncate max-w-[170px]">
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

                            {/* Search & Add Input */}
                            <div className="relative">
                              <div className="relative">
                                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                <input
                                  type="text"
                                  value={approverSearchQueries[lvl] || ""}
                                  onChange={(e) => {
                                    const val = e.target.value;
                                    setApproverSearchQueries((prev) => ({ ...prev, [lvl]: val }));
                                    if (val.trim().length >= 1) {
                                      setOpenDropdownLevel(lvl);
                                    } else {
                                      setOpenDropdownLevel(null);
                                    }
                                  }}
                                  onFocus={() => {
                                    if ((approverSearchQueries[lvl] || "").trim().length >= 1) {
                                      setOpenDropdownLevel(lvl);
                                    }
                                  }}
                                  placeholder={`+ Search and add multiple approvers for ${stage.label}...`}
                                  className="w-full pl-8 pr-8 py-2 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964] focus:outline-none transition"
                                />
                                {isSearchingDirectory ? (
                                  <Loader2 className="w-3.5 h-3.5 text-[#012964] animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                                ) : (approverSearchQueries[lvl] || "").trim().length >= 1 ? (
                                  <button
                                    type="button"
                                    onClick={() => setOpenDropdownLevel(openDropdownLevel === lvl ? null : lvl)}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                                  >
                                    <ChevronDown className="w-4 h-4" />
                                  </button>
                                ) : null}
                              </div>

                              {/* Dropdown Options List */}
                              {openDropdownLevel === lvl && (approverSearchQueries[lvl] || "").trim().length >= 1 && (() => {
                                const q = (approverSearchQueries[lvl] || "").trim().toLowerCase();
                                const stagedKeys = new Set(
                                  stagedForLevel.map((a) => (a.user_email || a.login_name || a.user_name).trim().toLowerCase())
                                );

                                const selectableCandidates = eligibleApproverPool.filter((u) => {
                                  const key = (u.user_email || u.login_name || u.user_name).trim().toLowerCase();
                                  if (stagedKeys.has(key)) return false;
                                  return (
                                    u.user_name.toLowerCase().includes(q) ||
                                    (u.user_email && u.user_email.toLowerCase().includes(q))
                                  );
                                });

                                if (selectableCandidates.length > 0) {
                                  const computeScore = (name: string, email?: string) => {
                                    const n = (name || "").toLowerCase().trim();
                                    const em = (email || "").toLowerCase().trim();
                                    const clean = n.replace(/\(.*?\)/g, "").replace(/\[.*?\]/g, "").trim();
                                    let s = 0;
                                    if (clean === q || n === q) s += 2000;
                                    else if (clean.startsWith(q)) s += 1000;
                                    else if (clean.split(/\s+/).some((w) => w.startsWith(q))) s += 600;
                                    else if (clean.includes(q)) s += 300;
                                    if (em.startsWith(q)) s += 800;
                                    else if (em.includes(q)) s += 200;
                                    return s;
                                  };
                                  selectableCandidates.sort((a, b) => {
                                    const diff = computeScore(b.user_name, b.user_email) - computeScore(a.user_name, a.user_email);
                                    if (diff !== 0) return diff;
                                    return a.user_name.localeCompare(b.user_name);
                                  });
                                }

                                const dirCandidates = (directoryResultsByLevel[lvl] || []).filter((d) => {
                                  const dEmail = (d.mail || d.userPrincipalName || "").toLowerCase().trim();
                                  const dName = (d.displayName || "").toLowerCase().trim();
                                  if (stagedKeys.has(dEmail) || stagedKeys.has(dName)) return false;
                                  return !selectableCandidates.some(
                                    (c) => (c.user_email && c.user_email.toLowerCase() === dEmail) || c.user_name.toLowerCase() === dName
                                  );
                                });

                                return (
                                  <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-elevated max-h-52 overflow-y-auto z-50 divide-y divide-slate-100">
                                    {isSearchingDirectory && selectableCandidates.length === 0 && dirCandidates.length === 0 ? (
                                      <div className="p-3 text-center text-slate-400 text-xs flex items-center justify-center gap-1.5">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-[#012964]" />
                                        <span>Searching organization directory...</span>
                                      </div>
                                    ) : selectableCandidates.length === 0 && dirCandidates.length === 0 ? (
                                      <div className="p-3 text-center text-slate-400 text-xs">
                                        {`No users match "${q}"`}
                                      </div>
                                    ) : (
                                      <>
                                        {selectableCandidates.map((cand) => {
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
                                                  size="xs"
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
                                        })}

                                        {dirCandidates.map((dirUser) => {
                                          const email = dirUser.mail || dirUser.userPrincipalName || "";
                                          return (
                                            <div
                                              key={dirUser.id || email}
                                              onClick={() => handleAddDirectoryUserToLevel(lvl, dirUser)}
                                              className="p-2.5 hover:bg-emerald-50/50 cursor-pointer flex items-center justify-between transition-colors gap-2"
                                            >
                                              <div className="flex items-center gap-2 min-w-0">
                                                <UserAvatar
                                                  name={dirUser.displayName}
                                                  email={email}
                                                  size="xs"
                                                />
                                                <div className="min-w-0">
                                                  <p className="font-semibold text-slate-900 truncate">
                                                    {dirUser.displayName}
                                                  </p>
                                                  <p className="text-[11px] text-emerald-700 font-mono truncate">
                                                    {email} (Directory)
                                                  </p>
                                                </div>
                                              </div>
                                              <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded shrink-0">
                                                + Add from Directory
                                              </span>
                                            </div>
                                          );
                                        })}
                                      </>
                                    )}
                                  </div>
                                );
                              })()}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Sticky Modal Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 bg-slate-50/90 shrink-0">
              <span className="text-[11px] text-slate-500 font-medium">
                * Indicates mandatory sequential approval tier
              </span>
              <div className="flex items-center gap-2.5">
                <button
                  type="button"
                  onClick={handleCloseUpdateModal}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-200/60 rounded-xl border border-slate-200 hover:border-slate-300 transition-colors cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveApprovalAssignments}
                  disabled={isSubmitting}
                  className="flex items-center gap-2 px-5 py-2 bg-[#012964] hover:bg-[#001f4d] text-white text-xs font-semibold rounded-xl shadow-subtle hover:shadow-hover transition-all disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
