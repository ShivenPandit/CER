'use client';
import * as React from "react";
import { useTree_unstable } from "./useTree.js";
import { useTreeContextValues_unstable } from "./useTreeContextValues.js";
import { useTreeStyles_unstable } from "./useTreeStyles.styles.js";
import { renderTree_unstable } from "./renderTree.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * The `Tree` component renders nested items in a hierarchical structure.
 * Use it with `TreeItem` component and layouts components `TreeItemLayout` or `TreeItemPersonaLayout`.
 */ export const Tree = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useTree_unstable(props, ref);
    const contextValues = useTreeContextValues_unstable(state);
    useTreeStyles_unstable(state);
    useCustomStyleHook_unstable('useTreeStyles_unstable')(state);
    return renderTree_unstable(state, contextValues);
});
Tree.displayName = 'Tree';
