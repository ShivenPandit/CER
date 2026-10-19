'use client';
import * as React from "react";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
import { useDrawerContextValue } from "../../contexts/drawerContext.js";
import { useOverlayDrawer_unstable } from "./useOverlayDrawer.js";
import { renderOverlayDrawer_unstable } from "./renderOverlayDrawer.js";
import { useOverlayDrawerStyles_unstable } from "./useOverlayDrawerStyles.styles.js";
/**
 * OverlayDrawer contains supplementary content and are used for complex creation, edit, or management experiences.
 */ export const OverlayDrawer = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useOverlayDrawer_unstable(props, ref);
    const contextValue = useDrawerContextValue();
    useOverlayDrawerStyles_unstable(state);
    useCustomStyleHook_unstable('useDrawerOverlayStyles_unstable')(state);
    useCustomStyleHook_unstable('useOverlayDrawerStyles_unstable')(state);
    return renderOverlayDrawer_unstable(state, contextValue);
});
OverlayDrawer.displayName = 'OverlayDrawer';
