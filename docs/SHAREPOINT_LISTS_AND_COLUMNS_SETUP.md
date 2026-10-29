# SharePoint Lists & Schema Specification (CamelCase Standard)

**Target Site Collection:** `https://vedanta.sharepoint.com/sites/CERManagementSystemUAT`  
**Application:** Capital Expenditure Request (CER) Management System  
**Naming Standard:** Strict CamelCase across all List Names and Column Internal Names (No Underscores `_`)  
**Version:** 3.2 (Manual List Creation & Explicit Indexing Guide)

---

## 1. Master List & Library Catalog (No Underscores)

When creating lists manually in SharePoint (**Site Contents -> New -> List -> Blank list** or **New -> Document library**), use these exact names:

| #   | List / Library Name        | SharePoint Type  | Primary Purpose                                                        |
| --- | -------------------------- | ---------------- | ---------------------------------------------------------------------- |
| 1   | **`CERProposals`**         | Custom List      | Master repository for all CER proposal records (Sections A through G). |
| 2   | **`CERAuditTrail`**        | Custom List      | Granular field-level delta change history for compliance and auditing. |
| 3   | **`CERRemarksHistory`**    | Custom List      | Threaded approval remarks and workflow discussion history.             |
| 4   | **`CERWorkflowLevels`**    | Custom List      | SBU-specific approval hierarchies, role stages, and routing logic.     |
| 5   | **`CERApprovalDecisions`** | Custom List      | Formal sign-off records (Approved / Rejected) with timestamps.         |
| 6   | **`CERAttachments`**       | Document Library | Associated technical and financial PDF/Excel documentation.            |
| 7   | **`CERNotifications`**     | Custom List      | Email notification dispatch records and recipient logs.                |
| 8   | **`CERUserRoles`**         | Custom List      | Enterprise Role-Based Access Control (RBAC) registry.                  |
| 9   | **`CERHierarchyAdmins`**   | Custom List      | Granular registry designating authorized Approval Hierarchy admins.    |

---

## 2. Complete List Specifications & Column Schemas

---

### 2.1 `CERProposals` (Master Proposals Registry)

Stores all proposal header data, financial justifications, partner details, Indian fiscal year phasing, and approval progress.

| Display Name            | Internal Column Name    | SharePoint Field Type  | Required | Unique? | Indexed?           | Choices / Format / Constraints                 | Business Description                                                                                                                                                                                                                                                   |
| ----------------------- | ----------------------- | ---------------------- | -------- | ------- | ------------------ | ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**               | `Title`                 | Single line of text    | Yes      | **Yes** | **Yes (Built-in)** | Unique CER Number (e.g., `CER-2026-0001`)      | Standard SharePoint title field, stores CER PR Number.                                                                                                                                                                                                                 |
| CER PR Number           | `cerPrNo`               | Single line of text    | Yes      | **Yes** | **Yes**            | `CER-YYYY-XXXX` format                         | Indexed business identifier for queries and joins.                                                                                                                                                                                                                     |
| Proposal Name           | `prName`                | Single line of text    | Yes      | No      | No                 | Free text (max 255 chars)                      | Project descriptive title.                                                                                                                                                                                                                                             |
| **CER Owner**           | **`cerOwner`**          | **Person or Group**    | **Yes**  | No      | **Yes**            | **`SPFieldUser` (Single)**                     | **Native SharePoint Person column.** Populated via `cerOwnerId: <IntegerId>` obtained from `ensureUser`. Provides the owner's Display Name (`cerOwner/Title`), Corporate Email (`cerOwner/EMail`), presence, and M365 profile card (eliminates redundant text fields). |
| SBU                     | `sbu`                   | Choice                 | Yes      | No      | **Yes**            | `RJ North`, `RJ South`, `CBOS`, `RAVA`         | Strategic Business Unit determining approval hierarchy.                                                                                                                                                                                                                |
| Status                  | `status`                | Choice                 | Yes      | No      | **Yes**            | `Draft`, `In Approval`, `Approved`, `Rejected` | Current lifecycle stage of the proposal.                                                                                                                                                                                                                               |
| Proposal Object         | `object`                | Multiple lines of text | No       | No      | No                 | Plain text                                     | Strategic objectives and project summary. _(Note: Multi-line text cannot be indexed in SharePoint)._                                                                                                                                                                   |
| Total Amount            | `amount`                | Number                 | Yes      | No      | **Yes**            | Decimals: 2, Min: 0                            | Total proposed capital expenditure in chosen currency.                                                                                                                                                                                                                 |
| Currency                | `currency`              | Choice                 | Yes      | No      | No                 | `USD`, `INR`, `EUR`, `GBP` (Default: `USD`)    | Currency denomination for financial figures.                                                                                                                                                                                                                           |
| Category                | `category`              | Choice                 | Yes      | No      | No                 | `Vital`, `Essential`, `Desirable`              | Asset criticality categorization.                                                                                                                                                                                                                                      |
| Payable By              | `payable`               | Choice                 | Yes      | No      | No                 | `Payback`, `Non-Payback`, `Corporate`          | Financial recovery classification.                                                                                                                                                                                                                                     |
| Benefit Period          | `period`                | Choice                 | Yes      | No      | No                 | `1 Year`, `2 Years`, `3 Years`, `5+ Years`     | Project payback evaluation timeline.                                                                                                                                                                                                                                   |
| Payback Quarters        | `paybackQuarters`       | Number                 | No       | No      | No                 | Decimals: 1                                    | Estimated duration to achieve breakeven (quarters).                                                                                                                                                                                                                    |
| Benefit NPV             | `benefitNpv`            | Number                 | No       | No      | No                 | Decimals: 2                                    | Net Present Value projection in chosen currency.                                                                                                                                                                                                                       |
| Benefit IRR             | `benefitIrr`            | Number                 | No       | No      | No                 | Decimals: 2 (%)                                | Internal Rate of Return (percentage).                                                                                                                                                                                                                                  |
| Cost Assumptions        | `costAssumptions`       | Multiple lines of text | No       | No      | No                 | Plain text                                     | Basis of cost estimation. _(Multi-line text cannot be indexed)._                                                                                                                                                                                                       |
| Start Date              | `startDate`             | Date and Time          | Yes      | No      | **Yes**            | DateOnly (ISO 8601 `YYYY-MM-DD`)               | Anticipated project execution commencement date.                                                                                                                                                                                                                       |
| Completion Date         | `completionDate`        | Date and Time          | Yes      | No      | **Yes**            | DateOnly (ISO 8601 `YYYY-MM-DD`)               | Target commissioning and handover date.                                                                                                                                                                                                                                |
| Duration Months         | `durationMonths`        | Number                 | Yes      | No      | No                 | Integer                                        | Total execution timeline in calendar months.                                                                                                                                                                                                                           |
| Current Budgeted?       | `currentBudgeted`       | Choice                 | Yes      | No      | No                 | `Yes`, `No` (Default: `Yes`)                   | Flag indicating if amount was sanctioned in annual budget.                                                                                                                                                                                                             |
| Current Budget Amount   | `currentBudgetAmount`   | Number                 | No       | No      | No                 | Decimals: 2                                    | Approved budget line amount.                                                                                                                                                                                                                                           |
| Current Budget Currency | `currentBudgetCurrency` | Choice                 | No       | No      | No                 | `USD`, `INR`, `EUR`, `GBP`                     | Currency of approved budget line.                                                                                                                                                                                                                                      |
| Unbudgeted Reason       | `unbudgetedReason`      | Multiple lines of text | No       | No      | No                 | Plain text                                     | Business justification when `currentBudgeted = No`.                                                                                                                                                                                                                    |
| Joint Venture?          | `jointVenture`          | Choice                 | Yes      | No      | No                 | `Yes`, `No` (Default: `No`)                    | Whether expenditure involves unincorporated JV partners.                                                                                                                                                                                                               |
| JV Recoverable?         | `jvRecoverable`         | Choice                 | No       | No      | No                 | `Yes`, `No`                                    | Whether partner share is contractually cost-recoverable.                                                                                                                                                                                                               |
| JV Partner Cost         | `jvCost`                | Number                 | No       | No      | No                 | Decimals: 2                                    | Net Vedanta/Cairn share of capital expenditure.                                                                                                                                                                                                                        |
| JV Budgeted?            | `jvBudgeted`            | Choice                 | No       | No      | No                 | `Yes`, `No`                                    | Whether expenditure is approved in JV Operating Committee.                                                                                                                                                                                                             |
| JV Partner Amount       | `jvAmount`              | Number                 | No       | No      | No                 | Decimals: 2                                    | Total gross JV expenditure including partner share.                                                                                                                                                                                                                    |
| JV Reason               | `jvReason`              | Multiple lines of text | No       | No      | No                 | Plain text                                     | Explanation of partner cash-call arrangements.                                                                                                                                                                                                                         |
| Phasing Prior Label     | `phTillLabel`           | Single line of text    | Yes      | No      | No                 | Dynamic Indian FY (e.g. `Till Mar'26`)         | Cumulative expenditure prior to current fiscal year.                                                                                                                                                                                                                   |
| Phasing Current Label   | `phFyLabel`             | Single line of text    | Yes      | No      | No                 | Dynamic Indian FY (e.g. `FY 26-27`)            | Projected expenditure in active Indian fiscal year.                                                                                                                                                                                                                    |
| Phasing Beyond Label    | `phBeyondLabel`         | Single line of text    | Yes      | No      | No                 | Dynamic Indian FY (e.g. `Beyond FY'27`)        | Projected expenditure across subsequent fiscal years.                                                                                                                                                                                                                  |
| Production Prior        | `prodTill`              | Number                 | No       | No      | No                 | Decimals: 2                                    | Cumulative prior production expenditure.                                                                                                                                                                                                                               |
| Production Current      | `prodFy`                | Number                 | No       | No      | No                 | Decimals: 2                                    | Active fiscal year production expenditure.                                                                                                                                                                                                                             |
| Production Beyond       | `prodBeyond`            | Number                 | No       | No      | No                 | Decimals: 2                                    | Future fiscal years production expenditure.                                                                                                                                                                                                                            |
| Capex Prior             | `capexTill`             | Number                 | No       | No      | No                 | Decimals: 2                                    | Cumulative prior capital expenditure.                                                                                                                                                                                                                                  |
| Capex Current           | `capexFy`               | Number                 | No       | No      | No                 | Decimals: 2                                    | Active fiscal year capital expenditure.                                                                                                                                                                                                                                |
| Capex Beyond            | `capexBeyond`           | Number                 | No       | No      | No                 | Decimals: 2                                    | Future fiscal years capital expenditure.                                                                                                                                                                                                                               |
| Opex Prior              | `opexTill`              | Number                 | No       | No      | No                 | Decimals: 2                                    | Cumulative prior operational expense.                                                                                                                                                                                                                                  |
| Opex Current            | `opexFy`                | Number                 | No       | No      | No                 | Decimals: 2                                    | Active fiscal year operational expense.                                                                                                                                                                                                                                |
| Opex Beyond             | `opexBeyond`            | Number                 | No       | No      | No                 | Decimals: 2                                    | Future fiscal years operational expense.                                                                                                                                                                                                                               |
| Engineering Cost        | `engineeringCost`       | Number                 | No       | No      | No                 | Decimals: 2                                    | Engineering, design, and consultancy cost breakdown.                                                                                                                                                                                                                   |
| Surface Facilities Cost | `surfaceFacilitiesCost` | Number                 | No       | No      | No                 | Decimals: 2                                    | Surface pipelines, manifolds, and civil works.                                                                                                                                                                                                                         |
| Commissioning Cost      | `commissioningCost`     | Number                 | No       | No      | No                 | Decimals: 2                                    | Plant commissioning and testing expenditure.                                                                                                                                                                                                                           |
| Preoperative Cost       | `preoperativeCost`      | Number                 | No       | No      | No                 | Decimals: 2                                    | Statutory clearances, surveys, and site preparation.                                                                                                                                                                                                                   |
| Other Costs             | `otherCosts`            | Number                 | No       | No      | No                 | Decimals: 2                                    | Contingencies and miscellaneous provisions.                                                                                                                                                                                                                            |
| Total Item Cost         | `total`                 | Number                 | Yes      | No      | No                 | Decimals: 2                                    | Sum of cost breakdown items (must equal `amount`).                                                                                                                                                                                                                     |
| General Remarks         | `remarks`               | Multiple lines of text | No       | No      | No                 | Plain text                                     | Initiator justification notes.                                                                                                                                                                                                                                         |
| JV Remarks              | `remarksJv`             | Multiple lines of text | No       | No      | No                 | Plain text                                     | Special JV partner accounting remarks.                                                                                                                                                                                                                                 |
| Current Approval Level  | `currentLevel`          | Number                 | Yes      | No      | **Yes**            | Integer (0 = Draft, 1..N = Active Level)       | Active workflow approval stage.                                                                                                                                                                                                                                        |
| Pending With Role       | `pendingWithRole`       | Single line of text    | Yes      | No      | **Yes**            | Role descriptor (e.g., `Project Owner`)        | Descriptive role of active approver stage.                                                                                                                                                                                                                             |
| Pending With Email      | `pendingWithEmail`      | Single line of text    | No       | No      | **Yes**            | Valid corporate email address                  | Specific corporate email of current pending approver.                                                                                                                                                                                                                  |
| Revision Count          | `revisionCount`         | Number                 | Yes      | No      | No                 | Integer (Default: 0)                           | Number of times proposal has been revised after rejection.                                                                                                                                                                                                             |
| Created By              | `Author`                | Person or Group        | System   | No      | **Yes (Built-in)** | Read-only SharePoint system field              | Proposal creator user card.                                                                                                                                                                                                                                            |
| Modified By             | `Editor`                | Person or Group        | System   | No      | **Yes (Built-in)** | Read-only SharePoint system field              | Last modification user card.                                                                                                                                                                                                                                           |

#### `CERProposals` — Columns to Index in SharePoint List Settings:

Go to **List Settings -> Indexed Columns -> Create a new index**:

1. `cerPrNo`
2. `cerOwner`
3. `sbu`
4. `status`
5. `amount`
6. `startDate`
7. `completionDate`
8. `currentLevel`
9. `pendingWithRole`
10. `pendingWithEmail`
    _(Note: `Title`, `Author`, and `Editor` are built-in indexes)._

---

### 2.2 `CERAuditTrail` (Field-Level Audit Log)

Maintains an immutable record of all modifications to proposals for governance compliance.

| Display Name  | Internal Column Name | SharePoint Field Type  | Required | Unique? | Indexed?           | Choices / Format / Constraints                    | Business Description                            |
| ------------- | -------------------- | ---------------------- | -------- | ------- | ------------------ | ------------------------------------------------- | ----------------------------------------------- |
| **Title**     | `Title`              | Single line of text    | Yes      | No      | **Yes (Built-in)** | CER PR Number (`cerPrNo`)                         | Links audit record to parent CER.               |
| CER PR Number | `cerPrNo`            | Single line of text    | Yes      | No      | **Yes**            | Indexed text                                      | Proposal identifier.                            |
| Field Name    | `fieldName`          | Single line of text    | Yes      | No      | **Yes**            | Column identifier                                 | Exact field changed (e.g., `amount`, `status`). |
| Old Value     | `oldValue`           | Multiple lines of text | No       | No      | No                 | Text representation                               | Value before mutation.                          |
| New Value     | `newValue`           | Multiple lines of text | No       | No      | No                 | Text representation                               | Value after mutation.                           |
| User Name     | `userName`           | Single line of text    | Yes      | No      | No                 | Full Display Name                                 | Name of person performing change.               |
| User Email    | `userEmail`          | Single line of text    | Yes      | No      | **Yes**            | Corporate email                                   | Corporate email of actor.                       |
| Timestamp     | `timestamp`          | Date and Time          | Yes      | No      | **Yes**            | DateTime (ISO 8601)                               | Precise timestamp of modification.              |
| Action Type   | `actionType`         | Choice                 | Yes      | No      | **Yes**            | `CREATE`, `UPDATE`, `APPROVE`, `REJECT`, `REVISE` | Nature of business event.                       |
| Created By    | `Author`             | Person or Group        | System   | No      | **Yes (Built-in)** | Read-only system metadata                         | SharePoint user who wrote the audit item.       |
| Modified By   | `Editor`             | Person or Group        | System   | No      | **Yes (Built-in)** | Read-only system metadata                         | SharePoint modifier metadata.                   |

#### `CERAuditTrail` — Columns to Index in SharePoint List Settings:

Go to **List Settings -> Indexed Columns -> Create a new index**:

1. `cerPrNo`
2. `fieldName`
3. `userEmail`
4. `timestamp`
5. `actionType`

---

### 2.3 `CERRemarksHistory` (Approval Comments & Discussions)

Maintains sequential historical commentary recorded by approvers and initiators.

| Display Name  | Internal Column Name | SharePoint Field Type  | Required | Unique? | Indexed?           | Choices / Format / Constraints | Business Description                            |
| ------------- | -------------------- | ---------------------- | -------- | ------- | ------------------ | ------------------------------ | ----------------------------------------------- |
| **Title**     | `Title`              | Single line of text    | Yes      | No      | **Yes (Built-in)** | CER PR Number (`cerPrNo`)      | Links remark to proposal.                       |
| CER PR Number | `cerPrNo`            | Single line of text    | Yes      | No      | **Yes**            | Indexed text                   | Proposal identifier.                            |
| Step Number   | `stepNumber`         | Number                 | Yes      | No      | **Yes**            | Integer (1..N)                 | Workflow stage at which remark was logged.      |
| Remark Text   | `remarkText`         | Multiple lines of text | Yes      | No      | No                 | Plain text                     | Verbatim commentary from approver or initiator. |
| Author Name   | `createdByUser`      | Single line of text    | Yes      | No      | No                 | Full Display Name              | Display name of comment author.                 |
| Timestamp     | `timestamp`          | Date and Time          | Yes      | No      | **Yes**            | DateTime (ISO 8601)            | Timestamp comment was submitted.                |
| Stage Role    | `stageRole`          | Single line of text    | Yes      | No      | **Yes**            | Role descriptor                | Role held by commenter (e.g. `Project Owner`).  |
| Created By    | `Author`             | Person or Group        | System   | No      | **Yes (Built-in)** | Read-only system metadata      | SharePoint user card of comment author.         |

#### `CERRemarksHistory` — Columns to Index in SharePoint List Settings:

Go to **List Settings -> Indexed Columns -> Create a new index**:

1. `cerPrNo`
2. `stepNumber`
3. `timestamp`
4. `stageRole`

---

### 2.4 `CERWorkflowLevels` (SBU-Specific Hierarchies)

Defines the multi-stage approval sequence independently configured for each SBU.

| Display Name    | Internal Column Name | SharePoint Field Type | Required | Unique? | Indexed?           | Choices / Format / Constraints           | Business Description                                                          |
| --------------- | -------------------- | --------------------- | -------- | ------- | ------------------ | ---------------------------------------- | ----------------------------------------------------------------------------- |
| **Title**       | `Title`              | Single line of text   | Yes      | No      | **Yes (Built-in)** | SBU Descriptor (e.g., `RJ North - L1`)   | Standard title for level record.                                              |
| SBU             | `sbu`                | Choice                | Yes      | No      | **Yes**            | `RJ North`, `RJ South`, `CBOS`, `RAVA`   | SBU route to which this stage belongs.                                        |
| Level ID        | `levelId`            | Number                | Yes      | No      | **Yes**            | Integer (Contiguous 1, 2, 3.. N per SBU) | Sequential stage execution order.                                             |
| Role Title      | `roleTitle`          | Single line of text   | Yes      | No      | **Yes**            | e.g. `Project Owner`, `Discipline Lead`  | Descriptive governance stage title.                                           |
| Assignment Type | `assignmentType`     | Choice                | Yes      | No      | **Yes**            | `SpecificUser`, `ProjectOwnerAuto`       | When `ProjectOwnerAuto`, dynamically auto-fetches from proposal's `cerOwner`. |
| Is Active       | `isActive`           | Yes/No (Boolean)      | Yes      | No      | **Yes**            | `true` / `false` (Default: `Yes`)        | Whether stage participates in active approval routing.                        |
| Created By      | `Author`             | Person or Group       | System   | No      | **Yes (Built-in)** | Read-only SharePoint system field        | Administrator who created the stage record.                                   |
| Modified By     | `Editor`             | Person or Group       | System   | No      | **Yes (Built-in)** | Read-only SharePoint system field        | Administrator who last updated the stage.                                     |

_(Note: Columns `approverName` and `approverEmail` are removed/not needed because approvers are dynamically resolved via Person fields)._

#### `CERWorkflowLevels` — Columns to Index in SharePoint List Settings:

Go to **List Settings -> Indexed Columns -> Create a new index**:

1. `sbu`
2. `levelId`
3. `roleTitle`
4. `assignmentType`
5. `isActive`

---

### 2.5 `CERApprovalDecisions` (Formal Sign-Offs)

Captures formal sign-off records by approvers with timestamps and outcomes.

| Display Name  | Internal Column Name | SharePoint Field Type  | Required | Unique? | Indexed?           | Choices / Format / Constraints    | Business Description                                                                                                                                                |
| ------------- | -------------------- | ---------------------- | -------- | ------- | ------------------ | --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**     | `Title`              | Single line of text    | Yes      | No      | **Yes (Built-in)** | CER PR Number (`cerPrNo`)         | Links decision to proposal.                                                                                                                                         |
| CER PR Number | `cerPrNo`            | Single line of text    | Yes      | No      | **Yes**            | Indexed text                      | Proposal identifier.                                                                                                                                                |
| Level ID      | `levelId`            | Number                 | Yes      | No      | **Yes**            | Integer (1..N)                    | Workflow stage decided.                                                                                                                                             |
| Decision      | `decision`           | Choice                 | Yes      | No      | **Yes**            | `Approved`, `Rejected`            | Outcome of approver evaluation.                                                                                                                                     |
| **Approver**  | **`approver`**       | **Person or Group**    | **Yes**  | No      | **Yes**            | **`SPFieldUser` (Single)**        | **Native SharePoint Person column.** (Or relies on built-in `Author`). Stores approver's full M365 identity, email, and presence. Eliminates redundant text fields. |
| Remarks       | `remarks`            | Multiple lines of text | No       | No      | No                 | Plain text                        | Mandatory on rejection; optional on approval.                                                                                                                       |
| Decided At    | `decidedAt`          | Date and Time          | Yes      | No      | **Yes**            | DateTime (ISO 8601)               | Timestamp decision was finalized.                                                                                                                                   |
| Created By    | `Author`             | Person or Group        | System   | No      | **Yes (Built-in)** | Read-only SharePoint system field | Native Person column recording who submitted the decision.                                                                                                          |

_(Note: Columns `approverName` and `approverEmail` are replaced by the Person field `approver` / `Author` and do not need to be created as text)._

#### `CERApprovalDecisions` — Columns to Index in SharePoint List Settings:

Go to **List Settings -> Indexed Columns -> Create a new index**:

1. `cerPrNo`
2. `levelId`
3. `decision`
4. `approver` (Person or Group)
5. `decidedAt`

---

### 2.6 `CERAttachments` (Document Library)

Document library storing all supporting project files.

| Display Name    | Internal Column Name | SharePoint Field Type | Required | Unique?          | Indexed?           | Choices / Format / Constraints                 | Business Description                                                                                                                                                                                                                                                  |
| --------------- | -------------------- | --------------------- | -------- | ---------------- | ------------------ | ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Name**        | `FileLeafRef`        | File Leaf             | System   | **Yes (Folder)** | **Yes (Built-in)** | Valid filename (.pdf, .xlsx, .docx, .png)      | Uploaded physical document filename.                                                                                                                                                                                                                                  |
| CER PR Number   | `cerPrNo`            | Single line of text   | Yes      | No               | **Yes**            | Indexed text                                   | Links attachment to specific CER proposal.                                                                                                                                                                                                                            |
| Category        | `category`           | Choice                | Yes      | No               | **Yes**            | `Technical`, `Financial`, `Quotation`, `Other` | Classification of uploaded document.                                                                                                                                                                                                                                  |
| **Uploaded By** | **`uploadedBy`**     | **Person or Group**   | **Yes**  | No               | **Yes**            | **`SPFieldUser` (Single)**                     | **Native SharePoint Person column.** Populated via `uploadedById: <IntegerId>` obtained from `ensureUser`. Provides uploader Display Name (`uploadedBy/Title`), Corporate Email (`uploadedBy/EMail`), presence, and M365 profile card (replaces plain text uploader). |
| Upload Date     | `uploadDate`         | Date and Time         | Yes      | No               | **Yes**            | DateTime (ISO 8601)                            | Timestamp of upload.                                                                                                                                                                                                                                                  |
| Checked Out To  | `CheckoutUser`       | Person or Group       | System   | No               | **Yes (Built-in)** | Optional (Single)                              | Standard SharePoint document checkout lock.                                                                                                                                                                                                                           |

#### `CERAttachments` — Columns to Index in SharePoint Library Settings:

Go to **Library Settings -> Indexed Columns -> Create a new index**:

1. `cerPrNo`
2. `category`
3. `uploadedBy`
4. `uploadDate`

---

### 2.7 `CERNotifications` (Notification Dispatch History)

Audit log of all system-generated email notifications dispatched to stakeholders.

| Display Name  | Internal Column Name | SharePoint Field Type  | Required | Unique? | Indexed?           | Choices / Format / Constraints          | Business Description                                 |
| ------------- | -------------------- | ---------------------- | -------- | ------- | ------------------ | --------------------------------------- | ---------------------------------------------------- |
| **Title**     | `Title`              | Single line of text    | Yes      | No      | **Yes (Built-in)** | CER PR Number (`cerPrNo`)               | Links notification to proposal.                      |
| CER PR Number | `cerPrNo`            | Single line of text    | Yes      | No      | **Yes**            | Indexed text                            | Proposal identifier.                                 |
| Recipients    | `recipients`         | Multiple lines of text | Yes      | No      | No                 | Semicolon-delimited emails              | Corporate email addresses of all message recipients. |
| Subject       | `subject`            | Single line of text    | Yes      | No      | No                 | Email subject line                      | Notification email subject line.                     |
| Body Preview  | `bodyPreview`        | Multiple lines of text | No       | No      | No                 | Summary text                            | Snippet or full text of notification message.        |
| Trigger Event | `triggerEvent`       | Choice                 | Yes      | No      | **Yes**            | `SUBMIT`, `APPROVE`, `REJECT`, `REVISE` | Business action that triggered dispatch.             |
| Created       | `Created`            | Date and Time          | System   | No      | **Yes (Built-in)** | DateTime (ISO 8601)                     | Timestamp notification was logged.                   |

#### `CERNotifications` — Columns to Index in SharePoint List Settings:

Go to **List Settings -> Indexed Columns -> Create a new index**:

1. `cerPrNo`
2. `triggerEvent`

---

### 2.8 `CERUserRoles` (Master RBAC Registry & Person Columns)

Stores role assignments for governance, authorization checks, and directory integration.

| Display Name    | Internal Column Name | SharePoint Field Type | Required | Unique? | Indexed? | Choices / Format / Constraints                    | Business Description                                                                                                                                                                                                                    |
| --------------- | -------------------- | --------------------- | -------- | ------- | -------- | ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**       | `Title`              | Single line of text   | Yes      | No      | No       | Full Display Name                                 | Employee display name.                                                                                                                                                                                                                  |
| **User**        | **`User`**           | **Person or Group**   | **Yes**  | No      | **Yes**  | **`SPFieldUser` (Single)**                        | **Native SharePoint Person column.** Populated via `UserId: <IntegerId>` obtained from `ensureUser`. Stores full employee identity including corporate email (`User/EMail`), login name (`User/Name`), presence, and M365 profile card. |
| Assigned Role   | `role`               | Choice                | Yes      | No      | **Yes**  | `Admin`, `Initiator`, `Approver`, `Finance_Audit` | Primary system security role.                                                                                                                                                                                                           |
| Approval Level  | `approvalLevel`      | Number                | No       | No      | **Yes**  | Integer (1..N, only for `Approver`)               | Target approval stage for stage approvers.                                                                                                                                                                                              |
| Department      | `department`         | Single line of text   | No       | No      | **Yes**  | Free text                                         | Employee organizational department.                                                                                                                                                                                                     |
| **Assigned By** | **`assignedBy`**     | **Person or Group**   | **Yes**  | No      | **Yes**  | **`SPFieldUser` (Single)**                        | **Native SharePoint Person column.** Populated via `assignedById: <IntegerId>` of the Administrator who granted the role. (Can also fall back to built-in `Author` / Created By).                                                       |
| Assigned Date   | `assignedDate`       | Date and Time         | Yes      | No      | **Yes**  | DateTime (ISO 8601)                               | Timestamp of role grant.                                                                                                                                                                                                                |

#### `CERUserRoles` — Columns to Index in SharePoint List Settings:

Go to **List Settings -> Indexed Columns -> Create a new index**:

1. `User`
2. `role`
3. `approvalLevel`
4. `department`
5. `assignedBy`
6. `assignedDate`

---

### 2.9 `CERHierarchyAdmins` (Approval Hierarchy Administrators)

Stores granular permission records designating which specific enterprise accounts are permitted to configure SBU approval levels and workflow hierarchies. Eliminates hardcoded administrator identities in source code.

| Display Name | Internal Column Name | SharePoint Field Type | Required | Unique? | Indexed? | Choices / Format / Constraints | Business Description                                                                                                                                                                                                                    |
| ------------ | -------------------- | --------------------- | -------- | ------- | -------- | ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Title**    | `Title`              | Single line of text   | Yes      | No      | No       | Full Display Name              | Administrator display name.                                                                                                                                                                                                             |
| **User**     | **`User`**           | **Person or Group**   | **Yes**  | **Yes** | **Yes**  | **`SPFieldUser` (Single)**     | **Native SharePoint Person column.** Populated via `UserId: <IntegerId>` obtained from `ensureUser`. Stores full employee identity including corporate email (`User/EMail`), login name (`User/Name`), presence, and M365 profile card. |
| **Active?**  | **`isActive`**       | **Yes/No**            | **Yes**  | No      | **Yes**  | Default: `Yes` (Boolean)       | Toggle to enable or suspend hierarchy management access without deleting historical record.                                                                                                                                             |
| Notes        | `notes`              | Single line of text   | No       | No      | No       | Free text (max 255 chars)      | Optional delegation reason or authorization notes.                                                                                                                                                                                      |

#### `CERHierarchyAdmins` — Columns to Index in SharePoint List Settings:

Go to **List Settings -> Indexed Columns -> Create a new index**:

1. `User`
2. `isActive`

---
