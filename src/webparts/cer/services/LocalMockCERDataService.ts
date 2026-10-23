import { ICERDataService } from "./ICERDataService";
import { ICERProposal, IFieldChoices, DEFAULT_FIELD_CHOICES } from "../models/CERModel";
import { ICERAuditRecord, ICERRemarksVersion, AUDIT_FIELD_DESCRIPTIONS, EXCLUDED_AUDIT_FIELDS } from "../models/AuditModel";
import { IWorkflowLevel, IApprovalDecision, INotificationLog } from "../models/WorkflowModel";
import { ICERAttachment } from "../models/AttachmentModel";
import { IDirectoryUser, MOCK_DIRECTORY_USERS, IUserRoleAssignment, IAdminAuditRecord } from "../models/UserModel";
import { validateAttachment } from "../utils/attachmentValidation";

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
    user_name: "Shiven Pandit",
    user_email: "70007144@cairnindia.com",
    login_name: "70007144@cairnindia.com",
    role: "Admin",
    department: "Digital",
    sbu: "RJ North",
    is_active: true,
    assigned_by: "System Bootstrap",
    assigned_date: "2026-10-23T18:30:00Z",
  },
];

const DEFAULT_WORKFLOW_LEVELS: IWorkflowLevel[] = [
  {
    level_id: 1,
    level_name: "L1 - Technical & SBU Review",
    role_title: "SBU Operations Head",
    approver_name: "Rajesh Sharma",
    approver_email: "rajesh.sharma@vedanta.co.in",
    is_active: true
  },
  {
    level_id: 2,
    level_name: "L2 - Commercial & Financial Review",
    role_title: "Head of Corporate Finance",
    approver_name: "Sunil Verma",
    approver_email: "sunil.verma@vedanta.co.in",
    is_active: true
  },
  {
    level_id: 3,
    level_name: "L3 - Executive Committee Sign-off",
    role_title: "Executive Committee / VP",
    approver_name: "Ananya Deshmukh",
    approver_email: "ananya.deshmukh@vedanta.co.in",
    is_active: true
  }
];

const SEED_PROPOSALS: ICERProposal[] = [
  {
    id: "prop-001",
    cerprno: "CER-2026-0001",
    pr_name: "Mangala Polymer EOR Expansion Phase 4",
    owname: "Shiven Pandit",
    owner_email: "shiven.pandit@vedanta.co.in",
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
    ph_till_label: "Till Mar'26",
    ph_fy_label: "FY 26-27",
    ph_beyond_label: "Beyond FY'27",
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
    created_date: "2026-03-10T10:15:00Z",
    created_by: "Shiven Pandit",
    modified_date: "2026-03-12T14:30:00Z",
    modified_by: "Rajesh Sharma",
    revision_count: 1
  },
  {
    id: "prop-002",
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
    ph_till_label: "Till Mar'26",
    ph_fy_label: "FY 26-27",
    ph_beyond_label: "Beyond FY'27",
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
    ph_till_label: "Till Mar'26",
    ph_fy_label: "FY 26-27",
    ph_beyond_label: "Beyond FY'27",
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
            user_name: "Shiven Pandit",
            user_email: "shiven.pandit@vedanta.co.in",
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
            user_name: "Shiven Pandit",
            user_email: "shiven.pandit@vedanta.co.in",
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
            user_name: "Shiven Pandit",
            user_email: "shiven.pandit@vedanta.co.in",
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
            created_by: "Shiven Pandit",
            created_date: "2026-03-10T10:15:00Z"
          },
          {
            id: "rem-002",
            cerprno: "CER-2026-0001",
            version: 2,
            remarks_text: SEED_PROPOSALS[0].remarks,
            remarks_type: "REMARKS",
            word_count: SEED_PROPOSALS[0].remarks.split(/\s+/).filter(Boolean).length,
            created_by: "Shiven Pandit",
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
            uploaded_by: "Shiven Pandit",
            uploaded_date: "2026-03-10T10:18:00Z"
          },
          {
            id: "att-002",
            cerprno: "CER-2026-0001",
            name: "ONGC_Partner_OCM48_Consent_Resolution.pdf",
            size: 1120000,
            type: "application/pdf",
            uploaded_by: "Shiven Pandit",
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
        // Ensure 70007144@cairnindia.com is always present as an active Admin
        const has70007144 = this._userRoles.some(
          r => (r.user_email && r.user_email.toLowerCase() === "70007144@cairnindia.com") ||
               (r.login_name && r.login_name.toLowerCase() === "70007144@cairnindia.com")
        );
        if (!has70007144) {
          this._userRoles.unshift({
            id: "1",
            user_name: "Shiven Pandit",
            user_email: "70007144@cairnindia.com",
            login_name: "70007144@cairnindia.com",
            role: "Admin",
            department: "Digital",
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
            actor_email: "security@vedanta.co.in",
            action: "ROLE_ASSIGNED",
            target_type: "USER",
            target_id: "role-001",
            details: "Initial bootstrap: Assigned Administrator role to Shiven Pandit (70007144@cairnindia.com).",
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
    const trimmed = cerprno.trim().toUpperCase();
    const found = this._proposals.find(p => p.cerprno.toUpperCase() === trimmed);
    return found ? { ...found } : null;
  }

  public async generateProposalNumber(): Promise<string> {
    const year = new Date().getFullYear();
    const count = this._proposals.length + 1;
    const formatted = `CER-${year}-${("0000" + count).slice(-4)}`;
    return formatted;
  }

  public async createProposal(proposal: ICERProposal): Promise<{ success: boolean; message: string; proposal: ICERProposal }> {
    // Validate uniqueness
    const exists = this._proposals.some(p => p.cerprno.toUpperCase() === proposal.cerprno.toUpperCase());
    if (exists) {
      throw new Error(`Proposal Number ${proposal.cerprno} already exists. Please enter or generate a unique proposal number.`);
    }

    const now = new Date().toISOString();
    const activeL1 = this._workflowLevels.find(l => l.level_id === 1 && l.is_active) || this._workflowLevels[0];

    const isDraft = proposal.status === "Draft";
    const newProposal: ICERProposal = {
      ...proposal,
      id: proposal.id || `prop-${Date.now()}`,
      status: proposal.status || "In Approval",
      current_level: isDraft ? 0 : 1,
      pending_with_role: isDraft ? "Draft" : (activeL1 ? activeL1.role_title : "L1 Approver"),
      pending_with_email: isDraft ? "" : (activeL1 ? activeL1.approver_email : ""),
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
    const isPostApprovalRevision = (oldProposal.status as string) === "Approved";

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
      userEmail.indexOf("admin") !== -1 ||
      userEmail.indexOf("auditor") !== -1;

    if (!isAuthorizedActor) {
      throw new Error(`Unauthorized: Only the designated CER Owner (${oldProposal.owname}) or Administrator can edit this proposal.`);
    }

    const now = new Date();
    const dateStr = now.toISOString().split("T")[0];
    const timeStr = now.toTimeString().split(" ")[0];

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
    if (oldProposal.remarks.trim() !== updatedProposal.remarks.trim()) {
      const existingVersions = this._remarksHistory.filter(r => r.cerprno === updatedProposal.cerprno);
      const nextVer = existingVersions.length + 1;
      const remarksRecord: ICERRemarksVersion = {
        id: `rem-${Date.now()}`,
        cerprno: updatedProposal.cerprno,
        version: nextVer,
        remarks_text: updatedProposal.remarks,
        remarks_type: "REMARKS",
        word_count: updatedProposal.remarks.split(/\s+/).filter(Boolean).length,
        created_by: user.name,
        created_date: now.toISOString()
      };
      this._remarksHistory.unshift(remarksRecord);
      this._saveToStorage(STORAGE_KEYS.REMARKS_HISTORY, this._remarksHistory);
    }

    // Workflow re-triggering logic
    const activeL1 = this._workflowLevels.find(l => l.level_id === 1 && l.is_active) || this._workflowLevels[0];

    const savedProposal: ICERProposal = {
      ...updatedProposal,
      status: isPostApprovalRevision ? "Revised" : "In Approval",
      current_level: 1,
      pending_with_role: activeL1 ? activeL1.role_title : "L1 Approver",
      pending_with_email: activeL1 ? activeL1.approver_email : "",
      modified_date: now.toISOString(),
      modified_by: user.name,
      revision_count: (oldProposal.revision_count || 0) + 1
    };

    this._proposals[index] = savedProposal;
    this._saveToStorage(STORAGE_KEYS.PROPOSALS, this._proposals);

    // Notify stakeholders
    const recipients = [savedProposal.owner_email];
    if (activeL1?.approver_email) recipients.push(activeL1.approver_email);

    this._recordNotification({
      cerprno: savedProposal.cerprno,
      recipients,
      subject: `[CER Modified] Proposal ${savedProposal.cerprno} - Changed & Resubmitted`,
      body: `CER Proposal ${savedProposal.cerprno} has been modified by ${user.name} (${auditRows.length} fields changed) and resubmitted for approval workflow starting at Level 1.`,
      attachments_count: this._attachments.filter(a => a.cerprno === savedProposal.cerprno).length
    });

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
      return this._auditTrail.filter(a => a.cerprno.toUpperCase() === trimmed);
    }
    return [...this._auditTrail];
  }

  public async getRemarksHistory(cerprno: string): Promise<ICERRemarksVersion[]> {
    const trimmed = cerprno.trim().toUpperCase();
    return this._remarksHistory.filter(r => r.cerprno.toUpperCase() === trimmed);
  }

  public async getWorkflowLevels(): Promise<IWorkflowLevel[]> {
    return [...this._workflowLevels];
  }

  public async saveWorkflowLevels(levels: IWorkflowLevel[]): Promise<void> {
    this._workflowLevels = [...levels];
    this._saveToStorage(STORAGE_KEYS.WORKFLOW_LEVELS, this._workflowLevels);
  }

  public async getApprovalDecisions(cerprno: string): Promise<IApprovalDecision[]> {
    const trimmed = cerprno.trim().toUpperCase();
    return this._decisions.filter(d => d.cerprno.toUpperCase() === trimmed);
  }

  public async recordDecision(params: {
    cerprno: string;
    level_id: number;
    approver_name: string;
    approver_email: string;
    decision: "APPROVED" | "REJECTED";
    comments: string;
  }): Promise<{ success: boolean; newStatus: string; nextLevel: number }> {
    const propIndex = this._proposals.findIndex(p => p.cerprno.toUpperCase() === params.cerprno.toUpperCase());
    if (propIndex === -1) {
      throw new Error(`Proposal ${params.cerprno} not found`);
    }

    const proposal = this._proposals[propIndex];

    // Enterprise RBAC: Segregation of Duties - Initiator/Owner CANNOT approve their own CER
    const approverEmail = (params.approver_email || "").trim().toLowerCase();
    const ownerEmail = (proposal.owner_email || "").trim().toLowerCase();
    const isEmailMatch = approverEmail && ownerEmail && approverEmail === ownerEmail;

    const approverName = (params.approver_name || "").trim().toLowerCase();
    const ownerName = (proposal.owname || "").trim().toLowerCase();
    const isNameMatch = approverName && ownerName && approverName === ownerName;

    if (isEmailMatch || isNameMatch) {
      throw new Error("Segregation of Duties Enforcement: You cannot approve a CER proposal that you initiated.");
    }

    if (params.level_id !== proposal.current_level) {
      throw new Error(`Approval Level Mismatch: Proposal is currently pending at Level ${proposal.current_level}, cannot record decision for Level ${params.level_id}.`);
    }

    const now = new Date().toISOString();

    const currentLevelConfig = this._workflowLevels.find(l => l.level_id === params.level_id);
    const levelName = currentLevelConfig ? currentLevelConfig.level_name : `Level ${params.level_id}`;

    // Record decision
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

    const activeLevels = this._workflowLevels.filter(l => l.is_active).sort((a, b) => a.level_id - b.level_id);
    const nextLevelConfig = activeLevels.find(l => l.level_id > params.level_id);

    // Collect all prior approver emails for email notification visibility rule (Doc §8 #4)
    const priorDecisions = this._decisions.filter(d => d.cerprno === proposal.cerprno);
    const priorEmails = Array.from(new Set(priorDecisions.map(d => d.approver_email)));
    const notificationRecipients = [proposal.owner_email, ...priorEmails];

    if (params.decision === "APPROVED") {
      if (nextLevelConfig) {
        // Move to next approval level
        nextLevelId = nextLevelConfig.level_id;
        proposal.current_level = nextLevelId;
        proposal.pending_with_role = nextLevelConfig.role_title;
        proposal.pending_with_email = nextLevelConfig.approver_email;
        proposal.status = "In Approval";
        newStatus = "In Approval";

        if (nextLevelConfig.approver_email) {
          notificationRecipients.push(nextLevelConfig.approver_email);
        }

        this._recordNotification({
          cerprno: proposal.cerprno,
          recipients: Array.from(new Set(notificationRecipients)),
          subject: `[CER Approved Level ${params.level_id}] Proposal ${proposal.cerprno} Advanced to ${nextLevelConfig.level_name}`,
          body: `Level ${params.level_id} approved by ${params.approver_name}. Comments: "${params.comments}". Proposal is now pending action from ${nextLevelConfig.role_title} (${nextLevelConfig.approver_name}).`,
          attachments_count: this._attachments.filter(a => a.cerprno === proposal.cerprno).length
        });
      } else {
        // Final Level Approved!
        nextLevelId = activeLevels.length + 1;
        proposal.current_level = nextLevelId;
        proposal.pending_with_role = "Approved";
        proposal.pending_with_email = "";
        proposal.status = "Approved";
        newStatus = "Approved";

        this._recordNotification({
          cerprno: proposal.cerprno,
          recipients: Array.from(new Set(notificationRecipients)),
          subject: `[CER Final Approval] Proposal ${proposal.cerprno} Fully Approved`,
          body: `CER Proposal ${proposal.cerprno} (${proposal.pr_name}) has completed all approval levels and is now officially APPROVED. Final sign-off by ${params.approver_name}.`,
          attachments_count: this._attachments.filter(a => a.cerprno === proposal.cerprno).length
        });
      }
    } else {
      // REJECTED
      proposal.status = "Rejected";
      proposal.pending_with_role = "Returned to Initiator";
      proposal.pending_with_email = proposal.owner_email;
      newStatus = "Rejected";

      this._recordNotification({
        cerprno: proposal.cerprno,
        recipients: Array.from(new Set(notificationRecipients)),
        subject: `[CER Rejected] Proposal ${proposal.cerprno} Rejected by ${params.approver_name}`,
        body: `CER Proposal ${proposal.cerprno} has been REJECTED at Level ${params.level_id} by ${params.approver_name}. Rejection reason: "${params.comments}". Proposal returned to initiator.`,
        attachments_count: this._attachments.filter(a => a.cerprno === proposal.cerprno).length
      });
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
    return this._attachments.filter(a => a.cerprno.toUpperCase() === trimmed);
  }

  public async addAttachment(attachment: ICERAttachment): Promise<void> {
    const existing = await this.getAttachments(attachment.cerprno);
    const existingSize = existing.reduce((sum, a) => sum + (a.size || 0), 0);

    const validation = validateAttachment(
      attachment,
      existingSize,
      existing.map((a) => a.name)
    );
    if (!validation.isValid) {
      throw new Error(`[Attachment Policy Violation] ${validation.error}`);
    }

    this._attachments.push(attachment);
    this._saveToStorage(STORAGE_KEYS.ATTACHMENTS, this._attachments);
  }

  public async deleteAttachment(id: string): Promise<void> {
    this._attachments = this._attachments.filter(a => a.id !== id);
    this._saveToStorage(STORAGE_KEYS.ATTACHMENTS, this._attachments);
  }

  public async getNotificationLogs(cerprno?: string): Promise<INotificationLog[]> {
    if (cerprno) {
      const trimmed = cerprno.trim().toUpperCase();
      return this._notifications.filter(n => n.cerprno.toUpperCase() === trimmed);
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

  // ---------------------------------------------------------------------------
  // Role-Based Access Control (RBAC) & User Role Management
  // ---------------------------------------------------------------------------

  public async getUserRoles(): Promise<IUserRoleAssignment[]> {
    return [...this._userRoles];
  }

  public async assignUserRole(
    assignment: Omit<IUserRoleAssignment, "id">,
    actor: { name: string; email: string }
  ): Promise<IUserRoleAssignment> {
    const actorEmail = (actor.email || "").trim().toLowerCase();
    const isAdminActor = this._userRoles.some(
      r => r.user_email.trim().toLowerCase() === actorEmail && r.role === "Admin" && r.is_active
    );
    if (!isAdminActor && actorEmail.indexOf("admin") === -1 && actor.name !== "SYSTEM_INITIAL_BOOTSTRAP") {
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
    if (!isAdminActor && actorEmail.indexOf("admin") === -1) {
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
    if (!isAdminActor && actorEmail.indexOf("admin") === -1) {
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


