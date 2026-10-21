# Capital Expenditure Request Management System (CER)
## Requirements Traceability Matrix (RTM)

This document establishes the bidirectional traceability between the source requirements (`Requireemnt Doc V1.docx`), system specifications, technical implementations, and testable acceptance criteria.

---

### Category A: Explicitly Documented Functional Requirements

| Req ID | Requirement Title | Source Ref | Description & Expected Behavior | Affected Modules | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **FR-01** | Create CER Proposal | Doc §6 FR-01 | Initiator fills all project, financial, budget, JV, phasing, cost breakdown, and remarks details. Concurrency-safe unique proposal number generated. Workflow triggered on save. | Module 1 (Create CER), Module 5 (Workflow) | Proposal saved with unique ID; Level-1 approval task generated; success message: *"CER Proposal No. has been created and sent for approval"* displayed. |
| **FR-02** | Change CER Proposal | Doc §6 FR-02 | User enters proposal number. Mandatory field validation. If blank, shows message: *"Make an entry in mandatory field 'CER Proposal No.'"*. Form populates with existing values. Delta comparison executed. Workflow re-triggered. | Module 2 (Change CER), Module 6 (Audit Trail) | Blank input rejected; valid proposal retrieved; modified fields recorded in audit trail; success message: *"CER Proposal No. has been changed and sent for approval"* displayed. |
| **FR-03** | Display CER Proposal | Doc §6 FR-03 | Read-only inspection of proposal, current pending approval level, full approval timeline, attachments, PDF/Excel actions. | Module 3 (Display CER) | All proposal sections displayed read-only; current pending level clearly highlighted; download actions available. |
| **FR-04** | CER Reporting & Analysis | Doc §6 FR-04 | Search by proposal no., project name, filter by status, category, owner, SBU, date range. Sort and paginate results. Export to Excel. | Module 4 (Reports) | Filtered tabular results match query parameters; empty state shown if no records found; Excel export succeeds. |
| **FR-05** | Configurable Approval Workflow & Notifications | Doc §6 FR-05, Doc §8 #3, #4, #12 | Multilevel workflow with dynamic approver assignment. Notification engine sends email with details & attachments to Creator, Previous Approvers, and Next Approver. | Module 5 (Approval Workflow), Notification Engine | Pending tasks displayed in "Pending Approvals"; decisions update proposal status; immutable audit trail of decisions recorded. |
| **FR-06** | Field-Level Audit Trail | Doc §6 FR-06 | Dynamic comparison between old and new proposal states. Captures Proposal ID, Field Name, Field Description, Old Value, New Value, User, Date, Time. Excludes technical fields (`CREATED_DATE`, `USRID`, etc.). | Module 6 (Audit Trail) | Only genuinely changed fields logged; correct business descriptions mapped; technical fields excluded. |
| **FR-07** | Audit Log Display & Remarks Popup | Doc §6 FR-07 | Display audit log in sorted grid (Proposal, Date, Time). Double-click or click on `REMARKS` / `REMARKS_JV` rows opens detailed long-text diff modal. | Module 6 (Audit Trail), Module 7 (Long Remarks) | Audit rows displayed with proper formatting; long text changes viewable in modal; empty state displayed when no changes exist. |
| **FR-08** | Long Remarks Versioning | Doc §6 FR-08, Doc §8 #13 | Business remarks support 350–400 word limit. Historical versions preserved timestamped. Only saved when content changes. | Module 7 (Long Remarks) | Remarks enforce word count; each edit creates an immutable historical version; history can be inspected. |
| **FR-09** | PDF Document Generation | Doc §6 FR-09, Doc §8 #5 | Generate formatted CER PDF document containing all project fields, cost breakdown, phasing, remarks, and approval trail. | Module 8 (PDF Generation) | PDF generated with filename `<CERPRNO>_<date>_<time>.pdf`; professional layout with tables and header/footer. |
| **FR-10** | Excel-Compatible Export | Doc §6 FR-10, Doc §8 #5 | Export proposal details with business-friendly column headers, proper numeric/date types, and CSV/XLS formula-injection sanitization. | Module 9 (Excel Export) | Download file contains all standard business columns; formulas sanitized; download cancellation handled gracefully. |

---

### Category B: Explicitly Documented Business Rules & Enhancements

| Req ID | Requirement Title | Source Ref | Description & Expected Behavior | Affected Modules | Acceptance Criteria |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **BR-01** | Editable CER Proposal Number & Carry-Forward | Doc §8 #1, #2 | CER proposal number can be specified or edited during creation/carry-forward while ensuring system uniqueness. | Module 1, Module 2 | Custom proposal number validated against existing numbers; uniqueness enforced. |
| **BR-02** | Post-Approval Revisions | Doc §8 #7 | CER proposal can be revised after final approval, but the CER proposal number must remain unchanged. | Module 2 (Change CER), Module 5 (Workflow) | Approved proposal can undergo revision; proposal number is locked; status resets to "Revised" / re-enters approval. |
| **BR-03** | Multiple Attachments with Full Format Support | Doc §8 #8, #14 | CER supports multiple file attachments of all business types (PDF, Word, Excel, Images). Visible to approvers during review. | Module 10 (Attachments), Module 5 (Workflow) | Multiple files can be attached, downloaded, and previewed during approval. |
| **BR-04** | SBU Field Modifications | Doc §8 #9 | Rename "RJ Oil & Gas" to "RJ North" and "RJ South". Remove "RJ01" option. | Module 1, Module 2, Module 4 | SBU dropdown options display "RJ North" and "RJ South"; "RJ01" and legacy "RJ Oil & Gas" are absent. |
| **BR-05** | Multiple Creators Support | Doc §8 #10 | System allows any authorized creator within the organization to initiate a CER. | Module 1, Security Layer | Different logged-in users can initiate proposals; ownership tracked in `OWNAME` / `CREATED_BY`. |
| **BR-06** | Flexible Approval Hierarchy | Doc §8 #11 | Provision to add or delete approval levels in the workflow configuration. | Admin / Workflow Configuration | Workflow administrator can add/remove levels and reorder approval steps. |
| **BR-07** | Category Dropdown & Definitions | Doc §8 #12, §9 | Category dropdown values: `Vital`, `Essential`, `Desirable`. Clear explanatory definitions provided at the end of the form. | Module 1, Module 2, Module 3 | Dropdown contains exactly Vital, Essential, Desirable; definitions rendered cleanly in helper card/tooltip. |
| **BR-08** | Approval Status Visibility | Doc §8 #15 | The display and detail screens must clearly indicate the current pending approval level. | Module 3, Module 5 | Active level (e.g., "Pending L2 - Finance Head") prominently displayed in status badge. |

---

### Category C: Recommended Technical Improvements

| Rec ID | Technical Improvement | Rationale & Architectural Design |
| :--- | :--- | :--- |
| **TI-01** | Dual Persistence Provider (SPFx REST + Local Storage Mock) | Enables zero-friction local development, instant testing, and browser automated validation while providing SharePoint Online REST list integration. |
| **TI-02** | Anti-Tamper Audit Trail Hash | Protects audit records from client-side tampering by computing record checksums. |
| **TI-03** | Formula Injection Sanitization (CSV/XLS) | Sanitizes text fields starting with `=`, `+`, `-`, `@` to prevent spreadsheet code execution upon opening. |
| **TI-04** | Real-time Word Counter for Remarks | In-form counter showing 350–400 word threshold with warning when exceeding limit. |
| **TI-05** | Dynamic Cost Phasing Summation | Auto-calculates totals across Engineering, Site Facilities, Commissioning, Pre-op, Others, and matches against CAPEX/OPEX phasing. |
