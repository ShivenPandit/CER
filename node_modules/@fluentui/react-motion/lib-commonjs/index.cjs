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
    MotionBehaviourProvider: function() {
        return _MotionBehaviourContext.MotionBehaviourProvider;
    },
    MotionRefForwarder: function() {
        return _MotionRefForwarder.MotionRefForwarder;
    },
    MotionRefForwarderReset: function() {
        return _MotionRefForwarder.MotionRefForwarderReset;
    },
    PresenceGroup: function() {
        return _PresenceGroup.PresenceGroup;
    },
    PresenceGroupChildProvider: function() {
        return _PresenceGroupChildContext.PresenceGroupChildProvider;
    },
    createMotionComponent: function() {
        return _createMotionComponent.createMotionComponent;
    },
    createMotionComponentVariant: function() {
        return _createMotionComponentVariant.createMotionComponentVariant;
    },
    createPresenceComponent: function() {
        return _createPresenceComponent.createPresenceComponent;
    },
    createPresenceComponentVariant: function() {
        return _createPresenceComponentVariant.createPresenceComponentVariant;
    },
    curves: function() {
        return _motionTokens.curves;
    },
    durations: function() {
        return _motionTokens.durations;
    },
    motionSlot: function() {
        return _motionSlot.motionSlot;
    },
    motionTokens: function() {
        return _motionTokens.motionTokens;
    },
    presenceMotionSlot: function() {
        return _presenceMotionSlot.presenceMotionSlot;
    },
    useMotionForwardedRef: function() {
        return _MotionRefForwarder.useMotionForwardedRef;
    },
    usePresenceGroupChildContext: function() {
        return _PresenceGroupChildContext.usePresenceGroupChildContext;
    }
});
const _motionTokens = require("./motions/motionTokens.cjs");
const _createMotionComponent = require("./factories/createMotionComponent.cjs");
const _createMotionComponentVariant = require("./factories/createMotionComponentVariant.cjs");
const _createPresenceComponent = require("./factories/createPresenceComponent.cjs");
const _createPresenceComponentVariant = require("./factories/createPresenceComponentVariant.cjs");
const _PresenceGroup = require("./components/PresenceGroup.cjs");
const _MotionRefForwarder = require("./components/MotionRefForwarder.cjs");
const _motionSlot = require("./slots/motionSlot.cjs");
const _presenceMotionSlot = require("./slots/presenceMotionSlot.cjs");
const _PresenceGroupChildContext = require("./contexts/PresenceGroupChildContext.cjs");
const _MotionBehaviourContext = require("./contexts/MotionBehaviourContext.cjs");
