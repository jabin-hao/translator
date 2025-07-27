// 翻译缓存管理模块 - 参考 Traduzir-paginas-web 实现
import { Storage } from "@plasmohq/storage"

// 缓存条目接口
export interface TranslationCache {
  originalText: string;
  translatedText: string;
  detectedLanguage: string;
  key: string;
}

export interface CacheConfig {
  maxAge: number; // 缓存最大年龄（毫秒）
  maxSize: number; // 最大缓存条目数
}

// 默认缓存配置
export const DEFAULT_CACHE_CONFIG: CacheConfig = {
  maxAge: 24 * 60 * 60 * 1000, // 24小时
  maxSize: 1000, // 最大1000条缓存
};

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

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.storage = new Storage();
  }

  // 获取缓存
  async get(text: string, from: string, to: string, engine: string): Promise<string | null> {
    try {
      const hash = await Utils.getCacheKey(text, from, to, engine);
      console.log('查找缓存键:', hash);
      
      // 先从内存缓存查找
      let translation = this.cache.get(hash);
      if (translation) {
        console.log('从内存缓存获取翻译结果:', translation.translatedText);
        return translation.translatedText;
      }

      // 从 IndexedDB 查找
      translation = await this.queryInDB(hash);
      if (translation) {
        this.cache.set(hash, translation);
        console.log('从 IndexedDB 获取翻译结果:', translation.translatedText);
        return translation.translatedText;
      }

      console.log('缓存中没有找到翻译结果');
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
      console.log('生成缓存键:', hash);
      
      const cacheEntry: TranslationCache = {
        originalText: text,
        translatedText: translation,
        detectedLanguage: from,
        key: hash,
      };

      console.log('准备保存缓存数据:', cacheEntry);

      // 保存到内存缓存
      this.cache.set(hash, cacheEntry);

      // 保存到 IndexedDB
      await this.addInDB(cacheEntry);
      
      console.log('缓存保存成功');
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
      console.log('开始清空所有缓存...');
      
      // 清空内存缓存
      this.cache.clear();
      
      // 清空 IndexedDB
      if (this.db) {
        const objectStore = this.db.transaction(['cache'], 'readwrite').objectStore('cache');
        await new Promise<void>((resolve, reject) => {
          const request = objectStore.clear();
          request.onsuccess = () => resolve();
          request.onerror = () => reject(request.error);
        });
      }
      
      console.log('所有缓存已清空');
    } catch (error) {
      console.error('清空翻译缓存失败:', error);
    }
  }

  // 从 IndexedDB 查询
  private async queryInDB(hash: string): Promise<TranslationCache | null> {
    if (!this.db) return null;

    return new Promise((resolve, reject) => {
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
    });
  }

  // 添加到 IndexedDB
  private async addInDB(data: TranslationCache): Promise<boolean> {
    if (!this.db) return false;

    return new Promise((resolve) => {
      const objectStore = this.db!.transaction(['cache'], 'readwrite').objectStore('cache');
      const request = objectStore.put(data);

      request.onsuccess = () => {
        resolve(true);
      };

      request.onerror = () => {
        console.error('保存到 IndexedDB 失败:', request.error);
        resolve(false);
      };
    });
  }

  // 从 IndexedDB 删除
  private async removeFromDB(hash: string): Promise<void> {
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const objectStore = this.db!.transaction(['cache'], 'readwrite').objectStore('cache');
      const request = objectStore.delete(hash);

      request.onsuccess = () => {
        resolve();
      };

      request.onerror = () => {
        console.error('从 IndexedDB 删除失败:', request.error);
        reject(request.error);
      };
    });
  }

  // 初始化 IndexedDB
  async initDB(): Promise<void> {
    if (this.db) return;

    return new Promise((resolve, reject) => {
      const request = indexedDB.open('TranslationCache', 1);

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
        if (!db.objectStoreNames.contains('cache')) {
          const objectStore = db.createObjectStore('cache', { keyPath: 'key' });
          objectStore.createIndex('key', 'key', { unique: true });
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
      });
    } catch (error) {
      console.error('获取缓存统计失败:', error);
      return { count: 0, size: 0 };
    }
  }

  // 更新配置
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// 创建全局缓存管理器实例
export const cacheManager = new TranslationCacheManager(); 