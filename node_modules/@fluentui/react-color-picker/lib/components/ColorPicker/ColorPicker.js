'use client';
import * as React from "react";
import { useColorPicker_unstable } from "./useColorPicker.js";
import { renderColorPicker_unstable } from "./renderColorPicker.js";
import { useColorPickerStyles_unstable } from "./useColorPickerStyles.styles.js";
import { useColorPickerContextValues } from "./useColorPickerContextValues.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * ColorPicker component
 */ export const ColorPicker = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useColorPicker_unstable(props, ref);
    const contextValues = useColorPickerContextValues(state);
    useColorPickerStyles_unstable(state);
    useCustomStyleHook_unstable('useColorPickerStyles_unstable')(state);
    return renderColorPicker_unstable(state, contextValues);
});
ColorPicker.displayName = 'ColorPicker';
