import type { GlobalSettings } from '../constants/types';
import { GLOBAL_SETTINGS_KEY } from '../settings/settings';
import { translationCacheRepository } from '../storage/indexed_db';
import { storageApi } from '../storage/storage';

export interface CacheConfig {
  maxAge: number;
  maxSize: number;
}

export interface CacheStats {
  count: number;
  size: number;
  hitRate: number;
  totalRequests: number;
  hitCount: number;
}

class CacheManager {
  private hitCount = 0;
  private totalRequests = 0;
  private config: CacheConfig = {
    maxAge: 30 * 24 * 60 * 60 * 1000,
    maxSize: 5000,
  };

  async initDB(): Promise<void> {
    try {
      const settings = (await storageApi.get(GLOBAL_SETTINGS_KEY)) as
        | GlobalSettings
        | undefined;

      if (settings?.cache) {
        this.config = {
          maxAge: settings.cache.maxAge || this.config.maxAge,
          maxSize: settings.cache.maxSize || this.config.maxSize,
        };
      }
    } catch (error) {
      console.error('Failed to initialize cache config:', error);
    }
  }

  recordRequest(hit: boolean) {
    this.totalRequests += 1;
    if (hit) {
      this.hitCount += 1;
    }
  }

  async cleanupExpiredCache(): Promise<void> {
    try {
      await translationCacheRepository.cleanupExpired(this.config.maxAge);
    } catch (error) {
      console.error('Failed to cleanup expired cache:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      await translationCacheRepository.clear();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      const { count, size } = await translationCacheRepository.getStats();
      const hitRate =
        this.totalRequests > 0 ? (this.hitCount / this.totalRequests) * 100 : 0;

      return {
        count,
        size,
        hitRate,
        totalRequests: this.totalRequests,
        hitCount: this.hitCount,
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        count: 0,
        size: 0,
        hitRate: 0,
        totalRequests: this.totalRequests,
        hitCount: this.hitCount,
      };
    }
  }

  async updateConfig(newConfig: Partial<CacheConfig>): Promise<void> {
    this.config = {
      ...this.config,
      ...newConfig,
    };
    await translationCacheRepository.cleanupExpired(this.config.maxAge);
  }
}

export const cacheManager = new CacheManager();
