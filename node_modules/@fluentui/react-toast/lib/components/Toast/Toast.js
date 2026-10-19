'use client';
import * as React from "react";
import { useToast_unstable } from "./useToast.js";
import { renderToast_unstable } from "./renderToast.js";
import { useToastStyles_unstable } from "./useToastStyles.styles.js";
import { useToastContextValues_unstable } from "./useToastContextValues.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * Toast component
 */ export const Toast = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useToast_unstable(props, ref);
    useToastStyles_unstable(state);
    useCustomStyleHook_unstable('useToastStyles_unstable')(state);
    return renderToast_unstable(state, useToastContextValues_unstable(state));
});
Toast.displayName = 'Toast';
