import React from "react";
// Import offshore rig image asset
import heroImage from "../../assets/offshore_rig_hero.jpg";

export const HeroBanner: React.FC = () => {
  return (
    <div className="relative w-full overflow-hidden bg-gradient-to-r from-[#06182E] via-[#092244] to-[#0D2D56] text-white select-none shadow-md touch-pan-y shrink-0">
      {/* Background Oil Rig Image (Right Aligned, Responsive Cropping) */}
      <div className="absolute inset-y-0 right-0 w-full sm:w-4/5 md:w-3/4 lg:w-2/3 xl:w-3/5 h-full overflow-hidden pointer-events-none">
        <img
          src={heroImage}
          alt="Offshore Oil Drilling Platform at Sunset"
          className="w-full h-full object-cover object-right md:object-center transform scale-105 opacity-80 sm:opacity-95"
        />
        {/* Soft Golden & Amber Sky Warmth Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#06182E]/70 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Deep Navy/Petroleum Gradient Mask (Fades left to right) */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#06182E] via-[#092244]/95 via-55% sm:via-45% to-transparent pointer-events-none z-10" />

      {/* Angled Translucent Geometric Overlay Slashes (Cutting across middle-right on tablet/desktop) */}
      <div className="absolute inset-y-0 left-1/3 md:left-2/5 lg:left-1/2 w-80 pointer-events-none z-10 overflow-hidden hidden sm:block">
        {/* Sky Blue Translucent Diagonal Ribbon */}
        <div
          className="absolute -top-24 bottom-[-100px] w-10 lg:w-12 bg-sky-400/30 transform -skew-x-[26deg] backdrop-blur-[1px]"
          style={{ left: "10%" }}
        />
        {/* Gold/Yellow Accent Diagonal Ribbon */}
        <div
          className="absolute -top-24 bottom-[-100px] w-3.5 lg:w-4 bg-[#F59E0B]/85 transform -skew-x-[26deg] shadow-lg"
          style={{ left: "26%" }}
        />
        {/* Royal Blue Translucent Diagonal Ribbon */}
        <div
          className="absolute -top-24 bottom-[-100px] w-16 lg:w-20 bg-[#1E3A8A]/50 transform -skew-x-[26deg]"
          style={{ left: "34%" }}
        />
      </div>

      {/* Main Banner Content */}
      <div className="relative z-20 w-full max-w-[2560px] mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 2xl:px-12 3xl:px-16 py-1.5 sm:py-2 lg:py-2.5 xl:py-3.5 2xl:py-8 3xl:py-11 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-3.5 lg:gap-5 min-w-0">
        {/* Left Column: Welcome & Core System Messaging */}
        <div className="max-w-2xl xl:max-w-3xl 2xl:max-w-4xl min-w-0">
          {/* Gold Accent Bar */}
          <div className="w-6 sm:w-8 xl:w-10 2xl:w-16 3xl:w-20 h-1 2xl:h-1.5 bg-[#F59E0B] rounded-full mb-0.5 sm:mb-1 2xl:mb-2" />

          {/* Subtitle Greeting */}
          <p className="text-white/90 text-[11px] sm:text-xs xl:text-xs 2xl:text-sm 3xl:text-base font-semibold tracking-wide">
            Welcome to
          </p>

          {/* Main Title with Gold (CER) Emphasis */}
          <h2
            style={{ fontSize: "clamp(1.15rem, 1.45vw, 3rem)" }}
            className="font-extrabold text-white tracking-tight leading-tight mt-0.5 2xl:mt-1.5"
          >
            Capital Expenditure Request{" "}
            <span className="text-[#FBBF24] font-black whitespace-nowrap">(CER)</span>
          </h2>

          <h3
            style={{ fontSize: "clamp(0.8rem, 0.95vw, 1.85rem)" }}
            className="font-bold text-white tracking-tight leading-snug mt-0.5 2xl:mt-1.5"
          >
            Management System
          </h3>

          {/* Core Mantra */}
          <p
            style={{ fontSize: "clamp(0.65rem, 0.72vw, 1.15rem)" }}
            className="text-white/95 font-extrabold tracking-wider mt-0.5 sm:mt-1 2xl:mt-2 uppercase"
          >
            Plan. Approve. Track. Govern.
          </p>

          {/* Value Proposition Description */}
          <p
            style={{ fontSize: "clamp(0.7rem, 0.75vw, 1.25rem)" }}
            className="text-blue-100/90 leading-snug 2xl:leading-relaxed mt-0.5 2xl:mt-2 max-w-lg xl:max-w-xl 2xl:max-w-3xl 3xl:max-w-4xl"
          >
            A centralized platform to manage Capital Expenditure Requests efficiently,
            ensuring transparency, compliance and better decision-making.
          </p>

          {/* Mobile/Tablet Promotional Line (preserves message on narrow viewports) */}
          <div className="lg:hidden mt-1.5 pt-1 border-t border-white/20 flex items-center justify-between gap-2 max-w-xl">
            <span className="text-xs font-bold text-white/95 tracking-tight">
              Investing Today for a Stronger Tomorrow
            </span>
            <div className="w-5 sm:w-6 h-0.5 bg-[#F59E0B] rounded-full shrink-0" />
          </div>
        </div>

        {/* Right Column: Promotional Message Over Sunset Sky (Desktop & 4K) */}
        <div className="hidden lg:flex flex-col items-end text-right justify-center pr-1 xl:pr-3 shrink-0">
          <div className="bg-white/90 backdrop-blur-md p-2 sm:p-2.5 xl:p-3 2xl:p-5 3xl:p-6 rounded-xl 2xl:rounded-2xl border border-white/70 shadow-md max-w-[150px] sm:max-w-[170px] xl:max-w-[200px] 2xl:max-w-[280px] 3xl:max-w-[330px]">
            <h4
              style={{ fontSize: "clamp(0.78rem, 0.9vw, 1.45rem)" }}
              className="font-black text-[#0A1E38] leading-tight tracking-tight"
            >
              Investing Today
              <br />
              <span className="text-slate-800 font-extrabold">for a Stronger</span>
              <br />
              Tomorrow
            </h4>
            {/* Gold Accent Underline */}
            <div className="w-7 xl:w-10 2xl:w-16 h-1 2xl:h-1.5 bg-[#F59E0B] rounded-full mt-1 2xl:mt-2 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
};
