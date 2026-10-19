'use client';
import * as React from "react";
import { useMenuDivider_unstable } from "./useMenuDivider.js";
import { useMenuDividerStyles_unstable } from "./useMenuDividerStyles.styles.js";
import { renderMenuDivider_unstable } from "./renderMenuDivider.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * Define a styled MenuDivider, using the `useMenuDivider_unstable` hook.
 */ export const MenuDivider = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useMenuDivider_unstable(props, ref);
    useMenuDividerStyles_unstable(state);
    useCustomStyleHook_unstable('useMenuDividerStyles_unstable')(state);
    return renderMenuDivider_unstable(state);
});
MenuDivider.displayName = 'MenuDivider';
