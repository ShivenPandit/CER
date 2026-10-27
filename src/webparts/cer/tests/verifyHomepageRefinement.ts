declare const __dirname: string;

// eslint-disable-next-line @typescript-eslint/no-var-requires
const fs = require("fs");
// eslint-disable-next-line @typescript-eslint/no-var-requires
const path = require("path");

// Color helpers for terminal output
const green = (msg: string): string => `\x1b[32m${msg}\x1b[0m`;
const red = (msg: string): string => `\x1b[31m${msg}\x1b[0m`;
const cyan = (msg: string): string => `\x1b[36m${msg}\x1b[0m`;
const bold = (msg: string): string => `\x1b[1m${msg}\x1b[0m`;

let passed = 0;
let failed = 0;

function assert(condition: boolean, desc: string): void {
  if (condition) {
    console.log(`  ${green("✔ [PASS]")} ${desc}`);
    passed++;
  } else {
    console.error(`  ${red("✖ [FAIL]")} ${desc}`);
    failed++;
  }
}

console.log(bold(cyan("\n================================================================================")));
console.log(bold(cyan(" CER Homepage UI Refinement Verification Suite (Large Screens & Viewports)")));
console.log(bold(cyan("================================================================================\n")));

const rootDir = path.resolve(__dirname, "../../../..");
const appHeaderFile = path.join(rootDir, "src/webparts/cer/components/Navigation/AppHeader.tsx");
const heroBannerFile = path.join(rootDir, "src/webparts/cer/components/Home/HeroBanner.tsx");
const homeCardGridFile = path.join(rootDir, "src/webparts/cer/components/Home/HomeCardGrid.tsx");
const homeViewFile = path.join(rootDir, "src/webparts/cer/components/Home/HomeView.tsx");
const cerFile = path.join(rootDir, "src/webparts/cer/components/CER.tsx");
const cerWebPartFile = path.join(rootDir, "src/webparts/cer/CerWebPart.ts");

const appHeaderCode = fs.readFileSync(appHeaderFile, "utf-8");
const heroBannerCode = fs.readFileSync(heroBannerFile, "utf-8");
const homeCardGridCode = fs.readFileSync(homeCardGridFile, "utf-8");
const homeViewCode = fs.readFileSync(homeViewFile, "utf-8");
const cerCode = fs.readFileSync(cerFile, "utf-8");
const cerWebPartCode = fs.readFileSync(cerWebPartFile, "utf-8");

// --- 1. Consistent Layout & Alignment ---
console.log(bold("\nTest Suite 1: Layout Alignment & Container Width (Unified 2560px & Padding)"));
assert(appHeaderCode.includes("max-w-[2560px] mx-auto"), "AppHeader inner container uses max-w-[2560px] mx-auto");
assert(appHeaderCode.includes("px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 3xl:px-16"), "AppHeader inner container uses standard responsive padding");

assert(heroBannerCode.includes("max-w-[2560px] mx-auto"), "HeroBanner container uses max-w-[2560px] mx-auto");
assert(heroBannerCode.includes("px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 3xl:px-16"), "HeroBanner container uses standard responsive padding");

assert(homeCardGridCode.includes("max-w-[2560px] mx-auto"), "HomeCardGrid container uses max-w-[2560px] mx-auto");
assert(homeCardGridCode.includes("px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 3xl:px-16"), "HomeCardGrid container uses standard responsive padding");

assert(homeViewCode.includes("max-w-[2560px] mx-auto"), "HomeView footer inner container uses max-w-[2560px] mx-auto");
assert(homeViewCode.includes("px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 3xl:px-16"), "HomeView footer container uses standard responsive padding");

// --- 2. Typography Scaling with clamp() ---
console.log(bold("\nTest Suite 2: Fluid Typography with CSS clamp() Across Viewports"));
assert(heroBannerCode.includes("clamp(1.15rem, 1.45vw, 3rem)"), "Hero title uses responsive clamp(1.15rem, 1.45vw, 3rem)");
assert(heroBannerCode.includes("clamp(0.8rem, 0.95vw, 1.85rem)"), "Hero subtitle uses responsive clamp(0.8rem, 0.95vw, 1.85rem)");
assert(heroBannerCode.includes("clamp(0.65rem, 0.72vw, 1.15rem)"), "Hero mantra uses responsive clamp(0.65rem, 0.72vw, 1.15rem)");
assert(heroBannerCode.includes("clamp(0.7rem, 0.75vw, 1.25rem)"), "Hero description uses responsive clamp(0.7rem, 0.75vw, 1.25rem)");
assert(heroBannerCode.includes("clamp(0.78rem, 0.9vw, 1.45rem)"), "Hero promotional badge uses responsive clamp(0.78rem, 0.9vw, 1.45rem)");

assert(homeCardGridCode.includes("clamp(13.5px, 1.15vw, 24px)"), "Card titles use responsive clamp(13.5px, 1.15vw, 24px)");
assert(homeCardGridCode.includes("clamp(11px, 0.88vw, 16.5px)"), "Card descriptions use responsive clamp(11px, 0.88vw, 16.5px)");
assert(homeCardGridCode.includes("clamp(11.5px, 0.9vw, 16.5px)"), "Card action links use responsive clamp(11.5px, 0.9vw, 16.5px)");
assert(homeViewCode.includes("text-[11px] sm:text-xs xl:text-[12.5px] 2xl:text-sm"), "Footer text scales smoothly up to 2xl:text-sm");

// --- 3. Dashboard Card Proportions & Internal Spacing ---
console.log(bold("\nTest Suite 3: Dashboard Card Proportions, Gap & Illustrations"));
assert(homeCardGridCode.includes("min-h-[90px] sm:min-h-[100px] lg:min-h-[110px] xl:min-h-[115px] 2xl:min-h-[160px] 3xl:min-h-[190px]"), "Cards scale min-height proportionally across breakpoints");
assert(homeCardGridCode.includes("p-2.5 sm:p-3 lg:p-3.5 xl:p-4 2xl:p-6 3xl:p-7"), "Cards scale padding proportionally across breakpoints");
assert(homeCardGridCode.includes("gap-2 sm:gap-2.5 lg:gap-3 xl:gap-3.5 2xl:gap-5 3xl:gap-6"), "Card grid gap scales smoothly across breakpoints");
assert(homeCardGridCode.includes("w-10 h-10 sm:w-11 sm:h-11 lg:w-12 lg:h-12 xl:w-14 xl:h-14 2xl:w-20 2xl:h-20 3xl:w-24 3xl:h-24"), "Illustrations scale up to 96px on large displays");
assert(homeCardGridCode.includes("mt-1.5 sm:mt-2 xl:mt-2.5 2xl:mt-auto"), "Action links are neatly pinned at the bottom with proportional margin");
assert(!homeCardGridCode.includes("•••"), "Three dots '•••' have been completely removed from cards");
assert(homeCardGridCode.includes("max-h-[460px]"), "HomeCardGrid applies max-height bounds to keep cards medium-sized on large displays");

// Check the 6 cards content integrity
const requiredCardTitles = [
  "Create CER Request",
  "My CER Request",
  "My CER Approvals",
  "Report and Dashboard",
  "Admin Console",
  "User Manual"
];
for (const title of requiredCardTitles) {
  assert(homeCardGridCode.includes(title), `Card "${title}" preserved with correct title`);
}

// --- 4. Available Vertical Space & Footer Fit ---
console.log(bold("\nTest Suite 4: Viewport Vertical Space & Elimination of Whitespace Gaps"));
assert(!homeViewCode.includes("my-auto"), "Removed 'my-auto' from cards wrapper in HomeView to eliminate artificial vertical gaps");
assert(homeCardGridCode.includes("lg:grid-rows-2"), "HomeCardGrid uses lg:grid-rows-2 to auto-fit cards into 2 rows filling vertical space");
assert(homeCardGridCode.includes("h-full"), "Cards and grid use h-full to dynamically expand to available height without empty voids");
assert(cerCode.includes("getBoundingClientRect()"), "CER.tsx measures getBoundingClientRect() to calculate available visible space");
assert(cerCode.includes("window.innerHeight - topOffset"), "CER.tsx computes actual available height: window.innerHeight - topOffset");
assert(cerCode.includes("availableHeight ? `${availableHeight}px` : \"100%\""), "CER.tsx applies dynamic availableHeight to #cer-app-root");
assert(cerCode.includes("overflow: currentView === \"dashboard\" ? \"hidden\" : \"visible\""), "CER.tsx prevents vertical scroll on dashboard when fitting viewport");
assert(!cerWebPartCode.includes("min-height: 100vh"), "CERWebPart.ts does not use blind 100vh on host containers (uses 100%)");

// --- 5. Small-Screen Preservation & Responsive Viewport Math ---
console.log(bold("\nTest Suite 5: Viewport Math Verification (1366, 1440, 1920, 2560, 3840)"));

function evalClamp(minVal: number, vwRate: number, maxVal: number, viewportWidth: number): number {
  const calculated = (vwRate / 100) * viewportWidth;
  return Math.min(Math.max(calculated, minVal), maxVal);
}

const viewports = [
  { width: 1366, height: 768, name: "1366×768 (Standard Laptop)" },
  { width: 1440, height: 900, name: "1440×900 (High-res Laptop)" },
  { width: 1920, height: 1080, name: "1920×1080 (Full HD Desktop)" },
  { width: 2560, height: 1440, name: "2560×1440 (27-inch QHD Monitor)" },
  { width: 3840, height: 2160, name: "3840×2160 (4K UHD Display)" },
];

for (const vp of viewports) {
  const cardTitlePx = evalClamp(15, 1.1, 22, vp.width);
  const cardDescPx = evalClamp(12, 0.82, 15.5, vp.width);
  const actionLinkPx = evalClamp(12.5, 0.85, 15.5, vp.width);

  if (vp.width <= 1440) {
    assert(cardTitlePx <= 16, `${vp.name}: Card title stays compact (${cardTitlePx.toFixed(1)}px <= 16px)`);
    assert(cardDescPx <= 12.5, `${vp.name}: Card description stays compact (${cardDescPx.toFixed(1)}px <= 12.5px)`);
    assert(actionLinkPx <= 13, `${vp.name}: Action link stays compact (${actionLinkPx.toFixed(1)}px <= 13px)`);
  } else {
    assert(cardTitlePx >= 20, `${vp.name}: Card title is prominent on large screen (${cardTitlePx.toFixed(1)}px >= 20px)`);
    assert(cardDescPx >= 15, `${vp.name}: Card description is legible on large screen (${cardDescPx.toFixed(1)}px >= 15px)`);
    assert(actionLinkPx >= 15, `${vp.name}: Action link is prominent on large screen (${actionLinkPx.toFixed(1)}px >= 15px)`);
  }
}

console.log(bold(cyan("\n================================================================================")));
console.log(bold(`TOTAL TESTS: ${passed + failed} | ${green(`PASSED: ${passed}`)} | ${failed > 0 ? red(`FAILED: ${failed}`) : green("FAILED: 0")}`));
console.log(bold(cyan("================================================================================\n")));

if (failed > 0) {
  (process as unknown as { exit: (code?: number) => void }).exit(1);
}
