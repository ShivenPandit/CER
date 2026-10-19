import { createJSX } from "./jsx/createJSX.js";
import { jsxDEVSlot } from "./jsx/jsxDEVSlot.js";
import { DevRuntime } from "./utils/DevRuntime.js";
export { Fragment } from "react";
export const jsxDEV = createJSX(DevRuntime.jsxDEV, jsxDEVSlot);
