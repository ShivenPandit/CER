# SharePoint Lists & Schema Specification

**Target Site Collection**: `https://vedanta.sharepoint.com/sites/CERManagementSystemUAT`

---

## 1. Master Inventory of Lists & Libraries

| # | List / Library Display Name | Internal Title | Type | Primary Purpose |
| - | --------------------------- | -------------- | ---- | --------------- |
| 1 | **CER_Proposals** | `CER_Proposals` | Custom List | Master repository for all CER proposals (Sections A–G). |
| 2 | **CER_AuditTrail** | `CER_AuditTrail` | Custom List | Granular field-level delta change history (FR-06 & FR-07). |
| 3 | **CER_RemarksHistory** | `CER_RemarksHistory` | Custom List | Immutable version history for 350–400 word business remarks (FR-08). |
| 4 | **CER_WorkflowLevels** | `CER_WorkflowLevels` | Custom List | Configurable sequential approval hierarchy and reviewer matrix (FR-05, BR-06). |
| 5 | **CER_ApprovalDecisions** | `CER_ApprovalDecisions` | Custom List | Reviewer decision log, approval comments, and justifications (FR-05). |
| 6 | **CER_Attachments** | `CER_Attachments` | **Document Library** | Document repository for attachments (PDFs, Word, Excel, images). |
| 7 | **CER_Notifications** | `CER_Notifications` | Custom List | Audit log for automated multi-party workflow email dispatches. |
| 8 | **CER_UserRoles** | `CER_UserRoles` | Custom List | Enterprise Role-Based Access Control assignments (Admin, Initiator, Approver, Finance_Audit). |

---

## 2. Complete List Schema Specifications

### 2.1 `CER_Proposals` (Primary CER Records)

| # | Column Display Name | Internal Name | Type | Req | Indexed | Choices / Settings / Notes |
| - | ------------------- | ------------- | ---- | --- | ------- | -------------------------- |
| 1 | **Title** *(System)* | `Title` | Single line of text | Yes | **Yes** | Repurposed as Proposal Number (`CER-YYYY-XXXX`). Unique. |
| 2 | **CER Proposal No.** | `cerprno` | Single line of text | Yes | **Yes** | Max 50. Format: `CER-YYYY-XXXX`. Unique. |
| 3 | **Name of Project** | `pr_name` | Single line of text | Yes | No | Max 255. |
| 4 | **CER Owner Name** | `owname` | Single line of text | Yes | No | Max 100. Employee full display name. |
| 5 | **Owner Email** | `owner_email` | Single line of text | Yes | No | Max 150. Corporate email format. |
| 6 | **Block/SBU/Field** | `sbu` | Choice | Yes | **Yes** | `RJ North`, `RJ South`, `CBOS`, `RAVA`. Default: `RJ North`. |
| 7 | **Proposal Status** | `status` | Choice | Yes | **Yes** | `Draft`, `In Approval`, `Approved`, `Rejected`, `Revised`. Default: `Draft`. |
| 8 | **Objectives of CER** | `object` | Multiple lines of text | Yes | No | Plain text. Max 2000 chars. |
| 9 | **Amount of CER** | `amount` | Number | Yes | No | Decimals: 2. Positive value. |
| 10 | **Currency** | `currency` | Choice | Yes | No | `USD`, `INR`. Default: `USD`. |
| 11 | **Category** | `cat` | Choice | Yes | **Yes** | `Vital`, `Essential`, `Desirable`. Default: `Vital`. |
| 12 | **Payback/Non Payback** | `payable` | Choice | Yes | No | `Payback`, `Non Payback`. Default: `Payback`. |
| 13 | **Total Duration** | `period` | Single line of text | No | No | Computed duration text (e.g. `8 Days`, `14 Months`). |
| 14 | **Payback Period (Quarters)** | `payback_quarters` | Number | No | No | Decimals: 0. Required if Payback. |
| 15 | **Financial Benefits – NPV ($mm)** | `ben_npv` | Number | No | No | Decimals: 2. |
| 16 | **Financial Benefit – IRR (%)** | `ben_irr` | Number | No | No | Decimals: 1. Min: 0, Max: 100. |
| 17 | **Key Assumptions** | `cost_assumptions` | Multiple lines of text | Yes | No | Plain text. |
| 18 | **Start Date of Project** | `st_date` | Date and Time | Yes | No | Date Only. |
| 19 | **Completion Date of Project** | `com_date` | Date and Time | Yes | No | Date Only. Must be >= Start Date. |
| 20 | **Total Duration (Months)** | `duration_months` | Number | No | No | Decimals: 1. |
| 21 | **Corporate Budget (Yes/No)** | `cbudget` | Choice | Yes | No | `Yes`, `No`, `Partially`. Default: `Yes`. |
| 22 | **Corporate Budget Amount ($mm)** | `cb_amnt` | Number | No | No | Decimals: 2. |
| 23 | **Corporate Budget Currency** | `cb_currency` | Choice | No | No | `USD`, `INR`. Default: `USD`. |
| 24 | **Reason (Budget Variance)** | `reason` | Multiple lines of text | No | No | Plain text. Required if No/Partially. |
| 25 | **Aligned with JV** | `jv` | Choice | Yes | No | `Yes`, `No`, `Under Discussion`. Default: `No`. |
| 26 | **JV Cost Recoverable** | `jv_recoverable` | Choice | No | No | `Yes`, `No`. Default: `No`. |
| 27 | **JV Cost Share ($mm)** | `jv_cost` | Number | No | No | Decimals: 2. |
| 28 | **JV Budget (Yes/No)** | `jv_budget` | Choice | Yes | No | `Yes`, `No`. Default: `No`. |
| 29 | **JV Budget Amount ($mm)** | `jv_amnt` | Number | No | No | Decimals: 2. |
| 30 | **Reason (JV Variance)** | `jv_reason` | Multiple lines of text | No | No | Plain text. Required if JV Budget is No. |
| 31 | **Phasing Label - Till** | `ph_till_label` | Single line of text | No | No | Auto-calculated Indian FY label (e.g. `Till Mar'26`). |
| 32 | **Phasing Label - Current FY** | `ph_fy_label` | Single line of text | No | No | Auto-calculated Indian FY label (e.g. `FY 26-27`). |
| 33 | **Phasing Label - Beyond FY** | `ph_beyond_label` | Single line of text | No | No | Auto-calculated Indian FY label (e.g. `Beyond FY'27`). |
| 34 | **Production - Till** | `prod_till` | Number | No | No | Decimals: 2. mmbbls. Default: 0. |
| 35 | **Production - Current FY** | `prod_fy` | Number | No | No | Decimals: 2. mmbbls. Default: 0. |
| 36 | **Production - Beyond FY** | `prod_beyond` | Number | No | No | Decimals: 2. mmbbls. Default: 0. |
| 37 | **Capex - Till** | `capex_till` | Number | No | No | Decimals: 2. $mm. Default: 0. |
| 38 | **Capex - Current FY** | `capex_fy` | Number | No | No | Decimals: 2. $mm. Default: 0. |
| 39 | **Capex - Beyond FY** | `capex_beyond` | Number | No | No | Decimals: 2. $mm. Default: 0. |
| 40 | **Opex - Till** | `opex_till` | Number | No | No | Decimals: 2. $mm. Default: 0. |
| 41 | **Opex - Current FY** | `opex_fy` | Number | No | No | Decimals: 2. $mm. Default: 0. |
| 42 | **Opex - Beyond FY** | `opex_beyond` | Number | No | No | Decimals: 2. $mm. Default: 0. |
| 43 | **Cost - Engineering** | `engineer` | Number | No | No | Decimals: 2. $mm. Default: 0. |
| 44 | **Cost - Site Facilities** | `s_fac` | Number | No | No | Decimals: 2. $mm. Default: 0. |
| 45 | **Cost - Commissioning** | `comis` | Number | No | No | Decimals: 2. $mm. Default: 0. |
| 46 | **Cost - Pre Operations** | `preop` | Number | No | No | Decimals: 2. $mm. Default: 0. |
| 47 | **Cost - Others** | `others` | Number | No | No | Decimals: 2. $mm. Default: 0. |
| 48 | **Total Estimated Cost** | `total` | Number | No | No | Decimals: 2. Auto-calculated sum. Default: 0. |
| 49 | **Remarks & Justification** | `remarks` | Multiple lines of text | Yes | No | Plain text. Word limit: 350–400 words. |
| 50 | **Remarks on JV Risk** | `remarks_jv` | Multiple lines of text | No | No | Plain text. Risk justification. |
| 51 | **Current Approval Level** | `current_level` | Number | No | **Yes** | Decimals: 0. Sequential stage index (1, 2, 3...). Default: 1. |
| 52 | **Pending With Role** | `pending_with_role` | Single line of text | No | No | Max 100. Active approver role title. |
| 53 | **Pending With Email** | `pending_with_email` | Single line of text | No | No | Max 150. Active approver corporate email. |
| 54 | **Revision Count** | `revision_count` | Number | No | No | Decimals: 0. Increments on modification. Default: 0. |

---

### 2.2 `CER_AuditTrail` (Field-Level Audit Trail)

| # | Column Display Name | Internal Name | Type | Req | Indexed | Notes |
| - | ------------------- | ------------- | ---- | --- | ------- | ----- |
| 1 | **Title** *(System)* | `Title` | Single line of text | Yes | No | Repurposed as Audit Record ID or Proposal No. |
| 2 | **CER Proposal No.** | `cerprno` | Single line of text | Yes | **Yes** | Proposal number. Indexed for lookup. |
| 3 | **Field Name** | `field_name` | Single line of text | Yes | No | Technical field key (e.g. `amount`). |
| 4 | **Field Description** | `field_desc` | Single line of text | Yes | No | Human-readable label (e.g. "Amount of CER"). |
| 5 | **Old Value** | `old_value` | Multiple lines of text | No | No | Plain text representation of prior value. |
| 6 | **New Value** | `new_value` | Multiple lines of text | No | No | Plain text representation of updated value. |
| 7 | **User Name** | `user_name` | Single line of text | Yes | No | Name of modifying user. |
| 8 | **User Email** | `user_email` | Single line of text | Yes | No | Email of modifying user. |
| 9 | **Audit Date** | `audit_date` | Date and Time | Yes | No | Date Only (YYYY-MM-DD). |
| 10 | **Audit Time** | `audit_time` | Single line of text | Yes | No | HH:mm:ss. |
| 11 | **Full Timestamp** | `timestamp` | Date and Time | Yes | **Yes** | Date & Time. Indexed for chronological sorting. |
| 12 | **Is Long Text** | `is_long_text` | Yes/No | No | No | True for `remarks` and `remarks_jv` to enable diff modal. |

---

### 2.3 `CER_RemarksHistory` (Versioned Remarks Log)

| # | Column Display Name | Internal Name | Type | Req | Indexed | Notes |
| - | ------------------- | ------------- | ---- | --- | ------- | ----- |
| 1 | **Title** *(System)* | `Title` | Single line of text | Yes | No | Repurposed for `cerprno`. |
| 2 | **CER Proposal No.** | `cerprno` | Single line of text | Yes | **Yes** | Proposal number. Indexed. |
| 3 | **Version Number** | `version` | Number | Yes | No | Decimals: 0. Incremental revision number. |
| 4 | **Remarks Text** | `remarks_text` | Multiple lines of text | Yes | No | Plain text. Full narrative text. |
| 5 | **Remarks Type** | `remarks_type` | Choice | Yes | No | `REMARKS`, `REMARKS_JV`. Default: `REMARKS`. |
| 6 | **Word Count** | `word_count` | Number | Yes | No | Decimals: 0. Evaluated word count. |
| 7 | **Created By User** | `created_by_user`| Single line of text | Yes | No | Full name of author. |
| 8 | **Revision Date** | `revision_date` | Date and Time | Yes | **Yes** | Date & Time. Indexed for sorting. |

---

### 2.4 `CER_WorkflowLevels` (Approval Hierarchy Configuration)

*Note: Approval levels are configured strictly SBU-wise (`sbu` = `RJ North`, `RJ South`, `CBOS`, `RAVA`). Each level is assigned to an explicit SBU route with contiguous sequential stage numbering (`level_id` = 1, 2, 3... N per SBU). Configured levels are inherently active in approval routing. For standard approval stages, approver identities are resolved from `CER_UserRoles` matching `role = 'Approver'` and `approval_level = level_id`. When a stage is configured with role `Project Owner` (case-insensitive), the approver identity is dynamically auto-fetched per proposal from `CER_Proposals` (`owname` and `owner_email`). No SharePoint schema alterations or column additions are required, ensuring zero data migration risk and 100% backward compatibility with existing records.*

| # | Column Display Name | Internal Name | Type | Req | Indexed | Notes |
| - | ------------------- | ------------- | ---- | --- | ------- | ----- |
| 1 | **Title** *(System)* | `Title` | Single line of text | Yes | No | Level descriptor (e.g. "L1 - Technical Review"). |
| 2 | **Approval Level ID** | `level_id` | Number | Yes | **Yes** | Decimals: 0. Contiguous Sequential Stage Number (1, 2, 3... N). Scoped strictly per SBU. |
| 3 | **Level Name** | `level_name` | Single line of text | Yes | No | Max 150. Stage name. |
| 4 | **Role Title** | `role_title` | Single line of text | Yes | No | Max 100. Functional title (e.g. "Project Owner", "SBU Operations Head"). |
| 5 | **Block / SBU Route** | `sbu` | Choice | Yes | **Yes** | SBU routing: `RJ North`, `RJ South`, `CBOS`, `RAVA`. Mandatory, No default value. |
| 6 | **Created By User** | `created_by` | Single line of text | No | No | Creator name or email. |
| 7 | **Created Date** | `created_date` | Single line of text | No | No | ISO timestamp when level was configured. |

---

### 2.5 `CER_ApprovalDecisions` (Decision Trail)

| # | Column Display Name | Internal Name | Type | Req | Indexed | Notes |
| - | ------------------- | ------------- | ---- | --- | ------- | ----- |
| 1 | **Title** *(System)* | `Title` | Single line of text | Yes | No | Repurposed for `${cerprno}-L${level_id}`. |
| 2 | **CER Proposal No.** | `cerprno` | Single line of text | Yes | **Yes** | Proposal number. Indexed. |
| 3 | **Level ID** | `level_id` | Number | Yes | No | Decimals: 0. Stage number (1, 2, 3...). |
| 4 | **Level Name** | `level_name` | Single line of text | Yes | No | Stage description at review time. |
| 5 | **Approver Name** | `approver_name` | Single line of text | Yes | No | Full name of reviewing approver. |
| 6 | **Approver Email** | `approver_email`| Single line of text | Yes | No | Email of reviewing approver. |
| 7 | **Decision** | `decision` | Choice | Yes | No | `APPROVED`, `REJECTED`. |
| 8 | **Reviewer Comments**| `comments` | Multiple lines of text | No | No | Plain text justifications / remarks. |
| 9 | **Decision Timestamp**| `decision_date`| Date and Time | Yes | **Yes** | Date & Time. Indexed for sorting. |

---

### 2.6 `CER_Attachments` (Document Library)

| # | Column Display Name | Internal Name | Type | Req | Indexed | Notes |
| - | ------------------- | ------------- | ---- | --- | ------- | ----- |
| 1 | **Name** *(System)* | `FileLeafRef` | File Name | Yes | No | Stored file name. |
| 2 | **CER Proposal No.** | `cerprno` | Single line of text | Yes | **Yes** | Links file to CER proposal. |
| 3 | **Uploaded By** | `uploaded_by` | Single line of text | Yes | No | Uploader display name. |
| 4 | **File Size** | `file_size` | Number | No | No | File size in bytes. |
| 5 | **File Type** | `file_type` | Single line of text | No | No | MIME type. |

---

### 2.7 `CER_Notifications` (Workflow Notification Logs)

| # | Column Display Name | Internal Name | Type | Req | Indexed | Notes |
| - | ------------------- | ------------- | ---- | --- | ------- | ----- |
| 1 | **Title** *(System)* | `Title` | Single line of text | Yes | No | Repurposed for `cerprno`. |
| 2 | **CER Proposal No.** | `cerprno` | Single line of text | Yes | **Yes** | Target proposal number. |
| 3 | **Recipients** | `recipients` | Multiple lines of text | Yes | No | Semicolon-delimited email list. |
| 4 | **Subject** | `subject` | Single line of text | Yes | No | Email subject line. |
| 5 | **Body** | `body` | Multiple lines of text | Yes | No | Plain text notification content. |
| 6 | **Attachments Count**| `attachments_count` | Number | No | No | Count of attached files. |
| 7 | **Dispatch Timestamp**| `dispatch_timestamp` | Date and Time | Yes | **Yes** | Date & Time when dispatched. |
| 8 | **Status** | `status` | Choice | Yes | No | `SENT`, `PENDING`, `FAILED`. Default: `SENT`. |

---

### 2.8 `CER_UserRoles` (Master RBAC Registry)

*Note: Enterprise roles (Admin, Initiator, Approver, Finance_Audit) are assigned enterprise-wide. Configured user role assignments are inherently active upon grant. SBU-scoping is configured directly on approval levels in `CER_WorkflowLevels`.*

| # | Column Display Name | Internal Name | Type | Req | Indexed | Notes |
| - | ------------------- | ------------- | ---- | --- | ------- | ----- |
| 1 | **Title** *(System)* | `Title` | Single line of text | Yes | No | User Full Display Name (e.g. `Priya Kalekar (STL Digital)`). |
| 2 | **User Email** | `user_email` | Single line of text | Yes | **Yes** | Corporate email address. Indexed for identity lookup. |
| 3 | **Login Name (UPN)** | `login_name` | Single line of text | Yes | **Yes** | Claims login identity or User Principal Name. |
| 4 | **Assigned Role** | `role` | Choice | Yes | **Yes** | `Admin`, `Initiator`, `Approver`, `Finance_Audit`. |
| 5 | **Approval Level ID**| `approval_level`| Number | No | No | Decimals: 0. Stage level (1, 2, 3...) for Approver role. |
| 6 | **Department** | `department` | Single line of text | No | No | Department affiliation. |
| 7 | **Assigned By** | `assigned_by` | Single line of text | Yes | No | Administrator who granted role. |
| 8 | **Assigned Date** | `assigned_date` | Date and Time | Yes | **Yes** | Date & Time when role was assigned. |

---

## 3. Master Dropdown Choice Inventory

All choice fields in the CER Management System are dynamically resolved from SharePoint list schema:

| List Name | Column Display Name | Internal Name | Permitted Choice Values | Default Value | Mandatory |
| --------- | ------------------- | ------------- | ----------------------- | ------------- | --------- |
| `CER_Proposals` | Block/SBU/Field | `sbu` | `RJ North`, `RJ South`, `CBOS`, `RAVA` | `RJ North` | Yes |
| `CER_Proposals` | Proposal Status | `status` | `Draft`, `In Approval`, `Approved`, `Rejected`, `Revised` | `Draft` | Yes |
| `CER_Proposals` | Category | `cat` | `Vital`, `Essential`, `Desirable` | `Vital` | Yes |
| `CER_Proposals` | Currency | `currency` | `USD`, `INR` | `USD` | Yes |
| `CER_Proposals` | Payback/Non Payback | `payable` | `Payback`, `Non Payback` | `Payback` | Yes |
| `CER_Proposals` | Corporate Budget (Yes/No) | `cbudget` | `Yes`, `No`, `Partially` | `Yes` | Yes |
| `CER_Proposals` | Corporate Budget Currency | `cb_currency` | `USD`, `INR` | `USD` | No |
| `CER_Proposals` | Aligned with JV | `jv` | `Yes`, `No`, `Under Discussion` | `No` | Yes |
| `CER_Proposals` | JV Cost Recoverable | `jv_recoverable` | `Yes`, `No` | `No` | No |
| `CER_Proposals` | JV Budget (Yes/No) | `jv_budget` | `Yes`, `No` | `No` | Yes |
| `CER_RemarksHistory` | Remarks Type | `remarks_type` | `REMARKS`, `REMARKS_JV` | `REMARKS` | Yes |
| `CER_ApprovalDecisions` | Decision | `decision` | `APPROVED`, `REJECTED` | None | Yes |
| `CER_Notifications` | Dispatch Status | `status` | `SENT`, `PENDING`, `FAILED` | `SENT` | Yes |
| `CER_WorkflowLevels` | Block / SBU Route | `sbu` | `RJ North`, `RJ South`, `CBOS`, `RAVA` | None (Must Select) | Yes |
| `CER_UserRoles` | Assigned Role | `role` | `Admin`, `Initiator`, `Approver`, `Finance_Audit` | `Initiator` | Yes |

---

## 4. Security & Permissions Matrix

| Persona | SharePoint Group | Permission Level | Permitted Actions |
| ------- | ---------------- | ---------------- | ----------------- |
| **Initiator** | `CER Initiators` | Contribute | Create/edit own CER proposals, upload attachments. Cannot delete audit logs. |
| **Approver** | `CER Approvers` | Contribute | Read assigned proposals, view attachments, write approval decisions to `CER_ApprovalDecisions`. |
| **Finance / Audit** | `CER Auditors` | Read | Read-only inspection of proposals, audit trail, remarks history, and report exports. |
| **Administrator** | `CER Site Owners`| Full Control | Manage workflow levels (`CER_WorkflowLevels`), role assignments (`CER_UserRoles`), and list schema. |
