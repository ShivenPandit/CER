# Capital Expenditure Request (CER) Management System

**Enterprise Capital Expenditure Lifecycle & Multi-Tier Approval Workflow Engine**  
*Engineered for Vedanta Limited / Cairn Oil & Gas*

---

## 🌟 Executive Overview

The **Capital Expenditure Request (CER) Management System** is an enterprise-grade business application developed using the Microsoft SharePoint Framework (SPFx). It manages the end-to-end lifecycle of capital expenditure proposals across multiple Strategic Business Units (SBUs) such as RJ North, RJ South, CBOS, and RAVA.

The application features a clean, feature-oriented modular architecture modeled after enterprise SPFx standards, offering full offline workbench testing alongside native SharePoint Online REST API integration.

### Core Capabilities

- **Structured Proposal Intake**: Multi-step wizard covering Project Scope, Cost Breakdown, Budget Line & JV Partner allocations, Payback & IRR metrics, 3-period Indian FY Phasing, and file attachments.
- **7-Level SBU Approval Matrix**: Dynamic workflow engine with SBU-specific routing, automatic Project Owner derivation, rejection & resubmission handling, and automated email notifications.
- **Segregation of Duties**: Enforces financial governance rules preventing proposal creators from self-approving.
- **Audit Trail & Remarks Versioning**: Field-level change comparator capturing before/after deltas and multi-round remarks revision history.
- **Executive Reporting & Downloads**: High-fidelity vector PDF generation (`jspdf`) and formula-injection-safe Excel exports (`xlsx`).

---

## 📚 Technical Documentation

Comprehensive architectural and developer guides are available in the [`docs/`](file:///D:/Git/CER/docs) directory:

| Document | Description |
|---|---|
| [PROJECT_OVERVIEW.md](file:///D:/Git/CER/docs/PROJECT_OVERVIEW.md) | High-level system overview, technology stack, and architectural layers. |
| [FOLDER_STRUCTURE.md](file:///D:/Git/CER/docs/FOLDER_STRUCTURE.md) | Complete directory tree and "Where to make changes" quick reference. |
| [APPLICATION_FLOW.md](file:///D:/Git/CER/docs/APPLICATION_FLOW.md) | Application lifecycle, URL hash routing matrix, and data flow. |
| [APPROVAL_WORKFLOW.md](file:///D:/Git/CER/docs/APPROVAL_WORKFLOW.md) | 7-level hierarchy, SBU-specific sequential routing, and dynamic Project Owner auto-fetch. |
| [DEVELOPER_GUIDE.md](file:///D:/Git/CER/docs/DEVELOPER_GUIDE.md) | Local environment setup, running tests, production building, and troubleshooting. |
| [REQUIREMENTS_TRACEABILITY.md](file:///D:/Git/CER/docs/REQUIREMENTS_TRACEABILITY.md) | Detailed traceability mapping for all functional and business rules. |
| [SHAREPOINT_LISTS_AND_COLUMNS_SETUP.md](file:///D:/Git/CER/docs/SHAREPOINT_LISTS_AND_COLUMNS_SETUP.md) | Complete SharePoint Online lists, libraries, and column specifications. |
| [CODE_RESTRUCTURE_REPORT.md](file:///D:/Git/CER/docs/CODE_RESTRUCTURE_REPORT.md) | Comprehensive refactoring report and verification results. |

---

## 🚀 Quick Start for Developers

### Prerequisites

- **Node.js**: `>= 22.14.0`
- **npm**: `>= 10.0.0`
- **Shell**: PowerShell (Windows) or Bash/Zsh (macOS/Linux)

### 1. Installation

```bash
git clone <repository-url>
cd CER
npm install
```

### 2. Compile Tailwind CSS

```bash
npm run tailwind:build
# Or watch mode during development:
npm run build:tailwind
```

### 3. Run Automated Tests

```bash
# Run all 307 business requirements tests:
npm run test:requirements

# Run SharePoint persistence & fail-closed tests:
npm run test:persistence

# Run TypeScript static type check:
npx tsc --noEmit
```

### 4. Run Development Server

```bash
# Starts local fast-serve development server:
npm run serve
```

### 5. Build for SharePoint Production Deployment

```bash
npm run build
```
The output package will be generated at: `sharepoint/solution/cer.sppkg`.

---

## 🏛️ Code Architecture & Key Directories

```text
src/webparts/cer/
├── components/          # Feature components (Home, Dashboard, CreateCER, PendingApprovals, ApprovalWorkflow, etc.)
├── constants/           # Centralized constants (SP_LISTS, NAV_VIEWS, APPROVAL_LEVELS)
├── models/              # TypeScript entities (CERModel, WorkflowModel, UserModel)
├── services/            # Data services (SharePointCERDataService, LocalMockCERDataService, AuthService, etc.)
├── hooks/               # Custom hooks (fetchHooks.tsx, useSharePointOperations, useDynamicPagination)
├── utils/               # Pure helper functions (dateUtils, cerValidation, attachmentValidation)
└── tests/               # Automated regression and verification test suites
```
