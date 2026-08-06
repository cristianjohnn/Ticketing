import { CacheTags } from './cacheTags';

export interface LockToken {
    key: string;
    token: string;
}

export interface CacheProvider {
    get<T>(key: string): Promise<T | null>;
    set<T>(key: string, value: T, ttlSeconds: number, tags?: CacheTags[]): Promise<void>;
    delete(key: string): Promise<void>;
    
    // Remember pattern: fetch from cache, if missing, run callback, store, and return
    remember<T>(key: string, ttlSeconds: number, callback: () => Promise<T>, tags?: CacheTags[]): Promise<T>;
    
    // Invalidation
    invalidateByTag(tag: CacheTags): Promise<void>;
    flush(): Promise<void>;

    // Distributed Locking placeholders
    acquireLock(key: string, ttlSeconds: number, ownerId: string): Promise<LockToken | null>;
    releaseLock(lockToken: LockToken): Promise<boolean>;

    // Metrics & Health
    getName(): string;
    getMetrics(): Promise<any>;
    health(): Promise<boolean>;
}
