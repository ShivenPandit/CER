'use client';
import { useSyncExternalStore } from "use-sync-external-store/shim";
import { useCarouselContext_unstable } from "./CarouselContext.js";
export function useCarouselValues_unstable(getSnapshot) {
    const store = useCarouselContext_unstable((c)=>c.store);
    return useSyncExternalStore(store.subscribe, ()=>getSnapshot(store.getSnapshot()));
}
