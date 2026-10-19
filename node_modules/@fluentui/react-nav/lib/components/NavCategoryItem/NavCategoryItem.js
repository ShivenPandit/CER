'use client';
import * as React from "react";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
import { useNavCategoryItem_unstable } from "./useNavCategoryItem.js";
import { renderNavCategoryItem_unstable } from "./renderNavCategoryItem.js";
import { useNavCategoryItemStyles_unstable } from "./useNavCategoryItem.styles.js";
import { useNavCategoryItemContextValues_unstable } from "../useNavCategoryItemContextValues_unstable.js";
/**
 * A Nav Category Item provides provides a clickable accordion like header that exposes
 * a list of NavSubItems to take users to a new destination.
 */ export const NavCategoryItem = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useNavCategoryItem_unstable(props, ref);
    const contextValues = useNavCategoryItemContextValues_unstable(state);
    useNavCategoryItemStyles_unstable(state);
    useCustomStyleHook_unstable('useNavCategoryItemStyles')(state);
    return renderNavCategoryItem_unstable(state, contextValues);
});
NavCategoryItem.displayName = 'NavCategoryItem';
