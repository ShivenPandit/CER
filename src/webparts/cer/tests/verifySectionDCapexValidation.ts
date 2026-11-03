import { ICERProposal } from "../models/CERModel";
import {
  validateAll,
  validateField,
  hasEnteredCostBreakdown,
  formatCapexDifference,
} from "../utils/cerValidation";

function assert(condition: boolean, message: string) {
  if (!condition) {
    console.error(`  [FAIL] ${message}`);
    throw new Error(`Assertion failed: ${message}`);
  }
  console.log(`  [PASS] ${message}`);
}

export async function runSectionDCapexValidationTests(): Promise<void> {
  console.log("================================================================================");
  console.log("SECTION D — CAPEX BREAKDOWN VALIDATION & DIFFERENCE VERIFICATION");
  console.log("================================================================================");

  const baseValidProposal = {
    id: "test-sec-d-001",
    proposal_no: "PR-2026/SEC-D",
    cerprno: "CER-2026-0099",
    pr_name: "Capex Breakdown Validation Project",
    owname: "Shiven Pandit",
    owner_email: "shiven.pandit@example.com",
    sbu: "RJ North",
    status: "In Approval",
    object: "Validation testing for Section D capex reconciliation.",
    amount: 500,
    currency: "USD",
    cat: "Vital",
    payable: "Payback",
    payback_quarters: 4,
    cbudget: "Yes",
    jv: "No",
    jv_recoverable: "No",
    jv_budget: "No",
    st_date: "2026-05-01",
    com_date: "2027-05-01",
    engineer: 0,
    s_fac: 0,
    comis: 0,
    preop: 0,
    others: 0,
    total: 0,
  } as unknown as ICERProposal;

  // ---------------------------------------------------------------------------------------------
  // Test 1: Empty / Zero Section D Fields (Optional - no validation triggered)
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest 1: Section D left empty or zero — No validation triggered");
  {
    assert(
      hasEnteredCostBreakdown(baseValidProposal) === false,
      "hasEnteredCostBreakdown returns false when all Section D fields are 0"
    );

    const emptyProposal = {
      ...baseValidProposal,
      engineer: undefined as any,
      s_fac: undefined as any,
      comis: undefined as any,
      preop: undefined as any,
      others: undefined as any,
    };
    assert(
      hasEnteredCostBreakdown(emptyProposal) === false,
      "hasEnteredCostBreakdown returns false when Section D fields are undefined"
    );

    const res = validateAll(baseValidProposal, false);
    assert(res.isValid === true, "validateAll passes when Section D is completely untouched");
    assert(res.errors.total === undefined, "No errors.total when Section D is untouched");
    assert(res.errors.cost_mismatch === undefined, "No errors.cost_mismatch when Section D is untouched");
  }

  // ---------------------------------------------------------------------------------------------
  // Test 2: User Enters Value in Section D — Total Capex exceeds Amount of CER
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest 2: Section D entered with Engineering = 566 vs Amount = 500 (Exceeds CER Amount)");
  {
    const propWithMismatch = {
      ...baseValidProposal,
      amount: 500,
      engineer: 566,
      s_fac: 0,
      comis: 0,
      preop: 0,
      others: 0,
      total: 566,
    };

    assert(
      hasEnteredCostBreakdown(propWithMismatch) === true,
      "hasEnteredCostBreakdown returns true when engineer is populated with 566"
    );

    const res = validateAll(propWithMismatch, false);
    assert(res.isValid === false, "validateAll fails when Total Capex (566) != Amount of CER (500)");
    assert(res.errors.total !== undefined, "errors.total is populated with diff message");
    assert(
      res.errors.total!.indexOf("Difference: +$66 mm") !== -1,
      `errors.total includes exact positive formatted diff: "${res.errors.total}"`
    );
    assert(
      res.errors.total!.indexOf("Total CAPEX ($566 mm) must equal Amount of CER ($500 mm)") !== -1,
      `errors.total includes breakdown and CER amount context: "${res.errors.total}"`
    );
    assert(res.errors.cost_mismatch === res.errors.total, "errors.cost_mismatch mirrors errors.total");

    const singleFieldErr = validateField("total", 566, propWithMismatch, false);
    assert(singleFieldErr !== undefined, "validateField('total') detects capex mismatch on blur/change");
    assert(singleFieldErr!.indexOf("Difference: +$66 mm") !== -1, "validateField('total') includes diff");
  }

  // ---------------------------------------------------------------------------------------------
  // Test 3: User Enters Value in Section D — Total Capex is short of Amount of CER
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest 3: Section D entered with Total = 300 vs Amount = 500 (Short of CER Amount)");
  {
    const propShort = {
      ...baseValidProposal,
      amount: 500,
      engineer: 100,
      s_fac: 150,
      comis: 50,
      preop: 0,
      others: 0,
      total: 300,
    };

    const res = validateAll(propShort, false);
    assert(res.isValid === false, "validateAll fails when Total Capex (300) < Amount of CER (500)");
    assert(
      res.errors.total!.indexOf("Difference: -$200 mm") !== -1,
      `errors.total includes exact negative formatted diff: "${res.errors.total}"`
    );
  }

  // ---------------------------------------------------------------------------------------------
  // Test 4: User Enters Matching Values in Section D — Total Capex = Amount of CER
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest 4: Section D entered with Total = 500 vs Amount = 500 (Reconciled)");
  {
    const propReconciled = {
      ...baseValidProposal,
      amount: 500,
      engineer: 150,
      s_fac: 200,
      comis: 50,
      preop: 50,
      others: 50,
      total: 500,
    };

    assert(hasEnteredCostBreakdown(propReconciled) === true, "hasEnteredCostBreakdown is true");
    const res = validateAll(propReconciled, false);
    assert(res.isValid === true, "validateAll passes when Total Capex exactly equals Amount of CER");
    assert(res.errors.total === undefined, "No errors.total when reconciled");
    assert(res.errors.cost_mismatch === undefined, "No errors.cost_mismatch when reconciled");

    const singleFieldErr = validateField("total", 500, propReconciled, false);
    assert(singleFieldErr === undefined, "validateField('total') returns undefined when reconciled");
  }

  // ---------------------------------------------------------------------------------------------
  // Test 5: INR Currency Formatting
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest 5: INR Currency Formatting for Section D Validation");
  {
    const propINR = {
      ...baseValidProposal,
      currency: "INR",
      amount: 1000000,
      engineer: 1200000,
      total: 1200000,
    };

    const res = validateAll(propINR, false);
    assert(res.isValid === false, "validateAll fails for INR mismatch");
    assert(
      res.errors.total!.indexOf(`Difference: +₹${(200000).toLocaleString()}`) !== -1,
      `INR formatting includes ₹ symbol without mm: "${res.errors.total}"`
    );
  }

  // ---------------------------------------------------------------------------------------------
  // Test 6: Draft Mode Permits Partial Section D Input
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest 6: Draft Mode allows saving even with Section D difference");
  {
    const propDraft = {
      ...baseValidProposal,
      amount: 500,
      engineer: 566,
      total: 566,
    };

    const res = validateAll(propDraft, true);
    assert(res.isValid === true, "validateAll in draft mode allows Section D capex difference to be saved");
    assert(res.errors.total === undefined, "No errors.total blocking draft save");
  }

  // ---------------------------------------------------------------------------------------------
  // Test 7: formatCapexDifference Helper Verification
  // ---------------------------------------------------------------------------------------------
  console.log("\nTest 7: formatCapexDifference Helper Verification");
  {
    assert(formatCapexDifference(66, "USD") === "+$66 mm", "+66 USD formats as +$66 mm");
    assert(formatCapexDifference(-134, "USD") === "-$134 mm", "-134 USD formats as -$134 mm");
    assert(
      formatCapexDifference(200000, "INR") === `+₹${(200000).toLocaleString()}`,
      `+200000 INR formats with localized INR formatting: ${formatCapexDifference(200000, "INR")}`
    );
    assert(
      formatCapexDifference(-50000, "INR") === `-₹${(50000).toLocaleString()}`,
      `-50000 INR formats with localized INR formatting: ${formatCapexDifference(-50000, "INR")}`
    );
  }

  console.log("\n================================================================================");
  console.log("ALL SECTION D CAPEX BREAKDOWN TESTS PASSED SUCCESSFULLY!");
  console.log("================================================================================");
}

// Auto-run if executed directly
if (typeof require !== "undefined" && (require as any).main === module) {
  runSectionDCapexValidationTests().catch((err) => {
    console.error("Section D validation test failed:", err);
    if (typeof process !== "undefined" && (process as any).exit) {
      (process as any).exit(1);
    }
  });
}
