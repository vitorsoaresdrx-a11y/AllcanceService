/**
 * Returns the image URL as-is (Supabase Image Transformations require a paid plan).
 * Kept as a passthrough so call-sites don't need to change.
 */
export function getOptimizedImageUrl(
  url: string | null | undefined,
  _width = 400,
  _quality = 80
): string | null {
  if (!url) return null;
  return url;
}
