import { CacheProvider, LockToken } from './CacheProvider';
import { CacheTags } from './cacheTags';
import { CacheStatisticsService } from './CacheStatisticsService';

export class MemoryProvider implements CacheProvider {
    private store = new Map<string, { value: any, expiresAt: number, tags: CacheTags[] }>();

    public getName(): string {
        return 'MemoryProvider';
    }

    public async get<T>(key: string): Promise<T | null> {
        const start = performance.now();
        const item = this.store.get(key);
        
        if (!item) {
            CacheStatisticsService.recordMiss(performance.now() - start);
            return null;
        }

        if (item.expiresAt < Date.now()) {
            this.store.delete(key);
            CacheStatisticsService.recordMiss(performance.now() - start);
            return null;
        }

        CacheStatisticsService.recordHit(performance.now() - start);
        return item.value as T;
    }

    public async set<T>(key: string, value: T, ttlSeconds: number, tags: CacheTags[] = []): Promise<void> {
        const start = performance.now();
        const expiresAt = Date.now() + (ttlSeconds * 1000);
        this.store.set(key, { value, expiresAt, tags });
        CacheStatisticsService.recordSet(performance.now() - start);
    }

    public async delete(key: string): Promise<void> {
        this.store.delete(key);
    }

    public async remember<T>(key: string, ttlSeconds: number, callback: () => Promise<T>, tags?: CacheTags[]): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        const freshData = await callback();
        await this.set(key, freshData, ttlSeconds, tags);
        return freshData;
    }

    public async invalidateByTag(tag: CacheTags): Promise<void> {
        CacheStatisticsService.recordInvalidation();
        for (const [key, item] of this.store.entries()) {
            if (item.tags.includes(tag)) {
                this.store.delete(key);
            }
        }
    }

    public async flush(): Promise<void> {
        this.store.clear();
    }

    public async acquireLock(key: string, ttlSeconds: number, ownerId: string): Promise<LockToken | null> {
        const lockKey = `lock:${key}`;
        const existing = this.store.get(lockKey);
        
        if (existing && existing.expiresAt > Date.now()) {
            CacheStatisticsService.recordLockFailure();
            return null; // Already locked
        }

        const token = Math.random().toString(36).substring(2, 15);
        this.store.set(lockKey, { value: { ownerId, token }, expiresAt: Date.now() + (ttlSeconds * 1000), tags: [] });
        CacheStatisticsService.recordLockAcquisition();
        
        return { key: lockKey, token };
    }

    public async releaseLock(lockToken: LockToken): Promise<boolean> {
        const existing = this.store.get(lockToken.key);
        if (existing && existing.value.token === lockToken.token) {
            this.store.delete(lockToken.key);
            return true;
        }
        return false;
    }

    public async getMetrics(): Promise<any> {
        return {
            memoryKeys: this.store.size,
            ...CacheStatisticsService.getMetrics()
        };
    }

    public async health(): Promise<boolean> {
        return true;
    }
}
