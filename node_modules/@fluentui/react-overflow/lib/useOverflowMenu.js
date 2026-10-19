'use client';
import * as React from "react";
import { useId, useIsomorphicLayoutEffect } from "@fluentui/react-utilities";
import { useOverflowContext } from "./overflowContext.js";
import { useOverflowCount } from "./useOverflowCount.js";
export function useOverflowMenu(id) {
    const elementId = useId('overflow-menu', id);
    const overflowCount = useOverflowCount();
    const { registerOverflowMenu } = useOverflowContext();
    const ref = React.useRef(null);
    const isOverflowing = overflowCount > 0;
    useIsomorphicLayoutEffect(()=>{
        if (ref.current) {
            return registerOverflowMenu(ref.current);
        }
    }, [
        registerOverflowMenu,
        isOverflowing,
        elementId
    ]);
    return {
        ref,
        overflowCount,
        isOverflowing
    };
}
