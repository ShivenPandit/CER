# SharePoint Online Configuration Guide

This document outlines the required SharePoint Online lists, libraries, permissions, and configuration for the **Capital Expenditure Request (CER) Management System**.

For the exhaustive list and column specification (internal names, data types, choices, and indexing requirements), see:
[docs/SHAREPOINT_LISTS_AND_COLUMNS_SETUP.md](file:///D:/Git/CER/docs/SHAREPOINT_LISTS_AND_COLUMNS_SETUP.md)

---

## 1. Required SharePoint Lists & Document Libraries

| List / Library Title | Internal Name | Template Type | Purpose |
|---|---|---|---|
| **CER Proposals** | CER_Proposals | Custom List | Primary storage for all CER proposals, financial phasing, metadata, and workflow statuses. |
| **CER Audit Trail** | CER_AuditTrail | Custom List | Immutable field-level change history capturing before/after values and timestamps. |
| **CER Remarks History** | CER_RemarksHistory | Custom List | Immutable version history for 350–400 word business justifications and remarks. |
| **CER Workflow Levels** | CER_WorkflowLevels | Custom List | SBU-specific sequential approval hierarchies and reviewer configuration. |
| **CER Approval Decisions** | CER_ApprovalDecisions | Custom List | Sequential reviewer decision log, comments, and action timestamps. |
| **CER Attachments** | CER_Attachments | Document Library | Secure document repository for vendor quotes, drawings, and supporting files (up to 25MB each). |
| **CER Notifications** | CER_Notifications | Custom List | Audit log for automated multi-party workflow email dispatches. |
| **CER User Roles** | CER_UserRoles | Custom List | Master Role-Based Access Control registry for Admin, Initiator, Approver, and Finance_Audit. |
| **CER Admin Audit Log** | CER_AdminAuditLog | Custom List | Governance tracking for administrative role grants, revocations, and hierarchy edits. |

---

## 2. Schema Resilience & Column Tolerances

The application includes schema-resilient query fallbacks in \SharePointCERDataService\:

1. **\CER_WorkflowLevels\**:
   - Primary query requests: \Id,ID,Title,level_id,level_name,role_title,sbu,is_active,created_by,created_date,Created,assignment_type\
   - Fallback ladder: Automatically steps down to baseline fields (\Id,ID,Title,level_id,level_name,role_title,sbu,created_by,created_date,Created\) if \is_active\ or \ssignment_type\ are not provisioned in SharePoint.
   - When \is_active\ is absent from SharePoint, configured levels are inherently treated as active (\	rue\).
2. **\CER_UserRoles\**:
   - Automatically tolerates lists where \is_active\ or \sbu\ columns are not present, falling back to standard fields and treating active assignments as granted.

---

## 3. Security Groups & Role Mappings

| Role | Recommended SharePoint Group | Default Permission Level | Responsibilities |
|---|---|---|---|
| **Initiator** | \CER Initiators\ | Contribute | Create and edit own proposals, upload attachments. |
| **Approver** | \CER Approvers\ | Contribute | Review assigned proposals, record approval/rejection decisions. |
| **Finance / Audit** | \CER Auditors\ | Read | Read-only inspection of proposals, reports, and export downloads. |
| **Administrator** | \CER Site Owners\ | Full Control | Manage workflow hierarchies, assign roles, access Admin Console. |

---

## 4. Local Development vs. Production Connection

- **Local Mock Mode**: When developing locally using \
pm run serve\, SPFx runs without SharePoint context. The \DataServiceFactory\ automatically selects \LocalMockCERDataService\.
- **Live SharePoint Online**: When hosted on SharePoint Online (\https://<tenant>.sharepoint.com/sites/...\), the \CERWebPart\ supplies \SPHttpClient\ and site URL, activating \SharePointCERDataService\ in fail-closed mode.
