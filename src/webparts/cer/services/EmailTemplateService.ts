/**
 * EmailTemplateService
 * Generates pre-rendered, responsive, branded HTML email bodies and subjects
 * for the CER Management System outbox notifications.
 */

import { ICERProposal } from "../models/CERModel";

const PORTAL_BASE_URL = "https://vedanta.sharepoint.com/sites/CERManagementSystemUAT";
const APP_PAGE_URL = `${PORTAL_BASE_URL}/SitePages/CER.aspx`;

function escapeHtml(text?: string | null): string {
  if (!text) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatAmount(amount?: number | null, currency?: string | null): string {
  const curr = currency || "USD";
  const num = amount !== undefined && amount !== null ? Number(amount) : 0;
  return `${curr} ${num.toLocaleString("en-US", { maximumFractionDigits: 2 })}`;
}

function renderPortalBanner(): string {
  return `
    <div style="text-align:center; padding:18px 20px; background:#F8FAFC; border-top:1px solid #E2E8F0;">
      <p style="font-size:13px; color:#475569; margin:0 0 10px; font-weight:500;">Access the CER Management Portal</p>
      <a href="${PORTAL_BASE_URL}" target="_blank" style="display:inline-block; padding:8px 22px; background:#FFFFFF; color:#0078D4 !important; font-family:'Segoe UI', Arial, sans-serif; font-size:13px; font-weight:600; text-decoration:none !important; border-radius:5px; border:1px solid #CBD5E1;">
        <span style="color:#0078D4 !important; text-decoration:none !important; font-weight:600;">Open CER Management Portal &rarr;</span>
      </a>
    </div>`;
}

function renderFooter(): string {
  return `
    <div style="background:#F8FAFC; padding:16px 30px; border-top:1px solid #E2E8F0; font-size:12px; color:#64748B; text-align:center; line-height:1.5;">
      Automated workflow notification from Vedanta Enterprise CER Management Portal.
    </div>`;
}

/**
 * Bulletproof email action button compatible with Outlook Desktop, Outlook Web, Office 365 & Mobile.
 * Uses inline styles + table wrapper + inner span to guarantee pure white text without link color override.
 */
function renderActionButton(url: string, label: string, bgColor: string = "#0078D4"): string {
  return `
    <table border="0" cellpadding="0" cellspacing="0" role="presentation" style="margin:26px auto 12px auto; border-collapse:separate;">
      <tr>
        <td align="center" style="border-radius:6px; background-color:${bgColor}; padding:0;">
          <a href="${url}" target="_blank" style="display:inline-block; padding:13px 34px; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; font-size:14px; font-weight:700; color:#FFFFFF !important; text-decoration:none !important; border-radius:6px; background-color:${bgColor}; border:1px solid ${bgColor}; mso-padding-alt:0; text-align:center;">
            <span style="color:#FFFFFF !important; font-weight:700; font-family:'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, Helvetica, Arial, sans-serif; text-decoration:none !important;">${escapeHtml(label)} &rarr;</span>
          </a>
        </td>
      </tr>
    </table>`;
}

export class EmailTemplateService {
  /**
   * Template 1: Action Required — Level 1 Approver on Submission / Resubmission
   */
  public static renderSubmissionApproverEmail(proposal: ICERProposal, roleTitle: string): { subject: string; body: string } {
    const cerPrId = proposal.cer_proposal_id || proposal.cerprno || "";
    const subject = `[CER Action Required] Proposal ${cerPrId} Pending Level 1 (${roleTitle}) Review`;
    const displayUrl = `${APP_PAGE_URL}#display/${encodeURIComponent(cerPrId)}`;

    const body = `<!DOCTYPE html>
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
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">Action Required</div>
      <h1>Capital Expenditure Request System</h1>
      <p>Vedanta Limited / Cairn Oil &amp; Gas</p>
    </div>
    <div class="content">
      <p>Dear Approver,</p>
      <p>A Capital Expenditure Proposal has been submitted and is pending your review and decision at <strong>Level 1 (${escapeHtml(roleTitle)})</strong>.</p>
      
      <table class="grid">
        <tr><td class="label">CER Proposal ID:</td><td class="val">${escapeHtml(cerPrId)}</td></tr>
        <tr><td class="label">Proposal Reference No:</td><td class="val">${escapeHtml(proposal.proposal_no || proposal.cerprno)}</td></tr>
        <tr><td class="label">Project Name:</td><td class="val">${escapeHtml(proposal.pr_name || "")}</td></tr>
        <tr><td class="label">CER Owner:</td><td class="val">${escapeHtml(proposal.owname || proposal.owner_email)}</td></tr>
        <tr><td class="label">SBU / Block:</td><td class="val">${escapeHtml(proposal.sbu)}</td></tr>
        <tr><td class="label">Category:</td><td class="val">${escapeHtml(proposal.cat)}</td></tr>
        <tr><td class="label">Total Amount:</td><td class="val">${escapeHtml(formatAmount(proposal.amount, proposal.currency))}</td></tr>
      </table>

      ${renderActionButton(displayUrl, "Review & Approve in CER Portal", "#0078D4")}
    </div>
    ${renderPortalBanner()}
    ${renderFooter()}
  </div>
</body>
</html>`;

    return { subject, body };
  }

  /**
   * Template 2: Submission Confirmation — Proposal Owner
   */
  public static renderSubmissionOwnerEmail(proposal: ICERProposal, roleTitle: string): { subject: string; body: string } {
    const cerPrId = proposal.cer_proposal_id || proposal.cerprno || "";
    const subject = `[CER Submission] Proposal ${cerPrId} Submitted for Approval`;
    const displayUrl = `${APP_PAGE_URL}#display/${encodeURIComponent(cerPrId)}`;

    const body = `<!DOCTYPE html>
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
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">Workflow Update</div>
      <h1>Capital Expenditure Request System</h1>
      <p>Vedanta Limited / Cairn Oil &amp; Gas</p>
    </div>
    <div class="content">
      <p>Dear ${escapeHtml(proposal.owname || "CER Owner")},</p>
      <p>Your proposal <strong>${escapeHtml(cerPrId)} (${escapeHtml(proposal.pr_name || "")})</strong> has been successfully submitted and is currently routed to <strong>Level 1 (${escapeHtml(roleTitle)})</strong>.</p>
      
      <table class="grid">
        <tr><td class="label">CER Proposal ID:</td><td class="val">${escapeHtml(cerPrId)}</td></tr>
        <tr><td class="label">Project Name:</td><td class="val">${escapeHtml(proposal.pr_name || "")}</td></tr>
        <tr><td class="label">Current Status:</td><td class="val">In Approval</td></tr>
        <tr><td class="label">Pending Level:</td><td class="val">Level 1 — ${escapeHtml(roleTitle)}</td></tr>
      </table>

      ${renderActionButton(displayUrl, "Track Proposal in CER Portal", "#0078D4")}
    </div>
    ${renderPortalBanner()}
    ${renderFooter()}
  </div>
</body>
</html>`;

    return { subject, body };
  }

  /**
   * Template 3: Next Approver Action Required — Stage Advancement
   */
  public static renderStageAdvancementApproverEmail(
    proposal: ICERProposal,
    previousApprover: string,
    previousRemarks: string,
    nextLevel: number,
    nextRoleTitle: string
  ): { subject: string; body: string } {
    const cerPrId = proposal.cer_proposal_id || proposal.cerprno || "";
    const subject = `[CER Action Required] Proposal ${cerPrId} Pending Level ${nextLevel} (${nextRoleTitle}) Review`;
    const displayUrl = `${APP_PAGE_URL}#display/${encodeURIComponent(cerPrId)}`;

    const body = `<!DOCTYPE html>
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
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">Action Required</div>
      <h1>Capital Expenditure Request System</h1>
      <p>Vedanta Limited / Cairn Oil &amp; Gas</p>
    </div>
    <div class="content">
      <p>Dear Approver,</p>
      <p>Proposal <strong>${escapeHtml(cerPrId)}</strong> was approved by <strong>${escapeHtml(previousApprover)}</strong> and has advanced to your queue for review: <strong>Level ${nextLevel} (${escapeHtml(nextRoleTitle)})</strong>.</p>
      
      ${
        previousRemarks
          ? `<div class="quote-box">
              <strong>Previous Approver Remarks:</strong><br>
              "${escapeHtml(previousRemarks)}"
            </div>`
          : ""
      }

      <table class="grid">
        <tr><td class="label">CER Proposal ID:</td><td class="val">${escapeHtml(cerPrId)}</td></tr>
        <tr><td class="label">Project Name:</td><td class="val">${escapeHtml(proposal.pr_name || "")}</td></tr>
        <tr><td class="label">CER Owner:</td><td class="val">${escapeHtml(proposal.owname || proposal.owner_email)}</td></tr>
        <tr><td class="label">Total Amount:</td><td class="val">${escapeHtml(formatAmount(proposal.amount, proposal.currency))}</td></tr>
        <tr><td class="label">Current Stage:</td><td class="val">Level ${nextLevel} — ${escapeHtml(nextRoleTitle)}</td></tr>
      </table>

      ${renderActionButton(displayUrl, "Review & Take Action in CER Portal", "#0078D4")}
    </div>
    ${renderPortalBanner()}
    ${renderFooter()}
  </div>
</body>
</html>`;

    return { subject, body };
  }

  /**
   * Template 3b: Progress Update — CER Owner on Stage Advancement
   */
  public static renderStageAdvancementOwnerEmail(
    proposal: ICERProposal,
    approverName: string,
    approvedLevel: number,
    nextLevel: number,
    nextRoleTitle: string
  ): { subject: string; body: string } {
    const cerPrId = proposal.cer_proposal_id || proposal.cerprno || "";
    const subject = `[CER Update] Proposal ${cerPrId} Approved at Level ${approvedLevel}`;
    const displayUrl = `${APP_PAGE_URL}#display/${encodeURIComponent(cerPrId)}`;

    const body = `<!DOCTYPE html>
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
    .grid { width: 100%; border-collapse: collapse; margin: 18px 0; font-size: 13px; }
    .grid td { padding: 8px 12px; border-bottom: 1px solid #F1F5F9; }
    .grid td.label { font-weight: 600; color: #64748B; width: 38%; }
    .grid td.val { font-weight: 700; color: #0F172A; }
    .btn-wrap { text-align: center; margin: 26px 0 10px; }
    .btn { background: #012964; color: #FFFFFF !important; text-decoration: none; padding: 12px 32px; border-radius: 8px; font-weight: 600; font-size: 14px; display: inline-block; }
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">Stage Approved</div>
      <h1>Capital Expenditure Request System</h1>
      <p>Vedanta Limited / Cairn Oil &amp; Gas</p>
    </div>
    <div class="content">
      <p>Dear ${escapeHtml(proposal.owname || "CER Owner")},</p>
      <p>Your proposal <strong>${escapeHtml(cerPrId)} (${escapeHtml(proposal.pr_name || "")})</strong> was approved at Level ${approvedLevel} by <strong>${escapeHtml(approverName)}</strong> and has advanced to the next approval stage.</p>
      
      <table class="grid">
        <tr><td class="label">CER Proposal ID:</td><td class="val">${escapeHtml(cerPrId)}</td></tr>
        <tr><td class="label">Project Name:</td><td class="val">${escapeHtml(proposal.pr_name || "")}</td></tr>
        <tr><td class="label">Approved By:</td><td class="val">${escapeHtml(approverName)} (Level ${approvedLevel})</td></tr>
        <tr><td class="label">Now Pending:</td><td class="val">Level ${nextLevel} — ${escapeHtml(nextRoleTitle)}</td></tr>
      </table>

      ${renderActionButton(displayUrl, "Track Proposal in CER Portal", "#0078D4")}
    </div>
    ${renderPortalBanner()}
    ${renderFooter()}
  </div>
</body>
</html>`;

    return { subject, body };
  }

  /**
   * Template 4: Final Executive Sanction Granted
   */
  public static renderFinalSanctionEmail(
    proposal: ICERProposal,
    finalApproverName: string,
    remarks?: string
  ): { subject: string; body: string } {
    const cerPrId = proposal.cer_proposal_id || proposal.cerprno || "";
    const subject = `[CER Final Sanction] Proposal ${cerPrId} Approved`;
    const displayUrl = `${APP_PAGE_URL}#display/${encodeURIComponent(cerPrId)}`;

    const body = `<!DOCTYPE html>
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
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">Final Sanction Granted</div>
      <h1>Capital Expenditure Request System</h1>
      <p>Vedanta Limited / Cairn Oil &amp; Gas</p>
    </div>
    <div class="content">
      <div class="success-box">
        &#10003; Capital Expenditure Proposal ${escapeHtml(cerPrId)} has received Final Executive Sanction.
      </div>
      <p>Proposal <strong>${escapeHtml(cerPrId)} (${escapeHtml(proposal.pr_name || "")})</strong> has successfully completed all required approval stages and is sanctioned for project execution.</p>
      
      ${
        remarks
          ? `<div class="quote-box">
              <strong>Final Approver Remarks (${escapeHtml(finalApproverName)}):</strong><br>
              "${escapeHtml(remarks)}"
            </div>`
          : ""
      }

      ${renderActionButton(displayUrl, "View Approved CER Certificate", "#107C41")}
    </div>
    ${renderPortalBanner()}
    ${renderFooter()}
  </div>
</body>
</html>`;

    return { subject, body };
  }

  /**
   * Template 5: Send Back / Revision Requested
   */
  public static renderSendBackEmail(
    proposal: ICERProposal,
    approverName: string,
    remarks: string,
    levelId: number
  ): { subject: string; body: string } {
    const cerPrId = proposal.cer_proposal_id || proposal.cerprno || "";
    const subject = `[CER Revision Requested] Proposal ${cerPrId} Sent Back by Level ${levelId}`;
    const changeUrl = `${APP_PAGE_URL}#change/${encodeURIComponent(cerPrId)}`;

    const body = `<!DOCTYPE html>
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
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">Revision Required</div>
      <h1>Capital Expenditure Request System</h1>
      <p>Vedanta Limited / Cairn Oil &amp; Gas</p>
    </div>
    <div class="content">
      <p>Dear ${escapeHtml(proposal.owname || "CER Owner")},</p>
      <p>Your proposal <strong>${escapeHtml(cerPrId)} (${escapeHtml(proposal.pr_name || "")})</strong> has been <strong>Sent Back</strong> for revision by <strong>${escapeHtml(approverName)}</strong> at Level ${levelId}.</p>
      
      <div class="alert-box">
        <strong>Required Clarifications / Changes:</strong><br>
        "${escapeHtml(remarks || "Please review and revise the proposal.")}"
      </div>

      <p>Please log in, review the requested modifications, update the proposal, and submit it again to restart the approval cycle.</p>

      ${renderActionButton(changeUrl, "Edit Proposal Now", "#0078D4")}
    </div>
    ${renderPortalBanner()}
    ${renderFooter()}
  </div>
</body>
</html>`;

    return { subject, body };
  }

  /**
   * Template 6: Proposal Rejection
   */
  public static renderRejectionEmail(
    proposal: ICERProposal,
    approverName: string,
    remarks: string,
    levelId: number
  ): { subject: string; body: string } {
    const cerPrId = proposal.cer_proposal_id || proposal.cerprno || "";
    const subject = `[CER Rejected] Proposal ${cerPrId} Rejected at Level ${levelId}`;
    const displayUrl = `${APP_PAGE_URL}#display/${encodeURIComponent(cerPrId)}`;

    const body = `<!DOCTYPE html>
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
  </style>
</head>
<body>
  <div class="card">
    <div class="header">
      <div class="badge">Proposal Rejected</div>
      <h1>Capital Expenditure Request System</h1>
      <p>Vedanta Limited / Cairn Oil &amp; Gas</p>
    </div>
    <div class="content">
      <p>Dear ${escapeHtml(proposal.owname || "CER Owner")},</p>
      <p>Your proposal <strong>${escapeHtml(cerPrId)} (${escapeHtml(proposal.pr_name || "")})</strong> has been rejected by <strong>${escapeHtml(approverName)}</strong> at Level ${levelId}.</p>
      
      <div class="reject-box">
        <strong>Reason for Rejection:</strong><br>
        "${escapeHtml(remarks || "Proposal was rejected.")}"
      </div>

      ${renderActionButton(displayUrl, "View Decision in CER Portal", "#0078D4")}
    </div>
    ${renderPortalBanner()}
    ${renderFooter()}
  </div>
</body>
</html>`;

    return { subject, body };
  }
}
