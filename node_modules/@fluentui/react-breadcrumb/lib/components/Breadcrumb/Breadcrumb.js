'use client';
import * as React from "react";
import { useBreadcrumb_unstable } from "./useBreadcrumb.js";
import { renderBreadcrumb_unstable } from "./renderBreadcrumb.js";
import { useBreadcrumbStyles_unstable } from "./useBreadcrumbStyles.styles.js";
import { useBreadcrumbContextValues_unstable } from "./useBreadcrumbContextValue.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * Breadcrumb component - TODO: add more docs
 */ export const Breadcrumb = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useBreadcrumb_unstable(props, ref);
    const contextValues = useBreadcrumbContextValues_unstable(state);
    useBreadcrumbStyles_unstable(state);
    useCustomStyleHook_unstable('useBreadcrumbStyles_unstable')(state);
    return renderBreadcrumb_unstable(state, contextValues);
});
Breadcrumb.displayName = 'Breadcrumb';
