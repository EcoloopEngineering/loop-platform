/** Ordered PM pipeline stages used for auto-advance and transition logic. */
export const PM_STAGE_ORDER = [
  'SITE_AUDIT',
  'PROGRESS_REVIEW',
  'NTP',
  'ENGINEERING',
  'PERMIT_AND_ICE',
  'FINAL_APPROVAL',
  'INSTALL_READY',
  'INSTALL',
  'COMMISSION',
  'SITE_COMPLETE',
  'INITIAL_SUBMISSION_AND_INSPECTION',
  'WAITING_FOR_PTO',
  'FINAL_SUBMISSION',
  'CUSTOMER_SUCCESS',
] as const;
