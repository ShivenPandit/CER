import React, { useRef } from "react";
import { Paperclip, Upload, FileText, Trash2, Download, CheckCircle2 } from "lucide-react";
import { ICERAttachment } from "../../models/AttachmentModel";

interface IAttachmentSectionProps {
  attachments: ICERAttachment[];
  onAddAttachment: (attachment: ICERAttachment) => void;
  onDeleteAttachment: (id: string) => void;
  isReadOnly?: boolean;
  cerprno: string;
  userName: string;
}

export const AttachmentSection: React.FC<IAttachmentSectionProps> = ({
  attachments,
  onAddAttachment,
  onDeleteAttachment,
  isReadOnly = false,
  cerprno,
  userName,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];

      // File size validation (max 25MB)
      if (file.size > 25 * 1024 * 1024) {
        alert(`File ${file.name} exceeds the 25MB maximum size limit.`);
        continue;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const newAttachment: ICERAttachment = {
          id: `att-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          cerprno: cerprno || "TEMP",
          name: file.name,
          size: file.size,
          type: file.type || "application/octet-stream",
          data_url: reader.result as string,
          uploaded_by: userName || "Initiator",
          uploaded_date: new Date().toISOString(),
        };
        onAddAttachment(newAttachment);
      };
      reader.readAsDataURL(file);
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleDownload = (att: ICERAttachment) => {
    if (att.data_url) {
      const link = document.createElement("a");
      link.href = att.data_url;
      link.download = att.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      alert(`Downloading ${att.name}...`);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-6 shadow-subtle space-y-5">
      {/* Section Header */}
      <div className="flex items-center justify-between pb-4 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
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
      </div>

      {/* Upload Zone */}
      {!isReadOnly && (
        <div
          onClick={() => fileInputRef.current?.click()}
          className="border border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/60 hover:bg-blue-50/30 rounded-xl p-5 text-center cursor-pointer transition-all group"
        >
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelect}
            multiple
            className="hidden"
          />
          <div className="w-9 h-9 rounded-xl bg-white shadow-sm border border-slate-200 flex items-center justify-center text-blue-600 mx-auto group-hover:scale-105 transition-transform">
            <Upload className="w-4 h-4" />
          </div>
          <p className="text-xs font-semibold text-slate-800 mt-2.5">
            Click to browse or drag and drop supporting files
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Supports PDF, Word (.docx), Excel (.xlsx), Images (up to 25MB each)
          </p>
        </div>
      )}

      {/* Attachments List */}
      <div className="space-y-2 text-xs">
        {attachments.length === 0 ? (
          <p className="text-slate-400 text-center py-4 text-xs italic">
            No documents attached yet.
          </p>
        ) : (
          attachments.map((att) => (
            <div
              key={att.id}
              className="p-3 rounded-xl border border-slate-200/80 bg-slate-50/50 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-600 shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-slate-900 truncate">
                    {att.name}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {formatFileSize(att.size)} • Uploaded by {att.uploaded_by} on{" "}
                    {new Date(att.uploaded_date).toLocaleDateString("en-GB")}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => handleDownload(att)}
                  className="p-1.5 text-slate-500 hover:text-blue-600 hover:bg-white rounded-lg transition-colors"
                  title="Download / View Attachment"
                >
                  <Download className="w-4 h-4" />
                </button>
                {!isReadOnly && (
                  <button
                    type="button"
                    onClick={() => onDeleteAttachment(att.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
                    title="Remove Attachment"
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
