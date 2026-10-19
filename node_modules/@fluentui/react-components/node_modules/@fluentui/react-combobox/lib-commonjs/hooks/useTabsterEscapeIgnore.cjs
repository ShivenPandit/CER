'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useTabsterEscapeIgnore", {
    enumerable: true,
    get: function() {
        return useTabsterEscapeIgnore;
    }
});
const _reacttabster = require("@fluentui/react-tabster");
function useTabsterEscapeIgnore(props, shouldIgnoreEscape) {
    const ignoreEscapeKeyAttribute = (0, _reacttabster.useTabsterAttributes)({
        focusable: {
            ignoreKeydown: {
                Escape: shouldIgnoreEscape
            }
        }
    });
    return (0, _reacttabster.useMergedTabsterAttributes_unstable)(ignoreEscapeKeyAttribute, typeof props === 'object' ? props : {});
}
