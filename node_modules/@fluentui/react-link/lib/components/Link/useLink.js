'use client';
import { getIntrinsicElementProps, slot } from "@fluentui/react-utilities";
import { useBackgroundAppearance } from "@fluentui/react-shared-contexts";
import { useLinkState_unstable } from "./useLinkState.js";
import { useLinkContext } from "../../contexts/linkContext.js";
/**
 * Given user props, defines default props for the Link, calls useLinkState_unstable, and returns processed state.
 * @param props - User provided props to the Link component.
 * @param ref - User provided ref to be passed to the Link component.
 */ export const useLink_unstable = (props, ref)=>{
    const backgroundAppearance = useBackgroundAppearance();
    const { inline: inlineContext } = useLinkContext();
    const { appearance = 'default', inline: inlineProp, ...baseProps } = props;
    const state = useLinkBase_unstable(baseProps, ref);
    return {
        appearance,
        backgroundAppearance,
        inline: inlineProp !== null && inlineProp !== void 0 ? inlineProp : !!inlineContext,
        ...state
    };
};
/**
 * Base hook for Link component, which manages state related to ARIA, keyboard handling,
 * disabled behavior, and slot structure. This hook excludes design-specific props (appearance, inline).
 *
 * @param props - User provided props to the Link component.
 * @param ref - User provided ref to be passed to the Link component.
 */ export const useLinkBase_unstable = (props, ref)=>{
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
        root: slot.always(getIntrinsicElementProps(elementType, {
            ref,
            ...propsWithAssignedAs
        }), {
            elementType
        })
    };
    useLinkState_unstable(state);
    return state;
};
