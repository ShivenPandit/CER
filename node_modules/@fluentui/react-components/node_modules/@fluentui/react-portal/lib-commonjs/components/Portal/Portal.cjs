'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "Portal", {
    enumerable: true,
    get: function() {
        return Portal;
    }
});
const _usePortal = require("./usePortal.cjs");
const _renderPortal = require("./renderPortal.cjs");
const Portal = (props)=>{
    const state = (0, _usePortal.usePortal_unstable)(props);
    return (0, _renderPortal.renderPortal_unstable)(state);
};
Portal.displayName = 'Portal';
