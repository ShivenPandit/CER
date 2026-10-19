'use client';
import { createPreset } from "../createPreset.js";
import { title2ClassNames, useTitle2Styles } from "./useTitle2Styles.styles.js";
/**
 * Text preset component for the Title 2 typography variant
 */ export const Title2 = createPreset({
    useStyles: useTitle2Styles,
    className: title2ClassNames.root,
    displayName: 'Title2'
});
