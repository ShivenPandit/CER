import React, { useState, useEffect } from "react";

export interface IUserAvatarProps {
  name?: string;
  email?: string;
  photoUrl?: string;
  siteUrl?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  className?: string;
  avatarClassName?: string;
  title?: string;
  showBorder?: boolean;
}

/**
 * Extracts clean 2-letter initials from a user's display name,
 * intelligently stripping vendor/partner suffixes like '(STL Digital)' or '[Cairn]'.
 */
export function getUserInitials(name?: string): string {
  if (!name || !name.trim()) return "U";

  // Strip text inside parentheses or brackets, e.g., "Nadeem Sohail (STL Digital)" -> "Nadeem Sohail"
  const cleanName = name
    .replace(/\([^)]*\)/g, "")
    .replace(/\[[^\]]*\]/g, "")
    .trim();

  const parts = cleanName.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Constructs the official SharePoint Online / Microsoft 365 profile photo URL
 * using the standard /_layouts/15/userphoto.aspx endpoint.
 */
export function getUserPhotoUrl(
  email?: string,
  siteUrl?: string,
  size: "S" | "M" | "L" = "M"
): string {
  if (!email || !email.includes("@")) return "";

  // Strip claims token prefixes if present (e.g. i:0#.f|membership|user@domain.com)
  let cleanEmail = email.trim();
  if (cleanEmail.includes("|")) {
    cleanEmail = cleanEmail.split("|").pop() || cleanEmail;
  }

  const base =
    (siteUrl ? siteUrl.replace(/\/+$/, "") : "") ||
    (typeof window !== "undefined" && window.location ? window.location.origin : "");

  return `${base}/_layouts/15/userphoto.aspx?size=${size}&accountname=${encodeURIComponent(cleanEmail)}`;
}

// Tailored sizing configurations matching modern Fluent/Tailwind spacing
const SIZE_CLASSES = {
  xs: "w-6 h-6 text-[10px]",
  sm: "w-7 h-7 text-[11px]",
  md: "w-8 h-8 text-xs",
  lg: "w-10 h-10 text-sm",
  xl: "w-12 h-12 text-base font-bold",
};

/**
 * Universal User Avatar component for the CER Portal.
 * Automatically attempts to render the user's official Microsoft 365 profile photo
 * via SharePoint's userphoto.aspx endpoint, and gracefully falls back to a crisp,
 * elegant monogram avatar if the photo is missing, inaccessible, or a blank 1x1 spacer.
 */
export const UserAvatar: React.FC<IUserAvatarProps> = ({
  name = "",
  email = "",
  photoUrl,
  siteUrl,
  size = "md",
  className = "",
  avatarClassName = "",
  title,
  showBorder = true,
}) => {
  const [imgError, setImgError] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);

  // Map avatar size to SharePoint photo resolution
  const photoSizeParam: "S" | "M" | "L" =
    size === "xs" || size === "sm" ? "S" : size === "xl" ? "L" : "M";

  const resolvedPhotoUrl =
    photoUrl || getUserPhotoUrl(email, siteUrl, photoSizeParam);

  // Reset image state whenever photo source or email changes
  useEffect(() => {
    setImgError(false);
    setImgLoaded(false);
  }, [resolvedPhotoUrl, email]);

  const initials = getUserInitials(name || email);
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md;
  const tooltip = title || (name ? (email ? `${name} (${email})` : name) : email);

  const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.currentTarget;
    // SharePoint userphoto.aspx can return a 1x1 blank transparent GIF if user has no photo
    if (img.naturalWidth <= 1 && img.naturalHeight <= 1) {
      setImgError(true);
      setImgLoaded(false);
    } else {
      setImgLoaded(true);
    }
  };

  const hasPhotoCandidate = Boolean(resolvedPhotoUrl && !imgError);

  return (
    <div
      className={`relative inline-flex items-center justify-center shrink-0 rounded-full select-none overflow-hidden ${sizeClass} ${
        showBorder ? "ring-1 ring-slate-200/90 shadow-2xs" : ""
      } ${className}`}
      title={tooltip}
    >
      {/* 1. Profile Picture Image */}
      {hasPhotoCandidate && (
        <img
          src={resolvedPhotoUrl}
          alt={name || "User Avatar"}
          onLoad={handleImageLoad}
          onError={() => setImgError(true)}
          className={`w-full h-full object-cover rounded-full transition-opacity duration-200 ${
            imgLoaded ? "opacity-100" : "opacity-0 absolute inset-0"
          } ${avatarClassName}`}
          loading="lazy"
        />
      )}

      {/* 2. Fallback Initials Monogram (shown while loading or when photo unavailable) */}
      {(!hasPhotoCandidate || !imgLoaded) && (
        <div
          className={`w-full h-full flex items-center justify-center font-bold tracking-tight bg-[#0A1E38] text-white rounded-full ${avatarClassName}`}
          aria-hidden="true"
        >
          {initials}
        </div>
      )}
    </div>
  );
};

export default UserAvatar;
