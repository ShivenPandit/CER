'use client';
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
    useLinkBase_unstable: function() {
        return useLinkBase_unstable;
    },
    useLink_unstable: function() {
        return useLink_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const _reactsharedcontexts = require("@fluentui/react-shared-contexts");
const _useLinkState = require("./useLinkState.cjs");
const _linkContext = require("../../contexts/linkContext.cjs");
const useLink_unstable = (props, ref)=>{
    const backgroundAppearance = (0, _reactsharedcontexts.useBackgroundAppearance)();
    const { inline: inlineContext } = (0, _linkContext.useLinkContext)();
    const { appearance = 'default', inline: inlineProp, ...baseProps } = props;
    const state = useLinkBase_unstable(baseProps, ref);
    return {
        appearance,
        backgroundAppearance,
        inline: inlineProp !== null && inlineProp !== void 0 ? inlineProp : !!inlineContext,
        ...state
    };
};
const useLinkBase_unstable = (props, ref)=>{
    const { disabled = false, disabledFocusable = false } = props;
    const elementType = props.as || (props.href ? 'a' : 'button');
    // Casting is required here as `as` prop would break the union between `a`, `button` and `span` types
    const propsWithAssignedAs = {
        role: elementType === 'span' ? 'button' : undefined,
        type: elementType === 'button' ? 'button' : undefined,
        ...props,
        as: elementType
    };
    const state = {
        // Props passed at the top-level
        disabled,
        disabledFocusable,
        // Slots definition
        components: {
            root: elementType
        },
        root: _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)(elementType, {
            ref,
            ...propsWithAssignedAs
        }), {
            elementType
        })
    };
    (0, _useLinkState.useLinkState_unstable)(state);
    return state;
};
