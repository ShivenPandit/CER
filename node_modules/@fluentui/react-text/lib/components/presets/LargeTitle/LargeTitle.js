'use client';
import { createPreset } from "../createPreset.js";
import { largeTitleClassNames, useLargeTitleStyles } from "./useLargeTitleStyles.styles.js";
/**
 * Text preset component for the Large Title typography variant
 */ export const LargeTitle = createPreset({
    useStyles: useLargeTitleStyles,
    className: largeTitleClassNames.root,
    displayName: 'LargeTitle'
});
