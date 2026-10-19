'use client';
import * as React from "react";
export const useColorPickerBaseContextValues_unstable = (state)=>{
    const { color, requestChange } = state;
    const colorPicker = React.useMemo(()=>({
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
export const useColorPickerContextValues = (state)=>{
    const { color, shape, requestChange } = state;
    const colorPicker = React.useMemo(()=>({
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
