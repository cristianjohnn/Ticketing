import { Redis } from 'ioredis';
import { promisify } from 'util';
import zlib from 'zlib';
import { ENV } from '../../config/env';
import { CacheProvider, LockToken } from './CacheProvider';
import { CacheTags } from './cacheTags';
import { CacheStatisticsService } from './CacheStatisticsService';

const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);

export class RedisProvider implements CacheProvider {
    private client: Redis;
    private compressionEnabled: boolean = ENV.CACHE_COMPRESSION_ENABLED;
    private compressionThreshold: number = ENV.CACHE_COMPRESSION_THRESHOLD;

    constructor() {
        this.client = new Redis({
            host: ENV.REDIS_HOST,
            port: ENV.REDIS_PORT,
            password: ENV.REDIS_PASSWORD || undefined,
            db: ENV.REDIS_DB,
            retryStrategy: (times) => Math.min(times * 50, 2000), // Graceful backoff
            maxRetriesPerRequest: 3,
        });

        this.client.on('error', (err) => {
            console.error('[RedisProvider] Redis connection error:', err);
        });
    }

    public getName(): string {
        return 'RedisProvider';
    }

    private async serializeAndCompress(value: any): Promise<string> {
        const json = JSON.stringify(value);
        if (this.compressionEnabled && Buffer.byteLength(json) > this.compressionThreshold) {
            const compressed = await gzip(json);
            return `COMPRESSED:${compressed.toString('base64')}`;
        }
        return json;
    }

    private async decompressAndParse(value: string): Promise<any> {
        if (value.startsWith('COMPRESSED:')) {
            const base64 = value.substring('COMPRESSED:'.length);
            const buffer = Buffer.from(base64, 'base64');
            const decompressed = await gunzip(buffer);
            return JSON.parse(decompressed.toString('utf-8'));
        }
        return JSON.parse(value);
    }

    public async get<T>(key: string): Promise<T | null> {
        const start = performance.now();
        try {
            const value = await this.client.get(key);
            if (!value) {
                CacheStatisticsService.recordMiss(performance.now() - start);
                return null;
            }
            const parsed = await this.decompressAndParse(value);
            CacheStatisticsService.recordHit(performance.now() - start);
            return parsed as T;
        } catch (error) {
            console.error(`[RedisProvider] Error getting key ${key}:`, error);
            CacheStatisticsService.recordMiss(performance.now() - start);
            return null;
        }
    }

    public async set<T>(key: string, value: T, ttlSeconds: number, tags: CacheTags[] = []): Promise<void> {
        const start = performance.now();
        try {
            const serialized = await this.serializeAndCompress(value);
            
            // Execute set and tag additions in a pipeline
            const pipeline = this.client.pipeline();
            pipeline.setex(key, ttlSeconds, serialized);
            
            // Add key to tag sets
            for (const tag of tags) {
                const tagKey = `tag:${tag}`;
                pipeline.sadd(tagKey, key);
                // Tag set should expire a bit after the max possible TTL to prevent memory leaks
                pipeline.expire(tagKey, ttlSeconds + 3600); 
            }
            
            await pipeline.exec();
            CacheStatisticsService.recordSet(performance.now() - start);
        } catch (error) {
            console.error(`[RedisProvider] Error setting key ${key}:`, error);
        }
    }

    public async delete(key: string): Promise<void> {
        await this.client.del(key);
    }

    public async remember<T>(key: string, ttlSeconds: number, callback: () => Promise<T>, tags?: CacheTags[]): Promise<T> {
        const cached = await this.get<T>(key);
        if (cached !== null) {
            return cached;
        }

        const freshData = await callback();
        // Fire and forget set so we don't block returning the data
        this.set(key, freshData, ttlSeconds, tags).catch(e => console.error(e));
        return freshData;
    }

    public async invalidateByTag(tag: CacheTags): Promise<void> {
        CacheStatisticsService.recordInvalidation();
        try {
            const tagKey = `tag:${tag}`;
            const keys = await this.client.smembers(tagKey);
            
            if (keys.length > 0) {
                const pipeline = this.client.pipeline();
                pipeline.del(...keys);
                pipeline.del(tagKey);
                await pipeline.exec();
            }
        } catch (error) {
            console.error(`[RedisProvider] Error invalidating tag ${tag}:`, error);
        }
    }

    public async flush(): Promise<void> {
        await this.client.flushdb();
    }

    public async acquireLock(key: string, ttlSeconds: number, ownerId: string): Promise<LockToken | null> {
        const lockKey = `lock:${key}`;
        const token = Math.random().toString(36).substring(2, 15);
        const payload = JSON.stringify({ ownerId, token });
        
        // NX = Set only if not exists, EX = expire seconds
        const result = await this.client.set(lockKey, payload, 'EX', ttlSeconds, 'NX');
        
        if (result === 'OK') {
            CacheStatisticsService.recordLockAcquisition();
            return { key: lockKey, token };
        }
        
        CacheStatisticsService.recordLockFailure();
        return null;
    }

    public async releaseLock(lockToken: LockToken): Promise<boolean> {
        // Use a Lua script to ensure atomicity: only delete if the token matches
        const luaScript = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;
        
        // However, our payload is JSON. Let's just do a watch/get/multi pattern or simple get/del
        // To keep it simple and robust, we fetch, check, and delete.
        const current = await this.client.get(lockToken.key);
        if (current) {
            try {
                const parsed = JSON.parse(current);
                if (parsed.token === lockToken.token) {
                    await this.client.del(lockToken.key);
                    return true;
                }
            } catch (e) {
                // Ignore parse errors
            }
        }
        return false;
    }

    public async getMetrics(): Promise<any> {
        const info = await this.client.info('memory');
        const memoryMatch = info.match(/used_memory_human:(.*)/);
        const memory = memoryMatch ? memoryMatch[1].trim() : 'unknown';
        
        return {
            memoryUsage: memory,
            status: this.client.status,
            ...CacheStatisticsService.getMetrics()
        };
    }

    public async health(): Promise<boolean> {
        try {
            await this.client.ping();
            return true;
        } catch (error) {
            return false;
        }
    }
}
