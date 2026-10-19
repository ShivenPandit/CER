'use client';
import * as React from "react";
import { useTagPicker_unstable } from "./useTagPicker.js";
import { renderTagPicker_unstable } from "./renderTagPicker.js";
import { useTagPickerContextValues } from "./useTagPickerContextValues.js";
/**
 * TagPicker component -
 * A TagPicker is a composite component that allows users to pick tags from a list of options.
 */ export const TagPicker = /*#__PURE__*/ React.memo((props)=>{
    const state = useTagPicker_unstable(props);
    const contextValues = useTagPickerContextValues(state);
    return renderTagPicker_unstable(state, contextValues);
});
TagPicker.displayName = 'TagPicker';
