/**
 * Cleans up old Service Workers that were previously registered.
 * Unregisters any active service worker for this domain.
 */
export function cleanupServiceWorkers(): void {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
            for (const registration of registrations) {
                registration.unregister().then(unregistered => {
                    if (unregistered) {
                        console.log('Successfully unregistered legacy service worker');
                    }
                });
            }
        }).catch(err => {
            console.error('Failed to unregister service workers:', err);
        });
    }
}
