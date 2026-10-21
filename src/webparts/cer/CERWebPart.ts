import * as React from "react";
import * as ReactDom from "react-dom/client";
import { Version } from "@microsoft/sp-core-library";
import {
  type IPropertyPaneConfiguration,
  PropertyPaneTextField,
} from "@microsoft/sp-property-pane";
import { BaseClientSideWebPart } from "@microsoft/sp-webpart-base";
import { IReadonlyTheme } from "@microsoft/sp-component-base";
import { SPHttpClient, SPHttpClientResponse } from "@microsoft/sp-http";
import "../../tailwind.generated.css";
import * as strings from "TemplateSpfxWebPartStrings";
import CER from "./components/CER";
import { ICERProps } from "./components/ICERProps";
import $ from "jquery";

export interface ICERWebPartProps {
  description: string;
}

interface ISharePointUserGroup {
  Id: number;
  Title: string;
}

interface IUserData {
  id: number;
  title: string;
  email: string;
  groups: ISharePointUserGroup[];
}

export default class CERWebPart extends BaseClientSideWebPart<ICERWebPartProps> {
  private _isDarkTheme: boolean = false;
  private _root: ReactDom.Root | null = null;
  private _userData: IUserData = {
    id: -1,
    title: "",
    email: "",
    groups: [],
  };
  private _domObserver: MutationObserver | null = null;
  private _injectedStyleElement: HTMLStyleElement | null = null;

  public async getCurrentUserGroups(
    requester: SPHttpClient,
    siteUrl: string,
  ): Promise<IUserData> {
    try {
      const response: SPHttpClientResponse = await requester.get(
        `${siteUrl}/_api/web/currentuser/?$select=Title,Email,LoginName,Id&$expand=groups`,
        SPHttpClient.configurations.v1,
        {
          headers: {
            Accept: "application/json;odata=verbose",
            "odata-version": "",
          },
        },
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }

      const json = await response.json();
      const user = json?.d;

      return {
        id: user?.Id ?? -1,
        title: user?.Title ?? "",
        email: this.context.pageContext.user.email || user?.Email || "",
        groups: user?.Groups?.results ?? [],
      };
    } catch (error: unknown) {
      console.error(
        "[SPFx] Error fetching current user groups:",
        error instanceof Error ? error.message : error,
      );
      return {
        id: -1,
        title: "",
        email: this.context.pageContext.user.email || "",
        groups: [],
      };
    }
  }

  protected async onInit(): Promise<void> {
    await super.onInit();

    // 1. Fetch user data before rendering component
    this._userData = await this.getCurrentUserGroups(
      this.context.spHttpClient,
      this.context.pageContext.web.absoluteUrl,
    );

    document.title = "MIS Repository";
    $("body").addClass("ms-backgroundImage");

    // 2. Inject CSS rules once
    this._injectHideStyles();

    // 3. Setup dynamic chrome hiding using MutationObserver
    this._setupDomObserver();
  }

  public render(): void {
    this.domElement.style.width = "100%";
    this.domElement.style.maxWidth = "none";
    this.domElement.style.boxSizing = "border-box";
    this.domElement.style.margin = "0";
    this.domElement.style.padding = "0";

    const element: React.ReactElement<ICERProps> =
      React.createElement(CER, {
        newcontext: this.context,
        newsiteUrl: this.context.pageContext.web.absoluteUrl,
        newlistName: "",
        newspHttpClient: this.context.spHttpClient,
        newrelativeUrl: this.context.pageContext.web.serverRelativeUrl,
        newcurrentUserId: this._userData.id,
        newcurrentUserName: this._userData.title,
        newgroups: this._userData.groups,
        newcurrentUserEmail: this._userData.email,
      });

    // React 18 createRoot
    if (!this._root) {
      this._root = ReactDom.createRoot(this.domElement);
    }
    this._root.render(element);
  }

  private _injectHideStyles(): void {
    const selectors = [
      "#spCommandBar",
      ".commandBarWrapper",
      "#spLeftNav",
      "#SuiteNavWrapper",
      "#CommentsWrapper",
      "#sp-appBar",
      ".headerRow-107",
      ".commandBarButtonHeightAndColor",
      ".fui-Toolbar",
      ".simpleFooterContainer-196",
      ".p_i-Dej_1x34n",
      'div[data-automation-id="pageHeader"]',
      'div[data-automation-id="SiteHeader"]',
      'div[data-automation-id="MegaFooter"]',
      'div[data-automation-id="gradientBox"]',
      'div[data-automation-id="LeftNavGroups"]',
    ];

    this._injectedStyleElement = document.createElement("style");
    this._injectedStyleElement.innerHTML = `
      ${selectors.join(", ")} {
        display: none !important;
        height: 0 !important;
        min-height: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      .ControlZone, 
      div[data-automation-id="CanvasControl"],
      .CanvasZoneSectionContainer,
      .CanvasZone,
      #spPageCanvasContent,
      .CanvasSection,
      div[data-automation-id="CanvasZone"],
      div[data-automation-id="CanvasSection"],
      .CanvasComponent,
      [class*="sp-pageLayout"],
      .ms-Fabric,
      .ms-Grid,
      .appPart,
      .webPartContainer,
      .root-98 {
        max-width: 100% !important;
        width: 100% !important;
        margin: 0 !important;
        padding: 0 !important;
        border-radius: 0 !important;
        border-top-left-radius: 0 !important;
        border-top-right-radius: 0 !important;
        border-bottom-left-radius: 0 !important;
        border-bottom-right-radius: 0 !important;
        box-sizing: border-box !important;
      }
      .od-SiteNav-content, #spSiteHeader, #spCommandBar, [class*="Canvas"] {
        margin: 0 !important;
        padding: 0 !important;
        max-width: 100% !important;
        border-radius: 0 !important;
      }
    `;
    document.head.appendChild(this._injectedStyleElement);
  }

  private _setupDomObserver(): void {
    const hideExtraNodes = (): void => {
      $(
        "div[data-automation-id='SimpleFooter'], div[data-automation-id='SiteHeaderOverlay'], div[data-automation-id='gradientBox'], div[data-automation-id='LeftNavGroups']",
      )
        .parent()
        .hide();
      $("#spCommandBar, .commandBarWrapper").hide();
    };

    hideExtraNodes();

    // Observe changes instead of polling via setInterval
    this._domObserver = new MutationObserver(() => {
      hideExtraNodes();
    });

    this._domObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });
  }

  protected onThemeChanged(currentTheme: IReadonlyTheme | undefined): void {
    if (!currentTheme) {
      return;
    }

    this._isDarkTheme = !!currentTheme.isInverted;
    const { semanticColors } = currentTheme;

    if (semanticColors) {
      this.domElement.style.setProperty(
        "--bodyText",
        semanticColors.bodyText || null,
      );
      this.domElement.style.setProperty("--link", semanticColors.link || null);
      this.domElement.style.setProperty(
        "--linkHovered",
        semanticColors.linkHovered || null,
      );
    }
  }

  protected onDispose(): void {
    // 1. Disconnect DOM observer
    if (this._domObserver) {
      this._domObserver.disconnect();
      this._domObserver = null;
    }

    // 2. Remove dynamically injected CSS tag
    if (this._injectedStyleElement && this._injectedStyleElement.parentNode) {
      this._injectedStyleElement.parentNode.removeChild(
        this._injectedStyleElement,
      );
      this._injectedStyleElement = null;
    }

    // 3. Unmount React 18 component tree
    if (this._root) {
      this._root.unmount();
      this._root = null;
    }
  }

  protected get dataVersion(): Version {
    return Version.parse("1.0");
  }

  protected getPropertyPaneConfiguration(): IPropertyPaneConfiguration {
    return {
      pages: [
        {
          header: {
            description: strings.PropertyPaneDescription,
          },
          groups: [
            {
              groupName: strings.BasicGroupName,
              groupFields: [
                PropertyPaneTextField("description", {
                  label: strings.DescriptionFieldLabel,
                }),
              ],
            },
          ],
        },
      ],
    };
  }
}
