'use client';
import { mergeClasses } from "@griffel/react";
import { useId } from "@fluentui/react-utilities";
import * as React from "react";
import { useSyncExternalStore } from "use-sync-external-store/shim";
import { getRectCorners } from "./getRectCorners.js";
import { getMouseAnchor } from "./getMouseAnchor.js";
import { pointsToSvgPath } from "./pointsToSvgPath.js";
import { useStyles } from "./SafeZoneArea.styles.js";
import { computeOutsideClipPath } from "./computeOutsideClipPath.js";
import { getSafeZonePoints } from "./getSafeZonePoints.js";
// ---
/**
 * A component that renders a safe zone area with SVG shapes. Uses `useSyncExternalStore` to manage its active state
 * to avoid causing re-renders in `useSafeZoneArea()` as the hook might be used in host components like `Menu`.
 *
 * Draws a polygon from the mouse to the facing edges of the container and clips out the target element.
 *
 * @internal
 */ export const SafeZoneArea = /*#__PURE__*/ React.memo((props)=>{
    const { debug, onMouseEnter, onMouseMove, onMouseLeave, stateStore } = props;
    const clipPathId = useId();
    const styles = useStyles();
    const active = useSyncExternalStore(stateStore.subscribe, stateStore.isActive);
    const svgRef = React.useRef(null);
    const safeZoneRef = React.useRef(null);
    const clipPathRef = React.useRef(null);
    const rectDebugRef = React.useRef(null);
    React.useImperativeHandle(props.imperativeRef, ()=>({
            updateSVG ({ containerRect, targetRect, mouseCoordinates }) {
                var _safeZoneRef_current, _clipPathRef_current, _rectDebugRef_current;
                const topOffset = Math.min(targetRect.top, containerRect.top);
                const leftOffset = Math.min(targetRect.left, containerRect.left);
                const bottomOffset = Math.max(targetRect.bottom, containerRect.bottom);
                const rightOffset = Math.max(targetRect.right, containerRect.right);
                const containerCorners = getRectCorners(containerRect, [
                    leftOffset,
                    topOffset
                ]);
                const targetCorners = getRectCorners(targetRect, [
                    leftOffset,
                    topOffset
                ]);
                // SVG coordinates are relative to its top-left corner.
                const relativeMouseCoordinates = [
                    mouseCoordinates[0] - leftOffset,
                    mouseCoordinates[1] - topOffset
                ];
                const mouseAnchor = getMouseAnchor(containerCorners.topLeft, containerCorners.bottomRight, relativeMouseCoordinates);
                const svgWidth = rightOffset - leftOffset;
                const svgHeight = bottomOffset - topOffset;
                const clipPath = computeOutsideClipPath(svgWidth, svgHeight, {
                    x: targetCorners.topLeft[0],
                    y: targetCorners.topLeft[1],
                    width: targetRect.width,
                    height: targetRect.height
                });
                if (svgRef.current) {
                    svgRef.current.style.width = `${svgWidth}px`;
                    svgRef.current.style.height = `${svgHeight}px`;
                    svgRef.current.style.transform = `translate(${leftOffset}px, ${topOffset}px)`;
                }
                const safeZonePoints = getSafeZonePoints(mouseAnchor, containerCorners);
                (_safeZoneRef_current = safeZoneRef.current) === null || _safeZoneRef_current === void 0 ? void 0 : _safeZoneRef_current.setAttribute('d', safeZonePoints.length > 0 ? pointsToSvgPath(safeZonePoints) : '');
                (_clipPathRef_current = clipPathRef.current) === null || _clipPathRef_current === void 0 ? void 0 : _clipPathRef_current.setAttribute('d', clipPath);
                (_rectDebugRef_current = rectDebugRef.current) === null || _rectDebugRef_current === void 0 ? void 0 : _rectDebugRef_current.setAttribute('d', clipPath);
            }
        }), []);
    return /*#__PURE__*/ React.createElement("div", {
        className: mergeClasses(styles.wrapper, active && styles.wrapperActive),
        "data-safe-zone": ""
    }, /*#__PURE__*/ React.createElement("svg", {
        "aria-hidden": true,
        className: styles.svg,
        xmlns: "http://www.w3.org/2000/svg",
        ref: svgRef,
        style: {
            width: 0,
            height: 0,
            transform: 'translate(0px, 0px)'
        }
    }, /*#__PURE__*/ React.createElement("g", {
        className: mergeClasses(styles.safeZone, debug && styles.safeZoneDebug),
        clipPath: `url(#${clipPathId})`,
        onMouseEnter: onMouseEnter,
        onMouseMove: onMouseMove,
        onMouseLeave: onMouseLeave
    }, /*#__PURE__*/ React.createElement("path", {
        ref: safeZoneRef
    })), /*#__PURE__*/ React.createElement("clipPath", {
        id: clipPathId
    }, /*#__PURE__*/ React.createElement("path", {
        ref: clipPathRef
    })), debug && /*#__PURE__*/ React.createElement("path", {
        ref: rectDebugRef,
        className: styles.rectDebug
    })));
});
