'use client';
import { createPreset } from "../createPreset.js";
import { title1ClassNames, useTitle1Styles } from "./useTitle1Styles.styles.js";
/**
 * Text preset component for the Title 1 typography variant
 */ export const Title1 = createPreset({
    useStyles: useTitle1Styles,
    className: title1ClassNames.root,
    displayName: 'Title1'
});
