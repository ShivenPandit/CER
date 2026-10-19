'use client';
import * as React from "react";
import { useCard_unstable } from "./useCard.js";
import { renderCard_unstable } from "./renderCard.js";
import { useCardStyles_unstable } from "./useCardStyles.styles.js";
import { useCardContextValue } from "./useCardContextValue.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * A card provides scaffolding for hosting actions and content for a single topic.
 */ export const Card = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useCard_unstable(props, ref);
    const cardContextValue = useCardContextValue(state);
    useCardStyles_unstable(state);
    useCustomStyleHook_unstable('useCardStyles_unstable')(state);
    return renderCard_unstable(state, cardContextValue);
});
Card.displayName = 'Card';
