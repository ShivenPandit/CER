import { isHTMLElement } from "./isHTMLElement.js";
/**
 * Checks that the element has default behaviour from user input on click or 'Enter'/'Space' keys
 *
 * @internal
 */ export function isInteractiveHTMLElement(element) {
    if (!isHTMLElement(element)) {
        return false;
    }
    const { tagName } = element;
    switch(tagName){
        case 'BUTTON':
        case 'A':
        case 'INPUT':
        case 'TEXTAREA':
            return true;
    }
    return element.isContentEditable;
}
