'use client';
import * as React from "react";
import { useInput_unstable } from "./useInput.js";
import { renderInput_unstable } from "./renderInput.js";
import { useInputStyles_unstable } from "./useInputStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * The Input component allows people to enter and edit text.
 */ export const Input = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useInput_unstable(props, ref);
    useInputStyles_unstable(state);
    useCustomStyleHook_unstable('useInputStyles_unstable')(state);
    return renderInput_unstable(state);
});
Input.displayName = 'Input';
