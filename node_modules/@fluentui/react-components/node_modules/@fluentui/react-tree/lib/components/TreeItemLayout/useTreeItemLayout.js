'use client';
import * as React from "react";
import { getIntrinsicElementProps, isResolvedShorthand, useMergedRefs, slot, useEventCallback, elementContains, useControllableState, useId } from "@fluentui/react-utilities";
import { useTreeItemContext_unstable, useTreeContext_unstable } from "../../contexts/index.js";
import { Checkbox } from "@fluentui/react-checkbox";
import { Radio } from "@fluentui/react-radio";
import { TreeItemChevron } from "../TreeItemChevron.js";
import { useArrowNavigationGroup, useIsNavigatingWithKeyboard } from "@fluentui/react-tabster";
import { useFluent_unstable as useFluent } from "@fluentui/react-shared-contexts";
/**
 * Create the state required to render TreeItemLayout.
 *
 * The returned state can be modified with hooks such as useTreeItemLayoutStyles_unstable,
 * before being passed to renderTreeItemLayout_unstable.
 *
 * @param props - props from this instance of TreeItemLayout
 * @param ref - reference to root HTMLElement of TreeItemLayout
 */ export const useTreeItemLayout_unstable = (props, ref)=>{
    const { main, iconAfter, iconBefore } = props;
    const layoutRef = useTreeItemContext_unstable((ctx)=>ctx.layoutRef);
    const selectionMode = useTreeContext_unstable((ctx)=>ctx.selectionMode);
    const navigationMode = useTreeContext_unstable((ctx)=>{
        var _ctx_navigationMode;
        return (_ctx_navigationMode = ctx.navigationMode) !== null && _ctx_navigationMode !== void 0 ? _ctx_navigationMode : 'tree';
    });
    const [isActionsVisibleFromProps, onActionVisibilityChange] = isResolvedShorthand(props.actions) ? [
        props.actions.visible,
        props.actions.onVisibilityChange
    ] : [
        undefined,
        undefined
    ];
    const [isActionsVisible, setIsActionsVisible] = useControllableState({
        state: isActionsVisibleFromProps,
        initialState: false
    });
    const selectionRef = useTreeItemContext_unstable((ctx)=>ctx.selectionRef);
    const expandIconRef = useTreeItemContext_unstable((ctx)=>ctx.expandIconRef);
    const actionsRef = useTreeItemContext_unstable((ctx)=>ctx.actionsRef);
    const actionsRefInternal = React.useRef(null);
    const treeItemRef = useTreeItemContext_unstable((ctx)=>ctx.treeItemRef);
    const subtreeRef = useTreeItemContext_unstable((ctx)=>ctx.subtreeRef);
    const checked = useTreeItemContext_unstable((ctx)=>ctx.checked);
    const isBranch = useTreeItemContext_unstable((ctx)=>ctx.itemType === 'branch');
    const mainShorthand = isResolvedShorthand(main) ? main : undefined;
    const mainContentId = useId('fui-TreeItemLayout__main-', mainShorthand === null || mainShorthand === void 0 ? void 0 : mainShorthand.id);
    // Link the selector to the main content unless the consumer provided an accessible name
    const selectorShorthand = isResolvedShorthand(props.selector) ? props.selector : undefined;
    const selectorAriaLabelledBy = (selectorShorthand === null || selectorShorthand === void 0 ? void 0 : selectorShorthand['aria-label']) || (selectorShorthand === null || selectorShorthand === void 0 ? void 0 : selectorShorthand['aria-labelledby']) ? undefined : mainContentId;
    const selector = slot.optional(props.selector, {
        renderByDefault: selectionMode !== 'none',
        defaultProps: {
            checked,
            tabIndex: -1,
            ref: selectionRef,
            'aria-labelledby': selectorAriaLabelledBy
        },
        elementType: selectionMode === 'multiselect' ? Checkbox : Radio
    });
    const mainSlot = slot.always(main, {
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
    const setActionsVisibleIfNotFromSubtree = React.useCallback((event)=>{
        const isTargetFromSubtree = Boolean(subtreeRef.current && elementContains(subtreeRef.current, event.target));
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
    const { targetDocument } = useFluent();
    const isNavigatingWithKeyboard = useIsNavigatingWithKeyboard();
    const setActionsInvisibleIfNotFromSubtree = React.useCallback((event)=>{
        const isRelatedTargetFromActions = ()=>Boolean(actionsRefInternal.current && elementContains(actionsRefInternal.current, event.relatedTarget));
        const isRelatedTargetFromTreeItem = ()=>Boolean(treeItemRef.current && elementContains(treeItemRef.current, event.relatedTarget));
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
        if (event.type === 'mouseout' && isNavigatingWithKeyboard() && ((targetDocument === null || targetDocument === void 0 ? void 0 : targetDocument.activeElement) === treeItemRef.current || elementContains(actionsRefInternal.current, targetDocument === null || targetDocument === void 0 ? void 0 : targetDocument.activeElement))) {
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
    const expandIconRefs = useMergedRefs(expandIconRef);
    const expandIcon = slot.optional(props.expandIcon, {
        renderByDefault: isBranch,
        defaultProps: {
            children: /*#__PURE__*/ React.createElement(TreeItemChevron, null),
            'aria-hidden': true,
            ref: expandIconRefs
        },
        elementType: 'div'
    });
    const arrowNavigationProps = useArrowNavigationGroup({
        circular: navigationMode === 'tree',
        axis: 'horizontal'
    });
    const handleActionsBlur = useEventCallback((event)=>{
        if (isResolvedShorthand(props.actions)) {
            var _props_actions_onBlur, _props_actions;
            (_props_actions_onBlur = (_props_actions = props.actions).onBlur) === null || _props_actions_onBlur === void 0 ? void 0 : _props_actions_onBlur.call(_props_actions, event);
        }
        const isRelatedTargetFromActions = Boolean(elementContains(event.currentTarget, event.relatedTarget));
        onActionVisibilityChange === null || onActionVisibilityChange === void 0 ? void 0 : onActionVisibilityChange(event, {
            visible: isRelatedTargetFromActions,
            event,
            type: event.type
        });
        setIsActionsVisible(isRelatedTargetFromActions);
    });
    const actionsRefs = useMergedRefs(actionsRef, actionsRefInternal);
    const actions = isActionsVisible ? slot.optional(props.actions, {
        defaultProps: {
            ...arrowNavigationProps,
            role: 'toolbar',
            ref: actionsRefs,
            onBlur: handleActionsBlur
        },
        elementType: 'div'
    }) : undefined;
    const hasActions = Boolean(props.actions);
    React.useEffect(()=>{
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
            selector: selectionMode === 'multiselect' ? Checkbox : Radio
        },
        buttonContextValue: {
            size: 'small'
        },
        root: slot.always(getIntrinsicElementProps('div', {
            ...props,
            // FIXME:
            // `ref` is wrongly assigned to be `HTMLElement` instead of `HTMLDivElement`
            // but since it would be a breaking change to fix it, we are casting ref to it's proper type
            ref: useMergedRefs(ref, layoutRef)
        }), {
            elementType: 'div'
        }),
        iconBefore: slot.optional(iconBefore, {
            elementType: 'div'
        }),
        main: mainSlot,
        iconAfter: slot.optional(iconAfter, {
            elementType: 'div'
        }),
        aside: !isActionsVisible ? slot.optional(props.aside, {
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
