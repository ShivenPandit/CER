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
    useColorSwatchBase_unstable: function() {
        return useColorSwatchBase_unstable;
    },
    useColorSwatch_unstable: function() {
        return useColorSwatch_unstable;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const _reactutilities = require("@fluentui/react-utilities");
const _swatchPicker = require("../../contexts/swatchPicker.cjs");
const _reacticons = require("@fluentui/react-icons");
const _ColorSwatchconstants = require("./ColorSwatch.constants.cjs");
const useColorSwatchBase_unstable = (props, ref)=>{
    const { borderColor, color, disabled, disabledIcon, icon, value, onClick, style, ...rest } = props;
    const isGrid = (0, _swatchPicker.useSwatchPickerContextValue_unstable)((ctx)=>ctx.isGrid);
    const requestSelectionChange = (0, _swatchPicker.useSwatchPickerContextValue_unstable)((ctx)=>ctx.requestSelectionChange);
    const selected = (0, _swatchPicker.useSwatchPickerContextValue_unstable)((ctx)=>ctx.selectedValue === value);
    const onColorSwatchClick = (0, _reactutilities.useEventCallback)((0, _reactutilities.mergeCallbacks)(onClick, (event)=>requestSelectionChange(event, {
            selectedValue: value,
            selectedSwatch: color
        })));
    const rootVariables = {
        [_ColorSwatchconstants.swatchCSSVars.color]: color,
        [_ColorSwatchconstants.swatchCSSVars.borderColor]: borderColor
    };
    const role = isGrid ? 'gridcell' : 'radio';
    const ariaSelected = isGrid ? {
        'aria-selected': selected
    } : {
        'aria-checked': selected
    };
    const iconShorthand = _reactutilities.slot.optional(icon, {
        elementType: 'span'
    });
    const disabledIconShorthand = _reactutilities.slot.optional(disabledIcon, {
        elementType: 'span'
    });
    return {
        components: {
            root: 'button',
            icon: 'span',
            disabledIcon: 'span'
        },
        root: _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)('button', {
            ref,
            role,
            ...ariaSelected,
            onClick: onColorSwatchClick,
            type: 'button',
            disabled,
            ...rest,
            style: {
                ...rootVariables,
                ...style
            }
        }), {
            elementType: 'button'
        }),
        icon: iconShorthand,
        disabledIcon: disabledIconShorthand,
        disabled,
        selected,
        color,
        value
    };
};
const useColorSwatch_unstable = (props, ref)=>{
    const sizeFromContext = (0, _swatchPicker.useSwatchPickerContextValue_unstable)((ctx)=>ctx.size);
    const shapeFromContext = (0, _swatchPicker.useSwatchPickerContextValue_unstable)((ctx)=>ctx.shape);
    const { size = sizeFromContext, shape = shapeFromContext, disabledIcon, ...rest } = props;
    const baseState = useColorSwatchBase_unstable(rest, ref);
    return {
        ...baseState,
        size,
        shape,
        disabledIcon: _reactutilities.slot.optional(disabledIcon, {
            defaultProps: {
                ...baseState.disabledIcon,
                children: /*#__PURE__*/ _react.createElement(_reacticons.ProhibitedFilled, null)
            },
            renderByDefault: true,
            elementType: 'span'
        })
    };
};
