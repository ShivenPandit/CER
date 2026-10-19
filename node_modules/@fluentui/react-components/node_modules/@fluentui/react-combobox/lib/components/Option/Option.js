'use client';
import * as React from "react";
import { useOption_unstable } from "./useOption.js";
import { renderOption_unstable } from "./renderOption.js";
import { useOptionStyles_unstable } from "./useOptionStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * Option component: a styled child option of a Combobox
 */ export const Option = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useOption_unstable(props, ref);
    useOptionStyles_unstable(state);
    useCustomStyleHook_unstable('useOptionStyles_unstable')(state);
    return renderOption_unstable(state);
});
Option.displayName = 'Option';
