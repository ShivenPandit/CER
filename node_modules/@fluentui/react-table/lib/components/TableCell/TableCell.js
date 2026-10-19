'use client';
import * as React from "react";
import { useTableCell_unstable } from "./useTableCell.js";
import { renderTableCell_unstable } from "./renderTableCell.js";
import { useTableCellStyles_unstable } from "./useTableCellStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * TableCell component
 */ export const TableCell = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useTableCell_unstable(props, ref);
    useTableCellStyles_unstable(state);
    useCustomStyleHook_unstable('useTableCellStyles_unstable')(state);
    return renderTableCell_unstable(state);
});
TableCell.displayName = 'TableCell';
