# CER Management System — Folder Structure Guide

## 1. Directory Tree Overview

The project structure is organized by business feature and clear separation of concerns, modeled after enterprise SPFx best practices:

```text
D:/Git/CER/
│
├── README.md                               # Project entry point & developer onboarding
├── package.json                            # Dependencies, scripts, and build tasks
├── tsconfig.json                           # TypeScript compiler configuration
├── tailwind.config.js                      # Corporate theme tokens & colors
│
├── config/                                 # SPFx build & solution packaging configurations
│   ├── config.json
│   ├── package-solution.json
│   └── ...
│
├── docs/                                   # Architectural, workflow, and developer documentation
│   ├── PROJECT_OVERVIEW.md                 # System overview and core features
│   ├── FOLDER_STRUCTURE.md                 # This folder organization guide
│   ├── APPLICATION_FLOW.md                 # App lifecycle, routing, and data flow
│   ├── APPROVAL_WORKFLOW.md                # 7-level approval engine & SBU routing
│   ├── DEVELOPER_GUIDE.md                  # Setup, testing, and troubleshooting
│   ├── REQUIREMENTS_TRACEABILITY.md        # Feature and business rule mapping
│   ├── SHAREPOINT_LISTS_AND_COLUMNS_SETUP.md # SharePoint schema specification
│   └── CODE_RESTRUCTURE_REPORT.md          # Comprehensive refactoring report
│
└── src/
    ├── index.ts                            # Root module export
    ├── tailwind.generated.css              # Compiled Tailwind utility classes
    │
    └── webparts/
        └── cer/
            ├── CERWebPart.ts               # SPFx WebPart host entry point
            ├── CERWebPart.manifest.json    # SPFx manifest & web part metadata
            ├── tailwind.css                # Base Tailwind source directives
            │
            ├── assets/                     # Static assets (images, icons, logos)
            │
            ├── components/                 # Feature-oriented React component hierarchy
            │   ├── CER.tsx                 # Main application view router & state orchestrator
            │   ├── ICERProps.ts            # WebPart props interface
            │   │
            │   ├── Home/                   # Landing page, hero banner & action cards
            │   │   ├── HomeView.tsx        # Responsive dashboard landing screen
            │   │   ├── HeroBanner.tsx      # Welcome hero with branding & stats
            │   │   ├── HomeCardGrid.tsx    # Navigation action card grid
            │   │   └── HomeIllustrations.tsx # Vector SVG illustrations
            │   │
            │   ├── Dashboard/              # Operational metrics & status breakdown
            │   │   ├── DashboardView.tsx   # Visual statistics & metrics view
            │   │   └── StatCard.tsx        # Metric metric presentation card
            │   │
            │   ├── CreateCER/              # Proposal intake wizard & form sections
            │   │   ├── CreateCERView.tsx   # Parent intake controller & submission logic
            │   │   ├── ProjectDetailsSection.tsx   # Proposal title, SBU, sponsor, justification
            │   │   ├── CostBreakdownSection.tsx    # Equipment, installation, contingency lines
            │   │   ├── BudgetJVSection.tsx         # Capex budget line & JV partner splits
            │   │   ├── FinancialBenefitsSection.tsx # Payback period, IRR, NPV metrics
            │   │   ├── PhasingSection.tsx          # 3-period Indian fiscal year phasing
            │   │   ├── AttachmentSection.tsx       # Document upload & validation
            │   │   ├── RemarksSection.tsx          # 350-400 word justification with counter
            │   │   └── DirectoryPeoplePicker.tsx   # SharePoint employee search picker
            │   │
            │   ├── MyProposals/            # User's personal proposals & all proposals repository
            │   │   └── ProposalListView.tsx # Paginated, filterable proposal data grid
            │   │
            │   ├── PendingApprovals/       # Approver inbox & queue
            │   │   └── PendingApprovalsView.tsx # Actionable proposals pending user's sign-off
            │   │
            │   ├── ApprovalWorkflow/       # Workflow decision modals & configuration
            │   │   ├── ApprovalDecisionModal.tsx   # Approve/Reject/Revert action dialog
            │   │   ├── ApprovalHistoryView.tsx     # Historical decision logs & audit remarks
            │   │   ├── ApprovalProgressTracker.tsx # Visual 7-level chevron progress bar
            │   │   └── WorkflowConfigView.tsx      # Stage admin & Project Owner configuration
            │   │
            │   ├── DisplayCER/             # Read-only comprehensive proposal review
            │   │   └── DisplayCERView.tsx  # Full multi-section detail view with PDF/Excel
            │   │
            │   ├── ChangeCER/              # Post-creation modification & amendment
            │   │   └── ChangeCERView.tsx   # Controlled editor tracking field-level deltas
            │   │
            │   ├── Reports/                # Analytics & export reports
            │   │   └── ReportsView.tsx     # Custom reporting filters & Excel exporter
            │   │
            │   ├── Admin/                  # System administration console
            │   │   ├── AdminConsoleView.tsx       # Tabbed admin workspace
            │   │   ├── AdminOverviewTab.tsx       # High-level system stats & health
            │   │   ├── ApprovalHierarchyTab.tsx   # SBU stage routing & approver assignment
            │   │   ├── UserManagementTab.tsx      # User role assignments & site admin rights
            │   │   └── AdminAuditTab.tsx          # Administrative system audit log viewer
            │   │
            │   ├── Audit/                  # Governance, audit log & remarks history
            │   │   ├── AuditTrailView.tsx         # Searchable field change trail
            │   │   ├── RemarksHistoryModal.tsx    # Multi-round remarks revision history
            │   │   └── RemarksDiffModal.tsx       # Before/after visual difference modal
            │   │
            │   ├── Navigation/             # Shell layout & persistent navigation
            │   │   ├── AppHeader.tsx       # Top corporate header, user switcher & alerts
            │   │   ├── TopNavbar.tsx       # Primary action bar
            │   │   ├── Sidebar.tsx         # Collapsible sidebar with role-aware nav items
            │   │   └── Breadcrumbs.tsx     # Contextual navigation breadcrumb path
            │   │
            │   ├── Shared/                 # Truly reusable enterprise UI components
            │   │   ├── StatusBadge.tsx     # Color-coded CER status pill (Draft, Approved, etc.)
            │   │   ├── CategoryBadge.tsx   # Vital/Essential/Desirable categorization pill
            │   │   ├── CategoryDefinitionModal.tsx # Definition modal for categories
            │   │   ├── CategoryDefinitionSection.tsx # Inline category guidance notes
            │   │   ├── DataTablePagination.tsx     # Standard pagination controls (10/25/50)
            │   │   ├── NotificationCenter.tsx      # Slide-out alert notification drawer
            │   │   ├── WordCounter.tsx             # Real-time character & word count tracker
            │   │   ├── AccessDeniedView.tsx        # Standardized 403 authorization screen
            │   │   └── VedantaLogo.tsx             # Official corporate branding asset
            │   │
            │   └── UserManual/             # In-app help & operating procedures
            │       └── UserManualModal.tsx # Comprehensive end-user guidance manual
            │
            ├── constants/                  # Centralized application constants
            │   └── index.ts                # SP list names, route keys, levels, defaults
            │
            ├── models/                     # TypeScript domain models & interfaces
            │   ├── index.ts                # Unified barrel export
            │   ├── CERModel.ts             # Proposal entity, categories, and field choices
            │   ├── WorkflowModel.ts        # Approval levels, decisions, notifications
            │   ├── UserModel.ts            # App user, directory user, and role definitions
            │   ├── AttachmentModel.ts      # File attachment metadata
            │   └── AuditModel.ts           # Audit log entry and field delta models
            │
            ├── services/                   # Business logic, permissions, and data services
            │   ├── index.ts                # Unified barrel export
            │   ├── ICERDataService.ts      # Abstract data service contract
            │   ├── SharePointCERDataService.ts # Production SharePoint Online REST service
            │   ├── LocalMockCERDataService.ts  # In-memory mock service for local dev/test
            │   ├── DataServiceFactory.ts   # Context-aware provider factory
            │   ├── AuthService.ts          # Current user security resolution & bootstrap
            │   ├── PermissionService.ts    # Role-based access control & segregation of duties
            │   ├── PDFExportService.ts     # Vector PDF document compiler
            │   └── ExcelExportService.ts   # Injection-safe spreadsheet compiler
            │
            ├── hooks/                      # Custom React hooks
            │   ├── index.ts                # Barrel export
            │   ├── fetchHooks.tsx          # Reference hook for UI, user & list operations
            │   ├── useSharePointOperations.ts # Robust SharePoint HTTP & pagination client
            │   └── useDynamicPagination.ts # Client-side pagination and slicing hook
            │
            ├── utils/                      # Pure helper functions & validators
            │   ├── cerValidation.ts        # Form validation rules & required field checks
            │   ├── attachmentValidation.ts # MIME type and size limit enforcers
            │   └── dateUtils.ts            # Indian fiscal year calculations & formatting
            │
            └── tests/                      # Automated test & verification suites
                ├── verifyAllRequirements.ts     # 307 assertions verifying all CER business rules
                ├── verifySharePointPersistence.ts # Fail-closed SharePoint REST regression suite
                ├── CERBusinessLogic.test.ts     # Core business logic unit tests
                ├── verifyAdminPerformance.ts    # Cache invalidation and query benchmarks
                ├── verifyHomepageRefinement.ts  # Responsive fluid typography and clamp checks
                └── verifySharePointOperations.ts # HTTP 204, CRUD, and mock operation tests
```

---

## 2. Where to Make Changes (Developer Quick Reference)

| Task                                         | Primary File(s) to Modify                           | Secondary / Model Files                                        |
| -------------------------------------------- | --------------------------------------------------- | -------------------------------------------------------------- |
| **Add or change a form field**         | `components/CreateCER/ProjectDetailsSection.tsx`  | `models/CERModel.ts`, `utils/cerValidation.ts`             |
| **Change approval levels or sequence** | `components/Admin/ApprovalHierarchyTab.tsx`       | `models/WorkflowModel.ts`, `services/PermissionService.ts` |
| **Update SharePoint list queries**     | `services/SharePointCERDataService.ts`            | `constants/index.ts`, `hooks/useSharePointOperations.ts`   |
| **Modify user permissions or roles**   | `services/PermissionService.ts`                   | `services/AuthService.ts`, `models/UserModel.ts`           |
| **Update PDF export layout**           | `services/PDFExportService.ts`                    | `models/CERModel.ts`                                         |
| **Update Excel export columns**        | `services/ExcelExportService.ts`                  | `models/CERModel.ts`                                         |
| **Change Indian FY phasing logic**     | `utils/dateUtils.ts`                              | `components/CreateCER/PhasingSection.tsx`                    |
| **Add a new automated test**           | `tests/CERBusinessLogic.test.ts` or new test file | `tests/verifyAllRequirements.ts`                             |
| **Change application navigation**      | `components/Navigation/Sidebar.tsx`               | `components/CER.tsx`, `constants/index.ts`                 |
| **Update shared badges or pagination** | `components/Shared/StatusBadge.tsx`               | `components/Shared/DataTablePagination.tsx`                  |
