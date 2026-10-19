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
    anchorProperties: function() {
        return _properties.anchorProperties;
    },
    audioProperties: function() {
        return _properties.audioProperties;
    },
    baseElementEvents: function() {
        return _properties.baseElementEvents;
    },
    baseElementProperties: function() {
        return _properties.baseElementProperties;
    },
    buttonProperties: function() {
        return _properties.buttonProperties;
    },
    clamp: function() {
        return _clamp.clamp;
    },
    colGroupProperties: function() {
        return _properties.colGroupProperties;
    },
    colProperties: function() {
        return _properties.colProperties;
    },
    createPriorityQueue: function() {
        return _priorityQueue.createPriorityQueue;
    },
    dialogProperties: function() {
        return _properties.dialogProperties;
    },
    divProperties: function() {
        return _properties.divProperties;
    },
    fieldsetProperties: function() {
        return _properties.fieldsetProperties;
    },
    formProperties: function() {
        return _properties.formProperties;
    },
    // eslint-disable-next-line @typescript-eslint/no-deprecated
    getNativeElementProps: function() {
        return _getNativeElementProps.getNativeElementProps;
    },
    getNativeProps: function() {
        return _properties.getNativeProps;
    },
    getPartitionedNativeProps: function() {
        return _getNativeElementProps.getPartitionedNativeProps;
    },
    getRTLSafeKey: function() {
        return _getRTLSafeKey.getRTLSafeKey;
    },
    getReactElementRef: function() {
        return _getReactElementRef.getReactElementRef;
    },
    htmlElementProperties: function() {
        return _properties.htmlElementProperties;
    },
    iframeProperties: function() {
        return _properties.iframeProperties;
    },
    imgProperties: function() {
        return _properties.imgProperties;
    },
    inputProperties: function() {
        return _properties.inputProperties;
    },
    isHTMLElement: function() {
        return _isHTMLElement.isHTMLElement;
    },
    isInteractiveHTMLElement: function() {
        return _isInteractiveHTMLElement.isInteractiveHTMLElement;
    },
    labelProperties: function() {
        return _properties.labelProperties;
    },
    liProperties: function() {
        return _properties.liProperties;
    },
    measureScrollbarWidth: function() {
        return _measureScrollBarWidth.measureScrollbarWidth;
    },
    mergeCallbacks: function() {
        return _mergeCallbacks.mergeCallbacks;
    },
    microdataProperties: function() {
        return _properties.microdataProperties;
    },
    olProperties: function() {
        return _properties.olProperties;
    },
    omit: function() {
        return _omit.omit;
    },
    optionProperties: function() {
        return _properties.optionProperties;
    },
    selectProperties: function() {
        return _properties.selectProperties;
    },
    tableProperties: function() {
        return _properties.tableProperties;
    },
    tdProperties: function() {
        return _properties.tdProperties;
    },
    textAreaProperties: function() {
        return _properties.textAreaProperties;
    },
    thProperties: function() {
        return _properties.thProperties;
    },
    timeProperties: function() {
        return _properties.timeProperties;
    },
    trProperties: function() {
        return _properties.trProperties;
    },
    videoProperties: function() {
        return _properties.videoProperties;
    }
});
const _clamp = require("./clamp.cjs");
const _getNativeElementProps = require("./getNativeElementProps.cjs");
const _getReactElementRef = require("./getReactElementRef.cjs");
const _getRTLSafeKey = require("./getRTLSafeKey.cjs");
const _mergeCallbacks = require("./mergeCallbacks.cjs");
const _omit = require("./omit.cjs");
const _properties = require("./properties.cjs");
const _isHTMLElement = require("./isHTMLElement.cjs");
const _isInteractiveHTMLElement = require("./isInteractiveHTMLElement.cjs");
const _priorityQueue = require("./priorityQueue.cjs");
const _measureScrollBarWidth = require("./measureScrollBarWidth.cjs");
