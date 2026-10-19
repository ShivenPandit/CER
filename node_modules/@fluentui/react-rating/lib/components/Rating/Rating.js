'use client';
import * as React from "react";
import { useRating_unstable } from "./useRating.js";
import { renderRating_unstable } from "./renderRating.js";
import { useRatingStyles_unstable } from "./useRatingStyles.styles.js";
import { useRatingContextValues } from "./useRatingContextValues.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * Rating is a wrapper for one or more rating items that will be used to set a rating value.
 */ export const Rating = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useRating_unstable(props, ref);
    const contextValues = useRatingContextValues(state);
    useRatingStyles_unstable(state);
    useCustomStyleHook_unstable('useRatingStyles_unstable')(state);
    return renderRating_unstable(state, contextValues);
});
Rating.displayName = 'Rating';
