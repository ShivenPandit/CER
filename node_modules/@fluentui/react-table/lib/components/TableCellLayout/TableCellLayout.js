'use client';
import * as React from "react";
import { useTableCellLayout_unstable } from "./useTableCellLayout.js";
import { renderTableCellLayout_unstable } from "./renderTableCellLayout.js";
import { useTableCellLayoutStyles_unstable } from "./useTableCellLayoutStyles.styles.js";
import { useTableCellLayoutContextValues_unstable } from "./useTableCellLayoutContextValues.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * TableCellLayout component
 */ export const TableCellLayout = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useTableCellLayout_unstable(props, ref);
    useTableCellLayoutStyles_unstable(state);
    useCustomStyleHook_unstable('useTableCellLayoutStyles_unstable')(state);
    return renderTableCellLayout_unstable(state, useTableCellLayoutContextValues_unstable(state));
});
TableCellLayout.displayName = 'TableCellLayout';
