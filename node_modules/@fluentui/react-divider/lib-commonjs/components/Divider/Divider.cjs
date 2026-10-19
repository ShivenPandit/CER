'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "Divider", {
    enumerable: true,
    get: function() {
        return Divider;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const _renderDivider = require("./renderDivider.cjs");
const _useDivider = require("./useDivider.cjs");
const _useDividerStylesstyles = require("./useDividerStyles.styles.cjs");
const _reactsharedcontexts = require("@fluentui/react-shared-contexts");
const Divider = /*#__PURE__*/ _react.forwardRef((props, ref)=>{
    const state = (0, _useDivider.useDivider_unstable)(props, ref);
    (0, _useDividerStylesstyles.useDividerStyles_unstable)(state);
    (0, _reactsharedcontexts.useCustomStyleHook_unstable)('useDividerStyles_unstable')(state);
    return (0, _renderDivider.renderDivider_unstable)(state);
});
Divider.displayName = 'Divider';
