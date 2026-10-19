'use client';
import * as React from "react";
import { useTagPickerInput_unstable } from "./useTagPickerInput.js";
import { renderTagPickerInput_unstable } from "./renderTagPickerInput.js";
import { useTagPickerInputStyles_unstable } from "./useTagPickerInputStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * TagPickerInput component -
 * A TagPickerInput is a composite component that allows users to query tags.
 */ export const TagPickerInput = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useTagPickerInput_unstable(props, ref);
    useTagPickerInputStyles_unstable(state);
    useCustomStyleHook_unstable('useTagPickerInputStyles_unstable')(state);
    return renderTagPickerInput_unstable(state);
});
TagPickerInput.displayName = 'TagPickerInput';
