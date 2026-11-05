import React, { useState, useEffect } from "react";
import { Search, Save, Send, ArrowLeft, CheckCircle2, AlertCircle, ShieldAlert, RotateCcw, Lock, History, Loader2 } from "lucide-react";
import { ICERProposal, IFieldChoices } from "../../models/CERModel";
import { IAppUser } from "../../models/UserModel";
import { ICERAttachment } from "../../models/AttachmentModel";
import { ICERDataService } from "../../services/ICERDataService";
import { formatUserFriendlySharePointError } from "../../services/SharePointCERDataService";
import { ProjectDetailsSection } from '../CreateCER/ProjectDetailsSection';
import { FinancialBenefitsSection } from '../CreateCER/FinancialBenefitsSection';
import { BudgetJVSection } from '../CreateCER/BudgetJVSection';
import { PhasingSection } from '../CreateCER/PhasingSection';
import { CostBreakdownSection } from '../CreateCER/CostBreakdownSection';
import { RemarksSection } from '../CreateCER/RemarksSection';
import { AttachmentSection } from '../CreateCER/AttachmentSection';
import { CategoryDefinitionSection } from '../Shared/CategoryDefinitionSection';
import { FormErrors, validateField, validateAll, hasEnteredCostBreakdown } from "../../utils/cerValidation";
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
  const [stagedDeletions, setStagedDeletions] = useState<ICERAttachment[]>([]);
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingAttachments, setIsUploadingAttachments] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [secondaryWarning, setSecondaryWarning] = useState<string | null>(null);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);
  const [submitStageText, setSubmitStageText] = useState<string>("");
  const [isCheckingCerNo, setIsCheckingCerNo] = useState(false);
  const cerNoDebounceTimer = React.useRef<any>(null);
  const initialAttachmentsRef = React.useRef<ICERAttachment[]>([]);

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

        const initialProposalNo = found.proposal_no || found.cerprno || "";

        const rawEngineer = Number(found.engineer || 0);
        const rawSfac = Number(found.s_fac || 0);
        const rawComis = Number(found.comis || 0);
        const rawPreop = Number(found.preop || 0);
        let cleanOthers = Number(found.others || 0);
        const rawTotal = Number(found.total || 0);
        const rawAmount = Number(found.amount || 0);

        // Guard against phantom SharePoint column default (where otherCosts defaults to 1 on unpopulated Section D)
        if (
          cleanOthers === 1 &&
          rawEngineer === 0 &&
          rawSfac === 0 &&
          rawComis === 0 &&
          rawPreop === 0 &&
          (rawTotal === 0 || Math.abs(rawTotal - rawAmount) > 0.01)
        ) {
          cleanOthers = 0;
        }

        const cleanTotal = (cleanOthers === 0 && rawEngineer === 0 && rawSfac === 0 && rawComis === 0 && rawPreop === 0)
          ? 0
          : found.total;

        const prodTotalRaw = Number(found.prod_till || 0) + Number(found.prod_fy || 0) + Number(found.prod_beyond || 0);
        const opexTotalRaw = Number(found.opex_till || 0) + Number(found.opex_fy || 0) + Number(found.opex_beyond || 0);

        const normalized: ICERProposal = {
          ...found,
          currency: "USD",
          cb_currency: "USD",
          engineer: cleanTotal > 0 ? rawEngineer : ("" as any),
          s_fac: cleanTotal > 0 ? rawSfac : ("" as any),
          comis: cleanTotal > 0 ? rawComis : ("" as any),
          preop: cleanTotal > 0 ? rawPreop : ("" as any),
          others: cleanTotal > 0 ? cleanOthers : ("" as any),
          total: cleanTotal > 0 ? cleanTotal : ("" as any),
          prod_till: prodTotalRaw > 0 ? found.prod_till : ("" as any),
          prod_fy: prodTotalRaw > 0 ? found.prod_fy : ("" as any),
          prod_beyond: prodTotalRaw > 0 ? found.prod_beyond : ("" as any),
          opex_till: opexTotalRaw > 0 ? found.opex_till : ("" as any),
          opex_fy: opexTotalRaw > 0 ? found.opex_fy : ("" as any),
          opex_beyond: opexTotalRaw > 0 ? found.opex_beyond : ("" as any),
          ben_npv: found.ben_npv !== undefined && found.ben_npv !== null && Number(found.ben_npv) !== 0 ? found.ben_npv : ("" as any),
          ben_irr: found.ben_irr !== undefined && found.ben_irr !== null && Number(found.ben_irr) !== 0 ? found.ben_irr : ("" as any),
          cb_amnt: found.cb_amnt !== undefined && found.cb_amnt !== null && Number(found.cb_amnt) !== 0 ? found.cb_amnt : ("" as any),
          jv_amnt: found.jv_amnt !== undefined && found.jv_amnt !== null && Number(found.jv_amnt) !== 0 ? found.jv_amnt : ("" as any),
          proposal_no: initialProposalNo,
          payable: found.payable ? String(found.payable).trim().replace(/-/g, " ") : "Payback",
          payback_quarters: found.payback_quarters !== undefined && found.payback_quarters !== null && Number(found.payback_quarters) > 0 ? found.payback_quarters : ("" as any),
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
        const cTillVal = field === "capex_till" ? value : prev.capex_till;
        const cFyVal = field === "capex_fy" ? value : prev.capex_fy;
        const cBeyondVal = field === "capex_beyond" ? value : prev.capex_beyond;
        const hasAnyCapex = (cTillVal !== "" && cTillVal !== undefined && cTillVal !== null) ||
                            (cFyVal !== "" && cFyVal !== undefined && cFyVal !== null) ||
                            (cBeyondVal !== "" && cBeyondVal !== undefined && cBeyondVal !== null);
        const cTill = Number(cTillVal || 0);
        const cFy = Number(cFyVal || 0);
        const cBeyond = Number(cBeyondVal || 0);
        const capexTotal = Math.round((cTill + cFy + cBeyond) * 10000) / 10000;
        updated.amount = hasAnyCapex ? capexTotal : ("" as any);
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

      // Re-validate total (Section D) when Section D fields or capex phasing change
      if (
        ["engineer", "s_fac", "comis", "preop", "others", "capex_till", "capex_fy", "capex_beyond"].indexOf(field as string) !== -1
      ) {
        if (errors.total || errors.cost_mismatch || touched.total) {
          const totalErr = validateField("total", updated.total, updated, false);
          setErrors((prevErrors) => {
            const newErrors = { ...prevErrors };
            if (totalErr) {
              newErrors.total = totalErr;
              newErrors.cost_mismatch = totalErr;
            } else {
              delete newErrors.total;
              delete newErrors.cost_mismatch;
            }
            return newErrors;
          });
        }
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
      if (hasEnteredCostBreakdown(formData)) {
        const totalError = validateField("total", formData.total, formData, false);
        setErrors((prev) => {
          const updated = { ...prev };
          if (totalError) {
            updated.total = totalError;
            updated.cost_mismatch = totalError;
          } else {
            delete updated.total;
            delete updated.cost_mismatch;
          }
          return updated;
        });
      }
    }

    if (["engineer", "s_fac", "comis", "preop", "others"].indexOf(field as string) !== -1) {
      if (hasEnteredCostBreakdown(updatedForm)) {
        setTouched((prev) => ({ ...prev, total: true }));
        const totalError = validateField("total", updatedForm.total, updatedForm, false);
        setErrors((prev) => {
          const updated = { ...prev };
          if (totalError) {
            updated.total = totalError;
            updated.cost_mismatch = totalError;
          } else {
            delete updated.total;
            delete updated.cost_mismatch;
          }
          return updated;
        });
      } else {
        setErrors((prev) => {
          const updated = { ...prev };
          delete updated.total;
          delete updated.cost_mismatch;
          return updated;
        });
      }
    }
  };

  const handleAddAttachment = (att: ICERAttachment) => {
    // Additive upload rule: always append new document, never auto-replace existing
    setAttachments((prev) => [...prev, att]);
  };

  const handleDeleteAttachment = (id: string) => {
    // Stage deletion: do not physically delete from SharePoint until after save succeeds
    const target = attachments.find((a) => a.id === id);
    if (target) {
      setStagedDeletions((prev) => [...prev, target]);
    }
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  const scrollToFirstError = (fieldKey: string) => {
    setTimeout(() => {
      const key = fieldKey === "cost_mismatch" ? "total" : fieldKey;
      const targetElement = document.getElementById(`field-${key}`) || document.getElementById(key);
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
    setSubmitStageText("Saving proposal to SharePoint...");
    setErrorMessage(null);
    setSecondaryWarning(null);
    try {
      const updatedPayload: ICERProposal = {
        ...sanitizedData,
        proposal_no: trimmedNo,
        cerprno: originalProposal ? originalProposal.cerprno : sanitizedData.cerprno,
        cer_proposal_id: (originalProposal && (originalProposal.cer_proposal_id || originalProposal.cerprno)) || sanitizedData.cer_proposal_id || sanitizedData.cerprno,
        status: isDraft ? "Draft" : "In Approval",
        current_level: 1,
      };

      const isApprovedOriginal = Boolean(originalProposal && originalProposal.status === "Approved");
      const removedIds = stagedDeletions.map((d) => String(d.id)).filter(Boolean);

      const result = await dataService.updateProposal(
        updatedPayload,
        {
          name: currentUser.name,
          email: currentUser.email,
        },
        originalProposal || undefined,
        {
          removedAttachmentIds: isApprovedOriginal ? removedIds : undefined,
          snapshotAttachments: isApprovedOriginal ? initialAttachmentsRef.current : undefined,
        }
      );

      // Save any remaining un-uploaded attachments linked to proposal
      const pendingAttachments = attachments.filter(
        (att) => att.data_url && att.data_url.startsWith("data:") && (!att.id || att.id.startsWith("att-"))
      );
      if (pendingAttachments.length > 0) {
        setSubmitStageText("Uploading attachments...");
        await Promise.all(
          pendingAttachments.map((att) =>
            dataService.addAttachment({ ...att, cerprno: formData.cerprno })
          )
        );
      }

      // Execute staged deletions strictly after successful save across all transitions (Draft, Send Back, or Post-Approval Amendment)
      if (!isApprovedOriginal && stagedDeletions.length > 0) {
        setSubmitStageText("Cleaning up obsolete attachments...");
        const deletionErrors: string[] = [];
        for (const del of stagedDeletions) {
          if (del.id && !del.id.startsWith("att-")) {
            try {
              await dataService.deleteAttachment(del.id, {
                cerprno: formData.cerprno,
                serverRelativeUrl: del.server_relative_url || del.data_url,
              });
            } catch (delErr: any) {
              console.warn("[ChangeCERView] Deletion error for obsolete attachment:", delErr);
              deletionErrors.push(del.name || "document");
            }
          }
        }
        if (deletionErrors.length > 0) {
          setSecondaryWarning(
            `Proposal saved successfully, but cleanup of obsolete attachments requires attention: ${deletionErrors.join(", ")}`
          );
        }
      } else if (isApprovedOriginal && stagedDeletions.length > 0) {
        console.log(`[ChangeCERView] Post-approval amendment: ${stagedDeletions.length} obsolete attachments safely preserved in SharePoint library for historical audit (version tagged as V1). Physical deletion bypassed.`);
      }

      setSubmitStageText("Completed!");
      if (result.warnings && result.warnings.length > 0) {
        setSecondaryWarning(result.warnings.join(" "));
      }

      setSuccessNotice(
        isDraft
          ? "CER Proposal draft saved successfully."
          : isApprovedOriginal
          ? "Post-approval amendment submitted successfully. The previous approved version has been safely archived to Proposal History."
          : `CER Proposal No. has been changed and sent for approval (${result.auditRowsCount} field changes recorded in audit trail).`
      );
      setTimeout(() => {
        onSuccess(formData.cerprno);
      }, 200);
    } catch (err: any) {
      setSubmitStageText("");
      const userMsg = formatUserFriendlySharePointError(err, "Failed to update proposal in SharePoint.");
      setErrorMessage(userMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
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

      <div className="cer-change-scope space-y-2.5 sm:space-y-3 pb-12 sm:pb-14">

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
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight whitespace-nowrap">
              {originalProposal?.status === "Approved"
                ? "Resubmit CER"
                : (originalProposal?.status === "Send Back" || originalProposal?.status === "Revised" || originalProposal?.status === "Sent Back")
                ? "Revise CER"
                : "Edit CER"}
            </h2>
            {originalProposal?.status === "Approved" ? (
              <span className="text-xs sm:text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 text-[#012964] border border-blue-200">
                Resubmission
              </span>
            ) : (originalProposal?.status === "Send Back" || originalProposal?.status === "Revised" || originalProposal?.status === "Sent Back") ? (
              <span className="text-xs sm:text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-purple-100 text-purple-800 border border-purple-200">
                Rework
              </span>
            ) : (
              <span className="text-xs sm:text-[13px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                Draft
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

      {secondaryWarning && (
        <div className="p-3 sm:p-3.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-800 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
          <span className="font-semibold">{secondaryWarning}</span>
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
                </div>
                <p className="text-slate-700 leading-relaxed">
                  This proposal was previously approved. You are submitting an amended version.
                  Upon submission, the previous approved snapshot will be archived in <strong>Proposal History</strong>,
                  and this updated request will re-enter the sequential workflow at Level 1.
                </p>
              </div>
            </div>
          )}

          {/* Send Back for Revision Banner */}
          {(originalProposal?.status === "Send Back" || originalProposal?.status === "Revised" || originalProposal?.status === "Sent Back") && (
            <div className="p-4 rounded-xl bg-purple-50/80 border border-purple-200/90 text-purple-950 text-xs sm:text-[13px] flex items-start gap-3 shadow-2xs">
              <RotateCcw className="w-5 h-5 text-purple-600 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-purple-900 text-sm">Proposal Send Back for Revision</span>
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-semibold bg-purple-100 text-purple-800">
                    Rework Required
                  </span>
                </div>
                <p className="text-slate-700 leading-relaxed">
                  This proposal was returned (Send Back) by an approver for rework. Make any necessary updates, add or replace attachments, and click &ldquo;Save Changes &amp; Re-trigger&rdquo; below to restart the approval sequence from Level 1.
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
            <div className="w-full flex items-center justify-between gap-2 sm:gap-2.5 flex-wrap">
              {/* Submission progress indicator */}
              <div className="flex items-center gap-2 min-h-[24px]">
                {isSubmitting && submitStageText && (
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#012964] animate-pulse">
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>{submitStageText}</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2 sm:gap-2.5 ml-auto">
                <button
                  type="button"
                  onClick={onCancel}
                  disabled={isSubmitting || isUploadingAttachments}
                  className="px-4 py-2 text-[13px] sm:text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Cancel
                </button>

                {/* Save Draft button for Draft OR Post-Approval Resubmit */}
                {formData.status === "Draft" && originalProposal?.status !== "Approved" && (
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
                      ? "Resubmit CER"
                      : formData.status === "Draft"
                      ? "Submit Proposal"
                      : "Submit Changes"}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  </>
);
};
