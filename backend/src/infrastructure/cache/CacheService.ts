import { ENV } from '../../config/env';
import { CacheProvider, LockToken } from './CacheProvider';
import { MemoryProvider } from './MemoryProvider';
import { RedisProvider } from './RedisProvider';
import { CacheTags } from './cacheTags';

export class CacheService {
    private static provider: CacheProvider;

    public static initialize() {
        if (ENV.CACHE_PROVIDER === 'redis') {
            console.log('[CacheService] Initializing Redis provider...');
            this.provider = new RedisProvider();
        } else {
            console.log('[CacheService] Initializing Memory fallback provider...');
            this.provider = new MemoryProvider();
        }
    }

    public static async get<T>(key: string): Promise<T | null> {
        if (!this.provider) this.initialize();
        return this.provider.get<T>(key);
    }

    public static async set<T>(key: string, value: T, ttlSeconds: number, tags?: CacheTags[]): Promise<void> {
        if (!this.provider) this.initialize();
        return this.provider.set(key, value, ttlSeconds, tags);
    }

    public static async delete(key: string): Promise<void> {
        if (!this.provider) this.initialize();
        return this.provider.delete(key);
    }

    public static async remember<T>(key: string, ttlSeconds: number, callback: () => Promise<T>, tags?: CacheTags[]): Promise<T> {
        if (!this.provider) this.initialize();
        return this.provider.remember(key, ttlSeconds, callback, tags);
    }

    public static async invalidateByTag(tag: CacheTags): Promise<void> {
        if (!this.provider) this.initialize();
        return this.provider.invalidateByTag(tag);
    }

    public static async flush(): Promise<void> {
        if (!this.provider) this.initialize();
        return this.provider.flush();
    }

    public static async acquireLock(key: string, ttlSeconds: number, ownerId: string): Promise<LockToken | null> {
        if (!this.provider) this.initialize();
        return this.provider.acquireLock(key, ttlSeconds, ownerId);
    }

    public static async releaseLock(lockToken: LockToken): Promise<boolean> {
        if (!this.provider) this.initialize();
        return this.provider.releaseLock(lockToken);
    }

    public static async health(): Promise<boolean> {
        if (!this.provider) this.initialize();
        return this.provider.health();
    }

    public static async getMetrics(): Promise<any> {
        if (!this.provider) this.initialize();
        return {
            provider: this.provider.getName(),
            metrics: await this.provider.getMetrics()
        };
    }
}
