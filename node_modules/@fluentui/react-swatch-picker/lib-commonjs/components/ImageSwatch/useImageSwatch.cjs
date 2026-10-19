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
    useImageSwatchBase_unstable: function() {
        return useImageSwatchBase_unstable;
    },
    useImageSwatch_unstable: function() {
        return useImageSwatch_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const _swatchPicker = require("../../contexts/swatchPicker.cjs");
const useImageSwatchBase_unstable = (props, ref)=>{
    const { src, value, onClick, style, ...rest } = props;
    const isGrid = (0, _swatchPicker.useSwatchPickerContextValue_unstable)((ctx)=>ctx.isGrid);
    const requestSelectionChange = (0, _swatchPicker.useSwatchPickerContextValue_unstable)((ctx)=>ctx.requestSelectionChange);
    const selected = (0, _swatchPicker.useSwatchPickerContextValue_unstable)((ctx)=>ctx.selectedValue === value);
    const role = isGrid ? 'gridcell' : 'radio';
    const ariaSelected = isGrid ? {
        'aria-selected': selected
    } : {
        'aria-checked': selected
    };
    const onImageSwatchClick = (0, _reactutilities.useEventCallback)((0, _reactutilities.mergeCallbacks)(onClick, (event)=>requestSelectionChange(event, {
            selectedValue: value,
            selectedSwatch: src
        })));
    return {
        components: {
            root: 'button'
        },
        root: _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)('button', {
            ref,
            role,
            ...ariaSelected,
            onClick: onImageSwatchClick,
            ...rest,
            style: {
                backgroundImage: `url(${src})`,
                ...style
            }
        }), {
            elementType: 'button'
        }),
        value,
        selected
    };
};
const useImageSwatch_unstable = (props, ref)=>{
    const sizeFromContext = (0, _swatchPicker.useSwatchPickerContextValue_unstable)((ctx)=>ctx.size);
    const shapeFromContext = (0, _swatchPicker.useSwatchPickerContextValue_unstable)((ctx)=>ctx.shape);
    const { size: _size, shape: _shape, ...rest } = props;
    const baseState = useImageSwatchBase_unstable(rest, ref);
    return {
        ...baseState,
        size: sizeFromContext,
        shape: shapeFromContext
    };
};
