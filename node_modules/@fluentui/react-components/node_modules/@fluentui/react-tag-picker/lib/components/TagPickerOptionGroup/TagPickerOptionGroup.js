'use client';
import * as React from "react";
import { useTagPickerOptionGroup } from "./useTagPickerOptionGroup.js";
import { renderTagPickerOptionGroup } from "./renderTagPickerOptionGroup.js";
import { useTagPickerOptionGroupStyles } from "./useTagPickerOptionGroupStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * TagPickerOptionGroup component -
 * A TagPickerOptionGroup is a composite component that allows users to group TagPickerOptions.
 */ export const TagPickerOptionGroup = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useTagPickerOptionGroup(props, ref);
    useTagPickerOptionGroupStyles(state);
    useCustomStyleHook_unstable('useTagPickerOptionGroupStyles_unstable')(state);
    return renderTagPickerOptionGroup(state);
});
TagPickerOptionGroup.displayName = 'TagPickerOptionGroup';
