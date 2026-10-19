'use client';
import * as React from "react";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
import { renderInfoLabel_unstable } from "./renderInfoLabel.js";
import { useInfoLabel_unstable } from "./useInfoLabel.js";
import { useInfoLabelStyles_unstable } from "./useInfoLabelStyles.styles.js";
/**
 * InfoLabel component
 */ export const InfoLabel = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useInfoLabel_unstable(props, ref);
    useInfoLabelStyles_unstable(state);
    useCustomStyleHook_unstable('useInfoLabelStyles_unstable')(state);
    return renderInfoLabel_unstable(state);
});
InfoLabel.displayName = 'InfoLabel';
