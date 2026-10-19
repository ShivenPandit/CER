'use client';
import * as React from "react";
import { useMenuItem_unstable } from "./useMenuItem.js";
import { renderMenuItem_unstable } from "./renderMenuItem.js";
import { useMenuItemStyles_unstable } from "./useMenuItemStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * Define a styled MenuItem, using the `useMenuItem_unstable` and `useMenuItemStyles_unstable` hook.
 */ export const MenuItem = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useMenuItem_unstable(props, ref);
    useMenuItemStyles_unstable(state);
    useCustomStyleHook_unstable('useMenuItemStyles_unstable')(state);
    return renderMenuItem_unstable(state);
});
MenuItem.displayName = 'MenuItem';
