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
    Text: function() {
        return _Text.Text;
    },
    renderText_unstable: function() {
        return _renderText.renderText_unstable;
    },
    textClassNames: function() {
        return _useTextStylesstyles.textClassNames;
    },
    useTextStyles_unstable: function() {
        return _useTextStylesstyles.useTextStyles_unstable;
    },
    useText_unstable: function() {
        return _useText.useText_unstable;
    }
});
const _Text = require("./Text.cjs");
const _renderText = require("./renderText.cjs");
const _useText = require("./useText.cjs");
const _useTextStylesstyles = require("./useTextStyles.styles.cjs");
