import React, { useState, useEffect } from "react";
import { Search, Save, ArrowLeft, CheckCircle2, AlertCircle, ShieldAlert } from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
import { IAppUser } from "../../models/UserModel";
import { ICERAttachment } from "../../models/AttachmentModel";
import { ICERDataService } from "../../services/ICERDataService";
import { ProjectDetailsSection } from "../create/ProjectDetailsSection";
import { FinancialBenefitsSection } from "../create/FinancialBenefitsSection";
import { BudgetJVSection } from "../create/BudgetJVSection";
import { PhasingSection } from "../create/PhasingSection";
import { CostBreakdownSection } from "../create/CostBreakdownSection";
import { RemarksSection } from "../create/RemarksSection";
import { AttachmentSection } from "../create/AttachmentSection";
import { CategoryDefinitionSection } from "../common/CategoryDefinitionSection";
import { FormErrors, validateField, validateAll } from "../../utils/cerValidation";

interface IChangeCERViewProps {
  dataService: ICERDataService;
  currentUser: IAppUser;
  initialProposalId?: string;
  onCancel: () => void;
  onSuccess: (cerprno: string) => void;
  onViewRemarksHistory?: (cerprno: string) => void;
}

export const ChangeCERView: React.FC<IChangeCERViewProps> = ({
  dataService,
  currentUser,
  initialProposalId,
  onCancel,
  onSuccess,
  onViewRemarksHistory,
}) => {
  const [proposalNumberInput, setProposalNumberInput] = useState(initialProposalId || "");
  const [formData, setFormData] = useState<ICERProposal | null>(null);
  const [originalProposal, setOriginalProposal] = useState<ICERProposal | null>(null);
  const [attachments, setAttachments] = useState<ICERAttachment[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const loadProposal = async (cerprno: string): Promise<void> => {
    // Specific mandatory validation as required by FR-02:
    if (!cerprno || !cerprno.trim()) {
      setErrorMessage("Make an entry in mandatory field 'CER Proposal No.'");
      setFormData(null);
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessNotice(null);
    setErrors({});
    setTouched({});

    try {
      const found = await dataService.getProposalByNumber(cerprno.trim());
      if (!found) {
        setErrorMessage(`Proposal '${cerprno}' not found in the system.`);
        setFormData(null);
        setOriginalProposal(null);
      } else {
        // Ensure defaults for new fields if not present
        const normalized: ICERProposal = {
          ...found,
          payback_quarters: found.payback_quarters || 4,
          jv_recoverable: found.jv_recoverable || "No",
          ph_till_label: found.ph_till_label || "Till Mar'26",
          ph_fy_label: found.ph_fy_label || "FY 26-27",
          ph_beyond_label: found.ph_beyond_label || "Beyond FY'27",
        };
        setFormData(normalized);
        setOriginalProposal({ ...normalized });

        // Load attachments
        const atts = await dataService.getAttachments(found.cerprno);
        setAttachments(atts);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Error retrieving proposal.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (initialProposalId) {
      loadProposal(initialProposalId).catch((err) => console.error(err));
    }
  }, [initialProposalId]);

  const handleLookupSubmit = (e: React.FormEvent): void => {
    e.preventDefault();
    loadProposal(proposalNumberInput).catch((err) => console.error(err));
  };

  const handleFieldChange = (field: keyof ICERProposal, value: any) => {
    if (!formData) return;
    setFormData((prev) => {
      if (!prev) return null;
      const updated = { ...prev, [field]: value };
      if (touched[field] || errors[field]) {
        const error = validateField(field, value, updated, false);
        setErrors((prevErrors) => {
          const newErrors = { ...prevErrors };
          if (error) {
            newErrors[field] = error;
          } else {
            delete newErrors[field];
          }
          return newErrors;
        });
      }
      return updated;
    });
  };

  const handleFieldBlur = (field: keyof ICERProposal) => {
    if (!formData) return;
    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, formData[field], formData, false);
    setErrors((prev) => {
      const updated = { ...prev };
      if (error) {
        updated[field] = error;
      } else {
        delete updated[field];
      }
      return updated;
    });
  };

  const handleAddAttachment = async (att: ICERAttachment) => {
    if (!formData) return;
    await dataService.addAttachment(att);
    setAttachments((prev) => [...prev, att]);
  };

  const handleDeleteAttachment = async (id: string) => {
    await dataService.deleteAttachment(id);
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const scrollToFirstError = (fieldKey: string) => {
    setTimeout(() => {
      const targetElement = document.getElementById(`field-${fieldKey}`) || document.getElementById(fieldKey);
      if (targetElement) {
        targetElement.scrollIntoView({ behavior: "smooth", block: "center" });
        const focusable = targetElement.querySelector("input, select, textarea") as HTMLElement | null;
        if (focusable) {
          focusable.focus();
        }
      }
    }, 100);
  };

  const handleSaveChange = async () => {
    if (!formData) return;
    setErrorMessage(null);

    // Validate using modern rules
    const { errors: validationErrors, isValid, firstErrorField } = validateAll(formData, false);

    if (!isValid) {
      setErrors(validationErrors);
      const newTouched: Record<string, boolean> = { ...touched };
      Object.keys(validationErrors).forEach((key) => {
        newTouched[key] = true;
      });
      setTouched(newTouched);

      const firstErr = firstErrorField ? validationErrors[firstErrorField] : "Please correct validation errors.";
      setErrorMessage(firstErr || "Please review the form for invalid or missing required entries.");

      if (firstErrorField) {
        scrollToFirstError(firstErrorField);
      }
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await dataService.updateProposal(formData, {
        name: currentUser.name,
        email: currentUser.email,
      });

      setSuccessNotice(`CER Proposal No. has been changed and sent for approval (${result.auditRowsCount} field changes recorded in audit trail).`);
      setTimeout(() => {
        onSuccess(formData.cerprno);
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update proposal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 pb-28 sm:pb-32">
      {/* Search & Lookup Header */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="p-2 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-lg font-bold text-slate-900 tracking-tight">
              Change Capital Expenditure Request (CER)
            </h2>
            <p className="text-xs text-slate-500">
              Form FR-02: Modify an existing proposal, capture field-level audit deltas, and re-trigger approval workflow
            </p>
          </div>
        </div>

        {/* Proposal Number Search Box */}
        <form onSubmit={handleLookupSubmit} className="flex items-center gap-2">
          <div className="relative">
            <input
              type="text"
              value={proposalNumberInput}
              onChange={(e) => setProposalNumberInput(e.target.value)}
              placeholder="Enter CER Proposal No..."
              className="w-56 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-semibold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="flex items-center gap-1.5 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium rounded-xl shadow-sm transition-colors"
          >
            <Search className="w-3.5 h-3.5" />
            <span>{isLoading ? "Searching..." : "Retrieve"}</span>
          </button>
        </form>
      </div>

      {/* Mandatory Validation Error / Notice as required by FR-02 */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-semibold">{successNotice}</span>
        </div>
      )}

      {/* Loaded Form */}
      {formData && (
        <>
          {/* Post-Approval Revision Banner if applicable (Doc §8 #7) */}
          {originalProposal?.status === "Approved" && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <p className="font-bold">Post-Approval Revision Mode (Doc §8 #7)</p>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  This proposal was previously approved. You may edit project parameters and justification; however, the proposal number is locked to preserve referential and audit integrity.
                </p>
              </div>
            </div>
          )}

          {/* Section A — Project identification and scope */}
          <ProjectDetailsSection
            formData={formData}
            onChange={handleFieldChange}
            onBlur={handleFieldBlur}
            errors={errors}
            touched={touched}
            isChangeMode={true}
          />

          {/* Section B — Financial benefits and payback */}
          <FinancialBenefitsSection
            formData={formData}
            onChange={handleFieldChange}
            onBlur={handleFieldBlur}
            errors={errors}
            touched={touched}
          />

          {/* Section C — Corporate budget & Section D — Joint venture details */}
          <BudgetJVSection
            formData={formData}
            onChange={handleFieldChange}
            onBlur={handleFieldBlur}
            errors={errors}
            touched={touched}
          />

          {/* Section E — Expenditure phasing */}
          <PhasingSection
            formData={formData}
            onChange={handleFieldChange}
            onBlur={handleFieldBlur}
            errors={errors}
            touched={touched}
          />

          {/* Section F — CAPEX cost estimates basis */}
          <CostBreakdownSection
            formData={formData}
            onChange={handleFieldChange}
            onBlur={handleFieldBlur}
            errors={errors}
            touched={touched}
          />

          {/* Section G — Remarks and justification */}
          <RemarksSection
            formData={formData}
            onChange={handleFieldChange}
            onBlur={handleFieldBlur}
            errors={errors}
            touched={touched}
            onViewRemarksHistory={
              onViewRemarksHistory ? () => onViewRemarksHistory(formData.cerprno) : undefined
            }
          />

          {/* Section H — Supporting documents */}
          <AttachmentSection
            attachments={attachments}
            onAddAttachment={handleAddAttachment}
            onDeleteAttachment={handleDeleteAttachment}
            cerprno={formData.cerprno}
            userName={currentUser.name}
          />

          {/* Critical Client Requirement: Category Definition at the end of the Form */}
          <CategoryDefinitionSection />

          {/* Sticky Bottom Actions Bar */}
          <div className="fixed bottom-0 left-0 lg:left-64 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-4 sm:px-8 py-3 flex items-center justify-between shadow-elevated z-30">
            <div className="text-xs text-slate-500 hidden md:block">
              Saving will create field-level audit rows and route to Level 1 approver.
            </div>

            <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-wrap justify-end w-full sm:w-auto">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting}
                className="px-3 sm:px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveChange}
                disabled={isSubmitting}
                className="flex items-center gap-2 px-4 sm:px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/30 transition-all hover:scale-[1.02] disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? "Saving & Re-triggering..." : "Save Changes & Re-trigger Workflow"}</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
