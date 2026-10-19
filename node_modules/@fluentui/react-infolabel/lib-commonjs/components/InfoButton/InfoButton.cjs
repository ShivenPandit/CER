'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "InfoButton", {
    enumerable: true,
    get: function() {
        return InfoButton;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const _reactsharedcontexts = require("@fluentui/react-shared-contexts");
const _renderInfoButton = require("./renderInfoButton.cjs");
const _useInfoButton = require("./useInfoButton.cjs");
const _useInfoButtonStylesstyles = require("./useInfoButtonStyles.styles.cjs");
const InfoButton = /*#__PURE__*/ _react.forwardRef((props, ref)=>{
    const state = (0, _useInfoButton.useInfoButton_unstable)(props, ref);
    (0, _useInfoButtonStylesstyles.useInfoButtonStyles_unstable)(state);
    (0, _reactsharedcontexts.useCustomStyleHook_unstable)('useInfoButtonStyles_unstable')(state);
    return (0, _renderInfoButton.renderInfoButton_unstable)(state);
});
InfoButton.displayName = 'InfoButton';
