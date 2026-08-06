/**
 * Debounces a function call by a given delay.
 * Useful for coalescing multiple rapid API re-fetches into a single request.
 */
export function debounce<F extends (...args: any[]) => any>(
    func: F, 
    waitFor: number = 300
): (...args: Parameters<F>) => void {
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    
    return (...args: Parameters<F>): void => {
        if (timeoutId !== null) {
            clearTimeout(timeoutId);
        }
        timeoutId = setTimeout(() => {
            func(...args);
        }, waitFor);
    };
}
