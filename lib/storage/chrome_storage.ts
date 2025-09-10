/**
 * Chrome Storage API 封装
 * 替代 IndexedDB，使用更稳定的 chrome.storage.local
 */

export interface FavoriteWord {
  id: string;
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
  engine: string;
  timestamp: number;
  // 兼容字段
  word?: string; // 向后兼容
  translation?: string; // 向后兼容
  notes?: string;
  tags?: string[];
}

export interface CustomDictionaryEntry {
  id: string;
  domain: string;
  original: string;
  translation: string;
  isActive: boolean;
  timestamp: number;
}

export interface DomainSetting {
  domain: string;
  enabled: boolean;
  type: 'whitelist' | 'blacklist';
  timestamp: number;
}

export interface TranslationCacheEntry {
  id: string; // 使用id作为主键，与其他实体保持一致
  key: string; // 保留key用于快速查找
  text: string;
  translation: string;
  from: string;
  to: string;
  engine: string;
  timestamp: number;
  lastAccessed: number;
  accessCount: number;
}

// Storage Keys
const STORAGE_KEYS = {
  FAVORITES: 'favorites',
  CUSTOM_DICTIONARY: 'customDictionary',
  DOMAIN_SETTINGS: 'domainSettings',
  TRANSLATION_CACHE: 'translationCache',
} as const;

class ChromeStorageManager {
  /**
   * 获取数据
   */
  async get<T>(key: string): Promise<T[]> {
    try {
      if (!chrome?.storage?.local) {
        console.warn('Chrome storage not available');
        return [];
      }
      
      const result = await chrome.storage.local.get(key);
      return result[key] || [];
    } catch (error) {
      console.error('Failed to get data from chrome storage:', error);
      return [];
    }
  }

  /**
   * 设置数据
   */
  async set<T>(key: string, data: T[]): Promise<boolean> {
    try {
      if (!chrome?.storage?.local) {
        console.warn('Chrome storage not available');
        return false;
      }
      
      await chrome.storage.local.set({ [key]: data });
      return true;
    } catch (error) {
      console.error('Failed to set data to chrome storage:', error);
      return false;
    }
  }

  /**
   * 添加单个项目
   */
  async addItem<T extends { id: string }>(key: string, item: T): Promise<boolean> {
    try {
      const items = await this.get<T>(key);
      items.push(item);
      return await this.set(key, items);
    } catch (error) {
      console.error('Failed to add item:', error);
      return false;
    }
  }

  /**
   * 更新单个项目
   */
  async updateItem<T extends { id: string }>(key: string, item: T): Promise<boolean> {
    try {
      const items = await this.get<T>(key);
      const index = items.findIndex(i => i.id === item.id);
      if (index >= 0) {
        items[index] = item;
        return await this.set(key, items);
      }
      return false;
    } catch (error) {
      console.error('Failed to update item:', error);
      return false;
    }
  }

  /**
   * 删除单个项目
   */
  async deleteItem<T extends { id: string }>(key: string, id: string): Promise<boolean> {
    try {
      const items = await this.get<T>(key);
      const filtered = items.filter(i => i.id !== id);
      return await this.set(key, filtered);
    } catch (error) {
      console.error('Failed to delete item:', error);
      return false;
    }
  }

  /**
   * 清空数据
   */
  async clear(key: string): Promise<boolean> {
    try {
      return await this.set(key, []);
    } catch (error) {
      console.error('Failed to clear data:', error);
      return false;
    }
  }

  /**
   * 根据条件查询
   */
  async query<T>(key: string, predicate: (item: T) => boolean): Promise<T[]> {
    try {
      const items = await this.get<T>(key);
      return items.filter(predicate);
    } catch (error) {
      console.error('Failed to query data:', error);
      return [];
    }
  }
}

// 创建全局实例
export const chromeStorage = new ChromeStorageManager();

// 收藏夹管理
export class FavoritesManager {
  async getFavorites(): Promise<FavoriteWord[]> {
    return await chromeStorage.get<FavoriteWord>(STORAGE_KEYS.FAVORITES);
  }

  async addFavorite(favorite: Omit<FavoriteWord, 'id' | 'timestamp'>): Promise<boolean> {
    const newFavorite: FavoriteWord = {
      ...favorite,
      id: `fav_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    return await chromeStorage.addItem(STORAGE_KEYS.FAVORITES, newFavorite);
  }

  async deleteFavorite(id: string): Promise<boolean> {
    return await chromeStorage.deleteItem<FavoriteWord>(STORAGE_KEYS.FAVORITES, id);
  }

  async clearFavorites(): Promise<boolean> {
    return await chromeStorage.clear(STORAGE_KEYS.FAVORITES);
  }

  async searchFavorites(query: string): Promise<FavoriteWord[]> {
    return await chromeStorage.query<FavoriteWord>(STORAGE_KEYS.FAVORITES, (fav) =>
      fav.originalText.toLowerCase().includes(query.toLowerCase()) ||
      fav.translatedText.toLowerCase().includes(query.toLowerCase())
    );
  }
}

// 自定义词库管理
export class CustomDictionaryManager {
  async getDictionary(): Promise<CustomDictionaryEntry[]> {
    return await chromeStorage.get<CustomDictionaryEntry>(STORAGE_KEYS.CUSTOM_DICTIONARY);
  }

  async addEntry(entry: Omit<CustomDictionaryEntry, 'id' | 'timestamp'>): Promise<boolean> {
    const newEntry: CustomDictionaryEntry = {
      ...entry,
      id: `dict_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
    };
    return await chromeStorage.addItem(STORAGE_KEYS.CUSTOM_DICTIONARY, newEntry);
  }

  async updateEntry(entry: CustomDictionaryEntry): Promise<boolean> {
    return await chromeStorage.updateItem(STORAGE_KEYS.CUSTOM_DICTIONARY, entry);
  }

  async deleteEntry(id: string): Promise<boolean> {
    return await chromeStorage.deleteItem<CustomDictionaryEntry>(STORAGE_KEYS.CUSTOM_DICTIONARY, id);
  }

  async clearDictionary(): Promise<boolean> {
    return await chromeStorage.clear(STORAGE_KEYS.CUSTOM_DICTIONARY);
  }

  async getDictionaryByDomain(domain: string): Promise<CustomDictionaryEntry[]> {
    return await chromeStorage.query<CustomDictionaryEntry>(STORAGE_KEYS.CUSTOM_DICTIONARY, (entry) =>
      entry.domain === domain && entry.isActive
    );
  }

  async findTranslation(domain: string, original: string): Promise<CustomDictionaryEntry | undefined> {
    const entries = await this.getDictionaryByDomain(domain);
    return entries.find(entry => 
      entry.original.toLowerCase() === original.toLowerCase()
    );
  }
}

// 域名设置管理
export class DomainSettingsManager {
  async getDomainSettings(): Promise<DomainSetting[]> {
    return await chromeStorage.get<DomainSetting>(STORAGE_KEYS.DOMAIN_SETTINGS);
  }

  async setDomainSetting(setting: Omit<DomainSetting, 'timestamp'>): Promise<boolean> {
    const settings = await this.getDomainSettings();
    const existingIndex = settings.findIndex(s => s.domain === setting.domain);
    
    const newSetting: DomainSetting = {
      ...setting,
      timestamp: Date.now(),
    };

    if (existingIndex >= 0) {
      settings[existingIndex] = newSetting;
    } else {
      settings.push(newSetting);
    }

    return await chromeStorage.set(STORAGE_KEYS.DOMAIN_SETTINGS, settings);
  }

  async deleteDomainSetting(domain: string): Promise<boolean> {
    const settings = await this.getDomainSettings();
    const filtered = settings.filter(s => s.domain !== domain);
    return await chromeStorage.set(STORAGE_KEYS.DOMAIN_SETTINGS, filtered);
  }

  async clearDomainSettings(): Promise<boolean> {
    return await chromeStorage.clear(STORAGE_KEYS.DOMAIN_SETTINGS);
  }

  async isWhitelisted(domain: string): Promise<boolean> {
    const settings = await this.getDomainSettings();
    const setting = settings.find(s => s.domain === domain);
    return setting ? setting.enabled && setting.type === 'whitelist' : false;
  }

  async getWhitelistedDomains(): Promise<string[]> {
    const settings = await this.getDomainSettings();
    return settings
      .filter(s => s.enabled && s.type === 'whitelist')
      .map(s => s.domain);
  }
}

// 翻译缓存管理
export class TranslationCacheManager {
  private generateCacheKey(text: string, from: string, to: string, engine: string): string {
    return `${engine}_${from}_${to}_${btoa(encodeURIComponent(text)).replace(/[+/=]/g, '')}`;
  }

  async get(text: string, from: string, to: string, engine: string): Promise<string | null> {
    try {
      const key = this.generateCacheKey(text, from, to, engine);
      const cacheEntries = await chromeStorage.get<TranslationCacheEntry>(STORAGE_KEYS.TRANSLATION_CACHE);
      const entry = cacheEntries.find(e => e.key === key);
      
      if (entry) {
        // 更新访问统计
        entry.lastAccessed = Date.now();
        entry.accessCount++;
        await chromeStorage.updateItem(STORAGE_KEYS.TRANSLATION_CACHE, entry);
        return entry.translation;
      }
      
      return null;
    } catch (error) {
      console.error('Failed to get from cache:', error);
      return null;
    }
  }

  async set(text: string, translation: string, from: string, to: string, engine: string): Promise<boolean> {
    try {
      const key = this.generateCacheKey(text, from, to, engine);
      const entry: TranslationCacheEntry = {
        id: key, // 使用key作为id
        key,
        text,
        translation,
        from,
        to,
        engine,
        timestamp: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 1,
      };

      const cacheEntries = await chromeStorage.get<TranslationCacheEntry>(STORAGE_KEYS.TRANSLATION_CACHE);
      const existingIndex = cacheEntries.findIndex(e => e.key === key);
      
      if (existingIndex >= 0) {
        cacheEntries[existingIndex] = entry;
      } else {
        cacheEntries.push(entry);
      }

      // 检查缓存大小，如果超过限制则清理旧缓存
      if (cacheEntries.length > 10000) {
        // 按最后访问时间排序，删除最旧的1000条
        cacheEntries.sort((a, b) => b.lastAccessed - a.lastAccessed);
        cacheEntries.splice(9000);
      }

      return await chromeStorage.set(STORAGE_KEYS.TRANSLATION_CACHE, cacheEntries);
    } catch (error) {
      console.error('Failed to set cache:', error);
      return false;
    }
  }

  async clear(): Promise<boolean> {
    return await chromeStorage.clear(STORAGE_KEYS.TRANSLATION_CACHE);
  }

  async cleanupExpired(maxAge: number = 30 * 24 * 60 * 60 * 1000): Promise<boolean> {
    try {
      const now = Date.now();
      const cacheEntries = await chromeStorage.get<TranslationCacheEntry>(STORAGE_KEYS.TRANSLATION_CACHE);
      const validEntries = cacheEntries.filter(entry => now - entry.timestamp < maxAge);
      return await chromeStorage.set(STORAGE_KEYS.TRANSLATION_CACHE, validEntries);
    } catch (error) {
      console.error('Failed to cleanup expired cache:', error);
      return false;
    }
  }

  /**
   * 获取缓存统计信息
   */
  async getStats(): Promise<{ count: number; size: number }> {
    try {
      const cacheEntries = await chromeStorage.get<TranslationCacheEntry>(STORAGE_KEYS.TRANSLATION_CACHE);
      const count = cacheEntries.length;
      
      // 估算缓存大小 (基于JSON字符串长度)
      const sizeInBytes = JSON.stringify(cacheEntries).length;
      
      return {
        count,
        size: sizeInBytes
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        count: 0,
        size: 0
      };
    }
  }
}

// 导出管理器实例
export const favoritesManager = new FavoritesManager();
export const customDictionaryManager = new CustomDictionaryManager();
export const domainSettingsManager = new DomainSettingsManager();
export const translationCacheManager = new TranslationCacheManager();
