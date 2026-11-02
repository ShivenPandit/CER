import React, { useState, useEffect } from "react";
import { Search, Save, Send, ArrowLeft, CheckCircle2, AlertCircle, ShieldAlert, RotateCcw, Lock, History } from "lucide-react";
import { ICERProposal, IFieldChoices } from "../../models/CERModel";
import { IAppUser } from "../../models/UserModel";
import { ICERAttachment } from "../../models/AttachmentModel";
import { ICERDataService } from "../../services/ICERDataService";
import { ProjectDetailsSection } from '../CreateCER/ProjectDetailsSection';
import { FinancialBenefitsSection } from '../CreateCER/FinancialBenefitsSection';
import { BudgetJVSection } from '../CreateCER/BudgetJVSection';
import { PhasingSection } from '../CreateCER/PhasingSection';
import { CostBreakdownSection } from '../CreateCER/CostBreakdownSection';
import { RemarksSection } from '../CreateCER/RemarksSection';
import { AttachmentSection } from '../CreateCER/AttachmentSection';
import { CategoryDefinitionSection } from '../Shared/CategoryDefinitionSection';
import { FormErrors, validateField, validateAll } from "../../utils/cerValidation";
import { sanitizeSingleLineText, sanitizeMultiLineText, sanitizeProposalPayload } from "../../utils/sanitizationUtils";
import { MAX_TOTAL_SIZE_BYTES, formatBytes } from "../../utils/attachmentValidation";
import { PermissionService } from "../../services/PermissionService";
import { getCurrentFiscalYearPhasingLabels } from "../../utils/dateUtils";

interface IChangeCERViewProps {
  dataService: ICERDataService;
  currentUser: IAppUser;
  initialProposalId?: string;
  onCancel: () => void;
  onSuccess: (cerprno: string) => void;
  fieldChoices?: IFieldChoices;
}

export const ChangeCERView: React.FC<IChangeCERViewProps> = ({
  dataService,
  currentUser,
  initialProposalId,
  onCancel,
  onSuccess,
  fieldChoices,
}) => {
  const [proposalNumberInput, setProposalNumberInput] = useState(initialProposalId || "");
  const [formData, setFormData] = useState<ICERProposal | null>(null);
  const [originalProposal, setOriginalProposal] = useState<ICERProposal | null>(null);
  const [attachments, setAttachments] = useState<ICERAttachment[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [isCheckingCerNo, setIsCheckingCerNo] = useState(false);
  const cerNoDebounceTimer = React.useRef<any>(null);

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
        // Enforce ownership and editable status check
        const authCheck = PermissionService.canEditCER(found, currentUser);
        if (!authCheck.allowed) {
          setErrorMessage(authCheck.reason || "You are not authorized to modify this CER proposal.");
          setFormData(null);
          setOriginalProposal(null);
          return;
        }

        // Ensure defaults for new fields if not present
        const defaultPhasing = getCurrentFiscalYearPhasingLabels(
          found.created_date ? new Date(found.created_date) : new Date()
        );

        let initialProposalNo = found.proposal_no || found.cerprno || "";
        if (found.status === "Approved") {
          const match = initialProposalNo.match(/-R(\d+)$/i);
          if (match) {
            const nextRev = parseInt(match[1], 10) + 1;
            initialProposalNo = initialProposalNo.replace(/-R\d+$/i, `-R${nextRev}`);
          } else {
            initialProposalNo = `${initialProposalNo}-R1`;
          }
        }

        const normalized: ICERProposal = {
          ...found,
          proposal_no: initialProposalNo,
          payback_quarters: found.payback_quarters !== undefined && found.payback_quarters !== null ? found.payback_quarters : 0,
          jv_recoverable: found.jv_recoverable || "No",
          ph_till_label: found.ph_till_label || defaultPhasing.ph_till_label,
          ph_fy_label: found.ph_fy_label || defaultPhasing.ph_fy_label,
          ph_beyond_label: found.ph_beyond_label || defaultPhasing.ph_beyond_label,
        };
        setFormData(normalized);
        setOriginalProposal({ ...found });

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

  const checkCerNoUniqueness = React.useCallback(
    async (cerNo: string) => {
      const trimmed = (cerNo || "").trim();
      if (!trimmed) return;
      const originalPropNo = (originalProposal?.proposal_no || originalProposal?.cerprno || "").trim().toUpperCase();
      if (trimmed.toUpperCase() === originalPropNo) {
        setErrors((prev) => {
          const copy = { ...prev };
          if (copy.proposal_no && copy.proposal_no.includes("already exists")) delete copy.proposal_no;
          if (copy.cerprno && copy.cerprno.includes("already exists")) delete copy.cerprno;
          return copy;
        });
        return;
      }

      setIsCheckingCerNo(true);
      try {
        const existing = await dataService.getProposalByNumber(trimmed);
        if (existing && existing.id !== originalProposal?.id) {
          setErrors((prev) => ({
            ...prev,
            proposal_no: `CER Proposal No. '${trimmed}' already exists on another project. Please enter a unique number.`,
            cerprno: `CER Proposal No. '${trimmed}' already exists on another project. Please enter a unique number.`,
          }));
          setTouched((prev) => ({ ...prev, proposal_no: true, cerprno: true }));
        } else {
          setErrors((prev) => {
            const copy = { ...prev };
            if (copy.proposal_no && copy.proposal_no.includes("already exists")) delete copy.proposal_no;
            if (copy.cerprno && copy.cerprno.includes("already exists")) delete copy.cerprno;
            return copy;
          });
        }
      } catch {
        // non-blocking
      } finally {
        setIsCheckingCerNo(false);
      }
    },
    [dataService, originalProposal]
  );

  const handleFieldChange = (field: keyof ICERProposal, value: any) => {
    if (!formData) return;
    setFormData((prev) => {
      if (!prev) return null;
      const updated = { ...prev, [field]: value };

      // Auto-fetch total Capex ($mm) into Amount of CER
      if (field === "capex_till" || field === "capex_fy" || field === "capex_beyond") {
        const cTill = Number(field === "capex_till" ? value : prev.capex_till || 0);
        const cFy = Number(field === "capex_fy" ? value : prev.capex_fy || 0);
        const cBeyond = Number(field === "capex_beyond" ? value : prev.capex_beyond || 0);
        const capexTotal = Math.round((cTill + cFy + cBeyond) * 10000) / 10000;
        updated.amount = capexTotal;
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

      // Re-validate amount when capex changes
      if (field === "capex_till" || field === "capex_fy" || field === "capex_beyond") {
        const amountErr = validateField("amount", updated.amount, updated, false);
        setErrors((prevErrors) => {
          const newErrors = { ...prevErrors };
          if (amountErr) {
            newErrors.amount = amountErr;
          } else {
            delete newErrors.amount;
          }
          return newErrors;
        });
      }

      return updated;
    });

    if (field === "cerprno" || field === "proposal_no") {
      if (cerNoDebounceTimer.current) clearTimeout(cerNoDebounceTimer.current);
      cerNoDebounceTimer.current = setTimeout(() => {
        void checkCerNoUniqueness(value);
      }, 400);
    }
  };

  const handleFieldBlur = (field: keyof ICERProposal) => {
    if (!formData) return;

    let currentVal = formData[field];
    const isSingleLine = ["pr_name", "proposal_no", "cerprno", "owname"].indexOf(field as string) !== -1;
    const isMultiLine = ["object", "cost_assumptions", "reason", "jv_reason", "remarks", "remarks_jv"].indexOf(field as string) !== -1;

    let updatedForm = { ...formData };
    if (typeof currentVal === "string") {
      if (isSingleLine) {
        const cleaned = sanitizeSingleLineText(currentVal);
        if (cleaned !== currentVal) {
          currentVal = cleaned;
          updatedForm = { ...updatedForm, [field]: cleaned };
          setFormData((prev) => prev ? ({ ...prev, [field]: cleaned }) : prev);
        }
      } else if (isMultiLine) {
        const cleaned = sanitizeMultiLineText(currentVal);
        if (cleaned !== currentVal) {
          currentVal = cleaned;
          updatedForm = { ...updatedForm, [field]: cleaned };
          setFormData((prev) => prev ? ({ ...prev, [field]: cleaned }) : prev);
        }
      }
    }

    setTouched((prev) => ({ ...prev, [field]: true }));
    const error = validateField(field, currentVal, updatedForm, false);
    setErrors((prev) => {
      const updated = { ...prev };
      if (error) {
        updated[field] = error;
      } else {
        delete updated[field];
      }
      return updated;
    });

    if (field === "cerprno" || field === "proposal_no") {
      void checkCerNoUniqueness(updatedForm.proposal_no || updatedForm.cerprno);
    }

    if (field === "capex_till" || field === "capex_fy" || field === "capex_beyond") {
      setTouched((prev) => ({ ...prev, amount: true }));
      const amountError = validateField("amount", formData.amount, formData, false);
      setErrors((prev) => {
        const updated = { ...prev };
        if (amountError) {
          updated.amount = amountError;
        } else {
          delete updated.amount;
        }
        return updated;
      });
    }
  };

  const handleAddAttachment = async (att: ICERAttachment) => {
    if (!formData) return;
    try {
      await dataService.addAttachment({ ...att, cerprno: formData.cerprno });
      const refreshed = await dataService.getAttachments(formData.cerprno, true);
      setAttachments(refreshed);
    } catch (e: any) {
      console.error("[ChangeCERView] Failed to add attachment:", e);
      setAttachments((prev) => [...prev, att]);
    }
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

  const handleSaveChange = async (isDraft: boolean = false) => {
    if (!formData) return;
    setErrorMessage(null);

    if (isUploadingAttachments) {
      setErrorMessage("Please wait for all attachments to finish processing before saving.");
      return;
    }

    const totalAttachmentBytes = attachments.reduce((sum, a) => sum + (a.size || 0), 0);
    if (totalAttachmentBytes > MAX_TOTAL_SIZE_BYTES) {
      setErrorMessage(
        `Total attachment size (${formatBytes(totalAttachmentBytes)}) exceeds the allowed 20 MB limit.`
      );
      return;
    }

    // Normalize and sanitize payload prior to validation and persistence
    const sanitizedData = sanitizeProposalPayload(formData);
    setFormData(sanitizedData);

    // Validate using modern rules
    const { errors: validationErrors, isValid, firstErrorField } = validateAll(sanitizedData, isDraft);

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

    // Verify CER Proposal No. uniqueness before saving
    const trimmedNo = (sanitizedData.proposal_no || sanitizedData.cerprno || "").trim();
    if (!trimmedNo) {
      setErrors((prev) => ({ ...prev, proposal_no: "CER Proposal Number is required." }));
      setTouched((prev) => ({ ...prev, proposal_no: true }));
      setErrorMessage("Make an entry in mandatory field 'CER Proposal No.'");
      scrollToFirstError("proposal_no");
      return;
    }

    const originalPropNo = (originalProposal?.proposal_no || originalProposal?.cerprno || "").trim().toUpperCase();
    const isApprovedOriginal = originalProposal?.status === "Approved";

    if (isApprovedOriginal && trimmedNo.toUpperCase() === originalPropNo) {
      const prevNo = originalProposal?.proposal_no || originalProposal?.cerprno;
      const msg = `Every post-approval resubmission must have a new, distinct CER Proposal No. (different from previous '${prevNo}'). Please enter a new Proposal No. (e.g. ${prevNo}-R1).`;
      setErrors((prev) => ({
        ...prev,
        proposal_no: msg,
      }));
      setTouched((prev) => ({ ...prev, proposal_no: true }));
      setErrorMessage(msg);
      scrollToFirstError("proposal_no");
      return;
    }

    if (trimmedNo.toUpperCase() !== originalPropNo) {
      try {
        const existing = await dataService.getProposalByNumber(trimmedNo);
        if (existing && existing.id !== originalProposal?.id) {
          setErrors((prev) => ({
            ...prev,
            proposal_no: `CER Proposal No. '${trimmedNo}' already exists on another project. Please enter a unique number.`,
          }));
          setTouched((prev) => ({ ...prev, proposal_no: true }));
          setErrorMessage(`CER Proposal No. '${trimmedNo}' already exists on another project. Please choose a unique proposal number.`);
          scrollToFirstError("proposal_no");
          return;
        }
      } catch {
        // non-blocking
      }
    }

    setIsSubmitting(true);
    try {
      const updatedPayload: ICERProposal = {
        ...sanitizedData,
        proposal_no: trimmedNo,
        cerprno: originalProposal ? originalProposal.cerprno : sanitizedData.cerprno,
        cer_proposal_id: (originalProposal && (originalProposal.cer_proposal_id || originalProposal.cerprno)) || sanitizedData.cer_proposal_id || sanitizedData.cerprno,
        status: isDraft ? "Draft" : "In Approval",
        current_level: 1,
      };

      const result = await dataService.updateProposal(updatedPayload, {
        name: currentUser.name,
        email: currentUser.email,
      });

      // Save any remaining un-uploaded attachments linked to proposal
      const pendingAttachments = attachments.filter(
        (att) => att.data_url && att.data_url.startsWith("data:") && (!att.id || att.id.startsWith("att-"))
      );
      if (pendingAttachments.length > 0) {
        await Promise.all(
          pendingAttachments.map((att) =>
            dataService.addAttachment({ ...att, cerprno: formData.cerprno })
          )
        );
      }

      setSuccessNotice(
        isDraft
          ? "CER Proposal draft saved successfully."
          : isApprovedOriginal
          ? "Post-approval amendment submitted successfully. The previous approved version has been safely archived to CER History."
          : `CER Proposal No. has been changed and sent for approval (${result.auditRowsCount} field changes recorded in audit trail).`
      );
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
    <div className="cer-change-scope space-y-2.5 sm:space-y-3 pb-28">
      {/* Page-Scoped Brand Colour Tokens & Compact Enterprise Style */}
      <style>{`
        .cer-change-scope {
          --cer-brand-blue: #012964;
          --cer-brand-green: #66CC33;
        }

        .cer-change-scope .cer-btn-primary {
          background-color: var(--cer-brand-blue) !important;
          color: #ffffff !important;
        }
        .cer-change-scope .cer-btn-primary:hover:not(:disabled) {
          opacity: 0.92 !important;
        }

        .cer-change-scope .cer-text-blue {
          color: var(--cer-brand-blue) !important;
        }

        .cer-change-scope input:focus,
        .cer-change-scope select:focus,
        .cer-change-scope textarea:focus {
          outline: none !important;
          border-color: var(--cer-brand-blue) !important;
          box-shadow: 0 0 0 2px rgba(1, 41, 100, 0.15) !important;
        }

        .sp-skipToContent:not(:focus):not(:focus-within),
        #sp-skipToContent:not(:focus):not(:focus-within) {
          position: absolute !important;
          top: -9999px !important;
          left: -9999px !important;
          display: none !important;
          visibility: hidden !important;
          opacity: 0 !important;
        }
      `}</style>

      {/* Compact Sticky Header with Title and Proposal Lookup */}
      <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 bg-white/95 backdrop-blur-md px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-xl border border-slate-200/90 shadow-xs">
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors shrink-0 cursor-pointer"
            title="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 flex-wrap min-w-0">
            <h2 className="text-lg sm:text-[19px] font-bold text-slate-900 tracking-tight whitespace-nowrap">
              {originalProposal?.status === "Approved"
                ? "Resubmit Capital Expenditure Request"
                : originalProposal?.status === "Revised"
                ? "Revise & Resubmit CER Proposal"
                : "Edit Capital Expenditure Request"}
            </h2>
            {originalProposal?.status === "Approved" ? (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-[#012964] border border-blue-200">
                Post-Approval Resubmit
              </span>
            ) : originalProposal?.status === "Revised" ? (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                Rework Mode
              </span>
            ) : (
              <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Draft Mode
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2.5 ml-auto flex-wrap">
          {formData && (formData.cer_proposal_id || formData.cerprno) ? (
            <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200 text-xs shrink-0 shadow-2xs">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              <span className="font-mono font-bold text-[#012964] text-xs sm:text-[13px]">
                {formData.cer_proposal_id || formData.cerprno}
              </span>
              <span className="text-xs text-slate-400 font-medium hidden md:inline">
                (System generated)
              </span>
            </div>
          ) : !initialProposalId ? (
            /* Fallback Proposal Number Search Box only if navigated without initial proposal ID */
            <form onSubmit={handleLookupSubmit} className="flex items-center gap-2">
              <div className="relative">
                <input
                  type="text"
                  value={proposalNumberInput}
                  onChange={(e) => setProposalNumberInput(e.target.value)}
                  aria-label="CER Proposal ID or No"
                  placeholder="Enter CER Proposal ID..."
                  className="w-48 sm:w-56 h-9 px-3 bg-white border border-slate-200 hover:border-slate-300 rounded-lg text-sm font-mono font-semibold text-slate-900 focus:outline-none transition-all"
                />
              </div>
              <button
                type="submit"
                disabled={isLoading}
                className="cer-btn-primary flex items-center gap-1.5 h-9 px-3.5 text-[13px] sm:text-sm font-semibold rounded-lg shadow-xs transition-colors cursor-pointer disabled:opacity-50"
              >
                <Search className="w-3.5 h-3.5" />
                <span>{isLoading ? "Searching..." : "Retrieve"}</span>
              </button>
            </form>
          ) : null}
        </div>
      </div>

      {/* Mandatory Validation Error / Notice as required by FR-02 */}
      {errorMessage && (
        <div className="p-3 sm:p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5 animate-shake">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
          <span className="font-semibold">{errorMessage}</span>
        </div>
      )}

      {successNotice && (
        <div className="p-3 sm:p-3.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2.5">
          <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
          <span className="font-semibold">{successNotice}</span>
        </div>
      )}

      {/* Loaded Form */}
      {formData && (
        <>
          {/* Post-Approval Resubmission Banner */}
          {originalProposal?.status === "Approved" && (
            <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200/90 text-blue-950 text-xs sm:text-[13px] flex items-start gap-3 shadow-2xs">
              <History className="w-5 h-5 text-[#012964] shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-[#012964] text-sm">Post-Approval Resubmission</span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-[#012964]/10 text-[#012964]">
                    Archival to CERProposalsHistory
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  This proposal was previously approved. You are submitting an amended version.
                  Enter a new, distinct <strong>CER Proposal No.</strong> below (e.g. adding <code>-R1</code>).
                  Upon submission, the previous approved snapshot will be archived in <strong>CER History</strong>,
                  and this updated request will re-enter the sequential workflow at Level 1.
                </p>
              </div>
            </div>
          )}

          {/* Sent Back for Revision Banner */}
          {originalProposal?.status === "Revised" && (
            <div className="p-4 rounded-xl bg-purple-50/80 border border-purple-200/90 text-purple-950 text-xs sm:text-[13px] flex items-start gap-3 shadow-2xs">
              <RotateCcw className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-purple-900 text-sm">Proposal Sent Back for Revision</span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-100 text-purple-800">
                    Rework Required
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  This proposal was sent back by an approver for rework. Make any necessary updates, add or replace attachments, and click &ldquo;Save Changes &amp; Re-trigger&rdquo; below to restart the approval sequence from Level 1.
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
            isResubmitMode={originalProposal?.status === "Approved"}
            previousProposalNo={originalProposal?.proposal_no || originalProposal?.cerprno}
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

          {/* Section C — Expenditure phasing */}
          <PhasingSection
            formData={formData}
            onChange={handleFieldChange}
            onBlur={handleFieldBlur}
            errors={errors}
            touched={touched}
          />

          {/* Section D — CAPEX cost estimates basis */}
          <CostBreakdownSection
            formData={formData}
            onChange={handleFieldChange}
            onBlur={handleFieldBlur}
            errors={errors}
            touched={touched}
          />

          {/* Section E — Corporate budget & Section F — Joint venture details */}
          <BudgetJVSection
            formData={formData}
            onChange={handleFieldChange}
            onBlur={handleFieldBlur}
            errors={errors}
            touched={touched}
            fieldChoices={fieldChoices}
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

          {/* Sticky Bottom Actions Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-3 sm:px-5 lg:px-6 2xl:px-8 py-2 sm:py-2.5 z-30 shadow-xs">
            <div className="w-full flex items-center justify-end gap-2 sm:gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting || isUploadingAttachments}
                className="px-4 py-2 text-[13px] sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              {/* Save Draft button for Draft OR Post-Approval Resubmit */}
              {(formData.status === "Draft" || originalProposal?.status === "Approved") && (
                <button
                  type="button"
                  onClick={() => handleSaveChange(true)}
                  disabled={isSubmitting || isUploadingAttachments}
                  className="flex items-center gap-1.5 px-4 py-2 text-[13px] sm:text-sm font-medium text-slate-700 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? "Saving Draft..." : "Save Draft"}</span>
                </button>
              )}

              {/* Primary action button */}
              <button
                type="button"
                onClick={() => handleSaveChange(false)}
                disabled={isSubmitting || isUploadingAttachments}
                className="flex items-center gap-2 px-5 py-2 text-[13px] sm:text-sm font-semibold text-white rounded-lg shadow-xs transition-all hover:opacity-95 disabled:opacity-50 cer-btn-primary cursor-pointer"
                style={{ backgroundColor: '#012964' }}
              >
                <Send className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? "Submitting..."
                    : isUploadingAttachments
                    ? "Processing..."
                    : originalProposal?.status === "Approved"
                    ? "Resubmit for Approval"
                    : formData.status === "Draft"
                    ? "Submit for Approval"
                    : "Save Changes & Re-trigger"}
                </span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
