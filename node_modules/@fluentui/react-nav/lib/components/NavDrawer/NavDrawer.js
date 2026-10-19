'use client';
import * as React from "react";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
import { useNavDrawer_unstable } from "./useNavDrawer.js";
import { renderNavDrawer_unstable } from "./renderNavDrawer.js";
import { useNavDrawerStyles_unstable } from "./useNavDrawerStyles.styles.js";
import { useNavContextValues_unstable } from "../useNavContextValues.js";
/**
 * NavDrawer component - a component that provides a drawer for navigation items.
 */ export const NavDrawer = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useNavDrawer_unstable(props, ref);
    const contextValues = useNavContextValues_unstable(state);
    useNavDrawerStyles_unstable(state);
    useCustomStyleHook_unstable('useNavDrawerStyles_unstable')(state);
    return renderNavDrawer_unstable(state, contextValues);
});
NavDrawer.displayName = 'NavDrawer';
