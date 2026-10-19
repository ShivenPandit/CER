'use client';
import * as React from "react";
import { useTagPickerControl_unstable } from "./useTagPickerControl.js";
import { renderTagPickerControl_unstable } from "./renderTagPickerControl.js";
import { useTagPickerControlStyles_unstable } from "./useTagPickerControlStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * TagPickerControl component -
 * A TagPickerControl is a composite component that controls actions and state for a TagPicker.
 */ export const TagPickerControl = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useTagPickerControl_unstable(props, ref);
    useTagPickerControlStyles_unstable(state);
    useCustomStyleHook_unstable('useTagPickerControlStyles_unstable')(state);
    return renderTagPickerControl_unstable(state);
});
TagPickerControl.displayName = 'TagPickerControl';
