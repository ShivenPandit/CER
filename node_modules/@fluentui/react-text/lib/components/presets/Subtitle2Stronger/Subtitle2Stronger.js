'use client';
import { createPreset } from "../createPreset.js";
import { subtitle2StrongerClassNames, useSubtitle2StrongerStyles } from "./useSubtitle2Stronger.styles.js";
/**
 * Text preset component for the Subtitle2Stronger typography variant
 */ export const Subtitle2Stronger = createPreset({
    useStyles: useSubtitle2StrongerStyles,
    className: subtitle2StrongerClassNames.root,
    displayName: 'Subtitle2Stronger'
});
