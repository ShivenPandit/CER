'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "FlatTree", {
    enumerable: true,
    get: function() {
        return FlatTree;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const _useFlatTree = require("./useFlatTree.cjs");
const _useFlatTreeStylesstyles = require("./useFlatTreeStyles.styles.cjs");
const _useFlatTreeContextValues = require("./useFlatTreeContextValues.cjs");
const _renderFlatTree = require("./renderFlatTree.cjs");
const _reactsharedcontexts = require("@fluentui/react-shared-contexts");
const FlatTree = /*#__PURE__*/ _react.forwardRef((props, ref)=>{
    const state = (0, _useFlatTree.useFlatTree_unstable)(props, ref);
    const contextValues = (0, _useFlatTreeContextValues.useFlatTreeContextValues_unstable)(state);
    (0, _useFlatTreeStylesstyles.useFlatTreeStyles_unstable)(state);
    (0, _reactsharedcontexts.useCustomStyleHook_unstable)('useFlatTreeStyles_unstable')(state);
    return (0, _renderFlatTree.renderFlatTree_unstable)(state, contextValues);
});
FlatTree.displayName = 'FlatTree';
