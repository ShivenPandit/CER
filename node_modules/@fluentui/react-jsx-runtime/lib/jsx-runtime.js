import { createJSX } from "./jsx/createJSX.js";
import { jsxSlot } from "./jsx/jsxSlot.js";
import { jsxsSlot } from "./jsx/jsxsSlot.js";
import { Runtime } from "./utils/Runtime.js";
export { Fragment } from "react";
export const jsx = createJSX(Runtime.jsx, jsxSlot);
export const jsxs = createJSX(Runtime.jsxs, jsxsSlot);
