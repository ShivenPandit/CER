'use client';
import * as React from "react";
import { useTableSelectionCell_unstable } from "./useTableSelectionCell.js";
import { renderTableSelectionCell_unstable } from "./renderTableSelectionCell.js";
import { useTableSelectionCellStyles_unstable } from "./useTableSelectionCellStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * TableSelectionCell component
 */ export const TableSelectionCell = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useTableSelectionCell_unstable(props, ref);
    useTableSelectionCellStyles_unstable(state);
    useCustomStyleHook_unstable('useTableSelectionCellStyles_unstable')(state);
    return renderTableSelectionCell_unstable(state);
});
TableSelectionCell.displayName = 'TableSelectionCell';
