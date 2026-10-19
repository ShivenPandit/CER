"use strict";
Object.defineProperty(exports, "__esModule", {
    value: true
});
Object.defineProperty(exports, "computeOutsideClipPath", {
    enumerable: true,
    get: function() {
        return computeOutsideClipPath;
    }
});
function drawRectangle(rect) {
    if (rect.width <= 0 || rect.height <= 0) {
        return '';
    }
    let pathData = '';
    // Creates a subpath moving in counterclockwise direction to create a hole
    pathData += `M ${rect.x},${rect.y} `;
    pathData += `V ${rect.y + rect.height} `; // Down to bottom-left
    pathData += `H ${rect.x + rect.width} `; // Right to bottom-right
    pathData += `V ${rect.y} `; // Up to top-right
    pathData += `H ${rect.x} `; // Left to top-left (closing)
    pathData += `Z `; // Close path
    return pathData;
}
function computeOutsideClipPath(svgWidth, svgHeight, targetRect) {
    let pathData = `M 0,0 H ${svgWidth} V ${svgHeight} H 0 Z `;
    // Draw the rectangle counterclockwise to create a hole in the main path.
    pathData += drawRectangle(targetRect);
    return pathData;
}
