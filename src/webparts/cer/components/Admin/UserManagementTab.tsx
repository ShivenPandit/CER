import React, { useState, useEffect } from "react";
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

    if (query.length < 2) {
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
    const newApprover: IUserRoleAssignment = {
      id: `dir-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      user_name: dirUser.displayName,
      user_email: email,
      login_name: dirUser.userPrincipalName || email,
      role: "Approver",
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
          const userRows = roles.filter((r) => getUserKey(r) === currentItem.key);
          if (userRows.length > 1 && rem.id) {
            await dataService.revokeUserRole(rem.id, actor);
          } else {
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
        if (currentAssignment && currentAssignment.level === stagedItem.level) {
          continue;
        }

        const title = getApproverRoleTitle(stagedItem.level);
        const staged = stagedItem.approver;

        const existingRole = roles.find(
          (r) =>
            (staged.id && r.id === staged.id) ||
            getUserKey(r) === stagedItem.key ||
            (staged.user_id && r.user_id && Number(r.user_id) === Number(staged.user_id))
        );

        if (existingRole) {
          await dataService.updateUserRole(
            {
              ...existingRole,
              role: "Approver",
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
      setSuccessMessage(`Approval role matrix successfully updated for ${block}.`);
      handleCloseUpdateModal();
    } catch (err: any) {
      console.error("[UserManagementTab] Failed to save approval assignments:", err);
      setUpdateModalError(err?.message || "Failed to save approval assignments to SharePoint list.");
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
      {/* Exactly 8 Columns and 4 Data Rows for RJ North, RJ South, CBOS, RAVA    */}
      {/* ======================================================================= */}
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
                      {/* 1. First Column: Block/SBU/Field * */}
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

      {/* ======================================================================= */}
      {/* MODAL: UPDATE APPROVAL ASSIGNMENT (Matrix Row Update Modal)             */}
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

            {/* Modal Content */}
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

                const stagedKeys = new Set(
                  stagedForLevel.map((a) => (a.user_email || a.login_name || a.user_name).trim().toLowerCase())
                );

                // Candidates from registered user pool
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

                // Candidates from live directory search
                const dirCandidates = (directoryResultsByLevel[lvl] || []).filter((d) => {
                  const dEmail = (d.mail || d.userPrincipalName || "").toLowerCase().trim();
                  const dName = (d.displayName || "").toLowerCase().trim();
                  if (stagedKeys.has(dEmail) || stagedKeys.has(dName)) return false;
                  // Don't duplicate if already in selectableCandidates
                  return !selectableCandidates.some(
                    (c) => (c.user_email && c.user_email.toLowerCase() === dEmail) || c.user_name.toLowerCase() === dName
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

                    {/* Search & Add Dropdown */}
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
                          {isSearchingDirectory ? (
                            <Loader2 className="w-3.5 h-3.5 text-[#012964] animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                          ) : (
                            <button
                              type="button"
                              onClick={() => setOpenDropdownLevel(isDropdownOpenForThisLevel ? null : lvl)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                            >
                              <ChevronDown className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Dropdown Options List */}
                      {isDropdownOpenForThisLevel && (
                        <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-elevated max-h-52 overflow-y-auto z-50 divide-y divide-slate-100">
                          {selectableCandidates.length === 0 && dirCandidates.length === 0 ? (
                            <div className="p-3 text-center text-slate-400 text-xs">
                              {searchQuery.trim()
                                ? `No users match "${searchQuery.trim()}"`
                                : "All registered users are already selected."}
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
                                        size="sm"
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
