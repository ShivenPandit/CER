# SPX — Capital Expenditure Request Management System (CER)
## Test Plan & Verification Strategy

### 1. Test Strategy Overview

The testing strategy validates the end-to-end functional behavior, business logic accuracy, security controls, document generation, and responsive presentation of the SPX CER Management System.

---

### 2. Test Case Suite

| Test Case ID | Target Feature / FR | Test Scenario & Input Conditions | Expected Outcome | Verification Status |
| :--- | :--- | :--- | :--- | :--- |
| **TC-01** | FR-01 Proposal Creation | Fill all required project, financial, budget, JV, phasing, and cost fields. Submit form. | Proposal saved; unique `CERPRNO` generated; workflow initialized at L1; success message displayed. | Automated / Manual |
| **TC-02** | FR-01 Cost Breakdown Summation | Enter values in Engineering, Site Facilities, Commissioning, Pre-op, Others. | Total automatically updates and matches sum of components exactly. | Automated / Manual |
| **TC-03** | FR-01 Remarks Word Limitation | Enter remarks text exceeding 400 words. | Visual word count indicator warns user; submission prevents overflow or flags advisory. | Automated / Manual |
| **TC-04** | FR-02 Change Validation | Open Change CER view with empty proposal number. | Triggers mandatory validation: *"Make an entry in mandatory field 'CER Proposal No.'"*. | Automated / Manual |
| **TC-05** | FR-02 Delta Audit Generation | Load existing CER, change `AMOUNT` from 500,000 to 650,000 and `BEN_NPV` from 1.2 to 1.8. Save. | Exactly 2 audit rows created for `AMOUNT` and `BEN_NPV`; old/new values recorded; technical fields excluded. | Automated / Manual |
| **TC-06** | FR-03 Display Proposal | Open CER in display mode. | All sections shown in read-only mode; pending approval level badge accurately indicates active approver. | Automated / Manual |
| **TC-07** | FR-04 Reporting & Filtering | Filter proposals by Category="Vital" and Status="Pending Approval". | Only matching proposals rendered; count matches active dataset; export to Excel generates spreadsheet. | Automated / Manual |
| **TC-08** | FR-05 Multilevel Approval | Approver logs in, navigates to "Pending Approvals", reviews proposal with attachments, submits approval. | Proposal transitions from L1 to L2; notification dispatched to Creator, Prior Approvers, Next Approver. | Automated / Manual |
| **TC-09** | FR-05 Rejection Flow | Approver rejects proposal with mandatory comments. | Proposal status set to "Rejected"; returned to initiator; reason recorded in decision history. | Automated / Manual |
| **TC-10** | FR-07 Audit Log & Remarks Diff | Click "Display Text" on a `REMARKS` audit row. | Modal popup displays side-by-side or previous vs current long remarks text cleanly. | Automated / Manual |
| **TC-11** | FR-08 Remarks Versioning | Edit remarks text in an existing CER and save twice (once with identical text, once with updated text). | Only the modification with changed content increments version number in `CER_REMARKS_HISTORY`. | Automated / Manual |
| **TC-12** | FR-09 PDF Download | Click "Download PDF" on proposal screen. | Formatted PDF generated with file name `<CERPRNO>_<date>_<time>.pdf` containing tables and approval history. | Automated / Manual |
| **TC-13** | FR-10 Excel Export | Export CER proposal to Excel. | File downloaded; headers correspond to business fields; formula injection characters sanitized. | Automated / Manual |
| **TC-14** | BR-04 SBU Field Validation | Open SBU dropdown. | Displays "RJ North" and "RJ South"; legacy "RJ Oil & Gas" and "RJ01" are omitted. | Automated / Manual |
| **TC-15** | BR-06 Workflow Admin | Add a new approval level in Workflow Configuration. | New level persists; subsequent proposals follow the updated multi-tier sequence. | Automated / Manual |

---

### 3. Acceptance Criteria Verification Checklist
- [x] CER proposal can be created and workflow task is generated.
- [x] Changing a proposal writes one audit row per modified field (excluding technical metadata).
- [x] Remarks changes create versioned entries and appear in the audit trail with modal inspection.
- [x] PDF and Excel downloads generate successfully for existing proposals.
- [x] Blank proposal number in Change / Display mode triggers the exact specified error message.
- [x] SBU options updated and Category definitions clearly visible.
