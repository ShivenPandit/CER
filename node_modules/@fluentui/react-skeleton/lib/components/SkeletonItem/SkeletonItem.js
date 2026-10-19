'use client';
import * as React from "react";
import { useSkeletonItem_unstable } from "./useSkeletonItem.js";
import { renderSkeletonItem_unstable } from "./renderSkeletonItem.js";
import { useSkeletonItemStyles_unstable } from "./useSkeletonItemStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
export const SkeletonItem = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useSkeletonItem_unstable(props, ref);
    useSkeletonItemStyles_unstable(state);
    useCustomStyleHook_unstable('useSkeletonItemStyles_unstable')(state);
    return renderSkeletonItem_unstable(state);
});
SkeletonItem.displayName = 'SkeletonItem';
