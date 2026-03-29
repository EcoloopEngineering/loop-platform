export const QUEUE_EMAIL = 'email';
export const QUEUE_COMMISSION = 'commission';
export const QUEUE_DESIGN = 'design';

/**
 * Token used to check whether Redis/BullMQ is available at runtime.
 * Inject this boolean to decide between queue-based or sync execution.
 */
export const QUEUE_AVAILABLE = 'QUEUE_AVAILABLE';
