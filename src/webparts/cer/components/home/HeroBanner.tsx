import React from "react";
// Import offshore rig image asset
import heroImage from "../../assets/offshore_rig_hero.jpg";

export const HeroBanner: React.FC = () => {
  return (
    <div className="relative w-full overflow-hidden bg-[#05162A] text-white select-none shadow-md touch-pan-y shrink-0">
      {/* Background Oil Rig Image (Right Aligned, Responsive Cropping) */}
      <div className="absolute inset-y-0 right-0 w-full sm:w-4/5 md:w-3/4 lg:w-2/3 xl:w-3/5 h-full overflow-hidden pointer-events-none">
        <img
          src={heroImage}
          alt="Offshore Oil Drilling Platform at Sunset"
          className="w-full h-full object-cover object-right md:object-center transform scale-105 opacity-80 sm:opacity-95"
        />
        {/* Soft Golden & Amber Sky Warmth Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#05162A]/60 via-transparent to-transparent pointer-events-none" />
      </div>

      {/* Deep Navy/Petroleum Gradient Mask (Fades left to right) */}
      <div className="absolute inset-0 bg-gradient-to-r from-[#05162A] via-[#071F3B] via-65% sm:via-48% to-transparent pointer-events-none z-10" />

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
      <div className="relative z-20 w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-2.5 sm:py-3 lg:py-3.5 2xl:py-5 flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 sm:gap-4 min-w-0">
        {/* Left Column: Welcome & Core System Messaging */}
        <div className="max-w-2xl 2xl:max-w-3xl">
          {/* Gold Accent Bar */}
          <div className="w-6 sm:w-8 h-0.5 sm:h-1 bg-[#F59E0B] rounded-full mb-1" />

          {/* Subtitle Greeting */}
          <p className="text-white/85 text-[10px] sm:text-[11px] 2xl:text-xs font-medium tracking-wide">
            Welcome to
          </p>

          {/* Main Title with Gold (CER) Emphasis */}
          <h2 className="text-base sm:text-lg lg:text-xl xl:text-[22px] 2xl:text-[28px] font-extrabold text-white tracking-tight leading-tight mt-0.5">
            Capital Expenditure Request{" "}
            <span className="text-[#FBBF24] font-black">(CER)</span>
          </h2>

          <h3 className="text-xs sm:text-sm lg:text-[15px] 2xl:text-lg font-bold text-white tracking-tight leading-snug mt-0.5">
            Management System
          </h3>

          {/* Core Mantra */}
          <p className="text-white/95 font-bold text-[9px] sm:text-[10px] md:text-[10.5px] 2xl:text-xs tracking-wider mt-1 sm:mt-1.5 uppercase">
            Plan. Approve. Track. Govern.
          </p>

          {/* Value Proposition Description */}
          <p className="text-blue-100/80 text-[10px] sm:text-[11px] 2xl:text-xs leading-relaxed mt-0.5 sm:mt-1 max-w-lg 2xl:max-w-xl">
            A centralized platform to manage Capital Expenditure Requests efficiently,
            ensuring transparency, compliance and better decision-making.
          </p>

          {/* Mobile/Tablet Promotional Line (preserves message on narrow viewports) */}
          <div className="lg:hidden mt-2 pt-1.5 border-t border-white/15 flex items-center justify-between gap-2 max-w-xl">
            <span className="text-[10px] sm:text-[11px] font-bold text-white/95 tracking-tight">
              Investing Today for a Stronger Tomorrow
            </span>
            <div className="w-5 sm:w-6 h-0.5 bg-[#F59E0B] rounded-full shrink-0" />
          </div>
        </div>

        {/* Right Column: Promotional Message Over Sunset Sky (Desktop & 4K) */}
        <div className="hidden lg:flex flex-col items-end text-right justify-center pr-1 xl:pr-4 shrink-0">
          <div className="bg-white/85 backdrop-blur-md p-2.5 xl:p-3 2xl:p-4 rounded-xl border border-white/60 shadow-md max-w-[165px] xl:max-w-[185px] 2xl:max-w-[220px]">
            <h4 className="text-xs xl:text-sm 2xl:text-base font-black text-[#0A1E38] leading-tight tracking-tight">
              Investing Today
              <br />
              <span className="text-slate-800 font-extrabold">for a Stronger</span>
              <br />
              Tomorrow
            </h4>
            {/* Gold Accent Underline */}
            <div className="w-8 xl:w-10 h-0.5 xl:h-1 bg-[#F59E0B] rounded-full mt-1 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
};
