import React, { useState, useEffect } from "react";
import { Search, Save, Send, ArrowLeft, CheckCircle2, AlertCircle, ShieldAlert, RotateCcw } from "lucide-react";
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
import { MAX_TOTAL_SIZE_BYTES, formatBytes } from "../../utils/attachmentValidation";
import { PermissionService } from "../../services/PermissionService";
import { getCurrentFiscalYearPhasingLabels } from "../../utils/dateUtils";

interface IChangeCERViewProps {
  dataService: ICERDataService;
  currentUser: IAppUser;
  initialProposalId?: string;
  onCancel: () => void;
  onSuccess: (cerprno: string) => void;
  onViewRemarksHistory?: (cerprno: string) => void;
  fieldChoices?: IFieldChoices;
}

export const ChangeCERView: React.FC<IChangeCERViewProps> = ({
  dataService,
  currentUser,
  initialProposalId,
  onCancel,
  onSuccess,
  onViewRemarksHistory,
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
        const normalized: ICERProposal = {
          ...found,
          payback_quarters: found.payback_quarters || 4,
          jv_recoverable: found.jv_recoverable || "No",
          ph_till_label: found.ph_till_label || defaultPhasing.ph_till_label,
          ph_fy_label: found.ph_fy_label || defaultPhasing.ph_fy_label,
          ph_beyond_label: found.ph_beyond_label || defaultPhasing.ph_beyond_label,
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

    if (field === "cerprno" || field === "proposal_no") {
      void checkCerNoUniqueness(formData.proposal_no || formData.cerprno);
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

    // Validate using modern rules
    const { errors: validationErrors, isValid, firstErrorField } = validateAll(formData, isDraft);

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
    const trimmedNo = (formData.proposal_no || formData.cerprno || "").trim();
    if (!trimmedNo) {
      setErrors((prev) => ({ ...prev, proposal_no: "CER Proposal Number is required." }));
      setTouched((prev) => ({ ...prev, proposal_no: true }));
      setErrorMessage("Make an entry in mandatory field 'CER Proposal No.'");
      scrollToFirstError("proposal_no");
      return;
    }

    const originalPropNo = (originalProposal?.proposal_no || originalProposal?.cerprno || "").trim().toUpperCase();
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
        ...formData,
        proposal_no: trimmedNo,
        cerprno: originalProposal ? originalProposal.cerprno : formData.cerprno,
        cer_proposal_id: (originalProposal && (originalProposal.cer_proposal_id || originalProposal.cerprno)) || formData.cer_proposal_id || formData.cerprno,
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
              placeholder="Enter CER Proposal ID or No..."
              className="w-56 px-3.5 py-2 bg-white border border-slate-300 hover:border-slate-400 rounded-xl text-xs font-mono font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#012964]/20 focus:border-[#012964] transition-all"
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
                <p className="font-bold">Post-Approval Revision Mode</p>
                <p className="text-amber-800 text-[11px] mt-0.5">
                  This proposal was previously approved. You may edit project parameters and justification; however, the proposal number is locked to preserve referential and audit integrity.
                </p>
              </div>
            </div>
          )}

          {/* Sent Back for Revision Banner */}
          {originalProposal?.status === "Revised" && (
            <div className="p-4 rounded-xl bg-purple-50 border border-purple-200 text-purple-950 text-xs flex items-center gap-2.5">
              <RotateCcw className="w-5 h-5 text-purple-600 shrink-0" />
              <div>
                <p className="font-bold text-purple-900">Proposal Sent Back for Revision</p>
                <p className="text-purple-800 text-[11px] mt-0.5">
                  This proposal was sent back by an approver for rework. Make any necessary updates, add or replace attachments, and click &ldquo;Save Changes &amp; Re-trigger Workflow&rdquo; below to restart the approval sequence from Level 1.
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
            onUploadingChange={setIsUploadingAttachments}
          />

          {/* Critical Client Requirement: Category Definition at the end of the Form */}
          <CategoryDefinitionSection />

          {/* Sticky Bottom Actions Bar */}
          <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 sm:px-5 lg:px-6 2xl:px-8 py-2.5 flex items-center justify-between shadow-elevated z-30">
            <div className="text-xs text-slate-500 hidden md:block">
              Saving will create field-level audit rows and route to Level 1 approver.
            </div>

            <div className="flex items-center gap-2 sm:gap-3 ml-auto flex-wrap justify-end w-full sm:w-auto">
              <button
                type="button"
                onClick={onCancel}
                disabled={isSubmitting || isUploadingAttachments}
                className="px-3 sm:px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
              >
                Cancel
              </button>

              {/* If currently Draft, offer Save Draft button */}
              {formData.status === "Draft" && (
                <button
                  type="button"
                  onClick={() => handleSaveChange(true)}
                  disabled={isSubmitting || isUploadingAttachments}
                  className="flex items-center gap-1.5 px-3 sm:px-4 py-2 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors disabled:opacity-50 cursor-pointer"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? "Saving Draft..." : "Save Draft"}</span>
                </button>
              )}

              {/* Submit for Approval (for Draft) OR Save Changes & Re-trigger Workflow (for other statuses) */}
              <button
                type="button"
                onClick={() => handleSaveChange(false)}
                disabled={isSubmitting || isUploadingAttachments}
                className="flex items-center gap-2 px-4 sm:px-5 py-2 text-xs font-semibold text-white bg-[#012964] hover:bg-[#001f4d] rounded-xl shadow-md shadow-[#012964]/25 transition-all hover:scale-[1.02] disabled:opacity-50 cursor-pointer"
              >
                {formData.status === "Draft" ? (
                  <>
                    <Send className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? "Submitting..."
                        : isUploadingAttachments
                        ? "Processing Attachments..."
                        : "Submit for Approval"}
                    </span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>
                      {isSubmitting
                        ? "Saving & Re-triggering..."
                        : isUploadingAttachments
                        ? "Processing Attachments..."
                        : "Save Changes & Re-trigger Workflow"}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
