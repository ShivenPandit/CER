import React, { useState, useEffect } from "react";
import { Send, Save, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { ICERProposal, IFieldChoices } from "../../models/CERModel";
import { IAppUser } from "../../models/UserModel";
import { ICERAttachment } from "../../models/AttachmentModel";
import { ICERDataService } from "../../services/ICERDataService";
import { ProjectDetailsSection } from "./ProjectDetailsSection";
import { FinancialBenefitsSection } from "./FinancialBenefitsSection";
import { BudgetJVSection } from "./BudgetJVSection";
import { PhasingSection } from "./PhasingSection";
import { CostBreakdownSection } from "./CostBreakdownSection";
import { RemarksSection } from "./RemarksSection";
import { AttachmentSection } from "./AttachmentSection";
import { CategoryDefinitionSection } from '../Shared/CategoryDefinitionSection';
import { FormErrors, validateField, validateAll } from "../../utils/cerValidation";
import { MAX_TOTAL_SIZE_BYTES, formatBytes } from "../../utils/attachmentValidation";
import { getCurrentFiscalYearPhasingLabels } from "../../utils/dateUtils";

interface ICreateCERViewProps {
  dataService: ICERDataService;
  currentUser: IAppUser;
  onCancel: () => void;
  onSuccess: (cerprno: string) => void;
  fieldChoices?: IFieldChoices;
}

export const CreateCERView: React.FC<ICreateCERViewProps> = ({
  dataService,
  currentUser,
  onCancel,
  onSuccess,
  fieldChoices,
}) => {
  const defaultPhasing = getCurrentFiscalYearPhasingLabels();

  const [formData, setFormData] = useState<ICERProposal>({
    id: "",
    proposal_no: "",
    cer_proposal_id: "",
    cerprno: "",
    pr_name: "",
    owname: "",
    owner_email: "",
    sbu: "RJ North",
    status: "Draft",
    object: "",
    amount: 0,
    currency: "USD",
    cat: "Vital",
    payable: "Payback",
    period: "",
    payback_quarters: 0,
    ben_npv: 0,
    ben_irr: 0,
    cost_assumptions: "",
    st_date: "",
    com_date: "",
    duration_months: 0,
    cbudget: "Yes",
    cb_amnt: 0,
    cb_currency: "USD",
    reason: "",
    jv: "No",
    jv_recoverable: "No",
    jv_cost: 0,
    jv_budget: "No",
    jv_amnt: 0,
    jv_reason: "",
    ph_till_label: defaultPhasing.ph_till_label,
    ph_fy_label: defaultPhasing.ph_fy_label,
    ph_beyond_label: defaultPhasing.ph_beyond_label,
    prod_till: 0,
    prod_fy: 0,
    prod_beyond: 0,
    capex_till: 0,
    capex_fy: 0,
    capex_beyond: 0,
    opex_till: 0,
    opex_fy: 0,
    opex_beyond: 0,
    engineer: 0,
    s_fac: 0,
    comis: 0,
    preop: 0,
    others: 0,
    total: 0,
    remarks: "",
    remarks_jv: "",
    current_level: 1,
    pending_with_role: "L1 - Technical Review",
    pending_with_email: "",
    created_date: new Date().toISOString(),
    created_by: currentUser.name,
    modified_date: new Date().toISOString(),
    modified_by: currentUser.name,
    revision_count: 0,
  });

  const [attachments, setAttachments] = useState<ICERAttachment[]>([]);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isCheckingCerNo, setIsCheckingCerNo] = useState(false);
  const cerNoDebounceTimer = React.useRef<any>(null);

  const checkCerNoUniqueness = React.useCallback(
    async (cerNo: string) => {
      const trimmed = (cerNo || "").trim();
      if (!trimmed) return;
      setIsCheckingCerNo(true);
      try {
        const existing = await dataService.getProposalByNumber(trimmed);
        if (existing && existing.id !== formData.id) {
          setErrors((prev) => ({
            ...prev,
            proposal_no: `CER Proposal No. '${trimmed}' already exists in the system. Please enter a unique number.`,
          }));
          setTouched((prev) => ({ ...prev, proposal_no: true }));
        } else {
          setErrors((prev) => {
            if (prev.proposal_no && prev.proposal_no.includes("already exists")) {
              const copy = { ...prev };
              delete copy.proposal_no;
              return copy;
            }
            return prev;
          });
        }
      } catch {
        // non-blocking
      } finally {
        setIsCheckingCerNo(false);
      }
    },
    [dataService, formData.id]
  );

  // On change: update form data and revalidate the specific field if touched or previously errored
  const handleFieldChange = (field: keyof ICERProposal, value: any) => {
    setFormData((prev) => {
      const updated: ICERProposal = { ...prev, [field]: value };
      if (field === "proposal_no" && !prev.cer_proposal_id) {
        updated.cerprno = value;
      }
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

    if (field === "proposal_no" || field === "cerprno") {
      if (cerNoDebounceTimer.current) clearTimeout(cerNoDebounceTimer.current);
      cerNoDebounceTimer.current = setTimeout(() => {
        void checkCerNoUniqueness(value);
      }, 400);
    }
  };

  // On blur: mark field as touched and validate immediately
  const handleFieldBlur = (field: keyof ICERProposal) => {
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

    if (field === "cerprno") {
      void checkCerNoUniqueness(formData.cerprno);
    }
  };

  const handleAddAttachment = (att: ICERAttachment) => {
    setAttachments((prev) => [...prev, att]);
  };

  const handleDeleteAttachment = (id: string) => {
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

  const handleSubmit = async (isDraft: boolean = false) => {
    setErrorMessage(null);

    if (isUploadingAttachments) {
      setErrorMessage("Please wait for all attachments to finish processing before submitting.");
      return;
    }

    const totalAttachmentBytes = attachments.reduce((sum, a) => sum + (a.size || 0), 0);
    if (totalAttachmentBytes > MAX_TOTAL_SIZE_BYTES) {
      setErrorMessage(
        `Total attachment size (${formatBytes(totalAttachmentBytes)}) exceeds the allowed 20 MB limit.`
      );
      return;
    }

    // Validate using modern rules
    const { errors: validationErrors, isValid, firstErrorField } = validateAll(formData, isDraft);

    if (!isValid) {
      setErrors(validationErrors);

      // Mark all errored fields as touched
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

    // Verify CER Proposal No. uniqueness before submitting
    const trimmedNo = (formData.cerprno || "").trim();
    if (!trimmedNo) {
      setErrors((prev) => ({ ...prev, cerprno: "CER Proposal Number is required." }));
      setTouched((prev) => ({ ...prev, cerprno: true }));
      setErrorMessage("Make an entry in mandatory field 'CER Proposal No.'");
      scrollToFirstError("cerprno");
      return;
    }

    try {
      const existing = await dataService.getProposalByNumber(trimmedNo);
      if (existing) {
        setErrors((prev) => ({
          ...prev,
          cerprno: `CER Proposal No. '${trimmedNo}' already exists in the system. Please enter a unique number or click Auto.`,
        }));
        setTouched((prev) => ({ ...prev, cerprno: true }));
        setErrorMessage(`CER Proposal No. '${trimmedNo}' already exists. Please choose a unique proposal number.`);
        scrollToFirstError("cerprno");
        return;
      }
    } catch {
      // non-blocking
    }

    setIsSubmitting(true);
    try {
      const payload: ICERProposal = {
        ...formData,
        status: isDraft ? "Draft" : "In Approval",
      };

      const result = await dataService.createProposal(payload);

      // Save attachments linked to proposal
      for (const att of attachments) {
        await dataService.addAttachment({ ...att, cerprno: payload.cerprno });
      }

      setSuccessNotice(result.message);
      setTimeout(() => {
        onSuccess(payload.cerprno);
      }, 1500);
    } catch (err: any) {
      setErrorMessage(err.message || "An error occurred while creating the proposal.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="cer-create-scope space-y-3.5 sm:space-y-4 pb-16 sm:pb-20">
      {/* Page-Scoped Brand Colour Tokens & Compact Enterprise Style */}
      <style>{`
        .cer-create-scope {
          --cer-brand-blue: #012964;
          --cer-brand-green: #66CC33;
        }

        .cer-create-scope .cer-btn-primary {
          background-color: var(--cer-brand-blue) !important;
          color: #ffffff !important;
        }
        .cer-create-scope .cer-btn-primary:hover:not(:disabled) {
          opacity: 0.92 !important;
        }

        .cer-create-scope .cer-text-blue {
          color: var(--cer-brand-blue) !important;
        }
        .cer-create-scope .cer-text-green {
          color: var(--cer-brand-green) !important;
        }

        .cer-create-scope .cer-border-blue {
          border-color: var(--cer-brand-blue) !important;
        }
        .cer-create-scope .cer-border-green {
          border-color: var(--cer-brand-green) !important;
        }

        .cer-create-scope .cer-bg-blue {
          background-color: var(--cer-brand-blue) !important;
          color: #ffffff !important;
        }
        .cer-create-scope .cer-bg-green {
          background-color: var(--cer-brand-green) !important;
          color: var(--cer-brand-blue) !important;
        }

        .cer-create-scope input:focus,
        .cer-create-scope select:focus,
        .cer-create-scope textarea:focus {
          outline: none !important;
          border-color: var(--cer-brand-blue) !important;
          box-shadow: 0 0 0 2px rgba(1, 41, 100, 0.15) !important;
        }

        .sp-skipToContent:not(:focus):not(:focus-within),
        #sp-skipToContent:not(:focus):not(:focus-within) {
          position: absolute !important;
          top: -9999px !important;
          left: -9999px !important;
        }
      `}</style>

      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white px-4 py-3 sm:px-5 sm:py-3.5 rounded-xl border border-slate-200/80 shadow-sm">
        <div className="flex items-center gap-2.5">
          <button
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight">
              Create Capital Expenditure Request (CER)
            </h2>
            <p className="text-xs text-slate-500">
              Form FR-01: Initiate a new capital expenditure proposal and start approval workflow
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-[#012964] bg-[#012964]/5 px-2.5 py-1 rounded-md border border-[#012964]/20">
            {formData.cerprno || "GENERATING..."}
          </span>
        </div>
      </div>

      {/* Error / Success Alerts */}
      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {successNotice && (
        <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-semibold">{successNotice}</span>
        </div>
      )}

      {/* Section A — Project identification and scope */}
      <ProjectDetailsSection
        formData={formData}
        onChange={handleFieldChange}
        onBlur={handleFieldBlur}
        errors={errors}
        touched={touched}
        dataService={dataService}
        fieldChoices={fieldChoices}
        isCheckingCerNo={isCheckingCerNo}
      />

      {/* Section B — Financial benefits and payback */}
      <FinancialBenefitsSection
        formData={formData}
        onChange={handleFieldChange}
        onBlur={handleFieldBlur}
        errors={errors}
        touched={touched}
        fieldChoices={fieldChoices}
      />

      {/* Section C — Corporate budget & Section D — Joint venture details */}
      <BudgetJVSection
        formData={formData}
        onChange={handleFieldChange}
        onBlur={handleFieldBlur}
        errors={errors}
        touched={touched}
        fieldChoices={fieldChoices}
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
      />

      {/* Section H — Supporting documents */}
      <AttachmentSection
        attachments={attachments}
        onAddAttachment={handleAddAttachment}
        onDeleteAttachment={handleDeleteAttachment}
        cerprno={formData.cerprno}
        userName={currentUser.name}
        onUploadingChange={setIsUploadingAttachments}
      />

      {/* Critical Client Requirement: Category Definition at the end of the Form */}
      <CategoryDefinitionSection />

      {/* Compact Fixed Bottom Actions Bar - Full Width, Aligned with Form Grid */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 shadow-elevated z-30 py-2.5 px-3 sm:px-5 lg:px-6 2xl:px-8">
        <div className="w-full flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 hidden sm:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>
            <span>All changes are tracked in the field-level audit trail upon submission.</span>
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 ml-auto flex-wrap justify-end">
            <button
              type="button"
              onClick={onCancel}
              disabled={isSubmitting || isUploadingAttachments}
              className="px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(true)}
              disabled={isSubmitting || isUploadingAttachments}
              className="flex items-center gap-1.5 px-3 sm:px-4 py-1.5 sm:py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              onClick={() => handleSubmit(false)}
              disabled={isSubmitting || isUploadingAttachments}
              className="flex items-center gap-1.5 px-4 sm:px-5 py-1.5 sm:py-2 text-xs font-semibold text-white rounded-lg shadow-sm transition-all hover:opacity-90 disabled:opacity-50 cer-btn-primary"
              style={{ backgroundColor: '#012964' }}
            >
              <Send className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? "Submitting..."
                  : isUploadingAttachments
                  ? "Processing Attachments..."
                  : "Submit for Approval"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
