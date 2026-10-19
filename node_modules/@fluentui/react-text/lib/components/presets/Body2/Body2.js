'use client';
import { createPreset } from "../createPreset.js";
import { body2ClassNames, useBody2Styles } from "./useBody2Styles.styles.js";
/**
 * Text preset component for the Body2 typography variant
 */ export const Body2 = createPreset({
    useStyles: useBody2Styles,
    className: body2ClassNames.root,
    displayName: 'Body2'
});
