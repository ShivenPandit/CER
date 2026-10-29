# CER Management System — Concurrency & Data Integrity Audit

**Audit Timestamp:** October 29, 2026  
**Auditor:** Principal Software Architect & Senior Backend Engineer  
**System:** Capital Expenditure Request (CER) Management System (`D:\Git\CER`)  
**Scope:** Concurrency, Race Conditions, Optimistic Locking, Multi-Step Transactions & Data Integrity  

---

## 1. Executive Summary

SharePoint Online REST APIs operate over stateless HTTP calls without multi-item distributed ACID transactions or row-level pessimistic locking. Every multi-step workflow in SPFx consists of independent sequential HTTP requests.

This audit evaluates the behavior of the CER Management System under concurrent usage by multiple simultaneous users and identifies critical race conditions, lost updates, and transaction failure modes.

---

## 2. Concurrency Scenario Evaluation Matrix

| Scenario # | Concurrency Scenario | Classification | Evidence & Code Location | Impact |
|---|---|:---:|---|---|
| **1** | Simultaneous Proposal Creation | **POTENTIALLY UNSAFE** | `CreateCERView.tsx:288` | Two users submitting at the exact same millisecond. |
| **2** | Proposal Number Generation Race | **DEMONSTRABLY UNSAFE** | `SharePointCERDataService.ts:333-375` | Two users opening "Create CER" both receive `CER-2026-0005`. Second submit fails or overwrites draft. |
| **3** | Dual Approvers on Same Stage | **POTENTIALLY UNSAFE** | `SharePointCERDataService.ts:1443` | Both read stage as active; both append approval decision to `CERApprovalDecisions`. |
| **4** | Owner Editing while Approver Decides | **DEMONSTRABLY UNSAFE** | `useSharePointOperations.ts:167` | Uses `"If-Match": "*"`; last writer blindly overwrites without detecting concurrent modification. |
| **5** | Double-Clicking on Submit / Decision | **SAFE (UI LEVEL)** | `CreateCERView.tsx`, `ApprovalDecisionModal.tsx` | Handled via `isSubmitting` React state disabling buttons during in-flight request. |
| **6** | Network Timeout After Write | **POTENTIALLY UNSAFE** | `useSharePointOperations.ts:104` | Client throws network timeout; SharePoint actually committed record. User retry causes duplicate. |
| **7** | Concurrent Updates to Same Item | **DEMONSTRABLY UNSAFE** | `useSharePointOperations.ts:167` | Unconditional MERGE (`"If-Match": "*"`) disables SharePoint ETag optimistic concurrency. |
| **8** | Duplicate Attachment Uploads | **SAFE** | `SharePointOperations.ts:397` | Uses `overwrite=true` for same file name; creates unique file paths. |
| **9** | Partial Multi-Step Failure | **POTENTIALLY UNSAFE** | `SharePointCERDataService.ts:1593-1710` | Decision written to `CERApprovalDecisions`, but updating `CERProposals` fails. Out-of-sync state. |
| **10** | Notification Failure After Write | **SAFE / RESILIENT** | `SharePointCERDataService.ts:1735` | Non-blocking `try/catch`; main proposal approval succeeds even if notification logging fails. |

---

## 3. Deep-Dive on Critical Concurrency Flaws

### 3.1. Flaw 1: Proposal Number Generation Race Condition (P0/P1)
- **Location:** `SharePointCERDataService.ts:333-375` (`generateProposalNumber`)
- **Mechanism:**
  1. User A navigates to `#create`. Browser queries SharePoint for the latest proposal number (`CER-2026-0004`) and calculates `CER-2026-0005`.
  2. User B navigates to `#create` 15 seconds later while User A is still filling the 14 mandatory fields. User B also queries SharePoint, sees `CER-2026-0004` as the latest, and calculates `CER-2026-0005`.
  3. User A submits first: SharePoint writes item with `cerPrNo = 'CER-2026-0005'`.
  4. User B submits second:
     - Case A (Direct Submission): In `createProposal` (line 461), `existingStatus !== 'Draft'` triggers an exception: `"Proposal No. 'CER-2026-0005' already exists in SharePoint"`. User B's submission is rejected, and User B has to restart or re-generate.
     - Case B (Both Saved as Draft): In lines 457-472, if both saved as Draft, User B's write retrieves `spItemId` of User A's draft and issues an `updateListItem` — **OVERWRITING User A's draft with User B's proposal data!**
- **Recommended Practical Mitigation:**
  Implement a central **Auto-Number Counter List** in SharePoint (`CERSequenceTracker` or `CERConfig` item). When a user submits, the service performs an atomic increment using ETag matching on that single configuration item, or generates the final sequence number server-side at the instant of final submission rather than pre-generating on form load.

---

### 3.2. Flaw 2: Unconditional Overwrites via `"If-Match": "*"` (P1)
- **Location:** `src/webparts/cer/hooks/useSharePointOperations.ts:167`
  ```typescript
  headers: {
    Accept: "application/json;odata=nometadata",
    "Content-Type": "application/json;odata=nometadata",
    "X-HTTP-Method": "MERGE",
    "If-Match": "*",
  }
  ```
- **Mechanism:**
  - In HTTP and SharePoint REST, `"If-Match": "*"` disables optimistic concurrency.
  - SharePoint normally supports ETag concurrency via the `__metadata.etag` or `odata.etag` header. If passed in `"If-Match": "{etag}"`, SharePoint compares the client's ETag with the current item version in the database. If another user modified the item in the interim, SharePoint returns **HTTP 412 Precondition Failed**, preventing lost updates.
  - By hardcoding `"If-Match": "*"`, the application forces unconditional overwrites, obliterating simultaneous changes without notification.
- **Recommended Practical Mitigation:**
  Update `updateListItem` to accept an optional `etag?: string`. When modifying proposals or recording approval decisions, pass the ETag retrieved during the initial fetch. If SharePoint returns 412, prompt the user with a concurrency conflict warning (*"This proposal has been modified by another user. Please reload the latest changes."*).

---

### 3.3. Flaw 3: Non-Atomic Multi-Step Approval Transactions (P1)
- **Location:** `SharePointCERDataService.ts:1593-1710` (`recordDecision`)
- **Mechanism:**
  Recording an approval decision requires two consecutive SharePoint writes:
  1. Write 1: `createListItem(SP_LISTS.CER_APPROVAL_DECISIONS, ...)`
  2. Write 2: `updateListItem(SP_LISTS.CER_PROPOSALS, ...)`
  If Write 1 succeeds and Write 2 fails (e.g. network dropout, server 503, ETag failure, or tab closure):
  - The decision record exists in `CERApprovalDecisions`.
  - The proposal status in `CERProposals` remains stuck at the previous level.
  - When the user retries, a duplicate decision record is created in `CERApprovalDecisions`.
- **Recommended Practical Mitigation:**
  1. Add an idempotent check in `recordDecision`: Before creating a new decision record, query if an identical decision for `(cerprno, level_id, approver_email)` was already posted within the last 5 minutes.
  2. Implement an automatic compensation/recovery step: If Write 2 fails, attempt to delete/rollback Write 1, or mark Write 1 as pending reconciliation.
  3. Alternatively, utilize **SharePoint Batch REST API (`$batch`)**: Combine both operations in a single multipart HTTP `$batch` request so that SharePoint processes both writes in a single changeset.

---

## 4. Summary of Mitigation Strategies (Zero External Infrastructure)

All proposed mitigations can be implemented purely within SPFx and SharePoint Online without requiring Azure SQL, Azure Functions, or external web services:

1. **SharePoint REST `$batch` Request:** Atomic changeset for proposal updates + decision records.
2. **ETag-Based Optimistic Concurrency:** Protects against lost updates on `CERProposals`.
3. **Atomic Sequence Tracking List:** Prevents duplicate proposal number collisions.
4. **Idempotent Decision Keys:** Prevents duplicate decision logs upon network retries.

