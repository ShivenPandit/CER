'use client';
import * as React from "react";
import { useSwitch_unstable } from "./useSwitch.js";
import { renderSwitch_unstable } from "./renderSwitch.js";
import { useSwitchStyles_unstable } from "./useSwitchStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * Switches enable users to trigger an option on or off through pressing the component.
 */ export const Switch = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useSwitch_unstable(props, ref);
    useSwitchStyles_unstable(state);
    useCustomStyleHook_unstable('useSwitchStyles_unstable')(state);
    return renderSwitch_unstable(state);
});
Switch.displayName = 'Switch';
