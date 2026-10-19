'use client';
import * as React from "react";
import { useMenuGroupHeader_unstable } from "./useMenuGroupHeader.js";
import { useMenuGroupHeaderStyles_unstable } from "./useMenuGroupHeaderStyles.styles.js";
import { renderMenuGroupHeader_unstable } from "./renderMenuGroupHeader.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * Define a styled MenuGroupHeader, using the `useMenuGroupHeader_unstable` hook.
 */ export const MenuGroupHeader = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useMenuGroupHeader_unstable(props, ref);
    useMenuGroupHeaderStyles_unstable(state);
    useCustomStyleHook_unstable('useMenuGroupHeaderStyles_unstable')(state);
    return renderMenuGroupHeader_unstable(state);
});
MenuGroupHeader.displayName = 'MenuGroupHeader';
