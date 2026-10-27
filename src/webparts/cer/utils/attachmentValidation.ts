/**
 * Attachment Validation Utility for SPX CER Management System
 * 
 * Enforces SharePoint-compliant file constraints:
 * - Maximum individual file size: 10 MB (10 * 1024 * 1024 bytes = 10,485,760 B)
 * - Maximum combined total size of all attachments: 20 MB (20 * 1024 * 1024 bytes = 20,971,520 B)
 * - Supported formats: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), Images (.png, .jpg, .jpeg, .gif, .webp)
 */

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB (10,485,760 bytes)
export const MAX_TOTAL_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB (20,971,520 bytes)

export const ALLOWED_EXTENSIONS = [
  ".pdf",
  ".doc",
  ".docx",
  ".xls",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
] as const;

export const ALLOWED_MIME_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/gif",
  "image/webp",
];

export interface IFileValidationResult {
  isValid: boolean;
  error?: string;
  reason?: "SIZE_PER_FILE" | "SIZE_TOTAL" | "UNSUPPORTED_TYPE" | "DUPLICATE";
}

export interface IBatchValidationResult<T> {
  accepted: { file: T; size: number; name: string }[];
  rejected: { file: T; size: number; name: string; error: string; reason: string }[];
  newTotalSize: number;
}

/**
 * Formats a byte number into a clean human-readable string (e.g. "12.4 MB", "450 KB", "0 B").
 */
export function formatBytes(bytes: number): string {
  if (bytes <= 0 || isNaN(bytes)) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Checks if a file's extension or MIME type is supported.
 */
export function isFileTypeAllowed(fileName: string, mimeType?: string): boolean {
  const lowerName = fileName.toLowerCase();
  const hasAllowedExt = ALLOWED_EXTENSIONS.some((ext) => lowerName.endsWith(ext));
  if (hasAllowedExt) return true;

  if (mimeType && mimeType !== "application/octet-stream") {
    const lowerMime = mimeType.toLowerCase();
    if (ALLOWED_MIME_TYPES.indexOf(lowerMime) !== -1) return true;
  }

  return false;
}

/**
 * Extracts extension from file name.
 */
export function getFileExtension(fileName: string): string {
  const idx = fileName.lastIndexOf(".");
  return idx !== -1 ? fileName.substring(idx).toLowerCase() : "";
}

/**
 * Validates a single file against per-file size limit, total remaining capacity, duplicate status, and file type.
 */
export function validateAttachment(
  file: { name: string; size: number; type?: string },
  currentTotalSizeBytes: number,
  existingFileNames: string[]
): IFileValidationResult {
  // 1. File format validation
  if (!isFileTypeAllowed(file.name, file.type)) {
    const ext = getFileExtension(file.name) || "unknown";
    return {
      isValid: false,
      reason: "UNSUPPORTED_TYPE",
      error: `File '${file.name}' has an unsupported format (${ext}). Supported: PDF, Word (.doc, .docx), Excel (.xls, .xlsx), Images (.png, .jpg, .webp).`,
    };
  }

  // 2. Duplicate detection (case-insensitive check)
  const isDuplicate = existingFileNames.some(
    (name) => name.trim().toLowerCase() === file.name.trim().toLowerCase()
  );
  if (isDuplicate) {
    return {
      isValid: false,
      reason: "DUPLICATE",
      error: `File '${file.name}' is already attached. Remove the existing file before attaching a new version.`,
    };
  }

  // 3. Individual file size limit (10 MB)
  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      reason: "SIZE_PER_FILE",
      error: `File '${file.name}' (${formatBytes(file.size)}) exceeds the maximum individual limit of 10 MB.`,
    };
  }

  // 4. Combined total size limit (20 MB)
  const remainingCapacity = Math.max(0, MAX_TOTAL_SIZE_BYTES - currentTotalSizeBytes);
  if (currentTotalSizeBytes + file.size > MAX_TOTAL_SIZE_BYTES) {
    return {
      isValid: false,
      reason: "SIZE_TOTAL",
      error: `File '${file.name}' (${formatBytes(file.size)}) exceeds the remaining total capacity of ${formatBytes(
        remainingCapacity
      )}. (Current usage: ${formatBytes(currentTotalSizeBytes)} of 20 MB).`,
    };
  }

  return { isValid: true };
}

/**
 * Validates a batch of files selected at once, ensuring sequential capacity calculation.
 */
export function validateBatchAttachments<T extends { name: string; size: number; type?: string }>(
  incomingFiles: T[],
  currentAttachments: { name: string; size: number }[]
): IBatchValidationResult<T> {
  let runningTotal = currentAttachments.reduce((sum, a) => sum + (a.size || 0), 0);
  const existingNames = currentAttachments.map((a) => a.name);

  const accepted: { file: T; size: number; name: string }[] = [];
  const rejected: { file: T; size: number; name: string; error: string; reason: string }[] = [];

  for (const item of incomingFiles) {
    const result = validateAttachment(item, runningTotal, existingNames);
    if (result.isValid) {
      accepted.push({ file: item, size: item.size, name: item.name });
      existingNames.push(item.name);
      runningTotal += item.size;
    } else {
      rejected.push({
        file: item,
        size: item.size,
        name: item.name,
        error: result.error || "File rejected by attachment validation rules.",
        reason: result.reason || "SIZE_TOTAL",
      });
    }
  }

  return {
    accepted,
    rejected,
    newTotalSize: runningTotal,
  };
}
