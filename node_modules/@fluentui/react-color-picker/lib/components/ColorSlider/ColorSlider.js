'use client';
import * as React from "react";
import { useColorSlider_unstable } from "./useColorSlider.js";
import { renderColorSlider_unstable } from "./renderColorSlider.js";
import { useColorSliderStyles_unstable } from "./useColorSliderStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * ColorSlider component
 */ export const ColorSlider = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useColorSlider_unstable(props, ref);
    useColorSliderStyles_unstable(state);
    useCustomStyleHook_unstable('useColorSliderStyles_unstable')(state);
    return renderColorSlider_unstable(state);
});
ColorSlider.displayName = 'ColorSlider';
