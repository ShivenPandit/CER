# SPX — Capital Expenditure Request Management System (CER)
## Project Understanding & Comprehensive Overview

### 1. Executive Summary & Purpose
The **SPX — Capital Expenditure Request (CER) Management System** is an enterprise-grade business application developed for managing the end-to-end lifecycle of Capital Expenditure Requests within the organization (Vedanta SPX / Cairn Oil & Gas / Group entities).

The system replaces manual, ad-hoc, or legacy SAP transaction processes with a modern, responsive, auditable, and automated web-based solution integrated within Microsoft SharePoint Online and available as a dedicated full-screen enterprise application.

### 2. Business Objectives
- **Single Source of Truth**: Centralize creation, modification, display, and reporting of all CER proposals.
- **Multilevel Configurable Approval Workflow**: Automatically route CER requests through configurable sequential or parallel approval levels, with clear role separation, pending status indicators, and email notifications to all relevant stakeholders (creator, previous approvers, next-level approver).
- **Field-Level Audit Trail**: Dynamically track every modification made to any business field (excluding technical internal fields) with old value, new value, modified by, date, and timestamp.
- **Historical Remarks Tracking**: Versioned long-text business remarks (supporting 350–400 words) with deep revision history.
- **Executive Reporting & Exports**: High-fidelity PDF generation matching corporate CER formats and Excel-compatible data export for finance and audit analysis.
- **Secure File Attachments**: Support multiple file attachments of all business file types with complete preview and download visibility during approval rounds.

---

### 3. User Personas & Role-Based Responsibilities

| Role | Primary Activities & Authorization Scope |
| :--- | :--- |
| **CER Owner / Initiator** | - Create new CER proposals.<br>- Modify draft, rejected, or revised proposals.<br>- Carry-forward and revise proposals post-approval while maintaining proposal integrity.<br>- View own proposals ("My CER Proposals") and tracking history.<br>- Upload supporting documents and business justifications. |
| **Approver** | - View "Pending Approvals" assigned to their approval level or role.<br>- Review full CER details, financials, phasing, cost breakdown, and attachments.<br>- Approve with formal comments or reject with mandatory justification.<br>- Inspect approval history and previous approver decisions. |
| **Finance / Audit User** | - Display and search all CER proposals across business units and categories.<br>- Access the detailed field-level Audit Trail with old vs. new value comparisons.<br>- Run filtered reporting with date ranges, categories, and status filters.<br>- Export financial datasets to Excel and official CER PDF documents. |
| **Workflow Administrator** | - Configure approval workflow levels, thresholds, and assigned approvers.<br>- Manage business master data (categories, SBUs, phasing periods).<br>- Monitor system delivery notifications and audit integrity. |

---

### 4. Key Functional Modules Overview

1. **Dashboard & Executive Overview**:
   - Authorized metrics: Total CERs, Drafts, Pending Approvals, Approved, Rejected, Total Capex Committed.
   - Quick filters, role-specific action items ("Awaiting My Action"), recent activity stream.

2. **Module 1: Create CER (FR-01)**:
   - Structured multi-section entry: Project Details, Financial Benefits (NPV/IRR/Payback), Corporate Budget, Joint Venture (JV), Phasing (PROD/CAPEX/OPEX across current, FY, beyond FY), Cost Breakdown, Remarks, Attachments.
   - Unique proposal number generation with concurrency protection.
   - Automatic initiation of Level-1 approval workflow.

3. **Module 2: Change CER (FR-02)**:
   - Mandatory proposal lookup with validation.
   - Full data retrieval, delta comparison, field-level audit record generation, remarks versioning, and re-triggering of approval workflow.

4. **Module 3: Display CER (FR-03)**:
   - High-fidelity read-only display.
   - Current pending approval level badge, complete approval timeline, attachments list, PDF/Excel actions.

5. **Module 4: Reports & Analytics (FR-04)**:
   - Multi-parameter filtering: Proposal No., Project Name, Status, Category (Vital, Essential, Desirable), SBU (RJ North, RJ South, etc.), Date Range, Owner.
   - Tabular view with sorting, pagination, and direct export to Excel.

6. **Module 5: Configurable Multilevel Approval Workflow (FR-05)**:
   - Dynamic hierarchy of approval levels (L1, L2, L3, etc.).
   - Email notification engine sending proposal details and attachments to creator, previous approvers, and next approver.
   - Immutable audit trail of all approval steps and reviewer comments.

7. **Module 6 & 7: Field-Level Audit Trail & Remarks History (FR-06, FR-07, FR-08)**:
   - Delta comparator identifying modified fields.
   - Excludes technical fields (`CREATED_DATE`, `USRID`, etc.).
   - Interactive audit log table with modal view for long remarks text diffs.

8. **Module 8 & 9: PDF & Excel Document Generation (FR-09, FR-10)**:
   - Formatted PDF export including corporate header, metadata, financial breakdown tables, approval history, and signature blocks.
   - Formula-injection-safe Excel export with business-friendly column headers.

9. **Module 10: Attachment Management**:
   - Multi-file upload with type and size validation, preview, and download.
   - Clear visibility for approvers during review.

---

### 5. Environments & Target Deployment
- **SharePoint Online Target Site**: `https://vedanta.sharepoint.com/sites/CERManagementSystem`
- **UAT Site**: `https://vedanta.sharepoint.com/sites/CERManagementSystem` (or designated UAT site collection)
- **Host Context**: SharePoint Framework (SPFx 1.24) Client-Side Web Part with full-width modern UI and dual persistence provider (SharePoint REST API / Lists + Local Mock Store for development and testing).
