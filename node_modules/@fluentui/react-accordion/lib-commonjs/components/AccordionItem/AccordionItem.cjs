'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "AccordionItem", {
    enumerable: true,
    get: function() {
        return AccordionItem;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const _useAccordionItem = require("./useAccordionItem.cjs");
const _useAccordionItemContextValues = require("./useAccordionItemContextValues.cjs");
const _renderAccordionItem = require("./renderAccordionItem.cjs");
const _reactsharedcontexts = require("@fluentui/react-shared-contexts");
const _useAccordionItemStylesstyles = require("./useAccordionItemStyles.styles.cjs");
const AccordionItem = /*#__PURE__*/ _react.forwardRef((props, ref)=>{
    const state = (0, _useAccordionItem.useAccordionItem_unstable)(props, ref);
    const contextValues = (0, _useAccordionItemContextValues.useAccordionItemContextValues_unstable)(state);
    (0, _useAccordionItemStylesstyles.useAccordionItemStyles_unstable)(state);
    (0, _reactsharedcontexts.useCustomStyleHook_unstable)('useAccordionItemStyles_unstable')(state);
    return (0, _renderAccordionItem.renderAccordionItem_unstable)(state, contextValues);
});
AccordionItem.displayName = 'AccordionItem';
