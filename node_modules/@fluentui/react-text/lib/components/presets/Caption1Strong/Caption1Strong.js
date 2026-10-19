'use client';
import { createPreset } from "../createPreset.js";
import { caption1StrongClassNames, useCaption1StrongStyles } from "./useCaption1StrongStyles.styles.js";
/**
 * Text preset component for the Caption1Strong typography variant
 */ export const Caption1Strong = createPreset({
    useStyles: useCaption1StrongStyles,
    className: caption1StrongClassNames.root,
    displayName: 'Caption1Strong'
});
