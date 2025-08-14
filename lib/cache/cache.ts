// 翻译缓存管理模块 - 使用统一IndexedDB
import { produce } from 'immer';
import { storageApi } from '~lib/storage/storage';
import { DEFAULT_CACHE_CONFIG, TRANSLATION_CACHE_CONFIG_KEY } from '../constants/settings';
import { GLOBAL_SETTINGS_KEY } from '../settings/globalSettings';
import type { GlobalSettings } from '../settings/globalSettings';
import { IndexedDBManager, DATABASE_CONFIGS } from '../storage/indexedDB';

// 缓存条目接口
export interface TranslationCache {
  originalText: string;
  translatedText: string;
  detectedLanguage: string;
  key: string;
  timestamp: number;
  accessCount?: number;
  lastAccessed?: number;
}

export interface CacheConfig {
  maxAge: number;
  maxSize: number;
}

export interface CacheStats {
  count: number;
  size: number;
  hitRate: number;
  memoryUsage: number;
}

// 缓存工具类
export class CacheUtils {
  static async getCacheKey(text: string, from: string, to: string, engine: string): Promise<string> {
    const data = `${text}|${from}|${to}|${engine}`;
    const encoder = new TextEncoder();
    const hash = await crypto.subtle.digest('SHA-256', encoder.encode(data));
    const hashArray = Array.from(new Uint8Array(hash));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  static humanReadableSize(bytes: number, decimals: number = 2): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }

  static isExpired(cache: TranslationCache, maxAge: number): boolean {
    if (!cache.timestamp || maxAge <= 0) return false;
    return Date.now() - cache.timestamp > maxAge;
  }

  static calculateEntrySize(cache: TranslationCache): number {
    return JSON.stringify(cache).length;
  }
}

// 缓存管理类
export class TranslationCacheManager {
  private config: CacheConfig;
  private dbManager: IndexedDBManager;
  private hitCount = 0;
  private missCount = 0;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = produce(DEFAULT_CACHE_CONFIG, (draft) => {
      Object.assign(draft, config);
    });
    
    this.dbManager = new IndexedDBManager(DATABASE_CONFIGS.USER_DATA);
    this.loadConfig().catch(console.error);
    this.startPeriodicCleanup();
  }

  private startPeriodicCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredCache().catch(console.error);
    }, 30 * 60 * 1000);
  }

  private async cleanupExpiredCache(): Promise<void> {
    try {
      await this.dbManager.init();
      const allCache = await this.dbManager.getAll<TranslationCache>('translationCache');
      
      for (const entry of allCache) {
        if (CacheUtils.isExpired(entry, this.config.maxAge)) {
          await this.dbManager.delete('translationCache', entry.key);
        }
      }
    } catch (error) {
      console.error('清理过期缓存失败:', error);
    }
  }

  private async loadConfig(): Promise<void> {
    try {
      const globalSettings = await storageApi.get(GLOBAL_SETTINGS_KEY) as unknown as GlobalSettings;
      
      if (globalSettings?.cache) {
        this.config = produce(this.config, (draft) => {
          Object.assign(draft, {
            maxAge: globalSettings.cache.maxAge,
            maxSize: globalSettings.cache.maxSize,
          });
        });
      }
    } catch (error) {
      console.error('加载缓存配置失败:', error);
    }
  }

  async get(text: string, from: string, to: string, engine: string): Promise<string | null> {
    try {
      const hash = await CacheUtils.getCacheKey(text, from, to, engine);
      await this.dbManager.init();
      const translation = await this.dbManager.get<TranslationCache>('translationCache', hash);
      
      if (translation && !CacheUtils.isExpired(translation, this.config.maxAge)) {
        const updated = produce(translation, (draft) => {
          draft.accessCount = (draft.accessCount || 0) + 1;
          draft.lastAccessed = Date.now();
        });
        
        await this.dbManager.put('translationCache', updated);
        this.hitCount++;
        return translation.translatedText;
      }

      if (translation) {
        await this.dbManager.delete('translationCache', hash);
      }

      this.missCount++;
      return null;
    } catch (error) {
      console.error('获取翻译缓存失败:', error);
      this.missCount++;
      return null;
    }
  }

  async set(text: string, translation: string, from: string, to: string, engine: string): Promise<void> {
    try {
      const hash = await CacheUtils.getCacheKey(text, from, to, engine);
      
      const cacheEntry: TranslationCache = {
        originalText: text,
        translatedText: translation,
        detectedLanguage: from,
        key: hash,
        timestamp: Date.now(),
        accessCount: 1,
        lastAccessed: Date.now(),
      };

      await this.dbManager.init();
      await this.dbManager.put('translationCache', cacheEntry);
      await this.cleanupIfNeeded();
    } catch (error) {
      console.error('设置翻译缓存失败:', error);
    }
  }

  async clear(): Promise<void> {
    try {
      await this.dbManager.init();
      await this.dbManager.clear('translationCache');
    } catch (error) {
      console.error('清空翻译缓存失败:', error);
    }
  }

  async getStats(): Promise<CacheStats> {
    try {
      await this.dbManager.init();
      const allCache = await this.dbManager.getAll<TranslationCache>('translationCache');
      const count = allCache.length;
      const size = allCache.reduce((total, entry) => total + CacheUtils.calculateEntrySize(entry), 0);
      
      return {
        count,
        size,
        hitRate: this.calculateHitRate(),
        memoryUsage: size,
      };
    } catch (error) {
      return { count: 0, size: 0, hitRate: 0, memoryUsage: 0 };
    }
  }

  private calculateHitRate(): number {
    const total = this.hitCount + this.missCount;
    return total > 0 ? (this.hitCount / total) * 100 : 0;
  }

  private async cleanupIfNeeded(): Promise<void> {
    try {
      const stats = await this.getStats();
      if (stats.count > this.config.maxSize) {
        const allCache = await this.dbManager.getAll<TranslationCache>('translationCache');
        allCache.sort((a, b) => a.timestamp - b.timestamp);
        
        const toDelete = allCache.slice(0, stats.count - this.config.maxSize);
        for (const entry of toDelete) {
          await this.dbManager.delete('translationCache', entry.key);
        }
      }
    } catch (error) {
      console.error('缓存清理失败:', error);
    }
  }

  async initDB(): Promise<void> {
    await this.dbManager.init();
  }

  async cleanupExpired(): Promise<{ removed: number; message: string }> {
    try {
      const beforeCount = await this.getStats().then(stats => stats.count);
      await this.cleanupExpiredCache();
      const afterCount = await this.getStats().then(stats => stats.count);
      const removed = beforeCount - afterCount;

      return { 
        removed, 
        message: `成功清理 ${removed} 个过期缓存条目` 
      };
    } catch (error) {
      console.error('清理过期缓存失败:', error);
      return { 
        removed: 0, 
        message: `清理失败: ${error instanceof Error ? error.message : '未知错误'}` 
      };
    }
  }

  async updateConfig(newConfig: Partial<CacheConfig>): Promise<void> {
    // 使用 immer 进行配置更新
    this.config = produce(this.config, (draft) => {
      Object.assign(draft, newConfig);
    });

    // 更新全局配置中的缓存设置
    try {
      const globalSettings = await storageApi.get(GLOBAL_SETTINGS_KEY) as unknown as GlobalSettings;
      if (globalSettings) {
        const updatedSettings = produce(globalSettings, (draft) => {
          draft.cache = {
            ...draft.cache,
            maxAge: this.config.maxAge,
            maxSize: this.config.maxSize,
          };
        });
        await storageApi.set(GLOBAL_SETTINGS_KEY, updatedSettings);
      } else {
        // 兼容性：如果全局配置不存在，保存到旧位置
        await storageApi.set(TRANSLATION_CACHE_CONFIG_KEY, this.config);
      }
    } catch (error) {
      console.error('更新缓存配置失败，使用备用方案:', error);
      await storageApi.set(TRANSLATION_CACHE_CONFIG_KEY, this.config);
    }
    
    // 配置更新后立即检查是否需要清理缓存
    await this.cleanupIfNeeded();
  }

  async dispose(): Promise<void> {
    this.dbManager.close();
  }
}

export const cacheManager = new TranslationCacheManager();
