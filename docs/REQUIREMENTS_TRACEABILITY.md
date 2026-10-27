# Requirements & Business Rules Specification

Source Reference: `Requireemnt Doc V1.docx`

---

## 1. Functional Requirements (FR)

| Req ID | Requirement | Description & Behavior | Acceptance Criteria |
| :--- | :--- | :--- | :--- |
| **FR-01** | **Create CER Proposal** | Initiator completes project details, financials, budget, JV, phasing, cost breakdown, remarks, and uploads attachments. Generates unique `CER-YYYY-XXXX` proposal number. Triggers Level-1 approval on submit. | Saved to `CER_Proposals`; status set to `In Approval`; Level 1 approval task assigned. |
| **FR-02** | **Change / Edit CER** | Mandatory proposal number lookup. Compares prior vs updated state. Computes field-level deltas. Preserves immutable audit trail. Resets status to `In Approval` and restarts workflow from Level 1. | Blank input rejected; modified fields logged in `CER_AuditTrail`; remarks revision logged in `CER_RemarksHistory`. |
| **FR-03** | **Display CER** | High-fidelity read-only view. Prominently indicates active pending approval stage, approval history stepper, attachments list, and print/export actions. | Read-only view matches proposal fields; pending approver role/email clearly surfaced. |
| **FR-04** | **CER Reporting & Analytics** | Multi-parameter filtering: Proposal No., Project Name, Status, Category, SBU, Date Range. Direct export to Excel with formula sanitization. | Filtered results match search; Excel spreadsheet generated with business headers. |
| **FR-05** | **Configurable Approval Workflow** | Sequential multi-level approval pipeline. Approvers submit `APPROVED` or `REJECTED` decision with comments. Automated notifications dispatched to Creator, Prior Approvers, and Next Approver. | Decisions logged in `CER_ApprovalDecisions`; final stage transitions status to `Approved`; rejection transitions status to `Rejected`. |
| **FR-06** | **Field-Level Audit Trail** | Evaluates old vs new values on edit. Captures Proposal No., Field Name, Business Description, Old Value, New Value, User, Date, and Time. System metadata (`Created`, `Modified`, `USRID`) excluded. | Exactly one audit row per modified business field logged to `CER_AuditTrail`. |
| **FR-07** | **Audit Trail Diff Viewer** | Interactive audit table. Clicking a `remarks` or `remarks_jv` change opens a modal dialog displaying before-and-after text comparison. | Modal displays old vs new long-text comparison clearly. |
| **FR-08** | **Remarks Versioning** | Narrative remarks enforced within 350–400 word threshold. Each unique text revision creates a numbered version entry (`v1`, `v2`...) with word count and timestamp. | Only saved when remarks text actually changes; historical revisions preserved in `CER_RemarksHistory`. |
| **FR-09** | **PDF Document Export** | Generates professional vector PDF matching official corporate CER layout: header branding, financial benefits, phasing table, cost breakdown, and approval history trail. | PDF generated with naming format `<CERPRNO>_<date>_<time>.pdf`. |
| **FR-10** | **Excel Export** | Formatted spreadsheet export. Sanitizes formula-injection characters (`=`, `+`, `-`, `@`) in text cells. | Excel file downloads cleanly without spreadsheet security warnings. |

---

## 2. Business Rules & Governance (BR)

| Rule ID | Rule Title | Specification |
| :--- | :--- | :--- |
| **BR-01** | **Proposal Number Uniqueness** | `cerprno` format is `CER-YYYY-XXXX`. Editable during draft creation, but permanently locked upon workflow submission. |
| **BR-02** | **Post-Approval Revisions** | Approved proposals can be revised by the owner, but the proposal number remains unchanged. Editing resets status to `In Approval` and restarts sequential approval at Level 1. |
| **BR-03** | **Multi-Format File Attachments** | Supports PDF, Word (.docx), Excel (.xlsx), and Images (.jpg, .png). Up to 10 MB per file, 20 MB total per CER. Fully accessible to approvers during review. |
| **BR-04** | **SBU Naming Standards** | Active Strategic Business Units: `RJ North`, `RJ South`, `CBOS`, `RAVA`. Legacy `RJ01` and `RJ Oil & Gas` are decommissioned. |
| **BR-05** | **Multiple Authorized Creators** | Any employee with the `Initiator` or `Admin` role can create a CER proposal. Proposal ownership is attributed to `owname` / `owner_email`. |
| **BR-06** | **Dynamic Workflow Hierarchy** | Workflow administrators can add, delete, activate/deactivate, and reorder approval stages dynamically via the Admin Console. Changes synchronize to `CER_WorkflowLevels`. |
| **BR-07** | **Category Definitions** | Categories: `Vital`, `Essential`, `Desirable`. Form displays definitions: Vital (safety/legal mandate), Essential (direct production/revenue impact), Desirable (operational enhancement). |
| **BR-08** | **Segregation of Duties (SoD)** | An approver is strictly prohibited from approving their own CER proposal. The system blocks self-approval attempts. |

---

## 3. Indian Fiscal Year Phasing Standards

Expenditure phasing conforms to the Indian Fiscal Year cycle (**April 1 to March 31**):

| Calendar Date of Proposal | Past Actuals Column | Current FY Column | Future Projections Column |
| :------------------------ | :------------------ | :---------------- | :------------------------ |
| **Apr 1, 2026 – Mar 31, 2027** | `Till Mar'26` | `FY 26-27` | `Beyond FY'27` |
| **Apr 1, 2027 – Mar 31, 2028** | `Till Mar'27` | `FY 27-28` | `Beyond FY'28` |
| **Apr 1, 2028 – Mar 31, 2029** | `Till Mar'28` | `FY 28-29` | `Beyond FY'29` |

- Phasing rows: `Production` (mmbbls), `CAPEX` ($mm), `OPEX` ($mm).
- Column labels are auto-generated dynamically at proposal creation and persisted in `ph_till_label`, `ph_fy_label`, `ph_beyond_label`.

---

## 4. Role-Based Access Control (RBAC) Matrix

| Capability | Initiator | Approver | Finance / Audit | Admin |
| :--- | :---: | :---: | :---: | :---: |
| Create CER Proposal | ✅ | ❌ | ❌ | ✅ |
| Edit Own Proposal (Draft / Rejected / Post-Approval) | ✅ | ❌ | ❌ | ✅ |
| View "My Proposals" | ✅ | ✅ | ✅ | ✅ |
| View "All Proposals" & Reports | ❌ | ❌ | ✅ | ✅ |
| Approve / Reject Assigned Stage | ❌ | ✅ | ❌ | ✅ |
| Configure Approval Stages (`CER_WorkflowLevels`) | ❌ | ❌ | ❌ | ✅ |
| Manage User Roles (`CER_UserRoles`) | ❌ | ❌ | ❌ | ✅ |
| Export Reports to Excel / PDF | ✅ (own) | ✅ (assigned) | ✅ (all) | ✅ (all) |
