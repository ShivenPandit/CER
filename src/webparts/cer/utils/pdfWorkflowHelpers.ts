import { ICERProposal } from "../models/CERModel";
import { IApprovalDecision, IWorkflowLevel } from "../models/WorkflowModel";
import { FIXED_6_LEVEL_APPROVAL_STAGES } from "../constants";

/**
 * Formats approver name(s) and email(s) live from a workflow level (or CER Owner for Level 2).
 */
export function resolveLiveApproverInfoForPdf(
  stageLevelId: number,
  proposal: ICERProposal,
  workflowLevels: IWorkflowLevel[],
  includePendingFallbacks: boolean
): string {
  const matchedLevel = (workflowLevels || []).find(
    (l) => l.level_id === stageLevelId && l.is_active !== false
  );
  const isOwnerStage = stageLevelId === 2 || matchedLevel?.is_project_owner_stage === true;

  if (isOwnerStage) {
    const ownerName = (proposal.owname || "").trim();
    const ownerEmail = (proposal.owner_email || "").trim();
    if (ownerName && ownerEmail && ownerName.toLowerCase() !== ownerEmail.toLowerCase()) {
      return `${ownerName} (${ownerEmail})`;
    }
    return ownerName || ownerEmail || "CER Owner";
  }

  if (matchedLevel) {
    if (matchedLevel.approvers && matchedLevel.approvers.length > 0) {
      const formatted = matchedLevel.approvers
        .map((u: any) => {
          if (typeof u === "string") return u.trim();
          const name = (u.user_name || u.name || u.displayName || u.Title || "").trim();
          const email = (u.user_email || u.email || "").trim();
          if (name && email && name.toLowerCase() !== email.toLowerCase()) {
            return `${name} (${email})`;
          }
          return name || email;
        })
        .filter(Boolean)
        .join(", ");
      if (formatted) return formatted;
    }

    const lvlName = (matchedLevel.approver_name || "").trim();
    const lvlEmail = (matchedLevel.approver_email || "").trim();
    if (lvlName && lvlEmail && lvlName.toLowerCase() !== lvlEmail.toLowerCase()) {
      return `${lvlName} (${lvlEmail})`;
    }
    if (lvlName || lvlEmail) return lvlName || lvlEmail;
  }

  if (includePendingFallbacks) {
    const pName = (proposal.pending_with_name || "").trim();
    const pEmail = (proposal.pending_with_email || "").trim();
    if (pName && pEmail && pName.toLowerCase() !== pEmail.toLowerCase()) {
      return `${pName} (${pEmail})`;
    }
    if (pName || pEmail) return pName || pEmail;
    if (proposal.pending_with_role) return proposal.pending_with_role;
    return "Assigned Approver";
  }

  return "—";
}

/**
 * Builds Pending and Not Started rows for the Active Workflow Cycle in PDF Section H2.
 */
export function buildActiveCycleUpcomingRowsForPdf(
  proposal: ICERProposal,
  sortedDecisions: IApprovalDecision[],
  workflowLevels: IWorkflowLevel[],
  currentVTag: string,
  isArchived: boolean
): string[][] {
  const normStatus = (proposal.status || "").trim().toUpperCase();
  const isInApproval =
    normStatus === "IN APPROVAL" ||
    normStatus === "IN_APPROVAL" ||
    normStatus === "IN-APPROVAL" ||
    normStatus === "INAPPROVAL";

  if (!isInApproval || isArchived) {
    return [];
  }

  const currentVerDecisions = (sortedDecisions || []).filter(
    (d) => (d.version || currentVTag) === currentVTag
  );

  // Isolate decisions from the latest active cycle run (after the most recent SEND_BACK / REJECTED, if any)
  let lastResetIdx = -1;
  for (let i = currentVerDecisions.length - 1; i >= 0; i--) {
    const decUpper = (currentVerDecisions[i].decision || "").trim().toUpperCase();
    if (decUpper.indexOf("SEND") !== -1 || decUpper.indexOf("BACK") !== -1 || decUpper === "REJECTED") {
      lastResetIdx = i;
      break;
    }
  }
  const activeRunDecisions =
    lastResetIdx >= 0 ? currentVerDecisions.slice(lastResetIdx + 1) : currentVerDecisions;

  let nextPendingLevelId: number;
  const rawPropLevel = Number(proposal.current_level);
  if (!isNaN(rawPropLevel) && rawPropLevel > 0) {
    nextPendingLevelId = rawPropLevel;
  } else if (activeRunDecisions.length === 0) {
    nextPendingLevelId = 1;
  } else {
    const latestDec = activeRunDecisions[activeRunDecisions.length - 1];
    const latestType = (latestDec.decision || "").trim().toUpperCase();
    if (latestType === "APPROVED") {
      nextPendingLevelId = (latestDec.level_id || 1) + 1;
    } else {
      nextPendingLevelId = 1;
    }
  }

  const rows: string[][] = [];

  for (const fixedStage of FIXED_6_LEVEL_APPROVAL_STAGES) {
    const lid = fixedStage.level;
    if (lid < nextPendingLevelId) continue;

    const alreadyApprovedInRun = activeRunDecisions.some(
      (d) => d.level_id === lid && (d.decision || "").trim().toUpperCase() === "APPROVED"
    );
    if (alreadyApprovedInRun) continue;

    const matchedLevel = (workflowLevels || []).find(
      (l) => l.level_id === lid && l.is_active !== false
    );
    const stageName = matchedLevel?.level_name || fixedStage.name;

    if (lid === nextPendingLevelId) {
      const approverInfo = resolveLiveApproverInfoForPdf(lid, proposal, workflowLevels, true);
      rows.push([
        currentVTag,
        stageName,
        approverInfo,
        "PENDING",
        "—",
        "Awaiting approval sign-off",
      ]);
    } else {
      const approverInfo = resolveLiveApproverInfoForPdf(lid, proposal, workflowLevels, false);
      rows.push([
        currentVTag,
        stageName,
        approverInfo,
        "NOT STARTED",
        "—",
        "—",
      ]);
    }
  }

  return rows;
}
