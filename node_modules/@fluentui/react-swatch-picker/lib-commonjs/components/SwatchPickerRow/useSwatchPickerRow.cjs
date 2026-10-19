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
    useSwatchPickerRowBase_unstable: function() {
        return useSwatchPickerRowBase_unstable;
    },
    useSwatchPickerRow_unstable: function() {
        return useSwatchPickerRow_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const _swatchPicker = require("../../contexts/swatchPicker.cjs");
const useSwatchPickerRowBase_unstable = (props, ref)=>{
    const { style, ...rest } = props;
    return {
        components: {
            root: 'div'
        },
        root: _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)('div', {
            ref,
            role: 'row',
            ...rest
        }), {
            elementType: 'div'
        })
    };
};
const useSwatchPickerRow_unstable = (props, ref)=>{
    const spacing = (0, _swatchPicker.useSwatchPickerContextValue_unstable)((ctx)=>ctx.spacing);
    const baseState = useSwatchPickerRowBase_unstable(props, ref);
    return {
        ...baseState,
        spacing
    };
};
