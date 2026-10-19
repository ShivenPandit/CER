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
    POSITIONING_SLIDE_DIRECTION_VAR_X: function() {
        return _constants.POSITIONING_SLIDE_DIRECTION_VAR_X;
    },
    POSITIONING_SLIDE_DIRECTION_VAR_Y: function() {
        return _constants.POSITIONING_SLIDE_DIRECTION_VAR_Y;
    },
    PositioningConfigurationProvider: function() {
        return _PositioningConfigurationContext.PositioningConfigurationProvider;
    },
    createArrowHeightStyles: function() {
        return _createArrowStyles.createArrowHeightStyles;
    },
    createArrowStyles: function() {
        return _createArrowStyles.createArrowStyles;
    },
    createSlideStyles: function() {
        return _createSlideStyles.createSlideStyles;
    },
    createVirtualElementFromClick: function() {
        return _createVirtualElementFromClick.createVirtualElementFromClick;
    },
    mergeArrowOffset: function() {
        return _index.mergeArrowOffset;
    },
    resolvePositioningShorthand: function() {
        return _index.resolvePositioningShorthand;
    },
    usePositioning: function() {
        return _usePositioning.usePositioning;
    },
    usePositioningMouseTarget: function() {
        return _usePositioningMouseTarget.usePositioningMouseTarget;
    },
    usePositioningSlideDirection: function() {
        return _usePositioningSlideDirection.usePositioningSlideDirection;
    },
    useSafeZoneArea: function() {
        return _useSafeZoneArea.useSafeZoneArea;
    }
});
const _createVirtualElementFromClick = require("./createVirtualElementFromClick.cjs");
const _usePositioningSlideDirection = require("./usePositioningSlideDirection.cjs");
const _constants = require("./constants.cjs");
const _createArrowStyles = require("./createArrowStyles.cjs");
const _createSlideStyles = require("./createSlideStyles.cjs");
const _PositioningConfigurationContext = require("./PositioningConfigurationContext.cjs");
const _usePositioning = require("./usePositioning.cjs");
const _usePositioningMouseTarget = require("./usePositioningMouseTarget.cjs");
const _useSafeZoneArea = require("./hooks/useSafeZoneArea/useSafeZoneArea.cjs");
const _index = require("./utils/index.cjs");
