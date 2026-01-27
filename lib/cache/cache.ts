// 翻译缓存管理模块 - 使用 Chrome Storage API
// option | background 调用
import { storageApi } from '~lib/storage/storage';
import { GLOBAL_SETTINGS_KEY } from '../settings/settings';
import type { GlobalSettings } from '../constants/types';
import { translationCacheManager } from '../storage/chrome_storage';

// 缓存配置接口
export interface CacheConfig {
  maxAge: number;
  maxSize: number;
}

// 缓存统计信息接口
export interface CacheStats {
  count: number;
  size: number;
  hitRate: number;
  totalRequests: number;
  hitCount: number;
}

// 缓存管理器类 - 简化版，使用 Chrome Storage
class CacheManager {
  private hitCount = 0;
  private totalRequests = 0;
  private config: CacheConfig;

  constructor() {
    this.config = {
      maxAge: 24 * 60 * 60 * 1000, // 24小时
      maxSize: 10000, // 最大10000条缓存
    };
  }

  // 初始化 - 为了向后兼容保留此方法
  async initDB(): Promise<void> {
    try {
      // 从全局设置中读取缓存配置
      const settings = await storageApi.get(GLOBAL_SETTINGS_KEY) as unknown as GlobalSettings;
      
      if (settings?.cache) {
        this.config.maxAge = settings.cache.maxAge || this.config.maxAge;
        this.config.maxSize = settings.cache.maxSize || this.config.maxSize;
      }
    } catch (error) {
      console.error('初始化缓存配置失败:', error);
    }
  }

  // 清理过期缓存
  async cleanupExpiredCache(): Promise<void> {
    try {
      await translationCacheManager.cleanupExpired(this.config.maxAge);
      console.log('清理过期缓存完成');
    } catch (error) {
      console.error('清理过期缓存失败:', error);
    }
  }

  // 清空缓存
  async clear(): Promise<void> {
    try {
      await translationCacheManager.clear();
    } catch (error) {
      console.error('清空缓存失败:', error);
    }
  }

  // 获取缓存统计信息
  async getStats(): Promise<CacheStats> {
    try {
      // 从 Chrome Storage 获取实际的缓存统计
      const { count, size } = await translationCacheManager.getStats();
      const hitRate = this.totalRequests > 0 ? (this.hitCount / this.totalRequests) * 100 : 0;

      return {
        count,
        size,
        hitRate,
        totalRequests: this.totalRequests,
        hitCount: this.hitCount,
      };
    } catch (error) {
      console.error('获取缓存统计失败:', error);
      return {
        count: 0,
        size: 0,
        hitRate: 0,
        totalRequests: this.totalRequests,
        hitCount: this.hitCount,
      };
    }
  }

// 更新缓存配置
  async updateConfig(newConfig: Partial<CacheConfig>): Promise<void> {
    if (newConfig.maxAge !== undefined) this.config.maxAge = newConfig.maxAge;
    if (newConfig.maxSize !== undefined) this.config.maxSize = newConfig.maxSize;

    try {
      // 更新全局设置
      const globalSettings = await storageApi.get(GLOBAL_SETTINGS_KEY) as unknown as GlobalSettings;
      if (globalSettings) {
        const updatedSettings = {
          ...globalSettings,
          cache: {
            ...globalSettings.cache,
            ...newConfig
          }
        };
        await storageApi.set(GLOBAL_SETTINGS_KEY, updatedSettings);
      }
    } catch (error) {
      console.error('更新缓存配置失败:', error);
    }
  }
}

// 导出实例
export const cacheManager = new CacheManager();
