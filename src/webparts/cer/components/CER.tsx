import React, { useState, useEffect } from "react";
import { ICERProps } from "./ICERProps";
import { ICERProposal } from "../models/CERModel";
import { IAppUser, DEMO_USERS } from "../models/UserModel";
import { INotificationLog } from "../models/WorkflowModel";
import { DataServiceFactory } from "../services/DataServiceFactory";
import { ICERDataService } from "../services/ICERDataService";

// Navigation
import { Sidebar, NavView } from "./navigation/Sidebar";
import { TopNavbar } from "./navigation/TopNavbar";
import { Breadcrumbs } from "./navigation/Breadcrumbs";

// Views
import { DashboardView } from "./dashboard/DashboardView";
import { CreateCERView } from "./create/CreateCERView";
import { ChangeCERView } from "./change/ChangeCERView";
import { DisplayCERView } from "./display/DisplayCERView";
import { ProposalListView } from "./proposals/ProposalListView";
import { PendingApprovalsView } from "./workflow/PendingApprovalsView";
import { ApprovalHistoryView } from "./workflow/ApprovalHistoryView";
import { WorkflowConfigView } from "./workflow/WorkflowConfigView";
import { ReportsView } from "./reports/ReportsView";
import { AuditTrailView } from "./audit/AuditTrailView";

// Common Modals
import { CategoryDefinitionModal } from "./common/CategoryDefinitionModal";
import { NotificationCenter } from "./common/NotificationCenter";
import { RemarksHistoryModal } from "./audit/RemarksHistoryModal";

const CER: React.FC<ICERProps> = (props) => {
  const [dataService] = useState<ICERDataService>(() => DataServiceFactory.getService(props));
  const [proposals, setProposals] = useState<ICERProposal[]>([]);
  const [currentView, setCurrentView] = useState<NavView>("dashboard");
  const [activeProposalId, setActiveProposalId] = useState<string | undefined>(undefined);

  // Initialize current user from SharePoint context or default to Initiator demo persona
  const [currentUser, setCurrentUser] = useState<IAppUser>(() => {
    if (props.newcurrentUserName && props.newcurrentUserName.trim()) {
      return {
        id: props.newcurrentUserId || 101,
        name: props.newcurrentUserName,
        email: props.newcurrentUserEmail || "shiven.pandit@vedanta.co.in",
        role: "Initiator",
        department: "Subsurface & Drilling Projects",
      };
    }
    return DEMO_USERS[0];
  });

  // Notifications
  const [notifications, setNotifications] = useState<INotificationLog[]>([]);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

  // Category Modal
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  // Remarks History Modal
  const [remarksHistoryCerprno, setRemarksHistoryCerprno] = useState<string | null>(null);

  const loadInitialData = async (): Promise<void> => {
    try {
      const [propsList, notifs] = await Promise.all([
        dataService.getAllProposals(),
        dataService.getNotificationLogs(),
      ]);
      setProposals(propsList);
      setNotifications(notifs);
    } catch (e) {
      console.error("[CER] Error loading proposals:", e);
    }
  };

  useEffect(() => {
    loadInitialData().catch((e) => console.error(e));
  }, []);

  const handleRefreshProposals = async (): Promise<void> => {
    try {
      const [propsList, notifs] = await Promise.all([
        dataService.getAllProposals(),
        dataService.getNotificationLogs(),
      ]);
      setProposals(propsList);
      setNotifications(notifs);
    } catch (e) {
      console.error("[CER] Error refreshing proposals:", e);
    }
  };

  const handleNavigate = (view: NavView, proposalId?: string): void => {
    setCurrentView(view);
    setActiveProposalId(proposalId);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleQuickSearch = (cerprno: string): void => {
    handleNavigate("display", cerprno);
  };

  // Pending tasks count for badge
  const pendingCount = proposals.filter((p) => {
    if (p.status !== "In Approval") return false;
    if (currentUser.role === "Admin") return true;
    if (currentUser.role === "Approver") {
      return p.current_level === (currentUser.approval_level || 1);
    }
    return false;
  }).length;

  return (
    <div className="flex min-h-screen bg-slate-100 font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Enterprise Sidebar */}
      <Sidebar
        currentView={currentView}
        onNavigate={handleNavigate}
        userRole={currentUser.role}
        pendingApprovalsCount={pendingCount}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar */}
        <TopNavbar
          currentUser={currentUser}
          onSelectUser={(u) => setCurrentUser(u)}
          onOpenNotifications={() => setIsNotificationsOpen(true)}
          onOpenCategoryHelp={() => setIsCategoryModalOpen(true)}
          onQuickSearch={handleQuickSearch}
          notificationCount={notifications.length}
        />

        {/* View Container */}
        <main className="flex-1 p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {/* Breadcrumbs */}
          <Breadcrumbs
            currentView={currentView}
            proposalId={activeProposalId}
            onNavigate={(v) => handleNavigate(v)}
          />

          {/* Active View Router */}
          {currentView === "dashboard" && (
            <DashboardView
              proposals={proposals}
              currentUser={currentUser}
              onNavigate={handleNavigate}
            />
          )}

          {currentView === "create" && (
            <CreateCERView
              dataService={dataService}
              currentUser={currentUser}
              onCancel={() => handleNavigate("dashboard")}
              onSuccess={(cerprno) => {
                handleRefreshProposals().catch((e) => console.error(e));
                handleNavigate("display", cerprno);
              }}
            />
          )}

          {currentView === "change" && (
            <ChangeCERView
              dataService={dataService}
              currentUser={currentUser}
              initialProposalId={activeProposalId}
              onCancel={() => handleNavigate("dashboard")}
              onSuccess={(cerprno) => {
                handleRefreshProposals().catch((e) => console.error(e));
                handleNavigate("display", cerprno);
              }}
              onViewRemarksHistory={(cerprno) => setRemarksHistoryCerprno(cerprno)}
            />
          )}

          {currentView === "display" && (
            <DisplayCERView
              dataService={dataService}
              currentUser={currentUser}
              initialProposalId={activeProposalId}
              onCancel={() => handleNavigate("dashboard")}
              onNavigateToChange={(cerprno) => handleNavigate("change", cerprno)}
              onNavigateToAudit={(cerprno) => handleNavigate("audit-trail", cerprno)}
              onViewRemarksHistory={(cerprno) => setRemarksHistoryCerprno(cerprno)}
            />
          )}

          {currentView === "my-proposals" && (
            <ProposalListView
              proposals={proposals}
              currentUser={currentUser}
              mode="my"
              onNavigateToCreate={() => handleNavigate("create")}
              onNavigateToDisplay={(cerprno) => handleNavigate("display", cerprno)}
              onNavigateToChange={(cerprno) => handleNavigate("change", cerprno)}
            />
          )}

          {currentView === "all-proposals" && (
            <ProposalListView
              proposals={proposals}
              currentUser={currentUser}
              mode="all"
              onNavigateToCreate={() => handleNavigate("create")}
              onNavigateToDisplay={(cerprno) => handleNavigate("display", cerprno)}
              onNavigateToChange={(cerprno) => handleNavigate("change", cerprno)}
            />
          )}

          {currentView === "pending-approvals" && (
            <PendingApprovalsView
              dataService={dataService}
              currentUser={currentUser}
              onNavigateToDisplay={(cerprno) => handleNavigate("display", cerprno)}
              onRefreshProposals={handleRefreshProposals}
            />
          )}

          {currentView === "approval-history" && (
            <ApprovalHistoryView
              dataService={dataService}
              proposals={proposals}
              onNavigateToDisplay={(cerprno) => handleNavigate("display", cerprno)}
            />
          )}

          {currentView === "reports" && (
            <ReportsView
              proposals={proposals}
              currentUser={currentUser}
              onNavigateToDisplay={(cerprno) => handleNavigate("display", cerprno)}
              onNavigateToChange={(cerprno) => handleNavigate("change", cerprno)}
            />
          )}

          {currentView === "audit-trail" && (
            <AuditTrailView
              dataService={dataService}
              initialProposalId={activeProposalId}
              onNavigateToDisplay={(cerprno) => handleNavigate("display", cerprno)}
            />
          )}

          {currentView === "workflow-config" && (
            <WorkflowConfigView dataService={dataService} />
          )}
        </main>
      </div>

      {/* Global Modals */}
      <CategoryDefinitionModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />

      <NotificationCenter
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        notifications={notifications}
      />

      {remarksHistoryCerprno && (
        <RemarksHistoryModal
          isOpen={!!remarksHistoryCerprno}
          onClose={() => setRemarksHistoryCerprno(null)}
          cerprno={remarksHistoryCerprno}
          dataService={dataService}
        />
      )}
    </div>
  );
};

export default CER;
