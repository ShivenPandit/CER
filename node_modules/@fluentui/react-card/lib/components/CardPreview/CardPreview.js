'use client';
import * as React from "react";
import { useCardPreview_unstable } from "./useCardPreview.js";
import { renderCardPreview_unstable } from "./renderCardPreview.js";
import { useCardPreviewStyles_unstable } from "./useCardPreviewStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * Component to render image previews of documents or articles in a Card component.
 */ export const CardPreview = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useCardPreview_unstable(props, ref);
    useCardPreviewStyles_unstable(state);
    useCustomStyleHook_unstable('useCardPreviewStyles_unstable')(state);
    return renderCardPreview_unstable(state);
});
CardPreview.displayName = 'CardPreview';
