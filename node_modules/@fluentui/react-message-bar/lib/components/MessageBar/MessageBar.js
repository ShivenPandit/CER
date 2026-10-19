'use client';
import * as React from "react";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
import { useMessageBar_unstable } from "./useMessageBar.js";
import { renderMessageBar_unstable } from "./renderMessageBar.js";
import { useMessageBarStyles_unstable } from "./useMessageBarStyles.styles.js";
import { useMessageBarContextValue_unstable } from "./useMessageBarContextValues.js";
/**
 * MessageBar component
 */ export const MessageBar = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useMessageBar_unstable(props, ref);
    useMessageBarStyles_unstable(state);
    useCustomStyleHook_unstable('useMessageBarStyles_unstable')(state);
    return renderMessageBar_unstable(state, useMessageBarContextValue_unstable(state));
});
MessageBar.displayName = 'MessageBar';
