import { LocalMockCERDataService } from "../services/LocalMockCERDataService";
import { ICERProposal, CATEGORY_DEFINITIONS, SBU_OPTIONS } from "../models/CERModel";
import { AUDIT_FIELD_DESCRIPTIONS, EXCLUDED_AUDIT_FIELDS } from "../models/AuditModel";

describe("CER Management System - Business Logic & Requirements Tests", () => {
  let service: LocalMockCERDataService;

  beforeEach(() => {
    // Clear storage keys
    if (typeof localStorage !== "undefined") {
      localStorage.clear();
    }
    service = new LocalMockCERDataService();
  });

  // TC-01: Proposal Creation (FR-01)
  test("FR-01: Creates a CER proposal with unique number and initiates workflow at Level 1", async () => {
    const proposalNumber = await service.generateProposalNumber();
    expect(proposalNumber).toMatch(/^CER-\d{4}-\d{4}$/);

    const testProposal: ICERProposal = {
      id: "prop-test-01",
      cerprno: proposalNumber,
      pr_name: "Test Infill Well Drilling",
      owname: "Test Initiator",
      owner_email: "test.initiator@vedanta.co.in",
      sbu: "RJ North",
      status: "In Approval",
      object: "Well Drilling",
      amount: 5000000,
      currency: "USD",
      cat: "Vital",
      payable: "Payback",
      period: "12 Months",
      ben_npv: 10.5,
      ben_irr: 25.0,
      cost_assumptions: "Assumed Brent $75",
      st_date: "2026-06-01",
      com_date: "2027-05-31",
      duration_months: 12,
      cbudget: "Yes",
      cb_amnt: 5000000,
      cb_currency: "USD",
      reason: "",
      jv: "No",
      jv_cost: 0,
      jv_budget: "No",
      jv_amnt: 0,
      jv_reason: "",
      ph_till_label: "Till FY26",
      ph_fy_label: "FY 26-27",
      ph_beyond_label: "Beyond FY27",
      prod_till: 0,
      prod_fy: 500000,
      prod_beyond: 1000000,
      capex_till: 2000000,
      capex_fy: 3000000,
      capex_beyond: 0,
      opex_till: 100000,
      opex_fy: 200000,
      opex_beyond: 0,
      engineer: 800000,
      s_fac: 2200000,
      comis: 500000,
      preop: 500000,
      others: 1000000,
      total: 5000000,
      remarks: "Thorough testing of proposal submission and workflow triggers.",
      remarks_jv: "",
      current_level: 1,
      pending_with_role: "L1 Approver",
      pending_with_email: "rajesh.sharma@vedanta.co.in",
      created_date: new Date().toISOString(),
      created_by: "Test Initiator",
      modified_date: new Date().toISOString(),
      modified_by: "Test Initiator",
      revision_count: 0,
    };

    const result = await service.createProposal(testProposal);
    expect(result.success).toBe(true);
    expect(result.message).toBe("CER Proposal No. has been created and sent for approval");
    expect(result.proposal.current_level).toBe(1);

    // Verify retrieval
    const retrieved = await service.getProposalByNumber(proposalNumber);
    expect(retrieved).not.toBeNull();
    expect(retrieved?.pr_name).toBe("Test Infill Well Drilling");
  });

  // TC-04 & TC-05: Change CER & Delta Audit Trail (FR-02 & FR-06)
  test("FR-02 & FR-06: Modifying proposal records exact field-level deltas excluding technical fields", async () => {
    const existing = await service.getProposalByNumber("CER-2026-0001");
    expect(existing).not.toBeNull();
    if (!existing) return;

    const originalAmount = existing.amount;

    // Modify specific fields
    const modified: ICERProposal = {
      ...existing,
      amount: 16000000,
      ben_npv: 35.0,
      // Technical fields like modified_date will change, but must NOT be in business audit rows
    };

    const result = await service.updateProposal(modified, {
      name: "Quality Assurance Auditor",
      email: "qa@vedanta.co.in",
    });

    expect(result.success).toBe(true);
    expect(result.message).toBe("CER Proposal No. has been changed and sent for approval");

    // Retrieve audit trail for CER-2026-0001
    const auditRows = await service.getAuditTrail("CER-2026-0001");
    const amountChanges = auditRows.filter((r) => r.field_name === "amount");
    expect(amountChanges.length).toBeGreaterThanOrEqual(1);
    expect(amountChanges[0].old_value).toBe(String(originalAmount));
    expect(amountChanges[0].new_value).toBe("16000000");
    expect(amountChanges[0].field_desc).toBe(AUDIT_FIELD_DESCRIPTIONS.amount);

    // Verify no excluded technical fields exist in audit
    for (const row of auditRows) {
      expect(EXCLUDED_AUDIT_FIELDS.has(row.field_name)).toBe(false);
    }
  });

  // TC-08 & TC-09: Workflow Transitions & Multilevel Progression (FR-05)
  test("FR-05: Advances from L1 to L2, then L3 to Approved, recording decisions", async () => {
    const cerprno = "CER-2026-0001";
    const proposal = await service.getProposalByNumber(cerprno);
    expect(proposal).not.toBeNull();
    if (!proposal) return;

    // Approve L2
    const l2Decision = await service.recordDecision({
      cerprno,
      level_id: 2,
      approver_name: "Sunil Verma",
      approver_email: "sunil.verma@vedanta.co.in",
      decision: "APPROVED",
      comments: "Financial models verified.",
    });

    expect(l2Decision.success).toBe(true);
    expect(l2Decision.nextLevel).toBe(3);

    // Approve L3 (Final level)
    const l3Decision = await service.recordDecision({
      cerprno,
      level_id: 3,
      approver_name: "Ananya Deshmukh",
      approver_email: "ananya.deshmukh@vedanta.co.in",
      decision: "APPROVED",
      comments: "Final VP approval granted.",
    });

    expect(l3Decision.success).toBe(true);
    expect(l3Decision.newStatus).toBe("Approved");

    const finalProposal = await service.getProposalByNumber(cerprno);
    expect(finalProposal?.status).toBe("Approved");
  });

  // TC-10 & TC-11: Remarks Versioning (FR-08)
  test("FR-08: Remarks edits increment version history with author and timestamp", async () => {
    const cerprno = "CER-2026-0001";
    const initialVersions = await service.getRemarksHistory(cerprno);
    const initialCount = initialVersions.length;

    const proposal = await service.getProposalByNumber(cerprno);
    expect(proposal).not.toBeNull();
    if (!proposal) return;

    const newRemarks = "Updated justification: Reservoir pressure dynamics necessitate immediate expansion in Q3.";
    await service.updateProposal(
      { ...proposal, remarks: newRemarks },
      { name: "Shiven Pandit", email: "shiven.pandit@vedanta.co.in" }
    );

    const updatedVersions = await service.getRemarksHistory(cerprno);
    expect(updatedVersions.length).toBe(initialCount + 1);
    expect(updatedVersions[0].remarks_text).toBe(newRemarks);
    expect(updatedVersions[0].created_by).toBe("Shiven Pandit");
  });

  // BR-04: SBU Updates
  test("BR-04: SBU options contain RJ North and RJ South, and omit legacy RJ01", () => {
    expect(SBU_OPTIONS).toContain("RJ North");
    expect(SBU_OPTIONS).toContain("RJ South");
    expect(SBU_OPTIONS).not.toContain("RJ01");
    expect(SBU_OPTIONS).not.toContain("RJ Oil & Gas");
  });

  // BR-07: Category Definitions
  test("BR-07: Category definitions exist for Vital, Essential, and Desirable", () => {
    expect(CATEGORY_DEFINITIONS.Vital.label).toBe("Vital");
    expect(CATEGORY_DEFINITIONS.Vital.description).toContain("cannot be postponed");

    expect(CATEGORY_DEFINITIONS.Essential.label).toBe("Essential");
    expect(CATEGORY_DEFINITIONS.Essential.description).toContain("smooth running");

    expect(CATEGORY_DEFINITIONS.Desirable.label).toBe("Desirable");
    expect(CATEGORY_DEFINITIONS.Desirable.description).toContain("can be deferred");
  });
});
