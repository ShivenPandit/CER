'use client';
import * as React from "react";
import { useCardFooter_unstable } from "./useCardFooter.js";
import { renderCardFooter_unstable } from "./renderCardFooter.js";
import { useCardFooterStyles_unstable } from "./useCardFooterStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * Component to render Button actions in a Card component.
 */ export const CardFooter = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useCardFooter_unstable(props, ref);
    useCardFooterStyles_unstable(state);
    useCustomStyleHook_unstable('useCardFooterStyles_unstable')(state);
    return renderCardFooter_unstable(state);
});
CardFooter.displayName = 'CardFooter';
