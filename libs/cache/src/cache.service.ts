import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { AppConfigService } from '@aliko/config';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private client!: Redis;
  private isConnected = false;

  constructor(private readonly configService: AppConfigService) {}

  onModuleInit() {
    this.client = new Redis({
      host: this.configService.redisHost,
      port: this.configService.redisPort,
      lazyConnect: true,
      enableOfflineQueue: false,
      maxRetriesPerRequest: 1,
      retryStrategy: (times) => {
        if (times > 10) {
          return null;
        }
        return Math.min(times * 1000, 30000);
      },
    });

    this.client.on('connect', () => {
      this.isConnected = true;
      this.logger.log('Successfully connected to Redis');
    });

    this.client.on('ready', () => {
      this.isConnected = true;
    });

    this.client.on('close', () => {
      if (this.isConnected) {
        this.isConnected = false;
        this.logger.warn('Redis connection closed');
      }
    });

    this.client.on('error', (err) => {
      if (this.isConnected) {
        this.isConnected = false;
        const msg = err?.message || String(err);
        this.logger.warn(`Redis connection lost: ${msg}`);
      }
    });

    this.client.connect().catch((err) => {
      this.isConnected = false;
      const msg = err?.message || String(err);
      this.logger.warn(`Redis initial connection failed: ${msg}. Cache will operate in fallback mode.`);
    });
  }

  onModuleDestroy() {
    if (this.client) {
      this.client.disconnect();
    }
  }

  async get<T>(key: string): Promise<T | null> {
    if (!this.isConnected || this.client.status !== 'ready') {
      return null;
    }
    try {
      const value = await this.client.get(key);
      return value ? JSON.parse(value) : null;
    } catch {
      return null;
    }
  }

  async set(key: string, value: any, ttlSeconds?: number): Promise<void> {
    if (!this.isConnected || this.client.status !== 'ready') {
      return;
    }
    try {
      const data = JSON.stringify(value);
      if (ttlSeconds) {
        await this.client.set(key, data, 'EX', ttlSeconds);
      } else {
        await this.client.set(key, data);
      }
    } catch (err) {
      this.logger.error(`Failed to set cache key: ${key}`, err);
    }
  }

  async del(key: string): Promise<void> {
    if (!this.isConnected || this.client.status !== 'ready') {
      return;
    }
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.error(`Failed to delete cache key: ${key}`, err);
    }
  }

  async incrWithExpiry(key: string, ttlSeconds: number): Promise<number | null> {
    if (!this.isConnected || this.client.status !== 'ready') {
      return null;
    }
    try {
      const count = await this.client.incr(key);
      if (count === 1) {
        await this.client.expire(key, ttlSeconds);
      }
      return count;
    } catch (err) {
      this.logger.error(`Failed to incrWithExpiry for key: ${key}`, err);
      return null;
    }
  }
}
