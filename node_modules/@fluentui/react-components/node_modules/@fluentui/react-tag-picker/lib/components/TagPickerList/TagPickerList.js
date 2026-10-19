'use client';
import * as React from "react";
import { useTagPickerList_unstable } from "./useTagPickerList.js";
import { renderTagPickerList_unstable } from "./renderTagPickerList.js";
import { useTagPickerListStyles_unstable } from "./useTagPickerListStyles.styles.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * TagPickerList component -
 * A TagPickerList is a composite component that allows users to display a list of tag options to be selected.
 */ export const TagPickerList = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useTagPickerList_unstable(props, ref);
    useTagPickerListStyles_unstable(state);
    useCustomStyleHook_unstable('useTagPickerListStyles_unstable')(state);
    return renderTagPickerList_unstable(state);
});
TagPickerList.displayName = 'TagPickerList';
