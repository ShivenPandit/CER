'use client';
import * as React from "react";
import { useMenuItemCheckbox_unstable } from "./useMenuItemCheckbox.js";
import { renderMenuItemCheckbox_unstable } from "./renderMenuItemCheckbox.js";
import { useMenuItemCheckboxStyles_unstable } from "./useMenuItemCheckboxStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * Define a styled MenuItemCheckbox, using the `useMenuItemCheckbox_unstable` hook.
 */ export const MenuItemCheckbox = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useMenuItemCheckbox_unstable(props, ref);
    useMenuItemCheckboxStyles_unstable(state);
    useCustomStyleHook_unstable('useMenuItemCheckboxStyles_unstable')(state);
    return renderMenuItemCheckbox_unstable(state);
});
MenuItemCheckbox.displayName = 'MenuItemCheckbox';
