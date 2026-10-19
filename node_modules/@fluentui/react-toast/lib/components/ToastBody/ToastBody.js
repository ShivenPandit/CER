'use client';
import * as React from "react";
import { useToastBody_unstable } from "./useToastBody.js";
import { renderToastBody_unstable } from "./renderToastBody.js";
import { useToastBodyStyles_unstable } from "./useToastBodyStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * ToastBody component
 */ export const ToastBody = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useToastBody_unstable(props, ref);
    useToastBodyStyles_unstable(state);
    useCustomStyleHook_unstable('useToastBodyStyles_unstable')(state);
    return renderToastBody_unstable(state);
});
ToastBody.displayName = 'ToastBody';
