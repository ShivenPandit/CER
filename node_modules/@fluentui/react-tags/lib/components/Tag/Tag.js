'use client';
import * as React from "react";
import { useTag_unstable } from "./useTag.js";
import { renderTag_unstable } from "./renderTag.js";
import { useTagStyles_unstable } from "./useTagStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
import { useTagAvatarContextValues_unstable } from "../../utils/index.js";
/**
 * Tag component -  a visual representation of an attribute.
 * Provides visual attributes such as media, icon, primary and secondary text, as well as the ability to attach an action (by default it is dismiss)
 */ export const Tag = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useTag_unstable(props, ref);
    useTagStyles_unstable(state);
    useCustomStyleHook_unstable('useTagStyles_unstable')(state);
    return renderTag_unstable(state, useTagAvatarContextValues_unstable(state));
});
Tag.displayName = 'Tag';
