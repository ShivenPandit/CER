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
    useAlphaSliderBase_unstable: function() {
        return useAlphaSliderBase_unstable;
    },
    useAlphaSlider_unstable: function() {
        return useAlphaSlider_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const _useAlphaSliderState = require("./useAlphaSliderState.cjs");
const _colorPicker = require("../../contexts/colorPicker.cjs");
const useAlphaSlider_unstable = (props, ref)=>{
    const shapeFromContext = (0, _colorPicker.useColorPickerContextValue_unstable)((ctx)=>ctx.shape);
    const { shape = shapeFromContext, ...baseProps } = props;
    return {
        ...useAlphaSliderBase_unstable(baseProps, ref),
        shape
    };
};
const useAlphaSliderBase_unstable = (props, ref)=>{
    const nativeProps = (0, _reactutilities.getPartitionedNativeProps)({
        props,
        primarySlotTagName: 'input',
        excludedPropNames: [
            'onChange',
            'color'
        ]
    });
    const { vertical, root, input, rail, thumb } = props;
    const state = {
        vertical,
        components: {
            input: 'input',
            rail: 'div',
            root: 'div',
            thumb: 'div'
        },
        root: _reactutilities.slot.always(root, {
            defaultProps: nativeProps.root,
            elementType: 'div'
        }),
        input: _reactutilities.slot.always(input, {
            defaultProps: {
                id: (0, _reactutilities.useId)('slider-', props.id),
                ref,
                ...nativeProps.primary,
                type: 'range'
            },
            elementType: 'input'
        }),
        rail: _reactutilities.slot.always(rail, {
            elementType: 'div'
        }),
        thumb: _reactutilities.slot.always(thumb, {
            elementType: 'div'
        })
    };
    (0, _useAlphaSliderState.useAlphaSliderState_unstable)(state, props);
    return state;
};
