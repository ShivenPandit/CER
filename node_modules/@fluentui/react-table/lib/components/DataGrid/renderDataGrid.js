import * as React from "react";
import { renderTable_unstable } from "../Table/renderTable.js";
import { DataGridContextProvider } from "../../contexts/dataGridContext.js";
/**
 * Render the final JSX of DataGrid
 */ export const renderDataGrid_unstable = (state, contextValues)=>{
    return /*#__PURE__*/ React.createElement(DataGridContextProvider, {
        value: contextValues.dataGrid
    }, renderTable_unstable(state, contextValues));
};
