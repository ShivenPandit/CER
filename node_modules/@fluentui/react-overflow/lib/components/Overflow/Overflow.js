'use client';
import * as React from "react";
import { useOverflow_unstable } from "./useOverflow.js";
import { useOverflowContextValues_unstable } from "../../useOverflowContextValues.js";
import { useOverflowStyles_unstable } from "./useOverflowStyles.styles.js";
import { renderOverflow_unstable } from "./renderOverflow.js";
/**
 * Provides an OverflowContext for OverflowItem descendants.
 */ export const Overflow = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useOverflow_unstable(props, ref);
    const contextValues = useOverflowContextValues_unstable(state);
    useOverflowStyles_unstable(state);
    return renderOverflow_unstable(state, contextValues);
});
