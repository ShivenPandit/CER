'use client';
import * as React from "react";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
import { useDrawerHeader_unstable } from "./useDrawerHeader.js";
import { renderDrawerHeader_unstable } from "./renderDrawerHeader.js";
import { useDrawerHeaderStyles_unstable } from "./useDrawerHeaderStyles.styles.js";
/**
 * DrawerHeader provides a structured header for the drawer component.
 */ export const DrawerHeader = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useDrawerHeader_unstable(props, ref);
    useDrawerHeaderStyles_unstable(state);
    useCustomStyleHook_unstable('useDrawerHeaderStyles_unstable')(state);
    return renderDrawerHeader_unstable(state);
});
DrawerHeader.displayName = 'DrawerHeader';
