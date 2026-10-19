'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useTeachingPopoverTitle_unstable", {
    enumerable: true,
    get: function() {
        return useTeachingPopoverTitle_unstable;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const _reacticons = require("@fluentui/react-icons");
const _reactpopover = require("@fluentui/react-popover");
const _useTeachingPopoverTitleBase = require("./useTeachingPopoverTitleBase.cjs");
const DismissIcon = (0, _reacticons.bundleIcon)(_reacticons.DismissFilled, _reacticons.DismissRegular);
const useTeachingPopoverTitle_unstable = (props, ref)=>{
    const baseState = (0, _useTeachingPopoverTitleBase.useTeachingPopoverTitleBase_unstable)(props, ref);
    const appearance = (0, _reactpopover.usePopoverContext_unstable)((context)=>context.appearance);
    const dismissButton = baseState.dismissButton && baseState.dismissButton.children === undefined ? {
        ...baseState.dismissButton,
        children: /*#__PURE__*/ _react.createElement(DismissIcon, null)
    } : baseState.dismissButton;
    return {
        ...baseState,
        appearance,
        dismissButton
    };
};
