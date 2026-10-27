# SharePoint Lists & Schema Specification (CamelCase Standard)

**Target Site Collection:** `https://vedanta.sharepoint.com/sites/CERManagementSystemUAT`  
**Application:** Capital Expenditure Request (CER) Management System  
**Naming Standard:** Strict CamelCase across all List Names and Column Internal Names (No Underscores `_`)  
**Version:** 3.2 (Manual List Creation & Explicit Indexing Guide)

---

## 1. Master List & Library Catalog (No Underscores)

When creating lists manually in SharePoint (**Site Contents -> New -> List -> Blank list** or **New -> Document library**), use these exact names:

| #   | List / Library Name      | SharePoint Type  | Primary Purpose                                                        |
| --- | ------------------------ | ---------------- | ---------------------------------------------------------------------- |
| 1   | **`CERProposals`**         | Custom List      | Master repository for all CER proposal records (Sections A through G). |
| 2   | **`CERAuditTrail`**        | Custom List      | Granular field-level delta change history for compliance and auditing. |
| 3   | **`CERRemarksHistory`**    | Custom List      | Threaded approval remarks and workflow discussion history.             |
| 4   | **`CERWorkflowLevels`**    | Custom List      | SBU-specific approval hierarchies, role stages, and routing logic.     |
| 5   | **`CERApprovalDecisions`** | Custom List      | Formal sign-off records (Approved / Rejected) with timestamps.         |
| 6   | **`CERAttachments`**       | Document Library | Associated technical and financial PDF/Excel documentation.            |
| 7   | **`CERNotifications`**     | Custom List      | Email notification dispatch records and recipient logs.                |
| 8   | **`CERUserRoles`**         | Custom List      | Enterprise Role-Based Access Control (RBAC) registry.                  |

> [!NOTE]
> **Total Essential Lists = 8**: The CER system only requires the 8 lists above. An administrative logging table (`CERAdminAuditLog`) is **not required** because role grants already record who assigned them via `assignedBy` in `CERUserRoles`, proposal deltas are in `CERAuditTrail`, and SharePoint automatically tracks list modifications via built-in system versioning.

> [!TIP]
> **SharePoint Column Creation Tip**: When creating custom columns manually in SharePoint:
> 1. Type the **CamelCase Internal Name** first in the column name field (e.g., `cerPrNo`, `prName`, `startDate`, `cerOwner`) without spaces, and save.
> 2. Then, edit the column to change its Display Name if desired (e.g. `CER PR Number`, `Start Date`).
> 3. This guarantees clean internal names without SharePoint inserting `_x0020_` or random hex codes.

---

## 2. Complete List Specifications & Column Schemas

---

### 2.1 `CERProposals` (Master Proposals Registry)

Stores all proposal header data, financial justifications, partner details, Indian fiscal year phasing, and approval progress.

| Display Name | Internal Column Name | SharePoint Field Type | Required | Unique? | Indexed? | Choices / Format / Constraints | Business Description |
| ------------ | -------------------- | --------------------- | -------- | ------- | -------- | ------------------------------ | -------------------- |
| **Title** | `Title` | Single line of text | Yes | **Yes** | **Yes (Built-in)** | Unique CER Number (e.g., `CER-2026-0001`) | Standard SharePoint title field, stores CER PR Number. |
| CER PR Number | `cerPrNo` | Single line of text | Yes | **Yes** | **Yes** | `CER-YYYY-XXXX` format | Indexed business identifier for queries and joins. |
| Proposal Name | `prName` | Single line of text | Yes | No | No | Free text (max 255 chars) | Project descriptive title. |
| **CER Owner** | **`cerOwner`** | **Person or Group** | **Yes** | No | **Yes** | **`SPFieldUser` (Single)** | **Native SharePoint Person column.** Populated via `cerOwnerId: <IntegerId>` obtained from `ensureUser`. Provides the owner's Display Name (`cerOwner/Title`), Corporate Email (`cerOwner/EMail`), presence, and M365 profile card (eliminates redundant text fields). |
| SBU | `sbu` | Choice | Yes | No | **Yes** | `RJ North`, `RJ South`, `CBOS`, `RAVA` | Strategic Business Unit determining approval hierarchy. |
| Status | `status` | Choice | Yes | No | **Yes** | `Draft`, `In Approval`, `Approved`, `Rejected` | Current lifecycle stage of the proposal. |
| Proposal Object | `object` | Multiple lines of text | No | No | No | Plain text | Strategic objectives and project summary. *(Note: Multi-line text cannot be indexed in SharePoint).* |
| Total Amount | `amount` | Number | Yes | No | **Yes** | Decimals: 2, Min: 0 | Total proposed capital expenditure in chosen currency. |
| Currency | `currency` | Choice | Yes | No | No | `USD`, `INR`, `EUR`, `GBP` (Default: `USD`) | Currency denomination for financial figures. |
| Category | `category` | Choice | Yes | No | No | `Vital`, `Essential`, `Desirable` | Asset criticality categorization. |
| Payable By | `payable` | Choice | Yes | No | No | `Payback`, `Non-Payback`, `Corporate` | Financial recovery classification. |
| Benefit Period | `period` | Choice | Yes | No | No | `1 Year`, `2 Years`, `3 Years`, `5+ Years` | Project payback evaluation timeline. |
| Payback Quarters | `paybackQuarters` | Number | No | No | No | Decimals: 1 | Estimated duration to achieve breakeven (quarters). |
| Benefit NPV | `benefitNpv` | Number | No | No | No | Decimals: 2 | Net Present Value projection in chosen currency. |
| Benefit IRR | `benefitIrr` | Number | No | No | No | Decimals: 2 (%) | Internal Rate of Return (percentage). |
| Cost Assumptions | `costAssumptions` | Multiple lines of text | No | No | No | Plain text | Basis of cost estimation. *(Multi-line text cannot be indexed).* |
| Start Date | `startDate` | Date and Time | Yes | No | **Yes** | DateOnly (ISO 8601 `YYYY-MM-DD`) | Anticipated project execution commencement date. |
| Completion Date | `completionDate` | Date and Time | Yes | No | **Yes** | DateOnly (ISO 8601 `YYYY-MM-DD`) | Target commissioning and handover date. |
| Duration Months | `durationMonths` | Number | Yes | No | No | Integer | Total execution timeline in calendar months. |
| Current Budgeted? | `currentBudgeted` | Choice | Yes | No | No | `Yes`, `No` (Default: `Yes`) | Flag indicating if amount was sanctioned in annual budget. |
| Current Budget Amount | `currentBudgetAmount` | Number | No | No | No | Decimals: 2 | Approved budget line amount. |
| Current Budget Currency | `currentBudgetCurrency` | Choice | No | No | No | `USD`, `INR`, `EUR`, `GBP` | Currency of approved budget line. |
| Unbudgeted Reason | `unbudgetedReason` | Multiple lines of text | No | No | No | Plain text | Business justification when `currentBudgeted = No`. |
| Joint Venture? | `jointVenture` | Choice | Yes | No | No | `Yes`, `No` (Default: `No`) | Whether expenditure involves unincorporated JV partners. |
| JV Recoverable? | `jvRecoverable` | Choice | No | No | No | `Yes`, `No` | Whether partner share is contractually cost-recoverable. |
| JV Partner Cost | `jvCost` | Number | No | No | No | Decimals: 2 | Net Vedanta/Cairn share of capital expenditure. |
| JV Budgeted? | `jvBudgeted` | Choice | No | No | No | `Yes`, `No` | Whether expenditure is approved in JV Operating Committee. |
| JV Partner Amount | `jvAmount` | Number | No | No | No | Decimals: 2 | Total gross JV expenditure including partner share. |
| JV Reason | `jvReason` | Multiple lines of text | No | No | No | Plain text | Explanation of partner cash-call arrangements. |
| Phasing Prior Label | `phTillLabel` | Single line of text | Yes | No | No | Dynamic Indian FY (e.g. `Till Mar'26`) | Cumulative expenditure prior to current fiscal year. |
| Phasing Current Label | `phFyLabel` | Single line of text | Yes | No | No | Dynamic Indian FY (e.g. `FY 26-27`) | Projected expenditure in active Indian fiscal year. |
| Phasing Beyond Label | `phBeyondLabel` | Single line of text | Yes | No | No | Dynamic Indian FY (e.g. `Beyond FY'27`) | Projected expenditure across subsequent fiscal years. |
| Production Prior | `prodTill` | Number | No | No | No | Decimals: 2 | Cumulative prior production expenditure. |
| Production Current | `prodFy` | Number | No | No | No | Decimals: 2 | Active fiscal year production expenditure. |
| Production Beyond | `prodBeyond` | Number | No | No | No | Decimals: 2 | Future fiscal years production expenditure. |
| Capex Prior | `capexTill` | Number | No | No | No | Decimals: 2 | Cumulative prior capital expenditure. |
| Capex Current | `capexFy` | Number | No | No | No | Decimals: 2 | Active fiscal year capital expenditure. |
| Capex Beyond | `capexBeyond` | Number | No | No | No | Decimals: 2 | Future fiscal years capital expenditure. |
| Opex Prior | `opexTill` | Number | No | No | No | Decimals: 2 | Cumulative prior operational expense. |
| Opex Current | `opexFy` | Number | No | No | No | Decimals: 2 | Active fiscal year operational expense. |
| Opex Beyond | `opexBeyond` | Number | No | No | No | Decimals: 2 | Future fiscal years operational expense. |
| Engineering Cost | `engineeringCost` | Number | No | No | No | Decimals: 2 | Engineering, design, and consultancy cost breakdown. |
| Surface Facilities Cost | `surfaceFacilitiesCost` | Number | No | No | No | Decimals: 2 | Surface pipelines, manifolds, and civil works. |
| Commissioning Cost | `commissioningCost` | Number | No | No | No | Decimals: 2 | Plant commissioning and testing expenditure. |
| Preoperative Cost | `preoperativeCost` | Number | No | No | No | Decimals: 2 | Statutory clearances, surveys, and site preparation. |
| Other Costs | `otherCosts` | Number | No | No | No | Decimals: 2 | Contingencies and miscellaneous provisions. |
| Total Item Cost | `total` | Number | Yes | No | No | Decimals: 2 | Sum of cost breakdown items (must equal `amount`). |
| General Remarks | `remarks` | Multiple lines of text | No | No | No | Plain text | Initiator justification notes. |
| JV Remarks | `remarksJv` | Multiple lines of text | No | No | No | Plain text | Special JV partner accounting remarks. |
| Current Approval Level | `currentLevel` | Number | Yes | No | **Yes** | Integer (0 = Draft, 1..N = Active Level) | Active workflow approval stage. |
| Pending With Role | `pendingWithRole` | Single line of text | Yes | No | **Yes** | Role descriptor (e.g., `Project Owner`) | Descriptive role of active approver stage. |
| Pending With Email | `pendingWithEmail` | Single line of text | No | No | **Yes** | Valid corporate email address | Specific corporate email of current pending approver. |
| Revision Count | `revisionCount` | Number | Yes | No | No | Integer (Default: 0) | Number of times proposal has been revised after rejection. |
| Created By | `Author` | Person or Group | System | No | **Yes (Built-in)** | Read-only SharePoint system field | Proposal creator user card. |
| Modified By | `Editor` | Person or Group | System | No | **Yes (Built-in)** | Read-only SharePoint system field | Last modification user card. |

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
*(Note: `Title`, `Author`, and `Editor` are built-in indexes).*

---

### 2.2 `CERAuditTrail` (Field-Level Audit Log)

Maintains an immutable record of all modifications to proposals for governance compliance.

| Display Name | Internal Column Name | SharePoint Field Type | Required | Unique? | Indexed? | Choices / Format / Constraints | Business Description |
| ------------ | -------------------- | --------------------- | -------- | ------- | -------- | ------------------------------ | -------------------- |
| **Title** | `Title` | Single line of text | Yes | No | **Yes (Built-in)** | CER PR Number (`cerPrNo`) | Links audit record to parent CER. |
| CER PR Number | `cerPrNo` | Single line of text | Yes | No | **Yes** | Indexed text | Proposal identifier. |
| Field Name | `fieldName` | Single line of text | Yes | No | **Yes** | Column identifier | Exact field changed (e.g., `amount`, `status`). |
| Old Value | `oldValue` | Multiple lines of text | No | No | No | Text representation | Value before mutation. |
| New Value | `newValue` | Multiple lines of text | No | No | No | Text representation | Value after mutation. |
| User Name | `userName` | Single line of text | Yes | No | No | Full Display Name | Name of person performing change. |
| User Email | `userEmail` | Single line of text | Yes | No | **Yes** | Corporate email | Corporate email of actor. |
| Timestamp | `timestamp` | Date and Time | Yes | No | **Yes** | DateTime (ISO 8601) | Precise timestamp of modification. |
| Action Type | `actionType` | Choice | Yes | No | **Yes** | `CREATE`, `UPDATE`, `APPROVE`, `REJECT`, `REVISE` | Nature of business event. |
| Created By | `Author` | Person or Group | System | No | **Yes (Built-in)** | Read-only system metadata | SharePoint user who wrote the audit item. |
| Modified By | `Editor` | Person or Group | System | No | **Yes (Built-in)** | Read-only system metadata | SharePoint modifier metadata. |

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

| Display Name | Internal Column Name | SharePoint Field Type | Required | Unique? | Indexed? | Choices / Format / Constraints | Business Description |
| ------------ | -------------------- | --------------------- | -------- | ------- | -------- | ------------------------------ | -------------------- |
| **Title** | `Title` | Single line of text | Yes | No | **Yes (Built-in)** | CER PR Number (`cerPrNo`) | Links remark to proposal. |
| CER PR Number | `cerPrNo` | Single line of text | Yes | No | **Yes** | Indexed text | Proposal identifier. |
| Step Number | `stepNumber` | Number | Yes | No | **Yes** | Integer (1..N) | Workflow stage at which remark was logged. |
| Remark Text | `remarkText` | Multiple lines of text | Yes | No | No | Plain text | Verbatim commentary from approver or initiator. |
| Author Name | `createdByUser` | Single line of text | Yes | No | No | Full Display Name | Display name of comment author. |
| Timestamp | `timestamp` | Date and Time | Yes | No | **Yes** | DateTime (ISO 8601) | Timestamp comment was submitted. |
| Stage Role | `stageRole` | Single line of text | Yes | No | **Yes** | Role descriptor | Role held by commenter (e.g. `Project Owner`). |
| Created By | `Author` | Person or Group | System | No | **Yes (Built-in)** | Read-only system metadata | SharePoint user card of comment author. |

#### `CERRemarksHistory` — Columns to Index in SharePoint List Settings:
Go to **List Settings -> Indexed Columns -> Create a new index**:
1. `cerPrNo`
2. `stepNumber`
3. `timestamp`
4. `stageRole`

---

### 2.4 `CERWorkflowLevels` (SBU-Specific Hierarchies)

Defines the multi-stage approval sequence independently configured for each SBU.

> [!IMPORTANT]
> **Approver Fields Note — Person Field Dynamic Resolution (No Text Columns Needed)**:
> In `CERWorkflowLevels`, separate text columns for **Approver Name** (`approverName`) and **Approver Email** (`approverEmail`) are **NOT NEEDED and should NOT be created**.
> - **Standard Stages (`SpecificUser`)**: Approver identity is dynamically resolved from **`CERUserRoles`**, where each approver is stored in the **`User` (Person or Group)** column matching `role = 'Approver'` and `approvalLevel = levelId`.
> - **Dynamic Project Owner Stages (`ProjectOwnerAuto`)**: Approver identity is dynamically fetched from the proposal's **`cerOwner` (Person or Group)** column.
> - This architecture completely eliminates hardcoded text names and emails from workflow hierarchy definitions.

| Display Name | Internal Column Name | SharePoint Field Type | Required | Unique? | Indexed? | Choices / Format / Constraints | Business Description |
| ------------ | -------------------- | --------------------- | -------- | ------- | -------- | ------------------------------ | -------------------- |
| **Title** | `Title` | Single line of text | Yes | No | **Yes (Built-in)** | SBU Descriptor (e.g., `RJ North - L1`) | Standard title for level record. |
| SBU | `sbu` | Choice | Yes | No | **Yes** | `RJ North`, `RJ South`, `CBOS`, `RAVA` | SBU route to which this stage belongs. |
| Level ID | `levelId` | Number | Yes | No | **Yes** | Integer (Contiguous 1, 2, 3.. N per SBU) | Sequential stage execution order. |
| Role Title | `roleTitle` | Single line of text | Yes | No | **Yes** | e.g. `Project Owner`, `Discipline Lead` | Descriptive governance stage title. |
| Assignment Type | `assignmentType` | Choice | Yes | No | **Yes** | `SpecificUser`, `ProjectOwnerAuto` | When `ProjectOwnerAuto`, dynamically auto-fetches from proposal's `cerOwner`. |
| Is Active | `isActive` | Yes/No (Boolean) | Yes | No | **Yes** | `true` / `false` (Default: `Yes`) | Whether stage participates in active approval routing. |
| Created By | `Author` | Person or Group | System | No | **Yes (Built-in)** | Read-only SharePoint system field | Administrator who created the stage record. |
| Modified By | `Editor` | Person or Group | System | No | **Yes (Built-in)** | Read-only SharePoint system field | Administrator who last updated the stage. |

*(Note: Columns `approverName` and `approverEmail` are removed/not needed because approvers are dynamically resolved via Person fields).*

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

> [!IMPORTANT]
> **Approver Identity Note — Native Person Field / Built-in Author (No Text Columns Needed)**:
> In `CERApprovalDecisions`, separate text columns for **Approver Name** (`approverName`) and **Approver Email** (`approverEmail`) are **NOT NEEDED**.
> - **Native Built-in `Author` ("Created By")**: SharePoint automatically captures the authenticated approver into `Author` (a native Person or Group field). This provides their Display Name (`Author/Title`), Corporate Email (`Author/EMail`), presence, and M365 profile card automatically.
> - **Native `approver` Column**: If an explicit approver field is created on the list, create a single **`approver` (Person or Group)** column (Internal Name: `approver`, Required: `Yes`, Indexed: **`Yes`**).
> - Do **NOT** create redundant text fields `approverName` and `approverEmail`.

| Display Name | Internal Column Name | SharePoint Field Type | Required | Unique? | Indexed? | Choices / Format / Constraints | Business Description |
| ------------ | -------------------- | --------------------- | -------- | ------- | -------- | ------------------------------ | -------------------- |
| **Title** | `Title` | Single line of text | Yes | No | **Yes (Built-in)** | CER PR Number (`cerPrNo`) | Links decision to proposal. |
| CER PR Number | `cerPrNo` | Single line of text | Yes | No | **Yes** | Indexed text | Proposal identifier. |
| Level ID | `levelId` | Number | Yes | No | **Yes** | Integer (1..N) | Workflow stage decided. |
| Decision | `decision` | Choice | Yes | No | **Yes** | `Approved`, `Rejected` | Outcome of approver evaluation. |
| **Approver** | **`approver`** | **Person or Group** | **Yes** | No | **Yes** | **`SPFieldUser` (Single)** | **Native SharePoint Person column.** (Or relies on built-in `Author`). Stores approver's full M365 identity, email, and presence. Eliminates redundant text fields. |
| Remarks | `remarks` | Multiple lines of text | No | No | No | Plain text | Mandatory on rejection; optional on approval. |
| Decided At | `decidedAt` | Date and Time | Yes | No | **Yes** | DateTime (ISO 8601) | Timestamp decision was finalized. |
| Created By | `Author` | Person or Group | System | No | **Yes (Built-in)** | Read-only SharePoint system field | Native Person column recording who submitted the decision. |

*(Note: Columns `approverName` and `approverEmail` are replaced by the Person field `approver` / `Author` and do not need to be created as text).*

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

| Display Name | Internal Column Name | SharePoint Field Type | Required | Unique? | Indexed? | Choices / Format / Constraints | Business Description |
| ------------ | -------------------- | --------------------- | -------- | ------- | -------- | ------------------------------ | -------------------- |
| **Name** | `FileLeafRef` | File Leaf | System | **Yes (Folder)** | **Yes (Built-in)** | Valid filename (.pdf, .xlsx, .docx, .png) | Uploaded physical document filename. |
| CER PR Number | `cerPrNo` | Single line of text | Yes | No | **Yes** | Indexed text | Links attachment to specific CER proposal. |
| Category | `category` | Choice | Yes | No | **Yes** | `Technical`, `Financial`, `Quotation`, `Other` | Classification of uploaded document. |
| **Uploaded By** | **`uploadedBy`** | **Person or Group** | **Yes** | No | **Yes** | **`SPFieldUser` (Single)** | **Native SharePoint Person column.** Populated via `uploadedById: <IntegerId>` obtained from `ensureUser`. Provides uploader Display Name (`uploadedBy/Title`), Corporate Email (`uploadedBy/EMail`), presence, and M365 profile card (replaces plain text uploader). |
| Upload Date | `uploadDate` | Date and Time | Yes | No | **Yes** | DateTime (ISO 8601) | Timestamp of upload. |
| Checked Out To | `CheckoutUser` | Person or Group | System | No | **Yes (Built-in)** | Optional (Single) | Standard SharePoint document checkout lock. |

#### `CERAttachments` — Columns to Index in SharePoint Library Settings:
Go to **Library Settings -> Indexed Columns -> Create a new index**:
1. `cerPrNo`
2. `category`
3. `uploadedBy`
4. `uploadDate`

---

### 2.7 `CERNotifications` (Notification Dispatch History)

Audit log of all system-generated email notifications dispatched to stakeholders.

| Display Name | Internal Column Name | SharePoint Field Type | Required | Unique? | Indexed? | Choices / Format / Constraints | Business Description |
| ------------ | -------------------- | --------------------- | -------- | ------- | -------- | ------------------------------ | -------------------- |
| **Title** | `Title` | Single line of text | Yes | No | **Yes (Built-in)** | CER PR Number (`cerPrNo`) | Links notification to proposal. |
| CER PR Number | `cerPrNo` | Single line of text | Yes | No | **Yes** | Indexed text | Proposal identifier. |
| Recipients | `recipients` | Multiple lines of text | Yes | No | No | Semicolon-delimited emails | Corporate email addresses of all message recipients. |
| Subject | `subject` | Single line of text | Yes | No | No | Email subject line | Notification email subject line. |
| Body Preview | `bodyPreview` | Multiple lines of text | No | No | No | Summary text | Snippet or full text of notification message. |
| Trigger Event | `triggerEvent` | Choice | Yes | No | **Yes** | `SUBMIT`, `APPROVE`, `REJECT`, `REVISE` | Business action that triggered dispatch. |
| Created | `Created` | Date and Time | System | No | **Yes (Built-in)** | DateTime (ISO 8601) | Timestamp notification was logged. |

#### `CERNotifications` — Columns to Index in SharePoint List Settings:
Go to **List Settings -> Indexed Columns -> Create a new index**:
1. `cerPrNo`
2. `triggerEvent`

---

### 2.8 `CERUserRoles` (Master RBAC Registry & Person Columns)

Stores role assignments for governance, authorization checks, and directory integration.

| Display Name | Internal Column Name | SharePoint Field Type | Required | Unique? | Indexed? | Choices / Format / Constraints | Business Description |
| ------------ | -------------------- | --------------------- | -------- | ------- | -------- | ------------------------------ | -------------------- |
| **Title** | `Title` | Single line of text | Yes | No | No | Full Display Name | Employee display name. |
| **User** | **`User`** | **Person or Group** | **Yes** | No | **Yes** | **`SPFieldUser` (Single)** | **Native SharePoint Person column.** Populated via `UserId: <IntegerId>` obtained from `ensureUser`. Stores full employee identity including corporate email (`User/EMail`), login name (`User/Name`), presence, and M365 profile card. |
| Assigned Role | `role` | Choice | Yes | No | **Yes** | `Admin`, `Initiator`, `Approver`, `Finance_Audit` | Primary system security role. |
| Approval Level | `approvalLevel` | Number | No | No | **Yes** | Integer (1..N, only for `Approver`) | Target approval stage for stage approvers. |
| Department | `department` | Single line of text | No | No | **Yes** | Free text | Employee organizational department. |
| **Assigned By** | **`assignedBy`** | **Person or Group** | **Yes** | No | **Yes** | **`SPFieldUser` (Single)** | **Native SharePoint Person column.** Populated via `assignedById: <IntegerId>` of the Administrator who granted the role. (Can also fall back to built-in `Author` / Created By). |
| Assigned Date | `assignedDate` | Date and Time | Yes | No | **Yes** | DateTime (ISO 8601) | Timestamp of role grant. |

#### `CERUserRoles` — Columns to Index in SharePoint List Settings:
Go to **List Settings -> Indexed Columns -> Create a new index**:
1. `User`
2. `role`
3. `approvalLevel`
4. `department`
5. `assignedBy`
6. `assignedDate`

---

## 3. Step-by-Step Manual List & Column Creation Procedure

Follow these exact steps when creating the lists and columns in SharePoint Online:

### Step 1: Create the List or Library
1. Navigate to your site: `https://vedanta.sharepoint.com/sites/CERManagementSystemUAT`
2. Click the gear icon (**Settings**) -> **Site contents**.
3. Click **+ New** -> **List** -> **Blank list** (or **Document library** for `CERAttachments`).
4. Enter the **List Name** in clean CamelCase (e.g. `CERProposals`, `CERWorkflowLevels`, etc.).
5. Uncheck "Show in site navigation" if not needed, then click **Create**.

### Step 2: Create Custom Columns
For each column in the tables above:
1. Click **+ Add column** in the list view (or go to **List Settings -> Create column**).
2. Choose the specified **Field Type** (Single line of text, Number, Choice, Date and time, Person, Yes/No, Multiple lines of text).
3. **Important**: Type the **Internal Column Name** (e.g., `cerPrNo`, `sbu`, `levelId`, `cerOwner`) into the Name box and click **Save**.
4. If you wish to give it a user-friendly display name (e.g., `CER PR Number`), click the column header -> **Column settings** -> **Edit** -> change Name to `CER PR Number` -> click **Save**. (SharePoint will preserve the original internal name!).
5. For **Required** columns: in column settings, expand **More options** -> set **Require that this column contains information** to **Yes**.
6. For **Unique** columns (`cerPrNo` in `CERProposals`): expand **More options** -> set **Enforce unique values** to **Yes**.

### Step 3: Configure Person or Group Columns (`cerOwner`, `uploadedBy`, `approver`, `User`, `assignedBy`)
When creating a **Person or Group** column:
1. Choose type: **Person**.
2. Name: enter the internal name (e.g. `cerOwner`, `approver`, `User`, `assignedBy`, `uploadedBy`).
3. Expand **More options**:
   - **Allow multiple selections**: **No** (Single user only).
   - **Allow selection of**: **People only**.
   - **Choose from**: **All users**.
   - **Show field**: **Name (with presence)**.
4. Click **Save**.

### Step 4: Configure Indexed Columns
After adding all columns to a list:
1. Click the gear icon (**Settings**) -> **List settings**.
2. Scroll down to the **Columns** section.
3. Below the list of columns, click **Indexed columns**.
4. Click **Create a new index**.
5. Under **Primary column for this index**, select the column from the dropdown.
6. Click **Create**.
7. Repeat for each indexed column listed in the **Master Indexing Matrix** below.

---

## 4. Master Indexing Matrix (Quick Reference for All 8 Lists)

This matrix summarizes the **exact columns to index** in SharePoint **List Settings -> Indexed Columns**:

| # | List Name | Total Columns | Custom Columns to Index in SharePoint | Built-in Indexed Columns | Custom Indexes Budget (Max 20) | Primary Filter / Query Purpose |
| - | --------- | ------------- | ------------------------------------- | ------------------------ | ------------------------------ | ------------------------------ |
| 1 | **`CERProposals`** | 53 | `cerPrNo`, `cerOwner`, `sbu`, `status`, `amount`, `startDate`, `completionDate`, `currentLevel`, `pendingWithRole`, `pendingWithEmail` | `Title`, `Author`, `Editor` | 10 / 20 | Proposal queries, dashboard views, "My Proposals", and "Pending My Approvals". |
| 2 | **`CERAuditTrail`** | 11 | `cerPrNo`, `fieldName`, `userEmail`, `timestamp`, `actionType` | `Title`, `Author`, `Editor` | 5 / 20 | Proposal audit tab (`cerPrNo`), user activity audit, reverse chronological sorting. |
| 3 | **`CERRemarksHistory`** | 8 | `cerPrNo`, `stepNumber`, `timestamp`, `stageRole` | `Title`, `Author` | 4 / 20 | Proposal remarks tab (`cerPrNo`), stage filtering, chronological discussion sorting. |
| 4 | **`CERWorkflowLevels`** | 8 | `sbu`, `levelId`, `roleTitle`, `assignmentType`, `isActive` | `Title`, `Author`, `Editor` | 5 / 20 | SBU hierarchy loading (`sbu eq '...'`), sequence sorting (`levelId`), active stages. |
| 5 | **`CERApprovalDecisions`** | 7 | `cerPrNo`, `levelId`, `decision`, `approver`, `decidedAt` | `Title`, `Author`, `Editor` | 5 / 20 | Decision history (`cerPrNo`), stage decision checks, approver audit logs. |
| 6 | **`CERAttachments`** | 6 | `cerPrNo`, `category`, `uploadedBy`, `uploadDate` | `FileLeafRef`, `CheckoutUser` | 4 / 20 | Document retrieval (`cerPrNo`), category filtering, uploader filtering. |
| 7 | **`CERNotifications`** | 7 | `cerPrNo`, `triggerEvent` | `Title`, `Created` | 2 / 20 | Dispatch audit logs (`cerPrNo`), event type filtering (`triggerEvent`). |
| 8 | **`CERUserRoles`** | 7 | `User`, `role`, `approvalLevel`, `department`, `assignedBy`, `assignedDate` | `Title`, `Created` | 6 / 20 | RBAC authorization checks (`User/Id`), approver resolution, department views. |

---

## 5. Person or Group Column Mechanics (REST API Standard)

When reading and writing SharePoint Person or Group columns (such as `User` in `CERUserRoles`, `cerOwner` in `CERProposals`, `uploadedBy` in `CERAttachments`, or `approver` in `CERApprovalDecisions`), follow these strict REST rules:

### 5.1 Writing Person Columns (POST / MERGE)

SharePoint **rejects** raw email strings or nested user objects for Person columns. You MUST write using the ID-suffixed key:

- **CERUserRoles — `User` and `assignedBy` Columns:**
  ```json
  {
    "UserId": 105,
    "assignedById": 42
  }
  ```
- **CERProposals — `cerOwner` Column:**
  ```json
  {
    "cerOwnerId": 105
  }
  ```
- **CERApprovalDecisions — `approver` Column:**
  ```json
  {
    "approverId": 105
  }
  ```
- **CERAttachments — `uploadedBy` Column (on ListItemAllFields):**
  ```json
  {
    "uploadedById": 105
  }
  ```

### 5.2 Resolving User IDs via `ensureUser`

The integer ID (`105`) is site-collection specific and is automatically resolved by `PersonFieldService` via:

```http
POST https://vedanta.sharepoint.com/sites/CERManagementSystemUAT/_api/web/ensureUser
Content-Type: application/json;odata=verbose
Accept: application/json;odata=nometadata

{
  "logonName": "shiven.pandit@vedanta.co.in"
}
```

The returned JSON provides the integer `Id`, `Title` (Display Name), `Email`, and `LoginName`.

### 5.3 Reading Person Columns (GET with `$expand`)

By expanding the Person columns, the application retrieves full identity details in a single query without redundant text columns:

- **Reading `CERUserRoles`:**
  ```http
  GET /_api/web/lists/getByTitle('CERUserRoles')/items?$select=Id,Title,role,approvalLevel,department,assignedDate,User/Id,User/Title,User/EMail,User/Name,assignedBy/Id,assignedBy/Title,assignedBy/EMail&$expand=User,assignedBy
  ```
- **Reading `CERProposals`:**
  ```http
  GET /_api/web/lists/getByTitle('CERProposals')/items?$select=*,cerOwner/Id,cerOwner/Title,cerOwner/EMail,cerOwner/Name&$expand=cerOwner
  ```
- **Reading `CERApprovalDecisions`:**
  ```http
  GET /_api/web/lists/getByTitle('CERApprovalDecisions')/items?$select=*,Author/Id,Author/Title,Author/EMail,approver/Id,approver/Title,approver/EMail&$expand=Author,approver
  ```
- **Reading `CERAttachments`:**
  ```http
  GET /_api/web/lists/getByTitle('CERAttachments')/items?$select=Id,FileLeafRef,cerPrNo,category,uploadDate,uploadedBy/Id,uploadedBy/Title,uploadedBy/EMail,uploadedBy/Name&$expand=uploadedBy&$filter=cerPrNo eq 'CER-2026-0001'
  ```