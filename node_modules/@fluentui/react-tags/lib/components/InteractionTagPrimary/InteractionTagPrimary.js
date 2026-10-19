'use client';
import * as React from "react";
import { useInteractionTagPrimary_unstable } from "./useInteractionTagPrimary.js";
import { renderInteractionTagPrimary_unstable } from "./renderInteractionTagPrimary.js";
import { useInteractionTagPrimaryStyles_unstable } from "./useInteractionTagPrimaryStyles.styles.js";
import { useTagAvatarContextValues_unstable } from "../../utils/index.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * InteractionTagPrimary component - used as the first child of the `InteractionTag` component.
 * Provides visual attributes such as media, icon, primary and secondary text, as well as the ability to attach a primary action.
 */ export const InteractionTagPrimary = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useInteractionTagPrimary_unstable(props, ref);
    useInteractionTagPrimaryStyles_unstable(state);
    useCustomStyleHook_unstable('useInteractionTagPrimaryStyles_unstable')(state);
    return renderInteractionTagPrimary_unstable(state, useTagAvatarContextValues_unstable(state));
});
InteractionTagPrimary.displayName = 'InteractionTagPrimary';
