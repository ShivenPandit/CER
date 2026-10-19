'use client';
import * as React from "react";
import { useProgressBar_unstable } from "./useProgressBar.js";
import { renderProgressBar_unstable } from "./renderProgressBar.js";
import { useProgressBarStyles_unstable } from "./useProgressBarStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * A ProgressBar bar shows the progression of a task.
 */ export const ProgressBar = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useProgressBar_unstable(props, ref);
    useProgressBarStyles_unstable(state);
    useCustomStyleHook_unstable('useProgressBarStyles_unstable')(state);
    return renderProgressBar_unstable(state);
});
ProgressBar.displayName = 'ProgressBar';
