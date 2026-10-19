'use client';
import * as React from "react";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
import { useNavItem_unstable } from "./useNavItem.js";
import { renderNavItem_unstable } from "./renderNavItem.js";
import { useNavItemStyles_unstable } from "./useNavItemStyles.styles.js";
/**
 * NavItem component - a single item in the navigation menu.
 */ export const NavItem = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useNavItem_unstable(props, ref);
    useNavItemStyles_unstable(state);
    useCustomStyleHook_unstable('useNavItemStyles_unstable')(state);
    return renderNavItem_unstable(state);
});
NavItem.displayName = 'NavItem';
