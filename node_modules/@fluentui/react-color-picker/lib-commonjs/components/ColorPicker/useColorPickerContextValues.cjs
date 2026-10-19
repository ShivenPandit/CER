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
    useColorPickerBaseContextValues_unstable: function() {
        return useColorPickerBaseContextValues_unstable;
    },
    useColorPickerContextValues: function() {
        return useColorPickerContextValues;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const useColorPickerBaseContextValues_unstable = (state)=>{
    const { color, requestChange } = state;
    const colorPicker = _react.useMemo(()=>({
            requestChange,
            color,
            shape: undefined
        }), [
        requestChange,
        color
    ]);
    return {
        colorPicker
    };
};
const useColorPickerContextValues = (state)=>{
    const { color, shape, requestChange } = state;
    const colorPicker = _react.useMemo(()=>({
            requestChange,
            color,
            shape
        }), [
        requestChange,
        color,
        shape
    ]);
    return {
        colorPicker
    };
};
