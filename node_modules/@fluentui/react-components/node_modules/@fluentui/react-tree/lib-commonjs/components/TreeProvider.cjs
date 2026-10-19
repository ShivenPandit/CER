"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
function _export(target, all) {
    for(var name in all)Object.defineProperty(target, name, {
        enumerable: true,
        get: all[name]
    });
}
_export(exports, {
    TreeProvider: function() {
        return TreeProvider;
    },
    TreeRootReset: function() {
        return TreeRootReset;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const _index = require("../contexts/index.cjs");
/**
 * @internal
 */ const rootSubtreeContextValue = {
    level: 1,
    contextType: 'subtree'
};
const TreeProvider = (props)=>{
    if (props.value.contextType === 'subtree') {
        return /*#__PURE__*/ _react.createElement(_index.SubtreeContext.Provider, {
            value: props.value
        }, props.children);
    }
    return /*#__PURE__*/ _react.createElement(_index.TreeContext.Provider, {
        value: props.value
    }, /*#__PURE__*/ _react.createElement(_index.SubtreeContext.Provider, {
        value: rootSubtreeContextValue
    }, props.children));
};
TreeProvider.displayName = 'TreeProvider';
const TreeRootReset = (props)=>/*#__PURE__*/ _react.createElement(_index.SubtreeContext.Provider, {
        value: undefined
    }, props.children);
