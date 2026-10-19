"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    AnnounceProvider: function() {
        return _AnnounceContext.AnnounceProvider;
    },
    AnnounceProvider_unstable: function() {
        return /** @deprecated Use AnnounceProvider instead. */ _AnnounceContext.AnnounceProvider;
    },
    BackgroundAppearanceProvider: function() {
        return _BackgroundAppearanceContext.BackgroundAppearanceProvider;
    },
    CustomStyleHooksContext_unstable: function() {
        return _CustomStyleHooksContext.CustomStyleHooksContext;
    },
    CustomStyleHooksProvider_unstable: function() {
        return _CustomStyleHooksContext.CustomStyleHooksProvider;
    },
    OverridesProvider_unstable: function() {
        return _OverridesContext.OverridesProvider;
    },
    PortalMountNodeProvider: function() {
        return _PortalMountNodeContext.PortalMountNodeProvider;
    },
    Provider_unstable: function() {
        return _ProviderContext.Provider;
    },
    ThemeClassNameProvider_unstable: function() {
        return _ThemeClassNameContext.ThemeClassNameProvider;
    },
    ThemeContext_unstable: function() {
        return _ThemeContext.ThemeContext;
    },
    ThemeProvider_unstable: function() {
        return _ThemeContext.ThemeProvider;
    },
    TooltipVisibilityProvider_unstable: function() {
        return _TooltipVisibilityContext.TooltipVisibilityProvider;
    },
    useAnnounce: function() {
        return _AnnounceContext.useAnnounce;
    },
    useAnnounce_unstable: function() {
        return /** @deprecated Use useAnnounce instead. */ _AnnounceContext.useAnnounce;
    },
    useBackgroundAppearance: function() {
        return _BackgroundAppearanceContext.useBackgroundAppearance;
    },
    useCustomStyleHook_unstable: function() {
        return _CustomStyleHooksContext.useCustomStyleHook;
    },
    useFluent_unstable: function() {
        return _ProviderContext.useFluent;
    },
    useOverrides_unstable: function() {
        return _OverridesContext.useOverrides;
    },
    usePortalMountNode: function() {
        return _PortalMountNodeContext.usePortalMountNode;
    },
    useThemeClassName_unstable: function() {
        return _ThemeClassNameContext.useThemeClassName;
    },
    useTooltipVisibility_unstable: function() {
        return _TooltipVisibilityContext.useTooltipVisibility;
    }
});
const _ThemeContext = require("./ThemeContext.cjs");
const _ThemeClassNameContext = require("./ThemeClassNameContext.cjs");
const _TooltipVisibilityContext = require("./TooltipVisibilityContext.cjs");
const _ProviderContext = require("./ProviderContext.cjs");
const _OverridesContext = require("./OverridesContext/index.cjs");
const _CustomStyleHooksContext = require("./CustomStyleHooksContext.cjs");
const _BackgroundAppearanceContext = require("./BackgroundAppearanceContext/index.cjs");
const _PortalMountNodeContext = require("./PortalMountNodeContext.cjs");
const _AnnounceContext = require("./AnnounceContext/index.cjs");
