'use client';
import * as React from "react";
import { useCombobox_unstable } from "./useCombobox.js";
import { renderCombobox_unstable } from "./renderCombobox.js";
import { useComboboxStyles_unstable } from "./useComboboxStyles.styles.js";
import { useComboboxContextValues } from "../../contexts/useComboboxContextValues.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * Combobox component: a selection control that allows users to choose from a set of possible options
 */ export const Combobox = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useCombobox_unstable(props, ref);
    const contextValues = useComboboxContextValues(state);
    useComboboxStyles_unstable(state);
    useCustomStyleHook_unstable('useComboboxStyles_unstable')(state);
    return renderCombobox_unstable(state, contextValues);
});
Combobox.displayName = 'Combobox';
