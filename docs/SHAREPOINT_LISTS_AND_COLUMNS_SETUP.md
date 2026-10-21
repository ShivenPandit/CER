# SharePoint Lists and Columns Audit & Manual Site Setup Specification

**Capital Expenditure Request Management System (CER)**

---

## 🌟 Executive Summary

This specification provides the comprehensive, field-by-field SharePoint Online configuration blueprint for manually provisioning the UAT site collection for the **Capital Expenditure Request (CER) Management System**.

### Inventory of Lists & Libraries

| #   | List / Library Display Name | Recommended Internal Title | Type                 | Status                     | Primary Purpose                                                                  |
| --- | --------------------------- | -------------------------- | -------------------- | -------------------------- | -------------------------------------------------------------------------------- |
| 1   | **CER_Proposals**           | `CER_Proposals`            | Custom List          | **Mandatory / Core**       | Primary transactional repository for all CER proposal records (Sections A–G).    |
| 2   | **CER_AuditTrail**          | `CER_AuditTrail`           | Custom List          | **Mandatory**              | Granular field-level delta change history (FR-06 & FR-07).                       |
| 3   | **CER_RemarksHistory**      | `CER_RemarksHistory`       | Custom List          | **Mandatory**              | Immutable version history for 350–400 word business remarks (FR-08).             |
| 4   | **CER_WorkflowLevels**      | `CER_WorkflowLevels`       | Custom List          | **Mandatory**              | Configurable sequential approval hierarchy and reviewer matrix (FR-05, BR-06).   |
| 5   | **CER_ApprovalDecisions**   | `CER_ApprovalDecisions`    | Custom List          | **Mandatory**              | Reviewer decision log, approval comments, and rejection justifications (FR-05).  |
| 6   | **CER_Attachments**         | `CER_Attachments`          | **Document Library** | **Mandatory**              | Document store for Section H attachments (PDFs, Word, Excel, images up to 25MB). |
| 7   | **CER_Notifications**       | `CER_Notifications`        | Custom List          | **Optional / Recommended** | Audit log for automated multi-party workflow email dispatches.                   |

- **Total Confirmed Required Lists**: 5 Custom Lists
- **Total Confirmed Required Document Libraries**: 1 Document Library
- **Total Supporting Lists**: 1 Optional Notification Audit List
- **Unresolved Architectural Questions Resolved in this Audit**:
  1. _Attachments_: `.env.example` specifies `SP_DOCLIB_ATTACHMENTS=CER_Attachments` (Document Library), while `DATABASE_DESIGN.md` modeled it as a list. A Document Library is recommended because files are up to 25MB and approvers require direct browser preview links.
  2. _Internal Names_: `SharePointCERDataService.ts` queries fields using concise programmatic names (e.g., `pr_name`, `owname`, `cat`, `st_date`, `com_date`). In SharePoint, columns must be created using the **Internal Name first**, then renamed to user-friendly Display Names so that the REST API JSON keys match the TypeScript interfaces.

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
- **Purpose**: Dedicated Document Library for file attachments (PDF, DOCX, XLSX, images up to 25MB).
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

## 🎛️ Dropdown & Choice Field Master Inventory

Every choice column used in the application is cataloged below with its exact case-sensitive values, default selection, and business logic constraints:

| List Name               | Column Display Name           | Internal Name    | Permitted Choice Values                                                          | Default Value | Mandatory in UI | Multiple Values Allowed | Fill-in Choices Allowed |
| ----------------------- | ----------------------------- | ---------------- | -------------------------------------------------------------------------------- | ------------- | --------------- | ----------------------- | ----------------------- |
| `CER_Proposals`         | **Block/SBU/Field**           | `sbu`            | 1. `RJ North`<br>2. `RJ South`<br>3. `CBOS`<br>4. `RAVA`                         | `RJ North`    | **Yes**         | No                      | No                      |
| `CER_Proposals`         | **Proposal Status**           | `status`         | 1. `Draft`<br>2. `In Approval`<br>3. `Approved`<br>4. `Rejected`<br>5. `Revised` | `Draft`       | **Yes**         | No                      | No                      |
| `CER_Proposals`         | **Category**                  | `cat`            | 1. `Vital`<br>2. `Essential`<br>3. `Desirable`                                   | `Vital`       | **Yes**         | No                      | No                      |
| `CER_Proposals`         | **Currency**                  | `currency`       | 1. `USD`<br>2. `INR`                                                             | `USD`         | **Yes**         | No                      | No                      |
| `CER_Proposals`         | **Payback/Non Payback**       | `payable`        | 1. `Payback`<br>2. `Non Payback`                                                 | `Payback`     | **Yes**         | No                      | No                      |
| `CER_Proposals`         | **Corporate Budget (Yes/No)** | `cbudget`        | 1. `Yes`<br>2. `No`<br>3. `Partially`                                            | `Yes`         | **Yes**         | No                      | No                      |
| `CER_Proposals`         | **Corporate Budget Currency** | `cb_currency`    | 1. `USD`<br>2. `INR`                                                             | `USD`         | No              | No                      | No                      |
| `CER_Proposals`         | **Aligned with JV**           | `jv`             | 1. `Yes`<br>2. `No`<br>3. `Under Discussion`                                     | `No`          | **Yes**         | No                      | No                      |
| `CER_Proposals`         | **JV Cost Recoverable**       | `jv_recoverable` | 1. `Yes`<br>2. `No`                                                              | `No`          | **Yes**         | No                      | No                      |
| `CER_Proposals`         | **JV Budget (Yes/No)**        | `jv_budget`      | 1. `Yes`<br>2. `No`                                                              | `No`          | **Yes**         | No                      | No                      |
| `CER_RemarksHistory`    | **Remarks Type**              | `remarks_type`   | 1. `REMARKS`<br>2. `REMARKS_JV`                                                  | `REMARKS`     | **Yes**         | No                      | No                      |
| `CER_ApprovalDecisions` | **Decision**                  | `decision`       | 1. `APPROVED`<br>2. `REJECTED`<br>3. `REVISED`                                   | None          | **Yes**         | No                      | No                      |
| `CER_Notifications`     | **Dispatch Status**           | `status`         | 1. `SENT`<br>2. `PENDING`<br>3. `FAILED`                                         | `SENT`        | **Yes**         | No                      | No                      |

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
   - **`approver_name`**: Single line of text → Required: Yes → Rename display to **Approver Name**.
   - **`approver_email`**: Single line of text → Required: Yes → Rename display to **Approver Email**.
   - **`min_amount`**: Number → Decimals: 2 → Required: No → Rename display to **Minimum Amount**.
   - **`max_amount`**: Number → Decimals: 2 → Required: No → Rename display to **Maximum Amount**.
   - **`is_active`**: Yes/No → Required: Yes → Default: Yes → Rename display to **Is Active**.
3. Seed Initial Levels (Required for L1 workflow auto-routing):
   - **Item 1**: `level_id`: 1, `level_name`: `L1 - Technical & SBU Review`, `role_title`: `SBU Operations Head`, `approver_name`: `Rajesh Sharma`, `approver_email`: `rajesh.sharma@vedanta.co.in`, `is_active`: Yes.
   - **Item 2**: `level_id`: 2, `level_name`: `L2 - Commercial & Financial Review`, `role_title`: `Head of Corporate Finance`, `approver_name`: `Sunil Verma`, `approver_email`: `sunil.verma@vedanta.co.in`, `is_active`: Yes.
   - **Item 3**: `level_id`: 3, `level_name`: `L3 - Executive Committee Sign-off`, `role_title`: `Executive Committee / VP`, `approver_name`: `Ananya Deshmukh`, `approver_email`: `ananya.deshmukh@vedanta.co.in`, `is_active`: Yes.

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

## 🔗 Application-to-SharePoint Traceability Matrix

| Application Feature     | Service Method        | Target List / Library   | Payload / Columns Involved                                            | Current Implementation Status                              |
| ----------------------- | --------------------- | ----------------------- | --------------------------------------------------------------------- | ---------------------------------------------------------- |
| **Create CER**          | `createProposal`      | `CER_Proposals`         | Full 54 columns mapped in `_mapProposalToSharePointItem`              | **Fully wired to REST** (Falls back to mock on HTTP error) |
| **Fetch All Proposals** | `getAllProposals`     | `CER_Proposals`         | `$top=500&$orderby=Created desc`                                      | **Fully wired to REST** (Falls back to mock on HTTP error) |
| **Lookup CER by No.**   | `getProposalByNumber` | `CER_Proposals`         | `$filter=cerprno eq '{cerprno}'`                                      | **Fully wired to REST** (Falls back to mock on HTTP error) |
| **Change / Edit CER**   | `updateProposal`      | `CER_Proposals`         | Target: `MERGE / items({id})`                                         | **Mock Fallback** (Code delegates to `_fallbackMock`)      |
| **Record Audit Trail**  | `updateProposal`      | `CER_AuditTrail`        | `cerprno, field_name, old_value, new_value, user_name, timestamp`     | **Mock Fallback** (Code delegates to `_fallbackMock`)      |
| **View Audit Trail**    | `getAuditTrail`       | `CER_AuditTrail`        | `$filter=cerprno eq '{cerprno}'`                                      | **Mock Fallback** (Code delegates to `_fallbackMock`)      |
| **Remarks History**     | `getRemarksHistory`   | `CER_RemarksHistory`    | `$filter=cerprno eq '{cerprno}'&$orderby=version desc`                | **Mock Fallback** (Code delegates to `_fallbackMock`)      |
| **Workflow Hierarchy**  | `getWorkflowLevels`   | `CER_WorkflowLevels`    | `$filter=is_active eq true&$orderby=level_id asc`                     | **Mock Fallback** (Code delegates to `_fallbackMock`)      |
| **Record Decision**     | `recordDecision`      | `CER_ApprovalDecisions` | `cerprno, level_id, approver_name, decision, comments, decision_date` | **Mock Fallback** (Code delegates to `_fallbackMock`)      |
| **Upload Attachment**   | `addAttachment`       | `CER_Attachments`       | File upload to Document Library tagged with `cerprno`                 | **Mock Fallback** (Code delegates to `_fallbackMock`)      |
| **List Attachments**    | `getAttachments`      | `CER_Attachments`       | `$filter=cerprno eq '{cerprno}'`                                      | **Mock Fallback** (Code delegates to `_fallbackMock`)      |
| **Notification Logs**   | `getNotificationLogs` | `CER_Notifications`     | Multi-party email dispatch records                                    | **Mock Fallback** (Code delegates to `_fallbackMock`)      |

---

## 🔍 Integration Gap Report

Our audit revealed three distinct categories of gaps between the code and SharePoint:

### 1. Columns Present in Form/Model but Missing in `_mapProposalToSharePointItem`

The following fields exist in `ICERProposal` and the UI forms but were inadvertently omitted from the REST mapper in `SharePointCERDataService.ts`:

- **`payback_quarters`**: Field exists in Section B (`FinancialBenefitsSection.tsx`), but was not included in `_mapProposalToSharePointItem` or `_mapSharePointItemToProposal`.
- **`jv_recoverable`**: Field exists in Section D (`BudgetJVSection.tsx`), but was not mapped in `_mapProposalToSharePointItem`.
- **`ph_till_label`, `ph_fy_label`, `ph_beyond_label`**: Mapped when reading (`_mapSharePointItemToProposal`), but omitted when creating/saving (`_mapProposalToSharePointItem`).

_(Note: Creating these columns in SharePoint now guarantees the list is ready. When `SharePointCERDataService.ts` is updated to include them in the REST payload, no further SharePoint changes will be required)._

### 2. Methods Delegating to Mock Storage

In `SharePointCERDataService.ts`:

- `getAllProposals`, `getProposalByNumber`, and `createProposal` make real `SPHttpClient` calls to `CER_Proposals`.
- `updateProposal`, `getAuditTrail`, `getRemarksHistory`, `getWorkflowLevels`, `saveWorkflowLevels`, `getApprovalDecisions`, `recordDecision`, `getAttachments`, and `addAttachment` currently delegate directly to `_fallbackMock` (local browser storage).
- **Impact**: You can successfully create and read proposals directly from SharePoint right now! However, approval decisions, audit history, and remarks versioning currently persist in the user's browser session. To make these features persist in SharePoint, the REST calls for lists 2–6 need to be wired into `SharePointCERDataService.ts`.

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

---

## ✅ UAT Verification Checklist

Once you have manually created the lists and columns in your UAT site contents, execute this verification checklist to confirm setup:

- [ ] **Site Access**: Navigate to `https://vedanta.sharepoint.com/sites/CERManagementSystem` and confirm Site contents access.
- [ ] **List Existence**: Verify that `CER_Proposals`, `CER_AuditTrail`, `CER_RemarksHistory`, `CER_WorkflowLevels`, `CER_ApprovalDecisions`, and `CER_Attachments` are visible in Site contents.
- [ ] **Proposal Uniqueness**: Confirm `Title` in `CER_Proposals` has **Enforce unique values = Yes**.
- [ ] **Internal Names Check**: In browser, navigate to:
      `https://vedanta.sharepoint.com/sites/CERManagementSystem/_api/web/lists/getByTitle('CER_Proposals')/fields?$filter=Hidden eq false`
      and confirm `pr_name`, `owname`, `sbu`, `status`, `amount`, `cat`, `st_date`, `com_date` exist as internal names.
- [ ] **Workflow Seed**: Confirm `CER_WorkflowLevels` contains at least 3 active rows (Level 1, Level 2, Level 3).
- [ ] **Create Proposal Test**:
  1. Open the CER web application hosted in the SharePoint workbench or app page.
  2. Navigate to **Create CER**.
  3. Fill out all sections and click **Submit for Approval**.
  4. Confirm the success banner appears: _"CER Proposal No. has been created and sent for approval"_.
  5. Go to SharePoint Site contents → `CER_Proposals` → confirm that a new row was inserted with all field values populated!
- [ ] **Indexed Columns**: Confirm indexed columns on `CER_Proposals` (`cerprno`, `status`, `sbu`, `cat`, `current_level`).
