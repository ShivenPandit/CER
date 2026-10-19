"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "renderTreeItem_unstable", {
    enumerable: true,
    get: function() {
        return renderTreeItem_unstable;
    }
});
const _jsxruntime = require("@fluentui/react-jsx-runtime/jsx-runtime");
const _reactutilities = require("@fluentui/react-utilities");
const _index = require("../../contexts/index.cjs");
const renderTreeItem_unstable = (state, contextValues)=>{
    (0, _reactutilities.assertSlots)(state);
    return /*#__PURE__*/ (0, _jsxruntime.jsx)(state.root, {
        children: /*#__PURE__*/ (0, _jsxruntime.jsx)(_index.TreeItemProvider, {
            value: contextValues.treeItem,
            children: state.root.children
        })
    });
};
