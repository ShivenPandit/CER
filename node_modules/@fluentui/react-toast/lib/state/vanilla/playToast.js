import { EVENTS } from "../constants.js";
export function playToast(toastId, toasterId = undefined, targetDocument) {
    const event = new CustomEvent(EVENTS.play, {
        bubbles: false,
        cancelable: false,
        detail: {
            toastId,
            toasterId
        }
    });
    targetDocument.dispatchEvent(event);
}
