import React, { useState, useEffect } from "react";
import { RotateCw } from "lucide-react";
import { ICERProps } from "./ICERProps";
import { ICERProposal, IFieldChoices, DEFAULT_FIELD_CHOICES } from "../models/CERModel";
import { IAppUser } from "../models/UserModel";
import { IWorkflowLevel } from "../models/WorkflowModel";
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
import { UnauthorizedAccessView } from "./Shared/UnauthorizedAccessView";
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

  // Strict Authorization Status Gate
  const [authStatus, setAuthStatus] = useState<"checking" | "authorized" | "unauthorized">("checking");

  // Initialize current user from authenticated SharePoint context (starts in unverified inactive state)
  const [currentUser, setCurrentUser] = useState<IAppUser>(() => {
    const rawEmail = (props.newcurrentUserEmail || "").trim();
    const rawLogin = (props.newcurrentUserLoginName || "").trim();
    return {
      id: props.newcurrentUserId || 0,
      name: props.newcurrentUserName || "SharePoint User",
      email: rawEmail,
      loginName: rawLogin,
      role: "Initiator",
      roles: [],
      is_active: false,
      department: "CER Management Portal",
      sbu: undefined,
      isSiteAdmin: !!props.newisSiteAdmin,
    };
  });

  // Resolve user's actual roles from CERRoleMatrix
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
          if (
            resolution.isRegistered &&
            resolution.user.is_active &&
            Array.isArray(resolution.user.roles) &&
            resolution.user.roles.length > 0
          ) {
            setAuthStatus("authorized");
          } else {
            setAuthStatus("unauthorized");
          }
        }
      } catch (err) {
        console.error("[CER] Error resolving user role context:", err);
        if (isMounted) {
          setAuthStatus("unauthorized");
        }
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

  // User Manual Modal
  const [isUserManualOpen, setIsUserManualOpen] = useState(false);

  // Main scrollable container reference
  const mainScrollRef = React.useRef<HTMLElement | null>(null);

  const loadInitialData = async (): Promise<void> => {
    try {
      const [propsList, choices, levels] = await Promise.all([
        dataService.getAllProposals(),
        dataService.getFieldChoices(),
        dataService.getWorkflowLevels(),
      ]);
      setProposals(propsList);
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

  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const handleRefreshProposals = async (force: boolean = false): Promise<void> => {
    try {
      const [propsList, levels] = await Promise.all([
        dataService.getAllProposals(force),
        dataService.getWorkflowLevels(undefined, force),
      ]);
      setProposals(propsList);
      if (levels) {
        setWorkflowLevels(levels);
      }
    } catch (e) {
      console.error("[CER] Error refreshing proposals:", e);
    }
  };

  const handleGlobalSync = async (): Promise<void> => {
    if (isSyncing) return;
    setIsSyncing(true);
    try {
      await handleRefreshProposals(true);
    } finally {
      setIsSyncing(false);
    }
  };

  // Window Focus, Tab Visibility (SWR Pattern), and 60s Silent Background Polling
  useEffect(() => {
    let lastSync = Date.now();
    const handleAutoRevalidate = () => {
      if (document.visibilityState === "visible") {
        const now = Date.now();
        // 60-second throttle prevents redundant network bursts when switching tabs frequently
        if (now - lastSync > 60000 && currentView !== "create" && currentView !== "change") {
          lastSync = now;
          handleRefreshProposals(false).catch((e) => console.error(e));
        }
      }
    };

    document.addEventListener("visibilitychange", handleAutoRevalidate);
    window.addEventListener("focus", handleAutoRevalidate);

    // 120s Heartbeat silent background check
    const interval = setInterval(() => {
      if (document.visibilityState === "visible" && currentView !== "create" && currentView !== "change") {
        lastSync = Date.now();
        handleRefreshProposals(false).catch((e) => console.error(e));
      }
    }, 120000);

    return () => {
      document.removeEventListener("visibilitychange", handleAutoRevalidate);
      window.removeEventListener("focus", handleAutoRevalidate);
      clearInterval(interval);
    };
  }, [currentView]);

  const handleNavigate = (
    view: NavView,
    proposalId?: string,
    isBackNavigation: boolean = false,
    replaceHistory: boolean = false
  ): void => {
    // Revalidate data when navigating into queue or dashboard
    if (view === "pending-approvals" || view === "dashboard") {
      handleRefreshProposals(true).catch((e) => console.error(e));
    }

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

  if (authStatus === "checking") {
    return (
      <div className="min-h-screen w-full bg-[#F8FAFC] flex flex-col items-center justify-center p-6 text-center animate-fade-in font-sans">
        <div className="w-14 h-14 rounded-2xl bg-[#012964]/10 border border-[#012964]/20 flex items-center justify-center text-[#012964] mb-4 shadow-2xs">
          <RotateCw className="w-7 h-7 animate-spin" />
        </div>
        <h2 className="text-base font-bold text-slate-800 tracking-tight">
          Verifying Role Matrix Credentials...
        </h2>
        <p className="text-xs text-slate-500 mt-1 max-w-sm leading-relaxed">
          Authenticating corporate identity against the CER Role Matrix governance registry.
        </p>
      </div>
    );
  }

  if (authStatus === "unauthorized") {
    return (
      <UnauthorizedAccessView
        currentUser={currentUser}
        onRecheck={async () => {
          setAuthStatus("checking");
          if (dataService.clearCache) {
            dataService.clearCache();
          }
          try {
            const resolution = await AuthService.resolveCurrentUser(
              {
                id: props.newcurrentUserId || 1,
                name: props.newcurrentUserName || "SharePoint User",
                email: props.newcurrentUserEmail || "",
                loginName: props.newcurrentUserLoginName || "",
                isSiteAdmin: props.newisSiteAdmin || false,
              },
              dataService,
              true
            );
            setCurrentUser(resolution.user);
            if (
              resolution.isRegistered &&
              resolution.user.is_active &&
              Array.isArray(resolution.user.roles) &&
              resolution.user.roles.length > 0
            ) {
              setAuthStatus("authorized");
            } else {
              setAuthStatus("unauthorized");
            }
          } catch {
            setAuthStatus("unauthorized");
          }
        }}
        siteUrl={props.newsiteUrl || props.newrelativeUrl || props.newcontext?.pageContext?.web?.absoluteUrl}
      />
    );
  }

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
        onSync={handleGlobalSync}
        isSyncing={isSyncing}
        onSelectUser={(u) => {
          setCurrentUser(u);
          if (u && u.is_active && Array.isArray(u.roles) && u.roles.length > 0) {
            setAuthStatus("authorized");
          }
        }}
        siteUrl={props.newsiteUrl || props.newrelativeUrl || props.newcontext?.pageContext?.web?.absoluteUrl}
      />

      {/* Main Content Area - Full Document Flow with Natural Scrolling */}
      <main
        ref={mainScrollRef as any}
        id="cer-main-scroll"
        style={{ backgroundColor: "#F8FAFC" }}
        className={`w-full max-w-none min-w-0 flex-1 flex flex-col ${
          currentView === "dashboard"
            ? "p-0 min-h-0 h-full overflow-hidden"
            : "pt-2 sm:pt-2.5 lg:pt-3 px-3 sm:px-5 lg:px-6 2xl:px-8 pb-3 sm:pb-4"
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
            siteUrl={props.newsiteUrl || props.newrelativeUrl || props.newcontext?.pageContext?.web?.absoluteUrl}
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
              customMessage="This view is available to Initiators and Administrators."
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
              onRefreshProposals={() => handleRefreshProposals(true)}
              onCancel={handleGoBack}
            />
          ) : (
            <AccessDeniedView
              currentUser={currentUser}
              attemptedView="pending-approvals"
              customMessage="This queue is available to Approvers and Administrators."
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
              customMessage="Reports are available to Finance, Audit, and Administrators."
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
              customMessage="User management is restricted to Administrators."
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
