'use client';
import { createPreset } from "../createPreset.js";
import { body1ClassNames, useBody1Styles } from "./useBody1Styles.styles.js";
/**
 * Text preset component for the Body1 typography variant
 */ export const Body1 = createPreset({
    useStyles: useBody1Styles,
    className: body1ClassNames.root,
    displayName: 'Body1'
});
