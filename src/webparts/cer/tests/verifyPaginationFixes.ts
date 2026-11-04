function assertTrue(condition: boolean, msg: string): void {
  if (!condition) {
    throw new Error(`Assertion failed: ${msg}`);
  }
}

function assertDeepEqual(a: any, b: any, msg: string): void {
  const strA = JSON.stringify(a);
  const strB = JSON.stringify(b);
  if (strA !== strB) {
    throw new Error(`Assertion failed: ${msg} -> expected ${strB}, got ${strA}`);
  }
}

function getPageNumbers(currentPage: number, totalPages: number): (number | "...")[] {
  const safeCurrent = Number.isFinite(currentPage) && currentPage >= 1 ? Math.floor(currentPage) : 1;
  const safeTotal = Number.isFinite(totalPages) && totalPages >= 1 ? Math.floor(totalPages) : 1;

  if (safeTotal <= 7) {
    return Array.from({ length: safeTotal }, (_, i) => i + 1);
  }

  if (safeCurrent <= 4) {
    return [1, 2, 3, 4, 5, "...", safeTotal];
  }

  if (safeCurrent >= safeTotal - 3) {
    return [1, "...", safeTotal - 4, safeTotal - 3, safeTotal - 2, safeTotal - 1, safeTotal];
  }

  return [1, "...", safeCurrent - 1, safeCurrent, safeCurrent + 1, "...", safeTotal];
}

console.log("==========================================");
console.log(" PAGINATION & RESPONSIVENESS TEST SUITE   ");
console.log("==========================================");

// 1. Single page: totalPages = 1
const p1 = getPageNumbers(1, 1);
assertDeepEqual(p1, [1], "p1 === [1]");
console.log("✔ [PASS] 1. totalPages = 1 returns [1]");

// 2. Small page counts: totalPages = 3
const p3 = getPageNumbers(1, 3);
assertDeepEqual(p3, [1, 2, 3], "p3 === [1, 2, 3]");
console.log("✔ [PASS] 2. totalPages = 3 returns [1, 2, 3]");

// 3. Medium page count: totalPages = 8, current = 1
const p8_1 = getPageNumbers(1, 8);
assertDeepEqual(p8_1, [1, 2, 3, 4, 5, "...", 8], "p8_1 matches");
console.log("✔ [PASS] 3. totalPages = 8, page 1 returns [1, 2, 3, 4, 5, '...', 8]");

// 4. Large page count: totalPages = 20, current = 10
const p20_10 = getPageNumbers(10, 20);
assertDeepEqual(p20_10, [1, "...", 9, 10, 11, "...", 20], "p20_10 matches");
console.log("✔ [PASS] 4. totalPages = 20, page 10 returns [1, '...', 9, 10, 11, '...', 20]");

// 5. Total NaN Protection
const pNaN = getPageNumbers(NaN as any, NaN as any);
assertDeepEqual(pNaN, [1], "pNaN === [1]");
console.log("✔ [PASS] 5. NaN inputs safely return [1] (0% NaN risk)");

// 6. Range indexing calculation
function computeRange(totalItems: number, currentPage: number, effectivePageSize: number) {
  const safeTotalItems = Number.isFinite(totalItems) && totalItems >= 0 ? Math.floor(totalItems) : 0;
  const safeSize = Number.isFinite(effectivePageSize) && effectivePageSize >= 1 ? Math.floor(effectivePageSize) : 1;
  const safeTotalPages = Math.max(1, Math.ceil(safeTotalItems / safeSize));
  const safeCurrent = Number.isFinite(currentPage) && currentPage >= 1 ? Math.min(Math.floor(currentPage), safeTotalPages) : 1;
  const startIndex = Math.max(0, (safeCurrent - 1) * safeSize);
  const endIndex = Math.min(startIndex + safeSize, safeTotalItems);
  const displayStart = safeTotalItems > 0 ? startIndex + 1 : 0;
  return { safeTotalItems, safeCurrent, safeTotalPages, startIndex, endIndex, displayStart };
}

// 7. Verify range for 3 tasks on page 1 with pageSize 2
const r1 = computeRange(3, 1, 2);
assertTrue(r1.displayStart === 1, "r1.displayStart === 1");
assertTrue(r1.endIndex === 2, "r1.endIndex === 2");
assertTrue(r1.safeTotalPages === 2, "r1.safeTotalPages === 2");
console.log("✔ [PASS] 6. 3 tasks with pageSize 2: Showing 1–2 of 3 (totalPages = 2)");

// 8. Verify range for 3 tasks on page 2 with pageSize 2
const r2 = computeRange(3, 2, 2);
assertTrue(r2.displayStart === 3, "r2.displayStart === 3");
assertTrue(r2.endIndex === 3, "r2.endIndex === 3");
console.log("✔ [PASS] 7. 3 tasks with pageSize 2: Showing 3–3 of 3");

// 9. Verify 0 tasks
const r0 = computeRange(0, 1, 10);
assertTrue(r0.displayStart === 0, "r0.displayStart === 0");
assertTrue(r0.endIndex === 0, "r0.endIndex === 0");
console.log("✔ [PASS] 8. 0 tasks: Showing 0–0 of 0");

// 10. Verify NaN inputs to range
const rNaN = computeRange(NaN as any, NaN as any, NaN as any);
assertTrue(rNaN.displayStart === 0, "rNaN.displayStart === 0");
assertTrue(rNaN.endIndex === 0, "rNaN.endIndex === 0");
assertTrue(rNaN.safeTotalPages === 1, "rNaN.safeTotalPages === 1");
console.log("✔ [PASS] 9. NaN inputs to range calculation produce clean integers, never NaN");

// 11. Mobile card clamping verification:
function getMobileCardRows(totalItems: number, calculatedRows: number) {
  const minMobileCards = totalItems >= 3 ? 3 : (totalItems >= 2 ? 2 : 1);
  return Math.max(minMobileCards, Math.min(5, Number.isFinite(calculatedRows) ? calculatedRows : minMobileCards));
}

assertTrue(getMobileCardRows(8, 1) === 3, "Mobile 8 items >= 3 cards");
assertTrue(getMobileCardRows(2, 1) === 2, "Mobile 2 items >= 2 cards");
assertTrue(getMobileCardRows(1, 1) === 1, "Mobile 1 item === 1 card");
console.log("✔ [PASS] 10. Mobile card clamping prevents single-card empty void bug (always >= 3 when items >= 3)");

// 12. Desktop card clamping verification:
function getDesktopCardRows(totalItems: number, calculatedRows: number) {
  const minRows = totalItems >= 2 ? 2 : 1;
  const rows = Number.isFinite(calculatedRows) && calculatedRows >= 1 ? calculatedRows : minRows;
  return Math.max(minRows, rows);
}

assertTrue(getDesktopCardRows(3, 1) === 2, "Desktop 3 items >= 2 cards");
assertTrue(getDesktopCardRows(3, 3) === 3, "Desktop 3 items can show 3");
console.log("✔ [PASS] 11. Desktop card clamping prevents single-card empty void bug (always >= 2 when items >= 2)");

console.log("==========================================");
console.log(" ALL PAGINATION FIX TESTS PASSED          ");
console.log("==========================================");
