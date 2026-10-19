'use client';
import * as React from "react";
import { useCarouselNavContainer_unstable } from "./useCarouselNavContainer.js";
import { renderCarouselNavContainer_unstable } from "./renderCarouselNavContainer.js";
import { useCarouselNavContainerStyles_unstable } from "./useCarouselNavContainerStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * CarouselNavContainer component - This container will provide multiple valid layout options for the underlying carousel controls
 */ export const CarouselNavContainer = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useCarouselNavContainer_unstable(props, ref);
    useCarouselNavContainerStyles_unstable(state);
    useCustomStyleHook_unstable('useCarouselNavContainerStyles_unstable')(state);
    return renderCarouselNavContainer_unstable(state);
});
CarouselNavContainer.displayName = 'CarouselNavContainer';
