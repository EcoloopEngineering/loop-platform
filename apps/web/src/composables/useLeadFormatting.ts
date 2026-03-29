/**
 * Shared lead formatting utilities — stage colors, source formatting, time ago.
 * Consolidates duplicated logic from HomePage, MyLeadsPage, LeadDetailPage, etc.
 */

/** Hex color map for stage badges (used in pages with inline :style bindings) */
const STAGE_HEX_COLORS: Record<string, string> = {
  // Closer
  NEW_LEAD: '#4CAF50', ALREADY_CALLED: '#8BC34A', CONNECTED: '#2196F3',
  REQUEST_DESIGN: '#03A9F4', DESIGN_IN_PROGRESS: '#FF9800', DESIGN_READY: '#9C27B0', WON: '#00897B',
  // PM
  SITE_AUDIT: '#FF5722', PROGRESS_REVIEW: '#E91E63', NTP: '#9C27B0', ENGINEERING: '#3F51B5',
  PERMIT_AND_ICE: '#2196F3', FINAL_APPROVAL: '#00BCD4', INSTALL_READY: '#009688', INSTALL: '#4CAF50',
  COMMISSION: '#8BC34A', SITE_COMPLETE: '#CDDC39', INITIAL_SUBMISSION_AND_INSPECTION: '#FFC107',
  WAITING_FOR_PTO: '#FF9800', FINAL_SUBMISSION: '#FF5722', CUSTOMER_SUCCESS: '#4CAF50',
  // Finance
  FIN_TICKETS_OPEN: '#2196F3', FIN_IN_PROGRESS: '#FF9800', FIN_POST_INITIAL_NURTURE: '#9C27B0', FIN_TICKETS_CLOSED: '#4CAF50',
  // Maintenance
  MAINT_TICKETS_OPEN: '#2196F3', MAINT_IN_PROGRESS: '#FF9800', MAINT_POST_INSTALL_NURTURE: '#9C27B0', MAINT_TICKETS_CLOSED: '#4CAF50',
};

/** Quasar color name map for stage badges (used in components with :color bindings) */
const STAGE_QUASAR_COLORS: Record<string, string> = {
  // Closer
  NEW_LEAD: 'positive', ALREADY_CALLED: 'light-green', CONNECTED: 'blue',
  REQUEST_DESIGN: 'light-blue', DESIGN_IN_PROGRESS: 'orange', DESIGN_READY: 'purple', WON: 'teal',
  // PM
  SITE_AUDIT: 'deep-orange', PROGRESS_REVIEW: 'pink', NTP: 'purple', ENGINEERING: 'indigo',
  PERMIT_AND_ICE: 'blue', FINAL_APPROVAL: 'cyan', INSTALL_READY: 'teal', INSTALL: 'positive',
  COMMISSION: 'light-green', SITE_COMPLETE: 'lime', INITIAL_SUBMISSION_AND_INSPECTION: 'amber',
  WAITING_FOR_PTO: 'orange', FINAL_SUBMISSION: 'deep-orange', CUSTOMER_SUCCESS: 'positive',
  // Finance
  FIN_TICKETS_OPEN: 'blue', FIN_IN_PROGRESS: 'orange', FIN_POST_INITIAL_NURTURE: 'purple', FIN_TICKETS_CLOSED: 'positive',
  // Maintenance
  MAINT_TICKETS_OPEN: 'blue', MAINT_IN_PROGRESS: 'orange', MAINT_POST_INSTALL_NURTURE: 'purple', MAINT_TICKETS_CLOSED: 'positive',
  // Legacy lowercase (backwards compat)
  new: 'blue', contacted: 'orange', qualified: 'purple', proposal: 'cyan', won: 'positive', lost: 'negative',
};

const TIER_COLORS: Record<string, string> = {
  A: '#10B981',
  B: '#3B82F6',
  C: '#F59E0B',
  D: '#EF4444',
};

const TIER_QCOLORS: Record<string, string> = {
  A: 'positive',
  B: 'primary',
  C: 'warning',
  D: 'negative',
};

/**
 * Convert a string to Title Case (first letter uppercase, rest lowercase)
 * Handles: "RAFAEL BORDIGNON" -> "Rafael Bordignon"
 *          "john doe" -> "John Doe"
 */
export function titleCase(str: string | null | undefined): string {
  if (!str) return '';
  return str
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function useLeadFormatting() {
  /** Hex color string for inline style bindings (e.g. `:style="{ background: stageColor(stage) }"`) */
  function stageColor(stage: string): string {
    return STAGE_HEX_COLORS[stage] ?? '#9E9E9E';
  }

  /** Quasar color name for `:color` prop bindings */
  function stageQColor(stage: string): string {
    return STAGE_QUASAR_COLORS[stage] ?? 'grey-6';
  }

  /** Format stage enum to Title Case: "NEW_LEAD" -> "New Lead" */
  function formatStage(stage: string | null | undefined): string {
    if (!stage) return '';
    return stage.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /** Format source enum to Title Case: "DOOR_KNOCK" -> "Door Knock" */
  function formatSource(source: string | null | undefined): string {
    if (!source) return '';
    return source.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
  }

  /** Hex color for tier badges */
  function tierColor(tier: string): string {
    return TIER_COLORS[tier] ?? '#9E9E9E';
  }

  /** Quasar color name for tier badges */
  function tierQColor(tier: string): string {
    return TIER_QCOLORS[tier] ?? 'grey';
  }

  /** Time ago formatter */
  function timeAgo(date: string | null | undefined): string {
    if (!date) return '';
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  }

  return {
    stageColor,
    stageQColor,
    formatStage,
    formatSource,
    tierColor,
    tierQColor,
    timeAgo,
    STAGE_HEX_COLORS,
    STAGE_QUASAR_COLORS,
  };
}
