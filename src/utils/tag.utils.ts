/**
 * Normalizes tag names by removing company prefixes
 * Examples:
 * - "Konga Flash Sales" -> "Flash Sales"
 * - "Jumia Flash Sales" -> "Flash Sales"
 * - "Konga Daily Deals" -> "Daily Deals"
 */
export function normalizeTagName(tagName: string): string {
  if (!tagName) return '';

  // Common company names to remove (case insensitive)
  const companyNames = ['konga', 'jumia', 'aliexpress', 'temu'];

  // Remove company name prefix
  let normalized = tagName.trim();

  for (const company of companyNames) {
    const regex = new RegExp(`^${company}\\s+`, 'i');
    normalized = normalized.replace(regex, '');
  }

  // Capitalize first letter of each word
  return normalized
    .split(' ')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}
