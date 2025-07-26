// 翻译缓存管理模块
import { Storage } from "@plasmohq/storage"

// 更紧凑的缓存接口，参考Traduzir-paginas-web项目
export interface TranslationCache {
  o: string; // originalText - 原文
  t: string; // translatedText - 译文
  ts: number; // timestamp - 时间戳
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

// 生成SHA1哈希（简化版本）
async function generateSHA1(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest('SHA-1', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const fullHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  // 只使用前16位，减少键名长度
  return fullHash.substring(0, 16);
}

// 生成更紧凑的缓存键，使用SHA1哈希
export async function generateCacheKey(text: string, from: string, to: string, engine: string): Promise<string> {
  const hash = await generateSHA1(text);
  // 使用更紧凑的格式：c:engine:from:to:hash
  return `c:${engine}:${from}:${to}:${hash}`;
}

// 缓存管理类
export class TranslationCacheManager {
  private config: CacheConfig;
  private storage: Storage;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = { ...DEFAULT_CACHE_CONFIG, ...config };
    this.storage = new Storage();
  }

  // 获取缓存
  async get(text: string, from: string, to: string, engine: string): Promise<string | null> {
    try {
      const key = await generateCacheKey(text, from, to, engine);
      console.log('查找缓存键:', key);
      
      const cacheData = await this.storage.get(key);
      console.log('找到的缓存数据:', cacheData, '类型:', typeof cacheData);

      if (!cacheData) {
        console.log('缓存不存在');
        return null;
      }

      // 处理不同的数据格式
      let cache: TranslationCache;
      if (typeof cacheData === 'string') {
        try {
          cache = JSON.parse(cacheData);
          console.log('成功解析JSON字符串缓存:', cache);
        } catch (parseError) {
          console.error('JSON解析失败:', parseError);
          return null;
        }
      } else if (cacheData && typeof cacheData === 'object') {
        cache = cacheData as TranslationCache;
      } else {
        console.error('缓存数据格式无效:', cacheData);
        return null;
      }

      // 检查缓存是否过期
      const now = Date.now();
      const age = now - cache.ts;
      console.log('缓存验证:', {
        text: cache.o, // 原文
        translation: cache.t, // 译文
        timestamp: cache.ts,
        timestampDate: new Date(cache.ts).toISOString(),
        now: now,
        nowDate: new Date(now).toISOString(),
        age: age,
        maxAge: this.config.maxAge,
        isValid: age <= this.config.maxAge
      });
      
      if (age > this.config.maxAge) {
        console.log('缓存已过期，删除缓存');
        // 删除过期缓存
        await this.remove(text, from, to, engine);
        return null;
      }

      console.log('返回缓存翻译结果:', cache.t);
      return cache.t;
    } catch (error) {
      console.error('获取翻译缓存失败:', error);
      return null;
    }
  }

  // 设置缓存
  async set(text: string, translation: string, from: string, to: string, engine: string): Promise<void> {
    try {
      const key = await generateCacheKey(text, from, to, engine);
      console.log('生成缓存键:', key);
      
      const timestamp = Date.now();
      console.log('当前时间戳:', timestamp, '对应时间:', new Date(timestamp).toISOString());
      
      const cache: TranslationCache = {
        o: text, // 原文
        t: translation, // 译文
        ts: timestamp,
      };

      console.log('准备保存缓存数据:', cache);

      // 检查缓存大小限制
      await this.enforceCacheSizeLimit();

      await this.storage.set(key, cache);
      console.log('缓存保存成功');
    } catch (error) {
      console.error('设置翻译缓存失败:', error);
      throw error; // 重新抛出错误以便上层处理
    }
  }

  // 删除缓存
  async remove(text: string, from: string, to: string, engine: string): Promise<void> {
    try {
      const key = await generateCacheKey(text, from, to, engine);
      await this.storage.remove(key);
    } catch (error) {
      console.error('删除翻译缓存失败:', error);
    }
  }

  // 清空所有缓存
  async clear(): Promise<void> {
    try {
      const allData = await this.storage.getAll();
      const cacheKeys = Object.keys(allData).filter(key => 
        key.startsWith('c:')
      );
      
      // 逐个删除缓存键
      for (const key of cacheKeys) {
        await this.storage.remove(key);
      }
    } catch (error) {
      console.error('清空翻译缓存失败:', error);
    }
  }

  // 获取缓存统计信息
  async getStats(): Promise<{ count: number; size: number }> {
    try {
      console.log('开始获取缓存统计...');
      const allData = await this.storage.getAll();
      console.log('所有存储数据:', allData);
      
      const cacheEntries = Object.entries(allData).filter(([key]) => 
        key.startsWith('c:')
      );
      console.log('找到的缓存条目:', cacheEntries);

      const now = Date.now();
      console.log('当前时间戳:', now, '对应时间:', new Date(now).toISOString());
      console.log('缓存最大年龄:', this.config.maxAge, 'ms (', this.config.maxAge / (1000 * 60 * 60), '小时)');
      
      // 收集需要删除的无效缓存条目
      const invalidEntries: string[] = [];
      
      const validEntries = cacheEntries.filter(([key, value]) => {
        console.log('检查缓存条目:', { key, value, valueType: typeof value });
        
        let cache: TranslationCache;
        
        // 处理不同的数据格式
        if (typeof value === 'string') {
          try {
            // 尝试解析JSON字符串
            cache = JSON.parse(value);
            console.log('成功解析JSON字符串缓存:', cache);
          } catch (parseError) {
            console.log('JSON解析失败:', {
              key,
              value,
              error: parseError,
              action: '将删除此条目'
            });
            invalidEntries.push(key);
            return false;
          }
        } else if (value && typeof value === 'object') {
          // 直接使用对象
          cache = value as unknown as TranslationCache;
        } else {
          console.log('缓存条目值格式无效:', {
            key,
            value,
            valueType: typeof value,
            action: '将删除此条目'
          });
          invalidEntries.push(key);
          return false;
        }
        
        // 验证时间戳是否有效
        if (!cache.ts || isNaN(cache.ts) || cache.ts <= 0) {
          console.log('发现无效时间戳的缓存条目:', {
            key,
            text: cache.o,
            timestamp: cache.ts,
            cacheObject: cache,
            action: '将删除此条目'
          });
          invalidEntries.push(key);
          return false;
        }
        
        // 验证时间戳是否为未来时间（超过当前时间1小时）
        if (cache.ts > now + 3600000) {
          console.log('发现未来时间戳的缓存条目:', {
            key,
            text: cache.o,
            timestamp: cache.ts,
            timestampDate: new Date(cache.ts).toISOString(),
            action: '将删除此条目'
          });
          invalidEntries.push(key);
          return false;
        }
        
        const age = now - cache.ts;
        const isValid = age <= this.config.maxAge;
        
        try {
          console.log('缓存条目验证:', {
            key,
            text: cache.o,
            translation: cache.t,
            timestamp: cache.ts,
            timestampDate: new Date(cache.ts).toISOString(),
            age: age,
            maxAge: this.config.maxAge,
            isValid: isValid
          });
        } catch (dateError) {
          console.log('缓存条目时间戳格式化失败:', {
            key,
            text: cache.o,
            timestamp: cache.ts,
            error: dateError,
            action: '将删除此条目'
          });
          invalidEntries.push(key);
          return false;
        }
        
        return isValid;
      });

      // 删除无效的缓存条目
      if (invalidEntries.length > 0) {
        console.log('开始清理无效缓存条目:', invalidEntries);
        for (const key of invalidEntries) {
          try {
            await this.storage.remove(key);
            console.log('已删除无效缓存条目:', key);
          } catch (error) {
            console.error('删除无效缓存条目失败:', key, error);
          }
        }
        console.log('无效缓存条目清理完成');
      }

      const result = {
        count: validEntries.length,
        size: this.calculateCacheSize(validEntries),
      };
      console.log('缓存统计结果:', result);
      return result;
    } catch (error) {
      console.error('获取缓存统计失败:', error);
      return { count: 0, size: 0 };
    }
  }

  // 计算缓存大小（字节）
  private calculateCacheSize(entries: [string, any][]): number {
    let totalSize = 0;
    
    for (const [key, value] of entries) {
      console.log('分析缓存条目大小:', { key, value });
      
      // 计算键的大小（UTF-8编码）
      const keySize = new TextEncoder().encode(key).length;
      console.log('键大小:', key, '=', keySize, '字节');
      totalSize += keySize;
      
      // 计算值的大小
      let valueSize = 0;
      if (typeof value === 'string') {
        valueSize = new TextEncoder().encode(value).length;
        console.log('值大小(字符串):', value, '=', valueSize, '字节');
      } else if (value && typeof value === 'object') {
        const jsonString = JSON.stringify(value);
        valueSize = new TextEncoder().encode(jsonString).length;
        console.log('值大小(对象):', jsonString, '=', valueSize, '字节');
      }
      totalSize += valueSize;
      
      console.log('条目总大小:', keySize + valueSize, '字节');
    }
    
    console.log('缓存总大小:', totalSize, '字节');
    return totalSize;
  }

  // 强制执行缓存大小限制
  private async enforceCacheSizeLimit(): Promise<void> {
    try {
      const allData = await this.storage.getAll();
      const cacheEntries = Object.entries(allData).filter(([key]) => 
        key.startsWith('c:')
      );

      if (cacheEntries.length >= this.config.maxSize) {
        // 按时间戳排序，删除最旧的缓存
        const sortedEntries = cacheEntries.sort(([, a], [, b]) => {
          const cacheA = a as unknown as TranslationCache;
          const cacheB = b as unknown as TranslationCache;
          return cacheA.ts - cacheB.ts;
        });

        // 删除最旧的条目，保留空间给新条目
        const entriesToRemove = sortedEntries.slice(0, Math.ceil(this.config.maxSize * 0.1));
        
        // 逐个删除缓存键
        for (const [key] of entriesToRemove) {
          await this.storage.remove(key);
        }
      }
    } catch (error) {
      console.error('强制执行缓存大小限制失败:', error);
    }
  }

  // 更新配置
  updateConfig(newConfig: Partial<CacheConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// 创建全局缓存管理器实例
export const cacheManager = new TranslationCacheManager(); 