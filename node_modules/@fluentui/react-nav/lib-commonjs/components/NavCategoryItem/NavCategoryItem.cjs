'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "NavCategoryItem", {
    enumerable: true,
    get: function() {
        return NavCategoryItem;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const _reactsharedcontexts = require("@fluentui/react-shared-contexts");
const _useNavCategoryItem = require("./useNavCategoryItem.cjs");
const _renderNavCategoryItem = require("./renderNavCategoryItem.cjs");
const _useNavCategoryItemstyles = require("./useNavCategoryItem.styles.cjs");
const _useNavCategoryItemContextValues_unstable = require("../useNavCategoryItemContextValues_unstable.cjs");
const NavCategoryItem = /*#__PURE__*/ _react.forwardRef((props, ref)=>{
    const state = (0, _useNavCategoryItem.useNavCategoryItem_unstable)(props, ref);
    const contextValues = (0, _useNavCategoryItemContextValues_unstable.useNavCategoryItemContextValues_unstable)(state);
    (0, _useNavCategoryItemstyles.useNavCategoryItemStyles_unstable)(state);
    (0, _reactsharedcontexts.useCustomStyleHook_unstable)('useNavCategoryItemStyles')(state);
    return (0, _renderNavCategoryItem.renderNavCategoryItem_unstable)(state, contextValues);
});
NavCategoryItem.displayName = 'NavCategoryItem';
