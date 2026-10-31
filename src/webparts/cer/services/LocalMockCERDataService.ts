import { ICERDataService } from "./ICERDataService";
import { ICERProposal, IFieldChoices, DEFAULT_FIELD_CHOICES } from "../models/CERModel";
import { ICERAuditRecord, ICERRemarksVersion, AUDIT_FIELD_DESCRIPTIONS, EXCLUDED_AUDIT_FIELDS } from "../models/AuditModel";
import { IWorkflowLevel, IApprovalDecision, INotificationLog, isProjectOwnerStage, ApproverAssignmentType, isValidEmail } from "../models/WorkflowModel";
import { ICERAttachment } from "../models/AttachmentModel";
import { IDirectoryUser, MOCK_DIRECTORY_USERS, IUserRoleAssignment, IAdminAuditRecord } from "../models/UserModel";
import { validateAttachment } from "../utils/attachmentValidation";
import { getCurrentFiscalYearPhasingLabels, getLocalComponents } from "../utils/dateUtils";

const STORAGE_KEYS = {
  PROPOSALS: "CER_APP_PROPOSALS",
  AUDIT: "CER_APP_AUDIT",
  REMARKS_HISTORY: "CER_APP_REMARKS_HISTORY",
  WORKFLOW_LEVELS: "CER_APP_WORKFLOW_LEVELS",
  APPROVAL_DECISIONS: "CER_APP_APPROVAL_DECISIONS",
  ATTACHMENTS: "CER_APP_ATTACHMENTS",
  NOTIFICATIONS: "CER_APP_NOTIFICATIONS",
  USER_ROLES: "CER_APP_USER_ROLES",
  ADMIN_AUDIT: "CER_APP_ADMIN_AUDIT",
};

const DEFAULT_USER_ROLES: IUserRoleAssignment[] = [
  {
    id: "1",
    user_name: "Demo Administrator",
    user_email: "demo.admin@example.com",
    login_name: "demo.admin@example.com",
    role: "Admin",
    department: "IT Administration",
    sbu: "RJ North",
    is_active: true,
    assigned_by: "System Bootstrap",
    assigned_date: "2026-10-23T18:30:00Z",
  },
];

const DEFAULT_WORKFLOW_LEVELS: IWorkflowLevel[] = [];

const DEFAULT_PHASING_LABELS = getCurrentFiscalYearPhasingLabels();

const SEED_PROPOSALS: ICERProposal[] = [
  {
    id: "prop-001",
    cer_proposal_id: "CER-2026-0001",
    proposal_no: "CER-2026-0001",
    cerprno: "CER-2026-0001",
    pr_name: "Mangala Polymer EOR Expansion Phase 4",
    owname: "Demo Initiator",
    owner_email: "demo.initiator@example.com",
    sbu: "RJ North",
    status: "In Approval",
    object: "Enhanced Oil Recovery Production Augmentation",
    amount: 14500000,
    currency: "USD",
    cat: "Vital",
    payable: "Payback",
    period: "24 Months",
    payback_quarters: 9,
    ben_npv: 28.4,
    ben_irr: 32.5,
    cost_assumptions: "Brent base price assumed at $75/bbl. Incremental polymer injection efficiency validated by third-party reservoir simulation study.",
    st_date: "2026-04-01",
    com_date: "2028-03-31",
    duration_months: 24,
    cbudget: "Yes",
    cb_amnt: 15000000,
    cb_currency: "USD",
    reason: "",
    jv: "Yes",
    jv_recoverable: "Yes",
    jv_cost: 4350000,
    jv_budget: "Yes",
    jv_amnt: 4500000,
    jv_reason: "ONGC 30% JV partner cash call approved in Oct 2025 Operating Committee Meeting (OCM).",
    ph_till_label: DEFAULT_PHASING_LABELS.ph_till_label,
    ph_fy_label: DEFAULT_PHASING_LABELS.ph_fy_label,
    ph_beyond_label: DEFAULT_PHASING_LABELS.ph_beyond_label,
    prod_till: 0,
    prod_fy: 1200000,
    prod_beyond: 3500000,
    capex_till: 4500000,
    capex_fy: 8000000,
    capex_beyond: 2000000,
    opex_till: 200000,
    opex_fy: 650000,
    opex_beyond: 900000,
    engineer: 2200000,
    s_fac: 6100000,
    comis: 1800000,
    preop: 1400000,
    others: 3000000,
    total: 14500000,
    remarks: "This proposal covers the installation of high-shear polymer dissolution skids, booster pumps, and 12-km distribution trunkline at Mangala Field. Polymer viscosity retention is mission-critical to mitigate natural field decline and sustain 65k bopd plateau. Project IRR of 32.5% provides rapid 2.2 year payback. All vendors shortlisted through global competitive bidding.",
    remarks_jv: "Partner ONGC has formally consented to participation during OCM-48. No partner default or carry risk anticipated.",
    current_level: 2,
    pending_with_role: "Head of Corporate Finance",
    pending_with_email: "sunil.verma@vedanta.co.in",
    request_date: "2026-03-10",
    created_date: "2026-03-10T10:15:00Z",
    created_by: "Demo Initiator",
    modified_date: "2026-03-12T14:30:00Z",
    modified_by: "Rajesh Sharma",
    revision_count: 1
  },
  {
    id: "prop-002",
    cer_proposal_id: "CER-2026-0002",
    proposal_no: "CER-2026-0002",
    cerprno: "CER-2026-0002",
    pr_name: "Raageshwari Deep Gas Terminal Compression Upgrade",
    owname: "Arun Kulkarni",
    owner_email: "arun.kulkarni@vedanta.co.in",
    sbu: "RJ South",
    status: "Approved",
    object: "Gas Processing Facility debottlenecking",
    amount: 8750000,
    currency: "USD",
    cat: "Essential",
    payable: "Payback",
    period: "18 Months",
    payback_quarters: 6,
    ben_npv: 14.2,
    ben_irr: 24.8,
    cost_assumptions: "Gas sales realization assumed at domestic grid price. Compressor availability guaranteed at 98.5%.",
    st_date: "2026-05-01",
    com_date: "2027-10-31",
    duration_months: 18,
    cbudget: "Yes",
    cb_amnt: 9000000,
    cb_currency: "USD",
    reason: "",
    jv: "Yes",
    jv_recoverable: "Yes",
    jv_cost: 2625000,
    jv_budget: "Yes",
    jv_amnt: 2700000,
    jv_reason: "Standard 70:30 unincorporated Joint Venture participation.",
    ph_till_label: DEFAULT_PHASING_LABELS.ph_till_label,
    ph_fy_label: DEFAULT_PHASING_LABELS.ph_fy_label,
    ph_beyond_label: DEFAULT_PHASING_LABELS.ph_beyond_label,
    prod_till: 0,
    prod_fy: 450000,
    prod_beyond: 1100000,
    capex_till: 3250000,
    capex_fy: 4500000,
    capex_beyond: 1000000,
    opex_till: 150000,
    opex_fy: 350000,
    opex_beyond: 500000,
    engineer: 1400000,
    s_fac: 3950000,
    comis: 1100000,
    preop: 800000,
    others: 1500000,
    total: 8750000,
    remarks: "Procurement and commissioning of two 15 MMSCFD reciprocating booster compressors to offset wellhead depletion and ensure pipeline export pressure. Complies fully with Directorate General of Hydrocarbons (DGH) regulatory standards. Without this investment, terminal throughput drops 28% within 9 months.",
    remarks_jv: "ONGC tech committee reviewed equipment specifications and approved with zero dissent.",
    current_level: 4,
    pending_with_role: "Completed",
    pending_with_email: "",
    request_date: "2026-01-15",
    created_date: "2026-01-15T09:00:00Z",
    created_by: "Arun Kulkarni",
    modified_date: "2026-02-18T16:45:00Z",
    modified_by: "Ananya Deshmukh",
    revision_count: 0
  },
  {
    id: "prop-003",
    cerprno: "CER-2026-0003",
    pr_name: "Suvali Offshore Pipeline Integrity Sleeving & Pigging",
    owname: "Meenakshi Sundaram",
    owner_email: "meenakshi.s@vedanta.co.in",
    sbu: "CBOS",
    status: "Draft",
    object: "Asset Integrity & Process Safety",
    amount: 3200000,
    currency: "USD",
    cat: "Vital",
    payable: "Non-Payback",
    period: "12 Months",
    payback_quarters: 0,
    ben_npv: 0,
    ben_irr: 0,
    cost_assumptions: "Non-payback mandatory asset integrity work. Failure to repair risks pipeline shutdown by Petroleum & Natural Gas Regulatory Board.",
    st_date: "2026-06-01",
    com_date: "2027-05-31",
    duration_months: 12,
    cbudget: "Partially",
    cb_amnt: 2000000,
    cb_currency: "USD",
    reason: "Remaining $1.2M allocated from corporate contingency safety pool as approved by COO.",
    jv: "No",
    jv_recoverable: "No",
    jv_cost: 0,
    jv_budget: "No",
    jv_amnt: 0,
    jv_reason: "100% Vedanta operating block.",
    ph_till_label: DEFAULT_PHASING_LABELS.ph_till_label,
    ph_fy_label: DEFAULT_PHASING_LABELS.ph_fy_label,
    ph_beyond_label: DEFAULT_PHASING_LABELS.ph_beyond_label,
    prod_till: 0,
    prod_fy: 0,
    prod_beyond: 0,
    capex_till: 1800000,
    capex_fy: 1400000,
    capex_beyond: 0,
    opex_till: 100000,
    opex_fy: 150000,
    opex_beyond: 0,
    engineer: 450000,
    s_fac: 1950000,
    comis: 300000,
    preop: 200000,
    others: 300000,
    total: 3200000,
    remarks: "Crucial pipeline sleeving and subsea intelligent pigging across 18 km nearshore corridor following ultrasonic corrosion anomaly detection. This is a non-payback safety and regulatory mandatory expenditure to prevent environmental hazard and guarantee hydrocarbon containment.",
    remarks_jv: "Not applicable.",
    current_level: 1,
    pending_with_role: "SBU Operations Head",
    pending_with_email: "rajesh.sharma@vedanta.co.in",
    request_date: "2026-03-18",
    created_date: "2026-03-18T11:20:00Z",
    created_by: "Meenakshi Sundaram",
    modified_date: "2026-03-18T11:20:00Z",
    modified_by: "Meenakshi Sundaram",
    revision_count: 0
  }
];

export class LocalMockCERDataService implements ICERDataService {
  private _proposals: ICERProposal[] = [];
  private _auditTrail: ICERAuditRecord[] = [];
  private _remarksHistory: ICERRemarksVersion[] = [];
  private _workflowLevels: IWorkflowLevel[] = [];
  private _decisions: IApprovalDecision[] = [];
  private _attachments: ICERAttachment[] = [];
  private _notifications: INotificationLog[] = [];
  private _userRoles: IUserRoleAssignment[] = [];
  private _adminAudit: IAdminAuditRecord[] = [];

  constructor() {
    this._initializeData();
  }

  private _initializeData(): void {
    const hasStorage = typeof window !== "undefined" && typeof localStorage !== "undefined";
    if (!hasStorage) {
      this._proposals = [...SEED_PROPOSALS];
      this._workflowLevels = [...DEFAULT_WORKFLOW_LEVELS];
      this._userRoles = [...DEFAULT_USER_ROLES];
      return;
    }
    try {
      const getStoredItem = (key: string): string | null => {
        const val = localStorage.getItem(key);
        if (val) return val;
        const suffix = key.replace("CER_APP", "");
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && k !== key && k.endsWith(suffix)) {
            const oldVal = localStorage.getItem(k);
            if (oldVal) {
              try {
                localStorage.setItem(key, oldVal);
                localStorage.removeItem(k);
              } catch {
                // ignore
              }
              return oldVal;
            }
          }
        }
        return null;
      };

      const storedProps = getStoredItem(STORAGE_KEYS.PROPOSALS);
      if (storedProps) {
        this._proposals = JSON.parse(storedProps);
      } else {
        this._proposals = [...SEED_PROPOSALS];
        this._saveToStorage(STORAGE_KEYS.PROPOSALS, this._proposals);
      }

      const storedAudit = getStoredItem(STORAGE_KEYS.AUDIT);
      if (storedAudit) {
        this._auditTrail = JSON.parse(storedAudit);
      } else {
        // Seed initial audit trail
        this._auditTrail = [
          {
            id: "aud-001",
            cerprno: "CER-2026-0001",
            field_name: "amount",
            field_desc: AUDIT_FIELD_DESCRIPTIONS["amount"] || "Amount of CER",
            old_value: "13800000",
            new_value: "14500000",
            user_name: "Demo Initiator",
            user_email: "demo.initiator@example.com",
            audit_date: "2026-03-12",
            audit_time: "14:30:15",
            timestamp: "2026-03-12T14:30:15Z"
          },
          {
            id: "aud-002",
            cerprno: "CER-2026-0001",
            field_name: "ben_npv",
            field_desc: AUDIT_FIELD_DESCRIPTIONS["ben_npv"] || "Financial Benefits NPV",
            old_value: "25.0",
            new_value: "28.4",
            user_name: "Demo Initiator",
            user_email: "demo.initiator@example.com",
            audit_date: "2026-03-12",
            audit_time: "14:30:15",
            timestamp: "2026-03-12T14:30:15Z"
          },
          {
            id: "aud-003",
            cerprno: "CER-2026-0001",
            field_name: "remarks",
            field_desc: AUDIT_FIELD_DESCRIPTIONS["remarks"],
            old_value: "Initial polymer expansion proposal for Mangala.",
            new_value: SEED_PROPOSALS[0].remarks,
            user_name: "Demo Initiator",
            user_email: "demo.initiator@example.com",
            audit_date: "2026-03-12",
            audit_time: "14:30:15",
            timestamp: "2026-03-12T14:30:15Z",
            is_long_text: true
          }
        ];
        this._saveToStorage(STORAGE_KEYS.AUDIT, this._auditTrail);
      }

      const storedLevels = getStoredItem(STORAGE_KEYS.WORKFLOW_LEVELS);
      if (storedLevels) {
        this._workflowLevels = JSON.parse(storedLevels);
      } else {
        this._workflowLevels = [...DEFAULT_WORKFLOW_LEVELS];
        this._saveToStorage(STORAGE_KEYS.WORKFLOW_LEVELS, this._workflowLevels);
      }

      const storedDecisions = getStoredItem(STORAGE_KEYS.APPROVAL_DECISIONS);
      if (storedDecisions) {
        this._decisions = JSON.parse(storedDecisions);
      } else {
        this._decisions = [
          {
            id: "dec-001",
            cerprno: "CER-2026-0001",
            level_id: 1,
            level_name: "L1 - Technical & SBU Review",
            approver_name: "Rajesh Sharma",
            approver_email: "rajesh.sharma@vedanta.co.in",
            decision: "APPROVED",
            comments: "Technical scoping and simulation reservoir models verified. Recommend proceeding to Finance for commercial sign-off.",
            timestamp: "2026-03-12T14:30:00Z"
          },
          {
            id: "dec-002",
            cerprno: "CER-2026-0002",
            level_id: 1,
            level_name: "L1 - Technical & SBU Review",
            approver_name: "Rajesh Sharma",
            approver_email: "rajesh.sharma@vedanta.co.in",
            decision: "APPROVED",
            comments: "Critical compressor specifications aligned with field depletion timeline.",
            timestamp: "2026-01-20T11:00:00Z"
          },
          {
            id: "dec-003",
            cerprno: "CER-2026-0002",
            level_id: 2,
            level_name: "L2 - Commercial & Financial Review",
            approver_name: "Sunil Verma",
            approver_email: "sunil.verma@vedanta.co.in",
            decision: "APPROVED",
            comments: "Corporate budget availability confirmed under RJ South FY26 Capex envelope.",
            timestamp: "2026-02-05T15:20:00Z"
          },
          {
            id: "dec-004",
            cerprno: "CER-2026-0002",
            level_id: 3,
            level_name: "L3 - Executive Committee Sign-off",
            approver_name: "Ananya Deshmukh",
            approver_email: "ananya.deshmukh@vedanta.co.in",
            decision: "APPROVED",
            comments: "Final executive committee approval granted. Authorized for PO placement.",
            timestamp: "2026-02-18T16:45:00Z"
          }
        ];
        this._saveToStorage(STORAGE_KEYS.APPROVAL_DECISIONS, this._decisions);
      }

      const storedRemarksHist = getStoredItem(STORAGE_KEYS.REMARKS_HISTORY);
      if (storedRemarksHist) {
        this._remarksHistory = JSON.parse(storedRemarksHist);
      } else {
        this._remarksHistory = [
          {
            id: "rem-001",
            cerprno: "CER-2026-0001",
            version: 1,
            remarks_text: "Initial polymer expansion proposal for Mangala.",
            remarks_type: "REMARKS",
            word_count: 7,
            created_by: "Demo Initiator",
            created_date: "2026-03-10T10:15:00Z"
          },
          {
            id: "rem-002",
            cerprno: "CER-2026-0001",
            version: 2,
            remarks_text: SEED_PROPOSALS[0].remarks,
            remarks_type: "REMARKS",
            word_count: SEED_PROPOSALS[0].remarks.split(/\s+/).filter(Boolean).length,
            created_by: "Demo Initiator",
            created_date: "2026-03-12T14:30:15Z"
          }
        ];
        this._saveToStorage(STORAGE_KEYS.REMARKS_HISTORY, this._remarksHistory);
      }

      const storedAttach = getStoredItem(STORAGE_KEYS.ATTACHMENTS);
      if (storedAttach) {
        this._attachments = JSON.parse(storedAttach);
      } else {
        this._attachments = [
          {
            id: "att-001",
            cerprno: "CER-2026-0001",
            name: "Mangala_EOR_Reservoir_Simulation_Report.pdf",
            size: 4280000,
            type: "application/pdf",
            uploaded_by: "Demo Initiator",
            uploaded_date: "2026-03-10T10:18:00Z"
          },
          {
            id: "att-002",
            cerprno: "CER-2026-0001",
            name: "ONGC_Partner_OCM48_Consent_Resolution.pdf",
            size: 1120000,
            type: "application/pdf",
            uploaded_by: "Demo Initiator",
            uploaded_date: "2026-03-11T09:40:00Z"
          },
          {
            id: "att-003",
            cerprno: "CER-2026-0002",
            name: "Compressor_Technical_Datasheet_Turbomachinery.pdf",
            size: 2850000,
            type: "application/pdf",
            uploaded_by: "Arun Kulkarni",
            uploaded_date: "2026-01-15T09:20:00Z"
          }
        ];
        this._saveToStorage(STORAGE_KEYS.ATTACHMENTS, this._attachments);
      }

      const storedNotifs = getStoredItem(STORAGE_KEYS.NOTIFICATIONS);
      if (storedNotifs) {
        this._notifications = JSON.parse(storedNotifs);
      }

      const storedRoles = getStoredItem(STORAGE_KEYS.USER_ROLES);
      if (storedRoles) {
        const rawList = JSON.parse(storedRoles);
        const legacyDemoEmails = [
          "priya.kalekar@cairnindia.com",
          "ankit.sharma2@cairnindia.com",
          "deependra.singh@cairnindia.com",
          "nitin.doshi@cairnindia.com",
        ];
        this._userRoles = Array.isArray(rawList)
          ? rawList.filter((r: IUserRoleAssignment) => {
              const email = (r.user_email || "").toLowerCase();
              const name = (r.user_name || "").toLowerCase();
              return (
                legacyDemoEmails.indexOf(email) === -1 &&
                name.indexOf("stl digital") === -1 &&
                name.indexOf("priya") === -1
              );
            })
          : [];
        // Ensure a Demo Admin is present
        const hasAdmin = this._userRoles.some(
          r => r.role === "Admin" && r.is_active
        );
        if (!hasAdmin) {
          this._userRoles.unshift({
            id: "1",
            user_name: "Demo Administrator",
            user_email: "demo.admin@example.com",
            login_name: "demo.admin@example.com",
            role: "Admin",
            department: "Enterprise Administration",
            sbu: "RJ North",
            is_active: true,
            assigned_by: "System Bootstrap",
            assigned_date: "2026-10-23T18:30:00Z",
          });
        }
        this._saveToStorage(STORAGE_KEYS.USER_ROLES, this._userRoles);
      } else {
        this._userRoles = [...DEFAULT_USER_ROLES];
        this._saveToStorage(STORAGE_KEYS.USER_ROLES, this._userRoles);
      }

      const storedAdminAudit = getStoredItem(STORAGE_KEYS.ADMIN_AUDIT);
      if (storedAdminAudit) {
        this._adminAudit = JSON.parse(storedAdminAudit);
      } else {
        this._adminAudit = [
          {
            id: "admaud-seed-001",
            actor_name: "SYSTEM_INITIAL_BOOTSTRAP",
            actor_email: "system@demo.local",
            action: "ROLE_ASSIGNED",
            target_type: "USER",
            target_id: "role-001",
            details: "Initial bootstrap: Assigned Administrator role to Demo Administrator (demo.admin@example.com).",
            timestamp: "2026-10-23T18:30:00Z",
          },
        ];
        this._saveToStorage(STORAGE_KEYS.ADMIN_AUDIT, this._adminAudit);
      }
    } catch (e) {
      console.warn("[LocalMockCERDataService] Storage error, using in-memory data:", e);
      this._proposals = [...SEED_PROPOSALS];
      this._workflowLevels = [...DEFAULT_WORKFLOW_LEVELS];
      this._userRoles = [...DEFAULT_USER_ROLES];
    }
  }

  private _saveToStorage(key: string, data: any): void {
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      try {
        localStorage.setItem(key, JSON.stringify(data));
      } catch (e) {
        console.warn(`[LocalMockCERDataService] Failed to write key ${key}:`, e);
      }
    }
  }

  public async getFieldChoices(): Promise<IFieldChoices> {
    return { ...DEFAULT_FIELD_CHOICES };
  }

  public async getAllProposals(): Promise<ICERProposal[]> {
    return [...this._proposals];
  }

  public async getProposalByNumber(cerprno: string): Promise<ICERProposal | null> {
    const trimmed = (cerprno || "").trim().toUpperCase();
    const found = this._proposals.find(p =>
      (p.cerPrId && p.cerPrId.toUpperCase() === trimmed) ||
      (p.cerprno && p.cerprno.toUpperCase() === trimmed) ||
      (p.cer_proposal_id && p.cer_proposal_id.toUpperCase() === trimmed) ||
      (p.proposal_no && p.proposal_no.toUpperCase() === trimmed)
    );
    return found ? { ...found } : null;
  }

  private _nextSequenceMap: Map<number, number> = new Map();
  private _sequenceLock: Promise<void> = Promise.resolve();

  public async generateProposalNumber(): Promise<string> {
    return new Promise((resolve) => {
      this._sequenceLock = this._sequenceLock.then(async () => {
        const year = new Date().getFullYear();
        const prefix = `CER-${year}-`;
        let highest = this._nextSequenceMap.get(year) || 0;
        for (const p of this._proposals) {
          if (p.cerprno && p.cerprno.toUpperCase().startsWith(prefix) && !p.cerprno.toUpperCase().startsWith("CER-COUNTER-")) {
            const numPart = parseInt(p.cerprno.toUpperCase().replace(prefix, ""), 10);
            if (!isNaN(numPart) && numPart > highest) {
              highest = numPart;
            }
          }
        }
        let nextNum = highest + 1;
        let candidate = `${prefix}${("0000" + nextNum).slice(-4)}`;
        while (this._proposals.some(p => p.cerprno.toUpperCase() === candidate.toUpperCase())) {
          nextNum++;
          candidate = `${prefix}${("0000" + nextNum).slice(-4)}`;
        }
        this._nextSequenceMap.set(year, nextNum);
        resolve(candidate);
      });
    });
  }

  public async createProposal(proposal: ICERProposal): Promise<{ success: boolean; message: string; proposal: ICERProposal }> {
    const effectiveProposalNo = (proposal.proposal_no || proposal.cerprno || "").trim();
    if (!effectiveProposalNo) {
      throw new Error("CER Proposal No is required.");
    }

    const isDuplicatePropNo = this._proposals.some(p =>
      p.id !== proposal.id &&
      ((p.proposal_no && p.proposal_no.trim().toLowerCase() === effectiveProposalNo.toLowerCase()) ||
       (p.cerprno && p.cerprno.trim().toLowerCase() === effectiveProposalNo.toLowerCase()))
    );
    if (isDuplicatePropNo) {
      throw new Error(`Proposal Number ${effectiveProposalNo} already exists. Please enter or generate a unique proposal number.`);
    }

    const existingIndex = proposal.cerprno
      ? this._proposals.findIndex(p => p.cerprno && p.cerprno.toUpperCase() === proposal.cerprno.toUpperCase())
      : -1;
    if (existingIndex !== -1) {
      const existing = this._proposals[existingIndex];
      // Concurrency & Ownership Protection:
      // If caller does not own this item ID, reject duplicate proposal submission
      if (proposal.id && proposal.id !== existing.id) {
        throw new Error(`Proposal Number ${effectiveProposalNo} already exists. Please enter or generate a unique proposal number.`);
      }
      if (existing.status === "Draft") {
        return this.updateProposal(proposal, { name: proposal.owname, email: proposal.owner_email });
      }
      throw new Error(`Proposal Number ${effectiveProposalNo} already exists. Please enter or generate a unique proposal number.`);
    }

    // Allocate permanent CER Proposal ID in CER-YYYY-NNNN format using atomic CAS counter
    let permanentId = (proposal.cer_proposal_id || proposal.cerprno || "").trim();
    const isAllocatedCerId =
      Boolean(proposal.id) &&
      permanentId.startsWith("CER-") &&
      !permanentId.startsWith("CER-COUNTER-") &&
      /^CER-\d{4}-\d{4}$/.test(permanentId);

    if (!isAllocatedCerId) {
      permanentId = await this.generateProposalNumber();
    }

    const now = new Date().toISOString();
    const isDraft = proposal.status === "Draft";
    const sbuLower = (proposal.sbu || "").trim().toLowerCase();
    const activeLevels = this._workflowLevels
      .filter(l => l.is_active && (l.sbu || "").trim().toLowerCase() === sbuLower)
      .sort((a, b) => a.level_id - b.level_id);

    if (!isDraft && activeLevels.length === 0) {
      throw new Error(`No approval stages configured for SBU '${proposal.sbu}'. Please configure workflow levels in Admin settings.`);
    }

    const activeL1 = activeLevels.find(l => l.level_id === 1) || activeLevels[0];
    const isL1PO = activeL1 ? isProjectOwnerStage(activeL1) : false;

    if (!isDraft && isL1PO && !isValidEmail(proposal.owner_email)) {
      throw new Error(`Cannot route to Project Owner: Proposal Owner Email ('${proposal.owner_email || ""}') is missing or invalid.`);
    }

    const defaultPhasing = getCurrentFiscalYearPhasingLabels();
    const newProposal: ICERProposal = {
      ...proposal,
      id: proposal.id || `prop-${Date.now()}`,
      proposal_no: effectiveProposalNo,
      cer_proposal_id: permanentId,
      cerPrId: permanentId,
      cerprno: permanentId,
      status: proposal.status || "In Approval",
      current_level: isDraft ? 0 : 1,
      pending_with_role: isDraft ? "Draft" : (activeL1 ? activeL1.role_title : "L1 Approver"),
      pending_with_email: isDraft ? "" : (isL1PO ? (proposal.owner_email || "") : (activeL1 ? (activeL1.approver_email || "") : "")),
      ph_till_label: proposal.ph_till_label || defaultPhasing.ph_till_label,
      ph_fy_label: proposal.ph_fy_label || defaultPhasing.ph_fy_label,
      ph_beyond_label: proposal.ph_beyond_label || defaultPhasing.ph_beyond_label,
      request_date: isDraft ? proposal.request_date : (proposal.request_date || now.split("T")[0]),
      created_date: now,
      modified_date: now,
      revision_count: 0
    };

    this._proposals.unshift(newProposal);
    this._saveToStorage(STORAGE_KEYS.PROPOSALS, this._proposals);

    // Initial Remarks History
    if (newProposal.remarks && newProposal.remarks.trim()) {
      const remarksVersion: ICERRemarksVersion = {
        id: `rem-${Date.now()}`,
        cerprno: newProposal.cerprno,
        version: 1,
        remarks_text: newProposal.remarks,
        remarks_type: "REMARKS",
        word_count: newProposal.remarks.split(/\s+/).filter(Boolean).length,
        created_by: newProposal.created_by,
        created_date: now
      };
      this._remarksHistory.unshift(remarksVersion);
      this._saveToStorage(STORAGE_KEYS.REMARKS_HISTORY, this._remarksHistory);
    }

    // Trigger Notification to Creator & L1 Approver (only when submitted for approval)
    if (!isDraft) {
      const recipients = [newProposal.owner_email];
      if (activeL1?.approver_email) recipients.push(activeL1.approver_email);

      this._recordNotification({
        cerprno: newProposal.cerprno,
        recipients,
        subject: `[CER Action Required] New Proposal ${newProposal.cerprno} - ${newProposal.pr_name}`,
        body: `CER Proposal ${newProposal.cerprno} (${newProposal.pr_name}) for ${newProposal.currency} ${newProposal.amount.toLocaleString()} has been submitted by ${newProposal.owname} and is awaiting Level 1 approval.`,
        attachments_count: this._attachments.filter(a => a.cerprno === newProposal.cerprno).length
      });
    }

    return {
      success: true,
      message: isDraft
        ? "CER Proposal draft has been saved successfully"
        : "CER Proposal No. has been created and sent for approval",
      proposal: newProposal
    };
  }

  public async updateProposal(
    updatedProposal: ICERProposal,
    user: { name: string; email: string }
  ): Promise<{ success: boolean; message: string; proposal: ICERProposal; auditRowsCount: number }> {
    const index = this._proposals.findIndex(p => p.cerprno.toUpperCase() === updatedProposal.cerprno.toUpperCase());
    if (index === -1) {
      throw new Error(`Proposal ${updatedProposal.cerprno} not found`);
    }

    const oldProposal = this._proposals[index];
    const permanentId = oldProposal.cer_proposal_id || oldProposal.cerprno;
    const effectiveProposalNo = (updatedProposal.proposal_no || oldProposal.proposal_no || oldProposal.cerprno || "").trim();
    if (!effectiveProposalNo) {
      throw new Error("CER Proposal No is required.");
    }

    // Uniqueness check for proposal_no if updated
    const isDuplicate = this._proposals.some(p =>
      p.id !== oldProposal.id &&
      ((p.proposal_no && p.proposal_no.trim().toLowerCase() === effectiveProposalNo.toLowerCase()) ||
       (p.cerprno && p.cerprno.trim().toLowerCase() === effectiveProposalNo.toLowerCase()))
    );
    if (isDuplicate) {
      throw new Error(`Proposal Number ${effectiveProposalNo} already exists. Please enter or generate a unique proposal number.`);
    }

    // Enterprise RBAC: Only designated CER Owner or Administrator can edit proposals
    const userEmail = (user.email || "").trim().toLowerCase();
    const ownerEmail = (oldProposal.owner_email || "").trim().toLowerCase();
    const isEmailOwner = userEmail && ownerEmail && userEmail === ownerEmail;

    const userName = (user.name || "").trim().toLowerCase();
    const ownerName = (oldProposal.owname || "").trim().toLowerCase();
    const isNameOwner = userName && ownerName && userName === ownerName;

    const isAuthorizedActor =
      isEmailOwner ||
      isNameOwner ||
      userEmail.indexOf("Admin") !== -1 ||
      userEmail.indexOf("auditor") !== -1;

    if (!isAuthorizedActor) {
      throw new Error(`Unauthorized: Only the designated CER Owner (${oldProposal.owname}) or Administrator can edit this proposal.`);
    }

    const now = new Date();
    const local = getLocalComponents(now);
    const dateStr = local.localDate;
    const timeStr = local.localTime;

    // Compute field-level delta (FR-06)
    const auditRows: ICERAuditRecord[] = [];
    const keys = Object.keys(updatedProposal) as (keyof ICERProposal)[];

    for (const key of keys) {
      if (EXCLUDED_AUDIT_FIELDS.has(key)) {
        continue;
      }

      const oldVal = oldProposal[key];
      const newVal = updatedProposal[key];

      // Format comparison
      const oldStr = oldVal !== undefined && oldVal !== null ? String(oldVal).trim() : "";
      const newStr = newVal !== undefined && newVal !== null ? String(newVal).trim() : "";

      if (oldStr !== newStr) {
        const desc = AUDIT_FIELD_DESCRIPTIONS[key] || String(key).replace(/_/g, " ").toUpperCase();
        auditRows.push({
          id: `aud-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
          cerprno: updatedProposal.cerprno,
          field_name: String(key),
          field_desc: desc,
          old_value: oldStr,
          new_value: newStr,
          user_name: user.name,
          user_email: user.email,
          audit_date: dateStr,
          audit_time: timeStr,
          timestamp: now.toISOString(),
          is_long_text: key === "remarks" || key === "remarks_jv"
        });
      }
    }

    // Save audit records
    if (auditRows.length > 0) {
      this._auditTrail.unshift(...auditRows);
      this._saveToStorage(STORAGE_KEYS.AUDIT, this._auditTrail);
    }

    // Check if remarks changed -> create new version (FR-08)
    const oldRemarks = (oldProposal.remarks || "").trim();
    const newRemarks = (updatedProposal.remarks || "").trim();
    if (oldRemarks !== newRemarks && newRemarks) {
      const existingVersions = this._remarksHistory.filter(r => r.cerprno === updatedProposal.cerprno);
      const nextVer = existingVersions.length + 1;
      const remarksRecord: ICERRemarksVersion = {
        id: `rem-${Date.now()}`,
        cerprno: updatedProposal.cerprno,
        version: nextVer,
        remarks_text: updatedProposal.remarks || "",
        remarks_type: "REMARKS",
        word_count: newRemarks.split(/\s+/).filter(Boolean).length,
        created_by: user.name,
        created_date: now.toISOString()
      };
      this._remarksHistory.unshift(remarksRecord);
      this._saveToStorage(STORAGE_KEYS.REMARKS_HISTORY, this._remarksHistory);
    }

    const sbuLower = (updatedProposal.sbu || "").trim().toLowerCase();
    const isDraft = updatedProposal.status === "Draft";
    const activeLevels = this._workflowLevels
      .filter(l => l.is_active && (l.sbu || "").trim().toLowerCase() === sbuLower)
      .sort((a, b) => a.level_id - b.level_id);

    if (!isDraft && activeLevels.length === 0) {
      throw new Error(`No approval stages configured for SBU '${updatedProposal.sbu}'. Please configure workflow levels in Admin settings.`);
    }

    const activeL1 = activeLevels.find(l => l.level_id === 1) || activeLevels[0];
    const isL1PO = activeL1 ? isProjectOwnerStage(activeL1) : false;

    if (!isDraft && isL1PO && !isValidEmail(updatedProposal.owner_email)) {
      throw new Error(`Cannot route to Project Owner: Proposal Owner Email ('${updatedProposal.owner_email || ""}') is missing or invalid.`);
    }

    const todayDate = now.toISOString().split("T")[0];
    let nextRequestDate = oldProposal.request_date || updatedProposal.request_date;

    if (!isDraft) {
      if (oldProposal.status === "Approved") {
        // Requirement: On Resubmit of 'Approved CER' update the request date with current date.
        nextRequestDate = todayDate;
      } else if (oldProposal.status === "Revised") {
        // Requirement: Do not update if editing 'Sendback CER'.
        nextRequestDate = oldProposal.request_date || updatedProposal.request_date;
      } else if (oldProposal.status === "Draft") {
        // Initial submission of a draft proposal
        nextRequestDate = todayDate;
      }
    }

    const savedProposal: ICERProposal = {
      ...updatedProposal,
      proposal_no: effectiveProposalNo,
      cer_proposal_id: permanentId,
      cerPrId: permanentId,
      cerprno: permanentId,
      status: isDraft ? "Draft" : "In Approval",
      current_level: isDraft ? (oldProposal.current_level || 0) : 1,
      pending_with_role: isDraft ? "Draft" : (activeL1 ? activeL1.role_title : "L1 Approver"),
      pending_with_email: isDraft ? "" : (isL1PO ? (updatedProposal.owner_email || "") : (activeL1 ? (activeL1.approver_email || "") : "")),
      request_date: nextRequestDate,
      modified_date: now.toISOString(),
      modified_by: user.name,
      revision_count: (oldProposal.revision_count || 0) + 1
    };

    this._proposals[index] = savedProposal;
    this._saveToStorage(STORAGE_KEYS.PROPOSALS, this._proposals);

    // Notify stakeholders (Creator + L1 Approver)
    const rawRecipients = [savedProposal.owner_email, activeL1?.approver_email].filter(Boolean);
    const recipients = Array.from(new Set(rawRecipients.map(e => (e as string).trim().toLowerCase())));

    let proposalAttachments: ICERAttachment[] = [];
    try {
      proposalAttachments = this._attachments.filter(a => a.cerprno.toUpperCase() === savedProposal.cerprno.toUpperCase());
    } catch (e) {
      // non-blocking
    }
    const attachmentSummary = proposalAttachments.length > 0
      ? `\n\nAttachments Included (${proposalAttachments.length}):\n` + proposalAttachments.map(a => `• ${a.name}`).join("\n")
      : "\n\nNo attachments included.";

    try {
      this._recordNotification({
        cerprno: savedProposal.cerprno,
        recipients,
        subject: `[CER Modified] Proposal ${savedProposal.cerprno} - Revision ${savedProposal.revision_count}`,
        body: `CER Proposal ${savedProposal.cerprno} has been modified by ${user.name} (${auditRows.length} fields changed) and resubmitted for approval workflow starting at Level 1.${attachmentSummary}`,
        attachments_count: proposalAttachments.length
      });
    } catch (e) {
      console.warn("Notification error:", e);
    }

    return {
      success: true,
      message: "CER Proposal No. has been changed and sent for approval",
      proposal: savedProposal,
      auditRowsCount: auditRows.length
    };
  }

  public async getAuditTrail(cerprno?: string): Promise<ICERAuditRecord[]> {
    if (cerprno) {
      const trimmed = cerprno.trim().toUpperCase();
      const resolved = this._proposals.find(p =>
        p.cerprno.toUpperCase() === trimmed ||
        (p.proposal_no && p.proposal_no.toUpperCase() === trimmed) ||
        (p.cer_proposal_id && p.cer_proposal_id.toUpperCase() === trimmed)
      );
      const target = resolved ? resolved.cerprno.toUpperCase() : trimmed;
      return this._auditTrail.filter(a => a.cerprno.toUpperCase() === target || a.cerprno.toUpperCase() === trimmed);
    }
    return [...this._auditTrail];
  }

  public async getRemarksHistory(cerprno: string): Promise<ICERRemarksVersion[]> {
    const trimmed = cerprno.trim().toUpperCase();
    const resolved = this._proposals.find(p =>
      p.cerprno.toUpperCase() === trimmed ||
      (p.proposal_no && p.proposal_no.toUpperCase() === trimmed) ||
      (p.cer_proposal_id && p.cer_proposal_id.toUpperCase() === trimmed)
    );
    const target = resolved ? resolved.cerprno.toUpperCase() : trimmed;
    return this._remarksHistory.filter(r => r.cerprno.toUpperCase() === target || r.cerprno.toUpperCase() === trimmed);
  }

  public async getWorkflowLevels(sbu?: string, _forceRefresh?: boolean): Promise<IWorkflowLevel[]> {
    const mapLevel = (lvl: IWorkflowLevel): IWorkflowLevel => {
      const isPO = isProjectOwnerStage(lvl);
      const assignmentType: ApproverAssignmentType = lvl.assignment_type || (isPO ? "ProjectOwnerAuto" : "SpecificUser");
      if (isPO) {
        return {
          ...lvl,
          assignment_type: assignmentType,
          is_project_owner_stage: true,
          approver_name: "Project Owner (Auto-fetched from CER Proposal)",
          approver_email: "",
        };
      }

      const matchedUser = this._userRoles.find(
        (u) => u.is_active && u.role === "Approver" && u.approval_level === lvl.level_id
      );

      return {
        ...lvl,
        assignment_type: assignmentType,
        is_project_owner_stage: false,
        approver_name: matchedUser ? matchedUser.user_name : (lvl.approver_name || ""),
        approver_email: matchedUser ? matchedUser.user_email : (lvl.approver_email || ""),
      };
    };

    if (sbu) {
      const sbuLower = sbu.trim().toLowerCase();
      return this._workflowLevels
        .filter(l => (l.sbu || "").trim().toLowerCase() === sbuLower)
        .sort((a, b) => a.level_id - b.level_id)
        .map(mapLevel);
    }
    return [...this._workflowLevels]
      .sort((a, b) => {
        const sbuComp = (a.sbu || "").localeCompare(b.sbu || "");
        if (sbuComp !== 0) return sbuComp;
        return a.level_id - b.level_id;
      })
      .map(mapLevel);
  }

  public async saveWorkflowLevels(levels: IWorkflowLevel[]): Promise<void> {
    this._workflowLevels = levels.map((l) => ({
      ...l,
      assignment_type: l.assignment_type || (isProjectOwnerStage(l) ? "ProjectOwnerAuto" : "SpecificUser"),
      is_project_owner_stage: isProjectOwnerStage(l),
    }));
    this._saveToStorage(STORAGE_KEYS.WORKFLOW_LEVELS, this._workflowLevels);
  }

  public async getApprovalDecisions(cerprno: string): Promise<IApprovalDecision[]> {
    const trimmed = cerprno.trim().toUpperCase();
    const resolved = this._proposals.find(p =>
      p.cerprno.toUpperCase() === trimmed ||
      (p.proposal_no && p.proposal_no.toUpperCase() === trimmed) ||
      (p.cer_proposal_id && p.cer_proposal_id.toUpperCase() === trimmed)
    );
    const target = resolved ? resolved.cerprno.toUpperCase() : trimmed;
    return this._decisions.filter(d => d.cerprno.toUpperCase() === target || d.cerprno.toUpperCase() === trimmed);
  }

  public async recordDecision(params: {
    cerprno: string;
    level_id: number;
    approver_name: string;
    approver_email: string;
    decision: "APPROVED" | "REJECTED" | "SENT_BACK";
    comments: string;
  }): Promise<{ success: boolean; newStatus: string; nextLevel: number }> {
    const propIndex = this._proposals.findIndex(p =>
      p.cerprno.toUpperCase() === params.cerprno.toUpperCase() ||
      (p.proposal_no && p.proposal_no.toUpperCase() === params.cerprno.toUpperCase()) ||
      (p.cer_proposal_id && p.cer_proposal_id.toUpperCase() === params.cerprno.toUpperCase())
    );
    if (propIndex === -1) {
      throw new Error(`Proposal ${params.cerprno} not found`);
    }

    const proposal = this._proposals[propIndex];

    // Determine active levels for proposal SBU
    const sbuLower = (proposal.sbu || "").trim().toLowerCase();
    const activeLevels = this._workflowLevels
      .filter(l => l.is_active && (l.sbu || "").trim().toLowerCase() === sbuLower)
      .sort((a, b) => a.level_id - b.level_id);

    const currentLevelConfig = activeLevels.find(l => l.level_id === params.level_id);
    const isCurrentPO = currentLevelConfig ? isProjectOwnerStage(currentLevelConfig) : false;

    // Check authorization:
    const approverEmail = (params.approver_email || "").trim().toLowerCase();
    const ownerEmail = (proposal.owner_email || "").trim().toLowerCase();
    const isEmailMatch = approverEmail && ownerEmail && approverEmail === ownerEmail;

    const approverName = (params.approver_name || "").trim().toLowerCase();
    const ownerName = (proposal.owname || "").trim().toLowerCase();
    const isNameMatch = approverName && ownerName && approverName === ownerName;
    const isOwner = isEmailMatch || isNameMatch;

    const stageApproverEmail = (currentLevelConfig?.approver_email || "").trim().toLowerCase();
    const initiatorEmail = (proposal.created_by || "").trim().toLowerCase();
    const isCreator = Boolean(initiatorEmail && (initiatorEmail === approverEmail || initiatorEmail === approverName));

    if (isCurrentPO) {
      // Dynamic Project Owner stage: ONLY the designated Project Owner can approve
      if (!isOwner) {
        throw new Error(
          `Access Denied: Only the designated Project Owner (${proposal.owname || proposal.owner_email}) can approve this stage.`
        );
      }
    } else {
      // Non-Project Owner stage: Segregation of Duties strictly enforced
      if (isCreator) {
        throw new Error("Segregation of Duties Enforcement: You cannot approve a CER proposal that you initiated.");
      }

      if (isOwner) {
        const isApproverForLevel = this._userRoles.some(
          (r) =>
            r.is_active &&
            r.role === "Approver" &&
            r.approval_level === params.level_id &&
            (r.user_email.toLowerCase() === approverEmail ||
              (r.login_name && r.login_name.toLowerCase() === approverEmail))
        );

        const isAllowedDualOwnerApprover =
          Boolean(currentLevelConfig) &&
          isApproverForLevel &&
          (!stageApproverEmail || stageApproverEmail === approverEmail);

        if (!isAllowedDualOwnerApprover) {
          throw new Error("Segregation of Duties Enforcement: You cannot approve a CER proposal that you initiated or own on non-Project-Owner stages.");
        }
      }

      if (stageApproverEmail && stageApproverEmail !== approverEmail) {
        throw new Error(
          `Access Denied: This approval stage is assigned to designated approver (${stageApproverEmail}). Only the assigned approver can approve this level.`
        );
      }
    }

    if (params.level_id !== proposal.current_level) {
      throw new Error(`Approval Level Mismatch: Proposal is currently pending at Level ${proposal.current_level}, cannot record decision for Level ${params.level_id}.`);
    }

    const now = new Date().toISOString();
    const levelName = currentLevelConfig ? currentLevelConfig.level_name : `Level ${params.level_id}`;

    // Record decision - previous decisions are preserved for audit
    const decisionRecord: IApprovalDecision = {
      id: `dec-${Date.now()}`,
      cerprno: proposal.cerprno,
      level_id: params.level_id,
      level_name: levelName,
      approver_name: params.approver_name,
      approver_email: params.approver_email,
      decision: params.decision,
      comments: params.comments,
      timestamp: now
    };

    this._decisions.push(decisionRecord);
    this._saveToStorage(STORAGE_KEYS.APPROVAL_DECISIONS, this._decisions);

    let newStatus: string = proposal.status;
    let nextLevelId = params.level_id;

    // Use SBU-routed active levels
    const nextLevelConfig = activeLevels.find(l => l.level_id > params.level_id);
    const isNextPO = nextLevelConfig ? isProjectOwnerStage(nextLevelConfig) : false;

    if (params.decision === "APPROVED" && nextLevelConfig && isNextPO) {
      if (!isValidEmail(proposal.owner_email)) {
        throw new Error(
          `Cannot route to next approval stage '${nextLevelConfig.level_name}': Project Owner Email ('${proposal.owner_email || ""}') is missing or invalid.`
        );
      }
    }

    // Collect recipients per client specification:
    // 1. The request creator
    // 2. All previous approvers
    // 3. The next-level approver
    const priorDecisions = this._decisions.filter(d => d.cerprno.toUpperCase() === proposal.cerprno.toUpperCase());
    const priorEmails = priorDecisions.map(d => d.approver_email).filter(Boolean);
    const creatorEmail = proposal.owner_email || "";
    const nextApproverEmail = (params.decision === "APPROVED" && nextLevelConfig) ? (nextLevelConfig.approver_email || "") : "";

    const rawRecipients = [creatorEmail, ...priorEmails, nextApproverEmail].filter(Boolean);
    const notificationRecipients = Array.from(new Set(rawRecipients.map(e => ((e as string) || "").trim().toLowerCase())));

    let proposalAttachments: ICERAttachment[] = [];
    try {
      proposalAttachments = this._attachments.filter(a => a.cerprno.toUpperCase() === proposal.cerprno.toUpperCase());
    } catch (attErr) {
      console.warn("Attachment retrieval warning:", attErr);
    }
    const attachmentSummary = proposalAttachments.length > 0
      ? `\n\nAttachments Included (${proposalAttachments.length}):\n` + proposalAttachments.map(a => `• ${a.name} (${Math.round((a.size || 0)/1024)} KB)`).join("\n")
      : "\n\nNo attachments included.";

    if (params.decision === "APPROVED") {
      if (nextLevelConfig) {
        // Move sequentially to next approval level
        nextLevelId = nextLevelConfig.level_id;
        proposal.current_level = nextLevelId;
        proposal.pending_with_role = nextLevelConfig.role_title;
        proposal.pending_with_email = isNextPO ? (proposal.owner_email || "") : (nextLevelConfig.approver_email || "");
        proposal.status = "In Approval";
        newStatus = "In Approval";

        try {
          this._recordNotification({
            cerprno: proposal.cerprno,
            recipients: notificationRecipients,
            subject: `[CER Approved Level ${params.level_id}] Proposal ${proposal.cerprno} Advanced to ${nextLevelConfig.level_name}`,
            body: `Level ${params.level_id} approved by ${params.approver_name}. Comments: "${params.comments}". Proposal is now pending action from ${nextLevelConfig.role_title} (${nextLevelConfig.approver_name}).${attachmentSummary}`,
            attachments_count: proposalAttachments.length
          });
        } catch (notifErr) {
          console.warn("Notification error:", notifErr);
        }
      } else {
        // Final Level Approved!
        nextLevelId = activeLevels.length + 1;
        proposal.current_level = nextLevelId;
        proposal.pending_with_role = "Approved";
        proposal.pending_with_email = "";
        proposal.status = "Approved";
        newStatus = "Approved";

        try {
          this._recordNotification({
            cerprno: proposal.cerprno,
            recipients: notificationRecipients,
            subject: `[CER Final Approval] Proposal ${proposal.cerprno} Fully Approved`,
            body: `CER Proposal ${proposal.cerprno} (${proposal.pr_name}) has completed all approval levels and is now officially APPROVED. Final sign-off by ${params.approver_name}.${attachmentSummary}`,
            attachments_count: proposalAttachments.length
          });
        } catch (notifErr) {
          console.warn("Notification error:", notifErr);
        }
      }
    } else if (params.decision === "SENT_BACK") {
      // SENT BACK TO INITIATOR (Allows Initiator to edit and re-trigger workflow)
      proposal.status = "Revised";
      proposal.pending_with_role = "Initiator (Rework)";
      proposal.pending_with_email = proposal.owner_email;
      proposal.current_level = 1;
      newStatus = "Revised";
      nextLevelId = 1;

      try {
        this._recordNotification({
          cerprno: proposal.cerprno,
          recipients: notificationRecipients,
          subject: `[CER Revision Requested] Proposal ${proposal.cerprno} Sent Back for Revision by ${params.approver_name}`,
          body: `CER Proposal ${proposal.cerprno} has been SENT BACK for revision at Level ${params.level_id} by ${params.approver_name}. Revision requirements: "${params.comments}". The initiator may now edit and resubmit the proposal to restart the approval workflow.${attachmentSummary}`,
          attachments_count: proposalAttachments.length
        });
      } catch (notifErr) {
        console.warn("Notification error:", notifErr);
      }
    } else {
      // PERMANENT REJECTION (No edits or modifications permitted)
      proposal.status = "Rejected";
      proposal.pending_with_role = "Rejected";
      proposal.pending_with_email = "";
      newStatus = "Rejected";

      try {
        this._recordNotification({
          cerprno: proposal.cerprno,
          recipients: notificationRecipients,
          subject: `[CER Rejected] Proposal ${proposal.cerprno} Permanently Rejected by ${params.approver_name}`,
          body: `CER Proposal ${proposal.cerprno} has been PERMANENTLY REJECTED at Level ${params.level_id} by ${params.approver_name}. Reason: "${params.comments}". No further modifications or edits are permitted.${attachmentSummary}`,
          attachments_count: proposalAttachments.length
        });
      } catch (notifErr) {
        console.warn("Notification error:", notifErr);
      }
    }

    proposal.modified_date = now;
    proposal.modified_by = params.approver_name;
    this._proposals[propIndex] = proposal;
    this._saveToStorage(STORAGE_KEYS.PROPOSALS, this._proposals);

    return {
      success: true,
      newStatus,
      nextLevel: nextLevelId
    };
  }

  public async getAttachments(cerprno: string): Promise<ICERAttachment[]> {
    const trimmed = cerprno.trim().toUpperCase();
    const resolved = this._proposals.find(p =>
      p.cerprno.toUpperCase() === trimmed ||
      (p.proposal_no && p.proposal_no.toUpperCase() === trimmed) ||
      (p.cer_proposal_id && p.cer_proposal_id.toUpperCase() === trimmed)
    );
    const target = resolved ? resolved.cerprno.toUpperCase() : trimmed;
    return this._attachments.filter(a => a.cerprno.toUpperCase() === target || a.cerprno.toUpperCase() === trimmed);
  }

  public async addAttachment(attachment: ICERAttachment): Promise<void> {
    const resolved = this._proposals.find(p =>
      p.cerprno.toUpperCase() === attachment.cerprno.toUpperCase() ||
      (p.proposal_no && p.proposal_no.toUpperCase() === attachment.cerprno.toUpperCase()) ||
      (p.cer_proposal_id && p.cer_proposal_id.toUpperCase() === attachment.cerprno.toUpperCase())
    );
    const targetCerId = resolved ? resolved.cerprno : attachment.cerprno;
    const existing = await this.getAttachments(targetCerId);

    const cleanOriginalName = (attachment.name || "document").replace(/^CER-\d{4}-\d{4}_(?:\d+_)?/i, "");
    const alreadySaved = existing.some((a) => {
      const existingClean = (a.name || "").replace(/^CER-\d{4}-\d{4}_(?:\d+_)?/i, "");
      return (
        existingClean.toLowerCase() === cleanOriginalName.toLowerCase() ||
        (a.name || "").toLowerCase() === (attachment.name || "").toLowerCase()
      );
    });

    if (alreadySaved) {
      return;
    }

    const existingSize = existing.reduce((sum, a) => sum + (a.size || 0), 0);

    const validation = validateAttachment(
      attachment,
      existingSize,
      existing.map((a) => a.name)
    );
    if (!validation.isValid) {
      throw new Error(`[Attachment Policy Violation] ${validation.error}`);
    }

    this._attachments.push({
      ...attachment,
      cerprno: targetCerId,
    });
    this._saveToStorage(STORAGE_KEYS.ATTACHMENTS, this._attachments);
  }

  public async deleteAttachment(id: string): Promise<void> {
    this._attachments = this._attachments.filter(a => a.id !== id);
    this._saveToStorage(STORAGE_KEYS.ATTACHMENTS, this._attachments);
  }

  public async getNotificationLogs(cerprno?: string, forceRefresh?: boolean): Promise<INotificationLog[]> {
    if (cerprno) {
      const trimmed = cerprno.trim().toUpperCase();
      const resolved = this._proposals.find(p =>
        p.cerprno.toUpperCase() === trimmed ||
        (p.proposal_no && p.proposal_no.toUpperCase() === trimmed) ||
        (p.cer_proposal_id && p.cer_proposal_id.toUpperCase() === trimmed)
      );
      const target = resolved ? resolved.cerprno.toUpperCase() : trimmed;
      return this._notifications.filter(n => n.cerprno.toUpperCase() === target || n.cerprno.toUpperCase() === trimmed);
    }
    return [...this._notifications];
  }

  private _recordNotification(data: Omit<INotificationLog, "id" | "timestamp" | "status">): void {
    const log: INotificationLog = {
      ...data,
      id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      status: "SENT"
    };
    this._notifications.unshift(log);
    this._saveToStorage(STORAGE_KEYS.NOTIFICATIONS, this._notifications);
  }

  public async searchDirectoryUsers(query: string): Promise<IDirectoryUser[]> {
    const q = (query || "").trim().toLowerCase();
    if (!q) {
      return [...MOCK_DIRECTORY_USERS];
    }
    return MOCK_DIRECTORY_USERS.filter((user) => {
      const matchName = user.displayName.toLowerCase().indexOf(q) !== -1;
      const matchMail = (user.mail || "").toLowerCase().indexOf(q) !== -1;
      const matchUpn = (user.userPrincipalName || "").toLowerCase().indexOf(q) !== -1;
      const matchTitle = (user.jobTitle || "").toLowerCase().indexOf(q) !== -1;
      return matchName || matchMail || matchUpn || matchTitle;
    });
  }

  public clearCache(): void {
    // No-op for in-memory mock service
  }

  public async getUserRoles(_forceRefresh?: boolean): Promise<IUserRoleAssignment[]> {
    return [...this._userRoles];
  }

  public async getHierarchyAdmins(_forceRefresh?: boolean): Promise<string[]> {
    return ["demo.admin@example.com", "admin.hierarchy@example.com"];
  }

  public async assignUserRole(
    assignment: Omit<IUserRoleAssignment, "id">,
    actor: { name: string; email: string }
  ): Promise<IUserRoleAssignment> {
    const actorEmail = (actor.email || "").trim().toLowerCase();
    const isAdminActor = this._userRoles.some(
      r => r.user_email.trim().toLowerCase() === actorEmail && r.role === "Admin" && r.is_active
    );
    if (!isAdminActor && actorEmail.indexOf("Admin") === -1 && actor.name !== "SYSTEM_INITIAL_BOOTSTRAP") {
      throw new Error(`Unauthorized: Only an active Administrator can assign roles. Actor '${actor.name}' does not possess Admin privileges.`);
    }

    const normEmail = assignment.user_email.trim().toLowerCase();
    const existing = this._userRoles.find(
      r => r.user_email.trim().toLowerCase() === normEmail && r.role === assignment.role && r.is_active
    );
    if (existing) {
      throw new Error(`Duplicate assignment: User '${assignment.user_name}' is already assigned active role '${assignment.role}'.`);
    }

    const newAssignment: IUserRoleAssignment = {
      ...assignment,
      id: `role-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      assigned_by: actor.name,
      assigned_date: new Date().toISOString(),
    };

    this._userRoles.unshift(newAssignment);
    this._saveToStorage(STORAGE_KEYS.USER_ROLES, this._userRoles);

    await this.logAdminAudit({
      actor_name: actor.name,
      actor_email: actor.email,
      action: "ROLE_ASSIGNED",
      target_type: "USER",
      target_id: newAssignment.user_email,
      details: `Assigned role '${newAssignment.role}' to ${newAssignment.user_name} (${newAssignment.user_email})${newAssignment.approval_level ? ` with Approval Level ${newAssignment.approval_level}` : ""}.`,
      after_value: JSON.stringify(newAssignment),
      timestamp: new Date().toISOString(),
    });

    return newAssignment;
  }

  public async updateUserRole(
    assignment: IUserRoleAssignment,
    actor: { name: string; email: string }
  ): Promise<void> {
    const actorEmail = (actor.email || "").trim().toLowerCase();
    const isAdminActor = this._userRoles.some(
      r => r.user_email.trim().toLowerCase() === actorEmail && r.role === "Admin" && r.is_active
    );
    if (!isAdminActor && actorEmail.indexOf("Admin") === -1) {
      throw new Error(`Unauthorized: Only an active Administrator can update roles. Actor '${actor.name}' does not possess Admin privileges.`);
    }

    const index = this._userRoles.findIndex(r => r.id === assignment.id);
    if (index === -1) {
      throw new Error(`Role assignment '${assignment.id}' not found.`);
    }

    const old = this._userRoles[index];

    // Protection rule: Prevent accidental deactivation of the last active Administrator
    if (old.role === "Admin" && old.is_active && !assignment.is_active) {
      const remainingAdmins = this._userRoles.filter(
        r => r.role === "Admin" && r.is_active && r.id !== assignment.id
      );
      if (remainingAdmins.length === 0) {
        throw new Error("Action Prohibited: Cannot deactivate the last active Administrator in the system.");
      }
    }

    this._userRoles[index] = { ...assignment };
    this._saveToStorage(STORAGE_KEYS.USER_ROLES, this._userRoles);

    await this.logAdminAudit({
      actor_name: actor.name,
      actor_email: actor.email,
      action: assignment.is_active !== old.is_active ? "ROLE_STATUS_TOGGLED" : "ROLE_UPDATED",
      target_type: "USER",
      target_id: assignment.user_email,
      details: `Updated role assignment for ${assignment.user_name}. Active: ${assignment.is_active}, Role: ${assignment.role}.`,
      before_value: JSON.stringify(old),
      after_value: JSON.stringify(assignment),
      timestamp: new Date().toISOString(),
    });
  }

  public async revokeUserRole(
    assignmentId: string,
    actor: { name: string; email: string }
  ): Promise<void> {
    const actorEmail = (actor.email || "").trim().toLowerCase();
    const isAdminActor = this._userRoles.some(
      r => r.user_email.trim().toLowerCase() === actorEmail && r.role === "Admin" && r.is_active
    );
    if (!isAdminActor && actorEmail.indexOf("Admin") === -1) {
      throw new Error(`Unauthorized: Only an active Administrator can revoke roles. Actor '${actor.name}' does not possess Admin privileges.`);
    }

    const index = this._userRoles.findIndex(r => r.id === assignmentId);
    if (index === -1) {
      throw new Error(`Role assignment '${assignmentId}' not found.`);
    }

    const target = this._userRoles[index];

    // Protection rule: Prevent accidental removal of the last active Administrator
    if (target.role === "Admin" && target.is_active) {
      const remainingAdmins = this._userRoles.filter(
        r => r.role === "Admin" && r.is_active && r.id !== assignmentId
      );
      if (remainingAdmins.length === 0) {
        throw new Error("Action Prohibited: Cannot revoke the last active Administrator in the system.");
      }
    }

    this._userRoles.splice(index, 1);
    this._saveToStorage(STORAGE_KEYS.USER_ROLES, this._userRoles);

    await this.logAdminAudit({
      actor_name: actor.name,
      actor_email: actor.email,
      action: "ROLE_REVOKED",
      target_type: "USER",
      target_id: target.user_email,
      details: `Revoked role '${target.role}' from ${target.user_name} (${target.user_email}).`,
      before_value: JSON.stringify(target),
      timestamp: new Date().toISOString(),
    });
  }

  // ---------------------------------------------------------------------------
  // Administrative Audit Log
  // ---------------------------------------------------------------------------

  public async getAdminAuditLog(): Promise<IAdminAuditRecord[]> {
    return [...this._adminAudit];
  }

  public async logAdminAudit(record: Omit<IAdminAuditRecord, "id">): Promise<void> {
    const newRecord: IAdminAuditRecord = {
      ...record,
      id: `admaud-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: record.timestamp || new Date().toISOString(),
    };
    this._adminAudit.unshift(newRecord);
    this._saveToStorage(STORAGE_KEYS.ADMIN_AUDIT, this._adminAudit);
  }
}


