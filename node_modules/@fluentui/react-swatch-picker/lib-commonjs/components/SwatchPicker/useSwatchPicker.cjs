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
    useSwatchPickerBase_unstable: function() {
        return useSwatchPickerBase_unstable;
    },
    useSwatchPicker_unstable: function() {
        return useSwatchPicker_unstable;
    }
});
const _reactfield = require("@fluentui/react-field");
const _reacttabster = require("@fluentui/react-tabster");
const _reactutilities = require("@fluentui/react-utilities");
const useSwatchPickerBase_unstable = (props, ref)=>{
    // Merge props from surrounding <Field>, if any
    props = (0, _reactfield.useFieldControlProps_unstable)(props);
    const { layout, onSelectionChange, style, ...rest } = props;
    const isGrid = layout === 'grid';
    const role = isGrid ? 'grid' : 'radiogroup';
    const [selectedValue, setSelectedValue] = (0, _reactutilities.useControllableState)({
        state: props.selectedValue,
        defaultState: props.defaultSelectedValue,
        initialState: ''
    });
    const requestSelectionChange = (0, _reactutilities.useEventCallback)((event, data)=>{
        onSelectionChange === null || onSelectionChange === void 0 ? void 0 : onSelectionChange(event, {
            type: 'click',
            event,
            selectedValue: data.selectedValue,
            selectedSwatch: data.selectedSwatch
        });
        setSelectedValue(data.selectedValue);
    });
    return {
        components: {
            root: 'div'
        },
        root: _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)('div', {
            ref,
            role,
            ...rest
        }), {
            elementType: 'div'
        }),
        isGrid,
        requestSelectionChange,
        selectedValue
    };
};
const useSwatchPicker_unstable = (props, ref)=>{
    const { focusMode = 'arrow', size = 'medium', shape, spacing = 'medium', ...rest } = props;
    const baseState = useSwatchPickerBase_unstable(rest, ref);
    const focusAttributes = (0, _reacttabster.useArrowNavigationGroup)({
        circular: true,
        axis: baseState.isGrid ? 'grid-linear' : 'both',
        memorizeCurrent: true
    });
    return {
        ...baseState,
        root: {
            ...baseState.root,
            ...focusMode === 'arrow' ? focusAttributes : {}
        },
        size,
        shape,
        spacing
    };
};
