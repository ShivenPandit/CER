import React, { useState, useEffect } from "react";
import {
  Layers,
  Plus,
  Trash2,
  Edit,
  Save,
  CheckCircle2,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Loader2,
  X,
  Clock,
  User,
  UserCheck,
  Check,
  Filter,
  Sparkles,
  Eye,
} from "lucide-react";
import { IWorkflowLevel, isProjectOwnerStage, ApproverAssignmentType } from "../../models/WorkflowModel";
import { IAppUser, IUserRoleAssignment } from "../../models/UserModel";
import { ICERDataService } from "../../services/ICERDataService";
import { useDynamicPagination } from "../../hooks/useDynamicPagination";
import { DataTablePagination } from '../Shared/DataTablePagination';

export interface IApprovalHierarchyTabProps {
  dataService: ICERDataService;
  currentUser: IAppUser;
  workflowLevels: IWorkflowLevel[];
  isLoading?: boolean;
  onRefreshLevels: () => Promise<void>;
}

export const ApprovalHierarchyTab: React.FC<IApprovalHierarchyTabProps> = ({
  dataService,
  currentUser,
  workflowLevels,
  isLoading = false,
  onRefreshLevels,
}) => {
  const [levels, setLevels] = useState<IWorkflowLevel[]>([]);
  const [selectedSbuFilter, setSelectedSbuFilter] = useState<string>("ALL");
  const [isSaving, setIsSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Add Level Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newLevelName, setNewLevelName] = useState("");
  const [newRoleTitle, setNewRoleTitle] = useState("");
  const [newSbu, setNewSbu] = useState("");
  const [newSequence, setNewSequence] = useState<number>(1);
  const [newAssignmentType, setNewAssignmentType] = useState<ApproverAssignmentType>("SpecificUser");
  const [addModalError, setAddModalError] = useState<string | null>(null);
  const [isSubmittingAdd, setIsSubmittingAdd] = useState(false);

  // Edit Level Modal State
  const [editingLevel, setEditingLevel] = useState<IWorkflowLevel | null>(null);
  const [editSequence, setEditSequence] = useState<number>(1);
  const [editAssignmentType, setEditAssignmentType] = useState<ApproverAssignmentType>("SpecificUser");
  const [editModalError, setEditModalError] = useState<string | null>(null);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // User Roles for specific user mapping preview
  const [userRoles, setUserRoles] = useState<IUserRoleAssignment[]>([]);

  useEffect(() => {
    let isMounted = true;
    if (dataService && dataService.getUserRoles) {
      dataService.getUserRoles().then((roles) => {
        if (isMounted && roles) {
          setUserRoles(roles);
        }
      }).catch((err) => {
        console.warn("[ApprovalHierarchyTab] Could not load user roles:", err);
      });
    }
    return () => {
      isMounted = false;
    };
  }, [dataService]);

  // Delete Level Modal State
  const [deletingLevel, setDeletingLevel] = useState<IWorkflowLevel | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  useEffect(() => {
    setLevels([...workflowLevels]);
  }, [workflowLevels]);

  // SBU Filtered & Sorted Levels
  const filteredLevels = levels
    .filter((lvl) => {
      if (selectedSbuFilter === "ALL") return true;
      return (lvl.sbu || "").toLowerCase() === selectedSbuFilter.toLowerCase();
    })
    .sort((a, b) => {
      if (a.sbu !== b.sbu) return (a.sbu || "").localeCompare(b.sbu || "");
      return a.level_id - b.level_id;
    });

  // Automatic Dynamic Pagination - tuned for compact 66px card items
  const pagination = useDynamicPagination({
    totalItems: filteredLevels.length,
    defaultRowHeight: 68,
    bufferBottom: 56,
    minPageSize: 1,
  });

  const visibleLevels = pagination.paginateItems(filteredLevels);

  useEffect(() => {
    pagination.setCurrentPage(1);
  }, [selectedSbuFilter]);

  const formatTimestamp = (isoString?: string): string => {
    if (!isoString) return new Date().toLocaleString();
    try {
      const d = new Date(isoString);
      return isNaN(d.getTime()) ? isoString : d.toLocaleString();
    } catch {
      return isoString;
    }
  };

  // Helper: get levels belonging to an SBU sorted by level_id
  const getSbuLevels = (sbuName: string) => {
    return levels
      .filter((l) => (l.sbu || "").toLowerCase() === sbuName.toLowerCase())
      .sort((a, b) => a.level_id - b.level_id);
  };

  // --- ADD LEVEL MODAL HANDLERS ---
  const handleOpenAddModal = () => {
    const defaultSbu = selectedSbuFilter !== "ALL" ? selectedSbuFilter : "RJ North";
    const sbuLevels = getSbuLevels(defaultSbu);
    const nextSeq = sbuLevels.length + 1;
    setNewSbu(defaultSbu);
    setNewSequence(nextSeq);
    setNewLevelName(`L${nextSeq} - `);
    setNewRoleTitle("");
    setNewAssignmentType("SpecificUser");
    setAddModalError(null);
    setIsAddModalOpen(true);
  };

  const handleNewRoleTitleChange = (val: string) => {
    setNewRoleTitle(val);
    if (isProjectOwnerStage({ role_title: val })) {
      setNewAssignmentType("ProjectOwnerAuto");
    } else if (newAssignmentType === "ProjectOwnerAuto" && !isProjectOwnerStage({ role_title: val, level_name: newLevelName })) {
      setNewAssignmentType("SpecificUser");
    }
  };

  const handleAddSbuChange = (sbu: string) => {
    setNewSbu(sbu);
    const sbuLevels = getSbuLevels(sbu);
    const nextSeq = sbuLevels.length + 1;
    setNewSequence(nextSeq);
    setNewLevelName(`L${nextSeq} - `);
  };

  const handleAddLevelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAddModalError(null);

    const trimmedName = newLevelName.trim();
    const trimmedRole = newRoleTitle.trim();
    const trimmedSbu = newSbu.trim();

    if (!trimmedName) {
      setAddModalError("Please enter a valid Level Name.");
      return;
    }
    if (!trimmedRole) {
      setAddModalError("Please enter a valid Role Title.");
      return;
    }
    if (!trimmedSbu || trimmedSbu === "All") {
      setAddModalError("Please select a Block / SBU Route (RJ North, RJ South, CBOS, or RAVA).");
      return;
    }

    setIsSubmittingAdd(true);
    try {
      const now = new Date().toISOString();
      const sbuLevels = getSbuLevels(trimmedSbu);
      const maxSeq = sbuLevels.length + 1;
      const targetSeq = Math.max(1, Math.min(newSequence || maxSeq, maxSeq));

      const isPO = newAssignmentType === "ProjectOwnerAuto" || isProjectOwnerStage({ role_title: trimmedRole, level_name: trimmedName, assignment_type: newAssignmentType });

      const newLevel: IWorkflowLevel = {
        level_id: targetSeq,
        level_name: trimmedName,
        role_title: trimmedRole,
        sbu: trimmedSbu,
        is_active: true,
        assignment_type: newAssignmentType,
        is_project_owner_stage: isPO,
      };

      // Insert into SBU levels at targetSeq - 1 and resequence 1..N
      sbuLevels.splice(targetSeq - 1, 0, newLevel);
      const resequencedSbu = sbuLevels.map((l, idx) => ({ ...l, level_id: idx + 1 }));
      const otherLevels = levels.filter((l) => (l.sbu || "").toLowerCase() !== trimmedSbu.toLowerCase());
      const updated = [...otherLevels, ...resequencedSbu];

      setLevels(updated);

      // Save directly to SharePoint list CERWorkflowLevels
      await dataService.saveWorkflowLevels(updated);

      if (dataService.logAdminAudit) {
        await dataService.logAdminAudit({
          actor_name: currentUser.name,
          actor_email: currentUser.email,
          action: "WORKFLOW_UPDATED",
          target_type: "WORKFLOW",
          target_id: "CERWorkflowLevels",
          details: `Added new approval level at stage ${targetSeq}: '${trimmedName}' (${trimmedRole}) for SBU '${trimmedSbu}'. Resequenced ${resequencedSbu.length} stages for this SBU.`,
          after_value: JSON.stringify(newLevel),
          timestamp: now,
        });
      }

      await onRefreshLevels();
      setIsAddModalOpen(false);
      setSuccessNotice(`Successfully added Approval Level ${targetSeq} ('${trimmedName}') for ${trimmedSbu} to SharePoint list CERWorkflowLevels.`);
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      setAddModalError(err?.message || "Failed to add approval level to SharePoint.");
    } finally {
      setIsSubmittingAdd(false);
    }
  };

  // --- EDIT LEVEL MODAL HANDLERS ---
  const handleOpenEditModal = (level: IWorkflowLevel) => {
    const isPO = isProjectOwnerStage(level);
    const initialAssignment: ApproverAssignmentType = level.assignment_type || (isPO ? "ProjectOwnerAuto" : "SpecificUser");
    setEditAssignmentType(initialAssignment);
    setEditingLevel({
      ...level,
      sbu: level.sbu && level.sbu !== "All" ? level.sbu : "RJ North",
      assignment_type: initialAssignment,
    });
    setEditSequence(level.level_id);
    setEditModalError(null);
  };

  const handleEditRoleTitleChange = (val: string) => {
    if (!editingLevel) return;
    setEditingLevel({ ...editingLevel, role_title: val });
    if (isProjectOwnerStage({ role_title: val })) {
      setEditAssignmentType("ProjectOwnerAuto");
    }
  };

  const handleEditLevelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLevel) return;

    setEditModalError(null);
    const trimmedName = editingLevel.level_name.trim();
    const trimmedRole = editingLevel.role_title.trim();
    const trimmedSbu = (editingLevel.sbu || "").trim();

    if (!trimmedName) {
      setEditModalError("Please enter a valid Level Name.");
      return;
    }
    if (!trimmedRole) {
      setEditModalError("Please enter a valid Role Title.");
      return;
    }
    if (!trimmedSbu || trimmedSbu === "All") {
      setEditModalError("Please select a Block / SBU Route (RJ North, RJ South, CBOS, or RAVA).");
      return;
    }

    setIsSubmittingEdit(true);
    try {
      const origLevel = levels.find((l) =>
        l.id && editingLevel.id ? l.id === editingLevel.id : l.level_id === editingLevel.level_id && (l.sbu || "").toLowerCase() === (editingLevel.sbu || "").toLowerCase()
      ) || editingLevel;
      const oldSbu = origLevel.sbu || trimmedSbu;
      const newSbu = trimmedSbu;

      const isPO = editAssignmentType === "ProjectOwnerAuto" || isProjectOwnerStage({ role_title: trimmedRole, level_name: trimmedName, assignment_type: editAssignmentType });

      const updatedLevel: IWorkflowLevel = {
        ...editingLevel,
        level_name: trimmedName,
        role_title: trimmedRole,
        sbu: trimmedSbu,
        is_active: true,
        assignment_type: editAssignmentType,
        is_project_owner_stage: isPO,
      };

      let updated: IWorkflowLevel[] = [];

      if (oldSbu.toLowerCase() === newSbu.toLowerCase()) {
        // Same SBU: resequence within this SBU
        const sbuLevels = levels
          .filter((l) => (l.sbu || "").toLowerCase() === newSbu.toLowerCase() && (l.id && origLevel.id ? l.id !== origLevel.id : l.level_id !== origLevel.level_id))
          .sort((a, b) => a.level_id - b.level_id);
        const maxSeq = sbuLevels.length + 1;
        const targetSeq = Math.max(1, Math.min(editSequence || 1, maxSeq));

        sbuLevels.splice(targetSeq - 1, 0, updatedLevel);
        const resequencedSbu = sbuLevels.map((l, idx) => ({ ...l, level_id: idx + 1 }));
        const otherLevels = levels.filter((l) => (l.sbu || "").toLowerCase() !== newSbu.toLowerCase());
        updated = [...otherLevels, ...resequencedSbu];
      } else {
        // SBU changed: remove from old SBU and resequence old SBU; insert into new SBU and resequence new SBU
        const oldSbuRemaining = levels
          .filter((l) => (l.sbu || "").toLowerCase() === oldSbu.toLowerCase() && (l.id && origLevel.id ? l.id !== origLevel.id : l.level_id !== origLevel.level_id))
          .sort((a, b) => a.level_id - b.level_id)
          .map((l, idx) => ({ ...l, level_id: idx + 1 }));

        const newSbuLevels = levels
          .filter((l) => (l.sbu || "").toLowerCase() === newSbu.toLowerCase())
          .sort((a, b) => a.level_id - b.level_id);
        const maxSeq = newSbuLevels.length + 1;
        const targetSeq = Math.max(1, Math.min(editSequence || maxSeq, maxSeq));
        newSbuLevels.splice(targetSeq - 1, 0, updatedLevel);
        const resequencedNewSbu = newSbuLevels.map((l, idx) => ({ ...l, level_id: idx + 1 }));

        const untouched = levels.filter(
          (l) => (l.sbu || "").toLowerCase() !== oldSbu.toLowerCase() && (l.sbu || "").toLowerCase() !== newSbu.toLowerCase()
        );
        updated = [...untouched, ...oldSbuRemaining, ...resequencedNewSbu];
      }

      setLevels(updated);

      // Save directly to SharePoint list CERWorkflowLevels
      await dataService.saveWorkflowLevels(updated);

      if (dataService.logAdminAudit) {
        await dataService.logAdminAudit({
          actor_name: currentUser.name,
          actor_email: currentUser.email,
          action: "WORKFLOW_UPDATED",
          target_type: "WORKFLOW",
          target_id: "CERWorkflowLevels",
          details: `Updated approval level stage to ${editSequence}: '${trimmedName}' (${trimmedRole}) for SBU '${trimmedSbu}'.`,
          after_value: JSON.stringify(updatedLevel),
          timestamp: new Date().toISOString(),
        });
      }

      await onRefreshLevels();
      setEditingLevel(null);
      setSuccessNotice(`Successfully updated Approval Level in SBU '${trimmedSbu}' in SharePoint list CERWorkflowLevels.`);
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      setEditModalError(err?.message || "Failed to update approval level in SharePoint.");
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  // --- DELETE LEVEL MODAL HANDLERS ---
  const handleConfirmDelete = async () => {
    if (!deletingLevel) return;

    setIsSubmittingDelete(true);
    try {
      const delSbu = deletingLevel.sbu;
      const remainingSbu = levels
        .filter((l) => (l.sbu || "").toLowerCase() === (delSbu || "").toLowerCase() && (l.id && deletingLevel.id ? l.id !== deletingLevel.id : l.level_id !== deletingLevel.level_id))
        .sort((a, b) => a.level_id - b.level_id)
        .map((l, idx) => ({ ...l, level_id: idx + 1 }));

      const otherLevels = levels.filter((l) => (l.sbu || "").toLowerCase() !== (delSbu || "").toLowerCase());
      const reindexed = [...otherLevels, ...remainingSbu];
      setLevels(reindexed);

      // Save directly to SharePoint list CERWorkflowLevels
      await dataService.saveWorkflowLevels(reindexed);

      if (dataService.logAdminAudit) {
        await dataService.logAdminAudit({
          actor_name: currentUser.name,
          actor_email: currentUser.email,
          action: "WORKFLOW_UPDATED",
          target_type: "WORKFLOW",
          target_id: "CERWorkflowLevels",
          details: `Deleted approval level ${deletingLevel.level_id} ('${deletingLevel.level_name}') in SBU '${delSbu}' and re-sequenced remaining ${remainingSbu.length} levels for this SBU.`,
          timestamp: new Date().toISOString(),
        });
      }

      await onRefreshLevels();
      const deletedId = deletingLevel.level_id;
      setDeletingLevel(null);
      setSuccessNotice(`Successfully deleted Approval Level ${deletedId} (${delSbu}) from SharePoint list CERWorkflowLevels.`);
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to delete approval level from SharePoint.");
      setDeletingLevel(null);
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  // --- REORDER HANDLER (MOVE UP / MOVE DOWN) - SCOPED STRICTLY TO SBU ---
  const handleMove = async (level: IWorkflowLevel, direction: "up" | "down") => {
    const sbu = level.sbu || "";
    const sbuLevels = getSbuLevels(sbu);
    const index = sbuLevels.findIndex((l) =>
      l.id && level.id ? l.id === level.id : l.level_id === level.level_id
    );
    if (index === -1) return;

    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sbuLevels.length) return;

    const copy = [...sbuLevels];
    const temp = copy[index];
    copy[index] = copy[targetIndex];
    copy[targetIndex] = temp;

    // Re-index sequential level_id strictly within this SBU
    const reindexedSbu = copy.map((l, idx) => ({ ...l, level_id: idx + 1 }));
    const otherLevels = levels.filter((l) => (l.sbu || "").toLowerCase() !== sbu.toLowerCase());
    const reindexed = [...otherLevels, ...reindexedSbu];

    setLevels(reindexed);

    setIsSaving(true);
    try {
      await dataService.saveWorkflowLevels(reindexed);
      await onRefreshLevels();
      setSuccessNotice(`Approval level sequence for ${sbu} updated in SharePoint list CERWorkflowLevels.`);
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (err: any) {
      setErrorMessage(err?.message || "Failed to update level sequence in SharePoint.");
    } finally {
      setIsSaving(false);
    }
  };



  // --- BATCH SAVE ALL CHANGES ---
  const handleSaveAll = async () => {
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
      if (!l.sbu || !l.sbu.trim() || l.sbu === "All") {
        setErrorMessage(`Approval Level ${l.level_id} ('${l.level_name}') must have an explicit SBU assigned (RJ North, RJ South, CBOS, or RAVA).`);
        return;
      }
    }

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const creatorInfo = currentUser.email
        ? `${currentUser.name} (${currentUser.email})`
        : currentUser.name || "Administrator";

      const preparedLevels = levels.map((l) => ({
        ...l,
        created_by: l.created_by || creatorInfo,
        created_date: l.created_date || now,
        sbu: (l.sbu || "").trim(),
        is_active: true,
      }));

      await dataService.saveWorkflowLevels(preparedLevels);

      if (dataService.logAdminAudit) {
        await dataService.logAdminAudit({
          actor_name: currentUser.name,
          actor_email: currentUser.email,
          action: "WORKFLOW_UPDATED",
          target_type: "WORKFLOW",
          target_id: "CERWorkflowLevels",
          details: `Updated sequential workflow hierarchy in SharePoint list (${preparedLevels.length} levels).`,
          after_value: JSON.stringify(preparedLevels),
          timestamp: now,
        });
      }

      setSuccessNotice(`Successfully saved ${preparedLevels.length} approval levels directly to SharePoint list CERWorkflowLevels.`);
      await onRefreshLevels();
      setTimeout(() => setSuccessNotice(null), 5000);
    } catch (e: any) {
      setErrorMessage(e?.message || "Failed to save workflow levels to SharePoint list.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in flex flex-col flex-1 min-h-0">
      {/* Success Notification Banner */}
      {successNotice && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs flex items-center justify-between shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span className="font-medium">{successNotice}</span>
          </div>
          <button
            onClick={() => setSuccessNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Error Notification Banner */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-2xl text-rose-800 text-xs flex items-center justify-between shadow-xs">
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

      {/* Header Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col gap-3.5 shrink-0">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 tracking-tight">
              Sequential Approval Levels Hierarchy
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dynamic SBU-wise approval stages saved directly in SharePoint list <strong>CERWorkflowLevels</strong>.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Add Level Button (Triggers Popup) */}
            <button
              type="button"
              onClick={handleOpenAddModal}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-subtle hover:shadow-hover transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Level</span>
            </button>

            {/* Save All Changes Button */}
            <button
              type="button"
              onClick={handleSaveAll}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition-colors cursor-pointer"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5 text-slate-500" />
                  <span>Save All Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* SBU Filter Tabs */}
        <div className="pt-2 border-t border-slate-100 flex items-center gap-1.5 overflow-x-auto text-xs">
          <span className="text-slate-400 font-semibold text-[11px] mr-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            <span>SBU Route:</span>
          </span>
          {(["ALL", "RJ North", "RJ South", "CBOS", "RAVA"] as const).map((sbuKey) => {
            const isSelected = selectedSbuFilter === sbuKey;
            const count = sbuKey === "ALL"
              ? levels.length
              : levels.filter((l) => l.sbu === sbuKey).length;

            return (
              <button
                key={sbuKey}
                type="button"
                onClick={() => setSelectedSbuFilter(sbuKey)}
                className={`px-3 py-1 rounded-xl font-semibold text-xs transition-all flex items-center gap-1.5 shrink-0 cursor-pointer ${
                  isSelected
                    ? "bg-[#0A1E38] text-white shadow-xs"
                    : "bg-slate-100 hover:bg-slate-200 text-slate-600"
                }`}
              >
                <span>{sbuKey === "ALL" ? "All SBUs" : sbuKey}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                    isSelected ? "bg-white/20 text-white" : "bg-white text-slate-600"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Levels Content Area */}
      {isLoading ? (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle p-4 space-y-3">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div
              key={`hierarchy-skeleton-${idx}`}
              className="p-3 sm:p-3.5 border border-slate-100 rounded-xl flex items-center justify-between gap-3 animate-pulse"
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg bg-slate-200 shrink-0" />
                <div className="space-y-1.5">
                  <div className="h-4 w-40 bg-slate-200 rounded" />
                  <div className="h-3 w-56 bg-slate-200 rounded" />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 bg-slate-200 rounded-lg" />
              </div>
            </div>
          ))}
        </div>
      ) : levels.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center flex flex-col items-center justify-center shadow-subtle">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <Layers className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">No Approval Levels Configured</h4>
          <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
            The SharePoint list <strong>CERWorkflowLevels</strong> is currently empty. Click &quot;Add Level&quot; to configure your sequential approval stages.
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-subtle hover:shadow-hover transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Level</span>
          </button>
        </div>
      ) : filteredLevels.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-slate-300 p-12 text-center flex flex-col items-center justify-center shadow-subtle">
          <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-400 flex items-center justify-center mb-3">
            <Filter className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-bold text-slate-900">No Levels Found for SBU &quot;{selectedSbuFilter}&quot;</h4>
          <p className="text-xs text-slate-500 max-w-md mt-1 mb-4">
            There are no approval stages specifically scoped to <strong>{selectedSbuFilter}</strong>. Click &quot;Add Level&quot; to configure stages for this SBU.
          </p>
          <button
            type="button"
            onClick={handleOpenAddModal}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl shadow-subtle hover:shadow-hover transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Add Level for {selectedSbuFilter}</span>
          </button>
        </div>
      ) : (
        <div
          ref={pagination.tableContainerRef}
          className="bg-white rounded-2xl border border-slate-200/80 shadow-subtle overflow-hidden flex flex-col flex-1"
        >
          {/* Card List with data-role="list-item" for precise dynamic pagination measurement */}
          <div className="divide-y divide-slate-100 flex-1 overflow-y-auto">
            {visibleLevels.map((level) => {
              const sbuLevels = getSbuLevels(level.sbu || "");
              const sbuIndex = sbuLevels.findIndex((l) =>
                l.id && level.id ? l.id === level.id : l.level_id === level.level_id
              );
              const isFirstInSbu = sbuIndex <= 0;
              const isLastInSbu = sbuIndex === -1 || sbuIndex >= sbuLevels.length - 1;
              const isOwnerStage = isProjectOwnerStage(level);

              return (
                <div
                  key={`${level.sbu}-${level.level_id}-${level.id || ""}`}
                  data-role="list-item"
                  className="p-3 sm:p-3.5 transition-colors flex items-center justify-between gap-3 hover:bg-slate-50/70"
                >
                  {/* Left: Reorder Controls + Level Badge + Name & Role */}
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {/* Reorder Arrows (Scoped strictly to this SBU) */}
                    <div className="flex flex-col items-center shrink-0">
                      <button
                        onClick={() => handleMove(level, "up")}
                        disabled={isFirstInSbu || isSaving}
                        className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer transition-colors"
                        title={`Move stage up within ${level.sbu || "SBU"}`}
                      >
                        <MoveUp className="w-3 h-3" />
                      </button>
                      <button
                        onClick={() => handleMove(level, "down")}
                        disabled={isLastInSbu || isSaving}
                        className="p-0.5 text-slate-400 hover:text-slate-700 disabled:opacity-20 cursor-pointer transition-colors"
                        title={`Move stage down within ${level.sbu || "SBU"}`}
                      >
                        <MoveDown className="w-3 h-3" />
                      </button>
                    </div>

                    {/* Sequential Level ID Badge */}
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white font-bold text-xs flex items-center justify-center shadow-xs shrink-0">
                      {level.level_id}
                    </div>

                    {/* Level Details */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {level.level_name}
                        </span>
                        {/* Sequential Stage Badge */}
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 shrink-0">
                          <span>Stage {level.level_id}</span>
                        </span>
                        {/* SBU Scope Badge */}
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                          <span>SBU: {level.sbu || "Pending"}</span>
                        </span>
                        {/* Approver Assignment Badge */}
                        {isOwnerStage ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                            <Sparkles className="w-3 h-3 text-amber-600" />
                            <span>Auto — Project Owner (Dynamic)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 shrink-0">
                            <User className="w-3 h-3 text-slate-500" />
                            <span>Specific User</span>
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-500 flex-wrap">
                        <span className="font-medium text-slate-700">
                          {level.role_title || "Role Title Pending"}
                        </span>
                        <span className="text-slate-300">•</span>
                        {isOwnerStage ? (
                          <span className="flex items-center gap-1 text-[10.5px] text-amber-700 font-medium">
                            <UserCheck className="w-3 h-3 text-amber-600" />
                            <span>Dynamic per proposal (CER Owner)</span>
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-[10.5px] text-slate-600">
                            <User className="w-3 h-3 text-blue-500" />
                            <span className="truncate max-w-[160px] sm:max-w-[200px] font-medium">
                              {level.approver_name || "Approver from User Roles"}
                            </span>
                          </span>
                        )}
                        {level.created_date && (
                          <>
                            <span className="text-slate-300 hidden md:inline">•</span>
                            <span className="hidden md:flex items-center gap-1 text-[10.5px] text-slate-400">
                              <Clock className="w-3 h-3 text-slate-300" />
                              <span>{formatTimestamp(level.created_date)}</span>
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Edit Icon Button */}
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(level)}
                      className="p-1.5 rounded-lg text-blue-600 hover:text-blue-800 hover:bg-blue-50 transition-colors cursor-pointer"
                      title={`Edit Approval Level ${level.level_id}`}
                      aria-label={`Edit Approval Level ${level.level_id}`}
                    >
                      <Edit className="w-4 h-4" />
                    </button>

                    {/* Delete Icon Button */}
                    <button
                      type="button"
                      onClick={() => setDeletingLevel(level)}
                      className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                      title={`Delete Approval Level ${level.level_id}`}
                      aria-label={`Delete Approval Level ${level.level_id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Dynamic Pagination Bar (Locks card list to viewport without window scroll) */}
          <DataTablePagination
            currentPage={pagination.currentPage}
            totalPages={pagination.totalPages}
            totalItems={filteredLevels.length}
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
      )}

      {/* ========================================================================= */}
      {/* MODAL 1: ADD APPROVAL LEVEL POPUP                                        */}
      {/* ========================================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                  {newSequence}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Add Approval Level
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Create new sequential approval stage in SharePoint list
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleAddLevelSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1 min-h-0">
              {addModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{addModalError}</span>
                </div>
              )}

              {/* Block / SBU Route */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Block / SBU Route <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={newSbu}
                  onChange={(e) => handleAddSbuChange(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium cursor-pointer"
                >
                  <option value="" disabled>-- Select SBU --</option>
                  <option value="RJ North">RJ North</option>
                  <option value="RJ South">RJ South</option>
                  <option value="CBOS">CBOS</option>
                  <option value="RAVA">RAVA</option>
                </select>
              </div>

              {/* Sequential Stage Number */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Sequential Stage Number <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={newSequence}
                    onChange={(e) => setNewSequence(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-bold cursor-pointer"
                  >
                    {Array.from({ length: getSbuLevels(newSbu || "RJ North").length + 1 }).map((_, idx) => (
                      <option key={`add-seq-${idx + 1}`} value={idx + 1}>
                        Stage {idx + 1} {idx + 1 === getSbuLevels(newSbu || "RJ North").length + 1 ? "(New End Stage)" : "(Insert at Stage " + (idx + 1) + ")"}
                      </option>
                    ))}
                  </select>
                </div>
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Stages within {newSbu || "the selected SBU"} will maintain contiguous 1..N order.
                </p>
              </div>

              {/* Level Name */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Level Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newLevelName}
                  onChange={(e) => setNewLevelName(e.target.value)}
                  placeholder="e.g. L4 - Executive Committee Sign-off"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600"
                />
              </div>

              {/* Role Title */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Role Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newRoleTitle}
                  onChange={(e) => handleNewRoleTitleChange(e.target.value)}
                  placeholder="e.g. Project Owner, SBU Operations Head"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                />
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Note: Setting role to <strong>Project Owner</strong> automatically defaults assignment to <strong>Auto — Project Owner</strong>.
                </p>
              </div>

              {/* Approver Assignment Section */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-800">
                    Approver Assignment <span className="text-rose-500">*</span>
                  </label>
                  {newAssignmentType === "ProjectOwnerAuto" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Dynamic Assignment
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      <User className="w-3 h-3 text-slate-400" />
                      Specific User
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Assignment Type
                  </label>
                  <select
                    value={newAssignmentType}
                    onChange={(e) => setNewAssignmentType(e.target.value as ApproverAssignmentType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-semibold cursor-pointer"
                  >
                    <option value="SpecificUser">Specific User</option>
                    <option value="ProjectOwnerAuto">Auto — Project Owner</option>
                  </select>
                </div>

                {newAssignmentType === "ProjectOwnerAuto" ? (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
                    <div className="flex items-start gap-2">
                      <UserCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-900 leading-snug">
                        The approver will be automatically fetched from the Project Owner details of each CER proposal.
                      </p>
                    </div>

                    {/* Concise Dynamic Assignment Preview */}
                    <div className="p-2.5 bg-white rounded-lg border border-amber-200/90 text-[11px] space-y-1 shadow-2xs">
                      <div className="font-bold text-amber-900 flex items-center gap-1.5 pb-1 border-b border-amber-100">
                        <Eye className="w-3.5 h-3.5 text-amber-600" />
                        <span>Assignment Preview</span>
                      </div>
                      <div className="grid grid-cols-[84px_1fr] gap-x-2 gap-y-1 text-slate-600 pt-0.5">
                        <span className="font-semibold text-slate-700">Approver:</span>
                        <span className="font-bold text-amber-800">Auto — Project Owner</span>
                        <span className="font-semibold text-slate-700">Source:</span>
                        <span className="text-slate-800">CER Proposal &rarr; Project Owner Email (<code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">owner_email</code>)</span>
                        <span className="font-semibold text-slate-700">Assignment:</span>
                        <span className="text-amber-700 font-semibold">Dynamic per proposal</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-600 leading-snug">
                        Approvers for this stage are assigned to specific users in the <strong>User &amp; Role Management</strong> tab (Role: <em>Approver</em>, Level: <em>Stage {newSequence}</em>).
                      </p>
                    </div>

                    {/* Concise Specific User Preview */}
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-[11px] space-y-1 shadow-2xs">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>Assignment Preview</span>
                      </div>
                      <div className="grid grid-cols-[84px_1fr] gap-x-2 gap-y-1 text-slate-600 pt-0.5">
                        <span className="font-semibold text-slate-700">Approver:</span>
                        <span className="font-medium text-slate-800">
                          {userRoles.filter((u) => u.is_active && u.role === "Approver" && u.approval_level === newSequence).length > 0
                            ? userRoles
                                .filter((u) => u.is_active && u.role === "Approver" && u.approval_level === newSequence)
                                .map((u) => `${u.user_name} (${u.user_email})`)
                                .join(", ")
                            : "Configured in User & Role Management"}
                        </span>
                        <span className="font-semibold text-slate-700">Source:</span>
                        <span className="text-slate-800">CERUserRoles List (Stage {newSequence})</span>
                        <span className="font-semibold text-slate-700">Assignment:</span>
                        <span className="text-blue-700 font-semibold">Specific User</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Info Note on SBU-Wise Routing */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-700 leading-relaxed">
                <strong>SBU-Wise Approval Routing:</strong> Each approval level is scoped to a specific SBU (RJ North, RJ South, CBOS, or RAVA). Approvers are mapped to this stage level in the <strong>User &amp; Role Management</strong> tab (or auto-fetched if Project Owner).
              </div>

              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  disabled={isSubmittingAdd}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl font-semibold text-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingAdd}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-subtle hover:shadow-hover transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingAdd ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving to SharePoint...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Add Level</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: EDIT APPROVAL LEVEL POPUP                                       */}
      {/* ========================================================================= */}
      {editingLevel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-3.5rem)] my-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-3.5 border-b border-slate-100 bg-slate-50/50 shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-xs shrink-0">
                  {editSequence}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    Edit Approval Level {editingLevel.level_id}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Modify stage name, sequence, role title, or SBU routing
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingLevel(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditLevelSubmit} className="flex-1 flex flex-col min-h-0 overflow-hidden">
              <div className="p-6 space-y-4 text-xs overflow-y-auto flex-1 min-h-0">
              {editModalError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>{editModalError}</span>
                </div>
              )}

              {/* Block / SBU Route */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Block / SBU Route <span className="text-rose-500">*</span>
                </label>
                <select
                  required
                  value={editingLevel.sbu && editingLevel.sbu !== "All" ? editingLevel.sbu : ""}
                  onChange={(e) => {
                    const nextSbu = e.target.value;
                    setEditingLevel({
                      ...editingLevel,
                      sbu: nextSbu,
                    });
                    const targetCount = getSbuLevels(nextSbu).length;
                    setEditSequence(Math.min(editSequence, targetCount + 1));
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium cursor-pointer"
                >
                  <option value="" disabled>-- Select SBU --</option>
                  <option value="RJ North">RJ North</option>
                  <option value="RJ South">RJ South</option>
                  <option value="CBOS">CBOS</option>
                  <option value="RAVA">RAVA</option>
                  {editingLevel.sbu && ["All", "RJ North", "RJ South", "CBOS", "RAVA"].indexOf(editingLevel.sbu) === -1 && (
                    <option value={editingLevel.sbu}>{editingLevel.sbu}</option>
                  )}
                </select>
              </div>

              {/* Sequential Stage Number */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Sequential Stage Number <span className="text-rose-500">*</span>
                </label>
                <select
                  value={editSequence}
                  onChange={(e) => setEditSequence(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-bold cursor-pointer"
                >
                  {Array.from({
                    length: Math.max(
                      editSequence,
                      getSbuLevels(editingLevel.sbu || "").length
                    ),
                  }).map((_, idx) => (
                    <option key={`edit-seq-${idx + 1}`} value={idx + 1}>
                      Stage {idx + 1}
                    </option>
                  ))}
                </select>
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Re-orders stage within {editingLevel.sbu || "selected SBU"}. Contiguous 1..N order is preserved.
                </p>
              </div>

              {/* Level Name */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Level Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingLevel.level_name}
                  onChange={(e) =>
                    setEditingLevel({ ...editingLevel, level_name: e.target.value })
                  }
                  placeholder="e.g. L1 - Technical & SBU Review"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-bold"
                />
              </div>

              {/* Role Title */}
              <div>
                <label className="block font-semibold text-slate-800 mb-1">
                  Role Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={editingLevel.role_title}
                  onChange={(e) => handleEditRoleTitleChange(e.target.value)}
                  placeholder="e.g. Project Owner, SBU Operations Head"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-medium"
                />
                <p className="text-[10.5px] text-slate-500 mt-1">
                  Note: Setting role to <strong>Project Owner</strong> automatically defaults assignment to <strong>Auto — Project Owner</strong>.
                </p>
              </div>

              {/* Approver Assignment Section */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-semibold text-slate-800">
                    Approver Assignment <span className="text-rose-500">*</span>
                  </label>
                  {editAssignmentType === "ProjectOwnerAuto" ? (
                    <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      Dynamic Assignment
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      <User className="w-3 h-3 text-slate-400" />
                      Specific User
                    </span>
                  )}
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-600 mb-1">
                    Assignment Type
                  </label>
                  <select
                    value={editAssignmentType}
                    onChange={(e) => setEditAssignmentType(e.target.value as ApproverAssignmentType)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 font-semibold cursor-pointer"
                  >
                    <option value="SpecificUser">Specific User</option>
                    <option value="ProjectOwnerAuto">Auto — Project Owner</option>
                  </select>
                </div>

                {editAssignmentType === "ProjectOwnerAuto" ? (
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl space-y-2.5">
                    <div className="flex items-start gap-2">
                      <UserCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-amber-900 leading-snug">
                        The approver will be automatically fetched from the Project Owner details of each CER proposal.
                      </p>
                    </div>

                    {/* Concise Dynamic Assignment Preview */}
                    <div className="p-2.5 bg-white rounded-lg border border-amber-200/90 text-[11px] space-y-1 shadow-2xs">
                      <div className="font-bold text-amber-900 flex items-center gap-1.5 pb-1 border-b border-amber-100">
                        <Eye className="w-3.5 h-3.5 text-amber-600" />
                        <span>Assignment Preview</span>
                      </div>
                      <div className="grid grid-cols-[84px_1fr] gap-x-2 gap-y-1 text-slate-600 pt-0.5">
                        <span className="font-semibold text-slate-700">Approver:</span>
                        <span className="font-bold text-amber-800">Auto — Project Owner</span>
                        <span className="font-semibold text-slate-700">Source:</span>
                        <span className="text-slate-800">CER Proposal &rarr; Project Owner Email (<code className="text-[10px] bg-slate-100 px-1 py-0.5 rounded font-mono text-slate-700">owner_email</code>)</span>
                        <span className="font-semibold text-slate-700">Assignment:</span>
                        <span className="text-amber-700 font-semibold">Dynamic per proposal</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                    <div className="flex items-start gap-2">
                      <User className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                      <p className="text-[11px] text-slate-600 leading-snug">
                        Approvers for this stage are assigned to specific users in the <strong>User &amp; Role Management</strong> tab (Role: <em>Approver</em>, Level: <em>Stage {editSequence}</em>).
                      </p>
                    </div>

                    {/* Concise Specific User Preview */}
                    <div className="p-2.5 bg-white rounded-lg border border-slate-200 text-[11px] space-y-1 shadow-2xs">
                      <div className="font-bold text-slate-800 flex items-center gap-1.5 pb-1 border-b border-slate-100">
                        <Eye className="w-3.5 h-3.5 text-blue-600" />
                        <span>Assignment Preview</span>
                      </div>
                      <div className="grid grid-cols-[84px_1fr] gap-x-2 gap-y-1 text-slate-600 pt-0.5">
                        <span className="font-semibold text-slate-700">Approver:</span>
                        <span className="font-medium text-slate-800">
                          {userRoles.filter((u) => u.is_active && u.role === "Approver" && u.approval_level === editSequence).length > 0
                            ? userRoles
                                .filter((u) => u.is_active && u.role === "Approver" && u.approval_level === editSequence)
                                .map((u) => `${u.user_name} (${u.user_email})`)
                                .join(", ")
                            : (editingLevel.approver_name || "Configured in User & Role Management")}
                        </span>
                        <span className="font-semibold text-slate-700">Source:</span>
                        <span className="text-slate-800">CERUserRoles List (Stage {editSequence})</span>
                        <span className="font-semibold text-slate-700">Assignment:</span>
                        <span className="text-blue-700 font-semibold">Specific User</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Info Note on SBU-Wise Routing */}
              <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-100 text-[11px] text-blue-700 leading-relaxed">
                <strong>SBU-Wise Approval Routing:</strong> Each approval level is scoped to a specific SBU (RJ North, RJ South, CBOS, or RAVA). Approvers are mapped to this stage level in the <strong>User &amp; Role Management</strong> tab (or auto-fetched if Project Owner).
              </div>

              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 px-6 py-3.5 border-t border-slate-100 bg-slate-50/50 shrink-0">
                <button
                  type="button"
                  onClick={() => setEditingLevel(null)}
                  disabled={isSubmittingEdit}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl font-semibold text-slate-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEdit}
                  className="flex items-center gap-1.5 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-subtle hover:shadow-hover transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingEdit ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Saving Changes...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Save Changes</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: DELETE LEVEL CONFIRMATION POPUP                                 */}
      {/* ========================================================================= */}
      {deletingLevel && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in overflow-y-auto">
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden max-h-[calc(100vh-2rem)] my-auto flex flex-col">
            <div className="p-6 text-center space-y-4 overflow-y-auto flex-1 min-h-0">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Delete Approval Level {deletingLevel.level_id}?
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to permanently delete{" "}
                  <strong>&quot;{deletingLevel.level_name}&quot;</strong>? This will remove this stage from SharePoint list <strong>CERWorkflowLevels</strong> and automatically re-sequence remaining levels.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setDeletingLevel(null)}
                  disabled={isSubmittingDelete}
                  className="px-4 py-2 border border-slate-200 hover:bg-slate-100 rounded-xl font-semibold text-slate-700 text-xs transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDelete}
                  disabled={isSubmittingDelete}
                  className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-xl text-xs shadow-subtle hover:shadow-hover transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingDelete ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3 h-3" />
                      <span>Confirm Delete</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
