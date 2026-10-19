'use client';
import * as React from "react";
import { useCardHeader_unstable } from "./useCardHeader.js";
import { renderCardHeader_unstable } from "./renderCardHeader.js";
import { useCardHeaderStyles_unstable } from "./useCardHeaderStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * Component to render an image, text and an action in a Card component.
 */ export const CardHeader = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useCardHeader_unstable(props, ref);
    useCardHeaderStyles_unstable(state);
    useCustomStyleHook_unstable('useCardHeaderStyles_unstable')(state);
    return renderCardHeader_unstable(state);
});
CardHeader.displayName = 'CardHeader';
