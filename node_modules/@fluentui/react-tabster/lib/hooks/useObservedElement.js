'use client';
import { getObservedElement } from "tabster";
import { useTabster } from "./useTabster.js";
import { useTabsterAttributes } from "./useTabsterAttributes.js";
export function useObservedElement(name) {
    useTabster(getObservedElement);
    return useTabsterAttributes({
        observed: {
            names: Array.isArray(name) ? name : [
                name
            ]
        }
    });
}
