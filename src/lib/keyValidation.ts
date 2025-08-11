/**
 * Validates and sanitizes field keys
 * Keys must be valid identifiers: alphanumeric, underscore, hyphen only
 * No spaces or special characters allowed
 */

export function sanitizeFieldKey(input: string): string {
  // Remove all characters that aren't alphanumeric, underscore, or hyphen
  // Replace spaces with underscores
  return input
    .replace(/\s+/g, '_')  // Replace spaces with underscores
    .replace(/[^a-zA-Z0-9_-]/g, '')  // Remove invalid characters
    .replace(/^-+/, '')  // Remove leading hyphens
    .replace(/^_+/, '')  // Remove leading underscores
    .toLowerCase();  // Convert to lowercase for consistency
}

export function isValidFieldKey(key: string): boolean {
  // Must start with a letter or underscore
  // Can contain letters, numbers, underscores, and hyphens
  // Cannot be empty
  return /^[a-zA-Z_][a-zA-Z0-9_-]*$/.test(key);
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