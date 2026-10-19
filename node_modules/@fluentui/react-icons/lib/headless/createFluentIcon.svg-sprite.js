import * as React from 'react';
import { cx, iconClassName } from './shared.js';
import { useIconState } from './useIconState.js';
import { computeViewBox, renderSpriteBody } from '../core/svg.js';
/**
 * Headless createFluentIcon for sprite-based icons.
 *
 * @access private
 * @alpha
 */
export const createFluentIcon = (iconId, size, spritePath, options) => {
    const viewBoxWidth = computeViewBox(size);
    const Icon = React.forwardRef((props, ref) => {
        const iconState = useIconState(props, { flipInRtl: options === null || options === void 0 ? void 0 : options.flipInRtl });
        const state = {
            ...iconState,
            className: cx(iconClassName, iconState.className),
            ref,
            width: size,
            height: size,
            viewBox: `0 0 ${viewBoxWidth} ${viewBoxWidth}`,
            xmlns: 'http://www.w3.org/2000/svg',
        };
        return renderSpriteBody(state, iconId, spritePath);
    });
    Icon.displayName = iconId;
    return Icon;
};
