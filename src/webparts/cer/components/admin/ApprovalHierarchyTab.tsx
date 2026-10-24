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
  Loader2,
  X,
  Clock,
  User,
} from "lucide-react";
import { IWorkflowLevel } from "../../models/WorkflowModel";
import { IAppUser } from "../../models/UserModel";
import { ICERDataService } from "../../services/ICERDataService";
import { useDynamicPagination } from "../../hooks/useDynamicPagination";
import { DataTablePagination } from "../common/DataTablePagination";

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

  useEffect(() => {
    setLevels([...workflowLevels]);
  }, [workflowLevels]);

  // Fully Automatic Dynamic Pagination
  const pagination = useDynamicPagination({
    totalItems: levels.length,
    defaultRowHeight: 120,
    bufferBottom: 52,
  });

  const visibleLevels = pagination.paginateItems(levels);

  const handleAddLevel = () => {
    setErrorMessage(null);
    const nextId = levels.length > 0 ? Math.max(...levels.map((l) => l.level_id)) + 1 : 1;
    const now = new Date().toISOString();
    const creatorInfo = currentUser.email
      ? `${currentUser.name} (${currentUser.email})`
      : currentUser.name || "Administrator";

    const newLevel: IWorkflowLevel = {
      level_id: nextId,
      level_name: `Level ${nextId}`,
      role_title: "",
      sbu: "All",
      is_active: true,
      created_by: creatorInfo,
      created_date: now,
    };

    const nextLevels = [...levels, newLevel];
    setLevels(nextLevels);

    // Jump to the page of the newly added level
    const newTotalPages = Math.ceil(nextLevels.length / pagination.effectivePageSize);
    pagination.setCurrentPage(newTotalPages);
  };

  const handleDeleteLevel = (levelId: number) => {
    if (!confirm(`Are you sure you want to remove Approval Level ${levelId}?`)) {
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
    setErrorMessage(null);
    for (const l of levels) {
      if (!l.level_name.trim()) {
        setErrorMessage(`Approval Level ${l.level_id} must have a valid Level Name.`);
        return;
      }
      if (!l.role_title.trim()) {
        setErrorMessage(`Approval Level ${l.level_id} ('${l.level_name}') must have a valid Role Title.`);
        return;
      }
    }

    setIsSaving(true);
    try {
      // Ensure all levels have created_by and created_date stamped
      const now = new Date().toISOString();
      const creatorInfo = currentUser.email
        ? `${currentUser.name} (${currentUser.email})`
        : currentUser.name || "Administrator";

      const preparedLevels = levels.map((l) => ({
        ...l,
        created_by: l.created_by || creatorInfo,
        created_date: l.created_date || now,
        sbu: l.sbu || "All",
        is_active: l.is_active !== undefined ? l.is_active : true,
      }));

      await dataService.saveWorkflowLevels(preparedLevels);

      // Log administrative audit event if supported
      if (dataService.logAdminAudit) {
        await dataService.logAdminAudit({
          actor_name: currentUser.name,
          actor_email: currentUser.email,
          action: "WORKFLOW_UPDATED",
          target_type: "WORKFLOW",
          target_id: "CER_WorkflowLevels",
          details: `Updated sequential workflow hierarchy in SharePoint list (${preparedLevels.length} levels).`,
          after_value: JSON.stringify(preparedLevels),
          timestamp: now,
        });
      }

      setSuccessNotice(`Successfully saved ${preparedLevels.length} approval levels directly to SharePoint list CER_WorkflowLevels.`);
      await onRefreshLevels();
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (e: any) {
      setErrorMessage(e.message || "Failed to save workflow levels to SharePoint list.");
    } finally {
      setIsSaving(false);
    }
  };

  const formatTimestamp = (isoString?: string): string => {
    if (!isoString) return new Date().toLocaleString();
    try {
      const d = new Date(isoString);
      return isNaN(d.getTime()) ? isoString : d.toLocaleString();
    } catch {
      return isoString;
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
          <button onClick={() => setSuccessNotice(null)} className="text-emerald-700 hover:text-emerald-900 cursor-pointer">
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
          <button onClick={() => setErrorMessage(null)} className="text-rose-700 hover:text-rose-900 cursor-pointer">
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
            Dynamic approval stages saved directly in SharePoint list <strong>CER_WorkflowLevels</strong>. No hardcoded seed data.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={handleAddLevel}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold rounded-xl border border-blue-200 transition-colors cursor-pointer shadow-2xs"
          >
            <Plus className="w-4 h-4" />
            <span>Add Level</span>
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-subtle hover:shadow-hover transition-all cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Saving to SharePoint...</span>
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

      {/* Empty State */}
      {levels.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center flex flex-col items-center justify-center shadow-subtle">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">No Approval Levels Configured</h4>
          <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
            The SharePoint list <strong>CER_WorkflowLevels</strong> is currently empty. Click &quot;Add Level&quot; to configure your approval hierarchy.
          </p>
          <button
            type="button"
            onClick={handleAddLevel}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-subtle hover:shadow-hover transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Level</span>
          </button>
        </div>
      ) : (
        /* Ordered Level Cards */
        <div ref={pagination.tableContainerRef} className="space-y-3 flex flex-col">
          {visibleLevels.map((level, pageIndex) => {
            const actualIndex = pagination.startIndex + pageIndex;
            const isFirst = actualIndex === 0;
            const isLast = actualIndex === levels.length - 1;

            return (
              <div
                key={level.level_id}
                className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  level.is_active
                    ? "bg-white border-slate-200/90 shadow-subtle"
                    : "bg-slate-50/70 border-slate-200 text-slate-400 opacity-75"
                }`}
              >
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  {/* Reorder and Level ID Badge */}
                  <div className="flex items-center gap-3">
                    <div className="flex flex-col items-center shrink-0">
                      <button
                        onClick={() => handleMove(actualIndex, "up")}
                        disabled={isFirst}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                        title="Move level up"
                      >
                        <MoveUp className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs">
                        {level.level_id}
                      </span>
                      <button
                        onClick={() => handleMove(actualIndex, "down")}
                        disabled={isLast}
                        className="p-1 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer"
                        title="Move level down"
                      >
                        <MoveDown className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Level Name Input */}
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        Level Name <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={level.level_name}
                        onChange={(e) => handleUpdateField(actualIndex, "level_name", e.target.value)}
                        placeholder="e.g. L1 - Technical & SBU Operations Review"
                        className="w-72 sm:w-80 md:w-96 text-sm font-bold text-slate-900 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200/90 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 transition-all"
                      />
                    </div>
                  </div>

                  {/* Role Title Input */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Role Title <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={level.role_title}
                      onChange={(e) => handleUpdateField(actualIndex, "role_title", e.target.value)}
                      placeholder="e.g. SBU Operations Head"
                      className="w-64 sm:w-72 md:w-80 text-xs text-slate-700 bg-slate-50/70 hover:bg-white focus:bg-white border border-slate-200/90 focus:border-blue-600 focus:ring-1 focus:ring-blue-500 rounded-xl px-3 py-2 transition-all"
                    />
                  </div>

                  {/* Block / SBU Route Dropdown */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Block / SBU
                    </label>
                    <select
                      value={level.sbu || "All"}
                      onChange={(e) => handleUpdateField(actualIndex, "sbu", e.target.value)}
                      className="px-3 py-2 bg-slate-50 hover:bg-white border border-slate-200/90 rounded-xl text-xs text-slate-800 font-medium focus:border-blue-600 focus:ring-1 focus:ring-blue-500 transition-all"
                    >
                      <option value="All">All SBUs</option>
                      <option value="CBOS">CBOS</option>
                      <option value="RAVA">RAVA</option>
                      <option value="RJ North">RJ North</option>
                      <option value="RJ South">RJ South</option>
                    </select>
                  </div>

                  {/* Active Checkbox */}
                  <div className="space-y-1 flex flex-col justify-end">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                      Status
                    </label>
                    <label className="inline-flex items-center gap-2 px-3 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl border border-slate-200 cursor-pointer transition-colors">
                      <input
                        type="checkbox"
                        checked={level.is_active}
                        onChange={(e) => handleUpdateField(actualIndex, "is_active", e.target.checked)}
                        className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                      />
                      <span className={`text-xs font-bold ${level.is_active ? "text-emerald-700" : "text-slate-400"}`}>
                        {level.is_active ? "Active" : "Inactive"}
                      </span>
                    </label>
                  </div>

                  {/* Delete Level Action */}
                  <div className="flex items-center justify-end pt-5">
                    <button
                      type="button"
                      onClick={() => handleDeleteLevel(level.level_id)}
                      className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
                      title="Delete this level"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card Footer: Who Created & Timestamp */}
                <div className="mt-3 pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between text-[11px] text-slate-500 gap-2">
                  <div className="flex items-center gap-4 flex-wrap">
                    <span className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        <strong className="text-slate-600">Created By:</strong> {level.created_by || currentUser.name}
                      </span>
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      <span>
                        <strong className="text-slate-600">Timestamp:</strong> {formatTimestamp(level.created_date)}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            );
          })}

          {/* Dynamic Pagination Bar */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden mt-3">
            <DataTablePagination
              currentPage={pagination.currentPage}
              totalPages={pagination.totalPages}
              totalItems={levels.length}
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
              itemName="levels"
            />
          </div>
        </div>
      )}
    </div>
  );
};

