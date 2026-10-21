# Capital Expenditure Request Management System (CER)

**Enterprise Capital Expenditure Lifecycle & Multi-Tier Approval Workflow Engine**

Designed and engineered for **Vedanta Limited / Cairn Oil & Gas**.

---

## 🌟 Executive Overview

The **Capital Expenditure Request (CER) Management System** is a complete, enterprise-grade business application for creating, modifying, displaying, and reporting Capital Expenditure Requests (CER). It provides an auditable, governance-compliant platform that integrates into Microsoft SharePoint Online while offering full offline and standalone development workbench support.

### Key Capabilities

- **End-to-End Proposal Lifecycle**: Structured multi-section CER creation, change, display, and reporting.
- **Multilevel Configurable Approval Workflow**: Sequential delegation matrix with dynamic approver assignment, rejection & resubmission, and email notifications to the creator, all previous approvers, and the next-level approver.
- **Field-Level Audit Trail**: Automated delta comparator capturing every changed field with old value, new value, user, and timestamp while excluding internal technical metadata.
- **Long Remarks Versioning**: 350–400 word limiter with real-time feedback and immutable revision history.
- **Executive Downloads**: High-fidelity PDF generation matching corporate forms and formula-injection-safe Excel exports.
- **Attachments**: Multi-format file attachments with size validation and full visibility to approvers during review.

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
