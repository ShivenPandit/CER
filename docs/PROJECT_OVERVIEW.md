# CER Management System — Project Overview

## 1. Executive Summary

The **Capital Expenditure Request (CER) Management System** is an enterprise-grade business application developed for **Vedanta Limited / Cairn Oil & Gas**. It automates and governs the end-to-end lifecycle of capital expenditure proposals across multiple Strategic Business Units (SBUs) such as RJ North, RJ South, CBOS, and RAVA.

The system replaces manual and paper-based approval forms with a structured, auditable digital workflow integrated into Microsoft 365 SharePoint Online. It provides rigorous financial controls, segregation of duties, automated audit tracking, and executive document generation.

---

## 2. Core Capabilities & Business Features

### A. Proposal Lifecycle Management
- **Create Proposal**: Multi-step structured intake covering Project Details, Cost Breakdown, Budget / JV Partner Details, Financial Benefits & Payback Metrics, 3-Period Expenditure Phasing, Document Attachments, and Justification Remarks.
- **My Proposals**: Dedicated personal dashboard displaying proposals initiated by or owned by the logged-in user, with real-time status tracking and direct action buttons.
- **All Proposals**: Filterable enterprise repository accessible to authorized personnel to view proposals across departments and SBUs.
- **Proposal Display (View CER)**: Comprehensive read-only view presenting all sections, calculated totals, current workflow stage, approval history, and downloadable attachments.
- **Change / Edit Proposal**: Controlled modification interface allowing creators to update proposals in Draft or Reverted states. Automatically records field-level audit deltas.

### B. Governance & Multi-Level Approval Engine
- **7-Level Approval Matrix**: Sequentially routes proposals through:
  1. Level 1: Head of Department (HOD)
  2. Level 2: Finance & Accounts (F&A)
  3. Level 3: Strategic Business Unit (SBU) Head
  4. Level 4: Executive Committee (ExCo)
  5. Level 5: Chief Financial Officer (CFO)
  6. Level 6: Chief Executive Officer (CEO)
  7. Level 7: Board of Directors
- **SBU-Specific Hierarchies**: Configurable stages per SBU (e.g., RJ North with 3 sequential levels, CBOS with 4 levels, RAVA with 1 level), eliminating cross-SBU leakage.
- **Dynamic Project Owner Auto-Assignment**: Automatically resolves Level 1 approver from the proposal's Project Owner field (`owner_email`), eliminating manual approver selection.
- **Segregation of Duties**: Strict policy preventing the proposal creator/initiator from approving their own request at any stage.
- **Decision Actions**: Approve, Reject (terminates workflow), or Send Back / Revert (returns proposal to initiator for amendments while preserving audit logs).

### C. Financial Controls & Fiscal Year Phasing
- **Indian Fiscal Year Phasing**: Dynamically generates fiscal period labels based on Indian financial year (April 1 to March 31):
  - *Prior to Current FY* (e.g., Till Mar'26)
  - *Current FY* (e.g., FY 26-27)
  - *Subsequent FY* (e.g., Beyond FY'27)
  - Rollover happens automatically on April 1.
- **Multi-Currency Support**: Handles Indian Rupees (INR Crores / Lakhs) and US Dollars (USD Millions).
- **Cost Variance Analysis**: Tracks Estimated Cost, Budgeted Cost, and Contingency Allocations with automated validation.

### D. Audit Trail, Versioning & Remarks History
- **Field-Level Audit Trail**: Automated differential tracking comparing before and after values for every edit. Excludes system noise (ETags, modified dates).
- **Remarks History**: Tracks revision comments across approval rounds with author identification and timestamps. Enforces a 350–400 word limit with live character and word counters.

### E. Executive Document Export
- **Vector PDF Generation**: High-fidelity PDF export matching corporate standards using `jspdf` and `jspdf-autotable`. Includes complete project details, financial tables, phasing, and signed approval history.
- **Excel Data Export**: Clean CSV/XLSX export for finance analysts with automated formula injection protection (stripping leading `=`, `+`, `-`, `@`).

---

## 3. Technology Stack

| Layer | Technologies |
|---|---|
| **Framework** | Microsoft SharePoint Framework (SPFx 1.20+) |
| **UI Library** | React 18, React DOM |
| **Language** | TypeScript 5.8 |
| **Styling** | Tailwind CSS 3.4 (Custom corporate design system) |
| **Icons** | Lucide React |
| **Document Engines** | `jspdf`, `jspdf-autotable`, `xlsx` |
| **Build System** | Heft (Microsoft Rush Stack) + Webpack 5 |
| **Testing** | Node.js TSX Runner (`tsx`), Comprehensive Unit & Regression Suites |

---

## 4. Architectural Layers

The CER application follows a 5-layer decoupled architecture:

```
┌─────────────────────────────────────────────────────────────┐
│                 1. SPFx WebPart Entry Point                 │
│                      (CERWebPart.ts)                        │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│              2. Component & Navigation Layer                │
│                 (components/CER.tsx & Views)                │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│            3. Business Services & Auth Layer                │
│       (AuthService, PermissionService, ExportServices)       │
└──────────────────────────────┬──────────────────────────────┘
                               │
┌──────────────────────────────▼──────────────────────────────┐
│             4. Data Abstraction Contract Layer              │
│                (ICERDataService, Factory)                   │
└──────────────────┬───────────────────────┬──────────────────┘
                   │                       │
┌──────────────────▼───────────┐ ┌─────────▼──────────────────┐
│  5a. SharePoint Online REST  │ │   5b. Local Mock Service   │
│   (SharePointCERDataService) │ │  (LocalMockCERDataService) │
└──────────────────────────────┘ └────────────────────────────┘
```

1. **SPFx WebPart Entry Point (`CERWebPart.ts`)**: Initializes SharePoint context, resolves the current user's profile and groups, loads Tailwind CSS, and mounts the root React component.
2. **Component & Navigation Layer (`components/`)**: Feature-oriented modular views (`Home`, `Dashboard`, `CreateCER`, `MyProposals`, `PendingApprovals`, `ApprovalWorkflow`, `Reports`, `Admin`, `Audit`).
3. **Business Services & Auth Layer (`services/`)**: Enforces segregation of duties, role permissions, approval delegation, and PDF/Excel generation.
4. **Data Abstraction Contract (`ICERDataService`)**: A clean interface decoupling the UI from data storage.
5. **Dual Persistence Providers**:
   - `SharePointCERDataService`: Production service using SharePoint Online REST APIs across 12 dedicated lists and libraries.
   - `LocalMockCERDataService`: Offline in-memory service for rapid local development and automated testing without hitting live SharePoint.
