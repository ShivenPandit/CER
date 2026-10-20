import React, { useState, useEffect } from "react";
import { Send, Save, ArrowLeft, CheckCircle2, AlertCircle } from "lucide-react";
import { ICERProposal } from "../../models/CERModel";
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
import { CategoryDefinitionSection } from "../common/CategoryDefinitionSection";
import { FormErrors, validateField, validateAll } from "../../utils/cerValidation";

interface ICreateCERViewProps {
  dataService: ICERDataService;
  currentUser: IAppUser;
  onCancel: () => void;
  onSuccess: (cerprno: string) => void;
}

export const CreateCERView: React.FC<ICreateCERViewProps> = ({
  dataService,
  currentUser,
  onCancel,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<ICERProposal>({
    id: "",
    cerprno: "",
    pr_name: "",
    owname: currentUser.name || "",
    owner_email: currentUser.email || "",
    sbu: "RJ North",
    status: "Draft",
    object: "",
    amount: 0,
    currency: "USD",
    cat: "Vital",
    payable: "Payback",
    period: "12 Months",
    payback_quarters: 4,
    ben_npv: 0,
    ben_irr: 0,
    cost_assumptions: "",
    st_date: new Date().toISOString().split("T")[0],
    com_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    duration_months: 12,
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
    ph_till_label: "Till Mar'26",
    ph_fy_label: "FY 26-27",
    ph_beyond_label: "Beyond FY'27",
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
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const generateProposalNumber = async (): Promise<void> => {
    try {
      const generatedNo = await dataService.generateProposalNumber();
      setFormData((prev) => ({ ...prev, cerprno: generatedNo }));
    } catch (e) {
      console.error("Error generating proposal number:", e);
    }
  };

  useEffect(() => {
    generateProposalNumber().catch((e) => console.error(e));
  }, []);

  // On change: update form data and revalidate the specific field if touched or previously errored
  const handleFieldChange = (field: keyof ICERProposal, value: any) => {
    setFormData((prev) => {
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
    <div className="space-y-6 pb-28 sm:pb-32">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/80 shadow-subtle">
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
              Create Capital Expenditure Request (CER)
            </h2>
            <p className="text-xs text-slate-500">
              Form FR-01: Initiate a new capital expenditure proposal and start approval workflow
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
            {formData.cerprno || "GENERATING..."}
          </span>
        </div>
      </div>

      {/* Error / Success Alerts */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-medium">{errorMessage}</span>
        </div>
      )}

      {successNotice && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
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
        onGenerateNewNumber={generateProposalNumber}
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
          All changes are tracked in the field-level audit trail upon submission.
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
            onClick={() => handleSubmit(true)}
            disabled={isSubmitting}
            className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save Draft</span>
          </button>

          <button
            type="button"
            onClick={() => handleSubmit(false)}
            disabled={isSubmitting}
            className="flex items-center gap-2 px-4 sm:px-5 py-2 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl shadow-md shadow-blue-600/30 transition-all hover:scale-[1.02] disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            <span>{isSubmitting ? "Submitting..." : "Submit for Approval"}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
