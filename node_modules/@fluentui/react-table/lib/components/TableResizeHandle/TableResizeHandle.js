'use client';
import * as React from "react";
import { useTableResizeHandle_unstable } from "./useTableResizeHandle.js";
import { renderTableResizeHandle_unstable } from "./renderTableResizeHandle.js";
import { useTableResizeHandleStyles_unstable } from "./useTableResizeHandleStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * TableResizeHandle component - TODO: add more docs
 */ export const TableResizeHandle = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useTableResizeHandle_unstable(props, ref);
    useTableResizeHandleStyles_unstable(state);
    useCustomStyleHook_unstable('useTableResizeHandleStyles_unstable')(state);
    return renderTableResizeHandle_unstable(state);
});
TableResizeHandle.displayName = 'TableResizeHandle';
