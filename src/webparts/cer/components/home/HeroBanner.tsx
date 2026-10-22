import React from "react";
import {
  BarChart3,
  ShieldCheck,
  Settings,
  Target,
} from "lucide-react";
// Import offshore rig image asset
import heroImage from "../../assets/offshore_rig_hero.jpg";

export const HeroBanner: React.FC = () => {
  const benefits = [
    {
      label: "Optimized Investments",
      icon: BarChart3,
      bgColor: "bg-[#0EA5E9]",
    },
    {
      label: "Enhanced Governance",
      icon: ShieldCheck,
      bgColor: "bg-[#10B981]",
    },
    {
      label: "Improved Efficiency",
      icon: Settings,
      bgColor: "bg-[#2563EB]",
    },
    {
      label: "Strategic Growth",
      icon: Target,
      bgColor: "bg-[#14B8A6]",
    },
  ];

  return (
    <div className="relative w-full overflow-hidden bg-[#05162A] text-white select-none shadow-md touch-pan-y">
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
      <div className="absolute inset-y-0 left-1/3 md:left-2/5 lg:left-1/2 w-96 pointer-events-none z-10 overflow-hidden hidden sm:block">
        {/* Sky Blue Translucent Diagonal Ribbon */}
        <div
          className="absolute -top-24 bottom-[-100px] w-12 lg:w-14 bg-sky-400/30 transform -skew-x-[26deg] backdrop-blur-[1px]"
          style={{ left: "10%" }}
        />
        {/* Gold/Yellow Accent Diagonal Ribbon */}
        <div
          className="absolute -top-24 bottom-[-100px] w-4 lg:w-5 bg-[#F59E0B]/85 transform -skew-x-[26deg] shadow-lg"
          style={{ left: "26%" }}
        />
        {/* Royal Blue Translucent Diagonal Ribbon */}
        <div
          className="absolute -top-24 bottom-[-100px] w-20 lg:w-24 bg-[#1E3A8A]/50 transform -skew-x-[26deg]"
          style={{ left: "34%" }}
        />
      </div>

      {/* Main Banner Content */}
      <div className="relative z-20 w-full max-w-none px-4 sm:px-6 lg:px-8 xl:px-12 2xl:px-16 py-3 sm:py-3.5 lg:py-4 2xl:py-7 flex flex-col lg:flex-row lg:items-center justify-between gap-3 sm:gap-5 min-w-0">
        {/* Left Column: Welcome & Core System Messaging */}
        <div className="max-w-2xl 2xl:max-w-3xl">
          {/* Gold Accent Bar */}
          <div className="w-8 sm:w-10 h-0.5 sm:h-1 bg-[#F59E0B] rounded-full mb-1 sm:mb-1.5" />

          {/* Subtitle Greeting */}
          <p className="text-white/90 text-[11px] sm:text-xs 2xl:text-sm font-medium tracking-wide">
            Welcome to
          </p>

          {/* Main Title with Gold (CER) Emphasis */}
          <h2 className="text-lg xs:text-xl sm:text-2xl lg:text-[26px] xl:text-[28px] 2xl:text-[38px] font-extrabold text-white tracking-tight leading-tight mt-0.5">
            Capital Expenditure Request{" "}
            <span className="text-[#FBBF24] font-black">(CER)</span>
          </h2>

          <h3 className="text-sm xs:text-base sm:text-lg lg:text-xl 2xl:text-2xl font-bold text-white tracking-tight leading-snug mt-0.5">
            Management System
          </h3>

          {/* Core Mantra */}
          <p className="text-white/95 font-bold text-[10px] sm:text-[11px] md:text-xs 2xl:text-sm tracking-wide mt-1.5 sm:mt-2 uppercase">
            Plan. Approve. Track. Govern.
          </p>

          {/* Value Proposition Description */}
          <p className="text-blue-100/80 text-[11px] sm:text-xs 2xl:text-sm leading-relaxed mt-1 sm:mt-1.5 max-w-xl 2xl:max-w-2xl">
            A centralized platform to manage Capital Expenditure Requests efficiently,
            ensuring transparency, compliance and better decision-making.
          </p>

          {/* Four Compact Benefit Indicators */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 sm:gap-2 lg:gap-2.5 2xl:gap-3.5 mt-2.5 sm:mt-3 pt-0.5 sm:pt-1">
            {benefits.map((b, idx) => {
              const Icon = b.icon;
              return (
                <div
                  key={idx}
                  className="flex items-center gap-1.5 sm:gap-2 bg-white/10 hover:bg-white/15 backdrop-blur-md px-2 py-1 sm:py-1.5 2xl:py-2 rounded-lg border border-white/10 transition-colors shadow-2xs"
                >
                  <div
                    className={`w-5 h-5 sm:w-6 sm:h-6 2xl:w-7 2xl:h-7 rounded-full ${b.bgColor} text-white flex items-center justify-center shrink-0 shadow-sm`}
                  >
                    <Icon className="w-3 h-3 sm:w-3.5 sm:h-3.5 2xl:w-4 2xl:h-4" />
                  </div>
                  <span className="text-[10px] sm:text-[11px] 2xl:text-xs font-semibold text-white leading-tight">
                    {b.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Mobile/Tablet Promotional Line (preserves message on narrow viewports) */}
          <div className="lg:hidden mt-3 pt-2 border-t border-white/15 flex items-center justify-between gap-3 max-w-xl">
            <span className="text-[11px] sm:text-xs font-bold text-white/95 tracking-tight">
              Investing Today for a Stronger Tomorrow
            </span>
            <div className="w-6 sm:w-8 h-0.5 sm:h-1 bg-[#F59E0B] rounded-full shrink-0" />
          </div>
        </div>

        {/* Right Column: Promotional Message Over Sunset Sky (Desktop & 4K) */}
        <div className="hidden lg:flex flex-col items-end text-right justify-center pr-2 xl:pr-6 shrink-0">
          <div className="bg-white/85 backdrop-blur-md p-3 xl:p-3.5 2xl:p-5 rounded-xl 2xl:rounded-2xl border border-white/60 shadow-md max-w-[190px] xl:max-w-[210px] 2xl:max-w-[250px]">
            <h4 className="text-sm xl:text-base 2xl:text-xl font-black text-[#0A1E38] leading-tight tracking-tight">
              Investing Today
              <br />
              <span className="text-slate-800 font-extrabold">for a Stronger</span>
              <br />
              Tomorrow
            </h4>
            {/* Gold Accent Underline */}
            <div className="w-9 xl:w-12 h-0.5 xl:h-1 bg-[#F59E0B] rounded-full mt-1.5 ml-auto" />
          </div>
        </div>
      </div>
    </div>
  );
};
