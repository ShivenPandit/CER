/**
 * SharePoint SiteAssets Image Resolver Utility
 *
 * Resolves images from the SharePoint SiteAssets Document Library,
 * supporting direct root files, folder paths, and bundled fallback assets.
 */
import vedantaLogoFallback from "../assets/Vedanta.png";
import heroImageFallback from "../assets/offshore_rig_hero.jpg";

export const DEFAULT_SITE_ASSETS = {
  VEDANTA_LOGO: "Vedanta.png",
  HERO_IMAGE: "offshore_rig_hero.jpg",
} as const;

/**
 * Extracts and cleans the site base URL from props, ambient context, or window.
 */
export function resolveSiteUrl(explicitSiteUrl?: string): string {
  let base = (explicitSiteUrl || "").trim().replace(/\/+$/, "");

  if (!base && typeof window !== "undefined") {
    const spInfo = (window as any)._spPageContextInfo;
    if (spInfo) {
      if (spInfo.webAbsoluteUrl) {
        base = String(spInfo.webAbsoluteUrl).replace(/\/+$/, "");
      } else if (spInfo.webServerRelativeUrl) {
        base = String(spInfo.webServerRelativeUrl).replace(/\/+$/, "");
      }
    }
  }

  return base;
}

/**
 * Resolves the primary URL of an asset located in the SharePoint SiteAssets library.
 */
export function getSiteAssetUrl(
  fileName: string,
  siteUrl?: string,
  bundledFallback?: string
): string {
  const base = resolveSiteUrl(siteUrl);
  if (base) {
    const cleanFile = fileName.replace(/^\/+/, "");
    return `${base}/SiteAssets/${cleanFile}`;
  }
  return bundledFallback || "";
}

/**
 * Returns primary and fallback URLs for Vedanta logo.
 */
export function getVedantaLogoUrl(siteUrl?: string): string {
  return getSiteAssetUrl(DEFAULT_SITE_ASSETS.VEDANTA_LOGO, siteUrl, vedantaLogoFallback);
}

/**
 * Returns primary and fallback URLs for Hero offshore rig image.
 */
export function getHeroImageUrl(siteUrl?: string): string {
  return getSiteAssetUrl(DEFAULT_SITE_ASSETS.HERO_IMAGE, siteUrl, heroImageFallback);
}

/**
 * Creates an image error handler that automatically tries:
 * 1. `${base}/SiteAssets/${fileName}` (Direct in SiteAssets library)
 * 2. `${base}/SiteAssets/assets/${fileName}` (In an 'assets' subfolder in SiteAssets)
 * 3. `bundledFallback` (Local compiled bundle asset)
 */
export function handleAssetError(
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  fileName: string,
  siteUrl?: string,
  bundledFallback?: string
): void {
  const target = e.currentTarget;
  const base = resolveSiteUrl(siteUrl);

  if (base) {
    const directUrl = `${base}/SiteAssets/${fileName.replace(/^\/+/, "")}`;
    const subfolderUrl = `${base}/SiteAssets/assets/${fileName.replace(/^\/+/, "")}`;

    // If direct failed and current src isn't subfolder yet, try subfolder
    if (target.src.indexOf("/SiteAssets/assets/") === -1 && target.src.indexOf("/SiteAssets/") !== -1) {
      target.src = subfolderUrl;
      return;
    }
  }

  // Final fallback to bundled asset
  if (bundledFallback && target.src !== bundledFallback) {
    target.src = bundledFallback;
  }
}

export { vedantaLogoFallback, heroImageFallback };

