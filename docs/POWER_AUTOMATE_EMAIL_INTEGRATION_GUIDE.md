# CER Management System — Power Automate Email Notifications Guide

**Target Environment:** SharePoint Online UAT & Production (`https://vedanta.sharepoint.com/sites/CERManagementSystemUAT`)  
**Integration Pattern:** Decoupled Outbox Queue (`CERNotifications` $\rightarrow$ Power Automate $\rightarrow$ Outlook)  
**Version:** 1.0 (Production Release)  

---

## 1. Architectural Overview (The Outbox Pattern)

The CER Management System utilizes an enterprise **Outbox Pattern** for dispatching email notifications. Client-side SPFx applications running inside the user's browser do not communicate directly with SMTP servers or Microsoft Graph Mail API. Instead:

```
┌────────────────────────────────────────────────────────┐
│                   CER Web Application                  │
│   (User submits proposal or approver records decision) │
└──────────────────────────┬─────────────────────────────┘
                           │ 1. Asynchronous write (<100ms)
                           ▼
┌────────────────────────────────────────────────────────┐
│       SharePoint Queue List: `CERNotifications`        │
│   • cerPrNo        • recipients (semicolon-delimited)  │
│   • subject        • bodyPreview (full text)           │
│   • triggerEvent   • Created (timestamp)               │
└──────────────────────────┬─────────────────────────────┘
                           │ 2. Automated webhook trigger
                           ▼
┌────────────────────────────────────────────────────────┐
│              Power Automate Cloud Flow                 │
│         "When an item is created in SharePoint"        │
└──────────────────────────┬─────────────────────────────┘
                           │ 3. Dispatches via Office 365 Outlook
                           ▼
┌────────────────────────────────────────────────────────┐
│            Corporate Inboxes (Outlook / M365)          │
│   • Initiator / Owner  • Prior Approvers  • Next Lead  │
└────────────────────────────────────────────────────────┘
```

### Key Architectural Benefits
1. **Zero UI Freezes:** Submissions and approvals complete in milliseconds without waiting for Exchange mail servers.
2. **Guaranteed Delivery:** If an approver's mailbox is temporarily unavailable, Power Automate automatically retries delivery with exponential backoff.
3. **Audit Compliance:** Every notification dispatched across all proposals is permanently logged in the `CERNotifications` SharePoint list.

---

## 2. Complete Catalog of Notification Types

The application generates **6 distinct notification events** based on proposal workflow transitions:

```
                              ┌────────────────────────┐
                              │  Draft (No Email Sent) │
                              └───────────┬────────────┘
                                          │ Click "Submit"
                                          ▼
                               ┌───────────────────────┐
                     ┌─────────┤  Level 1 (In Approval)│◄────────────────┐
                     │         └───────────┬───────────┘                 │
                     │                     │ Click "Approve"             │
                     │                     ▼                             │
                     │         ┌───────────────────────┐                 │
                     │         │  Level 2 (In Approval)│                 │
                     │         └───────────┬───────────┘                 │
                     │                     │                             │
                     │ (Reject)            │ (Approve Levels 3..N)       │ (Sent Back)
                     │                     ▼                             │
                     │         ┌───────────────────────┐                 │
                     │         │ Level N (Final Level) │                 │
                     │         └───────────┬───────────┘                 │
                     │                     │                             │
                     │                     │ Click "Approve"             │
                     ▼                     ▼                             │
           ┌──────────────────┐  ┌──────────────────┐  ┌─────────────────┴─┐
           │     REJECTED     │  │     APPROVED     │  │      REVISED      │
           │ (Type 6: Reject) │  │(Type 4: Sanction)│  │ (Type 5: Rework)  │
           └──────────────────┘  └──────────────────┘  └───────────────────┘
```

---

### Notification Type 1: New Proposal Submission
* **Trigger Process:** Initiator completes the proposal form and clicks **"Submit for Approval"** (`createProposal`).
* **Workflow Status Transition:** `Draft` $\rightarrow$ `In Approval` (Pending Level 1).
* **Trigger Event Code:** `SUBMIT`
* **Recipients:**
  1. **CER Owner** (`owner_email`) — Confirmation that their proposal was logged.
  2. **Level 1 Assigned Approver** (`pending_with_email`) — Action request to review.
* **Subject Template:**
  ```text
  [CER Action Required] New Proposal {cerPrNo} - {prName}
  ```
* **Example Subject:**
  ```text
  [CER Action Required] New Proposal CER-2026-0004 - Wellhead Compressor Replacement
  ```
* **Body Content:**
  ```text
  CER Proposal CER-2026-0004 (Wellhead Compressor Replacement) for USD 4,500,000 has been submitted and is awaiting Level 1 approval (L1 - Technical Review).
  ```

---

### Notification Type 2: Proposal Change & Resubmission
* **Trigger Process:** CER Owner or Initiator edits a proposal in `Revised` or `Approved` status and resubmits (`updateProposal`).
* **Workflow Status Transition:** `Revised` / `Approved` $\rightarrow$ `In Approval` (Restarting at Level 1).
* **Trigger Event Code:** `SUBMIT`
* **Recipients:**
  1. **CER Owner** (`owner_email`)
  2. **Level 1 Assigned Approver** (`pending_with_email`)
* **Subject Template:**
  ```text
  [CER Action Required] Proposal {cerPrNo} Submitted for Approval
  ```
* **Example Subject:**
  ```text
  [CER Action Required] Proposal CER-2026-0002 Submitted for Approval
  ```
* **Body Content:**
  ```text
  Proposal CER-2026-0002 (Pipeline Capacity Augmentation) has been submitted/re-triggered by Shiven Pandit and is awaiting Level 1 approval (L1 - Technical Review).
  ```

---

### Notification Type 3: Stage Approval & Advancement (Intermediate Levels)
* **Trigger Process:** Stage approver clicks **"Approve"** on a proposal where further approval stages remain (`recordDecision`).
* **Workflow Status Transition:** Level $X$ $\rightarrow$ Level $X+1$ (`In Approval`).
* **Trigger Event Code:** `APPROVE`
* **Recipients (Fully Deduplicated):**
  1. **Proposal Creator / Owner** (`creatorEmail` / `owner_email`)
  2. **All Prior Stage Approvers** (loaded from `CERApprovalDecisions`)
  3. **Current Approver** (`approver_email`)
  4. **Next Stage Approver** (`nextEmail`)
* **Subject Template:**
  ```text
  [CER Approved Level {levelId}] Proposal {cerPrNo} Advanced to Level {nextLevel}
  ```
* **Example Subject:**
  ```text
  [CER Approved Level 1] Proposal CER-2026-0001 Advanced to Level 2
  ```
* **Body Content:**
  ```text
  Proposal CER-2026-0001 approved at Level 1 by Sunil Verma. Comments: "Technical specifications reviewed and validated.". Proposal is now pending action from F&A Discipline Lead (fa.lead@cairnindia.com).

  Attachments Included (2):
  • FEED_Study_Report.pdf (1420 KB)
  • Vendor_Commercial_Quotes.xlsx (480 KB)
  ```

---

### Notification Type 4: Final Executive Sanction (Final Stage Approval)
* **Trigger Process:** Approver at the highest active workflow stage clicks **"Approve"** (`recordDecision`).
* **Workflow Status Transition:** Level $N$ $\rightarrow$ `Approved` (Workflow Completed).
* **Trigger Event Code:** `APPROVE`
* **Recipients (Fully Deduplicated):**
  1. **Proposal Creator / Owner**
  2. **All Prior Stage Approvers across all Levels 1 through N**
  3. **Final Approver**
* **Subject Template:**
  ```text
  [CER Final Sanction] Proposal {cerPrNo} Approved at Final Level {levelId}
  ```
* **Example Subject:**
  ```text
  [CER Final Sanction] Proposal CER-2026-0001 Approved at Final Level 7
  ```
* **Body Content:**
  ```text
  Proposal CER-2026-0001 has received final executive sanction by Chief Executive Officer. Decision: APPROVED. Comments: "Approved for FY26 execution under capital budget line.".

  Attachments Included (2):
  • FEED_Study_Report.pdf (1420 KB)
  • Vendor_Commercial_Quotes.xlsx (480 KB)
  ```

---

### Notification Type 5: Sent Back to Initiator for Revision (Rework)
* **Trigger Process:** Approver at any stage clicks **"Send Back"** requiring edits/clarifications (`recordDecision`).
* **Workflow Status Transition:** `In Approval` $\rightarrow$ `Revised` (Reset to Level 1, awaiting rework).
* **Trigger Event Code:** `REVISE`
* **Recipients (Fully Deduplicated):**
  1. **Proposal Creator / Owner** (`owner_email`) — Instructed to edit.
  2. **All Prior Stage Approvers** — Informed that proposal has been paused for rework.
  3. **Current Approver** — Confirmation of send-back action.
* **Subject Template:**
  ```text
  [CER Revision Requested] Proposal {cerPrNo} Sent Back to Initiator by Level {levelId}
  ```
* **Example Subject:**
  ```text
  [CER Revision Requested] Proposal CER-2026-0003 Sent Back to Initiator by Level 2
  ```
* **Body Content:**
  ```text
  Proposal CER-2026-0003 was sent back to initiator for rework/revision by Finance Lead at Level 2. Required changes / notes: "Please revise Payback Quarters from 4 to 6 based on updated crude realizations.". The initiator can edit and resubmit to restart approval.

  Attachments Included (1):
  • Cost_Estimates_V1.xlsx (320 KB)
  ```

---

### Notification Type 6: Proposal Rejection
* **Trigger Process:** Approver at any stage clicks **"Reject"** (`recordDecision`).
* **Workflow Status Transition:** `In Approval` $\rightarrow$ `Rejected` (Workflow Terminated).
* **Trigger Event Code:** `REJECT`
* **Recipients (Fully Deduplicated):**
  1. **Proposal Creator / Owner**
  2. **All Prior Stage Approvers**
  3. **Current Rejecting Approver**
* **Subject Template:**
  ```text
  [CER Rejected] Proposal {cerPrNo} Rejected at Level {levelId}
  ```
* **Example Subject:**
  ```text
  [CER Rejected] Proposal CER-2026-0005 Rejected at Level 3
  ```
* **Body Content:**
  ```text
  Proposal CER-2026-0005 was rejected at Level 3 by SBU Operations Head. Reason / Comments: "Project does not meet IRR threshold under current capital rationing.".
  ```

---

## 3. Summary Matrix of All Notification Types

| Event | Status | Trigger User Action | Recipients | Trigger Code | Subject Prefix |
| :---: | :---: | :--- | :--- | :---: | :--- |
| **New Create** | `In Approval` | Initiator clicks *Submit* | Owner + L1 Approver | `SUBMIT` | `[CER Action Required] New Proposal...` |
| **Re-Submit** | `In Approval` | Initiator clicks *Submit* on Revised | Owner + L1 Approver | `SUBMIT` | `[CER Action Required] Proposal...` |
| **Stage Approved** | `In Approval` | Approver clicks *Approve* (L1..N-1) | Owner + Prior Approvers + Next Approver | `APPROVE` | `[CER Approved Level X]...` |
| **Final Sanction** | `Approved` | Approver clicks *Approve* (Final) | Owner + All Approvers (L1..N) | `APPROVE` | `[CER Final Sanction]...` |
| **Send Back** | `Revised` | Approver clicks *Send Back* | Owner + Prior Approvers + Current | `REVISE` | `[CER Revision Requested]...` |
| **Reject** | `Rejected` | Approver clicks *Reject* | Owner + Prior Approvers + Current | `REJECT` | `[CER Rejected]...` |

---

## 4. Step-by-Step Power Automate Setup Guide

Follow these steps to create your automated email dispatcher in Microsoft Power Automate.

### Step 1: Open Power Automate
1. Navigate to [make.powerautomate.com](https://make.powerautomate.com) and ensure your **Vedanta / Cairn India** environment is selected.
2. In the left navigation menu, click **+ Create**.
3. Under *Start from blank*, click **Automated cloud flow**.

---

### Step 2: Configure the Flow Trigger
1. **Flow name:** Enter `CER Management - Automated Email Dispatcher`.
2. Under **Choose your flow's trigger**, search for `SharePoint`.
3. Select the trigger: **When an item is created** (SharePoint).
4. Click **Create**.
5. Configure the trigger card:
   * **Site Address:** Select or paste `https://vedanta.sharepoint.com/sites/CERManagementSystemUAT`
   * **List Name:** Select **`CERNotifications`**

---

### Step 3: Add the Email Action (Option A — Simple Clean Email)
1. Click **+ New step** (or the `+` icon below the trigger).
2. Search for `Outlook`.
3. Select the action: **Send an email (V2)** (Office 365 Outlook).
4. Map the dynamic content from `CERNotifications`:
   * **To:** Click the field $\rightarrow$ Select Dynamic Content $\rightarrow$ **`recipients`**
   * **Subject:** Click the field $\rightarrow$ Select Dynamic Content $\rightarrow$ **`subject`**
   * **Body:** Click the field $\rightarrow$ Select Dynamic Content $\rightarrow$ **`bodyPreview`**
5. Click **Show advanced options**:
   * **Importance:** Select **Normal** (or High)
   * **Is HTML:** Select **Yes**

---

### Step 4 (Recommended): Option B — Branded Corporate HTML Template
If you want professional corporate formatting with the Vedanta header, action button, and structured metadata, use this HTML in the **Body** field of *Send an email (V2)*:

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; color: #1E293B; }
    .card { max-width: 650px; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #012964; padding: 24px 32px; color: #FFFFFF; }
    .header h1 { margin: 0; font-size: 20px; font-weight: 700; letter-spacing: -0.5px; }
    .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
    .badge { display: inline-block; padding: 4px 12px; font-size: 11px; font-weight: 700; border-radius: 20px; text-transform: uppercase; margin-bottom: 12px; background: #F59E0B; color: #FFFFFF; }
    .content { padding: 32px; line-height: 1.6; font-size: 14px; }
    .message-box { background: #F1F5F9; border-left: 4px solid #012964; padding: 16px 20px; border-radius: 0 8px 8px 0; font-size: 14px; white-space: pre-wrap; margin: 20px 0; color: #0F172A; }
    .button-container { text-align: center; margin: 30px 0 10px; }
    .btn { background: #012964; color: #FFFFFF !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; }
    .footer { background: #F8FAFC; padding: 20px 32px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">CER Workflow Alert</div>
      <h1>Capital Expenditure Request System</h1>
      <p>Vedanta Limited / Cairn Oil & Gas</p>
    </div>
    <div class="content">
      <p>Dear Stakeholder,</p>
      <p>A workflow event has occurred regarding CER Proposal <strong>@{triggerOutputs()?['body/cerPrNo']}</strong>.</p>
      
      <div class="message-box">
@{triggerOutputs()?['body/bodyPreview']}
      </div>

      <div class="button-container">
        <a href="https://vedanta.sharepoint.com/sites/CERManagementSystemUAT/SitePages/CER.aspx#display/@{encodeUriComponent(triggerOutputs()?['body/cerPrNo'])}" class="btn">
          View Proposal in CER Portal
        </a>
      </div>
      
      <p style="margin-top: 30px; font-size: 13px; color: #64748B;">
        Please do not reply directly to this automated email. To take approval action or review attachments, click the button above to log into the CER Management System.
      </p>
    </div>
    <div class="footer">
      This is an automated notification from the Vedanta Enterprise CER Management System.<br>
      Site: https://vedanta.sharepoint.com/sites/CERManagementSystemUAT
    </div>
  </div>
</body>
</html>
```

---

### Step 5: Save and Test
1. Click **Save** in the top-right corner.
2. In your browser, open the **CER Management System** portal.
3. Submit a test proposal or approve a pending stage.
4. Go back to Power Automate and check **28-day run history**.
5. You will see a green checkmark: **Succeeded**!
6. Check your Outlook Inbox to confirm the email was delivered.

---

## 5. Troubleshooting & FAQ

#### Q: The emails contain multiple people. Does Power Automate handle semicolon-separated emails?
* **Yes.** The CER application stores `recipients` as `user1@cairnindia.com; user2@cairnindia.com`. The Office 365 Outlook *Send an email (V2)* action natively parses semicolon-separated emails in the **To** field.

#### Q: What if an approver's email is invalid?
* The CER application runs `isValidEmail()` verification before routing or adding recipients to `CERNotifications`. Malformed addresses are caught at form submission.

#### Q: What happens if Power Automate fails or is turned off?
* The proposal approval inside SharePoint is **never affected**. The proposal will still advance to the next level successfully because notification logging is an asynchronous, non-blocking operation.
* When the Power Automate flow is turned back on, it can process any unhandled items.

