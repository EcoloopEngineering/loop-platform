/**
 * Normalizes a person's name: trims, lowercases, then capitalizes each word.
 * "RAFAEL" → "Rafael", "  john DOE " → "John Doe", "maria josé" → "Maria José"
 */
export function normalizeName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
