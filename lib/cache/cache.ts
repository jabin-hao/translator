// 翻译缓存管理模块
import { storageApi } from '~lib/utils/storage';
import { DEFAULT_CACHE_CONFIG, TRANSLATION_CACHE_CONFIG_KEY } from '../constants/settings';

// 缓存条目接口
export interface TranslationCache {
  originalText: string;
  translatedText: string;
  detectedLanguage: string;
  key: string;
  timestamp: number; // 缓存创建时间戳
  accessCount?: number; // 访问次数
  lastAccessed?: number; // 最后访问时间
}

export interface CacheConfig {
  maxAge: number; // 缓存最大年龄（毫秒）
  maxSize: number; // 最大缓存条目数
}

export interface CacheStats {
  count: number;
  size: number;
  hitRate: number;
  memoryUsage: number;
}

// 缓存操作结果类型
type CacheResult<T> = {
  success: boolean;
  data?: T;
  error?: string;
};

// 工具类
class CacheUtils {
  // 生成SHA1哈希 - 优化性能
  static async stringToSHA1String(message: string): Promise<string> {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(message);
      const hashBuffer = await crypto.subtle.digest('SHA-1', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    } catch (error) {
      // 降级到简单哈希
      return CacheUtils.simpleHash(message);
    }
  }

  // 简单哈希函数作为降级方案
  private static simpleHash(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    return Math.abs(hash).toString(16);
  }

  // 生成缓存key - 增加输入验证
  static async getCacheKey(text: string, from: string, to: string, engine: string): Promise<string> {
    if (!text || !from || !to || !engine) {
      throw new Error('Cache key parameters cannot be empty');
    }
    
    // 标准化输入
    const normalizedText = text.trim().toLowerCase();
    const normalizedFrom = from.toLowerCase();
    const normalizedTo = to.toLowerCase();
    const normalizedEngine = engine.toLowerCase();
    
    return await CacheUtils.stringToSHA1String(`${normalizedText}||${normalizedFrom}||${normalizedTo}||${normalizedEngine}`);
  }

  // 将字节转换为人类可读的字符串 - 增加精度控制
  static humanReadableSize(bytes: number, precision: number = 1): string {
    if (bytes === 0) return "0 B";
    
    const thresh = 1024;
    if (Math.abs(bytes) < thresh) {
      return bytes + " B";
    }
    
    const units = ["KB", "MB", "GB", "TB", "PB"];
    let u = -1;
    do {
      bytes /= thresh;
      ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    
    return bytes.toFixed(precision) + " " + units[u];
  }

  // 检查缓存是否过期
  static isExpired(cache: TranslationCache, maxAge: number): boolean {
    if (!cache.timestamp || maxAge <= 0) return false;
    return Date.now() - cache.timestamp > maxAge;
  }

  // 计算缓存条目大小
  static calculateEntrySize(cache: TranslationCache): number {
    return JSON.stringify(cache).length;
  }
}

// 缓存管理类
export class TranslationCacheManager {
  private config: CacheConfig;
  private db: IDBDatabase | null = null;
  private cache = new Map<string, TranslationCache>();
  private initPromise: Promise<void> | null = null;
  private hitCount = 0; // 缓存命中次数
  private missCount = 0; // 缓存未命中次数
  private isCleanupRunning = false; // 防止重复清理

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    
    // 从storage中读取用户配置
    this.loadConfig().catch(error => {
      console.error('初始化时加载配置失败:', error);
    });

    // 定期清理过期缓存
    this.startPeriodicCleanup();
  }

  // 启动定期清理
  private startPeriodicCleanup(): void {
    // 每30分钟清理一次过期缓存
    setInterval(() => {
      this.cleanupExpiredCache().catch(error => {
        console.error('定期缓存清理失败:', error);
      });
    }, 30 * 60 * 1000);
  }

  // 清理过期缓存
  private async cleanupExpiredCache(): Promise<void> {
    if (this.isCleanupRunning || this.config.maxAge <= 0) return;
    
    this.isCleanupRunning = true;
    try {
      const now = Date.now();
      const expiredKeys: string[] = [];

      // 清理内存缓存中的过期项
      this.cache.forEach((entry, key) => {
        if (CacheUtils.isExpired(entry, this.config.maxAge)) {
          expiredKeys.push(key);
        }
      });

      // 从内存中删除过期项
      expiredKeys.forEach(key => this.cache.delete(key));

      // 从IndexedDB中删除过期项
      if (expiredKeys.length > 0) {
        await this.batchRemoveFromDB(expiredKeys);
      }
    } finally {
      this.isCleanupRunning = false;
    }
  }

  // 批量删除操作
  private async batchRemoveFromDB(keys: string[]): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      try {
        const transaction = this.db!.transaction(['cache'], 'readwrite');
        const objectStore = transaction.objectStore('cache');
        
        let completed = 0;
        const total = keys.length;

        keys.forEach(key => {
          const request = objectStore.delete(key);
          request.onsuccess = () => {
            completed++;
            if (completed === total) {
              resolve();
            }
          };
          request.onerror = () => {
            console.error('批量删除单个条目失败:', key, request.error);
            completed++;
            if (completed === total) {
              resolve();
            }
          };
        });

        transaction.onerror = () => {
          console.error('批量删除事务失败:', transaction.error);
          reject(transaction.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // 从storage加载配置
  private async loadConfig(): Promise<void> {
    try {
      const config = await storageApi.get(TRANSLATION_CACHE_CONFIG_KEY);

      if (config && typeof config === 'object') {
        // @ts-ignore
        this.config = { ...this.config, ...config };
      }
    } catch (error) {
      console.error('加载缓存配置失败:', error);
    }
  }

  // 获取缓存
  async get(text: string, from: string, to: string, engine: string): Promise<string | null> {
    try {
      const hash = await CacheUtils.getCacheKey(text, from, to, engine);
      
      // 先从内存缓存查找
      let translation = this.cache.get(hash);
      if (translation) {
        // 检查是否过期
        if (CacheUtils.isExpired(translation, this.config.maxAge)) {
          this.cache.delete(hash);
          await this.removeFromDB(hash);
          this.missCount++;
          return null;
        }
        
        // 更新访问统计
        translation.accessCount = (translation.accessCount || 0) + 1;
        translation.lastAccessed = Date.now();
        this.cache.set(hash, translation);
        this.hitCount++;
        
        return translation.translatedText;
      }

      // 从 IndexedDB 查找
      translation = await this.queryInDB(hash);
      if (translation) {
        // 检查是否过期
        if (CacheUtils.isExpired(translation, this.config.maxAge)) {
          await this.removeFromDB(hash);
          this.missCount++;
          return null;
        }
        
        // 更新访问统计并保存到内存缓存
        translation.accessCount = (translation.accessCount || 0) + 1;
        translation.lastAccessed = Date.now();
        this.cache.set(hash, translation);
        this.hitCount++;
        
        return translation.translatedText;
      }

      this.missCount++;
      return null;
    } catch (error) {
      console.error('获取翻译缓存失败:', error);
      this.missCount++;
      return null;
    }
  }

  // 设置缓存
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

      // 保存到内存缓存
      this.cache.set(hash, cacheEntry);

      // 保存到 IndexedDB
      await this.addInDB(cacheEntry);

      // 检查缓存数量，如果超过限制则清理最旧的条目
      await this.cleanupIfNeeded();
      
    } catch (error) {
      console.error('设置翻译缓存失败:', error);
    }
  }

  // 删除缓存
  async remove(text: string, from: string, to: string, engine: string): Promise<void> {
    try {
      const hash = await CacheUtils.getCacheKey(text, from, to, engine);
      await this.removeFromDB(hash);
      this.cache.delete(hash);
    } catch (error) {
      console.error('删除翻译缓存失败:', error);
    }
  }

  // 清空所有缓存
  async clear(): Promise<void> {
    try {
      // 清空内存缓存
      this.cache.clear();
      
      // 清空 IndexedDB
      await this.initDB();
      if (this.db) {
        const objectStore = this.db.transaction(['cache'], 'readwrite').objectStore('cache');
        await new Promise<void>((resolve, reject) => {
          const request = objectStore.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
      
    } catch (error) {
      console.error('清空翻译缓存失败:', error);
    }
  }

  // 从 IndexedDB 查询
  private async queryInDB(hash: string): Promise<TranslationCache | null> {
    await this.initDB();
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
      try {
        const objectStore = this.db!.transaction(['cache'], 'readonly').objectStore('cache');
        const request = objectStore.get(hash);

        request.onsuccess = () => {
          const result = request.result;
          resolve(result || null);
        };

        request.onerror = () => {
          console.error('查询 IndexedDB 失败:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('查询 IndexedDB 失败:', error);
        reject(error);
      }
    });
  }

  // 添加到 IndexedDB
  private async addInDB(data: TranslationCache): Promise<boolean> {
    await this.initDB();
    if (!this.db) return false;

    return new Promise((resolve) => {
      try {
        const objectStore = this.db!.transaction(['cache'], 'readwrite').objectStore('cache');
        const request = objectStore.put(data);

        request.onsuccess = () => {
          resolve(true);
        };

        request.onerror = () => {
          console.error('保存到 IndexedDB 失败:', request.error);
          resolve(false);
        };
      } catch (error) {
        console.error('保存到 IndexedDB 失败:', error);
        resolve(false);
      }
    });
  }

  // 从 IndexedDB 删除
  private async removeFromDB(hash: string): Promise<void> {
    await this.initDB();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      try {
        const objectStore = this.db!.transaction(['cache'], 'readwrite').objectStore('cache');
        const request = objectStore.delete(hash);

        request.onsuccess = () => {
          resolve();
        };

        request.onerror = () => {
          console.error('从 IndexedDB 删除失败:', request.error);
          reject(request.error);
        };
      } catch (error) {
        console.error('从 IndexedDB 删除失败:', error);
        reject(error);
      }
    });
  }

  // 初始化 IndexedDB
  async initDB(): Promise<void> {
    if (this.db) return;
    
    // 如果已经有初始化在进行，等待它完成
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = this._initDB();
    try {
      await this.initPromise;
    } finally {
      this.initPromise = null;
    }
  }

  // 实际的数据库初始化逻辑
  private async _initDB(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TranslationCache', 2);

      request.onerror = () => {
        console.error('打开 IndexedDB 失败:', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        try {
          if (!db.objectStoreNames.contains('cache')) {
            const objectStore = db.createObjectStore('cache', { keyPath: 'key' });
            objectStore.createIndex('key', 'key', { unique: true });
            objectStore.createIndex('timestamp', 'timestamp', { unique: false });
          } else {
            // 如果对象存储已存在，检查是否需要添加timestamp索引
            const objectStore = db.transaction(['cache'], 'readwrite').objectStore('cache');
            if (!objectStore.indexNames.contains('timestamp')) {
              objectStore.createIndex('timestamp', 'timestamp', { unique: false });
            }
          }
        } catch (error) {
          console.error('数据库升级失败:', error);
          reject(error);
        }
      };
    });
  }

  // 获取缓存统计信息 - 优化版本
  async getStats(): Promise<CacheStats> {
    try {
      await this.initDB();
      
      const memoryCount = this.cache.size;
      const memorySize = Array.from(this.cache.values()).reduce((total, entry) => {
        const entrySize = CacheUtils.calculateEntrySize(entry);
        return total + (isNaN(entrySize) ? 0 : entrySize);
      }, 0);

      if (!this.db) {
        const result = {
          count: memoryCount,
          size: memorySize,
          hitRate: this.calculateHitRate(),
          memoryUsage: memorySize,
        };
        return result;
      }

      return new Promise((resolve) => {
        try {
          const objectStore = this.db!.transaction(['cache'], 'readonly').objectStore('cache');
          const countRequest = objectStore.count();

          countRequest.onsuccess = () => {
            const totalCount = countRequest.result;
            
            // 估算总大小（避免加载所有数据）
            let estimatedSize = 0;
            if (totalCount > 0 && memoryCount > 0 && memorySize > 0) {
              // 基于内存中的数据估算平均大小
              const avgSize = memorySize / memoryCount;
              estimatedSize = avgSize * totalCount;
            } else if (totalCount > 0) {
              // 如果内存中没有数据，使用默认的平均大小估算
              const defaultAvgSize = 100; // 假设每个条目平均100字节
              estimatedSize = defaultAvgSize * totalCount;
            }

            const finalSize = Math.max(estimatedSize, memorySize);
            
            const result = {
              count: totalCount,
              size: isNaN(finalSize) ? 0 : finalSize,
              hitRate: this.calculateHitRate(),
              memoryUsage: isNaN(memorySize) ? 0 : memorySize,
            };
            
            resolve(result);
          };

          countRequest.onerror = () => {
            console.error('获取缓存统计失败:', countRequest.error);
            const fallbackResult = {
              count: memoryCount,
              size: isNaN(memorySize) ? 0 : memorySize,
              hitRate: this.calculateHitRate(),
              memoryUsage: isNaN(memorySize) ? 0 : memorySize,
            };
            resolve(fallbackResult);
          };
        } catch (error) {
          console.error('获取缓存统计失败:', error);
          const fallbackResult = {
            count: memoryCount,
            size: isNaN(memorySize) ? 0 : memorySize,
            hitRate: this.calculateHitRate(),
            memoryUsage: isNaN(memorySize) ? 0 : memorySize,
          };
          resolve(fallbackResult);
        }
      });
    } catch (error) {
      console.error('获取缓存统计失败:', error);
      return {
        count: 0,
        size: 0,
        hitRate: 0,
        memoryUsage: 0,
      };
    }
  }

  // 计算缓存命中率
  private calculateHitRate(): number {
    const total = this.hitCount + this.missCount;
    const rate = total > 0 ? (this.hitCount / total) * 100 : 0;
    return isNaN(rate) ? 0 : rate;
  }

  // 重置统计信息
  resetStats(): void {
    this.hitCount = 0;
    this.missCount = 0;
  }

  // 获取详细统计信息
  async getDetailedStats(): Promise<{
    basic: CacheStats;
    topEntries: Array<{ key: string; accessCount: number; size: number }>;
    oldestEntries: Array<{ key: string; timestamp: number; age: string }>;
  }> {
    const basic = await this.getStats();
    
    // 获取访问最多的条目
    const topEntries = Array.from(this.cache.values())
      .sort((a, b) => (b.accessCount || 0) - (a.accessCount || 0))
      .slice(0, 10)
      .map(entry => ({
        key: entry.key.substring(0, 8) + '...',
        accessCount: entry.accessCount || 0,
        size: CacheUtils.calculateEntrySize(entry),
      }));

    // 获取最老的条目
    const now = Date.now();
    const oldestEntries = Array.from(this.cache.values())
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(0, 10)
      .map(entry => ({
        key: entry.key.substring(0, 8) + '...',
        timestamp: entry.timestamp,
        age: CacheUtils.humanReadableSize(now - entry.timestamp, 0) + 'ms',
      }));

    return {
      basic,
      topEntries,
      oldestEntries,
    };
  }

  // 更新配置
  async updateConfig(newConfig: Partial<CacheConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await storageApi.set(TRANSLATION_CACHE_CONFIG_KEY, this.config);
    
    // 配置更新后立即检查是否需要清理缓存
    await this.cleanupIfNeeded();
  }

  // 检查并清理缓存（如果超过限制）
  private async cleanupIfNeeded(): Promise<void> {
    try {
      const stats = await this.getStats();
      // 如果缓存数量超过限制，删除最旧的条目
      if (stats.count > this.config.maxSize) {
        const toDelete = stats.count - this.config.maxSize;
        await this.removeOldestEntries(toDelete);
      }
    } catch (error) {
      console.error('缓存清理检查失败:', error);
    }
  }

  // 删除最旧的缓存条目
  private async removeOldestEntries(count: number): Promise<void> {
    if (count <= 0) return;

    try {
      await this.initDB();
      
      if (!this.db) {
        console.warn('数据库未初始化，无法删除缓存条目');
        return;
      }

      const objectStore = this.db.transaction(['cache'], 'readwrite').objectStore('cache');
      
      // 获取所有缓存条目
      const request = objectStore.getAll();
      
      request.onsuccess = () => {
        const entries = request.result;

        // 按时间戳排序
        entries.sort((a, b) => {
          if (a.timestamp && b.timestamp) {
            return a.timestamp - b.timestamp;
          }
          // 如果没有时间戳，按key排序作为备选
          return a.key.localeCompare(b.key);
        });
        
        // 删除最旧的count个条目
        const toDelete = entries.slice(0, count);
        
        let deletedCount = 0;
        toDelete.forEach(entry => {
          const deleteRequest = objectStore.delete(entry.key);
          deleteRequest.onsuccess = () => {
            deletedCount++;
          };
          deleteRequest.onerror = () => {
            console.error('删除缓存条目失败:', deleteRequest.error, 'key:', entry.key);
          };
        });
        
        // 同时从内存缓存中删除
        toDelete.forEach(entry => {
          this.cache.delete(entry.key);
        });
      };
      
      request.onerror = () => {
        console.error('获取缓存条目失败:', request.error);
      };
    } catch (error) {
      console.error('删除最旧缓存条目失败:', error);
    }
  }

  // 预热缓存 - 批量加载常用翻译
  async preloadCache(translations: Array<{
    text: string;
    translation: string;
    from: string;
    to: string;
    engine: string;
  }>): Promise<void> {
    
    const batchSize = 10;
    for (let i = 0; i < translations.length; i += batchSize) {
      const batch = translations.slice(i, i + batchSize);
      await Promise.all(
        batch.map(({ text, translation, from, to, engine }) =>
          this.set(text, translation, from, to, engine)
        )
      );
    }
    
  }

  // 导出缓存数据
  async exportCache(): Promise<TranslationCache[]> {
    await this.initDB();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      try {
        const objectStore = this.db!.transaction(['cache'], 'readonly').objectStore('cache');
        const request = objectStore.getAll();

        request.onsuccess = () => {
          resolve(request.result);
        };

        request.onerror = () => {
          console.error('导出缓存失败:', request.error);
          reject(request.error);
        };
      } catch (error) {
        reject(error);
      }
    });
  }

  // 导入缓存数据
  async importCache(data: TranslationCache[]): Promise<void> {
    
    for (const entry of data) {
      await this.addInDB(entry);
      this.cache.set(entry.key, entry);
    }
    
  }

  // 优雅关闭缓存管理器
  async dispose(): Promise<void> {
    try {
      // 停止定期清理
      if (this.initPromise) {
        await this.initPromise;
      }
      
      // 关闭数据库连接
      if (this.db) {
        this.db.close();
        this.db = null;
      }
      
      // 清空内存缓存
      this.cache.clear();
      
    } catch (error) {
      console.error('关闭缓存管理器失败:', error);
    }
  }
}

// 创建全局缓存管理器实例
export const cacheManager = new TranslationCacheManager();

// 辅助函数：格式化缓存统计信息
export function formatCacheStats(stats: CacheStats): string {
  return `缓存统计: 
  条目数: ${stats.count}
  大小: ${CacheUtils.humanReadableSize(stats.size)}
  命中率: ${stats.hitRate.toFixed(2)}%
  内存使用: ${CacheUtils.humanReadableSize(stats.memoryUsage)}`;
}

// 辅助函数：创建缓存键（用于调试）
export async function createCacheKey(text: string, from: string, to: string, engine: string): Promise<string> {
  return CacheUtils.getCacheKey(text, from, to, engine);
}