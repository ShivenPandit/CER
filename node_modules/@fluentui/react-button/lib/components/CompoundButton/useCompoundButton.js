'use client';
import { slot } from "@fluentui/react-utilities";
import { useButtonContext } from "../../contexts/ButtonContext.js";
import { useButtonBase_unstable } from "../Button/index.js";
/**
 * Base hook for CompoundButton, which manages state related to slots structure and ARIA attributes.
 *
 * @param props - User provided props to the CompoundButton component.
 * @param ref - User provided ref to be passed to the CompoundButton component.
 */ export const useCompoundButtonBase_unstable = (props, ref)=>{
    var _state_icon, _state_secondaryContent;
    const { contentContainer, secondaryContent, ...buttonProps } = props;
    const state = {
        ...useButtonBase_unstable(buttonProps, ref),
        components: {
            root: 'button',
            icon: 'span',
            contentContainer: 'span',
            secondaryContent: 'span'
        },
        contentContainer: slot.always(contentContainer, {
            elementType: 'span'
        }),
        secondaryContent: slot.optional(secondaryContent, {
            elementType: 'span'
        })
    };
    state.iconOnly = Boolean(((_state_icon = state.icon) === null || _state_icon === void 0 ? void 0 : _state_icon.children) && !props.children && !((_state_secondaryContent = state.secondaryContent) === null || _state_secondaryContent === void 0 ? void 0 : _state_secondaryContent.children));
    return state;
};
/**
 * Given user props, defines default props for the CompoundButton, calls useButtonState, and returns processed state.
 * @param props - User provided props to the CompoundButton component.
 * @param ref - User provided ref to be passed to the CompoundButton component.
 */ export const useCompoundButton_unstable = (props, ref)=>{
    const { size: contextSize } = useButtonContext();
    const { appearance = 'secondary', shape = 'rounded', size = contextSize !== null && contextSize !== void 0 ? contextSize : 'medium', ...buttonProps } = props;
    const state = useCompoundButtonBase_unstable(buttonProps, ref);
    return {
        appearance,
        shape,
        size,
        ...state
    };
};
