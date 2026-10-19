'use client';
import * as React from "react";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
import { useNavSectionHeader_unstable } from "./useNavSectionHeader.js";
import { renderNavSectionHeader_unstable } from "./renderNavSectionHeader.js";
import { useNavSectionHeaderStyles_unstable } from "./useNavSectionHeaderStyles.styles.js";
/**
 * NavSectionHeader component
 */ export const NavSectionHeader = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useNavSectionHeader_unstable(props, ref);
    useNavSectionHeaderStyles_unstable(state);
    useCustomStyleHook_unstable('useNavSectionHeaderStyles_unstable')(state);
    return renderNavSectionHeader_unstable(state);
});
NavSectionHeader.displayName = 'NavSectionHeader';
