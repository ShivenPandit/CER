'use client';
import * as React from "react";
import { useTableCellActions_unstable } from "./useTableCellActions.js";
import { renderTableCellActions_unstable } from "./renderTableCellActions.js";
import { useTableCellActionsStyles_unstable } from "./useTableCellActionsStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * TableCellActions component
 */ export const TableCellActions = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useTableCellActions_unstable(props, ref);
    useTableCellActionsStyles_unstable(state);
    useCustomStyleHook_unstable('useTableCellActionsStyles_unstable')(state);
    return renderTableCellActions_unstable(state);
});
TableCellActions.displayName = 'TableCellActions';
