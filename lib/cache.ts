// 翻译缓存管理模块 - 参考 Traduzir-paginas-web 实现
import { Storage } from "@plasmohq/storage"
import { DEFAULT_CACHE_CONFIG } from './constants';

// 缓存条目接口
export interface TranslationCache {
  originalText: string;
  translatedText: string;
  detectedLanguage: string;
  key: string;
  timestamp: number; // 缓存创建时间戳
}

export interface CacheConfig {
  maxAge: number; // 缓存最大年龄（毫秒）
  maxSize: number; // 最大缓存条目数
}

// 工具类
class Utils {
  // 生成SHA1哈希
  static async stringToSHA1String(message: string): Promise<string> {
    const encoder = new TextEncoder();
    const data = encoder.encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-1', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  // 生成缓存key（text+from+to+engine，全部为翻译用code）
  static async getCacheKey(text: string, from: string, to: string, engine: string): Promise<string> {
    // 只用原始code，不用tts
    return await Utils.stringToSHA1String(`${text}||${from}||${to}||${engine}`);
  }

  // 将字节转换为人类可读的字符串
  static humanReadableSize(bytes: number): string {
    const thresh = 1024;
    if (Math.abs(bytes) < thresh) {
      return bytes + " B";
    }
    const units = ["KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
    let u = -1;
    do {
      bytes /= thresh;
      ++u;
    } while (Math.abs(bytes) >= thresh && u < units.length - 1);
    return bytes.toFixed(1) + " " + units[u];
  }
}

// 缓存管理类
export class TranslationCacheManager {
  private config: CacheConfig;
  private storage: Storage;
  private db: IDBDatabase | null = null;
  private cache = new Map<string, TranslationCache>();
  private initPromise: Promise<void> | null = null; // 添加初始化锁

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.storage = new Storage();
    
    // 从storage中读取用户配置
    this.loadConfig().catch(error => {
      console.error('初始化时加载配置失败:', error);
    });
  }

  // 从storage加载配置
  private async loadConfig(): Promise<void> {
    try {
      const config = await this.storage.get('translation_cache_config');
      console.log('从storage加载的缓存配置:', config);
      
      if (config && typeof config === 'object') {
        this.config = { ...this.config, ...config };
        console.log('合并后的缓存配置:', this.config);
      } else {
        console.log('使用默认缓存配置:', this.config);
      }
    } catch (error) {
      console.error('加载缓存配置失败:', error);
      console.log('使用默认缓存配置:', this.config);
    }
  }

  // 获取缓存
  async get(text: string, from: string, to: string, engine: string): Promise<string | null> {
    try {
      const hash = await Utils.getCacheKey(text, from, to, engine);
      
      // 先从内存缓存查找
      let translation = this.cache.get(hash);
      if (translation) {
        return translation.translatedText;
      }

      // 从 IndexedDB 查找
      translation = await this.queryInDB(hash);
      if (translation) {
        this.cache.set(hash, translation);
        return translation.translatedText;
      }

      return null;
    } catch (error) {
      console.error('获取翻译缓存失败:', error);
      return null;
    }
  }

  // 设置缓存
  async set(text: string, translation: string, from: string, to: string, engine: string): Promise<void> {
    try {
      const hash = await Utils.getCacheKey(text, from, to, engine);
      
      const cacheEntry: TranslationCache = {
        originalText: text,
        translatedText: translation,
        detectedLanguage: from,
        key: hash,
        timestamp: Date.now(), // 设置时间戳
      };

      // 保存到内存缓存
      this.cache.set(hash, cacheEntry);

      // 保存到 IndexedDB
      await this.addInDB(cacheEntry);
      
      console.log(`已添加缓存条目: ${hash}, 当前配置: maxSize=${this.config.maxSize}`);
      
      // 检查缓存数量，如果超过限制则清理最旧的条目
      await this.cleanupIfNeeded();
      
    } catch (error) {
      console.error('设置翻译缓存失败:', error);
      throw error;
    }
  }

  // 删除缓存
  async remove(text: string, from: string, to: string, engine: string): Promise<void> {
    try {
      const hash = await Utils.getCacheKey(text, from, to, engine);
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

      request.onupgradeneeded = (event) => {
        const db = request.result;
        const oldVersion = event.oldVersion;
        const newVersion = event.newVersion;
        
        console.log(`IndexedDB 版本升级: ${oldVersion} -> ${newVersion}`);
        
        try {
          if (!db.objectStoreNames.contains('cache')) {
            const objectStore = db.createObjectStore('cache', { keyPath: 'key' });
            objectStore.createIndex('key', 'key', { unique: true });
            objectStore.createIndex('timestamp', 'timestamp', { unique: false });
            console.log('创建了新的 cache 对象存储');
          } else {
            // 如果对象存储已存在，检查是否需要添加timestamp索引
            const objectStore = db.transaction(['cache'], 'readwrite').objectStore('cache');
            if (!objectStore.indexNames.contains('timestamp')) {
              objectStore.createIndex('timestamp', 'timestamp', { unique: false });
              console.log('添加了 timestamp 索引');
            }
          }
        } catch (error) {
          console.error('数据库升级失败:', error);
          reject(error);
        }
      };
    });
  }

  // 获取缓存统计信息
  async getStats(): Promise<{ count: number; size: number }> {
    try {
      await this.initDB();
      
      if (!this.db) {
        return { count: 0, size: 0 };
      }

      return new Promise((resolve) => {
        try {
          const objectStore = this.db!.transaction(['cache'], 'readonly').objectStore('cache');
          const request = objectStore.getAll();

          request.onsuccess = () => {
            const entries = request.result;
            const count = entries.length;
            const size = entries.reduce((total, entry) => {
              return total + JSON.stringify(entry).length;
            }, 0);

            resolve({ count, size });
          };

          request.onerror = () => {
            console.error('获取缓存统计失败:', request.error);
            resolve({ count: 0, size: 0 });
          };
        } catch (error) {
          console.error('获取缓存统计失败:', error);
          resolve({ count: 0, size: 0 });
        }
      });
    } catch (error) {
      console.error('获取缓存统计失败:', error);
      return { count: 0, size: 0 };
    }
  }

  // 更新配置
  async updateConfig(newConfig: Partial<CacheConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig };
    await this.storage.set('translation_cache_config', this.config);
    
    // 配置更新后立即检查是否需要清理缓存
    await this.cleanupIfNeeded();
  }

  // 检查并清理缓存（如果超过限制）
  private async cleanupIfNeeded(): Promise<void> {
    try {
      console.log('开始检查缓存清理需求...');
      const stats = await this.getStats();
      console.log(`当前缓存统计: 数量=${stats.count}, 大小=${Utils.humanReadableSize(stats.size)}`);
      console.log(`缓存配置: maxSize=${this.config.maxSize}, maxAge=${this.config.maxAge}ms`);
      
      // 如果缓存数量超过限制，删除最旧的条目
      if (stats.count > this.config.maxSize) {
        const toDelete = stats.count - this.config.maxSize;
        console.log(`缓存数量超过限制，需要删除 ${toDelete} 个条目`);
        await this.removeOldestEntries(toDelete);
      } else {
        console.log('缓存数量在限制范围内，无需清理');
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

      console.log(`开始清理缓存，需要删除 ${count} 个条目`);

      const objectStore = this.db.transaction(['cache'], 'readwrite').objectStore('cache');
      
      // 获取所有缓存条目
      const request = objectStore.getAll();
      
      request.onsuccess = () => {
        const entries = request.result;
        console.log(`当前缓存总数: ${entries.length}, 最大限制: ${this.config.maxSize}`);
        
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
        console.log(`准备删除 ${toDelete.length} 个最旧的缓存条目`);
        
        let deletedCount = 0;
        toDelete.forEach(entry => {
          const deleteRequest = objectStore.delete(entry.key);
          deleteRequest.onsuccess = () => {
            deletedCount++;
            console.log(`已删除缓存条目: ${entry.key}, 时间戳: ${new Date(entry.timestamp).toLocaleString()}`);
          };
          deleteRequest.onerror = () => {
            console.error('删除缓存条目失败:', deleteRequest.error, 'key:', entry.key);
          };
        });
        
        // 同时从内存缓存中删除
        toDelete.forEach(entry => {
          this.cache.delete(entry.key);
        });
        
        console.log(`缓存清理完成，删除了 ${deletedCount} 个条目，剩余缓存数量: ${entries.length - count}`);
      };
      
      request.onerror = () => {
        console.error('获取缓存条目失败:', request.error);
      };
    } catch (error) {
      console.error('删除最旧缓存条目失败:', error);
    }
  }
}

// 创建全局缓存管理器实例
export const cacheManager = new TranslationCacheManager(); 