/**
 * Convert a string to Title Case (first letter uppercase, rest lowercase)
 * Handles: "RAFAEL BORDIGNON" → "Rafael Bordignon"
 *          "john doe" → "John Doe"
 *          "LEAD5 TEST5" → "Lead5 Test5"
 */
export function titleCase(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format source enum to readable text
 * "DOOR_KNOCK" → "Door Knock"
 */
export function formatSource(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Format stage enum to readable text
 * "NEW_LEAD" → "New Lead"
 */
export function formatStage(s: string | null | undefined): string {
  if (!s) return '';
  return s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Time ago formatter
 */
export function timeAgo(date: string | null | undefined): string {
  if (!date) return '';
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}
