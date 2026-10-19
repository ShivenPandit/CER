'use client';
import { useMenu_unstable } from "./useMenu.js";
import { useMenuContextValues_unstable } from "./useMenuContextValues.js";
import { renderMenu_unstable } from "./renderMenu.js";
/**
 * Wrapper component that manages state for a popup MenuList and a MenuTrigger
 */ export const Menu = (props)=>{
    const state = useMenu_unstable(props);
    const contextValues = useMenuContextValues_unstable(state);
    return renderMenu_unstable(state, contextValues);
};
Menu.displayName = 'Menu';
