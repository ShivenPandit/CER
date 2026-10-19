'use client';
import { useCustomStyleHook_unstable } from "@fluentui/react-shared-contexts";
import { useToaster_unstable } from "./useToaster.js";
import { renderToaster_unstable } from "./renderToaster.js";
import { useToasterStyles_unstable } from "./useToasterStyles.styles.js";
/**
 * Toaster component - renders a collection of toasts dispatched imperatively
 */ export const Toaster = (props)=>{
    const state = useToaster_unstable(props);
    useToasterStyles_unstable(state);
    useCustomStyleHook_unstable('useToasterStyles_unstable')(state);
    return renderToaster_unstable(state);
};
Toaster.displayName = 'Toaster';
