import React, { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Search,
  User,
  DollarSign,
  Loader2,
  X,
  Power,
} from "lucide-react";
import { IWorkflowLevel } from "../../models/WorkflowModel";
import { IAppUser, IDirectoryUser } from "../../models/UserModel";
import { ICERDataService } from "../../services/ICERDataService";

interface IApprovalHierarchyTabProps {
  dataService: ICERDataService;
  currentUser: IAppUser;
  workflowLevels: IWorkflowLevel[];
  onRefreshLevels: () => Promise<void>;
}

export const ApprovalHierarchyTab: React.FC<IApprovalHierarchyTabProps> = ({
  dataService,
  currentUser,
  workflowLevels,
  onRefreshLevels,
}) => {
  const [levels, setLevels] = useState<IWorkflowLevel[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Directory search picker for editing approver
  const [activePickerLevelIndex, setActivePickerLevelIndex] = useState<number | null>(null);
  const [directoryQuery, setDirectoryQuery] = useState("");
  const [directoryResults, setDirectoryResults] = useState<IDirectoryUser[]>([]);
  const [isSearchingDirectory, setIsSearchingDirectory] = useState(false);

  useEffect(() => {
    setLevels([...workflowLevels]);
  }, [workflowLevels]);

  // Debounced search
  useEffect(() => {
    if (activePickerLevelIndex === null) return;
    const timer = setTimeout(() => {
      if (directoryQuery.trim().length >= 2) {
        setIsSearchingDirectory(true);
        dataService
          .searchDirectoryUsers(directoryQuery.trim())
          .then((res) => {
            setDirectoryResults(res);
            setIsSearchingDirectory(false);
          })
          .catch((e) => {
            console.warn(e);
            setIsSearchingDirectory(false);
          });
      } else {
        setDirectoryResults([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [directoryQuery, activePickerLevelIndex]);

  const handleAddLevel = () => {
    const nextId = levels.length > 0 ? Math.max(...levels.map((l) => l.level_id)) + 1 : 1;
    const newLevel: IWorkflowLevel = {
      level_id: nextId,
      level_name: `L${nextId} - Operational Review`,
      role_title: "Designated Reviewer",
      approver_name: "Select from Directory",
      approver_email: "approver@vedanta.co.in",
      is_active: true,
    };
    setLevels([...levels, newLevel]);
  };

  const handleDeleteLevel = (levelId: number) => {
    if (levels.length <= 1) {
      alert("At least one sequential approval level is required in the system.");
      return;
    }
    if (!confirm(`Are you sure you want to remove Approval Level ${levelId}? Proposals pending at this level must be re-routed.`)) {
      return;
    }
    const updated = levels
      .filter((l) => l.level_id !== levelId)
      .map((l, idx) => ({ ...l, level_id: idx + 1 }));
    setLevels(updated);
  };

  const handleUpdateField = (index: number, field: keyof IWorkflowLevel, value: any) => {
    const updated = [...levels];
    updated[index] = { ...updated[index], [field]: value };
    setLevels(updated);
  };

  const handleSelectApproverFromDirectory = (index: number, user: IDirectoryUser) => {
    const email = user.mail || user.userPrincipalName || "";
    const updated = [...levels];
    updated[index] = {
      ...updated[index],
      approver_name: user.displayName,
      approver_email: email,
    };
    setLevels(updated);
    setActivePickerLevelIndex(null);
    setDirectoryQuery("");
    setDirectoryResults([]);
  };

  const handleMove = (index: number, direction: "up" | "down") => {
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= levels.length) return;

    const copy = [...levels];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    // Re-index sequential level_id
    const reindexed = copy.map((l, idx) => ({ ...l, level_id: idx + 1 }));
    setLevels(reindexed);
  };

  const handleSave = async () => {
    // Validation: Check that every level has a valid name and email
    setErrorMessage(null);
    for (const l of levels) {
      if (!l.level_name.trim() || !l.role_title.trim() || !l.approver_name.trim()) {
        setErrorMessage("All approval levels must have a valid Stage Name, Role Title, and Approver Name.");
        return;
      }
      if (!l.approver_email || l.approver_email.indexOf("@") === -1) {
        setErrorMessage(`Level '${l.level_name}' has an invalid approver email address.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      await dataService.saveWorkflowLevels(levels);

      // Log administrative audit event
      await dataService.logAdminAudit({
        actor_name: currentUser.name,
        actor_email: currentUser.email,
        action: "WORKFLOW_UPDATED",
        target_type: "WORKFLOW",
        target_id: "CER_WorkflowLevels",
        details: `Updated sequential workflow hierarchy (${levels.length} configured levels).`,
        after_value: JSON.stringify(levels),
        timestamp: new Date().toISOString(),
      });

      setSuccessNotice("Workflow approval hierarchy successfully saved and synchronized.");
      await onRefreshLevels();
      setTimeout(() => setSuccessNotice(null), 4000);
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to save workflow levels.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-5 animate-fade-in">
      {/* Success & Error Banners */}
      {successNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successNotice}</span>
          </div>
          <button onClick={() => setSuccessNotice(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            <span className="font-medium">{errorMessage}</span>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-rose-700 hover:text-rose-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            Sequential Approval Levels Hierarchy
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure multi-stage review order, designated approvers, threshold limits, and active status.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleAddLevel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Level</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-subtle hover:shadow-hover transition-all cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving Hierarchy...</span>
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                <span>Save All Changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Ordered Level Cards */}
      <div className="space-y-3">
        {levels.map((level, index) => {
          const isFirst = index === 0;
          const isLast = index === levels.length - 1;

          return (
            <div
              key={level.level_id}
              className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                level.is_active
                  ? "bg-white border-slate-200/90 shadow-subtle"
                  : "bg-slate-50/70 border-slate-200 text-slate-400 opacity-75"
              }`}
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Stage Badge & Title */}
                <div className="flex items-center gap-3">
                  <div className="flex flex-col items-center">
                    <button
                      onClick={() => handleMove(index, "up")}
                      disabled={isFirst}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                      title="Move level up"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <span className="w-7 h-7 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                      {level.level_id}
                    </span>
                    <button
                      onClick={() => handleMove(index, "down")}
                      disabled={isLast}
                      className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                      title="Move level down"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1">
                    <input
                      type="text"
                      value={level.level_name}
                      onChange={(e) => handleUpdateField(index, "level_name", e.target.value)}
                      placeholder="Stage Name (e.g. L1 - Technical Review)"
                      className="text-sm font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none px-1"
                    />
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={level.role_title}
                        onChange={(e) => handleUpdateField(index, "role_title", e.target.value)}
                        placeholder="Role Title (e.g. SBU Operations Head)"
                        className="text-xs text-slate-500 bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-600 focus:outline-none px-1"
                      />
                    </div>
                  </div>
                </div>

                {/* Approver Identity & Directory Picker */}
                <div className="flex-1 max-w-md relative">
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate">
                        {level.approver_name}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate font-mono">
                        {level.approver_email}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setActivePickerLevelIndex(activePickerLevelIndex === index ? null : index);
                        setDirectoryQuery("");
                        setDirectoryResults([]);
                      }}
                      className="px-2.5 py-1 text-[11px] font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg border border-blue-200 transition-colors shrink-0 cursor-pointer"
                    >
                      Change Approver
                    </button>
                  </div>

                  {/* Directory Picker Popover */}
                  {activePickerLevelIndex === index && (
                    <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-elevated p-2 z-50 animate-fade-in">
                      <div className="relative mb-2">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          value={directoryQuery}
                          onChange={(e) => setDirectoryQuery(e.target.value)}
                          placeholder="Type name or email to search directory..."
                          className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
                        />
                        {isSearchingDirectory && (
                          <Loader2 className="w-3.5 h-3.5 text-blue-600 animate-spin absolute right-2.5 top-1/2 -translate-y-1/2" />
                        )}
                      </div>

                      <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 text-xs">
                        {directoryResults.map((u) => (
                          <div
                            key={u.id}
                            onClick={() => handleSelectApproverFromDirectory(index, u)}
                            className="p-2 hover:bg-blue-50/70 rounded-lg cursor-pointer flex items-center justify-between"
                          >
                            <div className="truncate">
                              <p className="font-bold text-slate-900">{u.displayName}</p>
                              <p className="text-[10px] text-slate-500 font-mono truncate">
                                {u.mail || u.userPrincipalName}
                              </p>
                            </div>
                            <span className="text-[10px] text-blue-600 font-medium">Select</span>
                          </div>
                        ))}
                        {directoryQuery.length >= 2 && directoryResults.length === 0 && !isSearchingDirectory && (
                          <p className="p-3 text-center text-slate-400 text-xs">No matching users found.</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Amount Thresholds */}
                <div className="flex items-center gap-2 text-xs">
                  <div>
                    <label className="text-[10px] text-slate-400 block font-semibold">Min $</label>
                    <input
                      type="number"
                      value={level.min_amount || ""}
                      onChange={(e) =>
                        handleUpdateField(
                          index,
                          "min_amount",
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                      placeholder="0"
                      className="w-20 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-400 block font-semibold">Max $</label>
                    <input
                      type="number"
                      value={level.max_amount || ""}
                      onChange={(e) =>
                        handleUpdateField(
                          index,
                          "max_amount",
                          e.target.value ? Number(e.target.value) : undefined
                        )
                      }
                      placeholder="No limit"
                      className="w-24 px-2 py-1 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                    />
                  </div>
                </div>

                {/* Active Toggle & Delete */}
                <div className="flex items-center gap-2 justify-end">
                  <button
                    type="button"
                    onClick={() => handleUpdateField(index, "is_active", !level.is_active)}
                    className={`p-2 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
                      level.is_active
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                    title={level.is_active ? "Deactivate level" : "Activate level"}
                  >
                    <Power className="w-3.5 h-3.5" />
                    <span>{level.is_active ? "Active" : "Inactive"}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDeleteLevel(level.level_id)}
                    className="p-2 text-rose-500 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                    title="Delete stage level"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
