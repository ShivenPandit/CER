'use client';
import * as React from "react";
import { useDataGridBody_unstable } from "./useDataGridBody.js";
import { renderDataGridBody_unstable } from "./renderDataGridBody.js";
import { useDataGridBodyStyles_unstable } from "./useDataGridBodyStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * DataGridBody component
 */ export const DataGridBody = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useDataGridBody_unstable(props, ref);
    useDataGridBodyStyles_unstable(state);
    useCustomStyleHook_unstable('useDataGridBodyStyles_unstable')(state);
    return renderDataGridBody_unstable(state);
});
DataGridBody.displayName = 'DataGridBody';
