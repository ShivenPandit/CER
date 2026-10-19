"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
// This proxy is injected by Heft's jest-identity-mock-transform.  See Heft documentation for details.
const identityMock = new Proxy({}, {
    get: (target, key, receiver) => {
        if (key === '__esModule') {
            return false;
        }
        // When accessing a key like "identityMock.xyz", simply return "xyz" as a text string.
        return key;
    }
});
module.exports = identityMock;
//# sourceMappingURL=identityMock.js.map