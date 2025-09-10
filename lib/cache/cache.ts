// 翻译缓存管理模块 - 使用 Chrome Storage API
// option | background 调用
import { storageApi } from '~lib/storage/storage';
import { GLOBAL_SETTINGS_KEY } from '../settings/settings';
import type { GlobalSettings } from '../settings/settings';
import { translationCacheManager } from '../storage/chrome_storage';

// 缓存条目接口 (向后兼容)
export interface TranslationCache {
  originalText: string;
  translatedText: string;
  detectedLanguage: string;
  key: string;
  timestamp: number;
  accessCount?: number;
  lastAccessed?: number;
}

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

  // 获取缓存
  async get(text: string, from: string, to: string, engine: string): Promise<string | null> {
    this.totalRequests++;

    try {
      const result = await translationCacheManager.get(text, from, to, engine);
      if (result) {
        this.hitCount++;
      }
      return result;
    } catch (error) {
      console.error('获取缓存失败:', error);
      return null;
    }
  }

  // 设置缓存
  async set(text: string, translatedText: string, from: string, to: string, engine: string): Promise<void> {
    try {
      await translationCacheManager.set(text, translatedText, from, to, engine);
    } catch (error) {
      console.error('设置缓存失败:', error);
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
      // Chrome Storage API 不直接提供统计信息，这里返回基本信息
      const hitRate = this.totalRequests > 0 ? (this.hitCount / this.totalRequests) * 100 : 0;

      return {
        count: 0, // Chrome Storage 不易获取精确计数
        size: 0,  // Chrome Storage 不易获取精确大小
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

  // 优化缓存大小
  async optimizeCache(): Promise<void> {
    try {
      // Chrome Storage API 内部已处理缓存大小优化
      await this.cleanupExpiredCache();
    } catch (error) {
      console.error('优化缓存失败:', error);
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

  // 重置统计信息
  resetStats(): void {
    this.hitCount = 0;
    this.totalRequests = 0;
  }
}

// 导出实例
export const cacheManager = new CacheManager();
