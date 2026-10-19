'use client';
import * as React from "react";
import { useTab_unstable } from "./useTab.js";
import { renderTab_unstable } from "./renderTab.js";
import { useTabStyles_unstable } from "./useTabStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * A tab provides a selectable item in a tab list.
 */ export const Tab = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useTab_unstable(props, ref);
    useTabStyles_unstable(state);
    useCustomStyleHook_unstable('useTabStyles_unstable')(state);
    return renderTab_unstable(state);
});
Tab.displayName = 'Tab';
