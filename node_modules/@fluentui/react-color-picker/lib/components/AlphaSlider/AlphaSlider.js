'use client';
import * as React from "react";
import { useAlphaSlider_unstable } from "./useAlphaSlider.js";
import { renderAlphaSlider_unstable } from "./renderAlphaSlider.js";
import { useAlphaSliderStyles_unstable } from "./useAlphaSliderStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * AlphaSlider component
 */ export const AlphaSlider = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useAlphaSlider_unstable(props, ref);
    useAlphaSliderStyles_unstable(state);
    useCustomStyleHook_unstable('useAlphaSliderStyles_unstable')(state);
    return renderAlphaSlider_unstable(state);
});
AlphaSlider.displayName = 'AlphaSlider';
