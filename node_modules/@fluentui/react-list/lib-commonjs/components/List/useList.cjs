'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "useList_unstable", {
    enumerable: true,
    get: function() {
        return useList_unstable;
    }
});
const _reactutilities = require("@fluentui/react-utilities");
const _reacttabster = require("@fluentui/react-tabster");
const _useListSelection = require("../../hooks/useListSelection.cjs");
const _index = require("../../utils/index.cjs");
const DEFAULT_ROOT_EL_TYPE = 'ul';
const useList_unstable = (props, ref)=>{
    const { navigationMode, selectionMode, selectedItems, defaultSelectedItems, onSelectionChange } = props;
    const as = props.as || navigationMode === 'composite' ? 'div' : DEFAULT_ROOT_EL_TYPE;
    const arrowNavigationAttributes = (0, _reacttabster.useArrowNavigationGroup)({
        axis: 'vertical',
        memorizeCurrent: true
    });
    const [selectionState, setSelectionState] = (0, _reactutilities.useControllableState)({
        state: selectedItems,
        defaultState: defaultSelectedItems,
        initialState: []
    });
    const onChange = (0, _reactutilities.useEventCallback)((e, data)=>{
        const selectedItemsAsArray = Array.from(data.selectedItems);
        setSelectionState(selectedItemsAsArray);
        onSelectionChange === null || onSelectionChange === void 0 ? void 0 : onSelectionChange(e, {
            event: e,
            type: 'change',
            selectedItems: selectedItemsAsArray
        });
    });
    const selection = (0, _useListSelection.useListSelection)({
        onSelectionChange: onChange,
        selectionMode: selectionMode || 'multiselect',
        selectedItems: selectionState
    });
    const listRole = props.role || (0, _index.calculateListRole)(navigationMode, !!selectionMode);
    const listItemRole = (0, _index.calculateListItemRoleForListRole)(listRole);
    const { findAllFocusable } = (0, _reacttabster.useFocusFinders)();
    const validateListItem = (0, _reactutilities.useEventCallback)((listItemEl)=>{
        if (process.env.NODE_ENV === 'production') {
            return;
        }
        const itemRole = listItemEl.getAttribute('role') || '';
        const focusable = findAllFocusable(listItemEl);
        (0, _index.validateProperElementTypes)(as, listItemEl.tagName.toLocaleLowerCase());
        (0, _index.validateProperRolesAreUsed)(listRole, itemRole, !!selectionMode, focusable.length > 0);
        (0, _index.validateGridCellsArePresent)(listRole, listItemEl);
    });
    return {
        components: {
            root: as
        },
        root: _reactutilities.slot.always((0, _reactutilities.getIntrinsicElementProps)(as, {
            ref,
            role: listRole,
            ...selectionMode && {
                'aria-multiselectable': selectionMode === 'multiselect' ? true : undefined
            },
            ...arrowNavigationAttributes,
            ...props
        }), {
            elementType: as
        }),
        listItemRole,
        validateListItem,
        navigationMode,
        // only pass down selection state if its handled internally, otherwise just report the events
        selection: selectionMode ? selection : undefined
    };
};
