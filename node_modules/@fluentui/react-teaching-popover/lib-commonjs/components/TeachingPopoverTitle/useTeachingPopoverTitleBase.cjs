'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useTeachingPopoverTitleBase_unstable", {
    enumerable: true,
    get: function() {
        return useTeachingPopoverTitleBase_unstable;
    }
});
const _reactpopover = require("@fluentui/react-popover");
const _reactutilities = require("@fluentui/react-utilities");
const useTeachingPopoverTitleBase_unstable = (props, ref)=>{
    const { dismissButton } = props;
    const setOpen = (0, _reactpopover.usePopoverContext_unstable)((context)=>context.setOpen);
    const triggerRef = (0, _reactpopover.usePopoverContext_unstable)((context)=>context.triggerRef);
    const onDismissButtonClick = (0, _reactutilities.useEventCallback)((ev)=>{
        if (!ev.defaultPrevented) {
            setOpen(ev, false);
        }
        if (triggerRef.current) {
            triggerRef.current.focus();
        }
    });
    return {
        components: {
            root: 'h2',
            dismissButton: 'button'
        },
        root: _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)('h2', {
            ref,
            ...props
        }), {
            elementType: 'h2'
        }),
        dismissButton: _reactutilities.slot.optional(dismissButton, {
            renderByDefault: false,
            defaultProps: {
                onClick: onDismissButtonClick,
                'aria-label': 'dismiss',
                'aria-hidden': true
            },
            elementType: 'button'
        })
    };
};
