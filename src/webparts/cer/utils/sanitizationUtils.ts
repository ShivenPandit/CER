import { ICERProposal } from "../models/CERModel";

/**
 * CER Management System - Input Sanitization & Security Hardening Utilities
 *
 * Provides:
 * 1. Whitespace normalization (collapses consecutive spaces, strips leading/trailing).
 * 2. Multi-line text formatting (preserves intentional paragraphs, trims line whitespace).
 * 3. XSS and script injection detection and neutralization.
 * 4. Full proposal payload sanitization before persistence and validation.
 */

// Matches executable HTML tags and script containers
const SCRIPT_TAG_REGEX = /<\s*script\b[^>]*>[\s\S]*?<\s*\/\s*script\s*>/gi;
const IFRAME_TAG_REGEX = /<\s*iframe\b[^>]*>[\s\S]*?<\s*\/\s*iframe\s*>/gi;
const OBJECT_TAG_REGEX = /<\s*object\b[^>]*>[\s\S]*?<\s*\/\s*object\s*>/gi;
const EMBED_TAG_REGEX = /<\s*embed\b[^>]*>[\s\S]*?<\s*\/\s*embed\s*>/gi;
const STYLE_TAG_REGEX = /<\s*style\b[^>]*>[\s\S]*?<\s*\/\s*style\s*>/gi;

// Matches inline event handlers and pseudo-protocols
const JAVASCRIPT_PROTOCOL_REGEX = /javascript\s*:/gi;
const VBSCRIPT_PROTOCOL_REGEX = /vbscript\s*:/gi;
const DATA_HTML_PROTOCOL_REGEX = /data\s*:\s*text\/html/gi;
const INLINE_EVENT_HANDLER_REGEX = /\bon\w+\s*=\s*(?:'[^']*'|"[^"]*"|[^\s>]+)/gi;
const TAG_WITH_EVENT_HANDLER_REGEX = /<[a-zA-Z0-9_\-]+(?:\s+[^>]*?)?\bon\w+\s*=[^>]*>/gi;

// Control / Non-printable characters (excluding standard tabs and newlines)
const CONTROL_CHARS_REGEX = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g;

/**
 * Escapes a string literal for use inside SharePoint OData $filter expressions.
 * In OData, single quotes are escaped by doubling them (' -> '').
 */
export function escapeODataString(val?: string | null): string {
  if (!val) return "";
  return String(val).replace(CONTROL_CHARS_REGEX, "").replace(/'/g, "''").trim();
}

/**
 * Neutralizes Spreadsheet Formula Injection (CSV / Excel injection attacks - CWE-1236).
 * Prepends a single quote (') if a cell string begins with dangerous execution triggers:
 * '=', '+', '-', '@', tab '\t', or carriage return '\r'.
 * If the string already begins with a single quote, it is safely retained.
 */
export function disarmFormulaInjection(value: any): any {
  if (typeof value === "string") {
    if (value.charAt(0) === "'") {
      return value;
    }

    const trimmed = value.trim();
    if (!trimmed) return value;
    if (trimmed.charAt(0) === "'") {
      return trimmed;
    }

    const firstChar = trimmed.charAt(0);
    // Check if trimmed string starts with formula trigger characters (=, +, -, @)
    if (
      firstChar === "=" ||
      firstChar === "+" ||
      firstChar === "-" ||
      firstChar === "@"
    ) {
      return `'${trimmed}`;
    }

    // Check if raw string starts with CSV separator / control whitespace triggers (\t, \r, \n)
    const rawFirstChar = value.charAt(0);
    if (rawFirstChar === "\t" || rawFirstChar === "\r" || rawFirstChar === "\n") {
      return `'${value}`;
    }
  }
  return value;
}

/**
 * Checks whether a text string contains active malicious script or tag injection patterns.
 */
export function containsMaliciousScript(val?: string | null): boolean {
  if (!val || typeof val !== "string") return false;

  const testStr = val.trim();
  if (!testStr) return false;

  if (SCRIPT_TAG_REGEX.test(testStr)) return true;
  if (/<\s*\/?\s*(script|iframe|object|embed|style|html|body|svg)\b/i.test(testStr)) return true;
  if (IFRAME_TAG_REGEX.test(testStr)) return true;
  if (OBJECT_TAG_REGEX.test(testStr)) return true;
  if (EMBED_TAG_REGEX.test(testStr)) return true;
  if (JAVASCRIPT_PROTOCOL_REGEX.test(testStr)) return true;
  if (VBSCRIPT_PROTOCOL_REGEX.test(testStr)) return true;
  if (DATA_HTML_PROTOCOL_REGEX.test(testStr)) return true;

  // Check for HTML tag containing inline event handler (e.g. <img src=x onerror=...>)
  if (/<[^>]+?\bon\w+\s*=/i.test(testStr)) return true;

  return false;
}

/**
 * Normalizes single-line text inputs (e.g., Project Name, Proposal No, Owner Name).
 * - Strips leading and trailing whitespace.
 * - Collapses consecutive spaces/tabs to a single space.
 * - Removes hidden non-printable control characters.
 */
export function sanitizeSingleLineText(val?: string | null): string {
  if (val === undefined || val === null) return "";
  const str = String(val);

  return str
    .replace(CONTROL_CHARS_REGEX, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Normalizes multi-line narrative inputs (e.g., Objectives of CER, Remarks, Key Assumptions).
 * - Trims leading and trailing whitespace of the overall text.
 * - Normalizes line breaks to '\n'.
 * - Trims trailing whitespace on each line.
 * - Collapses multiple spaces within each line to a single space.
 * - Collapses 3 or more consecutive blank lines down to 2.
 * - Neutralizes malicious script/html tags while safely PRESERVING engineering math like '< 10' or '> 50'.
 */
export function sanitizeMultiLineText(val?: string | null): string {
  if (val === undefined || val === null) return "";
  let text = String(val);

  // Remove control characters (except newline \n and tab \t)
  text = text.replace(CONTROL_CHARS_REGEX, "");

  // Normalize Windows CRLF to LF
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // Neutralize executable script tags
  text = text
    .replace(SCRIPT_TAG_REGEX, "")
    .replace(IFRAME_TAG_REGEX, "")
    .replace(OBJECT_TAG_REGEX, "")
    .replace(EMBED_TAG_REGEX, "")
    .replace(STYLE_TAG_REGEX, "")
    .replace(JAVASCRIPT_PROTOCOL_REGEX, "")
    .replace(VBSCRIPT_PROTOCOL_REGEX, "")
    .replace(DATA_HTML_PROTOCOL_REGEX, "")
    .replace(TAG_WITH_EVENT_HANDLER_REGEX, "")
    .replace(INLINE_EVENT_HANDLER_REGEX, "");

  // Normalize whitespace per line while preserving line structure
  const lines = text.split("\n").map((line) => line.replace(/[ \t]+/g, " ").trim());

  // Rejoin and collapse excessive blank lines (3+ consecutive newlines -> 2)
  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

/**
 * Deep sanitizes all text fields across an entire ICERProposal object.
 * Guarantees uniform whitespace and injection-free values before validation and persistence.
 */
export function sanitizeProposalPayload(proposal: ICERProposal): ICERProposal {
  if (!proposal) return proposal;

  const sanitized: ICERProposal = { ...proposal };

  // Single-line text fields
  if (sanitized.pr_name !== undefined) {
    sanitized.pr_name = sanitizeSingleLineText(sanitized.pr_name);
  }
  if (sanitized.proposal_no !== undefined) {
    sanitized.proposal_no = sanitizeSingleLineText(sanitized.proposal_no);
  }
  if (sanitized.cerprno !== undefined) {
    sanitized.cerprno = sanitizeSingleLineText(sanitized.cerprno);
  }
  if (sanitized.owname !== undefined) {
    sanitized.owname = sanitizeSingleLineText(sanitized.owname);
  }
  if (sanitized.owner_email !== undefined) {
    sanitized.owner_email = sanitizeSingleLineText(sanitized.owner_email).toLowerCase();
  }
  if (sanitized.sbu !== undefined) {
    sanitized.sbu = sanitizeSingleLineText(sanitized.sbu) as any;
  }
  if (sanitized.cat !== undefined) {
    sanitized.cat = sanitizeSingleLineText(sanitized.cat) as any;
  }
  if (sanitized.payable !== undefined) {
    sanitized.payable = sanitizeSingleLineText(sanitized.payable) as any;
  }
  if (sanitized.period !== undefined) {
    sanitized.period = sanitizeSingleLineText(sanitized.period);
  }

  // Multi-line narrative fields
  if (sanitized.object !== undefined) {
    sanitized.object = sanitizeMultiLineText(sanitized.object);
  }
  if (sanitized.cost_assumptions !== undefined) {
    sanitized.cost_assumptions = sanitizeMultiLineText(sanitized.cost_assumptions);
  }
  if (sanitized.reason !== undefined) {
    sanitized.reason = sanitizeMultiLineText(sanitized.reason);
  }
  if (sanitized.jv_reason !== undefined) {
    sanitized.jv_reason = sanitizeMultiLineText(sanitized.jv_reason);
  }
  if (sanitized.remarks !== undefined) {
    sanitized.remarks = sanitizeMultiLineText(sanitized.remarks);
  }
  if (sanitized.remarks_jv !== undefined) {
    sanitized.remarks_jv = sanitizeMultiLineText(sanitized.remarks_jv);
  }

  return sanitized;
}
