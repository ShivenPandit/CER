# CER Management System — Security & Reliability Audit

**Audit Timestamp:** October 29, 2026  
**Auditor:** Application Security Auditor & Senior Backend Engineer  
**System:** Capital Expenditure Request (CER) Management System (`D:\Git\CER`)  
**Scope:** Authorization Boundaries, Client vs Server Security, Data Privacy, Error Handling & HTTP Throttling  

---

## 1. Executive Security Assessment

SPFx applications run strictly on the client (browser) within the authenticated context of the signed-in user. The security posture of the application is a hybrid model:
1. **Client-Side Authorization Layer (`PermissionService.ts`, `AuthService.ts`):** Controls UI gating, navigation, and business rule enforcement.
2. **SharePoint Server-Side Permission Layer:** Enforces access control lists (ACLs) on the underlying SharePoint lists and libraries.

### Core Security Finding:
**Client-side role gating does not substitute for SharePoint list ACLs.** If an ordinary user has "Contribute" permissions on the SharePoint site, they can bypass the React UI and issue direct REST API calls using Postman, PowerShell, or browser DevTools console to read or modify any list item.

---

## 2. Authorization Boundaries & Security Audit

### 2.1. Client-Side Role Isolation
- **Implementation:** `PermissionService.ts` centralizes all role and feature checks.
- **Strengths:**
  - Segregation of Duties (SoD) is strictly enforced: Initiators/Creators cannot approve their own requests on non-Project-Owner stages.
  - Project Owner dynamic assignment is strictly verified: Only the designated Project Owner (`owner_email` or `owname`) can approve dynamic stages.
  - Approval Hierarchy configuration is restricted exclusively to `shiven.pandit@cairnindia.com` with claims normalization.
  - Multi-role evaluation (e.g. Initiator + Approver, Approver + CER Owner) is evaluated independently without mutually exclusive hides.
- **Vulnerabilities / Risks:**
  - **Over-Broad Data Retrieval:** An Initiator accessing "My CER Requests" receives all company proposals in the HTTP GET response, and the browser filters out other users' proposals in JavaScript memory. Any user with DevTools can inspect the network response payload and view all proposals across all SBUs.
  - *Recommendation:* Enforce server-side filter `$filter=Author/EMail eq '{userEmail}' or cerOwner/EMail eq '{userEmail}'` so unauthorized records are never transmitted over the wire.

---

### 2.2. Role Elevation & Bootstrap Security (`AuthService.ts`)
- **Location:** `src/webparts/cer/services/AuthService.ts:71-75`
- **Mechanism:**
  ```typescript
  const effectiveEmail = email || (loginName.indexOf("@") !== -1 ? loginName : "70007144@cairnindia.com");
  const effectiveLogin = loginName || email || "70007144@cairnindia.com";
  ```
- **Vulnerability (P1):**
  If `email` and `loginName` are empty or omitted from the web part property context (e.g., misconfigured web part properties or unauthenticated test harnesses), the service defaults to `"70007144@cairnindia.com"`, which is hardcoded in `DESIGNATED_ADMIN_IDENTIFIERS`.
- **Impact:** Any session with an unpopulated user identity automatically elevates to full Administrator privileges instead of failing closed to an unprivileged guest state.
- **Remediation:** Fail closed by default: If `email` and `loginName` cannot be resolved, assign an unprivileged identity (`guest@unauthenticated.local`) and set `is_active: false`.

---

### 2.3. SharePoint List Permission Hardening Requirements
To ensure production enterprise security, the SharePoint site administrator must configure the following list permissions on the SharePoint site (`https://vedanta.sharepoint.com/sites/CERManagementSystemUAT`):

| SharePoint List | Target Permissions | Reason |
|---|---|---|
| `CERProposals` | **Contribute** (or unique item-level security) | Initiators create; Approvers update status. |
| `CERWorkflowLevels` | **Read-Only** for all users; **Full Control** for Admin | Prevents unauthorized modification of approval stages. |
| `CERUserRoles` | **Read-Only** for all users; **Full Control** for Admin | Prevents ordinary users from granting themselves Approver or Admin roles via REST API. |
| `CERApprovalDecisions` | **Contribute (Append-Only)** | Once a decision is posted, it must never be deleted or altered. |
| `CERAuditTrail` | **Append-Only** | Prevents tampering with historical audit events. |
| `CERAttachments` | **Contribute** | Standard file upload and access. |

---

## 3. Reliability, Error Handling & Throttling Audit

### 3.1. HTTP Error Code Response Matrix

| HTTP Code | Error Meaning | Observed Application Behavior | Resilience Grade |
|:---:|---|---|:---:|
| **400** | Bad Request / Schema Mismatch | Caught in `SharePointOperations`, surfaces clean error; falls back to legacy field payload. | **GOOD** |
| **401** | Unauthorized | Surfaces `[SPOperations] GET/POST failed (401)`; does not execute silent mock fallback. | **EXCELLENT** |
| **403** | Access Denied / Forbidden | Caught, throws explicit permission error; UI prevents retry lock. | **EXCELLENT** |
| **404** | Not Found | For lists/items, caught and logged; for file deletes, treats as already deleted. | **GOOD** |
| **412** | Precondition Failed (Concurrency) | Never triggered because application hardcodes `"If-Match": "*"`. | **DEFECTIVE** |
| **429** | Too Many Requests (Throttling) | **NO RETRY LOGIC.** Immediately throws unhandled exception; aborts workflow. | **CRITICAL DEFECT** |
| **500** | Internal Server Error | Caught, surfaces error text to user. | **ACCEPTABLE** |
| **503** | Service Unavailable | **NO RETRY LOGIC.** Throws immediately. | **CRITICAL DEFECT** |

---

### 3.2. Detailed Analysis of Missing Throttling (HTTP 429 & 503) Handler
- **Location:** `src/webparts/cer/hooks/useSharePointOperations.ts:91-112`
- **Defect Description:**
  SharePoint Online uses automated throttling algorithms to maintain tenant responsiveness. Under medium to high concurrency (e.g. 50+ users loading dashboards or paginating reports), SharePoint returns HTTP status code 429 or 503 with a `Retry-After` response header specifying the number of seconds the client must pause before retrying.
- **Current Behavior:**
  ```typescript
  if (!response.ok) {
    const errText = await response.text().catch(() => "");
    throw new Error(`[SPOperations] GET failed (${response.status}): ${errText}`);
  }
  ```
  The code immediately throws an error without reading the `Retry-After` header or pausing.
- **Impact:** When SharePoint throttles a single request, the user's entire view fails with an error prompt instead of transparently waiting 2–5 seconds and completing successfully.
- **Recommended Remediation:**
  Wrap HTTP operations in a resilient retry loop that intercepts 429 and 503, parses `response.headers.get("Retry-After")`, and applies exponential backoff with jitter up to 3 attempts.

