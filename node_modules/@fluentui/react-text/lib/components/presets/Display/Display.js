'use client';
import { createPreset } from "../createPreset.js";
import { displayClassNames, useDisplayStyles } from "./useDisplayStyles.styles.js";
/**
 * Text preset component for the Display typography variant
 */ export const Display = createPreset({
    useStyles: useDisplayStyles,
    className: displayClassNames.root,
    displayName: 'Display'
});
