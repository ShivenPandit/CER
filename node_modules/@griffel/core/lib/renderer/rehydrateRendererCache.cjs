"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "rehydrateRendererCache", {
    enumerable: true,
    get: function() {
        return rehydrateRendererCache;
    }
});
const _index = require("../devtools/index.cjs");
const _createIsomorphicStyleSheet = require("./createIsomorphicStyleSheet.cjs");
const _forEachCSSRule = require("./forEachCSSRule.cjs");
const _getStyleSheetForBucket = require("./getStyleSheetForBucket.cjs");
function rehydrateRendererCache(renderer, target = typeof document === 'undefined' ? undefined : document) {
    if (target) {
        const styleElements = target.querySelectorAll('[data-make-styles-bucket]');
        // Griffel emits each CSS rule into the document exactly once. In development we track
        // the rules seen while rehydrating, so we can warn if the same rule appears in more than
        // one server-rendered <style> element — a strong signal that styles were flushed into the
        // HTML multiple times (see the warning emitted after the loop).
        const seenRules = new Set();
        let duplicateRuleCount = 0;
        const cacheRule = (cssRule, bucketName)=>{
            if (process.env.NODE_ENV !== 'production') {
                if (seenRules.has(cssRule)) {
                    duplicateRuleCount++;
                } else {
                    seenRules.add(cssRule);
                }
            }
            renderer.insertionCache[cssRule] = bucketName;
            if (process.env.NODE_ENV !== 'production' && _index.isDevToolsEnabled) {
                _index.debugData.addCSSRule(cssRule);
            }
        };
        styleElements.forEach((styleElement)=>{
            const bucketName = styleElement.dataset['makeStylesBucket'];
            const stylesheetKey = (0, _getStyleSheetForBucket.getStyleSheetKeyFromElement)(styleElement);
            // 👇 If some elements are not created yet, we will register them in renderer
            if (!renderer.stylesheets[stylesheetKey]) {
                renderer.stylesheets[stylesheetKey] = (0, _createIsomorphicStyleSheet.createIsomorphicStyleSheetFromElement)(styleElement);
            }
            // A bucket's text content is exactly its rules concatenated (`cssRules.join('')`), so
            // splitting it back apart structurally recovers the same strings `insertCSSRules()` uses as
            // cache keys — for every at-rule, including ones added to CSS after this code was written.
            (0, _forEachCSSRule.forEachCSSRule)(styleElement.textContent, (cssRule)=>cacheRule(cssRule, bucketName));
        });
        if (process.env.NODE_ENV !== 'production' && duplicateRuleCount > 0) {
            // eslint-disable-next-line no-console
            console.error([
                '@griffel/core:',
                `Found ${duplicateRuleCount} duplicate CSS rule(s) while rehydrating server-rendered styles.`,
                'The same styles were flushed into the HTML more than once.',
                '\n\n',
                'In the Next.js App Router this happens when renderToStyleElements() is called on every',
                'useServerInsertedHTML flush without clearing the renderer in between: each flush re-emits',
                'the full stylesheet and the extra copies are streamed into <body>. Those stale copies can',
                'override styles inserted after a client-side navigation, making makeStyles() overrides lose',
                'to their makeResetStyles() base.',
                '\n\n',
                'See https://griffel.js.org/react/guides/ssr-usage for details.'
            ].join(' '));
        }
    }
} //# sourceMappingURL=rehydrateRendererCache.js.map
