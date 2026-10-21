# Capital Expenditure Request Management System (CER)
**Enterprise Capital Expenditure Lifecycle & Multi-Tier Approval Workflow Engine**

Designed and engineered for **Vedanta Limited / Cairn Oil & Gas**.

---

## 🌟 Executive Overview
The **Capital Expenditure Request (CER) Management System** is a complete, enterprise-grade business application for creating, modifying, displaying, and reporting Capital Expenditure Requests (CER). It provides an auditable, governance-compliant platform that integrates into Microsoft SharePoint Online while offering full offline and standalone development workbench support.

### Key Capabilities
- **End-to-End Proposal Lifecycle**: Structured multi-section CER creation, change, display, and reporting.
- **Multilevel Configurable Approval Workflow (FR-05)**: Sequential delegation matrix with dynamic approver assignment, rejection & resubmission, and email notifications to the creator, all previous approvers, and the next-level approver.
- **Field-Level Audit Trail (FR-06 & FR-07)**: Automated delta comparator capturing every changed field with old value, new value, user, and timestamp while excluding internal technical metadata.
- **Long Remarks Versioning (FR-08)**: 350–400 word limiter with real-time feedback and immutable revision history.
- **Executive Downloads (FR-09 & FR-10)**: High-fidelity PDF generation matching corporate forms and formula-injection-safe Excel exports.
- **Attachments (Module 10 & Doc §8 #8, #14)**: Multi-format file attachments with size validation and full visibility to approvers during review.

---

## 🏗️ Architecture & Technology Stack
- **Framework**: Microsoft SharePoint Framework (SPFx 1.24) Client-Side Web Part with React 18 & TypeScript 5.8
- **Design System & Styling**: Tailwind CSS 3.4 with custom enterprise design tokens (`brand`, `corporate`, `shadow-subtle`, `shadow-elevated`)
- **Iconography**: Lucide React vector icons (strictly avoiding generic emojis)
- **Document Engines**: `jspdf` & `jspdf-autotable` (Vector PDF), `xlsx` (Excel Export)
- **Data Layer**: Dual Persistence Provider Architecture:
  1. `SharePointCERDataService`: SharePoint Online REST API / Lists
  2. `LocalMockCERDataService`: Browser storage pre-loaded with realistic Cairn/Vedanta proposals for local development and testing

---

## 📋 Comprehensive Requirements Traceability

| ID | Title | Description | Status |
| :--- | :--- | :--- | :--- |
| **FR-01** | Create CER | Multi-section form, unique numbering, auto duration & cost summation, L1 workflow trigger | ✅ Implemented & Tested |
| **FR-02** | Change CER | Mandatory proposal lookup, delta comparison, field audit logging, workflow re-trigger | ✅ Implemented & Tested |
| **FR-03** | Display CER | Read-only inspection, pending level badge, approval stepper, PDF/Excel triggers | ✅ Implemented & Tested |
| **FR-04** | Reports | Multi-parameter search, status/category/SBU/owner filters, pagination, Excel export | ✅ Implemented & Tested |
| **FR-05** | Approval Workflow | Multi-tier approval queue, decision modal, multi-party email notifications | ✅ Implemented & Tested |
| **FR-06** | Audit Trail | Field-level change capture, business description mapping, technical field exclusion | ✅ Implemented & Tested |
| **FR-07** | Audit Display | ALV-style grid, search by proposal, screen 0400 modal for long remarks diffs | ✅ Implemented & Tested |
| **FR-08** | Remarks History | 350–400 word limit, versioning on change, historical version browser | ✅ Implemented & Tested |
| **FR-09** | PDF Download | Formatted PDF export named `<CERPRNO>_<date>_<time>.pdf` | ✅ Implemented & Tested |
| **FR-10** | Excel Download | Sanitized `.xlsx` export with business headers and formula protection | ✅ Implemented & Tested |
| **BR-01** | Proposal Numbering | Editable CER proposal number, carry-forward, uniqueness enforcement | ✅ Implemented & Tested |
| **BR-02** | Post-Approval Revision | Revisions permitted after approval while locking the proposal number | ✅ Implemented & Tested |
| **BR-04** | SBU Updates | RJ North & RJ South added; RJ01 and legacy RJ Oil & Gas removed | ✅ Implemented & Tested |
| **BR-06** | Workflow Hierarchy | Administrator UI to dynamically add, delete, or reorder approval levels | ✅ Implemented & Tested |
| **BR-07** | Category Definitions | Vital, Essential, Desirable dropdown with definitions card/modal | ✅ Implemented & Tested |
| **BR-08** | Pending Level Badge | Clear visual indicator of active pending level on display & cards | ✅ Implemented & Tested |

---

## 🚀 Getting Started & Local Development

### Prerequisites
- Node.js `>= 22.14.0`
- npm `>= 10.0.0`

### 1. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 2. Compile Tailwind CSS
Build the utility CSS bundle:
```bash
npm run tailwind:build
```
Or run watch mode during active development:
```bash
npm run build:tailwind
```

### 3. Run Automated Requirements Tests
Run the comprehensive 30-assertion business logic and verification suite:
```bash
npm run test:requirements
```

### 4. Run Development Server
Start the local development server:
```bash
npm run serve
# Or with debug output:
npm run serve:debug
```

### 5. Build for SharePoint Production Deployment
To build the optimized client-side assets and package the `.sppkg` solution file:
```bash
npm run build
```
The output package will be generated at: `sharepoint/solution/cer.sppkg`.

---

## 📚 Project Documentation Artifacts
Complete architecture and project governance documents are maintained in `/docs`:
- [docs/PROJECT_UNDERSTANDING.md](file:///d:/MicroLink/SharePoint/CER/docs/PROJECT_UNDERSTANDING.md): Executive summary, business goals, and persona definitions
- [docs/REQUIREMENTS_TRACEABILITY.md](file:///d:/MicroLink/SharePoint/CER/docs/REQUIREMENTS_TRACEABILITY.md): Full Requirements Traceability Matrix (RTM)
- [docs/TECHNICAL_ARCHITECTURE.md](file:///d:/MicroLink/SharePoint/CER/docs/TECHNICAL_ARCHITECTURE.md): Multi-layer architecture diagrams and technical patterns
- [docs/DATABASE_DESIGN.md](file:///d:/MicroLink/SharePoint/CER/docs/DATABASE_DESIGN.md): Entity relationship model and SharePoint list schemas
- [docs/IMPLEMENTATION_PLAN.md](file:///d:/MicroLink/SharePoint/CER/docs/IMPLEMENTATION_PLAN.md): WBS roadmap and milestone execution
- [docs/TEST_PLAN.md](file:///d:/MicroLink/SharePoint/CER/docs/TEST_PLAN.md): Test scenarios, acceptance criteria, and edge cases
- [docs/OPEN_QUESTIONS.md](file:///d:/MicroLink/SharePoint/CER/docs/OPEN_QUESTIONS.md): Business questions register and default safe assumptions
