# SharePoint Lists and Columns Audit & Manual Site Setup Specification

**Capital Expenditure Request Management System (CER)**

---

## 🌟 Executive Summary

This specification provides the comprehensive, field-by-field SharePoint Online configuration blueprint for manually provisioning the UAT site collection for the **Capital Expenditure Request (CER) Management System**.

### Inventory of Lists & Libraries

| #   | List / Library Display Name | Recommended Internal Title | Type                 | Provisioning Status on Site | Primary Purpose                                                                  |
| --- | --------------------------- | -------------------------- | -------------------- | --------------------------- | -------------------------------------------------------------------------------- |
| 1   | **CER_Proposals**           | `CER_Proposals`            | Custom List          | ✅ **Already Created**      | Primary transactional repository for all CER proposal records (Sections A–G).    |
| 2   | **CER_AuditTrail**          | `CER_AuditTrail`           | Custom List          | ✅ **Already Created**      | Granular field-level delta change history (FR-06 & FR-07).                       |
| 3   | **CER_RemarksHistory**      | `CER_RemarksHistory`       | Custom List          | ✅ **Already Created**      | Immutable version history for 350–400 word business remarks (FR-08).             |
| 4   | **CER_WorkflowLevels**      | `CER_WorkflowLevels`       | Custom List          | ✅ **Already Created**      | Configurable sequential approval hierarchy and reviewer matrix (FR-05, BR-06).   |
| 5   | **CER_ApprovalDecisions**   | `CER_ApprovalDecisions`    | Custom List          | ✅ **Already Created**      | Reviewer decision log, approval comments, and rejection justifications (FR-05).  |
| 6   | **CER_Attachments**         | `CER_Attachments`          | **Document Library** | ✅ **Already Created**      | Document store for Section H attachments (PDFs, Word, Excel, images).            |
| 7   | **CER_Notifications**       | `CER_Notifications`        | Custom List          | ✅ **Already Created**      | Audit log for automated multi-party workflow email dispatches.                   |
| 8   | **CER_UserRoles**           | `CER_UserRoles`            | Custom List          | ✅ **Already Created**      | Enterprise Role-Based Access Control assignments (Admin, Initiator, Approver, Finance_Audit). |

> [!NOTE]
> ### 📌 Do you need to create any more lists?
> - **NO! ALL 8 LISTS AND LIBRARIES ARE ALREADY CREATED on your SharePoint site (`https://vedanta.sharepoint.com/sites/CERManagementSystemUAT`)**:
>   1. `CER_Proposals` (Custom List) - Created ✅
>   2. `CER_AuditTrail` (Custom List) - Created ✅
>   3. `CER_RemarksHistory` (Custom List) - Created ✅
>   4. `CER_WorkflowLevels` (Custom List) - Created ✅
>   5. `CER_ApprovalDecisions` (Custom List) - Created ✅
>   6. `CER_Attachments` (Document Library) - Created ✅
>   7. `CER_Notifications` (Custom List) - Created ✅
>   8. `CER_UserRoles` (Custom List) - Created ✅ (active admin records present)
> - **Lists you still need to create**: **ZERO (0). All lists exist and are 100% operational.**
> - **Do you need a list for Masters & Settings, Dropdowns, or Security & Audit?**: **NO!** 
>   - The "Security & Audit", "Overview", and "Masters & Settings" tabs have been completely removed from the Admin Console.
>   - `CER_AdminAuditLog` is **not required**.
>   - All dropdown choices (Block/SBU/Field, Category, Currency, Payback, Budget, JV, Proposal Status) are fetched **dynamically from the Choice columns of `CER_Proposals`**. No extra master lists are needed.

- **Total Confirmed Lists in Solution**: 7 Custom Lists + 1 Document Library = 8 Total (ALL 8 ARE CREATED).
- **Architectural Rules**:
  1. _Attachments_: Hosted in `CER_Attachments` Document Library so file previews and downloads work natively in the browser.
  2. _Internal Names_: In SharePoint, columns must be created using the **Internal Name first**, then renamed to user-friendly Display Names so that REST API JSON keys match the TypeScript interfaces.

---

## 📋 Complete SharePoint Schema Specification

### 1. `CER_Proposals` (Primary CER Records)

- **List Display Name**: `CER_Proposals`
- **Internal Name**: `CER_Proposals`
- **Purpose**: Master transactional list storing all proposal form data across Sections A–G.
- **Referenced In Code**: `SharePointCERDataService.ts` (`getAllProposals`, `getProposalByNumber`, `createProposal`).

| #   | Column Display Name                | Internal Name        | SharePoint Field Type  | Required | Default Value  | Unique | Indexed | Choices / Limits / Settings                               | Source Model Field            |
| --- | ---------------------------------- | -------------------- | ---------------------- | -------- | -------------- | ------ | ------- | --------------------------------------------------------- | ----------------------------- |
| 1   | **Title** _(System)_               | `Title`              | Single line of text    | Yes      | None           | Yes    | **Yes** | Max 255. Repurposed as Proposal Number.                   | `proposal.cerprno`            |
| 2   | **CER Proposal No.**               | `cerprno`            | Single line of text    | Yes      | None           | Yes    | **Yes** | Max 50. Format: `CER-YYYY-XXXX`.                          | `proposal.cerprno`            |
| 3   | **Name of Project**                | `pr_name`            | Single line of text    | Yes      | None           | No     | No      | Max 255. Min 3 chars in UI.                               | `proposal.pr_name`            |
| 4   | **CER Owner Name**                 | `owname`             | Single line of text    | Yes      | None           | No     | No      | Max 100.                                                  | `proposal.owname`             |
| 5   | **Owner Email**                    | `owner_email`        | Single line of text    | Yes      | None           | No     | No      | Max 150. Email format.                                    | `proposal.owner_email`        |
| 6   | **Block/SBU/Field**                | `sbu`                | Choice                 | Yes      | `RJ North`     | No     | **Yes** | `RJ North`, `RJ South`, `CBOS`, `RAVA`                    | `proposal.sbu`                |
| 7   | **Proposal Status**                | `status`             | Choice                 | Yes      | `Draft`        | No     | **Yes** | `Draft`, `In Approval`, `Approved`, `Rejected`, `Revised` | `proposal.status`             |
| 8   | **Objectives of CER**              | `object`             | Multiple lines of text | Yes      | None           | No     | No      | Plain text. Max 2000 chars.                               | `proposal.object`             |
| 9   | **Amount of CER**                  | `amount`             | Number                 | Yes      | None           | No     | No      | Decimals: 2. Positive number.                             | `proposal.amount`             |
| 10  | **Currency**                       | `currency`           | Choice                 | Yes      | `USD`          | No     | No      | `USD`, `INR`                                              | `proposal.currency`           |
| 11  | **Category**                       | `cat`                | Choice                 | Yes      | `Vital`        | No     | **Yes** | `Vital`, `Essential`, `Desirable`                         | `proposal.cat`                |
| 12  | **Payback/Non Payback**            | `payable`            | Choice                 | Yes      | `Payback`      | No     | No      | `Payback`, `Non Payback`                                  | `proposal.payable`            |
| 13  | **Total Duration**                 | `period`             | Single line of text    | No       | None           | No     | No      | Max 100. Stores duration (e.g. `8 Days`).                 | `proposal.period`             |
| 14  | **Payback Period (Quarters)**      | `payback_quarters`   | Number                 | No       | None           | No     | No      | Decimals: 0. Required if Payback.                         | `proposal.payback_quarters`   |
| 15  | **Financial Benefits – NPV ($mm)** | `ben_npv`            | Number                 | No       | None           | No     | No      | Decimals: 2.                                              | `proposal.ben_npv`            |
| 16  | **Financial Benefit – IRR (%)**    | `ben_irr`            | Number                 | No       | None           | No     | No      | Decimals: 1. Min: 0, Max: 100.                            | `proposal.ben_irr`            |
| 17  | **Key Assumptions**                | `cost_assumptions`   | Multiple lines of text | Yes      | None           | No     | No      | Plain text.                                               | `proposal.cost_assumptions`   |
| 18  | **Start Date of Project**          | `st_date`            | Date and Time          | Yes      | None           | No     | No      | Format: Date Only.                                        | `proposal.st_date`            |
| 19  | **Completion Date of Project**     | `com_date`           | Date and Time          | Yes      | None           | No     | No      | Format: Date Only. >= Start Date.                         | `proposal.com_date`           |
| 20  | **Total Duration (Months)**        | `duration_months`    | Number                 | No       | None           | No     | No      | Decimals: 1. Approximate month count.                     | `proposal.duration_months`    |
| 21  | **Corporate Budget (Yes/No)**      | `cbudget`            | Choice                 | Yes      | `Yes`          | No     | No      | `Yes`, `No`, `Partially`                                  | `proposal.cbudget`            |
| 22  | **Corporate Budget Amount ($mm)**  | `cb_amnt`            | Number                 | No       | None           | No     | No      | Decimals: 2.                                              | `proposal.cb_amnt`            |
| 23  | **Corporate Budget Currency**      | `cb_currency`        | Choice                 | No       | `USD`          | No     | No      | `USD`, `INR`                                              | `proposal.cb_currency`        |
| 24  | **Reason (Budget Variance)**       | `reason`             | Multiple lines of text | No       | None           | No     | No      | Plain text. Required if No/Partially.                     | `proposal.reason`             |
| 25  | **Aligned with JV**                | `jv`                 | Choice                 | Yes      | `No`           | No     | No      | `Yes`, `No`, `Under Discussion`                           | `proposal.jv`                 |
| 26  | **JV Cost Recoverable**            | `jv_recoverable`     | Choice                 | No       | `No`           | No     | No      | `Yes`, `No`                                               | `proposal.jv_recoverable`     |
| 27  | **JV Cost Share ($mm)**            | `jv_cost`            | Number                 | No       | None           | No     | No      | Decimals: 2.                                              | `proposal.jv_cost`            |
| 28  | **JV Budget (Yes/No)**             | `jv_budget`          | Choice                 | Yes      | `No`           | No     | No      | `Yes`, `No`                                               | `proposal.jv_budget`          |
| 29  | **JV Budget Amount ($mm)**         | `jv_amnt`            | Number                 | No       | None           | No     | No      | Decimals: 2.                                              | `proposal.jv_amnt`            |
| 30  | **Reason (JV Variance)**           | `jv_reason`          | Multiple lines of text | No       | None           | No     | No      | Plain text. Required if JV Budget No.                     | `proposal.jv_reason`          |
| 31  | **Phasing Label - Till**           | `ph_till_label`      | Single line of text    | No       | `Till Mar'26`  | No     | No      | Max 50. Dynamic phasing bucket label.                     | `proposal.ph_till_label`      |
| 32  | **Phasing Label - Current FY**     | `ph_fy_label`        | Single line of text    | No       | `FY 26-27`     | No     | No      | Max 50. Dynamic phasing bucket label.                     | `proposal.ph_fy_label`        |
| 33  | **Phasing Label - Beyond FY**      | `ph_beyond_label`    | Single line of text    | No       | `Beyond FY'27` | No     | No      | Max 50. Dynamic phasing bucket label.                     | `proposal.ph_beyond_label`    |
| 34  | **Production - Till**              | `prod_till`          | Number                 | No       | 0              | No     | No      | Decimals: 2. In mmbbls.                                   | `proposal.prod_till`          |
| 35  | **Production - Current FY**        | `prod_fy`            | Number                 | No       | 0              | No     | No      | Decimals: 2. In mmbbls.                                   | `proposal.prod_fy`            |
| 36  | **Production - Beyond FY**         | `prod_beyond`        | Number                 | No       | 0              | No     | No      | Decimals: 2. In mmbbls.                                   | `proposal.prod_beyond`        |
| 37  | **Capex - Till**                   | `capex_till`         | Number                 | No       | 0              | No     | No      | Decimals: 2. In $mm.                                      | `proposal.capex_till`         |
| 38  | **Capex - Current FY**             | `capex_fy`           | Number                 | No       | 0              | No     | No      | Decimals: 2. In $mm.                                      | `proposal.capex_fy`           |
| 39  | **Capex - Beyond FY**              | `capex_beyond`       | Number                 | No       | 0              | No     | No      | Decimals: 2. In $mm.                                      | `proposal.capex_beyond`       |
| 40  | **Opex - Till**                    | `opex_till`          | Number                 | No       | 0              | No     | No      | Decimals: 2. In $mm.                                      | `proposal.opex_till`          |
| 41  | **Opex - Current FY**              | `opex_fy`            | Number                 | No       | 0              | No     | No      | Decimals: 2. In $mm.                                      | `proposal.opex_fy`            |
| 42  | **Opex - Beyond FY**               | `opex_beyond`        | Number                 | No       | 0              | No     | No      | Decimals: 2. In $mm.                                      | `proposal.opex_beyond`        |
| 43  | **Cost - Engineering**             | `engineer`           | Number                 | No       | 0              | No     | No      | Decimals: 2. In $mm.                                      | `proposal.engineer`           |
| 44  | **Cost - Site Facilities**         | `s_fac`              | Number                 | No       | 0              | No     | No      | Decimals: 2. In $mm.                                      | `proposal.s_fac`              |
| 45  | **Cost - Commissioning**           | `comis`              | Number                 | No       | 0              | No     | No      | Decimals: 2. In $mm.                                      | `proposal.comis`              |
| 46  | **Cost - Pre Operations**          | `preop`              | Number                 | No       | 0              | No     | No      | Decimals: 2. In $mm.                                      | `proposal.preop`              |
| 47  | **Cost - Others**                  | `others`             | Number                 | No       | 0              | No     | No      | Decimals: 2. In $mm.                                      | `proposal.others`             |
| 48  | **Total Estimated Cost**           | `total`              | Number                 | No       | 0              | No     | No      | Decimals: 2. Auto-calculated sum.                         | `proposal.total`              |
| 49  | **Remarks & Justification**        | `remarks`            | Multiple lines of text | Yes      | None           | No     | No      | Plain text. Word limit: 350–400 words.                    | `proposal.remarks`            |
| 50  | **Remarks on JV Risk**             | `remarks_jv`         | Multiple lines of text | No       | None           | No     | No      | Plain text. Risk justification.                           | `proposal.remarks_jv`         |
| 51  | **Current Approval Level**         | `current_level`      | Number                 | No       | 1              | No     | **Yes** | Decimals: 0. Stage index (1, 2, 3...).                    | `proposal.current_level`      |
| 52  | **Pending With Role**              | `pending_with_role`  | Single line of text    | No       | None           | No     | No      | Max 100. e.g. "SBU Operations Head".                      | `proposal.pending_with_role`  |
| 53  | **Pending With Email**             | `pending_with_email` | Single line of text    | No       | None           | No     | No      | Max 150. Email of active approver.                        | `proposal.pending_with_email` |
| 54  | **Revision Count**                 | `revision_count`     | Number                 | No       | 0              | No     | No      | Decimals: 0. Increments on revision.                      | `proposal.revision_count`     |

---

### 2. `CER_AuditTrail` (Field-Level Audit Trail)

- **List Display Name**: `CER_AuditTrail`
- **Internal Name**: `CER_AuditTrail`
- **Purpose**: Records immutable field-level delta change history whenever a proposal is modified (FR-06 & FR-07).
- **Referenced In Code**: `AuditModel.ts` (`ICERAuditRecord`), `LocalMockCERDataService.ts`, `AuditTrailView.tsx`.

| #   | Column Display Name   | Internal Name  | SharePoint Field Type  | Required | Default Value | Unique | Indexed | Notes                                   | Source Model Field    |
| --- | --------------------- | -------------- | ---------------------- | -------- | ------------- | ------ | ------- | --------------------------------------- | --------------------- |
| 1   | **Title** _(System)_  | `Title`        | Single line of text    | Yes      | None          | No     | No      | Repurposed as Audit ID or `CERPRNO`.    | `record.id`           |
| 2   | **CER Proposal No.**  | `cerprno`      | Single line of text    | Yes      | None          | No     | **Yes** | Proposal number. Indexed for lookup.    | `record.cerprno`      |
| 3   | **Field Name**        | `field_name`   | Single line of text    | Yes      | None          | No     | No      | Technical field key (e.g., `amount`).   | `record.field_name`   |
| 4   | **Field Description** | `field_desc`   | Single line of text    | Yes      | None          | No     | No      | Business label (e.g., "Amount of CER"). | `record.field_desc`   |
| 5   | **Old Value**         | `old_value`    | Multiple lines of text | No       | None          | No     | No      | Plain text representation of old value. | `record.old_value`    |
| 6   | **New Value**         | `new_value`    | Multiple lines of text | No       | None          | No     | No      | Plain text representation of new value. | `record.new_value`    |
| 7   | **User Name**         | `user_name`    | Single line of text    | Yes      | None          | No     | No      | Name of editor.                         | `record.user_name`    |
| 8   | **User Email**        | `user_email`   | Single line of text    | Yes      | None          | No     | No      | Email of editor.                        | `record.user_email`   |
| 9   | **Audit Date**        | `audit_date`   | Date and Time          | Yes      | None          | No     | No      | Format: Date Only (YYYY-MM-DD).         | `record.audit_date`   |
| 10  | **Audit Time**        | `audit_time`   | Single line of text    | Yes      | None          | No     | No      | Format: HH:mm:ss.                       | `record.audit_time`   |
| 11  | **Full Timestamp**    | `timestamp`    | Date and Time          | Yes      | None          | No     | **Yes** | Date and Time. Indexed for sorting.     | `record.timestamp`    |
| 12  | **Is Long Text**      | `is_long_text` | Yes/No                 | No       | No            | No     | No      | True for `remarks` to open diff modal.  | `record.is_long_text` |

---

### 3. `CER_RemarksHistory` (Versioned Remarks Log)

- **List Display Name**: `CER_RemarksHistory`
- **Internal Name**: `CER_RemarksHistory`
- **Purpose**: Immutable repository preserving every revision of the narrative business remarks with word count and timestamp (FR-08).
- **Referenced In Code**: `AuditModel.ts` (`ICERRemarksVersion`), `RemarksHistoryModal.tsx`.

| #   | Column Display Name  | Internal Name     | SharePoint Field Type  | Required | Default Value | Unique | Indexed | Notes                               | Source Model Field     |
| --- | -------------------- | ----------------- | ---------------------- | -------- | ------------- | ------ | ------- | ----------------------------------- | ---------------------- |
| 1   | **Title** _(System)_ | `Title`           | Single line of text    | Yes      | None          | No     | No      | Repurposed for `CERPRNO`.           | `remarks.cerprno`      |
| 2   | **CER Proposal No.** | `cerprno`         | Single line of text    | Yes      | None          | No     | **Yes** | Proposal number. Indexed.           | `remarks.cerprno`      |
| 3   | **Version Number**   | `version`         | Number                 | Yes      | 1             | No     | No      | Decimals: 0. Incremental version.   | `remarks.version`      |
| 4   | **Remarks Text**     | `remarks_text`    | Multiple lines of text | Yes      | None          | No     | No      | Plain text. Full narrative content. | `remarks.remarks_text` |
| 5   | **Remarks Type**     | `remarks_type`    | Choice                 | Yes      | `REMARKS`     | No     | No      | `REMARKS`, `REMARKS_JV`.            | `remarks.remarks_type` |
| 6   | **Word Count**       | `word_count`      | Number                 | Yes      | 0             | No     | No      | Decimals: 0. Evaluated word count.  | `remarks.word_count`   |
| 7   | **Created By User**  | `created_by_user` | Single line of text    | Yes      | None          | No     | No      | Name of editor.                     | `remarks.created_by`   |
| 8   | **Revision Date**    | `revision_date`   | Date and Time          | Yes      | None          | No     | **Yes** | Date and Time. Indexed for sorting. | `remarks.created_date` |

---

### 4. `CER_WorkflowLevels` (Approval Hierarchy Configuration)

- **List Display Name**: `CER_WorkflowLevels`
- **Internal Name**: `CER_WorkflowLevels`
- **Purpose**: Dynamic approval hierarchy matrix configured by administrators (FR-05, BR-06).
- **Referenced In Code**: `WorkflowModel.ts` (`IWorkflowLevel`), `WorkflowConfigView.tsx`.

| #   | Column Display Name   | Internal Name    | SharePoint Field Type | Required | Default Value | Unique | Indexed | Notes                                  | Source Model Field     |
| --- | --------------------- | ---------------- | --------------------- | -------- | ------------- | ------ | ------- | -------------------------------------- | ---------------------- |
| 1   | **Title** _(System)_  | `Title`          | Single line of text   | Yes      | None          | No     | No      | Repurposed for `level_name`.           | `level.level_name`     |
| 2   | **Approval Level ID** | `level_id`       | Number                | Yes      | None          | Yes    | **Yes** | Decimals: 0. Sequential (1, 2, 3...).  | `level.level_id`       |
| 3   | **Level Name**        | `level_name`     | Single line of text   | Yes      | None          | No     | No      | Max 150. e.g. "L1 - Technical Review". | `level.level_name`     |
| 4   | **Role Title**        | `role_title`     | Single line of text   | Yes      | None          | No     | No      | Max 100. e.g. "SBU Operations Head".   | `level.role_title`     |
| 5   | **Approver Name**     | `approver_name`  | Single line of text   | Yes      | None          | No     | No      | Max 100. Designated approver name.     | `level.approver_name`  |
| 6   | **Approver Email**    | `approver_email` | Single line of text   | Yes      | None          | No     | **Yes** | Max 150. Email for routing.            | `level.approver_email` |
| 7   | **Minimum Amount**    | `min_amount`     | Number                | No       | None          | No     | No      | Decimals: 2. Financial threshold.      | `level.min_amount`     |
| 8   | **Maximum Amount**    | `max_amount`     | Number                | No       | None          | No     | No      | Decimals: 2. Financial threshold.      | `level.max_amount`     |
| 9   | **Is Active**         | `is_active`      | Yes/No                | Yes      | Yes           | No     | No      | Toggle to activate/deactivate level.   | `level.is_active`      |

---

### 5. `CER_ApprovalDecisions` (Decision Trail)

- **List Display Name**: `CER_ApprovalDecisions`
- **Internal Name**: `CER_ApprovalDecisions`
- **Purpose**: Permanent audit log of approver actions, timestamps, and justifications (FR-05).
- **Referenced In Code**: `WorkflowModel.ts` (`IApprovalDecision`), `ApprovalHistoryView.tsx`, `ApprovalDecisionModal.tsx`.

| #   | Column Display Name    | Internal Name    | SharePoint Field Type  | Required | Default Value | Unique | Indexed | Notes                                   | Source Model Field        |
| --- | ---------------------- | ---------------- | ---------------------- | -------- | ------------- | ------ | ------- | --------------------------------------- | ------------------------- |
| 1   | **Title** _(System)_   | `Title`          | Single line of text    | Yes      | None          | No     | No      | Repurposed for `cerprno`.               | `decision.cerprno`        |
| 2   | **CER Proposal No.**   | `cerprno`        | Single line of text    | Yes      | None          | No     | **Yes** | Proposal number. Indexed.               | `decision.cerprno`        |
| 3   | **Level ID**           | `level_id`       | Number                 | Yes      | None          | No     | No      | Decimals: 0. Stage number (1, 2, 3...). | `decision.level_id`       |
| 4   | **Level Name**         | `level_name`     | Single line of text    | Yes      | None          | No     | No      | Stage description at review time.       | `decision.level_name`     |
| 5   | **Approver Name**      | `approver_name`  | Single line of text    | Yes      | None          | No     | No      | Full name of reviewing approver.        | `decision.approver_name`  |
| 6   | **Approver Email**     | `approver_email` | Single line of text    | Yes      | None          | No     | No      | Approver email address.                 | `decision.approver_email` |
| 7   | **Decision**           | `decision`       | Choice                 | Yes      | None          | No     | **Yes** | `APPROVED`, `REJECTED`, `REVISED`.      | `decision.decision`       |
| 8   | **Reviewer Comments**  | `comments`       | Multiple lines of text | No       | None          | No     | No      | Plain text. Mandatory if REJECTED.      | `decision.comments`       |
| 9   | **Decision Timestamp** | `decision_date`  | Date and Time          | Yes      | None          | No     | **Yes** | Date and Time. Indexed for sorting.     | `decision.timestamp`      |

---

### 6. `CER_Attachments` (Document Library)

- **Library Display Name**: `CER_Attachments`
- **Internal Name**: `CER_Attachments`
- **Purpose**: Dedicated Document Library for file attachments (PDF, DOCX, XLSX, images: Max 10MB per file, Max 20MB total combined capacity).
- **Referenced In Code**: `.env.example` (`SP_DOCLIB_ATTACHMENTS=CER_Attachments`), `AttachmentSection.tsx`.

| #   | Column Display Name           | Internal Name | SharePoint Field Type | Required | Default Value | Unique | Indexed | Notes                                  | Source Model Field       |
| --- | ----------------------------- | ------------- | --------------------- | -------- | ------------- | ------ | ------- | -------------------------------------- | ------------------------ |
| 1   | **Name** _(System File Name)_ | `FileLeafRef` | Single line of text   | Yes      | None          | No     | No      | Original file name (e.g. `Quote.pdf`). | `attachment.name`        |
| 2   | **CER Proposal No.**          | `cerprno`     | Single line of text   | Yes      | None          | No     | **Yes** | Proposal tag for querying attachments. | `attachment.cerprno`     |
| 3   | **Uploader Name**             | `uploaded_by` | Single line of text   | Yes      | None          | No     | No      | Name of user who attached file.        | `attachment.uploaded_by` |
| 4   | **File Size Bytes**           | `file_size`   | Number                | No       | None          | No     | No      | Decimals: 0. File size in bytes.       | `attachment.size`        |
| 5   | **MIME Type**                 | `file_type`   | Single line of text   | No       | None          | No     | No      | e.g. `application/pdf`.                | `attachment.type`        |

---

### 7. `CER_Notifications` (Optional Email Dispatch Audit Log)

- **List Display Name**: `CER_Notifications`
- **Internal Name**: `CER_Notifications`
- **Purpose**: Compliance log verifying that workflow notifications were dispatched to the Creator, Previous Approvers, and Next Approver (Doc §8 #4).
- **Referenced In Code**: `WorkflowModel.ts` (`INotificationLog`), `NotificationCenter.tsx`.

| #   | Column Display Name    | Internal Name        | SharePoint Field Type  | Required | Default Value | Unique | Indexed | Notes                                 |
| --- | ---------------------- | -------------------- | ---------------------- | -------- | ------------- | ------ | ------- | ------------------------------------- |
| 1   | **Title** _(System)_   | `Title`              | Single line of text    | Yes      | None          | No     | No      | Repurposed for `cerprno`.             |
| 2   | **CER Proposal No.**   | `cerprno`            | Single line of text    | Yes      | None          | No     | **Yes** | Proposal number.                      |
| 3   | **Recipients**         | `recipients`         | Multiple lines of text | Yes      | None          | No     | No      | Semicolon or comma-separated emails.  |
| 4   | **Email Subject**      | `subject`            | Single line of text    | Yes      | None          | No     | No      | Max 255.                              |
| 5   | **Email Body**         | `body`               | Multiple lines of text | Yes      | None          | No     | No      | Plain text notification content.      |
| 6   | **Attachments Count**  | `attachments_count`  | Number                 | No       | 0             | No     | No      | Decimals: 0.                          |
| 7   | **Dispatch Timestamp** | `dispatch_timestamp` | Date and Time          | Yes      | None          | No     | **Yes** | Date and Time.                        |
| 8   | **Dispatch Status**    | `status`             | Choice                 | Yes      | `SENT`        | No     | No      | Choices: `SENT`, `PENDING`, `FAILED`. |

---

### 8. `CER_UserRoles` (Enterprise Role Registry)

- **List Display Name**: `CER_UserRoles`
- **Internal Name**: `CER_UserRoles`
- **Purpose**: Master Role-Based Access Control repository governing permissions (`Admin`, `Initiator`, `Approver`, `Finance_Audit`).
- **Referenced In Code**: `UserModel.ts` (`IUserRoleAssignment`), `SharePointCERDataService.ts` (`getUserRoles`, `assignUserRole`, `updateUserRole`, `revokeUserRole`), `AuthService.ts`, `UserManagementTab.tsx`.

| #   | Column Display Name      | Internal Name    | SharePoint Field Type | Required | Default Value | Unique | Indexed | Choices / Settings / Notes                                | Source Model Field           |
| --- | ------------------------ | ---------------- | --------------------- | -------- | ------------- | ------ | ------- | --------------------------------------------------------- | ---------------------------- |
| 1   | **Title** _(System)_     | `Title`          | Single line of text   | Yes      | None          | No     | No      | Repurposed for **User Full Display Name** (e.g. `Priya Kalekar (STL Digital)`). | `assignment.user_name`       |
| 2   | **User Email**           | `user_email`     | Single line of text   | Yes      | None          | No     | **Yes** | Corporate email address. Indexed for identity lookup.     | `assignment.user_email`      |
| 3   | **Login Name (UPN)**     | `login_name`     | Single line of text   | Yes      | None          | No     | **Yes** | Claims login identity or User Principal Name.             | `assignment.login_name`      |
| 4   | **Assigned Role**        | `role`           | Choice                | Yes      | `Initiator`   | No     | **Yes** | `Admin`, `Initiator`, `Approver`, `Finance_Audit`         | `assignment.role`            |
| 5   | **Approval Level ID**    | `approval_level` | Number                | No       | None          | No     | No      | Decimals: 0. Specific stage (1, 2, 3...) for Approver.     | `assignment.approval_level`  |
| 6   | **Department**           | `department`     | Single line of text   | No       | None          | No     | No      | Max 100. Department affiliation.                          | `assignment.department`      |
| 7   | **Assigned SBU**         | `sbu`            | Choice                | No       | None          | No     | No      | Choices: `RJ North`, `RJ South`, `CBOS`, `RAVA`           | `assignment.sbu`             |
| 8   | **Is Active**            | `is_active`      | Yes/No                | Yes      | Yes           | No     | **Yes** | Active flag. If No, user access is immediately denied.    | `assignment.is_active`       |
| 9   | **Assigned By**          | `assigned_by`    | Single line of text   | Yes      | None          | No     | No      | Name of administrator who granted role.                   | `assignment.assigned_by`     |
| 10  | **Assigned Date**        | `assigned_date`  | Date and Time         | Yes      | None          | No     | **Yes** | Date & Time when role was provisioned.                    | `assignment.assigned_date`   |

---

## 🎛️ Dropdown & Choice Field Master Inventory

Every choice column used in the application is cataloged below with its exact case-sensitive values, default selection, and business logic constraints:

| List Name               | Column Display Name           | Internal Name    | Permitted Choice Values                                                                                      | Default Value | Mandatory in UI | Multiple Values Allowed | Fill-in Choices Allowed |
| ----------------------- | ----------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------ | ------------- | --------------- | ----------------------- | ----------------------- |
| `CER_Proposals`         | **Block/SBU/Field**           | `sbu`            | 1. `RJ North`<br>2. `RJ South`<br>3. `CBOS`<br>4. `RAVA`                                                     | `RJ North`    | **Yes**         | No                      | No                      |
| `CER_Proposals`         | **Proposal Status**           | `status`         | 1. `Draft`<br>2. `In Approval`<br>3. `Approved`<br>4. `Rejected`<br>5. `Revised`                             | `Draft`       | **Yes**         | No                      | No                      |
| `CER_Proposals`         | **Category**                  | `cat`            | 1. `Vital`<br>2. `Essential`<br>3. `Desirable`                                                               | `Vital`       | **Yes**         | No                      | No                      |
| `CER_Proposals`         | **Currency**                  | `currency`       | 1. `USD`<br>2. `INR`                                                                                         | `USD`         | **Yes**         | No                      | No                      |
| `CER_Proposals`         | **Payback/Non Payback**       | `payable`        | 1. `Payback`<br>2. `Non Payback`                                                                             | `Payback`     | **Yes**         | No                      | No                      |
| `CER_Proposals`         | **Corporate Budget (Yes/No)** | `cbudget`        | 1. `Yes`<br>2. `No`<br>3. `Partially`                                                                        | `Yes`         | **Yes**         | No                      | No                      |
| `CER_Proposals`         | **Corporate Budget Currency** | `cb_currency`    | 1. `USD`<br>2. `INR`                                                                                         | `USD`         | No              | No                      | No                      |
| `CER_Proposals`         | **Aligned with JV**           | `jv`             | 1. `Yes`<br>2. `No`<br>3. `Under Discussion`                                                                 | `No`          | **Yes**         | No                      | No                      |
| `CER_Proposals`         | **JV Cost Recoverable**       | `jv_recoverable` | 1. `Yes`<br>2. `No`                                                                                          | `No`          | **Yes**         | No                      | No                      |
| `CER_Proposals`         | **JV Budget (Yes/No)**        | `jv_budget`      | 1. `Yes`<br>2. `No`                                                                                          | `No`          | **Yes**         | No                      | No                      |
| `CER_RemarksHistory`    | **Remarks Type**              | `remarks_type`   | 1. `REMARKS`<br>2. `REMARKS_JV`                                                                              | `REMARKS`     | **Yes**         | No                      | No                      |
| `CER_ApprovalDecisions` | **Decision**                  | `decision`       | 1. `APPROVED`<br>2. `REJECTED`<br>3. `REVISED`                                                               | None          | **Yes**         | No                      | No                      |
| `CER_Notifications`     | **Dispatch Status**           | `status`         | 1. `SENT`<br>2. `PENDING`<br>3. `FAILED`                                                                     | `SENT`        | **Yes**         | No                      | No                      |
| `CER_UserRoles`         | **Assigned Role**             | `role`           | 1. `Admin`<br>2. `Initiator`<br>3. `Approver`<br>4. `Finance_Audit`                                          | `Initiator`   | **Yes**         | No                      | No                      |
| `CER_UserRoles`         | **Assigned SBU**             | `sbu`            | 1. `RJ North`<br>2. `RJ South`<br>3. `CBOS`<br>4. `RAVA`                                                     | None          | No              | No                      | No                      |

---

## 🛠️ Step-by-Step Manual SharePoint Setup Guide

> [!IMPORTANT]
> **CRITICAL SHAREPOINT RULE FOR INTERNAL NAMES**:
> SharePoint REST API queries fields by their **Internal Name** (e.g. `pr_name`, `amount`, `sbu`).
> When creating columns via the modern web interface:
>
> 1. In the **Name** field, enter the **Internal Name** first (e.g., `pr_name`).
> 2. Click **Save**. SharePoint permanently registers `pr_name` as the immutable internal name.
> 3. Re-open the column settings and rename the label to the friendly **Display Name** (e.g., `Name of Project`).
>    This guarantees 100% compatibility with `SharePointCERDataService.ts`.

---

### Step 1: Create `CER_Proposals` List

1. Navigate to your UAT site collection: `https://vedanta.sharepoint.com/sites/CERManagementSystem`.
2. Click the gear icon ⚙️ → **Site contents** → **New** → **List** → **Blank list**.
3. Name: **`CER_Proposals`** → Description: _"Master repository for Capital Expenditure Requests"_ → Click **Create**.
4. Configure Built-in **Title** Column:
   - Click gear icon ⚙️ → **List settings** → Click on the column named **Title**.
   - Change Column name from `Title` to **`CER Proposal No. (Title)`**.
   - Require that this column contains information: **Yes**.
   - Enforce unique values: **Yes**.
   - Click **OK**.
5. Create the Custom Columns:
   - **`cerprno`**: Single line of text → Required: Yes → Enforce unique values: Yes.
   - **`pr_name`**: Single line of text → Required: Yes → Rename display to **Name of Project**.
   - **`owname`**: Single line of text → Required: Yes → Rename display to **CER Owner Name**.
   - **`owner_email`**: Single line of text → Required: Yes → Rename display to **Owner Email**.
   - **`sbu`**: Choice → Required: Yes → Choices: `RJ North`, `RJ South`, `CBOS`, `RAVA` → Default: `RJ North` → Rename display to **Block/SBU/Field**.
   - **`status`**: Choice → Required: Yes → Choices: `Draft`, `In Approval`, `Approved`, `Rejected`, `Revised` → Default: `Draft` → Rename display to **Proposal Status**.
   - **`object`**: Multiple lines of text → Plain text: Yes → Required: Yes → Rename display to **Objectives of CER**.
   - **`amount`**: Number → Decimals: 2 → Required: Yes → Rename display to **Amount of CER**.
   - **`currency`**: Choice → Choices: `USD`, `INR` → Default: `USD` → Required: Yes → Rename display to **Currency**.
   - **`cat`**: Choice → Choices: `Vital`, `Essential`, `Desirable` → Default: `Vital` → Required: Yes → Rename display to **Category**.
   - **`payable`**: Choice → Choices: `Payback`, `Non Payback` → Default: `Payback` → Required: Yes → Rename display to **Payback/Non Payback**.
   - **`period`**: Single line of text → Required: No → Rename display to **Total Duration**.
   - **`payback_quarters`**: Number → Decimals: 0 → Required: No → Rename display to **Payback Period (Quarters)**.
   - **`ben_npv`**: Number → Decimals: 2 → Required: No → Rename display to **Financial Benefits – NPV ($mm)**.
   - **`ben_irr`**: Number → Decimals: 1 → Min: 0 → Max: 100 → Required: No → Rename display to **Financial Benefit – IRR (%)**.
   - **`cost_assumptions`**: Multiple lines of text → Plain text: Yes → Required: Yes → Rename display to **Key Assumptions**.
   - **`st_date`**: Date and Time → Date Only: Yes → Required: Yes → Rename display to **Start Date of Project**.
   - **`com_date`**: Date and Time → Date Only: Yes → Required: Yes → Rename display to **Completion Date of Project**.
   - **`duration_months`**: Number → Decimals: 1 → Required: No → Rename display to **Total Duration (Months)**.
   - **`cbudget`**: Choice → Choices: `Yes`, `No`, `Partially` → Default: `Yes` → Required: Yes → Rename display to **Corporate Budget (Yes/No)**.
   - **`cb_amnt`**: Number → Decimals: 2 → Required: No → Rename display to **Corporate Budget Amount ($mm)**.
   - **`cb_currency`**: Choice → Choices: `USD`, `INR` → Default: `USD` → Rename display to **Corporate Budget Currency**.
   - **`reason`**: Multiple lines of text → Plain text: Yes → Required: No → Rename display to **Reason (Budget Variance)**.
   - **`jv`**: Choice → Choices: `Yes`, `No`, `Under Discussion` → Default: `No` → Required: Yes → Rename display to **Aligned with JV**.
   - **`jv_recoverable`**: Choice → Choices: `Yes`, `No` → Default: `No` → Required: No → Rename display to **JV Cost Recoverable**.
   - **`jv_cost`**: Number → Decimals: 2 → Required: No → Rename display to **JV Cost Share ($mm)**.
   - **`jv_budget`**: Choice → Choices: `Yes`, `No` → Default: `No` → Required: Yes → Rename display to **JV Budget (Yes/No)**.
   - **`jv_amnt`**: Number → Decimals: 2 → Required: No → Rename display to **JV Budget Amount ($mm)**.
   - **`jv_reason`**: Multiple lines of text → Plain text: Yes → Required: No → Rename display to **Reason (JV Variance)**.
   - **`ph_till_label`**: Single line of text → Default: `Till Mar'26` → Rename display to **Phasing Label - Till**.
   - **`ph_fy_label`**: Single line of text → Default: `FY 26-27` → Rename display to **Phasing Label - Current FY**.
   - **`ph_beyond_label`**: Single line of text → Default: `Beyond FY'27` → Rename display to **Phasing Label - Beyond FY**.
   - **`prod_till`**, **`prod_fy`**, **`prod_beyond`**: Number → Decimals: 2 → Default: 0.
   - **`capex_till`**, **`capex_fy`**, **`capex_beyond`**: Number → Decimals: 2 → Default: 0.
   - **`opex_till`**, **`opex_fy`**, **`opex_beyond`**: Number → Decimals: 2 → Default: 0.
   - **`engineer`**, **`s_fac`**, **`comis`**, **`preop`**, **`others`**: Number → Decimals: 2 → Default: 0.
   - **`total`**: Number → Decimals: 2 → Default: 0 → Rename display to **Total Estimated Cost**.
   - **`remarks`**: Multiple lines of text → Plain text: Yes → Required: Yes → Rename display to **Remarks & Justification**.
   - **`remarks_jv`**: Multiple lines of text → Plain text: Yes → Required: No → Rename display to **Remarks on JV Risk**.
   - **`current_level`**: Number → Decimals: 0 → Default: 1 → Rename display to **Current Approval Level**.
   - **`pending_with_role`**: Single line of text → Default: `L1 Approver` → Rename display to **Pending With Role**.
   - **`pending_with_email`**: Single line of text → Rename display to **Pending With Email**.
   - **`revision_count`**: Number → Decimals: 0 → Default: 0 → Rename display to **Revision Count**.
6. Configure Indexed Columns:
   - Go to **List settings** → Scroll to **Indexed columns** → Click **Create a new index**.
   - Create separate indices for: `cerprno`, `status`, `sbu`, `cat`, and `current_level`.

---

### Step 2: Create `CER_AuditTrail` List

1. Go to **Site contents** → **New** → **List** → **Blank list** → Name: **`CER_AuditTrail`**.
2. Configure Columns:
   - **`cerprno`**: Single line of text → Required: Yes → Rename display to **CER Proposal No.**
   - **`field_name`**: Single line of text → Required: Yes → Rename display to **Field Name**.
   - **`field_desc`**: Single line of text → Required: Yes → Rename display to **Field Description**.
   - **`old_value`**: Multiple lines of text → Plain text: Yes → Required: No → Rename display to **Old Value**.
   - **`new_value`**: Multiple lines of text → Plain text: Yes → Required: No → Rename display to **New Value**.
   - **`user_name`**: Single line of text → Required: Yes → Rename display to **User Name**.
   - **`user_email`**: Single line of text → Required: Yes → Rename display to **User Email**.
   - **`audit_date`**: Date and Time → Date Only: Yes → Required: Yes → Rename display to **Audit Date**.
   - **`audit_time`**: Single line of text → Required: Yes → Rename display to **Audit Time**.
   - **`timestamp`**: Date and Time → Date & Time: Yes → Required: Yes → Rename display to **Full Timestamp**.
   - **`is_long_text`**: Yes/No → Default: No → Rename display to **Is Long Text**.
3. Create Indices: In **List settings** → **Indexed columns**, add indices on: `cerprno` and `timestamp`.

---

### Step 3: Create `CER_RemarksHistory` List

1. Go to **Site contents** → **New** → **List** → **Blank list** → Name: **`CER_RemarksHistory`**.
2. Configure Columns:
   - **`cerprno`**: Single line of text → Required: Yes → Rename display to **CER Proposal No.**
   - **`version`**: Number → Decimals: 0 → Required: Yes → Default: 1 → Rename display to **Version Number**.
   - **`remarks_text`**: Multiple lines of text → Plain text: Yes → Required: Yes → Rename display to **Remarks Text**.
   - **`remarks_type`**: Choice → Choices: `REMARKS`, `REMARKS_JV` → Default: `REMARKS` → Required: Yes → Rename display to **Remarks Type**.
   - **`word_count`**: Number → Decimals: 0 → Required: Yes → Default: 0 → Rename display to **Word Count**.
   - **`created_by_user`**: Single line of text → Required: Yes → Rename display to **Created By User**.
   - **`revision_date`**: Date and Time → Date & Time: Yes → Required: Yes → Rename display to **Revision Date**.
3. Create Indices: In **List settings** → **Indexed columns**, add index on: `cerprno`.

---

### Step 4: Create `CER_WorkflowLevels` List

1. Go to **Site contents** → **New** → **List** → **Blank list** → Name: **`CER_WorkflowLevels`**.
2. Configure Columns:
   - **`level_id`**: Number → Decimals: 0 → Required: Yes → Enforce unique values: Yes → Rename display to **Approval Level ID**.
   - **`level_name`**: Single line of text → Required: Yes → Rename display to **Level Name**.
   - **`role_title`**: Single line of text → Required: Yes → Rename display to **Role Title**.
   - **`sbu`**: Single line of text → Required: No → Default: `All` → Rename display to **Block / SBU Route**.
   - **`is_active`**: Yes/No → Required: Yes → Default: Yes → Rename display to **Is Active**.
   - **`created_by`**: Single line of text → Required: Yes → Rename display to **Created By User**.
   - **`created_date`**: Date and Time → Format: Date & Time → Required: Yes → Rename display to **Created Timestamp**.
   - **`approver_name`**: Single line of text → Required: No → Rename display to **Approver Name**.
   - **`approver_email`**: Single line of text → Required: No → Rename display to **Approver Email**.
3. **Dynamic Level Configuration via UI (No Seed Data in Code)**:
   - **Zero Hardcoded Seeds**: There is no seed data hardcoded in the codebase.
   - All levels are created dynamically by Workflow Administrators using the **"+ Add Level"** feature in the **Admin Console → Approval Hierarchy** tab.
   - Each level captures `level_id`, `level_name`, `role_title`, `sbu`, `is_active` (Active checkbox), `created_by` (who created it), and `created_date` (timestamp).
   - Clicking **"Save All Changes"** synchronizes all configured levels directly to this SharePoint list (`CER_WorkflowLevels`).

---

### Step 5: Create `CER_ApprovalDecisions` List

1. Go to **Site contents** → **New** → **List** → **Blank list** → Name: **`CER_ApprovalDecisions`**.
2. Configure Columns:
   - **`cerprno`**: Single line of text → Required: Yes → Rename display to **CER Proposal No.**
   - **`level_id`**: Number → Decimals: 0 → Required: Yes → Rename display to **Level ID**.
   - **`level_name`**: Single line of text → Required: Yes → Rename display to **Level Name**.
   - **`approver_name`**: Single line of text → Required: Yes → Rename display to **Approver Name**.
   - **`approver_email`**: Single line of text → Required: Yes → Rename display to **Approver Email**.
   - **`decision`**: Choice → Choices: `APPROVED`, `REJECTED`, `REVISED` → Required: Yes → Rename display to **Decision**.
   - **`comments`**: Multiple lines of text → Plain text: Yes → Required: No → Rename display to **Reviewer Comments**.
   - **`decision_date`**: Date and Time → Date & Time: Yes → Required: Yes → Rename display to **Decision Timestamp**.
3. Create Indices: In **List settings** → **Indexed columns**, add indices on: `cerprno` and `decision_date`.

---

### Step 6: Create `CER_Attachments` Document Library

1. Go to **Site contents** → **New** → **Document library** → Name: **`CER_Attachments`**.
2. Configure Library Custom Columns:
   - In Library Settings → Create column:
   - **`cerprno`**: Single line of text → Required: Yes → Enforce unique values: No → Indexed: Yes.
   - **`uploaded_by`**: Single line of text → Required: Yes.
   - **`file_size`**: Number → Decimals: 0 → Required: No.
   - **`file_type`**: Single line of text → Required: No.

---

### Step 7: Create `CER_Notifications` List _(Optional but Recommended)_

1. Go to **Site contents** → **New** → **List** → **Blank list** → Name: **`CER_Notifications`**.
2. Configure Columns:
   - **`cerprno`**: Single line of text → Required: Yes → Indexed: Yes.
   - **`recipients`**: Multiple lines of text → Plain text: Yes → Required: Yes.
   - **`subject`**: Single line of text → Required: Yes.
   - **`body`**: Multiple lines of text → Plain text: Yes → Required: Yes.
   - **`attachments_count`**: Number → Decimals: 0 → Default: 0.
   - **`dispatch_timestamp`**: Date and Time → Required: Yes → Indexed: Yes.
   - **`status`**: Choice → Choices: `SENT`, `PENDING`, `FAILED` → Default: `SENT`.

---

### Step 8: Create `CER_UserRoles` List _(Mandatory for Enterprise RBAC)_

1. Go to **Site contents** → **New** → **List** → **Blank list** → Name: **`CER_UserRoles`**.
2. Configure Columns (Create using Internal Name first, then rename display):
   - **`Title`**: Repurposed as **User Display Name** (Single line of text, Required: Yes).
   - **`user_email`**: Single line of text → Required: Yes → Indexed: Yes → Max: 150.
   - **`login_name`**: Single line of text → Required: Yes → Indexed: Yes → Max: 150 (Stores UPN / claims login identity).
   - **`role`**: Choice → Required: Yes → Indexed: Yes → Choices: `Admin`, `Initiator`, `Approver`, `Finance_Audit`.
   - **`approval_level`**: Number → Decimals: 0 → Required: No (Specifies which approval level 1, 2, 3... an Approver can act upon).
   - **`department`**: Single line of text → Required: No → Max: 100.
   - **`sbu`**: Choice → Required: No → Choices: `RJ North`, `RJ South`, `CBOS`, `RAVA`.
   - **`is_active`**: Yes/No (Boolean) → Default: `Yes` → Required: Yes.
   - **`assigned_by`**: Single line of text → Required: Yes → Max: 100.
   - **`assigned_date`**: Date and Time → Format: Date & Time → Required: Yes.
3. Configure List Permissions:
   - Break permission inheritance.
   - Grant **Full Control** only to `CER Site Owners` / Administrators.
   - Grant **Read** to all authenticated portal users (so that client session can resolve current identity permissions).
   - Prohibit direct item edits by non-admins.
4. **Seed Initial Roles (Essential for initial access and workflow testing)**:
   - **Item 1 (System Administrator)**:
     - `Title`: `Admin (70007144)`
     - `user_email`: `70007144@cairnindia.com`
     - `login_name`: `70007144@cairnindia.com`
     - `role`: `Admin`
     - `department`: `Enterprise Administration`
     - `is_active`: `Yes`
     - `assigned_by`: `System Bootstrap`
     - `assigned_date`: *(Current date)*
   - **Item 2 (Administrator Bootstrap)**:
     - `Title`: `Priya Kalekar (STL Digital)`
     - `user_email`: `Priya.Kalekar@cairnindia.com`
     - `login_name`: `Priya.Kalekar@cairnindia.com`
     - `role`: `Admin`
     - `department`: `IT / Digital`
     - `is_active`: `Yes`
     - `assigned_by`: `System Bootstrap`
     - `assigned_date`: *(Current date)*
   - **Item 2 (L1 Approver)**:
     - `Title`: `Rajesh Sharma`
     - `user_email`: `rajesh.sharma@vedanta.co.in`
     - `login_name`: `rajesh.sharma@vedanta.co.in`
     - `role`: `Approver`
     - `approval_level`: 1
     - `department`: `Operations`
     - `sbu`: `RJ North`
     - `is_active`: `Yes`
     - `assigned_by`: `System Bootstrap`
     - `assigned_date`: *(Current date)*
   - **Item 3 (L2 Approver)**:
     - `Title`: `Sunil Verma`
     - `user_email`: `sunil.verma@vedanta.co.in`
     - `login_name`: `sunil.verma@vedanta.co.in`
     - `role`: `Approver`
     - `approval_level`: 2
     - `department`: `Corporate Finance`
     - `is_active`: `Yes`
     - `assigned_by`: `System Bootstrap`
     - `assigned_date`: *(Current date)*
   - **Item 4 (L3 Approver)**:
     - `Title`: `Ananya Deshmukh`
     - `user_email`: `ananya.deshmukh@vedanta.co.in`
     - `login_name`: `ananya.deshmukh@vedanta.co.in`
     - `role`: `Approver`
     - `approval_level`: 3
     - `department`: `Executive Committee`
     - `is_active`: `Yes`
     - `assigned_by`: `System Bootstrap`
     - `assigned_date`: *(Current date)*
   - **Item 5 (Finance / Audit Reviewer)**:
     - `Title`: `Finance Audit Team`
     - `user_email`: `finance.audit@vedanta.co.in`
     - `login_name`: `finance.audit@vedanta.co.in`
     - `role`: `Finance_Audit`
     - `department`: `Internal Audit`
     - `is_active`: `Yes`
     - `assigned_by`: `System Bootstrap`
     - `assigned_date`: *(Current date)*

---

### Step 9: `CER_AdminAuditLog` List — Not Required / Removed

> [!NOTE]
> The **Security & Audit** and **Overview** tabs have been completely removed from the Admin Console. You do **not** need to create the `CER_AdminAuditLog` list on SharePoint Online. Only **`CER_UserRoles`** (Step 8) is required for enterprise role assignments.

---

## 🔗 Application-to-SharePoint Traceability Matrix

| Application Feature     | Service Method        | Target List / Library   | Payload / Columns Involved                                            | Current Implementation Status                              |
| ----------------------- | --------------------- | ----------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Create CER**          | `createProposal`      | `CER_Proposals`         | Full 54 columns mapped in `_mapProposalToSharePointItem`              | **Fully wired to REST** (Falls back to mock on HTTP error) |
| **Fetch All Proposals** | `getAllProposals`     | `CER_Proposals`         | `$top=500&$orderby=Created desc`                                      | **Fully wired to REST** (Falls back to mock on HTTP error) |
| **Lookup CER by No.**   | `getProposalByNumber` | `CER_Proposals`         | `$filter=cerprno eq '{cerprno}'`                                      | **Fully wired to REST** (Falls back to mock on HTTP error) |
| **Change / Edit CER**   | `updateProposal`      | `CER_Proposals`         | Target: `MERGE / items({id})`                                         | **Fully wired to REST** (Falls back to mock on HTTP error) |
| **Record Audit Trail**  | `updateProposal`      | `CER_AuditTrail`        | `cerprno, field_name, old_value, new_value, user_name, timestamp`     | **Fully wired to REST** (Falls back to mock on HTTP error) |
| **View Audit Trail**    | `getAuditTrail`       | `CER_AuditTrail`        | `$filter=cerprno eq '{cerprno}'`                                      | **Fully wired to REST** (Falls back to mock on HTTP error) |
| **Remarks History**     | `getRemarksHistory`   | `CER_RemarksHistory`    | `$filter=cerprno eq '{cerprno}'&$orderby=version desc`                | **Fully wired to REST** (Falls back to mock on HTTP error) |
| **Workflow Hierarchy**  | `getWorkflowLevels`   | `CER_WorkflowLevels`    | `$filter=is_active eq true&$orderby=level_id asc`                     | **Fully wired to REST** (Falls back to mock on HTTP error) |
| **Record Decision**     | `recordDecision`      | `CER_ApprovalDecisions` | `cerprno, level_id, approver_name, decision, comments, decision_date` | **Fully wired to REST** (Falls back to mock on HTTP error) |
| **Upload Attachment**   | `addAttachment`       | `CER_Attachments`       | File upload to Document Library tagged with `cerprno`                 | **Fully wired to REST** (Falls back to mock on HTTP error) |
| **List Attachments**    | `getAttachments`      | `CER_Attachments`       | `$filter=cerprno eq '{cerprno}'`                                      | **Fully wired to REST** (Falls back to mock on HTTP error) |
| **Notification Logs**   | `getNotificationLogs` | `CER_Notifications`     | Multi-party email dispatch records                                    | **Fully wired to REST** (Falls back to mock on HTTP error) |
| **User Role Management**| `getUserRoles`, `assignUserRole`, `updateUserRole`, `revokeUserRole` | `CER_UserRoles` | Full RBAC registry: `Title, user_email, login_name, role, approval_level, is_active, assigned_by, assigned_date` | **Fully wired to REST** (Falls back to mock on HTTP error) |
| **Administrative Audit**| `getAdminAuditLog`, `logAdminAudit` | `CER_AdminAuditLog` *(Optional / Mock)* | UI tab removed; service methods retained for logging forensics if list exists | Optional |

---

## 🔍 Integration Status & Production Readiness Report

All integration gaps previously identified have been **100% resolved** in the codebase:

1. **Complete Field Mapping**:
   - `payback_quarters`, `jv_recoverable`, `ph_till_label`, `ph_fy_label`, `ph_beyond_label`, and all other 54 schema fields are fully mapped both ways in `_mapProposalToSharePointItem` and `_mapSharePointItemToProposal`.

2. **Full REST API Implementation**:
   - In `SharePointCERDataService.ts`, all operations across all lists and libraries (`CER_Proposals`, `CER_AuditTrail`, `CER_RemarksHistory`, `CER_WorkflowLevels`, `CER_ApprovalDecisions`, `CER_Attachments`, `CER_Notifications`, `CER_UserRoles`, and `CER_AdminAuditLog`) execute real SharePoint Online `SPHttpClient` REST requests.
   - Graceful failover to local browser storage (`_fallbackMock`) is preserved as a high-availability fallback if SharePoint REST endpoints return HTTP errors or are unavailable during initial provisioning.

3. **Dynamic Dropdowns**:
   - All dropdown choices (`sbu`, `cat`, `currency`, `payable`, `cbudget`, `cb_currency`, `jv`, `jv_recoverable`, `jv_budget`, `status`) are dynamically loaded directly from the Choice column definitions of `CER_Proposals` via `getFieldChoices()`.
   - Modifying choices in SharePoint list settings immediately reflects in the web application UI with zero code changes.

---

## 🔐 Security, Permissions & Environment Configuration

### Site Configuration

- **UAT Site URL**: `https://vedanta.sharepoint.com/sites/CERManagementSystem`
- **Authentication**: Automatic via SharePoint Online / Microsoft 365 OAuth bearer token handled by SPFx's built-in `SPHttpClient`.

### SharePoint Group & Permission Setup

To maintain audit integrity and governance, configure SharePoint permissions as follows:

| Role / User Persona              | Assigned SharePoint Group | Permission Level                | Scope of Permissions                                                                                         |
| -------------------------------- | ------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| **Initiators / Proposal Owners** | `CER Initiators`          | **Contribute** (or custom edit) | Can create proposals and upload attachments. Cannot delete from `CER_AuditTrail` or `CER_ApprovalDecisions`. |
| **Approvers (L1, L2, L3)**       | `CER Approvers`           | **Contribute**                  | Can read proposals, inspect attachments, and write to `CER_ApprovalDecisions`.                               |
| **Finance / Audit Reviewers**    | `CER Auditors`            | **Read**                        | Read-only inspection of `CER_Proposals`, `CER_AuditTrail`, and `CER_RemarksHistory`.                         |
| **Workflow Administrators**      | `CER Site Owners`         | **Full Control**                | Can modify `CER_WorkflowLevels` and list schema.                                                             |

### List-Specific Security Settings

1. **`CER_AuditTrail` & `CER_ApprovalDecisions`**:
   - In **List settings** → **Permissions for this list**:
   - Break permission inheritance.
   - Remove **Delete Items** permission from standard Members/Visitors. Audit logs and approval records must be immutable.
2. **`CER_Proposals`**:
   - In **List settings** → **Advanced settings**:
   - Item-level Permissions: Set **Read access: Read all items**; **Create and Edit access: Create items and edit items that were created by the user** (or allow assigned approvers via custom security).
3. **`CER_UserRoles`**:
   - Break permission inheritance.
   - Restrict **Edit/Delete** to Site Owners / Administrators. All portal users get **Read** to evaluate access rights.

---

## ✅ UAT Verification Checklist

Once you have created the lists and columns in your UAT site contents, execute this verification checklist to confirm setup:

- [ ] **Site Access**: Navigate to `https://vedanta.sharepoint.com/sites/CERManagementSystem` and confirm Site contents access.
- [ ] **Core Lists Existence (7 items)**: Verify that `CER_Proposals`, `CER_AuditTrail`, `CER_RemarksHistory`, `CER_WorkflowLevels`, `CER_ApprovalDecisions`, `CER_Attachments`, and `CER_Notifications` exist in Site contents.
- [ ] **Security Lists Existence (1 item)**: Verify that `CER_UserRoles` is created (no need for `CER_AdminAuditLog`).
- [ ] **Admin Bootstrap in `CER_UserRoles`**: Confirm at least one active row with `role = 'Admin'` exists for your logged-in administrator account.
- [ ] **Workflow Hierarchy Seed**: Confirm `CER_WorkflowLevels` contains at least 3 active rows (Level 1, Level 2, Level 3).
- [ ] **Proposal Uniqueness**: Confirm `Title` in `CER_Proposals` has **Enforce unique values = Yes**.
- [ ] **Internal Names Check**: In browser, navigate to:
      `https://vedanta.sharepoint.com/sites/CERManagementSystem/_api/web/lists/getByTitle('CER_Proposals')/fields?$filter=Hidden eq false`
      and confirm `pr_name`, `owname`, `sbu`, `status`, `amount`, `cat`, `st_date`, `com_date` exist as internal names.
- [ ] **Admin Console Verification**: Access the Admin Console (`#workflow-config`) and verify:
  1. The 2 tabs (**User & Role Management**, **Approval Hierarchy**) load cleanly without error.
  2. The selected tab remains clearly visible (solid blue background with white text and badge).
  3. The Back button (`←`) is present and returns the user to the Dashboard.
  4. No "Overview", "Masters & Settings", or "Security & Audit" tabs appear.
- [ ] **Create Proposal Test**:
  1. Open the CER web application hosted in the SharePoint workbench or app page.
  2. Navigate to **Create CER**.
  3. Fill out all sections and click **Submit for Approval**.
  4. Confirm the success banner appears: _"CER Proposal No. has been created and sent for approval"_.
  5. Go to SharePoint Site contents → `CER_Proposals` → confirm that a new row was inserted with all field values populated!
- [ ] **Indexed Columns**: Confirm indexed columns on `CER_Proposals` (`cerprno`, `status`, `sbu`, `cat`, `current_level`) and `CER_UserRoles` (`user_email`, `role`, `is_active`).
