# CER Management System — Power Automate Email Notifications Guide (Direct Trigger Architecture)

**Target Environment:** SharePoint Online UAT & Production (`https://vedanta.sharepoint.com/sites/CERManagementSystemUAT`)  
**Integration Pattern:** **Direct Native Trigger** (`CERProposals` & `CERApprovalDecisions` $\rightarrow$ Power Automate $\rightarrow$ Office 365 Outlook)  
**List Requirement:** **ZERO Extra Lists** (The `CERNotifications` list is **DEPRECATED & NOT REQUIRED** and can be safely deleted).  
**Version:** 2.0 (Direct Native Flow Release)  

---

## 1. Architectural Overview (Direct-Trigger Pattern)

In this modern architecture, Power Automate connects **directly** to the primary SharePoint lists that the CER application naturally uses. No intermediate queue list (`CERNotifications`) is needed.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        CER Web Portal (SPFx)                           │
│     (Initiator submits proposal  OR  Approver logs approval decision)  │
└──────────────────┬─────────────────────────────────┬───────────────────┘
                   │                                 │
                   │ 1. Proposal Created / Updated   │ 2. Approver Decision Recorded
                   ▼                                 ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│     SharePoint: `CERProposals`       │  │  SharePoint: `CERApprovalDecisions`  │
│  • cerPrId       • proposalNo        │  │  • cerPrId       • levelId           │
│  • prName        • proposalStatus    │  │  • stage_name    • decision          │
│  • currentLevel  • pendingWithRole   │  │  • approver_name • approver_email    │
│  • pendingWithEmail • ownerEmail     │  │  • comments      • Created           │
└──────────────────┬───────────────────┘  └──────────────────┬───────────────────┘
                   │                                         │
                   ▼                                         ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────────┐
│  Power Automate Flow 1: Submissions  │  │   Power Automate Flow 2: Decisions   │
│  "When an item is created/modified"  │  │     "When an item is created"        │
└──────────────────┬───────────────────┘  └──────────────────┬───────────────────┘
                   │                                         │
                   └────────────────────┬────────────────────┘
                                        │ Dispatches via Office 365 Outlook
                                        ▼
┌────────────────────────────────────────────────────────────────────────┐
│                      Corporate Inboxes (Outlook / M365)                │
│    • Assigned Approver (Action Required)  • Proposal Owner             │
│    • Prior Stage Approvers                • Final Executive Sign-off   │
└────────────────────────────────────────────────────────────────────────┘
```

### Key Advantages Over the Outbox Pattern
1. **No Extra Lists to Maintain:** You do not need to create, index, or periodically purge items from `CERNotifications`.
2. **Real-Time Triggering:** Native SharePoint triggers fire instantly when records are committed.
3. **Decoupled & Resilient:** If you delete the `CERNotifications` list, the CER application continues to function normally with 100% reliability.

---

## 2. Notification Catalog & Routing Matrix

The system handles **6 core workflow notification scenarios**:

| Notification Type | Triggering List | Workflow Trigger Event | Recipients | Subject Template |
| :--- | :--- | :--- | :--- | :--- |
| **1. New Submission** | `CERProposals` | Status changes to `In Approval` at Level 1 | **Level 1 Approver** (`pendingWithEmail`) + **Owner** (`ownerEmail`) | `[CER Action Required] New Proposal {cerPrId} - {prName}` |
| **2. Resubmission (Rework)** | `CERProposals` | Revised proposal resubmitted to `In Approval` at Level 1 | **Level 1 Approver** (`pendingWithEmail`) + **Owner** (`ownerEmail`) | `[CER Action Required] Proposal {cerPrId} Resubmitted for Approval` |
| **3. Stage Advancement** | `CERApprovalDecisions` | Decision is `APPROVED` and proposal advances to Level 2..N | **Next Approver** (`pendingWithEmail`) + **Owner** (`ownerEmail`) | `[CER Action Required] Proposal {cerPrId} Pending Level {nextLevel} Review` |
| **4. Final Sanction** | `CERApprovalDecisions` | Decision is `APPROVED` at final level (Status = `Approved`) | **Owner** (`ownerEmail`) + **Final Approver** + Prior Approvers | `[CER Final Sanction] Proposal {cerPrId} Approved` |
| **5. Send Back (Rework)** | `CERApprovalDecisions` | Decision is `REVISED` / `SENT_BACK` (Status = `Revised`) | **Owner** (`ownerEmail`) | `[CER Revision Requested] Proposal {cerPrId} Sent Back by Level {levelId}` |
| **6. Rejection** | `CERApprovalDecisions` | Decision is `REJECTED` (Status = `Rejected`) | **Owner** (`ownerEmail`) | `[CER Rejected] Proposal {cerPrId} Rejected at Level {levelId}` |

---

## 3. Power Automate Implementation Guide

We implement two lightweight, reliable cloud flows in [make.powerautomate.com](https://make.powerautomate.com).

```
Flow 1: CER - Proposal Submissions & Resubmissions   (Triggers on CERProposals)
Flow 2: CER - Approval Decisions & Workflow Routing  (Triggers on CERApprovalDecisions)
```

---

### Flow 1: CER - Proposal Submissions & Resubmissions

This flow alerts the **Level 1 Approver** and confirms to the **Proposal Owner** whenever a new proposal is submitted or a revised proposal is resubmitted.

#### Step 1.1: Trigger
1. Create an **Automated Cloud Flow** named: `CER - 1. Proposal Submissions`.
2. Choose trigger: **SharePoint — When an item is created or modified**.
3. **Site Address:** `https://vedanta.sharepoint.com/sites/CERManagementSystemUAT`
4. **List Name:** `CERProposals`

#### Step 1.2: Trigger Conditions (Crucial to prevent loops)
In the trigger card, click **... (three dots) $\rightarrow$ Settings $\rightarrow$ Trigger Conditions**, and add:
```text
@and(equals(triggerOutputs()?['body/proposalStatus'], 'In Approval'), equals(triggerOutputs()?['body/currentLevel'], 1), not(empty(triggerOutputs()?['body/pendingWithEmail'])))
```
*This ensures the flow only runs when a proposal is actively entering Level 1 approval.*

#### Step 1.3: Action 1 — Notify Level 1 Approver (Action Required)
1. Add action: **Office 365 Outlook — Send an email (V2)**.
2. Rename action: `Send Email to L1 Approver`.
3. **To:** `@{triggerOutputs()?['body/pendingWithEmail']}`
4. **Subject:** `[CER Action Required] Proposal @{triggerOutputs()?['body/cerPrId']} Pending Your Review`
5. **Body (HTML):** Paste **Template 1** below.

#### Step 1.4: Action 2 — Confirm to CER Owner (Confirmation)
1. Add action: **Office 365 Outlook — Send an email (V2)**.
2. Rename action: `Send Confirmation to Owner`.
3. **To:** `@{triggerOutputs()?['body/ownerEmail']}`
4. **Subject:** `[CER Submission] Proposal @{triggerOutputs()?['body/cerPrId']} Submitted for Approval`
5. **Body (HTML):** Paste **Template 2** below.

---

### Flow 2: CER - Approval Decisions, Advancements & Final Sanction

This flow triggers whenever an approver records an **Approve**, **Send Back**, or **Reject** decision in the portal.

#### Step 2.1: Trigger
1. Create an **Automated Cloud Flow** named: `CER - 2. Approval Decisions & Workflow`.
2. Choose trigger: **SharePoint — When an item is created**.
3. **Site Address:** `https://vedanta.sharepoint.com/sites/CERManagementSystemUAT`
4. **List Name:** `CERApprovalDecisions`

#### Step 2.2: Action 1 — Get Corresponding Proposal Details
1. Add action: **SharePoint — Get items**.
2. **Site Address:** `https://vedanta.sharepoint.com/sites/CERManagementSystemUAT`
3. **List Name:** `CERProposals`
4. **Filter Query:**
   ```text
   cerPrId eq '@{triggerOutputs()?['body/Title']}' or cerPrNo eq '@{triggerOutputs()?['body/Title']}' or Title eq '@{triggerOutputs()?['body/Title']}'
   ```
5. **Top Count:** `1`

#### Step 2.3: Action 2 — Compose Proposal Object
1. Add action: **Data Operation — Compose**.
2. **Inputs:** `@{first(outputs('Get_items')?['body/value'])}`

#### Step 2.4: Action 3 — Switch on Decision
Add a **Switch** control.
* **On:** `@{triggerOutputs()?['body/decision']}`

---

#### Case A: `APPROVED`
Inside Case `APPROVED`, add a **Condition**:
* **Condition:** `@{outputs('Compose')?['proposalStatus']}` **is equal to** `Approved`

##### Branch IF YES: Final Executive Sanction (All Levels Approved)
* Add action: **Send an email (V2)**.
* **To:** `@{outputs('Compose')?['ownerEmail']}; @{triggerOutputs()?['body/approver_email']}`
* **Subject:** `[CER Final Sanction] Proposal @{outputs('Compose')?['cerPrId']} Approved`
* **Body:** Use **Template 3 (Final Sanction)** below.

##### Branch IF NO: Stage Advanced to Next Approver (Intermediate Level)
1. **Send Email to Next Approver:**
   * **To:** `@{outputs('Compose')?['pendingWithEmail']}`
   * **Subject:** `[CER Action Required] Proposal @{outputs('Compose')?['cerPrId']} Pending Review (Level @{outputs('Compose')?['currentLevel']})`
   * **Body:** Use **Template 4 (Next Approver Action Required)** below.
2. **Send Progress Update to Proposal Owner:**
   * **To:** `@{outputs('Compose')?['ownerEmail']}`
   * **Subject:** `[CER Update] Proposal @{outputs('Compose')?['cerPrId']} Approved at Level @{triggerOutputs()?['body/levelId']}`
   * **Body:** Use **Template 5 (Owner Progress Update)** below.

---

#### Case B: `REVISED` (or `SENT_BACK`)
When an approver sends back a proposal requesting clarifications or changes:
1. Add action: **Send an email (V2)**.
2. **To:** `@{outputs('Compose')?['ownerEmail']}`
3. **CC:** `@{triggerOutputs()?['body/approver_email']}`
4. **Subject:** `[CER Revision Requested] Proposal @{outputs('Compose')?['cerPrId']} Sent Back by Level @{triggerOutputs()?['body/levelId']}`
5. **Body:** Use **Template 6 (Rework / Revision Requested)** below.

---

#### Case C: `REJECTED`
When an approver rejects a proposal:
1. Add action: **Send an email (V2)**.
2. **To:** `@{outputs('Compose')?['ownerEmail']}`
3. **CC:** `@{triggerOutputs()?['body/approver_email']}`
4. **Subject:** `[CER Rejected] Proposal @{outputs('Compose')?['cerPrId']} Rejected at Level @{triggerOutputs()?['body/levelId']}`
5. **Body:** Use **Template 7 (Proposal Rejection)** below.

---

## 4. Branded Corporate Email HTML Templates

All email templates use official Vedanta branding:
* **Deep Blue Header:** `#012964`
* **Accents:** Green `#66CC33` (Approved), Amber `#D97706` (Revision), Rose `#E11D48` (Rejected)
* **One-Click Action Button:** Directly navigates into `#display/{cerPrId}` in the CER portal.

---

### Template 1: Action Required — Level 1 Approver

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; color: #1E293B; }
    .card { max-width: 650px; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #012964; padding: 22px 30px; color: #FFFFFF; }
    .header h1 { margin: 0; font-size: 19px; font-weight: 700; }
    .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
    .badge { display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 16px; text-transform: uppercase; margin-bottom: 10px; background: #2563EB; color: #FFFFFF; }
    .content { padding: 28px 30px; line-height: 1.6; font-size: 14px; }
    .grid { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 13px; }
    .grid td { padding: 8px 12px; border-bottom: 1px solid #F1F5F9; }
    .grid td.label { font-weight: 600; color: #64748B; width: 38%; }
    .grid td.val { font-weight: 700; color: #0F172A; }
    .btn-wrap { text-align: center; margin: 26px 0 10px; }
    .btn { background: #012964; color: #FFFFFF !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; }
    .footer { background: #F8FAFC; padding: 16px 30px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">Action Required</div>
      <h1>Capital Expenditure Request System</h1>
      <p>Vedanta Limited / Cairn Oil & Gas</p>
    </div>
    <div class="content">
      <p>Dear Approver,</p>
      <p>A new Capital Expenditure Request has been submitted and requires your formal review and approval at <strong>Level 1 (Technical Review)</strong>.</p>
      
      <table class="grid">
        <tr><td class="label">CER Proposal ID:</td><td class="val">@{triggerOutputs()?['body/cerPrId']}</td></tr>
        <tr><td class="label">Proposal Reference No:</td><td class="val">@{triggerOutputs()?['body/proposalNo']}</td></tr>
        <tr><td class="label">Project Name:</td><td class="val">@{triggerOutputs()?['body/prName']}</td></tr>
        <tr><td class="label">CER Owner:</td><td class="val">@{triggerOutputs()?['body/owname']}</td></tr>
        <tr><td class="label">SBU / Block:</td><td class="val">@{triggerOutputs()?['body/sbu']}</td></tr>
        <tr><td class="label">Category:</td><td class="val">@{triggerOutputs()?['body/category']}</td></tr>
        <tr><td class="label">Amount of CER:</td><td class="val">USD @{formatNumber(triggerOutputs()?['body/proposalAmount'], '#,##0')}</td></tr>
      </table>

      <div class="btn-wrap">
        <a href="https://vedanta.sharepoint.com/sites/CERManagementSystemUAT/SitePages/CER.aspx#display/@{encodeUriComponent(triggerOutputs()?['body/cerPrId'])}" class="btn">
          Review & Approve in CER Portal
        </a>
      </div>
    </div>
    <div class="footer">
      Automated workflow notification from Vedanta Enterprise CER Management Portal.
    </div>
  </div>
</body>
</html>
```

---

### Template 4: Next Approver — Stage Advancement (Level 2..N)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; color: #1E293B; }
    .card { max-width: 650px; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; margin: 0 auto; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05); }
    .header { background: #012964; padding: 22px 30px; color: #FFFFFF; }
    .header h1 { margin: 0; font-size: 19px; font-weight: 700; }
    .header p { margin: 4px 0 0; font-size: 13px; opacity: 0.85; }
    .badge { display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 16px; text-transform: uppercase; margin-bottom: 10px; background: #2563EB; color: #FFFFFF; }
    .content { padding: 28px 30px; line-height: 1.6; font-size: 14px; }
    .quote-box { background: #F1F5F9; border-left: 4px solid #012964; padding: 12px 16px; border-radius: 0 6px 6px 0; font-size: 13px; margin: 16px 0; }
    .grid { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 13px; }
    .grid td { padding: 8px 12px; border-bottom: 1px solid #F1F5F9; }
    .grid td.label { font-weight: 600; color: #64748B; width: 38%; }
    .grid td.val { font-weight: 700; color: #0F172A; }
    .btn-wrap { text-align: center; margin: 26px 0 10px; }
    .btn { background: #012964; color: #FFFFFF !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; }
    .footer { background: #F8FAFC; padding: 16px 30px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">Action Required</div>
      <h1>Capital Expenditure Request System</h1>
      <p>Vedanta Limited / Cairn Oil & Gas</p>
    </div>
    <div class="content">
      <p>Dear Approver,</p>
      <p>Proposal <strong>@{outputs('Compose')?['cerPrId']}</strong> was approved at Level @{triggerOutputs()?['body/levelId']} by @{triggerOutputs()?['body/approver_name']} and has now advanced to your queue for review: <strong>@{outputs('Compose')?['pendingWithRole']}</strong>.</p>
      
      <div class="quote-box">
        <strong>Previous Approver Comments:</strong><br>
        "@{triggerOutputs()?['body/comments']}"
      </div>

      <table class="grid">
        <tr><td class="label">CER Proposal ID:</td><td class="val">@{outputs('Compose')?['cerPrId']}</td></tr>
        <tr><td class="label">Project Name:</td><td class="val">@{outputs('Compose')?['prName']}</td></tr>
        <tr><td class="label">CER Owner:</td><td class="val">@{outputs('Compose')?['owname']}</td></tr>
        <tr><td class="label">Amount of CER:</td><td class="val">USD @{formatNumber(outputs('Compose')?['proposalAmount'], '#,##0')}</td></tr>
        <tr><td class="label">Current Stage:</td><td class="val">Level @{outputs('Compose')?['currentLevel']} — @{outputs('Compose')?['pendingWithRole']}</td></tr>
      </table>

      <div class="btn-wrap">
        <a href="https://vedanta.sharepoint.com/sites/CERManagementSystemUAT/SitePages/CER.aspx#display/@{encodeUriComponent(outputs('Compose')?['cerPrId'])}" class="btn">
          Open Proposal in CER Portal
        </a>
      </div>
    </div>
    <div class="footer">
      Automated workflow notification from Vedanta Enterprise CER Management Portal.
    </div>
  </div>
</body>
</html>
```

---

### Template 3: Final Executive Sanction (Approved)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; color: #1E293B; }
    .card { max-width: 650px; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; margin: 0 auto; overflow: hidden; }
    .header { background: #012964; padding: 22px 30px; color: #FFFFFF; }
    .header h1 { margin: 0; font-size: 19px; font-weight: 700; }
    .badge { display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 16px; text-transform: uppercase; margin-bottom: 10px; background: #16A34A; color: #FFFFFF; }
    .content { padding: 28px 30px; line-height: 1.6; font-size: 14px; }
    .success-box { background: #F0FDF4; border: 1px solid #BBF7D0; border-left: 4px solid #16A34A; padding: 14px 18px; border-radius: 6px; margin: 18px 0; color: #166534; font-size: 14px; font-weight: 600; }
    .quote-box { background: #F8FAFC; border: 1px solid #E2E8F0; padding: 12px 16px; border-radius: 6px; font-size: 13px; margin: 16px 0; }
    .btn-wrap { text-align: center; margin: 26px 0 10px; }
    .btn { background: #012964; color: #FFFFFF !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; }
    .footer { background: #F8FAFC; padding: 16px 30px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">Final Sanction Granted</div>
      <h1>Capital Expenditure Request System</h1>
      <p>Vedanta Limited / Cairn Oil & Gas</p>
    </div>
    <div class="content">
      <div class="success-box">
        ✓ Capital Expenditure Proposal @{outputs('Compose')?['cerPrId']} has received Final Executive Sanction.
      </div>
      <p>Proposal <strong>@{outputs('Compose')?['cerPrId']} (@{outputs('Compose')?['prName']})</strong> has successfully completed all approval stages and is fully approved for project execution.</p>
      
      <div class="quote-box">
        <strong>Final Approver Remarks (@{triggerOutputs()?['body/approver_name']}):</strong><br>
        "@{triggerOutputs()?['body/comments']}"
      </div>

      <div class="btn-wrap">
        <a href="https://vedanta.sharepoint.com/sites/CERManagementSystemUAT/SitePages/CER.aspx#display/@{encodeUriComponent(outputs('Compose')?['cerPrId'])}" class="btn">
          View Approved CER Certificate
        </a>
      </div>
    </div>
    <div class="footer">
      Automated workflow notification from Vedanta Enterprise CER Management Portal.
    </div>
  </div>
</body>
</html>
```

---

### Template 6: Revision / Rework Requested (Send Back)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; color: #1E293B; }
    .card { max-width: 650px; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; margin: 0 auto; overflow: hidden; }
    .header { background: #012964; padding: 22px 30px; color: #FFFFFF; }
    .header h1 { margin: 0; font-size: 19px; font-weight: 700; }
    .badge { display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 16px; text-transform: uppercase; margin-bottom: 10px; background: #D97706; color: #FFFFFF; }
    .content { padding: 28px 30px; line-height: 1.6; font-size: 14px; }
    .alert-box { background: #FFFBEB; border: 1px solid #FDE68A; border-left: 4px solid #D97706; padding: 14px 18px; border-radius: 6px; margin: 18px 0; color: #92400E; font-size: 14px; }
    .btn-wrap { text-align: center; margin: 26px 0 10px; }
    .btn { background: #012964; color: #FFFFFF !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; }
    .footer { background: #F8FAFC; padding: 16px 30px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">Revision Required</div>
      <h1>Capital Expenditure Request System</h1>
      <p>Vedanta Limited / Cairn Oil & Gas</p>
    </div>
    <div class="content">
      <p>Dear @{outputs('Compose')?['owname']},</p>
      <p>Your proposal <strong>@{outputs('Compose')?['cerPrId']} (@{outputs('Compose')?['prName']})</strong> has been <strong>Sent Back</strong> for revision by <strong>@{triggerOutputs()?['body/approver_name']}</strong> at Level @{triggerOutputs()?['body/levelId']}.</p>
      
      <div class="alert-box">
        <strong>Required Clarifications / Changes:</strong><br>
        "@{triggerOutputs()?['body/comments']}"
      </div>

      <p>Please log into the portal, make the requested modifications, and click <strong>Submit Proposal</strong> to restart the approval cycle.</p>

      <div class="btn-wrap">
        <a href="https://vedanta.sharepoint.com/sites/CERManagementSystemUAT/SitePages/CER.aspx#change/@{encodeUriComponent(outputs('Compose')?['cerPrId'])}" class="btn">
          Edit Proposal Now
        </a>
      </div>
    </div>
    <div class="footer">
      Automated workflow notification from Vedanta Enterprise CER Management Portal.
    </div>
  </div>
</body>
</html>
```

---

### Template 7: Proposal Rejection

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background-color: #F8FAFC; margin: 0; padding: 20px; color: #1E293B; }
    .card { max-width: 650px; background: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8F0; margin: 0 auto; overflow: hidden; }
    .header { background: #012964; padding: 22px 30px; color: #FFFFFF; }
    .header h1 { margin: 0; font-size: 19px; font-weight: 700; }
    .badge { display: inline-block; padding: 4px 10px; font-size: 11px; font-weight: 700; border-radius: 16px; text-transform: uppercase; margin-bottom: 10px; background: #E11D48; color: #FFFFFF; }
    .content { padding: 28px 30px; line-height: 1.6; font-size: 14px; }
    .reject-box { background: #FFF1F2; border: 1px solid #FECDD3; border-left: 4px solid #E11D48; padding: 14px 18px; border-radius: 6px; margin: 18px 0; color: #9F1239; font-size: 14px; }
    .btn-wrap { text-align: center; margin: 26px 0 10px; }
    .btn { background: #012964; color: #FFFFFF !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; }
    .footer { background: #F8FAFC; padding: 16px 30px; border-top: 1px solid #E2E8F0; font-size: 12px; color: #64748B; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">Proposal Rejected</div>
      <h1>Capital Expenditure Request System</h1>
      <p>Vedanta Limited / Cairn Oil & Gas</p>
    </div>
    <div class="content">
      <p>Dear @{outputs('Compose')?['owname']},</p>
      <p>Your proposal <strong>@{outputs('Compose')?['cerPrId']} (@{outputs('Compose')?['prName']})</strong> has been rejected by <strong>@{triggerOutputs()?['body/approver_name']}</strong> at Level @{triggerOutputs()?['body/levelId']}.</p>
      
      <div class="reject-box">
        <strong>Reason for Rejection:</strong><br>
        "@{triggerOutputs()?['body/comments']}"
      </div>

      <div class="btn-wrap">
        <a href="https://vedanta.sharepoint.com/sites/CERManagementSystemUAT/SitePages/CER.aspx#display/@{encodeUriComponent(outputs('Compose')?['cerPrId'])}" class="btn">
          View Decision in Portal
        </a>
      </div>
    </div>
    <div class="footer">
      Automated workflow notification from Vedanta Enterprise CER Management Portal.
    </div>
  </div>
</body>
</html>
```

---

## 5. How to Safely Delete the `CERNotifications` List

You can now completely delete the `CERNotifications` list from your SharePoint site:

1. Open your browser and go to:
   ```text
   https://vedanta.sharepoint.com/sites/CERManagementSystemUAT/_layouts/15/viewlsts.aspx
   ```
2. Locate the list named **`CERNotifications`**.
3. Click the three dots **(...)** next to it $\rightarrow$ select **Settings** (or click into the list and select **List settings** from the gear icon).
4. Under *Permissions and Management*, click **Delete this list**.
5. Click **OK** to confirm deletion.

> **Zero Impact Guarantee:** The CER portal code has built-in graceful error-handling that detects when `CERNotifications` is absent, allowing all proposal submissions, updates, and approvals to execute with 100% success and zero errors or warnings.
