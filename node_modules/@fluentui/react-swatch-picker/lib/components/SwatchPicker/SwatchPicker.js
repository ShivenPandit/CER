'use client';
import * as React from "react";
import { useSwatchPicker_unstable } from "./useSwatchPicker.js";
import { renderSwatchPicker_unstable } from "./renderSwatchPicker.js";
import { useSwatchPickerStyles_unstable } from "./useSwatchPickerStyles.styles.js";
import { useSwatchPickerContextValues } from "./useSwatchPickerContextValues.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * SwatchPicker component - TODO: add more docs
 */ export const SwatchPicker = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useSwatchPicker_unstable(props, ref);
    const contextValues = useSwatchPickerContextValues(state);
    useSwatchPickerStyles_unstable(state);
    useCustomStyleHook_unstable('useSwatchPickerStyles_unstable')(state);
    return renderSwatchPicker_unstable(state, contextValues);
});
SwatchPicker.displayName = 'SwatchPicker';
