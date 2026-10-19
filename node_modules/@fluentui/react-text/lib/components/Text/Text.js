'use client';
import * as React from "react";
import { useText_unstable } from "./useText.js";
import { renderText_unstable } from "./renderText.js";
import { useTextStyles_unstable } from "./useTextStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * Typography and styling abstraction component used to ensure consistency of text.
 */ export const Text = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useText_unstable(props, ref);
    useTextStyles_unstable(state);
    useCustomStyleHook_unstable('useTextStyles_unstable')(state);
    return renderText_unstable(state);
// Work around some small mismatches in inferred types which don't matter in practice
});
Text.displayName = 'Text';
