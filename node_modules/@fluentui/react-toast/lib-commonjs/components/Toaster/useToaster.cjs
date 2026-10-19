'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useToaster_unstable", {
    enumerable: true,
    get: function() {
        return useToaster_unstable;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const _reactutilities = require("@fluentui/react-utilities");
const _reactsharedcontexts = require("@fluentui/react-shared-contexts");
const _reacttabster = require("@fluentui/react-tabster");
const _keyboardkeys = require("@fluentui/keyboard-keys");
const _index = require("../../state/index.cjs");
const _index1 = require("../ToastContainer/index.cjs");
const _useToasterFocusManagement = require("./useToasterFocusManagement.cjs");
const _useToastAnnounce = require("./useToastAnnounce.cjs");
const useToaster_unstable = (props)=>{
    const { offset, announce: announceProp, mountNode, inline = false, ...rest } = props;
    const announceRef = _react.useRef(()=>null);
    const { toastsToRender, isToastVisible, pauseAllToasts, playAllToasts, tryRestoreFocus, closeAllToasts } = (0, _index.useToaster)(rest);
    const announce = _react.useCallback((message, options)=>announceRef.current(message, options), []);
    const { dir } = (0, _reactsharedcontexts.useFluent_unstable)();
    const { onKeyDown: onKeyDownProp, ...rootProps } = _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)('div', rest), {
        elementType: 'div'
    });
    const focusableGroupAttr = (0, _reacttabster.useFocusableGroup)({
        tabBehavior: 'limited-trap-focus',
        ignoreDefaultKeydown: {
            Escape: true
        }
    });
    const onKeyDown = (0, _reactutilities.useEventCallback)((e)=>{
        if (e.key === _keyboardkeys.Escape) {
            e.preventDefault();
            closeAllToasts();
        }
        onKeyDownProp === null || onKeyDownProp === void 0 ? void 0 : onKeyDownProp(e);
    });
    const usePositionSlot = (toastPosition)=>{
        var _toastsToRender_get;
        const focusManagementRef = (0, _useToasterFocusManagement.useToasterFocusManagement_unstable)(pauseAllToasts, playAllToasts);
        const { announceToast, toasterRef } = (0, _useToastAnnounce.useToastAnnounce)(announceProp !== null && announceProp !== void 0 ? announceProp : announce);
        return _reactutilities.slot.optional(toastsToRender.has(toastPosition) ? rootProps : null, {
            defaultProps: {
                ref: (0, _reactutilities.useMergedRefs)(focusManagementRef, toasterRef),
                children: (_toastsToRender_get = toastsToRender.get(toastPosition)) === null || _toastsToRender_get === void 0 ? void 0 : _toastsToRender_get.map((toast)=>/*#__PURE__*/ _react.createElement(_index1.ToastContainer, {
                        ...toast,
                        tryRestoreFocus: tryRestoreFocus,
                        intent: toast.intent,
                        announce: announceToast,
                        key: toast.toastId,
                        visible: isToastVisible(toast.toastId)
                    }, toast.content)),
                onKeyDown,
                ...focusableGroupAttr,
                'data-toaster-position': toastPosition,
                role: 'list'
            },
            elementType: 'div'
        });
    };
    return {
        dir,
        mountNode,
        components: {
            root: 'div',
            bottomStart: 'div',
            bottomEnd: 'div',
            topStart: 'div',
            topEnd: 'div',
            top: 'div',
            bottom: 'div'
        },
        root: _reactutilities.slot.always(rootProps, {
            elementType: 'div'
        }),
        bottomStart: usePositionSlot(_index.TOAST_POSITIONS.bottomStart),
        bottomEnd: usePositionSlot(_index.TOAST_POSITIONS.bottomEnd),
        topStart: usePositionSlot(_index.TOAST_POSITIONS.topStart),
        topEnd: usePositionSlot(_index.TOAST_POSITIONS.topEnd),
        top: usePositionSlot(_index.TOAST_POSITIONS.top),
        bottom: usePositionSlot(_index.TOAST_POSITIONS.bottom),
        announceRef,
        offset,
        announce: announceProp !== null && announceProp !== void 0 ? announceProp : announce,
        renderAriaLive: !announceProp,
        inline
    };
};
