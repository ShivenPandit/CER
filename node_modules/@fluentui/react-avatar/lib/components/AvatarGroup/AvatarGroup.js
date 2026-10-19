'use client';
import * as React from "react";
import { renderAvatarGroup_unstable } from "./renderAvatarGroup.js";
import { useAvatarGroup_unstable } from "./useAvatarGroup.js";
import { useAvatarGroupContextValues } from "./useAvatarGroupContextValues.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
import { useAvatarGroupStyles_unstable } from "./useAvatarGroupStyles.styles.js";
/**
 * The AvatarGroup component represents a group of multiple people or entities by taking care of the arrangement
 * of individual Avatars in a spread, stack, or pie layout.
 */ export const AvatarGroup = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useAvatarGroup_unstable(props, ref);
    const contextValues = useAvatarGroupContextValues(state);
    useAvatarGroupStyles_unstable(state);
    useCustomStyleHook_unstable('useAvatarGroupStyles_unstable')(state);
    return renderAvatarGroup_unstable(state, contextValues);
});
AvatarGroup.displayName = 'AvatarGroup';
