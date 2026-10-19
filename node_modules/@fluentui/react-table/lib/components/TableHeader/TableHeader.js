'use client';
import * as React from "react";
import { useTableHeader_unstable } from "./useTableHeader.js";
import { renderTableHeader_unstable } from "./renderTableHeader.js";
import { useTableHeaderStyles_unstable } from "./useTableHeaderStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * TableHeader component
 */ export const TableHeader = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useTableHeader_unstable(props, ref);
    useTableHeaderStyles_unstable(state);
    useCustomStyleHook_unstable('useTableHeaderStyles_unstable')(state);
    return renderTableHeader_unstable(state);
});
TableHeader.displayName = 'TableHeader';
