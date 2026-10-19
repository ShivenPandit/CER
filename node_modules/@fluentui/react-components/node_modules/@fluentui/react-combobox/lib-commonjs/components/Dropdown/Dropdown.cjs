'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "Dropdown", {
    enumerable: true,
    get: function() {
        return Dropdown;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const _useDropdown = require("./useDropdown.cjs");
const _renderDropdown = require("./renderDropdown.cjs");
const _useDropdownStylesstyles = require("./useDropdownStyles.styles.cjs");
const _useComboboxContextValues = require("../../contexts/useComboboxContextValues.cjs");
const _reactsharedcontexts = require("@fluentui/react-shared-contexts");
const Dropdown = /*#__PURE__*/ _react.forwardRef((props, ref)=>{
    const state = (0, _useDropdown.useDropdown_unstable)(props, ref);
    const contextValues = (0, _useComboboxContextValues.useComboboxContextValues)(state);
    (0, _useDropdownStylesstyles.useDropdownStyles_unstable)(state);
    (0, _reactsharedcontexts.useCustomStyleHook_unstable)('useDropdownStyles_unstable')(state);
    return (0, _renderDropdown.renderDropdown_unstable)(state, contextValues);
});
Dropdown.displayName = 'Dropdown';
