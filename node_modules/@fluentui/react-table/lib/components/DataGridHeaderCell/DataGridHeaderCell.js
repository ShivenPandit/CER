'use client';
import * as React from "react";
import { useDataGridHeaderCell_unstable } from "./useDataGridHeaderCell.js";
import { renderDataGridHeaderCell_unstable } from "./renderDataGridHeaderCell.js";
import { useDataGridHeaderCellStyles_unstable } from "./useDataGridHeaderCellStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * DataGridHeaderCell component
 */ export const DataGridHeaderCell = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useDataGridHeaderCell_unstable(props, ref);
    useDataGridHeaderCellStyles_unstable(state);
    useCustomStyleHook_unstable('useDataGridHeaderCellStyles_unstable')(state);
    return renderDataGridHeaderCell_unstable(state);
});
DataGridHeaderCell.displayName = 'DataGridHeaderCell';
