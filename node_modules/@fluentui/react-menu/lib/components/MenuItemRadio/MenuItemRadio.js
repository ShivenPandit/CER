'use client';
import * as React from "react";
import { useMenuItemRadio_unstable } from "./useMenuItemRadio.js";
import { renderMenuItemRadio_unstable } from "./renderMenuItemRadio.js";
import { useMenuItemRadioStyles_unstable } from "./useMenuItemRadioStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * Define a styled MenuItemRadio, using the `useMenuItemRadio_unstable` hook.
 */ export const MenuItemRadio = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useMenuItemRadio_unstable(props, ref);
    useMenuItemRadioStyles_unstable(state);
    useCustomStyleHook_unstable('useMenuItemRadioStyles_unstable')(state);
    return renderMenuItemRadio_unstable(state);
});
MenuItemRadio.displayName = 'MenuItemRadio';
