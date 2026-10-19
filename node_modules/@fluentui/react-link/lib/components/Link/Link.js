'use client';
import * as React from "react";
import { useLink_unstable } from "./useLink.js";
import { useLinkStyles_unstable } from "./useLinkStyles.styles.js";
import { renderLink_unstable } from "./renderLink.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * A Link is a reference to data that a user can follow by clicking or tapping it.
 */ export const Link = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useLink_unstable(props, ref);
    useLinkStyles_unstable(state);
    useCustomStyleHook_unstable('useLinkStyles_unstable')(state);
    return renderLink_unstable(state);
// Work around some small mismatches in inferred types which don't matter in practice
});
Link.displayName = 'Link';
