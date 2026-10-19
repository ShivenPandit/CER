'use client';
import * as React from "react";
import { useToolbar_unstable } from "./useToolbar.js";
import { renderToolbar_unstable } from "./renderToolbar.js";
import { useToolbarStyles_unstable } from "./useToolbarStyles.styles.js";
import { useToolbarContextValues_unstable } from "./useToolbarContextValues.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * Toolbar component
 */ export const Toolbar = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useToolbar_unstable(props, ref);
    const contextValues = useToolbarContextValues_unstable(state);
    useToolbarStyles_unstable(state);
    useCustomStyleHook_unstable('useToolbarStyles_unstable')(state);
    return renderToolbar_unstable(state, contextValues);
});
Toolbar.displayName = 'Toolbar';
