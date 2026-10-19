'use client';
import * as React from "react";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
import { useMessageBarActions_unstable } from "./useMessageBarActions.js";
import { renderMessageBarActions_unstable } from "./renderMessageBarActions.js";
import { useMessageBarActionsStyles_unstable } from "./useMessageBarActionsStyles.styles.js";
import { useMessageBarActionsContextValue_unstable } from "./useMessageBarActionsContextValues.js";
/**
 * MessageBarActions component
 */ export const MessageBarActions = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useMessageBarActions_unstable(props, ref);
    useMessageBarActionsStyles_unstable(state);
    useCustomStyleHook_unstable('useMessageBarActionsStyles_unstable')(state);
    return renderMessageBarActions_unstable(state, useMessageBarActionsContextValue_unstable());
});
MessageBarActions.displayName = 'MessageBarActions';
