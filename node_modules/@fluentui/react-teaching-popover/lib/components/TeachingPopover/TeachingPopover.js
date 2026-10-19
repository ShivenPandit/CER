'use client';
import { useTeachingPopover_unstable } from "./useTeachingPopover.js";
import { renderTeachingPopover_unstable } from "./renderTeachingPopover.js";
import { useTeachingPopoverContextValues_unstable } from "./useTeachingPopoverContextValues.js";
/**
 * An extension class of Popover which defaults to withArrow and FocusTrap enabled.
 */ export const TeachingPopover = (props)=>{
    const state = useTeachingPopover_unstable(props);
    const contextValues = useTeachingPopoverContextValues_unstable(state);
    return renderTeachingPopover_unstable(state, contextValues);
};
TeachingPopover.displayName = 'TeachingPopover';
