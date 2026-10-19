'use client';
import * as React from "react";
import { useDataGrid_unstable } from "./useDataGrid.js";
import { renderDataGrid_unstable } from "./renderDataGrid.js";
import { useDataGridStyles_unstable } from "./useDataGridStyles.styles.js";
import { useDataGridContextValues_unstable } from "./useDataGridContextValues.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * DataGrid component
 */ export const DataGrid = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useDataGrid_unstable(props, ref);
    useDataGridStyles_unstable(state);
    useCustomStyleHook_unstable('useDataGridStyles_unstable')(state);
    return renderDataGrid_unstable(state, useDataGridContextValues_unstable(state));
});
DataGrid.displayName = 'DataGrid';
