'use client';
import * as React from "react";
import { useDataGridHeader_unstable } from "./useDataGridHeader.js";
import { renderDataGridHeader_unstable } from "./renderDataGridHeader.js";
import { useDataGridHeaderStyles_unstable } from "./useDataGridHeaderStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * DataGridHeader component
 */ export const DataGridHeader = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useDataGridHeader_unstable(props, ref);
    useDataGridHeaderStyles_unstable(state);
    useCustomStyleHook_unstable('useDataGridHeaderStyles_unstable')(state);
    return renderDataGridHeader_unstable(state);
});
DataGridHeader.displayName = 'DataGridHeader';
