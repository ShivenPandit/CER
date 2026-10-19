'use client';
import * as React from "react";
import { useSpinner_unstable } from "./useSpinner.js";
import { renderSpinner_unstable } from "./renderSpinner.js";
import { useSpinnerStyles_unstable } from "./useSpinnerStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * Converged Spinner component for the fluentui repo
 */ export const Spinner = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useSpinner_unstable(props, ref);
    useSpinnerStyles_unstable(state);
    useCustomStyleHook_unstable('useSpinnerStyles_unstable')(state);
    return renderSpinner_unstable(state);
});
Spinner.displayName = 'Spinner';
