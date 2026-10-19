'use client';
import * as React from "react";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
import { useMessageBarBody_unstable } from "./useMessageBarBody.js";
import { renderMessageBarBody_unstable } from "./renderMessageBarBody.js";
import { useMessageBarBodyStyles_unstable } from "./useMessageBarBodyStyles.styles.js";
import { useMessageBarBodyContextValues_unstable } from "./useMessageBarBodyContextValues.js";
/**
 * MessageBarBody component
 */ export const MessageBarBody = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useMessageBarBody_unstable(props, ref);
    const ctx = useMessageBarBodyContextValues_unstable(state);
    useMessageBarBodyStyles_unstable(state);
    useCustomStyleHook_unstable('useMessageBarBodyStyles_unstable')(state);
    return renderMessageBarBody_unstable(state, ctx);
});
MessageBarBody.displayName = 'MessageBarBody';
