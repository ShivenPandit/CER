'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useTreeItemLayout_unstable", {
    enumerable: true,
    get: function() {
        return useTreeItemLayout_unstable;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const _reactutilities = require("@fluentui/react-utilities");
const _index = require("../../contexts/index.cjs");
const _reactcheckbox = require("@fluentui/react-checkbox");
const _reactradio = require("@fluentui/react-radio");
const _TreeItemChevron = require("../TreeItemChevron.cjs");
const _reacttabster = require("@fluentui/react-tabster");
const _reactsharedcontexts = require("@fluentui/react-shared-contexts");
const useTreeItemLayout_unstable = (props, ref)=>{
    const { main, iconAfter, iconBefore } = props;
    const layoutRef = (0, _index.useTreeItemContext_unstable)((ctx)=>ctx.layoutRef);
    const selectionMode = (0, _index.useTreeContext_unstable)((ctx)=>ctx.selectionMode);
    const navigationMode = (0, _index.useTreeContext_unstable)((ctx)=>{
        var _ctx_navigationMode;
        return (_ctx_navigationMode = ctx.navigationMode) !== null && _ctx_navigationMode !== void 0 ? _ctx_navigationMode : 'tree';
    });
    const [isActionsVisibleFromProps, onActionVisibilityChange] = (0, _reactutilities.isResolvedShorthand)(props.actions) ? [
        props.actions.visible,
        props.actions.onVisibilityChange
    ] : [
        undefined,
        undefined
    ];
    const [isActionsVisible, setIsActionsVisible] = (0, _reactutilities.useControllableState)({
        state: isActionsVisibleFromProps,
        initialState: false
    });
    const selectionRef = (0, _index.useTreeItemContext_unstable)((ctx)=>ctx.selectionRef);
    const expandIconRef = (0, _index.useTreeItemContext_unstable)((ctx)=>ctx.expandIconRef);
    const actionsRef = (0, _index.useTreeItemContext_unstable)((ctx)=>ctx.actionsRef);
    const actionsRefInternal = _react.useRef(null);
    const treeItemRef = (0, _index.useTreeItemContext_unstable)((ctx)=>ctx.treeItemRef);
    const subtreeRef = (0, _index.useTreeItemContext_unstable)((ctx)=>ctx.subtreeRef);
    const checked = (0, _index.useTreeItemContext_unstable)((ctx)=>ctx.checked);
    const isBranch = (0, _index.useTreeItemContext_unstable)((ctx)=>ctx.itemType === 'branch');
    const mainShorthand = (0, _reactutilities.isResolvedShorthand)(main) ? main : undefined;
    const mainContentId = (0, _reactutilities.useId)('fui-TreeItemLayout__main-', mainShorthand === null || mainShorthand === void 0 ? void 0 : mainShorthand.id);
    // Link the selector to the main content unless the consumer provided an accessible name
    const selectorShorthand = (0, _reactutilities.isResolvedShorthand)(props.selector) ? props.selector : undefined;
    const selectorAriaLabelledBy = (selectorShorthand === null || selectorShorthand === void 0 ? void 0 : selectorShorthand['aria-label']) || (selectorShorthand === null || selectorShorthand === void 0 ? void 0 : selectorShorthand['aria-labelledby']) ? undefined : mainContentId;
    const selector = _reactutilities.slot.optional(props.selector, {
        renderByDefault: selectionMode !== 'none',
        defaultProps: {
            checked,
            tabIndex: -1,
            ref: selectionRef,
            'aria-labelledby': selectorAriaLabelledBy
        },
        elementType: selectionMode === 'multiselect' ? _reactcheckbox.Checkbox : _reactradio.Radio
    });
    const mainSlot = _reactutilities.slot.always(main, {
        defaultProps: {
            id: selector ? mainContentId : undefined
        },
        elementType: 'div'
    });
    // FIXME: Asserting is required here, as converting this to RefObject on context type would be a breaking change
    // eslint-disable-next-line react-hooks/refs
    assertIsRefObject(treeItemRef);
    // FIXME: Asserting is required here, as converting this to RefObject on context type would be a breaking change
    // eslint-disable-next-line react-hooks/refs
    assertIsRefObject(subtreeRef);
    const setActionsVisibleIfNotFromSubtree = _react.useCallback((event)=>{
        const isTargetFromSubtree = Boolean(subtreeRef.current && (0, _reactutilities.elementContains)(subtreeRef.current, event.target));
        if (!isTargetFromSubtree) {
            onActionVisibilityChange === null || onActionVisibilityChange === void 0 ? void 0 : onActionVisibilityChange(event, {
                visible: true,
                event,
                type: event.type
            });
            if (event.defaultPrevented) {
                return;
            }
            setIsActionsVisible(true);
        }
    }, [
        subtreeRef,
        setIsActionsVisible,
        onActionVisibilityChange
    ]);
    const { targetDocument } = (0, _reactsharedcontexts.useFluent_unstable)();
    const isNavigatingWithKeyboard = (0, _reacttabster.useIsNavigatingWithKeyboard)();
    const setActionsInvisibleIfNotFromSubtree = _react.useCallback((event)=>{
        const isRelatedTargetFromActions = ()=>Boolean(actionsRefInternal.current && (0, _reactutilities.elementContains)(actionsRefInternal.current, event.relatedTarget));
        const isRelatedTargetFromTreeItem = ()=>Boolean(treeItemRef.current && (0, _reactutilities.elementContains)(treeItemRef.current, event.relatedTarget));
        const isTargetFromActions = ()=>{
            var _actionsRefInternal_current;
            return Boolean((_actionsRefInternal_current = actionsRefInternal.current) === null || _actionsRefInternal_current === void 0 ? void 0 : _actionsRefInternal_current.contains(event.target));
        };
        if (isRelatedTargetFromActions()) {
            onActionVisibilityChange === null || onActionVisibilityChange === void 0 ? void 0 : onActionVisibilityChange(event, {
                visible: true,
                event,
                type: event.type
            });
            if (event.defaultPrevented) {
                return;
            }
            setIsActionsVisible(true);
            return;
        }
        if (isTargetFromActions() && isRelatedTargetFromTreeItem()) {
            return;
        }
        // when a mouseout event happens during keyboard interaction
        // we should not hide the actions if the activeElement is the treeitem or an action
        // as the focus on the treeitem takes precedence over the mouseout event
        if (event.type === 'mouseout' && isNavigatingWithKeyboard() && ((targetDocument === null || targetDocument === void 0 ? void 0 : targetDocument.activeElement) === treeItemRef.current || (0, _reactutilities.elementContains)(actionsRefInternal.current, targetDocument === null || targetDocument === void 0 ? void 0 : targetDocument.activeElement))) {
            return;
        }
        onActionVisibilityChange === null || onActionVisibilityChange === void 0 ? void 0 : onActionVisibilityChange(event, {
            visible: false,
            event,
            type: event.type
        });
        if (event.defaultPrevented) {
            return;
        }
        setIsActionsVisible(false);
    }, [
        setIsActionsVisible,
        onActionVisibilityChange,
        treeItemRef,
        isNavigatingWithKeyboard,
        targetDocument
    ]);
    const expandIconRefs = (0, _reactutilities.useMergedRefs)(expandIconRef);
    const expandIcon = _reactutilities.slot.optional(props.expandIcon, {
        renderByDefault: isBranch,
        defaultProps: {
            children: /*#__PURE__*/ _react.createElement(_TreeItemChevron.TreeItemChevron, null),
            'aria-hidden': true,
            ref: expandIconRefs
        },
        elementType: 'div'
    });
    const arrowNavigationProps = (0, _reacttabster.useArrowNavigationGroup)({
        circular: navigationMode === 'tree',
        axis: 'horizontal'
    });
    const handleActionsBlur = (0, _reactutilities.useEventCallback)((event)=>{
        if ((0, _reactutilities.isResolvedShorthand)(props.actions)) {
            var _props_actions_onBlur, _props_actions;
            (_props_actions_onBlur = (_props_actions = props.actions).onBlur) === null || _props_actions_onBlur === void 0 ? void 0 : _props_actions_onBlur.call(_props_actions, event);
        }
        const isRelatedTargetFromActions = Boolean((0, _reactutilities.elementContains)(event.currentTarget, event.relatedTarget));
        onActionVisibilityChange === null || onActionVisibilityChange === void 0 ? void 0 : onActionVisibilityChange(event, {
            visible: isRelatedTargetFromActions,
            event,
            type: event.type
        });
        setIsActionsVisible(isRelatedTargetFromActions);
    });
    const actionsRefs = (0, _reactutilities.useMergedRefs)(actionsRef, actionsRefInternal);
    const actions = isActionsVisible ? _reactutilities.slot.optional(props.actions, {
        defaultProps: {
            ...arrowNavigationProps,
            role: 'toolbar',
            ref: actionsRefs,
            onBlur: handleActionsBlur
        },
        elementType: 'div'
    }) : undefined;
    const hasActions = Boolean(props.actions);
    _react.useEffect(()=>{
        if (treeItemRef.current && hasActions) {
            const treeItemElement = treeItemRef.current;
            const handleMouseOver = setActionsVisibleIfNotFromSubtree;
            const handleMouseOut = setActionsInvisibleIfNotFromSubtree;
            const handleFocus = setActionsVisibleIfNotFromSubtree;
            const handleBlur = setActionsInvisibleIfNotFromSubtree;
            treeItemElement.addEventListener('mouseover', handleMouseOver);
            treeItemElement.addEventListener('mouseout', handleMouseOut);
            treeItemElement.addEventListener('focus', handleFocus);
            treeItemElement.addEventListener('blur', handleBlur);
            return ()=>{
                treeItemElement.removeEventListener('mouseover', handleMouseOver);
                treeItemElement.removeEventListener('mouseout', handleMouseOut);
                treeItemElement.removeEventListener('focus', handleFocus);
                treeItemElement.removeEventListener('blur', handleBlur);
            };
        }
    }, [
        hasActions,
        treeItemRef,
        setActionsVisibleIfNotFromSubtree,
        setActionsInvisibleIfNotFromSubtree
    ]);
    return {
        components: {
            root: 'div',
            expandIcon: 'div',
            iconBefore: 'div',
            main: 'div',
            iconAfter: 'div',
            actions: 'div',
            aside: 'div',
            // Casting here to a union between checkbox and radio
            selector: selectionMode === 'multiselect' ? _reactcheckbox.Checkbox : _reactradio.Radio
        },
        buttonContextValue: {
            size: 'small'
        },
        root: _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)('div', {
            ...props,
            // FIXME:
            // `ref` is wrongly assigned to be `HTMLElement` instead of `HTMLDivElement`
            // but since it would be a breaking change to fix it, we are casting ref to it's proper type
            ref: (0, _reactutilities.useMergedRefs)(ref, layoutRef)
        }), {
            elementType: 'div'
        }),
        iconBefore: _reactutilities.slot.optional(iconBefore, {
            elementType: 'div'
        }),
        main: mainSlot,
        iconAfter: _reactutilities.slot.optional(iconAfter, {
            elementType: 'div'
        }),
        aside: !isActionsVisible ? _reactutilities.slot.optional(props.aside, {
            elementType: 'div'
        }) : undefined,
        actions,
        expandIcon,
        selector
    };
};
function assertIsRefObject(ref) {
    if (process.env.NODE_ENV !== 'production') {
        if (typeof ref !== 'object' || ref === null || !('current' in ref)) {
            throw new Error(`
        @fluentui/react-tree [${useTreeItemLayout_unstable.name}]:
        Internal Error: contextual ref is not a RefObject! Please report this bug immediately, as contextual refs should be RefObjects.
      `);
        }
    }
}
