import React from "react";

interface IWordCounterProps {
  text: string;
  minLimit?: number;
  maxLimit?: number;
}

export const WordCounter: React.FC<IWordCounterProps> = ({
  text,
  minLimit = 350,
  maxLimit = 400,
}) => {
  const words = text ? text.trim().split(/\s+/).filter(Boolean).length : 0;

  const isOverMax = words > maxLimit;
  const isNearTarget = words >= minLimit && words <= maxLimit;

  let colorClass = "text-slate-500 bg-slate-100";
  let label = "350–400 word limit";

  if (isOverMax) {
    colorClass = "text-rose-700 bg-rose-50 border border-rose-200 font-semibold";
    label = `Exceeds max limit by ${words - maxLimit} words`;
  } else if (isNearTarget) {
    colorClass = "text-emerald-700 bg-emerald-50 border border-emerald-200 font-medium";
    label = "Within optimal range (350–400 words)";
  }

  return (
    <div className="flex items-center justify-between text-xs mt-1.5">
      <span className="text-slate-500">{label}</span>
      <span className={`px-2 py-0.5 rounded-md ${colorClass} transition-colors`}>
        {words} / {maxLimit} words
      </span>
    </div>
  );
};
