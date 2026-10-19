'use client';
"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "SafeZoneArea", {
    enumerable: true,
    get: function() {
        return SafeZoneArea;
    }
});
const _interop_require_wildcard = require("@swc/helpers/_/_interop_require_wildcard");
const _react = require("@griffel/react");
const _reactutilities = require("@fluentui/react-utilities");
const _react1 = /*#__PURE__*/ _interop_require_wildcard._(require("react"));
const _shim = require("use-sync-external-store/shim");
const _getRectCorners = require("./getRectCorners.cjs");
const _getMouseAnchor = require("./getMouseAnchor.cjs");
const _pointsToSvgPath = require("./pointsToSvgPath.cjs");
const _SafeZoneAreastyles = require("./SafeZoneArea.styles.cjs");
const _computeOutsideClipPath = require("./computeOutsideClipPath.cjs");
const _getSafeZonePoints = require("./getSafeZonePoints.cjs");
const SafeZoneArea = /*#__PURE__*/ _react1.memo((props)=>{
    const { debug, onMouseEnter, onMouseMove, onMouseLeave, stateStore } = props;
    const clipPathId = (0, _reactutilities.useId)();
    const styles = (0, _SafeZoneAreastyles.useStyles)();
    const active = (0, _shim.useSyncExternalStore)(stateStore.subscribe, stateStore.isActive);
    const svgRef = _react1.useRef(null);
    const safeZoneRef = _react1.useRef(null);
    const clipPathRef = _react1.useRef(null);
    const rectDebugRef = _react1.useRef(null);
    _react1.useImperativeHandle(props.imperativeRef, ()=>({
            updateSVG ({ containerRect, targetRect, mouseCoordinates }) {
                var _safeZoneRef_current, _clipPathRef_current, _rectDebugRef_current;
                const topOffset = Math.min(targetRect.top, containerRect.top);
                const leftOffset = Math.min(targetRect.left, containerRect.left);
                const bottomOffset = Math.max(targetRect.bottom, containerRect.bottom);
                const rightOffset = Math.max(targetRect.right, containerRect.right);
                const containerCorners = (0, _getRectCorners.getRectCorners)(containerRect, [
                    leftOffset,
                    topOffset
                ]);
                const targetCorners = (0, _getRectCorners.getRectCorners)(targetRect, [
                    leftOffset,
                    topOffset
                ]);
                // SVG coordinates are relative to its top-left corner.
                const relativeMouseCoordinates = [
                    mouseCoordinates[0] - leftOffset,
                    mouseCoordinates[1] - topOffset
                ];
                const mouseAnchor = (0, _getMouseAnchor.getMouseAnchor)(containerCorners.topLeft, containerCorners.bottomRight, relativeMouseCoordinates);
                const svgWidth = rightOffset - leftOffset;
                const svgHeight = bottomOffset - topOffset;
                const clipPath = (0, _computeOutsideClipPath.computeOutsideClipPath)(svgWidth, svgHeight, {
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
                const safeZonePoints = (0, _getSafeZonePoints.getSafeZonePoints)(mouseAnchor, containerCorners);
                (_safeZoneRef_current = safeZoneRef.current) === null || _safeZoneRef_current === void 0 ? void 0 : _safeZoneRef_current.setAttribute('d', safeZonePoints.length > 0 ? (0, _pointsToSvgPath.pointsToSvgPath)(safeZonePoints) : '');
                (_clipPathRef_current = clipPathRef.current) === null || _clipPathRef_current === void 0 ? void 0 : _clipPathRef_current.setAttribute('d', clipPath);
                (_rectDebugRef_current = rectDebugRef.current) === null || _rectDebugRef_current === void 0 ? void 0 : _rectDebugRef_current.setAttribute('d', clipPath);
            }
        }), []);
    return /*#__PURE__*/ _react1.createElement("div", {
        className: (0, _react.mergeClasses)(styles.wrapper, active && styles.wrapperActive),
        "data-safe-zone": ""
    }, /*#__PURE__*/ _react1.createElement("svg", {
        "aria-hidden": true,
        className: styles.svg,
        xmlns: "http://www.w3.org/2000/svg",
        ref: svgRef,
        style: {
            width: 0,
            height: 0,
            transform: 'translate(0px, 0px)'
        }
    }, /*#__PURE__*/ _react1.createElement("g", {
        className: (0, _react.mergeClasses)(styles.safeZone, debug && styles.safeZoneDebug),
        clipPath: `url(#${clipPathId})`,
        onMouseEnter: onMouseEnter,
        onMouseMove: onMouseMove,
        onMouseLeave: onMouseLeave
    }, /*#__PURE__*/ _react1.createElement("path", {
        ref: safeZoneRef
    })), /*#__PURE__*/ _react1.createElement("clipPath", {
        id: clipPathId
    }, /*#__PURE__*/ _react1.createElement("path", {
        ref: clipPathRef
    })), debug && /*#__PURE__*/ _react1.createElement("path", {
        ref: rectDebugRef,
        className: styles.rectDebug
    })));
});
