'use client';
import * as React from "react";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
import { useList_unstable } from "./useList.js";
import { renderList_unstable } from "./renderList.js";
import { useListStyles_unstable } from "./useListStyles.styles.js";
import { useListContextValues_unstable } from "./useListContextValues.js";
export const List = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useList_unstable(props, ref);
    const contextValues = useListContextValues_unstable(state);
    useListStyles_unstable(state);
    useCustomStyleHook_unstable('useListStyles_unstable')(state);
    return renderList_unstable(state, contextValues);
});
List.displayName = 'List';
