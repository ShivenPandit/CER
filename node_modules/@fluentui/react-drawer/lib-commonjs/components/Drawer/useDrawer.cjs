"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useDrawer_unstable", {
    enumerable: true,
    get: function() {
        return useDrawer_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const _index = require("../OverlayDrawer/index.cjs");
const _index1 = require("../InlineDrawer/index.cjs");
const useDrawer_unstable = (props, ref)=>{
    // casting here to convert a union of functions to a single function with the union of parameters
    const elementType = props.type === 'inline' ? _index1.InlineDrawer : _index.OverlayDrawer;
    const root = _reactutilities.slot.always({
        ref,
        ...props
    }, {
        elementType
    });
    return {
        components: {
            root: elementType
        },
        root
    };
};
