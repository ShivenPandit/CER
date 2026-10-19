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
    Spinner: function() {
        return _Spinner.Spinner;
    },
    renderSpinner_unstable: function() {
        return _renderSpinner.renderSpinner_unstable;
    },
    spinnerClassNames: function() {
        return _useSpinnerStylesstyles.spinnerClassNames;
    },
    useSpinnerBase_unstable: function() {
        return _useSpinner.useSpinnerBase_unstable;
    },
    useSpinnerStyles_unstable: function() {
        return _useSpinnerStylesstyles.useSpinnerStyles_unstable;
    },
    useSpinner_unstable: function() {
        return _useSpinner.useSpinner_unstable;
    }
});
const _Spinner = require("./Spinner.cjs");
const _renderSpinner = require("./renderSpinner.cjs");
const _useSpinner = require("./useSpinner.cjs");
const _useSpinnerStylesstyles = require("./useSpinnerStyles.styles.cjs");
