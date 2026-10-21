import React, { useState, useEffect } from "react";
import { ICERProps } from "./ICERProps";
import { ICERProposal } from "../models/CERModel";
import { IAppUser, DEMO_USERS } from "../models/UserModel";
import { INotificationLog } from "../models/WorkflowModel";
import { DataServiceFactory } from "../services/DataServiceFactory";
import { ICERDataService } from "../services/ICERDataService";

// Navigation
import { NavView } from "./navigation/Sidebar";
import { AppHeader } from "./navigation/AppHeader";

// Views
import { HomeView } from "./home/HomeView";
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
import { NotificationCenter } from "./common/NotificationCenter";
import { RemarksHistoryModal } from "./audit/RemarksHistoryModal";
import { UserManualModal } from "./manual/UserManualModal";

const CER: React.FC<ICERProps> = (props) => {
  const [dataService] = useState<ICERDataService>(() => DataServiceFactory.getService(props));
  const [proposals, setProposals] = useState<ICERProposal[]>([]);
  // Helper to parse current URL hash into view & proposalId for deep-linking
  const parseHash = (): { view: NavView; proposalId?: string } => {
    const rawHash = window.location.hash.replace(/^#\/?/, "");
    if (!rawHash) return { view: "dashboard" };
    const parts = rawHash.split("/");
    const viewName = parts[0] as NavView;
    const propId = parts.length > 1 ? decodeURIComponent(parts.slice(1).join("/")) : undefined;
    const validViews: NavView[] = [
      "dashboard",
      "create",
      "change",
      "my-proposals",
      "all-proposals",
      "pending-approvals",
      "approval-history",
      "display",
      "reports",
      "audit-trail",
      "workflow-config",
    ];
    if (validViews.indexOf(viewName) !== -1) {
      return { view: viewName, proposalId: propId };
    }
    return { view: "dashboard" };
  };

  const initialRoute = parseHash();
  const [currentView, setCurrentView] = useState<NavView>(initialRoute.view);
  const [activeProposalId, setActiveProposalId] = useState<string | undefined>(initialRoute.proposalId);
  // Full navigation history stack so clicking Cancel or Back returns to the exact previous view
  interface IHistoryEntry {
    view: NavView;
    proposalId?: string;
  }
  const [historyStack, setHistoryStack] = useState<IHistoryEntry[]>([]);

  // Track origin navigation view so when displaying/changing a proposal,
  // the corresponding parent list (e.g. "all-proposals" or "my-proposals") remains highlighted in the sidebar
  const [activeParentView, setActiveParentView] = useState<NavView>(() => {
    if (initialRoute.view === "display" || initialRoute.view === "change") {
      return "all-proposals";
    }
    return initialRoute.view;
  });

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

  // Mobile navigation drawer toggle
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  // Remarks History Modal
  const [remarksHistoryCerprno, setRemarksHistoryCerprno] = useState<string | null>(null);

  // User Manual Modal
  const [isUserManualOpen, setIsUserManualOpen] = useState(false);

  // Main scrollable container reference
  const mainScrollRef = React.useRef<HTMLElement | null>(null);

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

  // Listen to browser hash changes (Back / Forward button, manual URL changes)
  useEffect(() => {
    const handleHashChange = () => {
      const route = parseHash();
      setCurrentView(route.view);
      setActiveProposalId(route.proposalId);
      if (route.view !== "display" && route.view !== "change") {
        setActiveParentView(route.view);
      }
      if (mainScrollRef.current) {
        mainScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
      }
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
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

  const handleNavigate = (view: NavView, proposalId?: string, isBackNavigation: boolean = false): void => {
    if (!isBackNavigation) {
      // Record previous screen into history stack if it's a new screen
      if (currentView !== view || activeProposalId !== proposalId) {
        setHistoryStack((prev) => [...prev, { view: currentView, proposalId: activeProposalId }].slice(-25));
      }
    }

    if (view === "display" || view === "change") {
      // Retain parent list if navigating into proposal display or change
      if (currentView !== "display" && currentView !== "change") {
        setActiveParentView(currentView);
      }
    } else {
      setActiveParentView(view);
    }

    setCurrentView(view);
    setActiveProposalId(proposalId);
    // Sync browser address bar URL hash
    const targetHash = proposalId ? `#${view}/${encodeURIComponent(proposalId)}` : `#${view}`;
    if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  // Dedicated back / cancel handler that navigates back to where the user came from
  const handleGoBack = (): void => {
    if (historyStack.length > 0) {
      const prev = historyStack[historyStack.length - 1];
      setHistoryStack((prevStack) => prevStack.slice(0, -1));
      handleNavigate(prev.view, prev.proposalId, true);
      return;
    }

    // Fallback if no history recorded (e.g., user directly loaded or refreshed the URL)
    if (currentView === "change" && activeProposalId) {
      handleNavigate("display", activeProposalId, true);
    } else if (currentView === "display" || currentView === "change") {
      if (activeProposalId && proposals.length > 0) {
        const found = proposals.find((p) => p.cerprno === activeProposalId);
        if (
          found &&
          (found.owname.toLowerCase() === currentUser.name.toLowerCase() ||
            found.owner_email.toLowerCase() === currentUser.email.toLowerCase())
        ) {
          handleNavigate("my-proposals", undefined, true);
          return;
        }
      }
      const target =
        activeParentView && activeParentView !== "display" && activeParentView !== "change"
          ? activeParentView
          : "all-proposals";
      handleNavigate(target, undefined, true);
    } else if (currentView === "create") {
      const target =
        activeParentView && activeParentView !== "create" ? activeParentView : "dashboard";
      handleNavigate(target, undefined, true);
    } else if (currentView === "audit-trail") {
      if (activeProposalId) {
        handleNavigate("display", activeProposalId, true);
      } else {
        handleNavigate(
          activeParentView && activeParentView !== "audit-trail" ? activeParentView : "dashboard",
          undefined,
          true
        );
      }
    } else {
      handleNavigate("dashboard", undefined, true);
    }
  };

  const handleQuickSearch = (cerprno: string): void => {
    handleNavigate("display", cerprno);
  };

  // Compute active sidebar navigation item
  const getSidebarActiveView = (): NavView => {
    if (currentView === "display" || currentView === "change") {
      if (activeParentView && activeParentView !== "display" && activeParentView !== "change") {
        return activeParentView;
      }
      if (activeProposalId && proposals.length > 0) {
        const found = proposals.find((p) => p.cerprno === activeProposalId);
        if (
          found &&
          (found.owname.toLowerCase() === currentUser.name.toLowerCase() ||
            found.owner_email.toLowerCase() === currentUser.email.toLowerCase())
        ) {
          return "my-proposals";
        }
      }
      return "all-proposals";
    }
    return currentView;
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
    <div className="flex flex-col h-screen overflow-hidden bg-[#F8FAFC] font-sans text-slate-800 antialiased selection:bg-blue-600 selection:text-white">
      {/* Top Header matching reference screenshot */}
      <AppHeader
        currentUser={currentUser}
        currentView={currentView}
        onNavigate={handleNavigate}
        onGoBack={handleGoBack}
        canGoBack={historyStack.length > 0 || currentView !== "dashboard"}
        onSelectUser={(u) => setCurrentUser(u)}
        onOpenNotifications={() => setIsNotificationsOpen(true)}
        notificationCount={notifications.length}
      />

      {/* Main Content Area - Full Viewport Width */}
      <main
        ref={mainScrollRef as any}
        className={`flex-1 overflow-y-auto overflow-x-hidden w-full ${
          currentView === "dashboard" ? "p-0" : "p-3 sm:p-5 lg:p-6 2xl:p-8"
        }`}
      >
        {/* Active View Router */}
        {currentView === "dashboard" && (
          <HomeView
            currentUser={currentUser}
            onNavigate={handleNavigate}
            onOpenManual={() => setIsUserManualOpen(true)}
            pendingCount={pendingCount}
          />
        )}

        {currentView === "create" && (
          <CreateCERView
            dataService={dataService}
            currentUser={currentUser}
            onCancel={handleGoBack}
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
            onCancel={handleGoBack}
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
            onCancel={handleGoBack}
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
            onCancel={handleGoBack}
          />
        )}

        {currentView === "workflow-config" && (
          <WorkflowConfigView dataService={dataService} />
        )}
      </main>

      {/* Global Modals */}

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

      <UserManualModal
        isOpen={isUserManualOpen}
        onClose={() => setIsUserManualOpen(false)}
      />
    </div>
  );
};

export default CER;
