import { showToast } from '../components/Toast';
import { APIError } from '../services/api';

/**
 * Safely extracts a human-readable error message from any caught error object.
 * Message Precedence:
 * 1. APIError.message (if non-empty)
 * 2. Error.message (if non-empty)
 * 3. Non-empty string
 * 4. User-provided fallback message
 * 5. Default fallback ('An unexpected error occurred')
 */
export function getErrorMessage(
    err: unknown,
    fallbackMessage: string = 'An unexpected error occurred',
): string {
    if (err instanceof APIError && err.message && err.message.trim().length > 0) {
        return err.message;
    }
    if (err instanceof Error && err.message && err.message.trim().length > 0) {
        return err.message;
    }
    if (typeof err === 'string' && err.trim().length > 0) {
        return err;
    }
    return fallbackMessage || 'An unexpected error occurred';
}

/**
 * Standardized error handler for UI components.
 * Displays a Toast error notification and logs diagnostic info in development mode.
 */
export function handleUIError(
    err: unknown,
    fallbackMessage: string = 'An unexpected error occurred',
): void {
    if (import.meta.env?.DEV) {
        console.error('[UI Error Handler]', err);
    }

    const message = getErrorMessage(err, fallbackMessage);
    showToast(message, 'error');
}
