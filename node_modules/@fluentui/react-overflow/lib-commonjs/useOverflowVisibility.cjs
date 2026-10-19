'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useOverflowVisibility", {
    enumerable: true,
    get: function() {
        return useOverflowVisibility;
    }
});
const _useOverflowSnapshot = require("./useOverflowSnapshot.cjs");
function useOverflowVisibility() {
    const snapshot = (0, _useOverflowSnapshot.useOverflowSnapshot)(selectSnapshot);
    return {
        itemVisibility: snapshot.itemVisibility,
        groupVisibility: snapshot.groupVisibility
    };
}
const selectSnapshot = (snapshot)=>snapshot;
