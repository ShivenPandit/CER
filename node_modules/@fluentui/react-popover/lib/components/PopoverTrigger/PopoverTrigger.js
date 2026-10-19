'use client';
import { usePopoverTrigger_unstable } from "./usePopoverTrigger.js";
import { renderPopoverTrigger_unstable } from "./renderPopoverTrigger.js";
/**
 * Wraps a trigger element as an only child and adds the necessary event handling to open a popover.
 */ export const PopoverTrigger = (props)=>{
    const state = usePopoverTrigger_unstable(props);
    return renderPopoverTrigger_unstable(state);
};
PopoverTrigger.displayName = 'PopoverTrigger';
// type casting here is required to ensure internal type FluentTriggerComponent is not leaked
PopoverTrigger.isFluentTriggerComponent = true;
