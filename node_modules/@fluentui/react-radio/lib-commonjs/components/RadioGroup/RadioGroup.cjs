'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "RadioGroup", {
    enumerable: true,
    get: function() {
        return RadioGroup;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const _renderRadioGroup = require("./renderRadioGroup.cjs");
const _useRadioGroup = require("./useRadioGroup.cjs");
const _useRadioGroupStylesstyles = require("./useRadioGroupStyles.styles.cjs");
const _useRadioGroupContextValues = require("../../contexts/useRadioGroupContextValues.cjs");
const _reactsharedcontexts = require("@fluentui/react-shared-contexts");
const RadioGroup = /*#__PURE__*/ _react.forwardRef((props, ref)=>{
    const state = (0, _useRadioGroup.useRadioGroup_unstable)(props, ref);
    const contextValues = (0, _useRadioGroupContextValues.useRadioGroupContextValues)(state);
    (0, _useRadioGroupStylesstyles.useRadioGroupStyles_unstable)(state);
    (0, _reactsharedcontexts.useCustomStyleHook_unstable)('useRadioGroupStyles_unstable')(state);
    return (0, _renderRadioGroup.renderRadioGroup_unstable)(state, contextValues);
});
RadioGroup.displayName = 'RadioGroup';
