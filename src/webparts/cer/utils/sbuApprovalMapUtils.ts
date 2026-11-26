import { ISbuApprovalEntry, IUserRoleAssignment, SbuApprovalMap } from "../models/UserModel";
import { ISBUItem } from "../models/CERModel";
import { ROLE_MATRIX_SBUS, ROLE_MATRIX_SBU_CODES } from "../constants";

let dynamicSbuRegistry: ISBUItem[] = [];

/**
 * Registers dynamic SBUs fetched from SBUMaster into the memory registry.
 */
export function registerSbuItems(items: ISBUItem[]): void {
  dynamicSbuRegistry = Array.isArray(items) ? [...items] : [];
}

/**
 * Retrieves the currently registered dynamic SBUs.
 */
export function getRegisteredSbuItems(): ISBUItem[] {
  return [...dynamicSbuRegistry];
}

const DISPLAY_TO_CODE_LOWER: Record<string, string> = {
  cbos: "CBOS",
  rava: "RAVA",
  "rj north": "RJ_NORTH",
  rj_north: "RJ_NORTH",
  "rj-north": "RJ_NORTH",
  rjnorth: "RJ_NORTH",
  "rj south": "RJ_SOUTH",
  rj_south: "RJ_SOUTH",
  "rj-south": "RJ_SOUTH",
  rjsouth: "RJ_SOUTH",
  all: "ALL",
};

const CODE_TO_DISPLAY: Record<string, string> = {
  CBOS: "CBOS",
  RAVA: "RAVA",
  RJ_NORTH: "RJ North",
  RJ_SOUTH: "RJ South",
  ALL: "All",
};

/**
 * Converts an SBU display name or code into a stable canonical SBU code (e.g. "RJ North" -> "RJ_NORTH").
 */
export function toStableSbuCode(sbuOrCode?: string | null): string {
  const trimmed = String(sbuOrCode || "").trim();
  if (!trimmed) return "";
  const lower = trimmed.toLowerCase().replace(/\s+/g, " ");

  // 1. Check dynamic SBU registry first
  for (const item of dynamicSbuRegistry) {
    if (
      (item.title && item.title.toLowerCase().trim() === lower) ||
      (item.sbuCode && item.sbuCode.toLowerCase().trim() === lower)
    ) {
      return item.sbuCode.trim().toUpperCase();
    }
  }

  // 2. Static lookup
  if (DISPLAY_TO_CODE_LOWER[lower]) {
    return DISPLAY_TO_CODE_LOWER[lower];
  }
  return trimmed
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Converts a stable SBU code (or display string) back to the canonical SharePoint Choice value.
 */
export function toSbuDisplayName(codeOrSbu?: string | null): string {
  const trimmed = String(codeOrSbu || "").trim();
  if (!trimmed) return "";
  const code = toStableSbuCode(trimmed);

  // 1. Check dynamic SBU registry first
  for (const item of dynamicSbuRegistry) {
    if (
      (item.sbuCode && item.sbuCode.toUpperCase().trim() === code) ||
      (item.title && item.title.toLowerCase().trim() === trimmed.toLowerCase())
    ) {
      return item.title;
    }
  }

  // 2. Static lookup
  if (CODE_TO_DISPLAY[code]) {
    return CODE_TO_DISPLAY[code];
  }
  return trimmed;
}

/**
 * Default role title for a workflow stage level.
 */
export function getDefaultRoleTitleForLevel(level: number): string {
  switch (Number(level)) {
    case 1:
      return "Finance";
    case 2:
      return "Project Owner";
    case 3:
      return "BU CFO";
    case 4:
      return "BU Director";
    case 5:
      return "VOGL CFO";
    case 6:
      return "VOGL CEO";
    default:
      return "Approver";
  }
}

/**
 * Maps a role title string to its sequential stage level.
 */
export function mapRoleTitleToLevel(title?: string | null): number | null {
  const t = String(title || "").toLowerCase().trim();
  if (!t) return null;
  if (t === "finance" || (t.indexOf("finance") !== -1 && t.indexOf("corporate") === -1 && t.indexOf("cfo") === -1)) {
    return 1;
  }
  if (t.indexOf("project owner") !== -1 || t === "owner") {
    return 2;
  }
  if (t.indexOf("bu cfo") !== -1 || (t.indexOf("cfo") !== -1 && t.indexOf("vogl") === -1)) {
    return 3;
  }
  if (t.indexOf("bu director") !== -1 || (t.indexOf("director") !== -1 && t.indexOf("vogl") === -1)) {
    return 4;
  }
  if (t.indexOf("vogl cfo") !== -1) {
    return 5;
  }
  if (t.indexOf("vogl ceo") !== -1 || t.indexOf("ceo") !== -1) {
    return 6;
  }
  const match = t.match(/l(?:evel)?\s*(\d+)/i);
  if (match) {
    const num = parseInt(match[1], 10);
    if (!isNaN(num) && num >= 1 && num <= 7) return num;
  }
  return null;
}

/**
 * Normalizes levels and role titles so they are sorted ascending, deduplicated, and aligned.
 */
export function normalizeLevelsAndTitles(
  rawLevels: Array<number | string>,
  rawTitles?: string[]
): ISbuApprovalEntry {
  const levelSet = new Set<number>();
  for (const val of rawLevels || []) {
    const num = Number(val);
    if (!isNaN(num) && num >= 1 && num <= 7) {
      levelSet.add(num);
    }
  }
  for (const title of rawTitles || []) {
    const inferred = mapRoleTitleToLevel(title);
    if (inferred !== null && (!rawLevels || rawLevels.length === 0)) {
      levelSet.add(inferred);
    }
  }

  const levels = Array.from(levelSet).sort((a, b) => a - b);
  const roleTitles = levels.map((lvl) => {
    const matched = (rawTitles || []).find((t) => mapRoleTitleToLevel(t) === lvl);
    return (matched || getDefaultRoleTitleForLevel(lvl)).trim();
  });

  return { levels, roleTitles };
}

/**
 * Strips any accidental SharePoint Rich Text HTML markup before JSON parsing.
 */
export function stripHtmlForJson(raw: string): string {
  if (!raw) return "";
  if (raw.indexOf("<") === -1 && raw.indexOf("&") === -1) return raw.trim();
  return raw
    .replace(/<[^>]+>/g, " ")
    .replace(/&quot;/g, '"')
    .replace(/&#34;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .trim();
}

/**
 * Parses raw SharePoint `sbuApprovalMap` value (string or object) into canonical `SbuApprovalMap`.
 */
export function parseSbuApprovalMap(rawVal: unknown): SbuApprovalMap {
  if (!rawVal) return {};

  let parsedObj: unknown = rawVal;
  if (typeof rawVal === "string") {
    const cleaned = stripHtmlForJson(rawVal);
    if (!cleaned) return {};
    try {
      parsedObj = JSON.parse(cleaned);
    } catch {
      return {};
    }
  }

  if (!parsedObj || typeof parsedObj !== "object" || Array.isArray(parsedObj)) {
    return {};
  }

  const result: SbuApprovalMap = {};
  const objMap = parsedObj as Record<string, any>;
  for (const rawKey of Object.keys(objMap)) {
    const rawEntry = objMap[rawKey];
    const code = toStableSbuCode(rawKey);
    if (!code) continue;

    let levelsInput: Array<number | string> = [];
    let titlesInput: string[] = [];

    if (Array.isArray(rawEntry)) {
      levelsInput = rawEntry;
    } else if (rawEntry && typeof rawEntry === "object") {
      if (Array.isArray(rawEntry.levels)) {
        levelsInput = rawEntry.levels;
      } else if (rawEntry.level !== undefined) {
        levelsInput = [rawEntry.level];
      }
      if (Array.isArray(rawEntry.roleTitles)) {
        titlesInput = rawEntry.roleTitles.map(String);
      } else if (Array.isArray(rawEntry.approverRoleTitles)) {
        titlesInput = rawEntry.approverRoleTitles.map(String);
      }
    }

    const entry = normalizeLevelsAndTitles(levelsInput, titlesInput);
    if (entry.levels.length > 0) {
      if (result[code]) {
        const merged = normalizeLevelsAndTitles(
          result[code].levels.concat(entry.levels),
          result[code].roleTitles.concat(entry.roleTitles)
        );
        result[code] = merged;
      } else {
        result[code] = entry;
      }
    }
  }

  return result;
}

/**
 * Serializes `SbuApprovalMap` into deterministic JSON (returns "" when empty).
 */
export function serializeSbuApprovalMap(map?: SbuApprovalMap | null): string {
  if (!map) return "";
  const cleaned: SbuApprovalMap = {};
  const orderedCodes = [
    ...(dynamicSbuRegistry.length > 0
      ? dynamicSbuRegistry.map((s) => s.sbuCode)
      : ROLE_MATRIX_SBUS.map((s) => ROLE_MATRIX_SBU_CODES[s])),
    ...Object.keys(map).sort(),
  ];
  const seen = new Set<string>();

  for (const rawKey of orderedCodes) {
    const code = toStableSbuCode(rawKey);
    if (!code || seen.has(code)) continue;
    seen.add(code);

    const matchingKey = Object.keys(map).find((k) => toStableSbuCode(k) === code);
    if (!matchingKey || !map[matchingKey]) continue;

    const entry = normalizeLevelsAndTitles(
      map[matchingKey].levels || [],
      map[matchingKey].roleTitles || []
    );
    if (entry.levels.length > 0) {
      cleaned[code] = entry;
    }
  }

  if (Object.keys(cleaned).length === 0) return "";
  return JSON.stringify(cleaned);
}

/**
 * Returns sorted canonical SharePoint Choice SBU display names synchronized with active keys in `map`.
 */
export function getSyncedSbusFromMap(map?: SbuApprovalMap | null): string[] {
  if (!map) return [];
  const activeDisplays = new Set<string>();
  for (const k of Object.keys(map)) {
    const entry = map[k];
    if (!entry || !Array.isArray(entry.levels) || entry.levels.length === 0) continue;
    const display = toSbuDisplayName(k);
    if (display) activeDisplays.add(display);
  }

  if (dynamicSbuRegistry.length > 0) {
    const sortedRegistered = [...dynamicSbuRegistry]
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map((s) => s.title)
      .filter((title) => activeDisplays.has(title));
    const extras = Array.from(activeDisplays)
      .filter((s) => !dynamicSbuRegistry.some((d) => d.title.toLowerCase() === s.toLowerCase()))
      .sort();
    return [...sortedRegistered, ...extras];
  }

  const orderedKnown = ROLE_MATRIX_SBUS.filter((s) => activeDisplays.has(s));
  const extras = Array.from(activeDisplays)
    .filter((s) => (ROLE_MATRIX_SBUS as readonly string[]).indexOf(s) === -1)
    .sort();
  return [...orderedKnown, ...extras];
}

/**
 * Immutably updates ONLY `targetSbu`'s levels and titles in `existingMap`, preserving all other SBUs verbatim.
 * Passing an empty `newLevels` removes `targetSbu` cleanly.
 */
export function updateSbuInApprovalMap(
  existingMap: SbuApprovalMap | undefined | null,
  targetSbu: string,
  newLevels: number[],
  newTitles?: string[]
): SbuApprovalMap {
  const next: SbuApprovalMap = {};
  if (existingMap) {
    for (const k of Object.keys(existingMap)) {
      const entry = existingMap[k];
      const code = toStableSbuCode(k);
      if (!code || !entry) continue;
      const normEntry = normalizeLevelsAndTitles(entry.levels || [], entry.roleTitles || []);
      if (normEntry.levels.length > 0) {
        next[code] = normEntry;
      }
    }
  }

  const targetCode = toStableSbuCode(targetSbu);
  if (!targetCode) return next;

  const normalizedTarget = normalizeLevelsAndTitles(newLevels || [], newTitles);
  if (normalizedTarget.levels.length > 0) {
    next[targetCode] = normalizedTarget;
  } else {
    delete next[targetCode];
  }

  return next;
}

/**
 * Additively merges a single (sbu, level) into an existing `SbuApprovalMap` without overwriting other SBUs or other levels.
 */
export function mergeSingleAssignmentIntoMap(
  existingMap: SbuApprovalMap | undefined | null,
  targetSbu: string,
  level?: number,
  title?: string
): SbuApprovalMap {
  const existingCopy = updateSbuInApprovalMap(existingMap, "", []);
  const targetCode = toStableSbuCode(targetSbu);
  if (!targetCode || level === undefined || level === null) return existingCopy;

  const curr = existingCopy[targetCode] || { levels: [], roleTitles: [] };
  const merged = normalizeLevelsAndTitles(
    curr.levels.concat([Number(level)]),
    title ? curr.roleTitles.concat([title]) : curr.roleTitles
  );
  if (merged.levels.length > 0) {
    existingCopy[targetCode] = merged;
  }
  return existingCopy;
}

/**
 * Builds an initial `SbuApprovalMap` from legacy flat multi-choice columns (`sbu` × `approverLevel`/`approverRoleTitle`).
 */
export function buildLegacyFallbackMap(
  parsedSbus: string[],
  parsedLevels: number[],
  parsedTitles: string[]
): SbuApprovalMap {
  const map: SbuApprovalMap = {};
  if (!parsedLevels || parsedLevels.length === 0) return map;

  const effectiveSbus = parsedSbus && parsedSbus.length > 0 ? parsedSbus : ["All"];
  const normEntry = normalizeLevelsAndTitles(parsedLevels, parsedTitles);
  if (normEntry.levels.length === 0) return map;

  for (const sbu of effectiveSbus) {
    const code = toStableSbuCode(sbu);
    if (code) {
      map[code] = {
        levels: [...normEntry.levels],
        roleTitles: [...normEntry.roleTitles],
      };
    }
  }
  return map;
}

/**
 * Reconstructs the full `SbuApprovalMap` for a user across expanded `IUserRoleAssignment` entries.
 */
export function reconstructUserSbuMapFromRoles(rolesForUser: IUserRoleAssignment[]): SbuApprovalMap {
  let map: SbuApprovalMap = {};
  for (const r of rolesForUser) {
    if (r.sbu_approval_map && Object.keys(r.sbu_approval_map).length > 0) {
      const parsed = parseSbuApprovalMap(r.sbu_approval_map);
      for (const code of Object.keys(parsed)) {
        const entry = parsed[code];
        const existing = map[code];
        if (existing) {
          map[code] = normalizeLevelsAndTitles(
            existing.levels.concat(entry.levels),
            existing.roleTitles.concat(entry.roleTitles)
          );
        } else {
          map[code] = { levels: [...entry.levels], roleTitles: [...entry.roleTitles] };
        }
      }
    } else if (r.sbu && r.approval_level !== undefined && r.approval_level !== null) {
      map = mergeSingleAssignmentIntoMap(map, r.sbu, r.approval_level, r.approver_role_title);
    }
  }
  return map;
}
