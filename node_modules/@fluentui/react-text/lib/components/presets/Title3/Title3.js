'use client';
import { createPreset } from "../createPreset.js";
import { title3ClassNames, useTitle3Styles } from "./useTitle3Styles.styles.js";
/**
 * Text preset component for the Title 3 typography variant
 */ export const Title3 = createPreset({
    useStyles: useTitle3Styles,
    className: title3ClassNames.root,
    displayName: 'Title3'
});
