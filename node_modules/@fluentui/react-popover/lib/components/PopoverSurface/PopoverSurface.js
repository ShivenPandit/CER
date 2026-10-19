'use client';
import * as React from "react";
import { usePopoverSurface_unstable } from "./usePopoverSurface.js";
import { renderPopoverSurface_unstable } from "./renderPopoverSurface.js";
import { usePopoverSurfaceStyles_unstable } from "./usePopoverSurfaceStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * PopoverSurface component renders react children in a positioned box
 */ export const PopoverSurface = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = usePopoverSurface_unstable(props, ref);
    usePopoverSurfaceStyles_unstable(state);
    useCustomStyleHook_unstable('usePopoverSurfaceStyles_unstable')(state);
    return renderPopoverSurface_unstable(state);
});
PopoverSurface.displayName = 'PopoverSurface';
