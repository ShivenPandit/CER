'use client';
import * as React from "react";
import { useMenuItemLink_unstable } from "./useMenuItemLink.js";
import { renderMenuItemLink_unstable } from "./renderMenuItemLink.js";
import { useMenuItemLinkStyles_unstable } from "./useMenuItemLinkStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * MenuItemLink component
 */ export const MenuItemLink = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useMenuItemLink_unstable(props, ref);
    useMenuItemLinkStyles_unstable(state);
    useCustomStyleHook_unstable('useMenuItemLinkStyles_unstable')(state);
    return renderMenuItemLink_unstable(state);
});
MenuItemLink.displayName = 'MenuItemLink';
