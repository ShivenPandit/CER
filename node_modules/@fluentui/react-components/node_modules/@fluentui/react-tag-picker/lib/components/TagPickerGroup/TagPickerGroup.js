'use client';
import * as React from "react";
import { useTagPickerGroup_unstable } from "./useTagPickerGroup.js";
import { useTagGroupContextValues_unstable } from "@fluentui/react-tags";
import { renderTagPickerGroup_unstable } from "./renderTagPickerGroup.js";
import { useTagPickerGroupStyles_unstable } from "./useTagPickerGroupStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * TagPickerGroup component -
 * A TagPickerGroup is a composite component that allows users to group tags together.
 */ export const TagPickerGroup = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useTagPickerGroup_unstable(props, ref);
    useTagPickerGroupStyles_unstable(state);
    useCustomStyleHook_unstable('useTagPickerGroupStyles_unstable')(state);
    return renderTagPickerGroup_unstable(state, useTagGroupContextValues_unstable(state));
});
TagPickerGroup.displayName = 'TagPickerGroup';
