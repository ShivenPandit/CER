// Headless Fluent Icons API
// Import the shipped CSS file (styles.css) for default styling via data-attribute selectors.
export { iconClassName, iconFilledClassName, iconRegularClassName, iconLightClassName, iconColorClassName, fontIconClassName, DATA_FUI_ICON, DATA_FUI_ICON_RTL, DATA_FUI_ICON_HIDDEN, DATA_FUI_ICON_FONT, cx, } from './shared.js';
// Context
export { IconDirectionContextProvider, useIconContext } from '../contexts/index.js';
// Core hook
export { useIconState } from './useIconState.js';
// SVG icon factories
export { createFluentIcon } from './createFluentIcon.js';
export { bundleIcon } from './bundleIcon.js';
// TODO: to maintain API compat for build transform we will probably need to export this as well
// export { wrapIcon } from './wrapIcon';
