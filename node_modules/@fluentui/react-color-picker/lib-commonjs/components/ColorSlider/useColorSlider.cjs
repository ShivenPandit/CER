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
    useColorSliderBase_unstable: function() {
        return useColorSliderBase_unstable;
    },
    useColorSlider_unstable: function() {
        return useColorSlider_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const _ColorSliderconstants = require("./ColorSlider.constants.cjs");
const _reactsharedcontexts = require("@fluentui/react-shared-contexts");
const _colorPicker = require("../../contexts/colorPicker.cjs");
const _constants = require("../../utils/constants.cjs");
const _getPercent = require("../../utils/getPercent.cjs");
const _createHsvColor = require("../../utils/createHsvColor.cjs");
const _adjustChannel = require("../../utils/adjustChannel.cjs");
const _createHslColor = require("../../utils/createHslColor.cjs");
const useColorSliderBase_unstable = (props, ref)=>{
    'use no memo'; // justified: compiler would optimize useColorSlider_unstable — manual opt-out to preserve runtime behavior
    const { dir } = (0, _reactsharedcontexts.useFluent_unstable)();
    const onChangeFromContext = (0, _colorPicker.useColorPickerContextValue_unstable)((ctx)=>ctx.requestChange);
    const colorFromContext = (0, _colorPicker.useColorPickerContextValue_unstable)((ctx)=>ctx.color);
    const nativeProps = (0, _reactutilities.getPartitionedNativeProps)({
        props,
        primarySlotTagName: 'input',
        excludedPropNames: [
            'onChange',
            'color'
        ]
    });
    const { color, channel = 'hue', onChange = onChangeFromContext, vertical, root, input, rail, thumb } = props;
    const hsvColor = color || colorFromContext;
    const hslColor = (0, _createHslColor.createHslColor)(hsvColor);
    const [currentColor, setCurrentColor] = (0, _reactutilities.useControllableState)({
        defaultState: props.defaultColor,
        state: hsvColor,
        initialState: _constants.INITIAL_COLOR_HSV
    });
    const MAX = channel === 'hue' ? _constants.HUE_MAX : _constants.MAX;
    const valueChannelActions = {
        hue: (0, _adjustChannel.clampValue)(currentColor.h),
        saturation: (0, _adjustChannel.clampValue)(currentColor.s * 100),
        value: (0, _adjustChannel.clampValue)(currentColor.v * 100)
    };
    const clampedValue = (0, _adjustChannel.adjustChannel)(channel, valueChannelActions);
    const valuePercent = (0, _getPercent.getPercent)(clampedValue, _constants.MIN, MAX);
    const inputOnChange = input === null || input === void 0 ? void 0 : input.onChange;
    const _onChange = (0, _reactutilities.useEventCallback)((event)=>{
        const newValue = Number(event.target.value);
        const colorActions = {
            hue: ()=>(0, _createHsvColor.createHsvColor)({
                    ...hsvColor,
                    h: newValue
                }),
            saturation: ()=>(0, _createHsvColor.createHsvColor)({
                    ...hsvColor,
                    s: newValue / 100
                }),
            value: ()=>(0, _createHsvColor.createHsvColor)({
                    ...hsvColor,
                    v: newValue / 100
                })
        };
        const newColor = (0, _adjustChannel.adjustChannel)(channel, colorActions)();
        setCurrentColor(newColor);
        inputOnChange === null || inputOnChange === void 0 ? void 0 : inputOnChange(event);
        onChange === null || onChange === void 0 ? void 0 : onChange(event, {
            type: 'change',
            event,
            color: newColor
        });
    });
    const rootVariables = {
        [_ColorSliderconstants.colorSliderCSSVars.sliderDirectionVar]: vertical ? '180deg' : dir === 'ltr' ? '-90deg' : '90deg',
        [_ColorSliderconstants.colorSliderCSSVars.sliderProgressVar]: `${valuePercent}%`,
        [_ColorSliderconstants.colorSliderCSSVars.thumbColorVar]: channel === 'hue' ? `hsl(${clampedValue}, 100%, 50%)` : (0, _createHslColor.createHslColorString)(hsvColor),
        [_ColorSliderconstants.colorSliderCSSVars.railColorVar]: channel === 'hue' ? `hsl(${hslColor.h}, ${hslColor.s * 100}%, ${hslColor.l * 100}%)` : `hsl(${hslColor.h}, 100%, 50%)`
    };
    const state = {
        vertical,
        channel,
        components: {
            input: 'input',
            rail: 'div',
            root: 'div',
            thumb: 'div'
        },
        root: _reactutilities.slot.always(root, {
            defaultProps: {
                role: 'group',
                ...nativeProps.root
            },
            elementType: 'div'
        }),
        input: _reactutilities.slot.always(input, {
            defaultProps: {
                id: (0, _reactutilities.useId)('slider-', props.id),
                ref,
                min: _constants.MIN,
                max: MAX,
                tabIndex: 0,
                ['aria-orientation']: vertical ? 'vertical' : 'horizontal',
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
    // Root props
    state.root.style = {
        ...rootVariables,
        ...state.root.style
    };
    // Input Props
    state.input.value = clampedValue;
    state.input.onChange = _onChange;
    return state;
};
const useColorSlider_unstable = (props, ref)=>{
    const shapeFromContext = (0, _colorPicker.useColorPickerContextValue_unstable)((ctx)=>ctx.shape);
    const { shape = shapeFromContext, ...baseProps } = props;
    const state = {
        ...useColorSliderBase_unstable(baseProps, ref),
        shape
    };
    return state;
};
