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
    useEmptySwatchBase_unstable: function() {
        return useEmptySwatchBase_unstable;
    },
    useEmptySwatch_unstable: function() {
        return useEmptySwatch_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const _swatchPicker = require("../../contexts/swatchPicker.cjs");
const useEmptySwatchBase_unstable = (props, ref)=>{
    const isGrid = (0, _swatchPicker.useSwatchPickerContextValue_unstable)((ctx)=>ctx.isGrid);
    const role = isGrid ? 'gridcell' : 'radio';
    const a11yProps = isGrid ? {} : {
        'aria-checked': false
    };
    return {
        components: {
            root: 'button'
        },
        root: _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)('button', {
            ref,
            role,
            ...a11yProps,
            ...props
        }), {
            elementType: 'button'
        })
    };
};
const useEmptySwatch_unstable = (props, ref)=>{
    const sizeFromContext = (0, _swatchPicker.useSwatchPickerContextValue_unstable)((ctx)=>ctx.size);
    const shapeFromContext = (0, _swatchPicker.useSwatchPickerContextValue_unstable)((ctx)=>ctx.shape);
    const { size = sizeFromContext, shape = shapeFromContext, ...rest } = props;
    const baseState = useEmptySwatchBase_unstable(rest, ref);
    return {
        ...baseState,
        size,
        shape
    };
};
