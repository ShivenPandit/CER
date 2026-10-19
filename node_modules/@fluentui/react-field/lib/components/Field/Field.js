'use client';
import * as React from "react";
import { renderField_unstable } from "./renderField.js";
import { useField_unstable } from "./useField.js";
import { useFieldStyles_unstable } from "./useFieldStyles.styles.js";
import { useFieldContextValues_unstable } from "../../contexts/index.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
export const Field = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useField_unstable(props, ref);
    useFieldStyles_unstable(state);
    useCustomStyleHook_unstable('useFieldStyles_unstable')(state);
    const context = useFieldContextValues_unstable(state);
    return renderField_unstable(state, context);
});
Field.displayName = 'Field';
