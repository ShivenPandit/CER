'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "Tag", {
    enumerable: true,
    get: function() {
        return Tag;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const _useTag = require("./useTag.cjs");
const _renderTag = require("./renderTag.cjs");
const _useTagStylesstyles = require("./useTagStyles.styles.cjs");
const _reactsharedcontexts = require("@fluentui/react-shared-contexts");
const _index = require("../../utils/index.cjs");
const Tag = /*#__PURE__*/ _react.forwardRef((props, ref)=>{
    const state = (0, _useTag.useTag_unstable)(props, ref);
    (0, _useTagStylesstyles.useTagStyles_unstable)(state);
    (0, _reactsharedcontexts.useCustomStyleHook_unstable)('useTagStyles_unstable')(state);
    return (0, _renderTag.renderTag_unstable)(state, (0, _index.useTagAvatarContextValues_unstable)(state));
});
Tag.displayName = 'Tag';
