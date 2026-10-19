'use client';
import * as React from "react";
import { renderFluentProvider_unstable } from "./renderFluentProvider.js";
import { useFluentProvider_unstable } from "./useFluentProvider.js";
import { useFluentProviderStyles_unstable } from "./useFluentProviderStyles.styles.js";
import { useFluentProviderContextValues_unstable } from "./useFluentProviderContextValues.js";
export const FluentProvider = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useFluentProvider_unstable(props, ref);
    useFluentProviderStyles_unstable(state);
    const contextValues = useFluentProviderContextValues_unstable(state);
    return renderFluentProvider_unstable(state, contextValues);
});
FluentProvider.displayName = 'FluentProvider';
