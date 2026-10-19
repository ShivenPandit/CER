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
    Link: function() {
        return _Link.Link;
    },
    LinkContextProvider: function() {
        return _index.LinkContextProvider;
    },
    linkClassNames: function() {
        return _Link.linkClassNames;
    },
    linkContextDefaultValue: function() {
        return _index.linkContextDefaultValue;
    },
    renderLink_unstable: function() {
        return _Link.renderLink_unstable;
    },
    useLinkBase_unstable: function() {
        return _Link.useLinkBase_unstable;
    },
    useLinkContext: function() {
        return _index.useLinkContext;
    },
    useLinkState_unstable: function() {
        return _Link.useLinkState_unstable;
    },
    useLinkStyles_unstable: function() {
        return _Link.useLinkStyles_unstable;
    },
    useLink_unstable: function() {
        return _Link.useLink_unstable;
    }
});
const _Link = require("./Link.cjs");
const _index = require("./contexts/index.cjs");
