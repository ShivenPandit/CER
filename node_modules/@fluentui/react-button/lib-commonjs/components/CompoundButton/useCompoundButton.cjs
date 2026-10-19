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
    useCompoundButtonBase_unstable: function() {
        return useCompoundButtonBase_unstable;
    },
    useCompoundButton_unstable: function() {
        return useCompoundButton_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const _ButtonContext = require("../../contexts/ButtonContext.cjs");
const _index = require("../Button/index.cjs");
const useCompoundButtonBase_unstable = (props, ref)=>{
    var _state_icon, _state_secondaryContent;
    const { contentContainer, secondaryContent, ...buttonProps } = props;
    const state = {
        ...(0, _index.useButtonBase_unstable)(buttonProps, ref),
        components: {
            root: 'button',
            icon: 'span',
            contentContainer: 'span',
            secondaryContent: 'span'
        },
        contentContainer: _reactutilities.slot.always(contentContainer, {
            elementType: 'span'
        }),
        secondaryContent: _reactutilities.slot.optional(secondaryContent, {
            elementType: 'span'
        })
    };
    state.iconOnly = Boolean(((_state_icon = state.icon) === null || _state_icon === void 0 ? void 0 : _state_icon.children) && !props.children && !((_state_secondaryContent = state.secondaryContent) === null || _state_secondaryContent === void 0 ? void 0 : _state_secondaryContent.children));
    return state;
};
const useCompoundButton_unstable = (props, ref)=>{
    const { size: contextSize } = (0, _ButtonContext.useButtonContext)();
    const { appearance = 'secondary', shape = 'rounded', size = contextSize !== null && contextSize !== void 0 ? contextSize : 'medium', ...buttonProps } = props;
    const state = useCompoundButtonBase_unstable(buttonProps, ref);
    return {
        appearance,
        shape,
        size,
        ...state
    };
};
