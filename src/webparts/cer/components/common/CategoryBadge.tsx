import React from "react";
import { CERCategory, CATEGORY_DEFINITIONS } from "../../models/CERModel";

interface ICategoryBadgeProps {
  category: CERCategory | string;
  showTooltip?: boolean;
}

export const CategoryBadge: React.FC<ICategoryBadgeProps> = ({ category }) => {
  const catKey = (category as CERCategory) || "Vital";
  const def = CATEGORY_DEFINITIONS[catKey] || {
    label: category,
    description: "",
    tagClass: "bg-gray-50 text-gray-700 border-gray-200"
  };

  return (
    <span
      title={def.description}
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${def.tagClass}`}
    >
      {def.label}
    </span>
  );
};
