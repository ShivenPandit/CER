import React, { useRef, useState, useMemo } from "react";
import {
  Paperclip,
  Upload,
  FileText,
  Trash2,
  Download,
  CheckCircle2,
  AlertTriangle,
  FileSpreadsheet,
  FileImage,
  File,
  Loader2,
  HardDrive,
} from "lucide-react";
import { ICERAttachment } from "../../models/AttachmentModel";
import {
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
      bar: "bg-[#012964]",
      text: "text-[#012964]",
      bg: "bg-[#012964]/5 border-[#012964]/20",
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
      className="bg-white rounded-xl border border-slate-200/80 p-4 sm:p-5 shadow-xs space-y-3.5"
      id="section-supporting-documents"
    >
      {/* Section Header */}
      <div className="flex items-center justify-between pb-2.5 border-b border-slate-100 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Paperclip className="w-4 h-4 text-[#012964]" />
          <h3 className="font-bold text-slate-800 text-xs tracking-wide uppercase">
            Section H — Supporting Documents
          </h3>
        </div>

        {/* Limits & Capacity Badge */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-slate-500 font-medium">
            Max 10 MB/file · 20 MB total
          </span>
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded border whitespace-nowrap ${statusColor.bg} ${statusColor.text}`}
          >
            {formatBytes(currentTotalBytes)} / 20 MB
          </span>
        </div>
      </div>

      {/* Visual Capacity Progress Line */}
      <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
        <div
          className={`h-full transition-all duration-300 rounded-full ${statusColor.bar}`}
          style={{ width: `${usagePercent}%` }}
        />
      </div>

      {/* Inline Validation Errors */}
      {validationErrors.length > 0 && (
        <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-900 text-xs space-y-1 relative">
          <div className="flex items-center justify-between font-bold text-rose-800">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Attachment Notice</span>
            </div>
            <button
              type="button"
              onClick={dismissErrors}
              className="text-rose-500 hover:text-rose-800 p-0.5 rounded transition-colors text-xs font-semibold"
            >
              Dismiss
            </button>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-rose-700 pt-0.5">
            {validationErrors.map((err, idx) => (
              <li key={idx} className="leading-snug">
                {err}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Compact Dropzone Area */}
      {!isReadOnly && (
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`flex flex-col sm:flex-row items-center justify-between gap-3 p-3 sm:p-3.5 rounded-lg border border-dashed transition-colors ${
            isDragOver
              ? "border-[#012964] bg-[#012964]/5"
              : "border-slate-300 hover:border-[#012964]/50 bg-slate-50/40"
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

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="p-2 rounded-lg bg-white border border-slate-200 text-[#012964] shrink-0">
              {isProcessing ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#012964]" />
              ) : (
                <Upload className="w-4 h-4" />
              )}
            </div>
            <div>
              <p className="text-xs font-semibold text-slate-800">
                {isProcessing ? "Processing attachments..." : "Drag & drop files or browse"}
              </p>
              <p className="text-[11px] text-slate-500">
                Supports PDF, Word, Excel, and Images up to 10 MB per file
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isProcessing || isReadOnly}
            className="px-3 py-1.5 text-xs font-semibold text-[#012964] bg-white border border-slate-300 hover:border-[#012964] hover:bg-slate-50 rounded-lg transition-colors shrink-0 shadow-2xs cursor-pointer disabled:opacity-50"
          >
            Browse Files
          </button>
        </div>
      )}

      {/* Attached Files List */}
      <div className="space-y-2 text-xs">
        <div className="flex items-center justify-between text-slate-500 font-semibold px-1">
          <span>Attached Documents ({attachments.length})</span>
          {attachments.length > 0 && (
            <span>Total: {formatBytes(currentTotalBytes)}</span>
          )}
        </div>

        {attachments.length === 0 ? (
          <div className="text-center py-4 px-3 rounded-lg border border-dashed border-slate-200 bg-slate-50/30 text-slate-400">
            <p className="italic text-xs">No documents attached yet.</p>
          </div>
        ) : (
          attachments.map((att) => (
            <div
              key={att.id}
              className="p-2.5 sm:p-3 rounded-lg border border-slate-200 bg-white hover:bg-slate-50/50 flex items-center justify-between gap-3 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                {renderFileIcon(att.name)}
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-slate-900 truncate max-w-[200px] sm:max-w-xs md:max-w-md lg:max-w-lg">
                      {att.name}
                    </p>
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                      <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600 shrink-0" />
                      Ready
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">
                    <span className="font-medium text-slate-600">{formatBytes(att.size)}</span> • Uploaded by{" "}
                    {att.uploaded_by} on {new Date(att.uploaded_date).toLocaleDateString("en-GB")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(att)}
                  className="p-1.5 text-slate-500 hover:text-[#012964] hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                  title="Download / View Attachment"
                  aria-label="Download Attachment"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => handleDelete(att.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors cursor-pointer"
                    title="Remove Attachment"
                    aria-label="Remove Attachment"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
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
