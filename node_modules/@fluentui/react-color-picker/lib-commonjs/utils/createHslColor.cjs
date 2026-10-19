/**
 *
 * Creates an HSL color object from a given HSV color object.
 *
 * @param color - HSV color object to convert to HSL.
 * @returns HSL color object with the same hue and alpha values, and converted saturation and lightness values.
 */ "use strict";
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
    createHslColor: function() {
        return createHslColor;
    },
    createHslColorString: function() {
        return createHslColorString;
    }
});
function createHslColor(color = {}) {
    const { h = 0, s = 0, v = 0, a = 1 } = color;
    const l = v * (1 - s / 2);
    const hslSaturation = l === 0 || l === 1 ? 0 : (v - l) / Math.min(l, 1 - l);
    return {
        h,
        s: hslSaturation,
        l,
        a
    };
}
function createHslColorString(color = {}) {
    const hslColor = createHslColor(color);
    const saturation = Number((hslColor.s * 100).toFixed(2));
    const lightness = Number((hslColor.l * 100).toFixed(2));
    return `hsla(${hslColor.h}, ${saturation}%, ${lightness}%, ${hslColor.a})`;
}
