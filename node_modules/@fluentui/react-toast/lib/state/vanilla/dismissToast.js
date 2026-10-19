import { EVENTS } from "../constants.js";
export function dismissToast(toastId, toasterId = undefined, targetDocument) {
    const event = new CustomEvent(EVENTS.dismiss, {
        bubbles: false,
        cancelable: false,
        detail: {
            toastId,
            toasterId
        }
    });
    targetDocument.dispatchEvent(event);
}
