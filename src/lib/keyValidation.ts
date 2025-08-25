/**
 * Validates and sanitizes field keys
 * Keys must be valid identifiers: alphanumeric, underscore, hyphen, and dots for nested paths
 * No spaces or special characters allowed
 */

export function sanitizeFieldKey(input: string): string {
  // Remove all characters that aren't alphanumeric, underscore, hyphen, or dot
  // Replace spaces with underscores
  // Preserve dots for nested paths (e.g., personal_data.firstName)
  return input
    .replace(/\s+/g, '_')  // Replace spaces with underscores
    .replace(/[^a-zA-Z0-9_.-]/g, '')  // Remove invalid characters but keep dots
    .replace(/^[-._]+/, '')  // Remove leading special chars
    .replace(/[-._]+$/, '');  // Remove trailing special chars
}

export function isValidFieldKey(key: string): boolean {
  // Must start with a letter or underscore
  // Can contain letters, numbers, underscores, hyphens, and dots
  // Cannot be empty
  // Dots are allowed for nested paths (e.g., personal_data.firstName)
  return /^[a-zA-Z_][a-zA-Z0-9_.-]*$/.test(key);
}

export function generateFieldKey(type: string, existingKeys: string[]): string {
  // Extract numbers from existing keys for this type
  const sameTypeKeys = existingKeys
    .filter(key => key.startsWith(`${type}_`))
    .map(key => {
      const match = key.match(new RegExp(`^${type}_(\\d+)$`));
      return match ? parseInt(match[1]) : 0;
    })
    .filter(n => n > 0);
  
  // Find the next available number
  const nextNumber = sameTypeKeys.length > 0 
    ? Math.max(...sameTypeKeys) + 1 
    : 1;
  
  return `${type}_${nextNumber}`;
}