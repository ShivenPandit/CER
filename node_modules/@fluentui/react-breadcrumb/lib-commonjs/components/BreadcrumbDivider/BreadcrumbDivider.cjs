'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "BreadcrumbDivider", {
    enumerable: true,
    get: function() {
        return BreadcrumbDivider;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const _useBreadcrumbDivider = require("./useBreadcrumbDivider.cjs");
const _renderBreadcrumbDivider = require("./renderBreadcrumbDivider.cjs");
const _useBreadcrumbDividerStylesstyles = require("./useBreadcrumbDividerStyles.styles.cjs");
const _reactsharedcontexts = require("@fluentui/react-shared-contexts");
const BreadcrumbDivider = /*#__PURE__*/ _react.forwardRef((props, ref)=>{
    const state = (0, _useBreadcrumbDivider.useBreadcrumbDivider_unstable)(props, ref);
    (0, _useBreadcrumbDividerStylesstyles.useBreadcrumbDividerStyles_unstable)(state);
    (0, _reactsharedcontexts.useCustomStyleHook_unstable)('useBreadcrumbDividerStyles_unstable')(state);
    return (0, _renderBreadcrumbDivider.renderBreadcrumbDivider_unstable)(state);
});
BreadcrumbDivider.displayName = 'BreadcrumbDivider';
