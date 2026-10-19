'use client';
import * as React from "react";
import { renderRadioGroup_unstable } from "./renderRadioGroup.js";
import { useRadioGroup_unstable } from "./useRadioGroup.js";
import { useRadioGroupStyles_unstable } from "./useRadioGroupStyles.styles.js";
import { useRadioGroupContextValues } from "../../contexts/useRadioGroupContextValues.js";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
/**
 * A RadioGroup component presents a set of options where only one option can be selected.
 */ export const RadioGroup = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useRadioGroup_unstable(props, ref);
    const contextValues = useRadioGroupContextValues(state);
    useRadioGroupStyles_unstable(state);
    useCustomStyleHook_unstable('useRadioGroupStyles_unstable')(state);
    return renderRadioGroup_unstable(state, contextValues);
});
RadioGroup.displayName = 'RadioGroup';
