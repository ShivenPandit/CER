'use client';
import * as React from "react";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
import { useDrawerHeaderNavigation_unstable } from "./useDrawerHeaderNavigation.js";
import { renderDrawerHeaderNavigation_unstable } from "./renderDrawerHeaderNavigation.js";
import { useDrawerHeaderNavigationStyles_unstable } from "./useDrawerHeaderNavigationStyles.styles.js";
/**
 * DrawerHeaderNavigation provides a header navigation area for the Drawer.
 */ export const DrawerHeaderNavigation = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useDrawerHeaderNavigation_unstable(props, ref);
    useDrawerHeaderNavigationStyles_unstable(state);
    useCustomStyleHook_unstable('useDrawerHeaderNavigationStyles_unstable')(state);
    return renderDrawerHeaderNavigation_unstable(state);
});
DrawerHeaderNavigation.displayName = 'DrawerHeaderNavigation';
