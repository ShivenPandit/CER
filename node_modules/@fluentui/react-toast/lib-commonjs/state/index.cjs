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
    TOAST_POSITIONS: function() {
        return _constants.TOAST_POSITIONS;
    },
    getPositionStyles: function() {
        return _index.getPositionStyles;
    },
    useToastController: function() {
        return _useToastController.useToastController;
    },
    useToaster: function() {
        return _useToaster.useToaster;
    }
});
const _useToaster = require("./useToaster.cjs");
const _useToastController = require("./useToastController.cjs");
const _index = require("./vanilla/index.cjs");
const _constants = require("./constants.cjs");
