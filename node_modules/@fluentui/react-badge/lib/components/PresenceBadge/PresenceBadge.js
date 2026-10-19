'use client';
import * as React from "react";
import { usePresenceBadge_unstable } from "./usePresenceBadge.js";
import { usePresenceBadgeStyles_unstable } from "./usePresenceBadgeStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
import { renderBadge_unstable } from "../../Badge.js";
/**
 * Define a styled Badge, using the `useBadge_unstable` hook.
 */ export const PresenceBadge = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = usePresenceBadge_unstable(props, ref);
    usePresenceBadgeStyles_unstable(state);
    useCustomStyleHook_unstable('usePresenceBadgeStyles_unstable')(state);
    return renderBadge_unstable(state);
});
PresenceBadge.displayName = 'PresenceBadge';
