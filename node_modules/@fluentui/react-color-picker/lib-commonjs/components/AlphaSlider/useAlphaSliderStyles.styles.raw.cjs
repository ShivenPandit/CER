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
    alphaSliderClassNames: function() {
        return alphaSliderClassNames;
    },
    useAlphaSliderStyles_unstable: function() {
        return useAlphaSliderStyles_unstable;
    }
});
const _react = require("@griffel/react");
const _reacttheme = require("@fluentui/react-theme");
const _useColorSliderStylesstyles = require("../ColorSlider/useColorSliderStyles.styles.cjs");
const _AlphaSliderconstants = require("./AlphaSlider.constants.cjs");
const TRANSPARENT_IMAGE_URL = 'https://fabricweb.azureedge.net/fabric-website/assets/images/transparent-pattern.png';
const alphaSliderClassNames = {
    root: 'fui-AlphaSlider',
    rail: 'fui-AlphaSlider__rail',
    thumb: 'fui-AlphaSlider__thumb',
    input: 'fui-AlphaSlider__input'
};
/**
 * Styles for the root slot
 */ const useStyles = (0, _react.makeStyles)({
    rail: {
        border: `1px solid ${_reacttheme.tokens.colorNeutralStroke1}`,
        backgroundImage: `linear-gradient(var(${_AlphaSliderconstants.alphaSliderCSSVars.sliderDirectionVar}), transparent, var(${_AlphaSliderconstants.alphaSliderCSSVars.railColorVar})), url(${TRANSPARENT_IMAGE_URL})`
    }
});
/**
 * Styles for the thumb slot
 */ const useThumbStyles = (0, _react.makeStyles)({
    thumb: {
        backgroundColor: _reacttheme.tokens.colorNeutralBackground1,
        '::before': {
            backgroundColor: `var(${_AlphaSliderconstants.alphaSliderCSSVars.thumbColorVar})`
        }
    },
    horizontal: {
        transform: 'translateX(-50%)',
        left: `var(${_AlphaSliderconstants.alphaSliderCSSVars.sliderProgressVar})`
    },
    vertical: {
        transform: 'translateY(50%)',
        bottom: `var(${_AlphaSliderconstants.alphaSliderCSSVars.sliderProgressVar})`
    }
});
const useAlphaSliderStyles_unstable = (state)=>{
    const styles = useStyles();
    const thumbStyles = useThumbStyles();
    // eslint-disable-next-line react-hooks/immutability
    state.root.className = (0, _react.mergeClasses)(alphaSliderClassNames.root, state.root.className);
    // eslint-disable-next-line react-hooks/immutability
    state.input.className = (0, _react.mergeClasses)(alphaSliderClassNames.input, state.input.className);
    // eslint-disable-next-line react-hooks/immutability
    state.rail.className = (0, _react.mergeClasses)(alphaSliderClassNames.rail, styles.rail, state.rail.className);
    // eslint-disable-next-line react-hooks/immutability
    state.thumb.className = (0, _react.mergeClasses)(alphaSliderClassNames.thumb, thumbStyles.thumb, state.vertical ? thumbStyles.vertical : thumbStyles.horizontal, state.thumb.className);
    // eslint-disable-next-line react-hooks/immutability
    state.thumb.className = (0, _react.mergeClasses)(alphaSliderClassNames.thumb, thumbStyles.thumb, state.vertical ? thumbStyles.vertical : thumbStyles.horizontal, state.thumb.className);
    (0, _useColorSliderStylesstyles.useColorSliderStyles_unstable)(state);
    return state;
};
