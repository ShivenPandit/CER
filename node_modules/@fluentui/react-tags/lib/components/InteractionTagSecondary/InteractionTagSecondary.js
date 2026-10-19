'use client';
import * as React from "react";
import { useInteractionTagSecondary_unstable } from "./useInteractionTagSecondary.js";
import { renderInteractionTagSecondary_unstable } from "./renderInteractionTagSecondary.js";
import { useInteractionTagSecondaryStyles_unstable } from "./useInteractionTagSecondaryStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * InteractionTagSecondary component - used as the second child of the `InteractionTag` component and provides the secondary action, which is dismiss by default.
 */ export const InteractionTagSecondary = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useInteractionTagSecondary_unstable(props, ref);
    useInteractionTagSecondaryStyles_unstable(state);
    useCustomStyleHook_unstable('useInteractionTagSecondaryStyles_unstable')(state);
    return renderInteractionTagSecondary_unstable(state);
});
InteractionTagSecondary.displayName = 'InteractionTagSecondary';
