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
    DEFAULT_ITEM_DELAY: function() {
        return _constants.DEFAULT_ITEM_DELAY;
    },
    DEFAULT_ITEM_DURATION: function() {
        return _constants.DEFAULT_ITEM_DURATION;
    },
    acceptsDelayProps: function() {
        return _motionComponentDetection.acceptsDelayProps;
    },
    acceptsVisibleProp: function() {
        return _motionComponentDetection.acceptsVisibleProp;
    },
    getStaggerChildMapping: function() {
        return _getStaggerChildMapping.getStaggerChildMapping;
    },
    getStaggerTotalDuration: function() {
        return _staggercalculations.getStaggerTotalDuration;
    },
    staggerItemsVisibilityAtTime: function() {
        return _staggercalculations.staggerItemsVisibilityAtTime;
    }
});
const _constants = require("./constants.cjs");
const _staggercalculations = require("./stagger-calculations.cjs");
const _motionComponentDetection = require("./motionComponentDetection.cjs");
const _getStaggerChildMapping = require("./getStaggerChildMapping.cjs");
