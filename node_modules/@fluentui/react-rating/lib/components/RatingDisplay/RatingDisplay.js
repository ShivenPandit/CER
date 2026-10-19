'use client';
import * as React from "react";
import { useRatingDisplay_unstable } from "./useRatingDisplay.js";
import { renderRatingDisplay_unstable } from "./renderRatingDisplay.js";
import { useRatingDisplayStyles_unstable } from "./useRatingDisplayStyles.styles.js";
import { useRatingDisplayContextValues } from "./useRatingDisplayContextValues.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * RatingDisplay is a wrapper for one or more rating items that will be used to display a rating value
 * as well as the label for the rating.
 */ export const RatingDisplay = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useRatingDisplay_unstable(props, ref);
    const contextValues = useRatingDisplayContextValues(state);
    useRatingDisplayStyles_unstable(state);
    useCustomStyleHook_unstable('useRatingDisplayStyles_unstable')(state);
    return renderRatingDisplay_unstable(state, contextValues);
});
RatingDisplay.displayName = 'RatingDisplay';
