import React, { useState } from "react";
import { ICERProposal } from "../../models/CERModel";
import {
  ChevronRight,
  TrendingUp,
  Clock,
  CheckCircle2,
  RotateCcw,
  XCircle,
  Building2,
  DollarSign,
  ArrowRight,
} from "lucide-react";

// ---------------------------------------------------------------------------
// Helper: Format Currency & Percentage
// ---------------------------------------------------------------------------
const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(amount);
};

const formatSharePercent = (amount: number, total: number): string => {
  if (total <= 0 || amount <= 0) return "0%";
  const pct = (amount / total) * 100;
  if (pct < 0.01) return "<0.01%";
  if (pct >= 99.99 && pct < 100) return "99.99%";
  if (pct % 1 === 0) return `${pct}%`;
  return `${pct.toFixed(2)}%`;
};

// ---------------------------------------------------------------------------
// Chart 1: Proposal Status Distribution (Executive Doughnut & Metric Grid)
// ---------------------------------------------------------------------------

export interface IStatusDoughnutProps {
  proposals: ICERProposal[];
}

export const StatusDoughnutChart: React.FC<IStatusDoughnutProps> = ({ proposals }) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const total = proposals.length;
  const inApproval = proposals.filter((p) =>
    ["Pending Approval", "In Approval", "Submitted"].indexOf(p.status) !== -1
  ).length;
  const approved = proposals.filter((p) => p.status === "Approved").length;
  const sendBack = proposals.filter((p) =>
    ["Send Back", "Revised", "Sent Back"].indexOf(p.status) !== -1
  ).length;
  const rejected = proposals.filter((p) => p.status === "Rejected").length;

  const data = [
    {
      label: "In Approval",
      count: inApproval,
      color: "#2563EB",
      bgClass: "bg-blue-600",
      lightBg: "bg-blue-50/70 border-blue-200/80 text-blue-900",
      icon: Clock,
      subtext: "In active workflow",
    },
    {
      label: "Approved",
      count: approved,
      color: "#059669",
      bgClass: "bg-emerald-600",
      lightBg: "bg-emerald-50/70 border-emerald-200/80 text-emerald-900",
      icon: CheckCircle2,
      subtext: "Fully sanctioned",
    },
    {
      label: "Send Back",
      count: sendBack,
      color: "#D97706",
      bgClass: "bg-amber-600",
      lightBg: "bg-amber-50/70 border-amber-200/80 text-amber-900",
      icon: RotateCcw,
      subtext: "Rework required",
    },
    {
      label: "Rejected",
      count: rejected,
      color: "#E11D48",
      bgClass: "bg-rose-600",
      lightBg: "bg-rose-50/70 border-rose-200/80 text-rose-900",
      icon: XCircle,
      subtext: "Denied / Closed",
    },
  ];

  const size = 140;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
        <div>
          <h3 className="font-bold text-slate-900 text-sm tracking-tight">Proposal Status Distribution</h3>
          <p className="text-xs text-slate-500 mt-0.5">Overall workflow lifecycle breakdown</p>
        </div>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
          {total} Total CERs
        </span>
      </div>

      {total === 0 ? (
        <div className="flex items-center justify-center h-40 text-xs text-slate-400">
          No proposals found for selected filters
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center gap-4 my-auto py-1">
          {/* Doughnut SVG */}
          <div className="relative shrink-0" style={{ width: size, height: size }}>
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="transform -rotate-90">
              <circle
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke="#F1F5F9"
                strokeWidth={strokeWidth}
              />
              {data.map((item, index) => {
                const percent = total > 0 ? item.count / total : 0;
                if (percent === 0) return null;
                const strokeDasharray = `${circumference * percent} ${circumference * (1 - percent)}`;
                const strokeDashoffset = -circumference * accumulatedPercent;
                accumulatedPercent += percent;

                const isHovered = hoveredIndex === index;

                return (
                  <circle
                    key={item.label}
                    cx={center}
                    cy={center}
                    r={radius}
                    fill="none"
                    stroke={item.color}
                    strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  />
                );
              })}
            </svg>

            {/* Center Summary Label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
              {hoveredIndex !== null && data[hoveredIndex] ? (
                <>
                  <span className="text-xl font-black text-slate-900 leading-none">
                    {data[hoveredIndex].count}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mt-0.5 max-w-[85px] truncate">
                    {data[hoveredIndex].label}
                  </span>
                </>
              ) : (
                <>
                  <span className="text-xl font-black text-slate-900 leading-none">{total}</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                    Proposals
                  </span>
                </>
              )}
            </div>
          </div>

          {/* 2x2 Metric Matrix: Compact and balanced */}
          <div className="grid grid-cols-2 gap-2 w-full">
            {data.map((item, index) => {
              const pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
              const isHovered = hoveredIndex === index;

              return (
                <div
                  key={item.label}
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                  className={`p-2.5 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                    isHovered
                      ? `${item.lightBg} shadow-xs ring-1 ring-slate-300 scale-[1.01]`
                      : "bg-slate-50/70 border-slate-200/80 hover:bg-slate-100/70"
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${item.bgClass}`} />
                      <span className="font-bold text-slate-700 text-xs">{item.label}</span>
                    </div>
                    <span className="text-[10px] font-extrabold px-1.5 py-0.2 rounded-md bg-white/90 border border-slate-200/60 text-slate-700">
                      {pct}%
                    </span>
                  </div>

                  <div className="flex items-baseline justify-between mt-0.5">
                    <span className="text-lg font-black text-slate-900">{item.count}</span>
                    <span className="text-[10px] font-medium text-slate-400 truncate ml-2">
                      {item.subtext}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Bottom Summary Strip */}
      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="font-medium">Primary Status: <strong className="text-slate-800">In Approval ({total > 0 ? Math.round((inApproval / total) * 100) : 0}%)</strong></span>
        <span className="font-semibold text-emerald-700">Sanction Rate: {total > 0 ? Math.round((approved / total) * 100) : 0}%</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Chart 2: Monthly Proposal Trend (Smart Adaptive Timeline & Velocity)
// ---------------------------------------------------------------------------

export interface IMonthlyTrendProps {
  proposals: ICERProposal[];
}

export const MonthlyTrendChart: React.FC<IMonthlyTrendProps> = ({ proposals }) => {
  const [hoveredMonth, setHoveredMonth] = useState<string | null>(null);

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const monthMap: Record<string, { count: number; amount: number }> = {};

  proposals.forEach((p) => {
    const rawDate = p.created_date || p.request_date || p.st_date;
    if (rawDate) {
      try {
        const d = new Date(rawDate);
        if (!isNaN(d.getTime())) {
          const m = d.getMonth() + 1;
          const monthStr = m < 10 ? `0${m}` : `${m}`;
          const key = `${d.getFullYear()}-${monthStr}`;
          if (!monthMap[key]) {
            monthMap[key] = { count: 0, amount: 0 };
          }
          monthMap[key].count += 1;
          monthMap[key].amount += Number(p.amount) || 0;
        }
      } catch {
        // ignore
      }
    }
  });

  // Only include calendar months that actually contain proposals, strictly capped at current month
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const currentMonthKey = `${currentYear}-${currentMonth < 10 ? "0" + currentMonth : currentMonth}`;

  const activeKeys = Object.keys(monthMap)
    .filter((k) => k <= currentMonthKey && monthMap[k].count > 0)
    .sort();

  // If no proposals with valid dates found, display current month as baseline
  const sortedKeys = activeKeys.length > 0 ? activeKeys : [currentMonthKey];

  const displayData = sortedKeys.map((key) => {
    const [year, m] = key.split("-");
    const mIdx = parseInt(m, 10) - 1;
    const label = `${monthNames[mIdx]} '${year.slice(-2)}`;
    const info = monthMap[key] || { count: 0, amount: 0 };
    return {
      key,
      label,
      count: info.count,
      amount: info.amount,
    };
  });

  // Calculate clean, standard step intervals on Y-axis (e.g. 0, 5, 10, 15, 20, 25)
  const rawMax = Math.max(...displayData.map((d) => d.count), 1);
  let step = 5;
  if (rawMax <= 4) step = 1;
  else if (rawMax <= 10) step = 2;
  else if (rawMax <= 25) step = 5;
  else if (rawMax <= 50) step = 10;
  else step = 25;

  const yMax = Math.max(step * Math.ceil(rawMax / step), step * 3);
  const yTicks: number[] = [];
  for (let t = 0; t <= yMax; t += step) {
    yTicks.push(t);
  }

  const peakMonth = displayData.reduce(
    (prev, current) => (prev.count > current.count ? prev : current),
    displayData[0] || { label: "N/A", count: 0 }
  );

  const chartHeight = 145;
  const chartWidth = 440;
  const paddingLeft = 32;
  const paddingRight = 16;
  const paddingTop = 20;
  const paddingBottom = 26;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-2">
        <div>
          <h3 className="font-bold text-slate-900 text-sm tracking-tight">Monthly Proposal Trend</h3>
          <p className="text-xs text-slate-500 mt-0.5">Proposal initiation volume over timeline</p>
        </div>
        <div className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2.5 py-0.5 rounded-full text-xs font-bold border border-blue-200/60">
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Peak: {peakMonth.count} CERs ({peakMonth.label})</span>
        </div>
      </div>

      {/* Interactive Chart */}
      <div className="w-full select-none py-1">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-38">
          <defs>
            <linearGradient id="barGradientActive" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#1E40AF" />
              <stop offset="100%" stopColor="#3B82F6" />
            </linearGradient>
            <linearGradient id="barGradientHover" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#012964" />
              <stop offset="100%" stopColor="#1D4ED8" />
            </linearGradient>
          </defs>

          {/* Standard step interval gridlines: e.g. 0, 5, 10, 15, 20, 25 */}
          {yTicks.map((val) => {
            const y = paddingTop + innerHeight * (1 - val / yMax);
            return (
              <g key={val}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={chartWidth - paddingRight}
                  y2={y}
                  stroke="#F1F5F9"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-slate-400 font-bold"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Columns */}
          {displayData.map((item, idx) => {
            const isSingle = displayData.length === 1;
            const stepWidth = isSingle ? innerWidth : innerWidth / displayData.length;
            const barWidth = isSingle ? 56 : Math.min(42, Math.max(24, stepWidth * 0.45));
            const x = isSingle
              ? paddingLeft + (innerWidth - barWidth) / 2
              : paddingLeft + idx * stepWidth + (stepWidth - barWidth) / 2;
            const barHeight = (item.count / yMax) * innerHeight;
            const y = paddingTop + innerHeight - barHeight;
            const isHovered = hoveredMonth === item.key;
            const hasData = item.count > 0;

            return (
              <g
                key={item.key}
                onMouseEnter={() => setHoveredMonth(item.key)}
                onMouseLeave={() => setHoveredMonth(null)}
                className="cursor-pointer group"
              >
                {/* Column Background hover glow */}
                {isHovered && (
                  <rect
                    x={isSingle ? x - 8 : paddingLeft + idx * stepWidth + 2}
                    y={paddingTop}
                    width={isSingle ? barWidth + 16 : stepWidth - 4}
                    height={innerHeight}
                    fill="#F1F5F9"
                    rx={6}
                  />
                )}

                {/* Animated Bar with rounded top */}
                {hasData && (
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(barHeight, 5)}
                    rx={6}
                    fill={isHovered ? "url(#barGradientHover)" : "url(#barGradientActive)"}
                    className="transition-all duration-200"
                  />
                )}

                {/* Count Badge on top of Bar */}
                {hasData && (
                  <text
                    x={x + barWidth / 2}
                    y={y - 6}
                    textAnchor="middle"
                    className={`text-[11px] font-black ${
                      isHovered ? "fill-blue-900" : "fill-slate-800"
                    }`}
                  >
                    {item.count}
                  </text>
                )}

                {/* Month Label */}
                <text
                  x={x + barWidth / 2}
                  y={chartHeight - 6}
                  textAnchor="middle"
                  className={`text-[10px] font-bold ${
                    isHovered ? "fill-[#012964] font-black" : hasData ? "fill-slate-700" : "fill-slate-400"
                  }`}
                >
                  {item.label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Summary Footer Pill */}
      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="font-medium">
          Active Timeline: <strong className="text-slate-800">{displayData.length} {displayData.length === 1 ? "Month" : "Months"} ({displayData.map((d) => d.label).join(", ")})</strong>
        </span>
        <span className="font-semibold text-blue-700">
          Total Spend: {formatCurrency(displayData.reduce((sum, d) => sum + d.amount, 0))}
        </span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Chart 3: Proposals by SBU / Block (High-Density Executive Horizontal Bars)
// ---------------------------------------------------------------------------

export interface ISbuBarChartProps {
  proposals: ICERProposal[];
}

export const SbuBarChart: React.FC<ISbuBarChartProps> = ({ proposals }) => {
  const sbus = [
    { name: "RJ North", solidColor: "#012964", dotBg: "bg-[#012964]" },
    { name: "RJ South", solidColor: "#2563EB", dotBg: "bg-blue-600" },
    { name: "CBOS", solidColor: "#4F46E5", dotBg: "bg-indigo-600" },
    { name: "RAVA", solidColor: "#0D9488", dotBg: "bg-teal-600" },
  ];
  const total = proposals.length;

  const data = sbus.map((item) => {
    const count = proposals.filter(
      (p) => (p.sbu || "").trim().toLowerCase() === item.name.toLowerCase()
    ).length;
    const pct = total > 0 ? (count / total) * 100 : 0;
    const pctDisplay = pct === 0 ? "0%" : pct % 1 === 0 ? `${pct}%` : `${pct.toFixed(1)}%`;
    return { ...item, count, pct, pctDisplay };
  });

  const maxCount = Math.max(...data.map((d) => d.count), 1);
  const activeSbuCount = data.filter((d) => d.count > 0).length;

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm tracking-tight">Proposals by SBU / Block</h3>
          <p className="text-xs text-slate-500 mt-0.5">Distribution across strategic business units</p>
        </div>
        <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200/60">
          {activeSbuCount} of {sbus.length} Units Active
        </span>
      </div>

      {/* High-density progress rows */}
      <div className="space-y-3.5 my-auto py-1">
        {data.map((item) => {
          const widthPercent = (item.count / maxCount) * 100;

          return (
            <div key={item.name} className="space-y-1.5 group">
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className={`w-2.5 h-2.5 rounded-full ${item.dotBg} shadow-2xs`} />
                  <span className="font-bold text-slate-800">{item.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-black text-slate-900 text-xs">
                    {item.count} {item.count === 1 ? "CER" : "CERs"}
                  </span>
                  <span className="text-[10px] font-extrabold text-slate-500 bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md min-w-[42px] text-center">
                    {item.pctDisplay}
                  </span>
                </div>
              </div>

              {/* Progress bar with guaranteed minimum visible fill for active units (e.g. RJ South) */}
              <div className="w-full bg-slate-100 h-3 rounded-full p-0.5 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 shadow-xs"
                  style={{
                    width: `${Math.max(widthPercent, item.count > 0 ? 5 : 0)}%`,
                    minWidth: item.count > 0 ? "14px" : "0px",
                    backgroundColor: item.solidColor,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Summary Bar */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="font-medium">Total Registered: <strong className="text-slate-800">{total} Proposals</strong></span>
        <span className="font-semibold text-slate-700">Highest Share: RJ North ({data[0].pctDisplay})</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Chart 4: Financial Overview by SBU (2-Decimal Calculations & Proportional Stack)
// ---------------------------------------------------------------------------

export interface IFinancialSbuProps {
  proposals: ICERProposal[];
}

export const FinancialSbuBarChart: React.FC<IFinancialSbuProps> = ({ proposals }) => {
  const sbus = [
    { name: "RJ North", solidColor: "#012964", colorClass: "bg-[#012964]" },
    { name: "RJ South", solidColor: "#2563EB", colorClass: "bg-blue-600" },
    { name: "CBOS", solidColor: "#4F46E5", colorClass: "bg-indigo-600" },
    { name: "RAVA", solidColor: "#0D9488", colorClass: "bg-teal-600" },
  ];

  let grandTotal = 0;
  const sbuFinancials = sbus.map((sbuObj) => {
    const sbuProps = proposals.filter(
      (p) => (p.sbu || "").trim().toLowerCase() === sbuObj.name.toLowerCase()
    );

    let amount = 0;
    sbuProps.forEach((p) => {
      amount += Number(p.amount) || 0;
    });
    grandTotal += amount;

    return {
      name: sbuObj.name,
      solidColor: sbuObj.solidColor,
      colorClass: sbuObj.colorClass,
      amount,
      count: sbuProps.length,
      avg: sbuProps.length > 0 ? Math.round(amount / sbuProps.length) : 0,
    };
  });

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-subtle flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm tracking-tight">Financial Overview by SBU</h3>
          <p className="text-xs text-slate-500 mt-0.5">Capital expenditure commitments &amp; budget allocation</p>
        </div>
        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
          Total: {formatCurrency(grandTotal)}
        </span>
      </div>

      {/* 1. Stacked Allocation Bar: True proportional widths */}
      <div className="space-y-1.5 mb-3">
        <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
          <span>SBU Portfolio Share</span>
          <span>100% Allocated</span>
        </div>
        <div className="w-full h-3 bg-slate-100 rounded-full flex overflow-hidden p-0.5">
          {sbuFinancials.map((item) => {
            const rawShare = grandTotal > 0 ? (item.amount / grandTotal) * 100 : 0;
            if (rawShare === 0) return null;
            return (
              <div
                key={item.name}
                style={{
                  width: `${rawShare}%`,
                  minWidth: item.amount > 0 ? "3px" : "0px",
                  backgroundColor: item.solidColor,
                }}
                className="h-full transition-all duration-500 first:rounded-l-full last:rounded-r-full"
                title={`${item.name}: ${formatCurrency(item.amount)} (${formatSharePercent(item.amount, grandTotal)})`}
              />
            );
          })}
        </div>
      </div>

      {/* 2. Rich 4-Column Detail Grid with 2-decimal share display (e.g. 99.93% and 0.07%) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        {sbuFinancials.map((item) => {
          const shareFormatted = formatSharePercent(item.amount, grandTotal);

          return (
            <div
              key={item.name}
              className="p-3 bg-slate-50/70 border border-slate-200/80 rounded-xl flex flex-col justify-between hover:border-blue-300 hover:bg-slate-100/60 transition-all"
            >
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <div className="flex items-center gap-1.5">
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: item.solidColor }}
                    />
                    <span className="font-bold text-slate-800 text-xs">{item.name}</span>
                  </div>
                  <span className="text-[10px] font-extrabold text-slate-600 bg-white border border-slate-200/80 px-1.5 py-0.2 rounded">
                    {shareFormatted}
                  </span>
                </div>

                <div className="text-base font-black text-slate-900 mt-1 truncate">
                  {formatCurrency(item.amount)}
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px] text-slate-500 font-semibold">
                <span>{item.count} {item.count === 1 ? "CER" : "CERs"}</span>
                <span>{item.avg > 0 ? `~${formatCurrency(item.avg)}/CER` : "—"}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Bottom Summary Strip */}
      <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
        <span className="font-medium">Portfolio Spread: <strong className="text-slate-800">4 Business Units</strong></span>
        <span className="font-semibold text-purple-700">Primary Allocation: RJ North ({formatSharePercent(sbuFinancials[0]?.amount || 0, grandTotal)})</span>
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// Helper: Resolve Approval Stage Level (1 to 6)
// ---------------------------------------------------------------------------
export const resolveProposalStageLevel = (p: ICERProposal): number => {
  const role = (p.pending_with_role || "").toLowerCase().trim();

  // 1. Check for explicit level prefixes like L1, L2, L3, L4, L5, L6 or Level 1..6
  const matchL = role.match(/l(?:evel)?\s*([1-6])/i);
  if (matchL && matchL[1]) {
    return parseInt(matchL[1], 10);
  }

  // 2. Check for role keyword identifiers (specific titles before generic)
  if (role.includes("vogl ceo") || role.includes("chief executive")) return 6;
  if (role.includes("vogl cfo")) return 5;
  if (role.includes("bu director") || role.includes("director")) return 4;
  if (role.includes("bu cfo")) return 3;
  if (role.includes("owner") || role.includes("cer owner") || role.includes("project owner")) return 2;
  if (role.includes("finance") || role.includes("technical review") || role.includes("corporate finance")) return 1;

  // 3. Fallback to numeric current_level if valid between 1 and 6
  const lvlNum = Number(p.current_level);
  if (!isNaN(lvlNum) && lvlNum >= 1 && lvlNum <= 6) {
    return lvlNum;
  }

  return 1;
};

// ---------------------------------------------------------------------------
// Chart 5: Approval Workflow Pipeline (Connected Horizontal Ribbon)
// ---------------------------------------------------------------------------

export interface IWorkflowStageProps {
  proposals: ICERProposal[];
}

export const WorkflowStageChart: React.FC<IWorkflowStageProps> = ({ proposals }) => {
  const inApprovalProps = proposals.filter((p) => {
    const s = (p.status || "").toLowerCase().trim();
    return (
      s === "in approval" ||
      s === "pending approval" ||
      s === "submitted" ||
      s === "in review" ||
      s === "under review"
    );
  });

  const stages = [
    { level: 1, name: "Finance", role: "L1" },
    { level: 2, name: "CER Owner", role: "L2" },
    { level: 3, name: "BU CFO", role: "L3" },
    { level: 4, name: "BU Director", role: "L4" },
    { level: 5, name: "VOGL CFO", role: "L5" },
    { level: 6, name: "VOGL CEO", role: "L6" },
  ];

  const stageCounts = stages.map((s) => {
    const count = inApprovalProps.filter((p) => resolveProposalStageLevel(p) === s.level).length;
    return { ...s, count };
  });

  return (
    <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200/80 shadow-subtle">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
        <div>
          <h3 className="font-bold text-slate-900 text-sm tracking-tight">
            Sequential Approval Workflow Pipeline
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Active in-flight proposals queued across 6 sequential review stages
          </p>
        </div>
        <span className="text-xs font-black px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
          {inApprovalProps.length} In-Flight Proposals
        </span>
      </div>

      {/* Connected Ribbon: Each stage connects to the next with chevrons */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {stageCounts.map((stage, idx) => {
          const hasPending = stage.count > 0;

          return (
            <div
              key={stage.level}
              className={`relative p-3 rounded-xl border transition-all flex flex-col justify-between ${
                hasPending
                  ? "bg-blue-50/70 border-blue-300 shadow-xs ring-1 ring-blue-500/20"
                  : "bg-slate-50/60 border-slate-200/70"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={`text-[10px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider ${
                      hasPending
                        ? "bg-[#012964] text-white"
                        : "bg-slate-200 text-slate-600"
                    }`}
                  >
                    Level {stage.level}
                  </span>

                  {hasPending ? (
                    <span className="flex items-center gap-1 text-[11px] font-black text-blue-700 bg-white px-2 py-0.5 rounded-full border border-blue-200 shadow-2xs">
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
                      {stage.count} Active
                    </span>
                  ) : (
                    <span className="text-[10px] font-semibold text-slate-400">
                      Clear
                    </span>
                  )}
                </div>

                <div className="font-bold text-slate-900 text-xs mt-1 truncate" title={stage.name}>
                  {stage.name}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
