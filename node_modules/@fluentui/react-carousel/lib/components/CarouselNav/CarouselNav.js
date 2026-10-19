'use client';
import * as React from "react";
import { useCarouselNavContextValues_unstable } from "./useCarouselNavContextValues.js";
import { renderCarouselNav_unstable } from "./renderCarouselNav.js";
import { useCarouselNav_unstable } from "./useCarouselNav.js";
import { useCarouselNavStyles_unstable } from "./useCarouselNavStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * Used to jump to a card based on index, using arrow navigation via Tabster.
 *
 * The children of this component will be wrapped in a context to
 * provide the appropriate value based on their index position.
 */ export const CarouselNav = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useCarouselNav_unstable(props, ref);
    const contextValues = useCarouselNavContextValues_unstable(state);
    useCarouselNavStyles_unstable(state);
    useCustomStyleHook_unstable('useCarouselNavStyles_unstable')(state);
    return renderCarouselNav_unstable(state, contextValues);
});
CarouselNav.displayName = 'CarouselNav';
