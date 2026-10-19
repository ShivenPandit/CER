'use client';
import * as React from "react";
import { useTableBody_unstable } from "./useTableBody.js";
import { renderTableBody_unstable } from "./renderTableBody.js";
import { useTableBodyStyles_unstable } from "./useTableBodyStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * TableBody component
 */ export const TableBody = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useTableBody_unstable(props, ref);
    useTableBodyStyles_unstable(state);
    useCustomStyleHook_unstable('useTableBodyStyles_unstable')(state);
    return renderTableBody_unstable(state);
});
TableBody.displayName = 'TableBody';
