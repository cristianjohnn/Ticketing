export class CacheStatisticsService {
    private static stats = {
        hits: 0,
        misses: 0,
        lookups: 0,
        sets: 0,
        totalLookupTimeMs: 0,
        totalSetTimeMs: 0,
        invalidations: 0,
        lockAcquisitions: 0,
        lockFailures: 0
    };

    public static recordHit(timeMs: number) {
        this.stats.hits++;
        this.stats.lookups++;
        this.stats.totalLookupTimeMs += timeMs;
    }

    public static recordMiss(timeMs: number) {
        this.stats.misses++;
        this.stats.lookups++;
        this.stats.totalLookupTimeMs += timeMs;
    }

    public static recordSet(timeMs: number) {
        this.stats.sets++;
        this.stats.totalSetTimeMs += timeMs;
    }

    public static recordInvalidation() {
        this.stats.invalidations++;
    }

    public static recordLockAcquisition() {
        this.stats.lockAcquisitions++;
    }

    public static recordLockFailure() {
        this.stats.lockFailures++;
    }

    public static getMetrics() {
        return {
            hits: this.stats.hits,
            misses: this.stats.misses,
            hitRatio: this.stats.lookups > 0 ? (this.stats.hits / this.stats.lookups).toFixed(4) : "0.0000",
            averageLookupTimeMs: this.stats.lookups > 0 ? (this.stats.totalLookupTimeMs / this.stats.lookups).toFixed(2) : "0.00",
            averageSetTimeMs: this.stats.sets > 0 ? (this.stats.totalSetTimeMs / this.stats.sets).toFixed(2) : "0.00",
            invalidations: this.stats.invalidations,
            lockAcquisitions: this.stats.lockAcquisitions,
            lockFailures: this.stats.lockFailures
        };
    }
}
