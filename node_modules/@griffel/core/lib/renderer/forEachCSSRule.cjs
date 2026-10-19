"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "forEachCSSRule", {
    enumerable: true,
    get: function() {
        return forEachCSSRule;
    }
});
const _stylis = require("stylis");
function forEachCSSRule(cssText, callback) {
    (0, _stylis.serialize)((0, _stylis.compile)(cssText), (0, _stylis.middleware)([
        _stylis.stringify,
        // 💡 the same extraction used when these rules were created: `rulesheet` reports every
        // top-level rule, which is exactly the granularity `insertionCache` is keyed at
        (0, _stylis.rulesheet)(callback)
    ]));
} //# sourceMappingURL=forEachCSSRule.js.map
