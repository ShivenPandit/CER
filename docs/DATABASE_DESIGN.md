# Capital Expenditure Request Management System (CER)
## Database & Entity Schema Design

This document details the normalized relational data model and corresponding SharePoint Online list schemas for the CER Management System.

---

### 1. Entity Relationship Model Overview

```mermaid
erDiagram
    CER_PROPOSALS ||--o{ CER_AUDIT_LOG : "has changes"
    CER_PROPOSALS ||--o{ CER_REMARKS_HISTORY : "tracks revisions"
    CER_PROPOSALS ||--o{ CER_APPROVAL_DECISIONS : "workflow trail"
    CER_PROPOSALS ||--o{ CER_ATTACHMENTS : "supporting files"
    CER_WORKFLOW_LEVELS ||--o{ CER_APPROVAL_DECISIONS : "defines step"

    CER_PROPOSALS {
        string CERPRNO PK "Unique CER Proposal Number"
        string PR_NAME "Project Name"
        string OWNAME "CER Owner Name"
        string OWNER_EMAIL "Owner Email"
        string SBU "Strategic Business Unit (RJ North / RJ South / etc.)"
        string STATUS "Draft | In Approval | Approved | Rejected | Revised"
        string OBJECT "Business Object"
        decimal AMOUNT "Amount of CER"
        string CURRENCY "Currency (USD / INR)"
        string CAT "Category: Vital | Essential | Desirable"
        string PAYABLE "Payback | Non-Payback"
        string PERIOD "Total Duration"
        decimal BEN_NPV "Financial Benefits NPV"
        decimal BEN_IRR "Financial Benefits IRR (%)"
        string COST_ASSUMPTIONS "Key Assumptions"
        date ST_DATE "Project Start Date"
        date COM_DATE "Project Completion Date"
        int DURATION_MONTHS "Duration in Months"
        string CBUDGET "Corporate Budget (Yes/No)"
        decimal CB_AMNT "Corporate Budget Amount"
        string REASON "Reason if not budgeted"
        string JV "Joint Venture Alignment (Yes/No)"
        decimal JV_COST "JV Cost"
        string JV_BUDGET "JV Budget (Yes/No)"
        decimal JV_AMNT "JV Budget Amount"
        string JV_REASON "JV Justification"
        string PH_TILL "Phasing Label: Till Date"
        string PH_FY "Phasing Label: Current FY"
        string PH_BEYOND "Phasing Label: Beyond FY"
        decimal PROD_TILL "Production Till"
        decimal PROD_FY "Production FY"
        decimal PROD_BEYOND "Production Beyond"
        decimal CAPEX_TILL "CAPEX Till"
        decimal CAPEX_FY "CAPEX FY"
        decimal CAPEX_BEYOND "CAPEX Beyond"
        decimal OPEX_TILL "OPEX Till"
        decimal OPEX_FY "OPEX FY"
        decimal OPEX_BEYOND "OPEX Beyond"
        decimal ENGINEER "Cost: Engineering"
        decimal S_FAC "Cost: Site Facilities"
        decimal COMIS "Cost: Commissioning"
        decimal PREOP "Cost: Pre-operating"
        decimal OTHERS "Cost: Others"
        decimal TOTAL "Total Cost (Sum)"
        string REMARKS "Business Justification Long Text"
        string REMARKS_JV "Remarks related to JV Risk"
        int CURRENT_LEVEL "Current Approval Level Index"
        string PENDING_WITH "Current Pending Approver Role/Name"
        datetime CREATED_DATE "Creation Timestamp"
        string CREATED_BY "Created By User"
        datetime MODIFIED_DATE "Last Modified Timestamp"
        string MODIFIED_BY "Last Modified By User"
    }

    CER_AUDIT_LOG {
        string ID PK "Audit Record UUID"
        string CERPRNO FK "CER Proposal Number"
        string FIELD_NAME "Technical Field Name"
        string FIELD_DESC "User-Friendly Field Description"
        string OLD_VALUE "Previous Field Value"
        string NEW_VALUE "Updated Field Value"
        string USER_ID "User ID / Email"
        string USER_NAME "Full User Name"
        string AUDIT_DATE "Change Date (YYYY-MM-DD)"
        string AUDIT_TIME "Change Time (HH:MM:SS)"
        datetime TIMESTAMP "Full Timestamp"
    }

    CER_REMARKS_HISTORY {
        string ID PK "Remarks Revision UUID"
        string CERPRNO FK "CER Proposal Number"
        int VERSION "Sequential Version Number"
        string REMARKS_TEXT "Full Remarks Content"
        string REMARKS_TYPE "JUSTIFICATION | JV_RISK"
        int WORD_COUNT "Word Count"
        string CREATED_BY "User Name"
        datetime CREATED_DATE "Timestamp"
    }

    CER_WORKFLOW_LEVELS {
        int LEVEL_ID PK "Level Sequence (1, 2, 3...)"
        string LEVEL_NAME "e.g. L1 - Technical Review"
        string APPROVER_ROLE "Role Title"
        string APPROVER_EMAIL "Assigned User / Group Email"
        decimal MIN_AMOUNT "Threshold Minimum"
        decimal MAX_AMOUNT "Threshold Maximum"
        boolean IS_ACTIVE "Active Flag"
    }

    CER_APPROVAL_DECISIONS {
        string ID PK "Decision UUID"
        string CERPRNO FK "CER Proposal Number"
        int LEVEL_ID "Approval Level Sequence"
        string LEVEL_NAME "Approval Level Name"
        string APPROVER_NAME "Approver Full Name"
        string APPROVER_EMAIL "Approver Email"
        string DECISION "PENDING | APPROVED | REJECTED | REVISED"
        string COMMENTS "Approver Comments / Justification"
        datetime DECISION_DATE "Timestamp of Action"
    }

    CER_ATTACHMENTS {
        string ID PK "Attachment UUID"
        string CERPRNO FK "CER Proposal Number"
        string FILE_NAME "Original File Name"
        int FILE_SIZE "Size in Bytes"
        string FILE_TYPE "MIME Type"
        string FILE_URL "Storage URI / Base64"
        datetime UPLOADED_DATE "Upload Timestamp"
        string UPLOADED_BY "Uploader Name"
    }
```

---

### 2. Field Audit Mapping Dictionary

When logging changes (FR-06), short technical field names are mapped to user-friendly business labels:

| Field Name | User-Friendly Business Label | Exclusion Flag |
| :--- | :--- | :--- |
| `REMARKS` | "Remarks (including Justification for Non Payback expenditure, etc)" | Logged (Special Diff) |
| `REMARKS_JV` | "Remarks related to Joint Venture (JV) Risk" | Logged (Special Diff) |
| `PROD_TILL` | "Production Expenditure — Till Specified Period" | Logged |
| `PROD_FY` | "Production Expenditure — Current FY Period" | Logged |
| `PROD_BEYOND` | "Production Expenditure — Beyond FY Period" | Logged |
| `CAPEX_TILL` | "CAPEX Expenditure — Till Specified Period" | Logged |
| `CAPEX_FY` | "CAPEX Expenditure — Current FY Period" | Logged |
| `CAPEX_BEYOND`| "CAPEX Expenditure — Beyond FY Period" | Logged |
| `OPEX_TILL` | "OPEX Expenditure — Till Specified Period" | Logged |
| `OPEX_FY` | "OPEX Expenditure — Current FY Period" | Logged |
| `OPEX_BEYOND` | "OPEX Expenditure — Beyond FY Period" | Logged |
| `ENGINEER` | "Cost Breakdown — Engineering" | Logged |
| `S_FAC` | "Cost Breakdown — Site Facilities" | Logged |
| `COMIS` | "Cost Breakdown — Commissioning" | Logged |
| `PREOP` | "Cost Breakdown — Pre-operating Costs" | Logged |
| `OTHERS` | "Cost Breakdown — Others" | Logged |
| `TOTAL` | "Total Estimated Expenditure" | Logged |
| `BEN_NPV` | "Financial Benefits — Net Present Value (NPV)" | Logged |
| `BEN_IRR` | "Financial Benefits — Internal Rate of Return (IRR %)" | Logged |
| `AMOUNT` | "Amount of CER" | Logged |
| `CAT` | "Proposal Category" | Logged |
| `PAYABLE` | "Payback / Non-Payback" | Logged |
| `CBUDGET` | "Corporate Budget Status" | Logged |
| `JV` | "Joint Venture (JV) Alignment" | Logged |
| `CREATED_DATE`| System Creation Date | **EXCLUDED** (Technical) |
| `CREATED_BY` | System Creation User | **EXCLUDED** (Technical) |
| `MODIFIED_DATE`| System Modification Date | **EXCLUDED** (Technical) |
| `USRID` | Technical User Identifier | **EXCLUDED** (Technical) |
| `CHANGE_IND` | Change Indicator Flag | **EXCLUDED** (Technical) |
| `APPROVE` | Internal Approval Flag | **EXCLUDED** (Technical) |
