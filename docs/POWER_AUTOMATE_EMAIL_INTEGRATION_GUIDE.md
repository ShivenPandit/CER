# CER Management System — Power Automate Email Notifications Guide

**Target Environment:** SharePoint Online UAT & Production (`https://vedanta.sharepoint.com/sites/CERManagementSystemUAT`)  
**Architecture:** Direct Native Triggers on `CERProposals` & `CERApprovalDecisions` (No intermediate queue lists needed)  
**Schema Alignment:** Fully aligned with [`SHAREPOINT_LISTS_AND_COLUMNS_SETUP.md`](file:///d:/Git/CER/docs/SHAREPOINT_LISTS_AND_COLUMNS_SETUP.md) (Native `cerOwner` Person column, `pendingWithEmail` Multi-Person `SPFieldUserMulti`, `status`, and `amount`).

---

## 1. Notification Catalog & Routing Matrix

The system automates all email notifications through **6 core workflow scenarios**:

| # | Notification Scenario | Triggering List | Workflow Trigger Condition | Primary Recipient(s) | CC / Confirmation | Subject Template |
| :- | :--- | :--- | :--- | :--- | :--- | :--- |
| **1** | **New Proposal Submission** | `CERProposals` | Status = `In Approval` & `currentLevel` = 1 | **Level 1 Approvers** (`pendingWithEmail`) | **CER Owner** (`cerOwner/Email`) | `[CER Action Required] New Proposal {cerPrId} - {prName}` |
| **2** | **Resubmission (Post Send Back)** | `CERProposals` | Status = `In Approval` & `currentLevel` = 1 (after rework) | **Level 1 Approvers** (`pendingWithEmail`) | **CER Owner** (`cerOwner/Email`) | `[CER Action Required] Proposal {cerPrId} Resubmitted for Approval` |
| **3** | **Stage Advancement** | `CERApprovalDecisions` | `decision` = `Approved` & Proposal Status = `In Approval` | **Next Stage Approvers** (`pendingWithEmail`) | **CER Owner** (`cerOwner/Email`) | `[CER Action Required] Proposal {cerPrId} Pending Level {currentLevel} Review` |
| **4** | **Final Executive Sanction** | `CERApprovalDecisions` | `decision` = `Approved` & Proposal Status = `Approved` | **CER Owner** (`cerOwner/Email`) | **Final Approver** (`approver/Email`) | `[CER Final Sanction] Proposal {cerPrId} Approved` |
| **5** | **Send Back (Rework Requested)** | `CERApprovalDecisions` | `decision` = `Send Back` | **CER Owner** (`cerOwner/Email`) | **Deciding Approver** (`approver/Email`) | `[CER Revision Requested] Proposal {cerPrId} Sent Back by Level {levelId}` |
| **6** | **Proposal Rejection** | `CERApprovalDecisions` | `decision` = `Rejected` | **CER Owner** (`cerOwner/Email`) | **Deciding Approver** (`approver/Email`) | `[CER Rejected] Proposal {cerPrId} Rejected at Level {levelId}` |

---

## 2. Power Automate Implementation Guide

Two lightweight cloud flows in [make.powerautomate.com](https://make.powerautomate.com) cover all 6 scenarios:

```
Flow 1: CER - Proposal Submissions & Resubmissions   (Triggers on CERProposals)
Flow 2: CER - Approval Decisions & Workflow Routing  (Triggers on CERApprovalDecisions)
```

---

### Flow 1: CER - Proposal Submissions & Resubmissions

Sends immediate review requests to **Level 1 Approvers** and a confirmation receipt to the **CER Owner** upon submission or resubmission.

```
[When an item is created or modified (CERProposals)]
                        │
                        ▼ (Trigger Condition: status = 'In Approval' and currentLevel = 1)
         [Select: Extract Approver Emails from pendingWithEmail]
                        │
                        ▼
       [Send an email (V2): To L1 Approvers]
                        │
                        ▼
       [Send an email (V2): Confirmation to CER Owner]
```

#### Step 1.1: Trigger
1. Create an **Automated Cloud Flow** named: `CER - 1. Proposal Submissions`.
2. Choose trigger: **SharePoint — When an item is created or modified**.
   * **Site Address:** `https://vedanta.sharepoint.com/sites/CERManagementSystemUAT`
   * **List Name:** `CERProposals`

#### Step 1.2: Trigger Condition (Prevents recursive loops)
In the trigger card, click **... (Settings) $\rightarrow$ Trigger Conditions $\rightarrow$ Add**:
```text
@and(equals(coalesce(triggerOutputs()?['body/status/Value'], triggerOutputs()?['body/status']), 'In Approval'), equals(triggerOutputs()?['body/currentLevel'], 1))
```

#### Step 1.3: Extract Approver Emails (Handling Multi-Person `pendingWithEmail`)
Because `pendingWithEmail` allows multiple approvers (`SPFieldUserMulti`), extract their emails cleanly:
1. Add action: **Data Operation — Select**.
   * Rename to: `Select Approver Emails`
   * **From:** `triggerOutputs()?['body/pendingWithEmail']`
   * **Map (click text mode icon on right):** `item()?['Email']`

#### Step 1.4: Action 1 — Notify Level 1 Approvers
1. Add action: **Office 365 Outlook — Send an email (V2)**.
   * Rename to: `Send Email to L1 Approvers`
   * **To:** `join(body('Select_Approver_Emails'), '; ')`
   * **Subject:** `[CER Action Required] Proposal @{triggerOutputs()?['body/cerPrId']} Pending Your Review`
   * **Body (HTML):** Paste **Template 1** below.

#### Step 1.5: Action 2 — Confirmation to CER Owner
1. Add action: **Office 365 Outlook — Send an email (V2)**.
   * Rename to: `Send Confirmation to CER Owner`
   * **To:** `triggerOutputs()?['body/cerOwner']?['Email']`
   * **Subject:** `[CER Submission] Proposal @{triggerOutputs()?['body/cerPrId']} Submitted for Approval`
   * **Body (HTML):** Paste **Template 2** below.

---

### Flow 2: CER - Approval Decisions, Advancements & Final Sanction

Triggers whenever an approver clicks **Approve**, **Send Back**, or **Reject** in the CER portal.

```
[When an item is created (CERApprovalDecisions)]
                        │
                        ▼
[Get item: Fetch current proposal from CERProposals using Title]
                        │
                        ▼
[Switch on triggerOutputs()?['body/decision/Value']]
      │                         │                      │
      ├─ Case 'Approved'        ├─ Case 'Send Back'    └─ Case 'Rejected'
      │    │                    │    │                      │    │
      │    ▼                    │    ▼                      │    ▼
      │  [Condition:            │  [Send email to Owner:    │  [Send email to Owner:
      │   Proposal Status =     │   Rework Requested        │   Proposal Rejected
      │   'Approved'?]          │   Template 5]             │   Template 6]
      │    │         │          │                           │
      │   YES        NO         │                           │
      │    ▼         ▼          │                           │
      │ [Final     [Next Stage  │                           │
      │  Sanction   Approver    │                           │
      │  Template   Template 3 &│                           │
      │  4]         Owner Update]                           │
```

#### Step 2.1: Trigger
1. Create an **Automated Cloud Flow** named: `CER - 2. Approval Decisions & Workflow`.
2. Choose trigger: **SharePoint — When an item is created**.
   * **Site Address:** `https://vedanta.sharepoint.com/sites/CERManagementSystemUAT`
   * **List Name:** `CERApprovalDecisions`

#### Step 2.2: Action 1 — Get Matching Proposal Details
1. Add action: **SharePoint — Get items**.
   * **Site Address:** `https://vedanta.sharepoint.com/sites/CERManagementSystemUAT`
   * **List Name:** `CERProposals`
   * **Filter Query:**
     ```text
     cerPrId eq '@{triggerOutputs()?['body/cerPrId']}' or Title eq '@{triggerOutputs()?['body/cerPrId']}'
     ```
   * **Top Count:** `1`
2. Add action: **Data Operation — Compose**.
   * Rename to: `Active Proposal`
   * **Inputs:** `first(outputs('Get_items')?['body/value'])`

#### Step 2.3: Action 2 — Switch on Decision
Add a **Switch** control.
* **On:** `coalesce(triggerOutputs()?['body/decision/Value'], triggerOutputs()?['body/decision'])`

---

#### Case A: `Approved`
Inside Case `Approved`, add a **Condition**:
* **Condition:** `coalesce(outputs('Active_Proposal')?['status/Value'], outputs('Active_Proposal')?['status'])` **is equal to** `Approved`

##### IF YES $\rightarrow$ Final Executive Sanction Granted (All Levels Approved)
* Add action: **Office 365 Outlook — Send an email (V2)**.
* **To:** `outputs('Active_Proposal')?['cerOwner']?['Email']`
* **CC:** `triggerOutputs()?['body/approver']?['Email']`
* **Subject:** `[CER Final Sanction] Proposal @{outputs('Active_Proposal')?['cerPrId']} Approved`
* **Body:** Use **Template 4 (Final Sanction)** below.

##### IF NO $\rightarrow$ Stage Advanced to Next Level (Intermediate Approval)
1. **Extract Next Approver Emails (Multi-Person):**
   * Add action: **Data Operation — Select**.
     * Rename to: `Select Next Approvers`
     * **From:** `outputs('Active_Proposal')?['pendingWithEmail']`
     * **Map (click text mode icon):** `item()?['Email']`
2. **Send Email to Next Approvers:**
   * Add action: **Office 365 Outlook — Send an email (V2)**.
   * **To:** `join(body('Select_Next_Approvers'), '; ')`
   * **Subject:** `[CER Action Required] Proposal @{outputs('Active_Proposal')?['cerPrId']} Pending Review (Level @{outputs('Active_Proposal')?['currentLevel']})`
   * **Body:** Use **Template 3 (Next Approver Action Required)** below.
3. **Send Progress Update to Proposal Owner:**
   * Add action: **Office 365 Outlook — Send an email (V2)**.
   * **To:** `outputs('Active_Proposal')?['cerOwner']?['Email']`
   * **Subject:** `[CER Update] Proposal @{outputs('Active_Proposal')?['cerPrId']} Approved at Level @{triggerOutputs()?['body/levelId']}`
   * **Body:** Use **Template 2 (Progress Update)** below.

---

#### Case B: `Send Back`
When an approver requests rework or clarification:
1. Add action: **Office 365 Outlook — Send an email (V2)**.
2. **To:** `outputs('Active_Proposal')?['cerOwner']?['Email']`
3. **CC:** `triggerOutputs()?['body/approver']?['Email']`
4. **Subject:** `[CER Revision Requested] Proposal @{outputs('Active_Proposal')?['cerPrId']} Sent Back by Level @{triggerOutputs()?['body/levelId']}`
5. **Body:** Use **Template 5 (Send Back / Rework)** below.

---

#### Case C: `Rejected`
When an approver formally rejects a proposal:
1. Add action: **Office 365 Outlook — Send an email (V2)**.
2. **To:** `outputs('Active_Proposal')?['cerOwner']?['Email']`
3. **CC:** `triggerOutputs()?['body/approver']?['Email']`
4. **Subject:** `[CER Rejected] Proposal @{outputs('Active_Proposal')?['cerPrId']} Rejected at Level @{triggerOutputs()?['body/levelId']}`
5. **Body:** Use **Template 6 (Rejection)** below.

---

## 3. Branded Responsive Email HTML Templates

All email templates use Vedanta brand colors:
* **Primary Header:** Navy Blue `#012964`
* **Status Badges:** Blue `#2563EB` (Action Required), Green `#16A34A` (Approved), Amber `#D97706` (Revision), Rose `#E11D48` (Rejected)
* **Direct Deep-Link:** Buttons navigate directly to `#display/{cerPrId}` or `#change/{cerPrId}`.

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
      <p>A Capital Expenditure Proposal has been submitted and is pending your review and decision at <strong>Level 1 (@{triggerOutputs()?['body/pendingWithRole']})</strong>.</p>
      
      <table class="grid">
        <tr><td class="label">CER Proposal ID:</td><td class="val">@{triggerOutputs()?['body/cerPrId']}</td></tr>
        <tr><td class="label">Proposal Reference No:</td><td class="val">@{triggerOutputs()?['body/proposalNo']}</td></tr>
        <tr><td class="label">Project Name:</td><td class="val">@{triggerOutputs()?['body/prName']}</td></tr>
        <tr><td class="label">CER Owner:</td><td class="val">@{triggerOutputs()?['body/cerOwner']?['DisplayName']}</td></tr>
        <tr><td class="label">SBU / Block:</td><td class="val">@{coalesce(triggerOutputs()?['body/sbu/Value'], triggerOutputs()?['body/sbu'])}</td></tr>
        <tr><td class="label">Category:</td><td class="val">@{coalesce(triggerOutputs()?['body/category/Value'], triggerOutputs()?['body/category'])}</td></tr>
        <tr><td class="label">Total Amount:</td><td class="val">@{coalesce(triggerOutputs()?['body/currency/Value'], triggerOutputs()?['body/currency'], 'USD')} @{formatNumber(triggerOutputs()?['body/amount'], '#,##0')}</td></tr>
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

### Template 2: Confirmation / Progress Update — CER Owner

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
      <div class="badge">Workflow Update</div>
      <h1>Capital Expenditure Request System</h1>
      <p>Vedanta Limited / Cairn Oil & Gas</p>
    </div>
    <div class="content">
      <p>Dear @{triggerOutputs()?['body/cerOwner']?['DisplayName']},</p>
      <p>Your proposal <strong>@{triggerOutputs()?['body/cerPrId']} (@{triggerOutputs()?['body/prName']})</strong> has been successfully submitted and is currently routed to <strong>Level @{triggerOutputs()?['body/currentLevel']} (@{triggerOutputs()?['body/pendingWithRole']})</strong>.</p>
      
      <table class="grid">
        <tr><td class="label">CER Proposal ID:</td><td class="val">@{triggerOutputs()?['body/cerPrId']}</td></tr>
        <tr><td class="label">Project Name:</td><td class="val">@{triggerOutputs()?['body/prName']}</td></tr>
        <tr><td class="label">Current Status:</td><td class="val">In Approval</td></tr>
        <tr><td class="label">Pending Level:</td><td class="val">Level @{triggerOutputs()?['body/currentLevel']} — @{triggerOutputs()?['body/pendingWithRole']}</td></tr>
      </table>

      <div class="btn-wrap">
        <a href="https://vedanta.sharepoint.com/sites/CERManagementSystemUAT/SitePages/CER.aspx#display/@{encodeUriComponent(triggerOutputs()?['body/cerPrId'])}" class="btn">
          Track Proposal in Portal
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

### Template 3: Next Approver Action Required (Stage Advancement)

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
      <p>Proposal <strong>@{outputs('Active_Proposal')?['cerPrId']}</strong> was approved at Level @{triggerOutputs()?['body/levelId']} by @{triggerOutputs()?['body/approver']?['DisplayName']} and has advanced to your queue for review: <strong>@{outputs('Active_Proposal')?['pendingWithRole']}</strong>.</p>
      
      <div class="quote-box">
        <strong>Previous Approver Remarks:</strong><br>
        "@{triggerOutputs()?['body/remarks']}"
      </div>

      <table class="grid">
        <tr><td class="label">CER Proposal ID:</td><td class="val">@{outputs('Active_Proposal')?['cerPrId']}</td></tr>
        <tr><td class="label">Project Name:</td><td class="val">@{outputs('Active_Proposal')?['prName']}</td></tr>
        <tr><td class="label">CER Owner:</td><td class="val">@{outputs('Active_Proposal')?['cerOwner']?['DisplayName']}</td></tr>
        <tr><td class="label">Total Amount:</td><td class="val">@{coalesce(outputs('Active_Proposal')?['currency/Value'], outputs('Active_Proposal')?['currency'], 'USD')} @{formatNumber(outputs('Active_Proposal')?['amount'], '#,##0')}</td></tr>
        <tr><td class="label">Current Stage:</td><td class="val">Level @{outputs('Active_Proposal')?['currentLevel']} — @{outputs('Active_Proposal')?['pendingWithRole']}</td></tr>
      </table>

      <div class="btn-wrap">
        <a href="https://vedanta.sharepoint.com/sites/CERManagementSystemUAT/SitePages/CER.aspx#display/@{encodeUriComponent(outputs('Active_Proposal')?['cerPrId'])}" class="btn">
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

### Template 4: Final Executive Sanction Granted

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
        ✓ Capital Expenditure Proposal @{outputs('Active_Proposal')?['cerPrId']} has received Final Executive Sanction.
      </div>
      <p>Proposal <strong>@{outputs('Active_Proposal')?['cerPrId']} (@{outputs('Active_Proposal')?['prName']})</strong> has successfully completed all required approval stages and is sanctioned for project execution.</p>
      
      <div class="quote-box">
        <strong>Final Approver Remarks (@{triggerOutputs()?['body/approver']?['DisplayName']}):</strong><br>
        "@{triggerOutputs()?['body/remarks']}"
      </div>

      <div class="btn-wrap">
        <a href="https://vedanta.sharepoint.com/sites/CERManagementSystemUAT/SitePages/CER.aspx#display/@{encodeUriComponent(outputs('Active_Proposal')?['cerPrId'])}" class="btn">
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

### Template 5: Send Back / Revision Requested

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
      <p>Dear @{outputs('Active_Proposal')?['cerOwner']?['DisplayName']},</p>
      <p>Your proposal <strong>@{outputs('Active_Proposal')?['cerPrId']} (@{outputs('Active_Proposal')?['prName']})</strong> has been <strong>Sent Back</strong> for revision by <strong>@{triggerOutputs()?['body/approver']?['DisplayName']}</strong> at Level @{triggerOutputs()?['body/levelId']}.</p>
      
      <div class="alert-box">
        <strong>Required Clarifications / Changes:</strong><br>
        "@{triggerOutputs()?['body/remarks']}"
      </div>

      <p>Please log in, review the requested modifications, update the proposal, and click <strong>Submit Proposal</strong> to restart the approval cycle.</p>

      <div class="btn-wrap">
        <a href="https://vedanta.sharepoint.com/sites/CERManagementSystemUAT/SitePages/CER.aspx#change/@{encodeUriComponent(outputs('Active_Proposal')?['cerPrId'])}" class="btn">
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

### Template 6: Proposal Rejection

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
      <p>Dear @{outputs('Active_Proposal')?['cerOwner']?['DisplayName']},</p>
      <p>Your proposal <strong>@{outputs('Active_Proposal')?['cerPrId']} (@{outputs('Active_Proposal')?['prName']})</strong> has been rejected by <strong>@{triggerOutputs()?['body/approver']?['DisplayName']}</strong> at Level @{triggerOutputs()?['body/levelId']}.</p>
      
      <div class="reject-box">
        <strong>Reason for Rejection:</strong><br>
        "@{triggerOutputs()?['body/remarks']}"
      </div>

      <div class="btn-wrap">
        <a href="https://vedanta.sharepoint.com/sites/CERManagementSystemUAT/SitePages/CER.aspx#display/@{encodeUriComponent(outputs('Active_Proposal')?['cerPrId'])}" class="btn">
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
