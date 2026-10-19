'use client';
import { useToastTrigger_unstable } from "./useToastTrigger.js";
import { renderToastTrigger_unstable } from "./renderToastTrigger.js";
/**
 * ToastTrigger component
 */ export const ToastTrigger = (props)=>{
    const state = useToastTrigger_unstable(props);
    return renderToastTrigger_unstable(state);
};
ToastTrigger.displayName = 'ToastTrigger';
