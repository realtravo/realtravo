/**
 * Generates a URL-friendly slug from name and location
 */
export const generateSlug = (name: string, location?: string): string => {
  const combined = location ? `${name}-${location}` : name;
  return combined
    .toLowerCase()
    .trim()
    .replace(/[^\\w\\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .substring(0, 100); // Limit length
};

/**
 * Parses a slug to extract potential search terms
 */
export const parseSlug = (slug: string): string => {
  return slug.replace(/-/g, ' ').trim();
};

/**
 * Creates a full URL path with slug and id for fallback
 */
export const createDetailPath = (
  type: string,
  id: string,
  name: string,
  location?: string
): string => {
  const slug = generateSlug(name, location);
  return `/${type}/${slug}-${id.substring(0, 8)}`;
};

/**
 * Extracts ID from a slug-id combination or returns the ID directly
 * Prioritizes full UUID format, then falls back to slug extraction
 */
export const extractIdFromSlug = (slugWithId: string): string => {
  if (!slugWithId) return '';
  
  // Check if it's a full UUID format - return directly
  const uuidPattern = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
  const uuidMatch = slugWithId.match(uuidPattern);
  if (uuidMatch) {
    return uuidMatch[0];
  }
  
  // Return the slug as-is if it looks like a valid ID (for backward compatibility)
  return slugWithId;
};
