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
    useSplitButtonBase_unstable: function() {
        return useSplitButtonBase_unstable;
    },
    useSplitButton_unstable: function() {
        return useSplitButton_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const _Button = require("../Button/Button.cjs");
const _MenuButton = require("../MenuButton/MenuButton.cjs");
const useSplitButton_unstable = (props, ref)=>{
    const { appearance = 'secondary', icon, menuIcon, shape = 'rounded', size = 'medium', ...rest } = props;
    const baseState = useSplitButtonBase_unstable(rest, ref);
    const menuButtonShorthand = _reactutilities.slot.optional(props.menuButton, {
        defaultProps: {
            ...baseState.menuButton,
            appearance,
            disabledFocusable: baseState.disabledFocusable,
            menuIcon,
            shape,
            size
        },
        renderByDefault: true,
        elementType: _MenuButton.MenuButton
    });
    const primaryActionButtonShorthand = _reactutilities.slot.optional(props.primaryActionButton, {
        defaultProps: {
            ...baseState.primaryActionButton,
            appearance,
            disabledFocusable: baseState.disabledFocusable,
            icon,
            iconPosition: baseState.iconPosition,
            shape,
            size
        },
        renderByDefault: true,
        elementType: _Button.Button
    });
    return {
        ...baseState,
        // Props passed at the top-level
        appearance,
        shape,
        size,
        // Slots definition
        components: {
            root: 'div',
            menuButton: _MenuButton.MenuButton,
            primaryActionButton: _Button.Button
        },
        menuButton: menuButtonShorthand,
        primaryActionButton: primaryActionButtonShorthand
    };
};
const useSplitButtonBase_unstable = (props, ref)=>{
    const { children, disabled = false, disabledFocusable = false, icon, iconPosition = 'before', menuButton, menuIcon, primaryActionButton, ...rest } = props;
    const baseId = (0, _reactutilities.useId)('splitButton-');
    const menuButtonShorthand = _reactutilities.slot.optional(menuButton, {
        defaultProps: {
            disabled
        },
        renderByDefault: true,
        elementType: 'button'
    });
    const primaryActionButtonShorthand = _reactutilities.slot.optional(primaryActionButton, {
        defaultProps: {
            children,
            disabled,
            id: baseId + '__primaryActionButton'
        },
        renderByDefault: true,
        elementType: 'button'
    });
    // Resolve menu button's aria-labelledby to be labelled by the primary action button if no label was provided by the
    // user.
    if (menuButtonShorthand && primaryActionButtonShorthand && !menuButtonShorthand['aria-label'] && !menuButtonShorthand['aria-labelledby']) {
        menuButtonShorthand['aria-labelledby'] = primaryActionButtonShorthand.id;
    }
    return {
        disabled,
        disabledFocusable,
        iconPosition,
        // Slots definition
        components: {
            root: 'div',
            menuButton: 'button',
            primaryActionButton: 'button'
        },
        root: _reactutilities.slot.always({
            ref,
            ...rest
        }, {
            elementType: 'div'
        }),
        menuButton: menuButtonShorthand,
        primaryActionButton: primaryActionButtonShorthand
    };
};
