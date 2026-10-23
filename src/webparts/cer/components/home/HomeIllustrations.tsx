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
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
    aria-label="Create CER Request Illustration"
  >
    <defs>
      <filter id="cerDocShadow" x="-15%" y="-15%" width="135%" height="135%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.10" />
      </filter>
      <filter id="btnShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#1D4ED8" floodOpacity="0.28" />
      </filter>
    </defs>

    {/* Background soft organic waves */}
    <path
      d="M18 58C12 38 35 23 55 18C75 13 90 28 88 50C86 70 70 86 50 84C30 82 22 73 18 58Z"
      fill="#BFDBFE"
      fillOpacity="0.45"
    />
    <path
      d="M28 66C22 50 40 36 60 30C78 26 88 40 86 58C84 73 70 83 52 82C36 80 32 76 28 66Z"
      fill="#93C5FD"
      fillOpacity="0.35"
    />

    {/* Document Body */}
    <g filter="url(#cerDocShadow)">
      {/* Document Sheet */}
      <path
        d="M28 18C28 15 30.5 13 33.5 13H58L74 29V74C74 77 71.5 79 68.5 79H33.5C30.5 79 28 77 28 74V18Z"
        fill="#FFFFFF"
        stroke="#DBEAFE"
        strokeWidth="1.2"
      />
      {/* Dog-ear corner fold */}
      <path
        d="M58 13V26C58 27.5 59.5 29 61 29H74"
        fill="#EFF6FF"
        stroke="#BFDBFE"
        strokeWidth="1.2"
        strokeLinejoin="round"
      />
    </g>

    {/* Document Content */}
    {/* CER Title */}
    <text
      x="49"
      y="37"
      textAnchor="middle"
      fill="#1E293B"
      fontSize="10"
      fontWeight="800"
      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
      letterSpacing="0.8"
    >
      CER
    </text>

    {/* Thin divider line */}
    <line x1="35" y1="42" x2="65" y2="42" stroke="#F1F5F9" strokeWidth="1" />

    {/* Text skeleton lines */}
    <rect x="35" y="47" width="28" height="2.8" rx="1.4" fill="#E2E8F0" />
    <rect x="35" y="53" width="22" height="2.8" rx="1.4" fill="#CBD5E1" />
    <rect x="35" y="59" width="26" height="2.8" rx="1.4" fill="#E2E8F0" />
    <rect x="35" y="65" width="16" height="2.8" rx="1.4" fill="#CBD5E1" />

    {/* Floating Plus Button at Bottom Right (fully inside canvas) */}
    <g filter="url(#btnShadow)">
      <circle cx="68" cy="71" r="11.5" fill="#2563EB" stroke="#FFFFFF" strokeWidth="2.5" />
      {/* Plus icon inside circle */}
      <line x1="68" y1="65.5" x2="68" y2="76.5" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
      <line x1="62.5" y1="71" x2="73.5" y2="71" stroke="#FFFFFF" strokeWidth="2.4" strokeLinecap="round" />
    </g>
  </svg>
);

// Card 2: My CER Request Illustration
export const MyRequestsIllustration: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
    aria-label="My CER Requests Illustration"
  >
    <defs>
      <filter id="monitorShadow" x="-15%" y="-15%" width="135%" height="135%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.10" />
      </filter>
      <filter id="lensShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#0284C7" floodOpacity="0.25" />
      </filter>
    </defs>

    {/* Background soft mint waves */}
    <path
      d="M18 55C12 35 32 20 52 18C72 16 88 30 86 52C84 72 70 85 50 84C30 83 22 70 18 55Z"
      fill="#A7F3D0"
      fillOpacity="0.45"
    />
    <path
      d="M26 65C20 48 40 32 60 30C78 28 86 42 84 62C82 76 68 85 52 83C36 81 30 76 26 65Z"
      fill="#6EE7B7"
      fillOpacity="0.35"
    />

    {/* Monitor Stand Base */}
    <rect x="36" y="73" width="20" height="3" rx="1.5" fill="#0D9488" opacity="0.8" />
    <rect x="43" y="66" width="6" height="8" fill="#14B8A6" opacity="0.9" />

    {/* Monitor Display */}
    <g filter="url(#monitorShadow)">
      <rect x="20" y="22" width="52" height="45" rx="6" fill="#FFFFFF" stroke="#0D9488" strokeWidth="1.8" />
      {/* Header bar */}
      <rect x="20" y="22" width="52" height="10" rx="6" fill="#F0FDFA" />
      <path d="M20 32H72" stroke="#CCFBF1" strokeWidth="1" />
      {/* Status dots */}
      <circle cx="26" cy="27" r="1.6" fill="#F43F5E" />
      <circle cx="31" cy="27" r="1.6" fill="#FBBF24" />
      <circle cx="36" cy="27" r="1.6" fill="#10B981" />
      <rect x="52" y="25.5" width="14" height="2.8" rx="1.4" fill="#99F6E4" />
    </g>

    {/* Dashboard rows */}
    <circle cx="27" cy="39" r="2.2" fill="#F43F5E" />
    <rect x="33" y="37.5" width="22" height="3" rx="1.5" fill="#E2E8F0" />

    <circle cx="27" cy="47" r="2.2" fill="#10B981" />
    <rect x="33" y="45.5" width="26" height="3" rx="1.5" fill="#CBD5E1" />

    <circle cx="27" cy="55" r="2.2" fill="#F59E0B" />
    <rect x="33" y="53.5" width="18" height="3" rx="1.5" fill="#E2E8F0" />

    {/* Magnifying Glass Overlay at Bottom Right */}
    <g filter="url(#lensShadow)">
      {/* Glass Lens */}
      <circle cx="68" cy="62" r="12" fill="#E0F2FE" fillOpacity="0.85" stroke="#0284C7" strokeWidth="2.8" />
      {/* Reflection highlight */}
      <path d="M62.5 58C64 55 67 53.5 70 54" stroke="#FFFFFF" strokeWidth="1.6" strokeLinecap="round" />
      {/* Handle */}
      <rect x="76" y="70" width="4.5" height="13" rx="2.2" transform="rotate(-45 76 70)" fill="#0369A1" stroke="#0C4A6E" strokeWidth="1" />
    </g>
  </svg>
);

// Card 3: My CER Approvals Illustration
export const ApprovalsIllustration: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
    aria-label="My CER Approvals Illustration"
  >
    <defs>
      <filter id="approverShadow" x="-15%" y="-15%" width="135%" height="135%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.10" />
      </filter>
      <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
        <feDropShadow dx="0" dy="1.5" stdDeviation="2" floodColor="#0F172A" floodOpacity="0.22" />
      </filter>
    </defs>

    {/* Background warm amber waves */}
    <path
      d="M18 55C14 36 32 20 52 18C72 16 88 30 86 52C84 72 70 85 50 84C30 83 22 70 18 55Z"
      fill="#FDE68A"
      fillOpacity="0.45"
    />
    <path
      d="M26 65C20 48 40 32 60 30C78 28 86 42 84 62C82 76 68 85 52 83C36 81 30 76 26 65Z"
      fill="#FCD34D"
      fillOpacity="0.35"
    />

    {/* Approval Document behind person */}
    <g filter="url(#approverShadow)">
      <rect x="46" y="24" width="28" height="38" rx="4" fill="#FFFFFF" stroke="#E2E8F0" strokeWidth="1.2" />
      <rect x="51" y="30" width="12" height="2.5" rx="1.2" fill="#3B82F6" />
      <rect x="51" y="36" width="18" height="2" rx="1" fill="#CBD5E1" />
      <rect x="51" y="41" width="15" height="2" rx="1" fill="#E2E8F0" />
      <rect x="51" y="46" width="16" height="2" rx="1" fill="#CBD5E1" />
      <rect x="51" y="53" width="10" height="2.5" rx="1.2" fill="#10B981" />
    </g>

    {/* Approver Person (Navy Suit & Tie) */}
    <g filter="url(#approverShadow)">
      {/* Head */}
      <circle cx="33" cy="34" r="9.5" fill="#FBBF24" />
      {/* Hair */}
      <path d="M23.5 33C23.5 28 27.5 24.5 33 24.5C38.5 24.5 42.5 28 42.5 33C40.5 30 36.5 30 33 30C29.5 30 25.5 31 23.5 33Z" fill="#1E293B" />
      {/* Neck */}
      <rect x="30.5" y="42" width="5" height="4" fill="#F59E0B" />
      {/* Suit Shoulders */}
      <path
        d="M17 68C17 52 23 46 33 46C43 46 49 52 49 68H17Z"
        fill="#0A2540"
      />
      {/* White Shirt Collar */}
      <polygon points="28,46 38,46 33,54" fill="#FFFFFF" />
      {/* Amber Tie */}
      <polygon points="31.5,49 34.5,49 34,63 33,66 32,63" fill="#F59E0B" />
    </g>

    {/* Green Checkmark Badge */}
    <g filter="url(#badgeShadow)">
      <circle cx="74" cy="28" r="8.5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
      <path d="M70.5 28L73 30.5L77.5 25.5" stroke="#FFFFFF" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </g>

    {/* Red Cross Badge */}
    <g filter="url(#badgeShadow)">
      <circle cx="78" cy="46" r="7.5" fill="#EF4444" stroke="#FFFFFF" strokeWidth="1.8" />
      <path d="M75 43L81 49M81 43L75 49" stroke="#FFFFFF" strokeWidth="1.8" strokeLinecap="round" />
    </g>
  </svg>
);

// Card 4: Report and Dashboard Illustration
export const ReportsIllustration: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
    aria-label="Reports and Dashboard Illustration"
  >
    <defs>
      <filter id="reportShadow" x="-15%" y="-15%" width="135%" height="135%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.10" />
      </filter>
    </defs>

    {/* Background soft lavender waves */}
    <path
      d="M18 55C12 35 32 20 52 18C72 16 88 30 86 52C84 72 70 85 50 84C30 83 22 70 18 55Z"
      fill="#DDD6FE"
      fillOpacity="0.45"
    />
    <path
      d="M26 65C20 48 40 32 60 30C78 28 86 42 84 62C82 76 68 85 52 83C36 81 30 76 26 65Z"
      fill="#C4B5FD"
      fillOpacity="0.35"
    />

    {/* Dashboard Card */}
    <g filter="url(#reportShadow)">
      <rect x="18" y="24" width="64" height="52" rx="7" fill="#FFFFFF" stroke="#C4B5FD" strokeWidth="1.4" />
      {/* Top bar with dots */}
      <rect x="18" y="24" width="64" height="11" rx="7" fill="#FAF5FF" />
      <path d="M18 35H82" stroke="#F3E8FF" strokeWidth="1" />
      <circle cx="25" cy="29.5" r="1.8" fill="#A855F7" />
      <circle cx="30" cy="29.5" r="1.8" fill="#C084FC" />
      <circle cx="35" cy="29.5" r="1.8" fill="#DDD6FE" />
    </g>

    {/* Bar Chart (4 vertical bars) */}
    <rect x="25" y="58" width="5.5" height="11" rx="1.5" fill="#DDD6FE" />
    <rect x="33" y="51" width="5.5" height="18" rx="1.5" fill="#C084FC" />
    <rect x="41" y="42" width="5.5" height="27" rx="1.5" fill="#8B5CF6" />
    <rect x="49" y="47" width="5.5" height="22" rx="1.5" fill="#A855F7" />

    {/* Donut/Pie Chart on Right */}
    <g transform="translate(67, 54)">
      {/* Segment 1: Violet */}
      <path d="M0 -12 A 12 12 0 0 1 12 0 L 7 0 A 7 7 0 0 0 0 -7 Z" fill="#7C3AED" />
      {/* Segment 2: Amber */}
      <path d="M12 0 A 12 12 0 0 1 0 12 L 0 7 A 7 7 0 0 0 7 0 Z" fill="#F59E0B" />
      {/* Segment 3: Blue */}
      <path d="M0 12 A 12 12 0 0 1 -12 0 L -7 0 A 7 7 0 0 0 0 7 Z" fill="#2563EB" />
      {/* Segment 4: Cyan */}
      <path d="M-12 0 A 12 12 0 0 1 0 -12 L 0 -7 A 7 7 0 0 0 -7 0 Z" fill="#06B6D4" />
    </g>
  </svg>
);

// Card 5: Admin Page Illustration
export const AdminIllustration: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
    aria-label="Admin Console Illustration"
  >
    <defs>
      <filter id="adminShadow" x="-15%" y="-15%" width="135%" height="135%">
        <feDropShadow dx="0" dy="2.5" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.10" />
      </filter>
    </defs>

    {/* Background soft rose waves */}
    <path
      d="M18 55C12 35 32 20 52 18C72 16 88 30 86 52C84 72 70 85 50 84C30 83 22 70 18 55Z"
      fill="#FECDD3"
      fillOpacity="0.45"
    />
    <path
      d="M26 65C20 48 40 32 60 30C78 28 86 42 84 62C82 76 68 85 52 83C36 81 30 76 26 65Z"
      fill="#FDA4AF"
      fillOpacity="0.35"
    />

    {/* Laptop Base */}
    <path d="M16 71H84L80 76C79.5 76.6 78.5 77 77.5 77H22.5C21.5 77 20.5 76.6 20 76L16 71Z" fill="#CBD5E1" stroke="#94A3B8" strokeWidth="1" />
    <rect x="44" y="72" width="12" height="2" rx="1" fill="#94A3B8" />

    {/* Laptop Screen */}
    <g filter="url(#adminShadow)">
      <rect x="22" y="24" width="56" height="47" rx="5" fill="#FFFFFF" stroke="#334155" strokeWidth="2" />
      {/* Top browser bar */}
      <rect x="22" y="24" width="56" height="9" rx="5" fill="#F8FAFC" />
      <path d="M22 33H78" stroke="#E2E8F0" strokeWidth="1" />
      <circle cx="27" cy="28.5" r="1.5" fill="#94A3B8" />
      <circle cx="31" cy="28.5" r="1.5" fill="#CBD5E1" />
      <rect x="58" y="27" width="14" height="3" rx="1.5" fill="#E2E8F0" />
    </g>

    {/* Cog Gear Icon on Left */}
    <g transform="translate(35, 48)">
      <circle cx="0" cy="0" r="8" fill="#3B82F6" />
      <circle cx="0" cy="0" r="3.5" fill="#FFFFFF" />
      {/* Gear teeth */}
      <rect x="-1.5" y="-10.5" width="3" height="3" rx="0.8" fill="#3B82F6" />
      <rect x="-1.5" y="7.5" width="3" height="3" rx="0.8" fill="#3B82F6" />
      <rect x="-10.5" y="-1.5" width="3" height="3" rx="0.8" fill="#3B82F6" />
      <rect x="7.5" y="-1.5" width="3" height="3" rx="0.8" fill="#3B82F6" />
      <rect x="-7.5" y="-7.5" width="3" height="3" rx="0.8" transform="rotate(45 -6 -6)" fill="#3B82F6" />
      <rect x="5" y="5" width="3" height="3" rx="0.8" transform="rotate(45 6.5 6.5)" fill="#3B82F6" />
      <rect x="-7.5" y="5" width="3" height="3" rx="0.8" transform="rotate(-45 -6 6.5)" fill="#3B82F6" />
      <rect x="5" y="-7.5" width="3" height="3" rx="0.8" transform="rotate(-45 6.5 -6)" fill="#3B82F6" />
    </g>

    {/* User Management Rows on Right */}
    <circle cx="53" cy="41" r="2" fill="#3B82F6" />
    <rect x="58" y="39.5" width="14" height="3" rx="1.5" fill="#E2E8F0" />

    <circle cx="53" cy="49" r="2" fill="#F43F5E" />
    <rect x="58" y="47.5" width="11" height="3" rx="1.5" fill="#CBD5E1" />

    <circle cx="53" cy="57" r="2" fill="#10B981" />
    <rect x="58" y="55.5" width="13" height="3" rx="1.5" fill="#E2E8F0" />

    {/* Bottom switches */}
    <rect x="30" y="63" width="10" height="3" rx="1.5" fill="#93C5FD" />
    <rect x="44" y="63" width="10" height="3" rx="1.5" fill="#E2E8F0" />
  </svg>
);

// Card 6: User Manual Illustration
export const UserManualIllustration: React.FC<{ className?: string }> = ({ className = "" }) => (
  <svg
    viewBox="0 0 100 100"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={`shrink-0 select-none ${className}`}
    aria-label="User Manual Illustration"
  >
    <defs>
      <linearGradient id="bookCoverGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#0284C7" />
        <stop offset="100%" stopColor="#0369A1" />
      </linearGradient>
      <filter id="bookShadow" x="-15%" y="-15%" width="135%" height="135%">
        <feDropShadow dx="2" dy="3.5" stdDeviation="3" floodColor="#0F172A" floodOpacity="0.14" />
      </filter>
    </defs>

    {/* Background soft cyan waves */}
    <path
      d="M18 55C12 35 32 20 52 18C72 16 88 30 86 52C84 72 70 85 50 84C30 83 22 70 18 55Z"
      fill="#BAE6FD"
      fillOpacity="0.45"
    />
    <path
      d="M26 65C20 48 40 32 60 30C78 28 86 42 84 62C82 76 68 85 52 83C36 81 30 76 26 65Z"
      fill="#7DD3FC"
      fillOpacity="0.35"
    />

    {/* Book Pages Edge (white/gray paper stack) */}
    <path d="M68 22H72C73 22 74 22.9 74 24V74C74 75.1 73 76 72 76H68V22Z" fill="#F8FAFC" stroke="#CBD5E1" strokeWidth="1" />
    <line x1="71" y1="24" x2="71" y2="74" stroke="#E2E8F0" strokeWidth="1" />

    {/* 3D Book Cover */}
    <g filter="url(#bookShadow)">
      {/* Main Cover */}
      <rect x="25" y="18" width="44" height="60" rx="4" fill="url(#bookCoverGrad)" stroke="#0284C7" strokeWidth="1.2" />
      {/* Spine strip on left */}
      <path d="M25 22C25 19.8 26.8 18 29 18H31V78H29C26.8 78 25 76.2 25 74V22Z" fill="#075985" />
    </g>

    {/* Book Title */}
    <text
      x="49"
      y="31"
      textAnchor="middle"
      fill="#E0F2FE"
      fontSize="6.5"
      fontWeight="800"
      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
      letterSpacing="0.8"
    >
      USER
    </text>
    <text
      x="49"
      y="39"
      textAnchor="middle"
      fill="#FFFFFF"
      fontSize="7.5"
      fontWeight="900"
      fontFamily="system-ui, -apple-system, BlinkMacSystemFont, sans-serif"
      letterSpacing="0.8"
    >
      MANUAL
    </text>

    {/* Document Icon on Cover */}
    <rect x="39" y="44" width="20" height="20" rx="3" fill="#FFFFFF" opacity="0.95" />
    <rect x="43" y="48" width="8" height="2" rx="1" fill="#0284C7" />
    <rect x="43" y="52" width="12" height="1.5" rx="0.75" fill="#94A3B8" />
    <rect x="43" y="55" width="10" height="1.5" rx="0.75" fill="#CBD5E1" />
    <rect x="43" y="58" width="11" height="1.5" rx="0.75" fill="#94A3B8" />

    {/* Golden/Orange Bookmark Ribbon hanging from bottom (inside canvas) */}
    <path
      d="M44 76V85L47.5 82.5L51 85V76H44Z"
      fill="#F59E0B"
      stroke="#D97706"
      strokeWidth="0.8"
    />
  </svg>
);
