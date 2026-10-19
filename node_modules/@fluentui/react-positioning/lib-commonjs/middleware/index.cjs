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
    coverTarget: function() {
        return _coverTarget.coverTarget;
    },
    flip: function() {
        return _flip.flip;
    },
    intersecting: function() {
        return _intersecting.intersecting;
    },
    matchTargetSize: function() {
        return _matchTargetSize.matchTargetSize;
    },
    matchTargetSizeCssVar: function() {
        return _matchTargetSize.matchTargetSizeCssVar;
    },
    maxSize: function() {
        return _maxSize.maxSize;
    },
    offset: function() {
        return _offset.offset;
    },
    resetMaxSize: function() {
        return _maxSize.resetMaxSize;
    },
    shift: function() {
        return _shift.shift;
    }
});
const _coverTarget = require("./coverTarget.cjs");
const _flip = require("./flip.cjs");
const _intersecting = require("./intersecting.cjs");
const _maxSize = require("./maxSize.cjs");
const _offset = require("./offset.cjs");
const _shift = require("./shift.cjs");
const _matchTargetSize = require("./matchTargetSize.cjs");
