import React, { useState } from "react";
import {
  X,
  BookOpen,
  FilePlus,
  CheckCircle2,
  RefreshCw,
  BarChart3,
  ShieldCheck,
} from "lucide-react";

interface IUserManualModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserManualModal: React.FC<IUserManualModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<
    "overview" | "creation" | "workflow" | "change" | "reports"
  >("overview");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 lg:p-6 overflow-y-auto bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-4xl bg-white rounded-2xl shadow-elevated border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 bg-[#05162A] text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-600 text-white flex items-center justify-center shadow-sm">
              <BookOpen className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Capital Expenditure Request (CER) — User Manual
              </h2>
              <p className="text-xs text-cyan-200 mt-0.5">
                Standard Operating Procedures & Workflow Guidelines
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/10 transition-colors"
            title="Close Manual"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-4 sm:px-6 bg-slate-50 border-b border-slate-200 overflow-x-auto">
          {[
            { id: "overview", label: "1. Overview", icon: ShieldCheck },
            { id: "creation", label: "2. Create CER", icon: FilePlus },
            { id: "workflow", label: "3. Approval Flow", icon: CheckCircle2 },
            { id: "change", label: "4. Change CER", icon: RefreshCw },
            { id: "Reports", label: "5. Reports & Export", icon: BarChart3 },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-1.5 py-3 px-3 text-xs font-semibold whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? "border-blue-600 text-blue-700 bg-white"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="p-5 sm:p-6 lg:p-8 overflow-y-auto space-y-6 text-sm text-slate-700 leading-relaxed flex-1">
          {activeTab === "overview" && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 border border-blue-200">
                <h3 className="font-bold text-blue-900 text-base mb-1">
                  System Objectives: Plan. Approve. Track. Govern.
                </h3>
                <p className="text-xs sm:text-sm text-blue-800">
                  The Capital Expenditure Request (CER) Management System is the
                  authoritative platform for submitting, routing, evaluating, and
                  sanctioning capital projects. It enforces governance, auditability,
                  and joint venture (JV) cost recovery standards.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <h4 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-600" />
                    Key User Personas
                  </h4>
                  <ul className="text-xs space-y-2 text-slate-600">
                    <li>
                      <strong>Initiator:</strong> Drafts, edits, and submits new CER
                      proposals with required justification and cost breakdown.
                    </li>
                    <li>
                      <strong>Approver:</strong> Reviews pending CERs assigned at
                      specific levels and renders decisions (Approve, Reject, or Send Back).
                    </li>
                    <li>
                      <strong>Finance & Audit:</strong> Reviews financial metrics,
                      JV cost recoverability, and payback schedules.
                    </li>
                    <li>
                      <strong>Admin:</strong> Configures workflow levels, user
                      assignments, and system masters.
                    </li>
                  </ul>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                  <h4 className="font-bold text-slate-900 text-sm mb-1.5 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600" />
                    Core Governance Principles
                  </h4>
                  <ul className="text-xs space-y-2 text-slate-600">
                    <li>
                      <strong>Single Source of Truth:</strong> All CER numbers (e.g.
                      CER/2026-27/0001) are sequentially generated and unique.
                    </li>
                    <li>
                      <strong>Immutable Audit Trail:</strong> Every change to cost,
                      dates, or justifications is tracked with timestamps.
                    </li>
                    <li>
                      <strong>Document Verification:</strong> Mandatory business
                      cases and quotations must be attached before submission.
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

          {activeTab === "creation" && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-base">
                How to Create a New Capital Expenditure Request
              </h3>
              <p className="text-xs text-slate-600">
                Follow these steps to submit a compliant proposal through the 8-section form:
              </p>

              <div className="space-y-3">
                {[
                  {
                    step: "1",
                    title: "General Information",
                    desc: "Enter Proposal Date, Category (Vital, Essential, Desirable), Block/SBU, and Business Justification.",
                  },
                  {
                    step: "2",
                    title: "Project Scope & Timeline",
                    desc: "Define Project Start and Completion dates. Duration is automatically computed in exact calendar days.",
                  },
                  {
                    step: "3",
                    title: "Cost Breakdown & Currency",
                    desc: "Select currency (INR or USD), enter Estimated Capex Amount, and indicate Corporate & JV Budget alignment.",
                  },
                  {
                    step: "4",
                    title: "Financial Payback & Metrics",
                    desc: "Indicate Payback classification, payback quarters, Net Present Value (NPV), and Internal Rate of Return (IRR).",
                  },
                  {
                    step: "5",
                    title: "Attachments & Supporting Docs",
                    desc: "Upload vendor quotes, technical drawings, or feasibility studies (PDF, DOCX, XLSX up to 25MB).",
                  },
                  {
                    step: "6",
                    title: "Save as Draft or Submit",
                    desc: "Use 'Save Draft' to persist progress, or 'Submit for Approval' to launch the sequential workflow.",
                  },
                ].map((s) => (
                  <div
                    key={s.step}
                    className="flex items-start gap-3 p-3.5 rounded-xl border border-slate-200 bg-white shadow-2xs"
                  >
                    <div className="w-7 h-7 rounded-full bg-[#012964] text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {s.step}
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                        {s.title}
                      </h4>
                      <p className="text-xs text-slate-600 mt-0.5">{s.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === "workflow" && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-base">
                Multi-Level Approval Workflow
              </h3>
              <p className="text-xs text-slate-600">
                Proposals transition sequentially through approval stages based on capex value and department:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
                    <h4 className="font-bold text-emerald-950 text-xs sm:text-sm">
                      Approve
                    </h4>
                  </div>
                  <p className="text-xs text-emerald-800">
                    Advances the proposal to the next sequential approval level. When
                    the final stage approves, status becomes "Approved".
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-600" />
                    <h4 className="font-bold text-amber-950 text-xs sm:text-sm">
                      Send Back
                    </h4>
                  </div>
                  <p className="text-xs text-amber-800">
                    Returns the proposal to the Initiator with mandatory reviewer
                    remarks for clarification or scope adjustments.
                  </p>
                </div>

                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-600" />
                    <h4 className="font-bold text-rose-950 text-xs sm:text-sm">
                      Reject
                    </h4>
                  </div>
                  <p className="text-xs text-rose-800">
                    Concludes the workflow as rejected. Reason for rejection is permanently
                    preserved in the Remarks History.
                  </p>
                </div>
              </div>
            </div>
          )}

          {activeTab === "change" && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-base">
                Change CER & Revision Management (FR-02)
              </h3>
              <p className="text-xs text-slate-600">
                When project scope, dates, or cost estimates require modification post-draft:
              </p>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2 text-xs">
                <p>
                  <strong>When to use Change CER:</strong> Used by Initiators to update
                  drafts, modify proposals that were "Sent Back" by an Approver, or request
                  budget revisions.
                </p>
                <p>
                  <strong>Audit Trail Enforcement:</strong> Every changed field is highlighted
                  and stored in the SharePoint audit log with old value, new value, modified
                  by user, and timestamp.
                </p>
              </div>
            </div>
          )}

          {activeTab === "reports" && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-900 text-base">
                Reports, Analytics & Data Export (FR-04)
              </h3>
              <p className="text-xs text-slate-600">
                Generate insights and export data for corporate audits:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm mb-1">
                    Excel Register Export (.xlsx)
                  </h4>
                  <p className="text-xs text-slate-600">
                    Export full or filtered proposal registers including project names,
                    capex values, approval levels, and timestamps.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-200 bg-white shadow-2xs">
                  <h4 className="font-bold text-slate-900 text-xs sm:text-sm mb-1">
                    Formal PDF CER Form
                  </h4>
                  <p className="text-xs text-slate-600">
                    Generate an official printable PDF summary of any proposal with
                    approval signatures, financial metrics, and executive summaries.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-4 sm:p-5 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <span className="text-xs text-slate-500 font-medium">
            CER Management System v1.0 • Enterprise Edition
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-[#012964] hover:bg-[#001f4d] transition-colors shadow-sm cursor-pointer"
          >
            Close Manual
          </button>
        </div>
      </div>
    </div>
  );
};
