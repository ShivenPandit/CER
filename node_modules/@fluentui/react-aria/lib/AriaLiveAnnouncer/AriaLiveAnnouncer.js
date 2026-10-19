'use client';
import { renderAriaLiveAnnouncer_unstable } from "./renderAriaLiveAnnouncer.js";
import { useAriaLiveAnnouncer_unstable } from "./useAriaLiveAnnouncer.js";
import { useAriaLiveAnnouncerContextValues_unstable } from "./useAriaLiveAnnouncerContextValues.js";
/**
 * A sample implementation of a component that manages aria live announcements.
 */ export const AriaLiveAnnouncer = (props)=>{
    const state = useAriaLiveAnnouncer_unstable(props);
    const contextValues = useAriaLiveAnnouncerContextValues_unstable(state);
    return renderAriaLiveAnnouncer_unstable(state, contextValues);
};
AriaLiveAnnouncer.displayName = 'AriaLiveAnnouncer';
