import React from "react";

/**
 * High-fidelity vector illustrations recreating the reference design:
 * "CER Management System Home Page Design Idea(2).png"
 * Enhanced with responsive scaling from 320px mobile to 4K displays.
 */

// Offshore Oil Platform Logo for the Header
export const RigHeaderIcon: React.FC<{ className?: string; size?: number }> = ({
  className = "",
  size = 38,
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 ${className}`}
    aria-label="CER Offshore Platform Logo"
  >
    {/* Derrick 1 (Left Lattice Tower) */}
    <path
      d="M10 38L15 12H19L24 38H10Z"
      stroke="#0B1E38"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <line x1="12" y1="30" x2="22" y2="30" stroke="#0B1E38" strokeWidth="1.5" />
    <line x1="13.5" y1="21" x2="20.5" y2="21" stroke="#0B1E38" strokeWidth="1.5" />
    <line x1="12" y1="30" x2="20.5" y2="21" stroke="#0B1E38" strokeWidth="1.2" />
    <line x1="22" y1="30" x2="13.5" y2="21" stroke="#0B1E38" strokeWidth="1.2" />
    <line x1="13.5" y1="21" x2="19" y2="12" stroke="#0B1E38" strokeWidth="1.2" />
    <line x1="20.5" y1="21" x2="15" y2="12" stroke="#0B1E38" strokeWidth="1.2" />
    {/* Crown block / Derrick top */}
    <rect x="15" y="8" width="4" height="4" fill="#0B1E38" rx="0.5" />
    <line x1="17" y1="8" x2="17" y2="4" stroke="#0B1E38" strokeWidth="1.5" strokeLinecap="round" />

    {/* Derrick 2 (Right Lattice Tower) */}
    <path
      d="M26 38L30 14H34L38 38H26Z"
      stroke="#0B1E38"
      strokeWidth="2"
      strokeLinejoin="round"
    />
    <line x1="27.5" y1="30" x2="36.5" y2="30" stroke="#0B1E38" strokeWidth="1.5" />
    <line x1="29" y1="22" x2="35" y2="22" stroke="#0B1E38" strokeWidth="1.5" />
    <line x1="27.5" y1="30" x2="35" y2="22" stroke="#0B1E38" strokeWidth="1.2" />
    <line x1="36.5" y1="30" x2="29" y2="22" stroke="#0B1E38" strokeWidth="1.2" />
    <rect x="30.5" y="10" width="3" height="4" fill="#0B1E38" rx="0.5" />
    <line x1="32" y1="10" x2="32" y2="6" stroke="#0B1E38" strokeWidth="1.5" strokeLinecap="round" />

    {/* Platform Deck */}
    <rect x="6" y="37" width="36" height="3.5" rx="1.5" fill="#0B1E38" />

    {/* Platform Legs / Pilings in Sea */}
    <rect x="9" y="40.5" width="2.5" height="4.5" fill="#0B1E38" />
    <rect x="23" y="40.5" width="2.5" height="4.5" fill="#0B1E38" />
    <rect x="36.5" y="40.5" width="2.5" height="4.5" fill="#0B1E38" />

    {/* Helideck / Crane on left */}
    <line x1="6" y1="37" x2="2" y2="30" stroke="#0B1E38" strokeWidth="1.5" strokeLinecap="round" />
    <line x1="2" y1="30" x2="6" y2="30" stroke="#0B1E38" strokeWidth="1.5" strokeLinecap="round" />

    {/* Ocean waves */}
    <path
      d="M4 45.5C7 44.5 11 44.5 14 45.5C17 46.5 21 46.5 24 45.5C27 44.5 31 44.5 34 45.5C37 46.5 41 46.5 44 45.5"
      stroke="#1D4ED8"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
  </svg>
);

// Card 1: Create CER Request Illustration
export const CreateCERIllustration: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`relative w-16 h-16 xs:w-18 xs:h-18 sm:w-20 sm:h-20 md:w-22 md:h-22 lg:w-24 lg:h-24 2xl:w-36 2xl:h-36 flex items-center justify-center select-none shrink-0 ${className}`}>
    <div className="relative w-36 h-36 flex items-center justify-center transform scale-[0.48] xs:scale-[0.54] sm:scale-[0.6] md:scale-[0.68] lg:scale-[0.72] 2xl:scale-100 origin-center sm:origin-right transition-transform">
      {/* Soft fluid background waves */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 160" fill="none">
        <path
          d="M20 100C40 70 80 85 110 65C135 48 150 75 155 110C160 140 120 155 90 150C50 145 10 130 20 100Z"
          fill="#BFDBFE"
          fillOpacity="0.45"
        />
        <path
          d="M40 115C60 95 100 105 125 90C145 78 155 100 150 125C145 145 115 155 85 152C55 150 30 135 40 115Z"
          fill="#93C5FD"
          fillOpacity="0.35"
        />
      </svg>

      {/* The White CER Document Sheet */}
      <div className="relative z-10 w-24 h-30 bg-white rounded-xl shadow-md border border-blue-100/80 p-2.5 flex flex-col justify-between transform transition-transform group-hover:-translate-y-1 group-hover:shadow-lg duration-300">
        {/* Document Fold Corner */}
        <div className="absolute top-0 right-0 w-5 h-5 overflow-hidden">
          <div className="w-5 h-5 bg-blue-100 transform rotate-45 translate-x-2.5 -translate-y-2.5 shadow-xs" />
        </div>

        <div>
          {/* CER Header */}
          <div className="text-center font-extrabold text-[13px] tracking-wider text-slate-800 border-b border-slate-100 pb-1 mb-2">
            CER
          </div>

          {/* Text Skeleton Lines */}
          <div className="space-y-1.5 px-0.5">
            <div className="h-1.5 bg-slate-200 rounded-full w-full" />
            <div className="h-1.5 bg-slate-200 rounded-full w-4/5" />
            <div className="h-1.5 bg-slate-200 rounded-full w-full" />
            <div className="h-1.5 bg-slate-200 rounded-full w-3/5" />
          </div>
        </div>

        {/* Floating Plus Button at Lower Right */}
        <div className="absolute -bottom-2 -right-2 w-9 h-9 rounded-full bg-blue-600 text-white flex items-center justify-center shadow-md border-2 border-white ring-1 ring-blue-500/30 transform transition-transform group-hover:scale-110 duration-200">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.8} d="M12 5v14M5 12h14" />
          </svg>
        </div>
      </div>
    </div>
  </div>
);

// Card 2: My CER Request Illustration
export const MyRequestsIllustration: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`relative w-16 h-16 xs:w-18 xs:h-18 sm:w-20 sm:h-20 md:w-22 md:h-22 lg:w-24 lg:h-24 2xl:w-36 2xl:h-36 flex items-center justify-center select-none shrink-0 ${className}`}>
    <div className="relative w-40 h-36 flex items-center justify-center transform scale-[0.46] xs:scale-[0.52] sm:scale-[0.58] md:scale-[0.65] lg:scale-[0.7] 2xl:scale-100 origin-center sm:origin-right transition-transform">
      {/* Soft fluid mint waves */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 160" fill="none">
        <path
          d="M25 90C45 65 90 75 120 60C145 48 158 80 152 115C146 145 110 158 80 152C45 145 12 120 25 90Z"
          fill="#A7F3D0"
          fillOpacity="0.45"
        />
        <path
          d="M45 110C65 90 110 100 135 85C150 78 158 105 150 130C140 150 105 158 75 152C50 148 35 130 45 110Z"
          fill="#6EE7B7"
          fillOpacity="0.35"
        />
      </svg>

      {/* Desktop Monitor Screen */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Monitor Display */}
        <div className="w-28 h-20 bg-white rounded-lg shadow-md border-2 border-teal-500/80 p-2 flex flex-col justify-between overflow-hidden">
          {/* Top Header Dots */}
          <div className="flex items-center gap-1 pb-1 border-b border-slate-100">
            <div className="w-1.5 h-1.5 rounded-full bg-rose-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <div className="ml-auto w-8 h-1 bg-slate-200 rounded-full" />
          </div>

          {/* Dashboard Rows with Status Dots */}
          <div className="space-y-1.5 my-auto">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
              <div className="h-1 bg-slate-300 rounded-full w-12" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
              <div className="h-1 bg-slate-300 rounded-full w-14" />
            </div>
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0" />
              <div className="h-1 bg-slate-300 rounded-full w-10" />
            </div>
          </div>
        </div>

        {/* Monitor Stand */}
        <div className="w-4 h-2.5 bg-teal-600/80" />
        <div className="w-10 h-1 bg-teal-700/80 rounded-full shadow-xs" />

        {/* Magnifying Glass Overlapping */}
        <div className="absolute -bottom-1 -right-3 z-20 transform -rotate-12 transition-transform group-hover:scale-110 duration-200">
          <svg width="44" height="44" viewBox="0 0 44 44" fill="none">
            {/* Glass Lens Circle */}
            <circle cx="18" cy="18" r="12" fill="#E0F2FE" fillOpacity="0.75" stroke="#0284C7" strokeWidth="3" />
            {/* Inner reflection */}
            <path d="M12 14A8 8 0 0 1 20 10" stroke="white" strokeWidth="2" strokeLinecap="round" />
            {/* Handle */}
            <rect x="27" y="27" width="5" height="15" rx="2.5" transform="rotate(-45 27 27)" fill="#0369A1" stroke="#0C4A6E" strokeWidth="1" />
          </svg>
        </div>
      </div>
    </div>
  </div>
);

// Card 3: My CER Approvals Illustration
export const ApprovalsIllustration: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`relative w-16 h-16 xs:w-18 xs:h-18 sm:w-20 sm:h-20 md:w-22 md:h-22 lg:w-24 lg:h-24 2xl:w-36 2xl:h-36 flex items-center justify-center select-none shrink-0 ${className}`}>
    <div className="relative w-40 h-36 flex items-center justify-center transform scale-[0.46] xs:scale-[0.52] sm:scale-[0.58] md:scale-[0.65] lg:scale-[0.7] 2xl:scale-100 origin-center sm:origin-right transition-transform">
      {/* Soft warm amber waves */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 160" fill="none">
        <path
          d="M20 95C40 70 85 80 115 65C140 50 155 80 150 115C142 145 105 158 75 150C40 142 10 120 20 95Z"
          fill="#FDE68A"
          fillOpacity="0.45"
        />
        <path
          d="M40 115C60 95 105 105 130 90C148 78 156 105 148 130C138 150 100 158 70 150C45 145 28 130 40 115Z"
          fill="#FCD34D"
          fillOpacity="0.35"
        />
      </svg>

      <div className="relative z-10 flex items-center justify-center">
        {/* Approver Figure in Suit */}
        <div className="flex flex-col items-center mr-1">
          {/* Head */}
          <div className="w-8 h-8 rounded-full bg-[#F5D0A9] border border-[#D97706]/40 relative overflow-hidden shadow-xs">
            {/* Dark Hair */}
            <div className="absolute top-0 inset-x-0 h-3 bg-slate-800 rounded-b-md" />
          </div>

          {/* Neck & Orange Tie */}
          <div className="w-2.5 h-1.5 bg-[#F5D0A9] -mt-0.5" />

          {/* Navy Suit Body */}
          <div className="relative w-14 h-12 bg-[#0A2540] rounded-t-xl overflow-hidden shadow-sm flex justify-center">
            {/* White shirt triangle */}
            <div
              className="w-4 h-4 bg-white"
              style={{ clipPath: "polygon(0 0, 100% 0, 50% 100%)" }}
            />
            {/* Orange Tie */}
            <div
              className="absolute top-1 w-1.5 h-6 bg-amber-500 shadow-xs"
              style={{ clipPath: "polygon(0 0, 100% 0, 80% 80%, 50% 100%, 20% 80%)" }}
            />
          </div>
        </div>

        {/* Floating Document on the right */}
        <div className="w-10 h-13 bg-white rounded-md shadow-md border border-slate-200/80 p-1.5 flex flex-col justify-between -ml-2 mb-2">
          <div className="w-4 h-1 bg-blue-500 rounded-full mb-1" />
          <div className="space-y-1">
            <div className="w-full h-1 bg-slate-200 rounded-full" />
            <div className="w-5/6 h-1 bg-slate-200 rounded-full" />
            <div className="w-4/6 h-1 bg-slate-200 rounded-full" />
          </div>
          <div className="w-3 h-1 bg-emerald-500 rounded-full mt-1" />
        </div>

        {/* Floating Green Checkmark Badge */}
        <div className="absolute -top-1 -right-1 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-md border-2 border-white ring-1 ring-emerald-400/40 transform transition-transform group-hover:scale-110 duration-200">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        {/* Floating Red Cross Badge */}
        <div className="absolute top-8 -right-3 w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-md border-2 border-white ring-1 ring-rose-400/40 transform transition-transform group-hover:scale-110 duration-200">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
      </div>
    </div>
  </div>
);

// Card 4: Report and Dashboard Illustration
export const ReportsIllustration: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`relative w-16 h-16 xs:w-18 xs:h-18 sm:w-20 sm:h-20 md:w-22 md:h-22 lg:w-24 lg:h-24 2xl:w-36 2xl:h-36 flex items-center justify-center select-none shrink-0 ${className}`}>
    <div className="relative w-40 h-36 flex items-center justify-center transform scale-[0.46] xs:scale-[0.52] sm:scale-[0.58] md:scale-[0.65] lg:scale-[0.7] 2xl:scale-100 origin-center sm:origin-right transition-transform">
      {/* Soft lavender waves */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 160" fill="none">
        <path
          d="M20 90C45 65 90 75 120 60C145 45 158 80 152 115C144 145 108 158 78 150C42 142 12 120 20 90Z"
          fill="#DDD6FE"
          fillOpacity="0.45"
        />
        <path
          d="M40 115C60 95 105 105 130 90C148 78 156 105 148 130C138 150 100 158 70 150C45 145 28 130 40 115Z"
          fill="#C4B5FD"
          fillOpacity="0.35"
        />
      </svg>

      {/* Browser / Dashboard Card */}
      <div className="relative z-10 w-32 h-22 bg-white rounded-xl shadow-md border border-purple-200/80 p-2 flex flex-col justify-between">
        {/* Window Controls */}
        <div className="flex items-center gap-1 pb-1 border-b border-slate-100">
          <div className="w-1.5 h-1.5 rounded-full bg-purple-400" />
          <div className="w-1.5 h-1.5 rounded-full bg-purple-300" />
          <div className="w-1.5 h-1.5 rounded-full bg-purple-200" />
        </div>

        {/* Charts Display */}
        <div className="flex items-end justify-between px-1 pt-1 gap-2">
          {/* Purple Bar Chart */}
          <div className="flex items-end gap-1 h-12">
            <div className="w-2 h-4 bg-purple-300 rounded-t-xs" />
            <div className="w-2 h-7 bg-purple-400 rounded-t-xs" />
            <div className="w-2 h-11 bg-purple-600 rounded-t-xs shadow-xs" />
            <div className="w-2 h-8 bg-purple-500 rounded-t-xs" />
          </div>

          {/* 3D Segmented Pie Chart */}
          <div className="relative w-12 h-12 mb-0.5 shrink-0 transform transition-transform group-hover:rotate-12 duration-300">
            <svg viewBox="0 0 36 36" className="w-full h-full">
              {/* Purple segment */}
              <path d="M18 18 L18 2 A16 16 0 0 1 34 18 Z" fill="#7C3AED" />
              {/* Orange segment */}
              <path d="M18 18 L34 18 A16 16 0 0 1 18 34 Z" fill="#F59E0B" />
              {/* Blue segment */}
              <path d="M18 18 L18 34 A16 16 0 0 1 2 18 Z" fill="#2563EB" />
              {/* Light blue segment */}
              <path d="M18 18 L2 18 A16 16 0 0 1 18 2 Z" fill="#06B6D4" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  </div>
);

// Card 5: Admin Page Illustration
export const AdminIllustration: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`relative w-16 h-16 xs:w-18 xs:h-18 sm:w-20 sm:h-20 md:w-22 md:h-22 lg:w-24 lg:h-24 2xl:w-36 2xl:h-36 flex items-center justify-center select-none shrink-0 ${className}`}>
    <div className="relative w-40 h-36 flex items-center justify-center transform scale-[0.46] xs:scale-[0.52] sm:scale-[0.58] md:scale-[0.65] lg:scale-[0.7] 2xl:scale-100 origin-center sm:origin-right transition-transform">
      {/* Soft pink/rose waves */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 160" fill="none">
        <path
          d="M20 90C45 65 90 75 120 60C145 45 158 80 152 115C144 145 108 158 78 150C42 142 12 120 20 90Z"
          fill="#FECDD3"
          fillOpacity="0.45"
        />
        <path
          d="M40 115C60 95 105 105 130 90C148 78 156 105 148 130C138 150 100 158 70 150C45 145 28 130 40 115Z"
          fill="#FDA4AF"
          fillOpacity="0.35"
        />
      </svg>

      {/* Laptop Device */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Laptop Screen */}
        <div className="w-28 h-18 bg-white rounded-t-lg shadow-md border-2 border-slate-700/80 p-1.5 flex flex-col justify-between overflow-hidden">
          {/* Top bar */}
          <div className="flex items-center justify-between pb-0.5 border-b border-slate-100">
            <div className="w-6 h-1 bg-slate-200 rounded-full" />
            <div className="flex gap-0.5">
              <div className="w-1 h-1 rounded-full bg-slate-300" />
              <div className="w-1 h-1 rounded-full bg-slate-300" />
            </div>
          </div>

          {/* Content with Cog & Users */}
          <div className="flex items-center justify-between px-1">
            {/* Animated Settings Gear */}
            <div className="w-8 h-8 text-blue-500 animate-spin-slow">
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 15.5A3.5 3.5 0 0 1 8.5 12A3.5 3.5 0 0 1 12 8.5a3.5 3.5 0 0 1 3.5 3.5a3.5 3.5 0 0 1-3.5 3.5m7.43-2.53c.04-.32.07-.64.07-.97c0-.33-.03-.66-.07-1l2.11-1.63c.19-.15.24-.42.12-.64l-2-3.46c-.12-.22-.39-.31-.61-.22l-2.49 1c-.52-.39-1.06-.73-1.69-.98l-.37-2.65A.506.506 0 0 0 13.5 2h-4c-.25 0-.46.18-.5.42l-.37 2.65c-.63.25-1.17.59-1.69.98l-2.49-1c-.22-.09-.49 0-.61.22l-2 3.46c-.13.22-.07.49.12.64L4.57 11c-.04.34-.07.67-.07 1c0 .33.03.65.07.97l-2.11 1.66c-.19.15-.25.42-.12.64l2 3.46c.12.22.39.3.61.22l2.49-1.01c.52.4 1.06.74 1.69.99l.37 2.65c.04.24.25.42.5.42h4c.25 0 .46-.18.5-.42l.37-2.65c.63-.26 1.17-.59 1.69-.99l2.49 1.01c.22.08.49 0 .61-.22l2-3.46c.12-.22.07-.49-.12-.64l-2.11-1.66Z" />
              </svg>
            </div>

            {/* User management rows */}
            <div className="space-y-1">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-blue-500" />
                <div className="w-8 h-1 bg-slate-300 rounded-full" />
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-rose-400" />
                <div className="w-6 h-1 bg-slate-300 rounded-full" />
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-emerald-400" />
                <div className="w-7 h-1 bg-slate-300 rounded-full" />
              </div>
            </div>
          </div>

          {/* Bottom controls */}
          <div className="flex justify-between items-center px-1">
            <div className="w-3 h-1 bg-blue-400 rounded-full" />
            <div className="w-3 h-1 bg-slate-300 rounded-full" />
          </div>
        </div>

        {/* Laptop Base & Trackpad */}
        <div className="w-34 h-2 bg-slate-300 rounded-b-md shadow-sm border border-slate-400/80 flex justify-center">
          <div className="w-8 h-1 bg-slate-400 rounded-full" />
        </div>
      </div>
    </div>
  </div>
);

// Card 6: User Manual Illustration
export const UserManualIllustration: React.FC<{ className?: string }> = ({ className = "" }) => (
  <div className={`relative w-16 h-16 xs:w-18 xs:h-18 sm:w-20 sm:h-20 md:w-22 md:h-22 lg:w-24 lg:h-24 2xl:w-36 2xl:h-36 flex items-center justify-center select-none shrink-0 ${className}`}>
    <div className="relative w-40 h-36 flex items-center justify-center transform scale-[0.46] xs:scale-[0.52] sm:scale-[0.58] md:scale-[0.65] lg:scale-[0.7] 2xl:scale-100 origin-center sm:origin-right transition-transform">
      {/* Soft cyan waves */}
      <svg className="absolute inset-0 w-full h-full" viewBox="0 0 160 160" fill="none">
        <path
          d="M20 90C45 65 90 75 120 60C145 45 158 80 152 115C144 145 108 158 78 150C42 142 12 120 20 90Z"
          fill="#A5F3FC"
          fillOpacity="0.45"
        />
        <path
          d="M40 115C60 95 105 105 130 90C148 78 156 105 148 130C138 150 100 158 70 150C45 145 28 130 40 115Z"
          fill="#67E8F9"
          fillOpacity="0.35"
        />
      </svg>

      {/* 3D Cyan/Blue Hardcover Book */}
      <div className="relative z-10 transform -rotate-3 transition-transform group-hover:rotate-0 duration-300">
        {/* Book Cover */}
        <div className="w-22 h-28 bg-gradient-to-br from-[#0284C7] to-[#0369A1] rounded-r-xl rounded-l-xs shadow-lg border-l-4 border-[#075985] p-2 flex flex-col justify-between text-white relative">
          {/* Book Title */}
          <div className="text-center pt-2">
            <p className="text-[9px] font-black tracking-wider leading-tight text-cyan-100 uppercase">
              User
            </p>
            <p className="text-[10px] font-black tracking-wider leading-tight text-white uppercase">
              Manual
            </p>
          </div>

          {/* Document Icon on Cover */}
          <div className="w-10 h-10 mx-auto bg-white/95 rounded-md p-1 shadow-inner flex flex-col justify-between">
            <div className="w-3 h-1 bg-cyan-600 rounded-full" />
            <div className="space-y-0.5">
              <div className="w-full h-0.5 bg-slate-300 rounded-full" />
              <div className="w-3/4 h-0.5 bg-slate-300 rounded-full" />
              <div className="w-full h-0.5 bg-slate-300 rounded-full" />
            </div>
            <div className="w-4 h-0.5 bg-cyan-500 rounded-full" />
          </div>

          {/* Orange Ribbon Bookmark hanging from bottom */}
          <div className="absolute -bottom-2.5 left-6 w-3 h-4 bg-amber-500 shadow-xs flex items-end">
            <div
              className="w-full h-1.5 bg-white"
              style={{ clipPath: "polygon(0 100%, 50% 0, 100% 100%)" }}
            />
          </div>
        </div>

        {/* Pages Edge on the right */}
        <div className="absolute top-1 right-0 w-1.5 h-26 bg-slate-100 rounded-r-xs shadow-xs border-y border-slate-200" />
      </div>
    </div>
  </div>
);
