import React, { useState, useEffect } from "react";
import {
  Settings,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertTriangle,
  MoveUp,
  MoveDown,
  Layers,
} from "lucide-react";
import { IWorkflowLevel } from "../../models/WorkflowModel";
import { ICERDataService } from "../../services/ICERDataService";

interface IWorkflowConfigViewProps {
  dataService: ICERDataService;
}

export const WorkflowConfigView: React.FC<IWorkflowConfigViewProps> = ({
  dataService,
}) => {
  const [levels, setLevels] = useState<IWorkflowLevel[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const loadLevels = async (): Promise<void> => {
    const list = await dataService.getWorkflowLevels();
    setLevels(list);
  };

  useEffect(() => {
    loadLevels().catch((e) => console.error(e));
  }, []);

  const handleAddLevel = () => {
    const nextId = levels.length > 0 ? Math.max(...levels.map((l) => l.level_id)) + 1 : 1;
    const newLevel: IWorkflowLevel = {
      level_id: nextId,
      level_name: `L${nextId} - Executive Review`,
      role_title: "Executive Reviewer",
      approver_name: "Designated Approver",
      approver_email: "approver@vedanta.co.in",
      is_active: true,
    };
    setLevels([...levels, newLevel]);
  };

  const handleDeleteLevel = (levelId: number) => {
    if (levels.length <= 1) {
      alert("At least one approval level is required in the system.");
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

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await dataService.saveWorkflowLevels(levels);
      setSuccessNotice("Workflow approval levels updated successfully.");
      setTimeout(() => setSuccessNotice(null), 3000);
    } catch (e: any) {
      alert("Failed to save workflow levels: " + e.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">
            Workflow Hierarchy Configuration
          </h2>
          <p className="text-xs text-slate-500">
            Doc §8 #11: Add, modify, or remove sequential approval levels dynamically
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={handleAddLevel}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-xl transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add Level</span>
          </button>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-xl shadow-md shadow-blue-600/30 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Saving..." : "Save Configuration"}</span>
          </button>
        </div>
      </div>

      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-semibold">{successNotice}</span>
        </div>
      )}

      {/* Levels List */}
      <div className="space-y-4">
        {levels.map((lvl, index) => (
          <div
            key={lvl.level_id}
            className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-subtle space-y-4"
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-blue-600 text-white font-bold text-xs flex items-center justify-center">
                  {lvl.level_id}
                </span>
                <span className="font-bold text-slate-900 text-xs">
                  Approval Level {lvl.level_id}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer mr-2">
                  <input
                    type="checkbox"
                    checked={lvl.is_active}
                    onChange={(e) => handleUpdateField(index, "is_active", e.target.checked)}
                    className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Active</span>
                </label>

                <button
                  type="button"
                  onClick={() => handleDeleteLevel(lvl.level_id)}
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Delete this approval level"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Level Title / Stage Name
                </label>
                <input
                  type="text"
                  value={lvl.level_name}
                  onChange={(e) => handleUpdateField(index, "level_name", e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Designated Role Title
                </label>
                <input
                  type="text"
                  value={lvl.role_title}
                  onChange={(e) => handleUpdateField(index, "role_title", e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Approver Name
                </label>
                <input
                  type="text"
                  value={lvl.approver_name}
                  onChange={(e) => handleUpdateField(index, "approver_name", e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Approver Email Address
                </label>
                <input
                  type="email"
                  value={lvl.approver_email}
                  onChange={(e) => handleUpdateField(index, "approver_email", e.target.value)}
                  className="w-full px-3.5 py-2 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
