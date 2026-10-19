'use client';
import * as React from "react";
import { useTabList_unstable } from "./useTabList.js";
import { renderTabList_unstable } from "./renderTabList.js";
import { useTabListStyles_unstable } from "./useTabListStyles.styles.js";
import { useTabListContextValues_unstable } from "./useTabListContextValues.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * A tab list provides single selection from a set of tabs.
 */ export const TabList = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useTabList_unstable(props, ref);
    const contextValues = useTabListContextValues_unstable(state);
    useTabListStyles_unstable(state);
    useCustomStyleHook_unstable('useTabListStyles_unstable')(state);
    return renderTabList_unstable(state, contextValues);
});
TabList.displayName = 'TabList';
