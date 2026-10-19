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
    useColorPickerBase_unstable: function() {
        return useColorPickerBase_unstable;
    },
    useColorPicker_unstable: function() {
        return useColorPicker_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const useColorPickerBase_unstable = (props, ref)=>{
    const { color, onColorChange, ...rest } = props;
    const requestChange = (0, _reactutilities.useEventCallback)((event, data)=>{
        onColorChange === null || onColorChange === void 0 ? void 0 : onColorChange(event, {
            type: 'change',
            event,
            color: data.color
        });
    });
    return {
        components: {
            root: 'div'
        },
        root: _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)('div', {
            ref,
            ...rest
        }), {
            elementType: 'div'
        }),
        color,
        requestChange
    };
};
const useColorPicker_unstable = (props, ref)=>{
    const { shape, ...baseProps } = props;
    return {
        ...useColorPickerBase_unstable(baseProps, ref),
        shape
    };
};
