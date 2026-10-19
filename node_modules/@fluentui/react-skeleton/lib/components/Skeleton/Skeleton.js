'use client';
import * as React from "react";
import { useSkeleton_unstable } from "./useSkeleton.js";
import { renderSkeleton_unstable } from "./renderSkeleton.js";
import { useSkeletonStyles_unstable } from "./useSkeletonStyles.styles.js";
import { useSkeletonContextValues } from "./useSkeletonContextValues.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * Skeleton component - TODO: add more docs
 */ export const Skeleton = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useSkeleton_unstable(props, ref);
    const contextValues = useSkeletonContextValues(state);
    useSkeletonStyles_unstable(state);
    useCustomStyleHook_unstable('useSkeletonStyles_unstable')(state);
    return renderSkeleton_unstable(state, contextValues);
});
Skeleton.displayName = 'Skeleton';
