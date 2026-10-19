'use client';
import * as React from "react";
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
import { useListItem_unstable } from "./useListItem.js";
import { renderListItem_unstable } from "./renderListItem.js";
import { useListItemStyles_unstable } from "./useListItemStyles.styles.js";
export const ListItem = /*#__PURE__*/ React.forwardRef((props, ref)=>{
    const state = useListItem_unstable(props, ref);
    useListItemStyles_unstable(state);
    useCustomStyleHook_unstable('useListItemStyles_unstable')(state);
    return renderListItem_unstable(state);
});
ListItem.displayName = 'ListItem';
