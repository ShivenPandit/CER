import React, { useRef, useState, useMemo } from "react";
import {
  Paperclip,
  Upload,
  FileText,
  Trash2,
  Download,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  FileSpreadsheet,
  FileImage,
  File,
  Loader2,
  HardDrive,
} from "lucide-react";
import { ICERAttachment } from "../../models/AttachmentModel";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_SIZE_BYTES,
  formatBytes,
  validateBatchAttachments,
  getFileExtension,
} from "../../utils/attachmentValidation";

interface IAttachmentSectionProps {
  attachments: ICERAttachment[];
  onAddAttachment: (attachment: ICERAttachment) => void;
  onDeleteAttachment: (id: string) => void;
  isReadOnly?: boolean;
  cerprno: string;
  userName: string;
  onUploadingChange?: (isUploading: boolean) => void;
}

export const AttachmentSection: React.FC<IAttachmentSectionProps> = ({
  attachments,
  onAddAttachment,
  onDeleteAttachment,
  isReadOnly = false,
  cerprno,
  userName,
  onUploadingChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  // Calculate current usage and percentage
  const currentTotalBytes = useMemo(() => {
    return attachments.reduce((sum, att) => sum + (att.size || 0), 0);
  }, [attachments]);

  const usagePercent = Math.min(100, Math.round((currentTotalBytes / MAX_TOTAL_SIZE_BYTES) * 100));
  const remainingBytes = Math.max(0, MAX_TOTAL_SIZE_BYTES - currentTotalBytes);

  // Determine progress bar and badge color
  const statusColor = useMemo(() => {
    if (usagePercent >= 95) {
      return {
        bar: "bg-rose-500",
        text: "text-rose-700",
        bg: "bg-rose-50 border-rose-200",
      };
    }
    if (usagePercent >= 75) {
      return {
        bar: "bg-amber-500",
        text: "text-amber-700",
        bg: "bg-amber-50 border-amber-200",
      };
    }
    return {
      bar: "bg-blue-600",
      text: "text-blue-700",
      bg: "bg-blue-50 border-blue-200",
    };
  }, [usagePercent]);

  // Process incoming files from either file input or drag-and-drop
  const processFiles = (fileList: FileList | File[]) => {
    const rawFiles: File[] = Array.from(fileList);
    if (rawFiles.length === 0) return;

    // Validate incoming batch against current attachments
    const { accepted, rejected } = validateBatchAttachments(rawFiles, attachments);

    // Collect errors for inline display
    if (rejected.length > 0) {
      const errorMsgs = rejected.map((r) => r.error);
      setValidationErrors((prev) => [...prev, ...errorMsgs]);
    }

    if (accepted.length === 0) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    // Set processing state
    setIsProcessing(true);
    onUploadingChange?.(true);

    let processedCount = 0;
    accepted.forEach(({ file }) => {
      const reader = new FileReader();

      reader.onload = () => {
        const newAttachment: ICERAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          cerprno: cerprno || "TEMP",
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          data_url: reader.result as string,
          uploaded_by: userName || "Initiator",
          uploaded_date: new Date().toISOString(),
        };

        onAddAttachment(newAttachment);
        processedCount++;

        if (processedCount === accepted.length) {
          setIsProcessing(false);
          onUploadingChange?.(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      };

      reader.onerror = () => {
        processedCount++;
        setValidationErrors((prev) => [
          ...prev,
          `Failed to read file '${file.name}'. Please try uploading it again.`,
        ]);
        if (processedCount === accepted.length) {
          setIsProcessing(false);
          onUploadingChange?.(false);
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        }
      };

      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      processFiles(e.target.files);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isReadOnly && !isDragOver) {
      setIsDragOver(true);
    }
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (!isReadOnly && e.dataTransfer.files) {
      processFiles(e.dataTransfer.files);
    }
  };

  const handleDownload = (att: ICERAttachment) => {
    if (att.data_url) {
      const link = document.createElement("a");
      link.href = att.data_url;
      link.download = att.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleDelete = (id: string) => {
    onDeleteAttachment(id);
    // Clearing any capacity warning when an attachment is removed
    if (validationErrors.some((e) => e.includes("exceeds the remaining total capacity"))) {
      setValidationErrors((prev) =>
        prev.filter((e) => !e.includes("exceeds the remaining total capacity"))
      );
    }
  };

  const dismissErrors = () => {
    setValidationErrors([]);
  };

  // Helper to render type-specific file icon
  const renderFileIcon = (fileName: string) => {
    const ext = getFileExtension(fileName);
    if (ext === ".pdf") {
      return (
        <div className="p-2 rounded-lg bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
          <FileText className="w-4 h-4" />
        </div>
      );
    }
    if (ext === ".xls" || ext === ".xlsx") {
      return (
        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-200 shrink-0">
          <FileSpreadsheet className="w-4 h-4" />
        </div>
      );
    }
    if (ext === ".doc" || ext === ".docx") {
      return (
        <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-200 shrink-0">
          <File className="w-4 h-4" />
        </div>
      );
    }
    if ([".png", ".jpg", ".jpeg", ".gif", ".webp"].indexOf(ext) !== -1) {
      return (
        <div className="p-2 rounded-lg bg-purple-50 text-purple-600 border border-purple-200 shrink-0">
          <FileImage className="w-4 h-4" />
        </div>
      );
    }
    return (
      <div className="p-2 rounded-lg bg-slate-100 text-slate-600 border border-slate-200 shrink-0">
        <FileText className="w-4 h-4" />
      </div>
    );
  };

  return (
    <div
      className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 shadow-subtle space-y-5"
      id="section-supporting-documents"
    >
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 shrink-0">
            <Paperclip className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">
              Section H — Supporting documents and attachments
            </h3>
            <p className="text-xs text-slate-500">
              Technical datasheets, vendor quotes, reservoir models, and partner approvals
            </p>
          </div>
        </div>

        {/* Limits & Capacity Pill */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[11px] font-semibold text-slate-600 bg-slate-100/90 border border-slate-200 px-2.5 py-1 rounded-full whitespace-nowrap">
            Max 10 MB/file · Max 20 MB total
          </span>
          <span
            className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${statusColor.bg} ${statusColor.text}`}
          >
            {formatBytes(currentTotalBytes)} / 20 MB used
          </span>
        </div>
      </div>

      {/* Usage Indicator & Progress Bar */}
      <div className="bg-slate-50/70 border border-slate-200/70 rounded-xl p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-1.5 font-medium">
            <HardDrive className="w-3.5 h-3.5 text-slate-500" />
            <span>Attachment Storage Capacity</span>
          </div>
          <div className="font-medium text-slate-700">
            <span className="font-bold text-slate-900">{formatBytes(currentTotalBytes)}</span> of{" "}
            <span className="font-bold text-slate-900">20 MB</span> used ({usagePercent}%) •{" "}
            <span className="text-slate-500 font-normal">{formatBytes(remainingBytes)} remaining</span>
          </div>
        </div>

        {/* Visual Progress Bar */}
        <div className="w-full bg-slate-200/80 rounded-full h-2 overflow-hidden">
          <div
            className={`h-full transition-all duration-300 rounded-full ${statusColor.bar}`}
            style={{ width: `${usagePercent}%` }}
          />
        </div>
      </div>

      {/* Inline Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1.5 relative">
          <div className="flex items-center justify-between font-bold text-rose-800">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>Attachment Validation Notice</span>
            </div>
            <button
              type="button"
              onClick={dismissErrors}
              className="text-rose-500 hover:text-rose-800 p-0.5 rounded transition-colors text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
          <ul className="list-disc list-inside space-y-1 text-rose-700 pt-1">
            {validationErrors.map((err, idx) => (
              <li key={idx} className="leading-snug">
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Dropzone Area */}
      {!isReadOnly && (
        <div
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all group ${
            isDragOver
              ? "border-blue-500 bg-blue-50/50 scale-[1.005]"
              : "border-slate-300 hover:border-blue-500 bg-slate-50/50 hover:bg-blue-50/20"
          }`}
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.gif,.webp"
            className="hidden"
          />

          <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-slate-200 flex items-center justify-center text-blue-600 mx-auto group-hover:scale-105 transition-transform">
            {isProcessing ? (
              <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
            ) : (
              <Upload className="w-5 h-5" />
            )}
          </div>

          <p className="text-xs font-semibold text-slate-800 mt-3">
            {isProcessing ? "Processing attachments..." : "Click to browse or drag and drop supporting files"}
          </p>

          <p className="text-[11px] text-slate-500 mt-1">
            Supports <strong className="text-slate-700">PDF, Word (.doc, .docx), Excel (.xls, .xlsx), Images (.png, .jpg, .webp)</strong>
          </p>

          <div className="flex items-center justify-center gap-3 text-[11px] text-slate-400 mt-1.5 font-medium">
            <span>• Max 10 MB per individual file</span>
            <span>• Max 20 MB total combined capacity</span>
          </div>
        </div>
      )}

      {/* Attached Files List */}
      <div className="space-y-2.5 text-xs">
        <div className="flex items-center justify-between text-slate-500 font-semibold px-1">
          <span>Attached Documents ({attachments.length})</span>
          {attachments.length > 0 && (
            <span>Total: {formatBytes(currentTotalBytes)}</span>
          )}
        </div>

        {attachments.length === 0 ? (
          <div className="text-center py-6 px-4 rounded-xl border border-dashed border-slate-200 bg-slate-50/40 text-slate-400">
            <p className="italic">No documents attached yet.</p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Attach technical specifications, partner approval letters, or vendor quotes if applicable.
            </p>
          </div>
        ) : (
          attachments.map((att) => (
            <div
              key={att.id}
              className="p-3 sm:p-3.5 rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50/60 shadow-2xs flex items-center justify-between gap-3 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                {renderFileIcon(att.name)}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg">
                      {att.name}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      Ready
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    <span className="font-medium text-slate-700">{formatBytes(att.size)}</span> • Uploaded by{" "}
                    {att.uploaded_by} on {new Date(att.uploaded_date).toLocaleDateString("en-GB")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(att)}
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                  title="Download / View Attachment"
                  aria-label="Download Attachment"
                >
                  <Download className="w-4 h-4" />
                </button>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => handleDelete(att.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                    title="Remove Attachment"
                    aria-label="Remove Attachment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
