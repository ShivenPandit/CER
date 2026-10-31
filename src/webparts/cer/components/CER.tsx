import React, { useState, useEffect } from "react";
import { ICERProps } from "./ICERProps";
import { ICERProposal, IFieldChoices, DEFAULT_FIELD_CHOICES } from "../models/CERModel";
import { IAppUser } from "../models/UserModel";
import { INotificationLog, IWorkflowLevel } from "../models/WorkflowModel";
import { DataServiceFactory } from "../services/DataServiceFactory";
import { ICERDataService } from "../services/ICERDataService";
import { AuthService } from "../services/AuthService";
import { PermissionService } from "../services/PermissionService";

// Navigation
import { NavView } from "./Navigation/Sidebar";
import { AppHeader } from "./Navigation/AppHeader";

// Views
import { HomeView } from "./Home/HomeView";
import { CreateCERView } from "./CreateCER/CreateCERView";
import { ChangeCERView } from "./ChangeCER/ChangeCERView";
import { DisplayCERView } from "./DisplayCER/DisplayCERView";
import { ProposalListView } from "./MyProposals/ProposalListView";
import { CERSubmissionsView } from "./MyProposals/CERSubmissionsView";
import { PendingApprovalsView } from "./PendingApprovals/PendingApprovalsView";
import { ApprovalHistoryView } from "./ApprovalWorkflow/ApprovalHistoryView";
import { AdminConsoleView } from "./Admin/AdminConsoleView";
import { ReportsView } from "./Reports/ReportsView";
import { AuditTrailView } from "./Audit/AuditTrailView";

// Common Modals
import { AccessDeniedView } from "./Shared/AccessDeniedView";
import { UserManualModal } from "./UserManual/UserManualModal";

const CER: React.FC<ICERProps> = (props) => {
  const [dataService] = useState<ICERDataService>(() => DataServiceFactory.getService(props));
  const [proposals, setProposals] = useState<ICERProposal[]>([]);
  const [workflowLevels, setWorkflowLevels] = useState<IWorkflowLevel[]>([]);
  const [fieldChoices, setFieldChoices] = useState<IFieldChoices>(DEFAULT_FIELD_CHOICES);
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
      "cer-submissions",
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

  // Initialize current user from authenticated SharePoint context
  const [currentUser, setCurrentUser] = useState<IAppUser>(() => {
    const rawEmail = (props.newcurrentUserEmail || "").trim();
    const rawLogin = (props.newcurrentUserLoginName || "").trim();
    const hasIdentity = Boolean(rawEmail || rawLogin);
    return {
      id: props.newcurrentUserId || 0,
      name: props.newcurrentUserName || (hasIdentity ? "Authenticated Portal User" : "Unauthenticated User"),
      email: rawEmail,
      loginName: rawLogin,
      role: "Initiator",
      roles: hasIdentity ? ["Initiator"] : [],
      is_active: hasIdentity,
      department: "CER Management Portal",
      sbu: undefined,
      isSiteAdmin: !!props.newisSiteAdmin,
    };
  });

  // Resolve user's actual roles from CERUserRoles with controlled first-Admin bootstrapping
  useEffect(() => {
    let isMounted = true;
    const resolveSecurityContext = async () => {
      try {
        const resolution = await AuthService.resolveCurrentUser(
          {
            id: props.newcurrentUserId || 1,
            name: props.newcurrentUserName || "SharePoint User",
            email: props.newcurrentUserEmail || "",
            loginName: props.newcurrentUserLoginName || "",
            isSiteAdmin: props.newisSiteAdmin || false,
          },
          dataService
        );
        if (isMounted) {
          setCurrentUser(resolution.user);
        }
      } catch (err) {
        console.error("[CER] Error resolving user role context:", err);
      }
    };

    resolveSecurityContext().catch((e) => console.error(e));
    return () => {
      isMounted = false;
    };
  }, [
    props.newcurrentUserId,
    props.newcurrentUserName,
    props.newcurrentUserEmail,
    props.newcurrentUserLoginName,
    props.newisSiteAdmin,
    dataService,
  ]);

  // Notifications
  const [notifications, setNotifications] = useState<INotificationLog[]>([]);

  // User Manual Modal
  const [isUserManualOpen, setIsUserManualOpen] = useState(false);

  // Main scrollable container reference
  const mainScrollRef = React.useRef<HTMLElement | null>(null);

  const loadInitialData = async (): Promise<void> => {
    try {
      const [propsList, notifs, choices, levels] = await Promise.all([
        dataService.getAllProposals(),
        dataService.getNotificationLogs(),
        dataService.getFieldChoices(),
        dataService.getWorkflowLevels(),
      ]);
      setProposals(propsList);
      setNotifications(notifs);
      if (choices) {
        setFieldChoices(choices);
      }
      if (levels) {
        setWorkflowLevels(levels);
      }
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
      const spScrollRegion = document.querySelector('div[data-automation-id="contentScrollRegion"]');
      if (spScrollRegion && typeof (spScrollRegion as any).scrollTo === "function") {
        (spScrollRegion as any).scrollTo({ top: 0, behavior: "smooth" });
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  const handleRefreshProposals = async (): Promise<void> => {
    try {
      const [propsList, notifs, levels] = await Promise.all([
        dataService.getAllProposals(),
        dataService.getNotificationLogs(),
        dataService.getWorkflowLevels(),
      ]);
      setProposals(propsList);
      setNotifications(notifs);
      if (levels) {
        setWorkflowLevels(levels);
      }
    } catch (e) {
      console.error("[CER] Error refreshing proposals:", e);
    }
  };

  const handleNavigate = (
    view: NavView,
    proposalId?: string,
    isBackNavigation: boolean = false,
    replaceHistory: boolean = false
  ): void => {
    if (!isBackNavigation && !replaceHistory) {
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
    if (replaceHistory && window.history && window.history.replaceState) {
      window.history.replaceState(null, "", targetHash);
    } else if (window.location.hash !== targetHash) {
      window.location.hash = targetHash;
    }
    const spScrollRegion = document.querySelector('div[data-automation-id="contentScrollRegion"]');
    if (spScrollRegion && typeof (spScrollRegion as any).scrollTo === "function") {
      (spScrollRegion as any).scrollTo({ top: 0, behavior: "smooth" });
    }
    if (mainScrollRef.current && typeof (mainScrollRef.current as any).scrollTo === "function") {
      (mainScrollRef.current as any).scrollTo({ top: 0, behavior: "smooth" });
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // Dedicated back / cancel handler that navigates back to where the user came from
  const handleGoBack = (): void => {
    if (historyStack.length > 0) {
      const prev = historyStack[historyStack.length - 1];
      setHistoryStack((prevStack) => prevStack.slice(0, -1));
      // If previous entry was create or change (a submitted or locked form), do not return to it - redirect to Home
      if (prev.view === "create" || prev.view === "change") {
        handleNavigate("dashboard", undefined, true);
        return;
      }
      handleNavigate(prev.view, prev.proposalId, true);
      return;
    }

    // Fallback if no history recorded (e.g., user directly loaded or refreshed the URL)
    if (currentView === "change" || currentView === "create") {
      handleNavigate("dashboard", undefined, true);
    } else if (currentView === "display") {
      if (activeParentView && activeParentView !== "display" && activeParentView !== "change") {
        handleNavigate(activeParentView, undefined, true);
      } else {
        handleNavigate("dashboard", undefined, true);
      }
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

  // Pending tasks count for badge
  const pendingCount = React.useMemo(() => {
    return proposals.filter((p) => {
      if (p.status !== "In Approval") return false;
      const propSbu = (p.sbu || "").trim().toLowerCase();
      const stageConfig = workflowLevels.find(
        (l) =>
          (l.sbu || "").trim().toLowerCase() === propSbu &&
          l.level_id === p.current_level
      );
      return PermissionService.canApproveCER(p, currentUser, stageConfig).allowed;
    }).length;
  }, [proposals, workflowLevels, currentUser]);

  // Check if current user is owner of at least one proposal
  const hasOwnedProposals = React.useMemo(() => {
    return proposals.some((p) => PermissionService.isProposalOwner(p, currentUser));
  }, [proposals, currentUser]);

  // Measure actual available application height after accounting for the SharePoint host page and header
  const appRootRef = React.useRef<HTMLDivElement | null>(null);
  const [availableHeight, setAvailableHeight] = useState<number | undefined>(undefined);

  useEffect(() => {
    const updateAvailableHeight = (): void => {
      // On dashboard in full-bleed mode, use the full viewport height to eliminate bottom blank space
      const h = window.innerHeight;
      if (h > 350) {
        setAvailableHeight(h);
      }
    };

    updateAvailableHeight();
    window.addEventListener("resize", updateAvailableHeight);
    const t = setTimeout(updateAvailableHeight, 150);
    return () => {
      window.removeEventListener("resize", updateAvailableHeight);
      clearTimeout(t);
    };
  }, [currentView]);

  // Ensure scroll is reset to top on view changes and suppress outer scrollbar on dashboard when content fits
  useEffect(() => {
    try {
      window.scrollTo(0, 0);
      if (document.documentElement) document.documentElement.scrollTop = 0;
      if (document.body) document.body.scrollTop = 0;
      const scrollRegion = document.querySelector('div[data-automation-id="contentScrollRegion"]');
      if (scrollRegion) scrollRegion.scrollTop = 0;
      const chromeApp = document.querySelector("#spPageChromeAppDiv");
      if (chromeApp) chromeApp.scrollTop = 0;
      if (mainScrollRef.current) mainScrollRef.current.scrollTop = 0;
    } catch {
      // ignore
    }

    const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;
    const isDashboard = currentView === "dashboard";
    const shouldSuppressScroll = isDashboard && !isMobile && window.innerHeight >= 550;

    const scrollContainers: (HTMLElement | null)[] = [
      document.documentElement,
      document.body,
      document.querySelector('div[data-automation-id="contentScrollRegion"]') as HTMLElement,
      document.querySelector("#spPageChromeAppDiv") as HTMLElement,
      document.querySelector("#workbenchPageContent") as HTMLElement,
    ];

    if (shouldSuppressScroll) {
      document.documentElement.classList.add("cer-dashboard-no-scroll");
      document.body.classList.add("cer-dashboard-no-scroll");
      scrollContainers.forEach((el) => {
        if (el) {
          el.style.setProperty("overflow-y", "hidden", "important");
          el.style.setProperty("overflow-x", "hidden", "important");
          el.scrollTop = 0;
        }
      });
    } else {
      document.documentElement.classList.remove("cer-dashboard-no-scroll");
      document.body.classList.remove("cer-dashboard-no-scroll");
      scrollContainers.forEach((el) => {
        if (el) {
          el.style.setProperty("overflow-y", "auto", "important");
          el.style.setProperty("overflow-x", "hidden", "important");
        }
      });
    }

    return () => {
      document.documentElement.classList.remove("cer-dashboard-no-scroll");
      document.body.classList.remove("cer-dashboard-no-scroll");
    };
  }, [currentView, availableHeight]);

  const isMobile = typeof window !== "undefined" ? window.innerWidth < 768 : false;

  return (
    <div
      ref={appRootRef}
      id="cer-app-root"
      style={{
        height: currentView === "dashboard" && !isMobile ? "100vh" : undefined,
        minHeight: currentView === "dashboard" && !isMobile ? "100vh" : "100%",
        maxHeight: currentView === "dashboard" && !isMobile ? "100vh" : undefined,
        overflow: currentView === "dashboard" && !isMobile ? "hidden" : "visible",
        backgroundColor: "#F8FAFC",
      }}
      className="flex flex-col flex-1 w-full max-w-none bg-[#F8FAFC] font-sans text-slate-800 antialiased selection:bg-[#012964] selection:text-white"
    >
      {/* Top Header matching reference screenshot */}
      <AppHeader
        currentUser={currentUser}
        currentView={currentView}
        onNavigate={handleNavigate}
        onGoBack={handleGoBack}
        canGoBack={historyStack.length > 0 || currentView !== "dashboard"}
        onSelectUser={(u) => setCurrentUser(u)}
      />

      {/* Main Content Area - Full Document Flow with Natural Scrolling */}
      <main
        ref={mainScrollRef as any}
        id="cer-main-scroll"
        style={{ backgroundColor: "#F8FAFC" }}
        className={`w-full max-w-none min-w-0 flex-1 flex flex-col ${
          currentView === "dashboard" ? "p-0 min-h-0 h-full overflow-hidden" : "p-3 sm:p-5 lg:p-6 2xl:p-8"
        }`}
      >
        {/* Active View Router */}
        {currentView === "dashboard" && (
          <HomeView
            currentUser={currentUser}
            onNavigate={handleNavigate}
            onOpenManual={() => setIsUserManualOpen(true)}
            pendingCount={pendingCount}
            availableHeight={availableHeight}
            hasOwnedProposals={hasOwnedProposals}
          />
        )}

        {currentView === "create" && (
          PermissionService.canCreateCER(currentUser) ? (
            <CreateCERView
              dataService={dataService}
              currentUser={currentUser}
              fieldChoices={fieldChoices}
              onCancel={handleGoBack}
              onSuccess={(cerprno) => {
                handleRefreshProposals().catch((e) => console.error(e));
                setHistoryStack([{ view: "dashboard" }]);
                setActiveParentView("dashboard");
                handleNavigate("display", cerprno, false, true);
              }}
            />
          ) : (
            <AccessDeniedView
              currentUser={currentUser}
              attemptedView="create"
              customMessage="You do not possess the required Initiator or Admin privileges to create capital expenditure proposals."
              onGoHome={handleGoBack}
            />
          )
        )}

        {currentView === "change" && (
          <ChangeCERView
            dataService={dataService}
            currentUser={currentUser}
            fieldChoices={fieldChoices}
            initialProposalId={activeProposalId}
            onCancel={handleGoBack}
            onSuccess={(cerprno) => {
              handleRefreshProposals().catch((e) => console.error(e));
              setHistoryStack([{ view: "dashboard" }]);
              setActiveParentView("dashboard");
              handleNavigate("display", cerprno, false, true);
            }}
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
          />
        )}

        {currentView === "my-proposals" && (
          PermissionService.canAccessView("my-proposals", currentUser, hasOwnedProposals) ? (
            <ProposalListView
              proposals={proposals}
              currentUser={currentUser}
              mode="my"
              onNavigateToCreate={() => handleNavigate("create")}
              onNavigateToDisplay={(cerprno) => handleNavigate("display", cerprno)}
              onNavigateToChange={(cerprno) => handleNavigate("change", cerprno)}
              onNavigateToSubmissions={(cerId) => handleNavigate("cer-submissions", cerId)}
              onCancel={handleGoBack}
            />
          ) : (
            <AccessDeniedView
              currentUser={currentUser}
              attemptedView="my-proposals"
              customMessage="The My CER Requests view is reserved for Initiators, Administrators, and authorized CER Owners."
              onGoHome={handleGoBack}
            />
          )
        )}

        {currentView === "all-proposals" && (
          <ProposalListView
            proposals={proposals}
            currentUser={currentUser}
            mode="all"
            onNavigateToCreate={() => handleNavigate("create")}
            onNavigateToDisplay={(cerprno) => handleNavigate("display", cerprno)}
            onNavigateToChange={(cerprno) => handleNavigate("change", cerprno)}
            onNavigateToSubmissions={(cerId) => handleNavigate("cer-submissions", cerId)}
            onCancel={handleGoBack}
          />
        )}

        {currentView === "cer-submissions" && (
          <CERSubmissionsView
            cerProposalId={activeProposalId || ""}
            dataService={dataService}
            currentUser={currentUser}
            onNavigateToDisplay={(cerprno) => handleNavigate("display", cerprno)}
            onNavigateToChange={(cerprno) => handleNavigate("change", cerprno)}
            onBack={handleGoBack}
          />
        )}

        {currentView === "pending-approvals" && (
          PermissionService.canAccessView("pending-approvals", currentUser, hasOwnedProposals, pendingCount > 0) ? (
            <PendingApprovalsView
              dataService={dataService}
              currentUser={currentUser}
              initialProposals={proposals}
              initialWorkflowLevels={workflowLevels}
              onNavigateToDisplay={(cerprno) => handleNavigate("display", cerprno)}
              onRefreshProposals={handleRefreshProposals}
              onCancel={handleGoBack}
            />
          ) : (
            <AccessDeniedView
              currentUser={currentUser}
              attemptedView="pending-approvals"
              customMessage="You do not possess the required Approver or Admin privileges to view pending approval queues."
              onGoHome={handleGoBack}
            />
          )
        )}

        {currentView === "approval-history" && (
          <ApprovalHistoryView
            dataService={dataService}
            proposals={proposals}
            onNavigateToDisplay={(cerprno) => handleNavigate("display", cerprno)}
            onCancel={handleGoBack}
          />
        )}

        {currentView === "reports" && (
          PermissionService.canAccessView("reports", currentUser) ? (
            <ReportsView
              dataService={dataService}
              proposals={proposals}
              currentUser={currentUser}
              fieldChoices={fieldChoices}
              onNavigateToDisplay={(cerprno) => handleNavigate("display", cerprno)}
              onNavigateToChange={(cerprno) => handleNavigate("change", cerprno)}
              onNavigateToSubmissions={(cerId) => handleNavigate("cer-submissions", cerId)}
              onCancel={handleGoBack}
            />
          ) : (
            <AccessDeniedView
              currentUser={currentUser}
              attemptedView="reports"
              customMessage="You do not possess the required Finance / Audit or Admin role to access reporting analytics."
              onGoHome={handleGoBack}
            />
          )
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
          PermissionService.canAccessView("workflow-config", currentUser) ? (
            <AdminConsoleView
              dataService={dataService}
              currentUser={currentUser}
              onCancel={handleGoBack}
              initialTab={
                activeProposalId === "hierarchy" && PermissionService.canAccessApprovalHierarchy(currentUser)
                  ? "hierarchy"
                  : "users"
              }
            />
          ) : (
            <AccessDeniedView
              currentUser={currentUser}
              attemptedView="workflow-config"
              customMessage="Access to the Enterprise Administration Console is restricted to authorized System Administrators."
              onGoHome={handleGoBack}
            />
          )
        )}
      </main>

      {/* Global Modals */}

      <UserManualModal
        isOpen={isUserManualOpen}
        onClose={() => setIsUserManualOpen(false)}
      />
    </div>
  );
};

export default CER;
