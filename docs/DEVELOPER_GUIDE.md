# CER Management System — Developer Guide

## 1. Prerequisites

Before setting up the project locally, ensure your environment meets the following specifications:

- **Node.js**: Version `22.14.0` or higher (verified on Node.js v22.23.2).
- **npm**: Version `10.0.0` or higher.
- **Operating System**: Windows 10/11, macOS, or Linux.
- **Shell**: PowerShell (Windows) or Bash/Zsh (macOS/Linux).
- **SPFx Tooling**: SharePoint Framework 1.20+ with Heft build engine.

---

## 2. Getting Started & Local Installation

### A. Clone and Install Dependencies
```bash
git clone <repository-url>
cd CER
npm install
```

### B. Compile Tailwind CSS
Tailwind CSS provides the utility styling tokens. Always compile CSS before starting the development server:

```bash
# One-time build:
npm run tailwind:build

# Or watch mode during UI development:
npm run build:tailwind
```

---

## 3. Running the Project Locally

The CER project supports two local workflows:

### A. Local Standalone Mock Mode (Fastest for UI & Logic Development)
When no SharePoint context is detected, `DataServiceFactory` automatically initializes `LocalMockCERDataService`. This allows developers to test proposal creation, approval workflows, PDF generation, and admin configuration locally in the browser with pre-loaded test data:

```bash
npm run serve
```
Visit the local workbench URL output in the console (typically `https://localhost:4321/temp/workbench.html` or fast-serve endpoint).

### B. SharePoint Online Hosted Workbench Mode
To test against a live SharePoint Online developer tenant:
1. Ensure you have tenant permissions on the target site collection.
2. Run `npm run serve`.
3. Navigate to your SharePoint site's hosted workbench:
   `https://<your-tenant>.sharepoint.com/sites/<your-site>/_layouts/15/workbench.aspx`
4. Add the **CER** web part to the canvas.

---

## 4. Running Automated Tests

All business logic, security constraints, and SharePoint persistence behaviors are protected by automated tests executable via `tsx`:

### Run All 307 Business Requirements Tests
```bash
npm run test:requirements
# Or directly:
npx tsx src/webparts/cer/tests/verifyAllRequirements.ts
```

### Run SharePoint Persistence & Fail-Closed Regression Tests
```bash
npm run test:persistence
# Or directly:
npx tsx src/webparts/cer/tests/verifySharePointPersistence.ts
```

### Run Core Business Logic Tests
```bash
npx tsx src/webparts/cer/tests/CERBusinessLogic.test.ts
```

### Run Admin Performance & Cache Invalidation Benchmarks
```bash
npm run test:admin-perf
# Or directly:
npx tsx src/webparts/cer/tests/verifyAdminPerformance.ts
```

### Run Homepage Viewport & Fluid Typography Tests
```bash
npx tsx src/webparts/cer/tests/verifyHomepageRefinement.ts
```

### Run SharePoint Operations & Hook Tests
```bash
npx tsx src/webparts/cer/tests/verifySharePointOperations.ts
```

### TypeScript Static Type Checking
To run complete type-checking across the entire project without emitting JavaScript:
```bash
npx tsc --noEmit
```

---

## 5. Building & Packaging for SharePoint Production

To compile optimized bundles and package the `.sppkg` solution file:

```bash
npm run build
```

The resulting package will be generated at:
`sharepoint/solution/cer.sppkg`

Deploy this `.sppkg` to the SharePoint App Catalog (`Tenant App Catalog` or `Site Collection App Catalog`).

---

## 6. Troubleshooting Common Issues

| Issue / Error | Probable Cause | Resolution |
|---|---|---|
| `Tailwind styles not showing` | `src/tailwind.generated.css` is missing or out of date | Run `npm run tailwind:build` to regenerate CSS. |
| `Cannot find module '../models/...'` | Outdated or broken import path | Use barrel export `from '../models'` or import from PascalCase folders. |
| `Access Denied when creating CER` | User lacks Initiator/Admin role in mock/SP context | In Local Mock mode, switch active user via the header dropdown to an Initiator or Admin account. |
| `File upload rejected (exceeds size)` | File exceeds 25MB single file limit | Check file size; system enforces 25MB per attachment and 100MB per proposal. |
| `Segregation of duties error` | User attempting to approve their own proposal | Switch to a different user assigned to that approval level. |

---

## 7. Safe Development Practices

1. **Never perform blind mock fallback on SharePoint failure**:
   If a SharePoint write fails in production, surface the error directly to the user. Do not fall back to local mock storage.
2. **Preserve Indian Fiscal Year logic**:
   Expenditure phasing must always adhere to the April 1 – March 31 fiscal cycle defined in `utils/dateUtils.ts`.
3. **Verify tests before committing**:
   Always run `npm run test:requirements` and `npx tsc --noEmit` before opening a pull request or submitting code.
