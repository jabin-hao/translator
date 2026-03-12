import type {
  CustomDictionaryEntry,
  DomainSetting,
  FavoriteWord,
  TranslationCacheEntry,
} from '../constants/types';
import {
  hasExtensionContextBeenInvalidated,
  logExtensionError,
} from '../utils/extensionContext';

const STORAGE_KEYS = {
  FAVORITES: 'favorites',
  CUSTOM_DICTIONARY: 'customDictionary',
  DOMAIN_SETTINGS: 'domainSettings',
  TRANSLATION_CACHE: 'translationCache',
} as const;

type CollectionKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

class ChromeStorageManager {
  async getCollection<T>(key: CollectionKey): Promise<T[]> {
    if (hasExtensionContextBeenInvalidated()) {
      return [];
    }

    try {
      if (!chrome?.storage?.local) {
        console.warn('Chrome storage not available');
        return [];
      }

      const result = await chrome.storage.local.get(key);
      // Old content scripts can observe a half-torn-down extension context during reloads.
      // In that state Chrome may resolve with an undefined payload instead of throwing.
      if (!result || typeof result !== 'object') {
        return [];
      }

      const collection = result[key];
      return Array.isArray(collection) ? collection : [];
    } catch (error) {
      logExtensionError(`Failed to load collection "${key}"`, error);
      return [];
    }
  }

  async setCollection<T>(key: CollectionKey, data: T[]): Promise<boolean> {
    if (hasExtensionContextBeenInvalidated()) {
      return false;
    }

    try {
      if (!chrome?.storage?.local) {
        console.warn('Chrome storage not available');
        return false;
      }

      await chrome.storage.local.set({ [key]: data });
      return true;
    } catch (error) {
      logExtensionError(`Failed to save collection "${key}"`, error);
      return false;
    }
  }

  async updateCollection<T>(
    key: CollectionKey,
    updater: (items: T[]) => T[]
  ): Promise<boolean> {
    const items = await this.getCollection<T>(key);
    return this.setCollection(key, updater(items));
  }
}

class EntityCollectionStore<T extends { id: string }> {
  constructor(
    private readonly storage: ChromeStorageManager,
    private readonly key: CollectionKey
  ) {}

  async getAll(): Promise<T[]> {
    return this.storage.getCollection<T>(this.key);
  }

  async replaceAll(items: T[]): Promise<boolean> {
    return this.storage.setCollection(this.key, items);
  }

  async add(item: T): Promise<boolean> {
    return this.storage.updateCollection<T>(this.key, (items) => [...items, item]);
  }

  async update(item: T): Promise<boolean> {
    return this.storage.updateCollection<T>(this.key, (items) =>
      items.map((current) => (current.id === item.id ? item : current))
    );
  }

  async delete(id: string): Promise<boolean> {
    return this.storage.updateCollection<T>(this.key, (items) =>
      items.filter((item) => item.id !== id)
    );
  }

  async clear(): Promise<boolean> {
    return this.storage.setCollection(this.key, []);
  }
}

export const chromeStorage = new ChromeStorageManager();

const favoritesStore = new EntityCollectionStore<FavoriteWord>(
  chromeStorage,
  STORAGE_KEYS.FAVORITES
);
const dictionaryStore = new EntityCollectionStore<CustomDictionaryEntry>(
  chromeStorage,
  STORAGE_KEYS.CUSTOM_DICTIONARY
);
const cacheStore = new EntityCollectionStore<TranslationCacheEntry>(
  chromeStorage,
  STORAGE_KEYS.TRANSLATION_CACHE
);

export class FavoritesManager {
  async getFavorites(): Promise<FavoriteWord[]> {
    return favoritesStore.getAll();
  }

  async replaceFavorites(favorites: FavoriteWord[]): Promise<boolean> {
    return favoritesStore.replaceAll(favorites);
  }

  async addFavorite(favorite: Omit<FavoriteWord, 'id' | 'timestamp'>): Promise<boolean> {
    return favoritesStore.add({
      ...favorite,
      id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    });
  }

  async deleteFavorite(id: string): Promise<boolean> {
    return favoritesStore.delete(id);
  }

  async clearFavorites(): Promise<boolean> {
    return favoritesStore.clear();
  }

  async searchFavorites(query: string): Promise<FavoriteWord[]> {
    const normalizedQuery = query.toLowerCase();
    const favorites = await this.getFavorites();

    return favorites.filter(
      (favorite) =>
        favorite.originalText.toLowerCase().includes(normalizedQuery) ||
        favorite.translatedText.toLowerCase().includes(normalizedQuery)
    );
  }
}

export class CustomDictionaryManager {
  async getDictionary(): Promise<CustomDictionaryEntry[]> {
    return dictionaryStore.getAll();
  }

  async addEntry(
    entry: Omit<CustomDictionaryEntry, 'id' | 'timestamp'>
  ): Promise<boolean> {
    return dictionaryStore.add({
      ...entry,
      id: `dict_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      timestamp: Date.now(),
    });
  }

  async updateEntry(entry: CustomDictionaryEntry): Promise<boolean> {
    return dictionaryStore.update(entry);
  }

  async deleteEntry(id: string): Promise<boolean> {
    return dictionaryStore.delete(id);
  }

  async clearDictionary(): Promise<boolean> {
    return dictionaryStore.clear();
  }

  async getDictionaryByDomain(domain: string): Promise<CustomDictionaryEntry[]> {
    const dictionary = await this.getDictionary();
    return dictionary.filter((entry) => entry.domain === domain && entry.isActive);
  }

  async findTranslation(
    domain: string,
    original: string
  ): Promise<CustomDictionaryEntry | undefined> {
    const dictionary = await this.getDictionaryByDomain(domain);
    return dictionary.find(
      (entry) => entry.original.toLowerCase() === original.toLowerCase()
    );
  }
}

export class DomainSettingsManager {
  async getDomainSettings(): Promise<DomainSetting[]> {
    return chromeStorage.getCollection<DomainSetting>(STORAGE_KEYS.DOMAIN_SETTINGS);
  }

  async setDomainSetting(setting: Omit<DomainSetting, 'timestamp'>): Promise<boolean> {
    const newSetting: DomainSetting = {
      ...setting,
      timestamp: Date.now(),
    };

    return chromeStorage.updateCollection<DomainSetting>(
      STORAGE_KEYS.DOMAIN_SETTINGS,
      (settings) => {
        const nextSettings = settings.filter(
          (current) => current.domain !== newSetting.domain
        );
        return [...nextSettings, newSetting];
      }
    );
  }

  async deleteDomainSetting(domain: string): Promise<boolean> {
    return chromeStorage.updateCollection<DomainSetting>(
      STORAGE_KEYS.DOMAIN_SETTINGS,
      (settings) => settings.filter((setting) => setting.domain !== domain)
    );
  }

  async clearDomainSettings(): Promise<boolean> {
    return chromeStorage.setCollection(STORAGE_KEYS.DOMAIN_SETTINGS, []);
  }

  async isWhitelisted(domain: string): Promise<boolean> {
    const settings = await this.getDomainSettings();
    const setting = settings.find((item) => item.domain === domain);
    return Boolean(setting?.enabled && setting.type === 'whitelist');
  }

  async getWhitelistedDomains(): Promise<string[]> {
    const settings = await this.getDomainSettings();
    return settings
      .filter((setting) => setting.enabled && setting.type === 'whitelist')
      .map((setting) => setting.domain);
  }
}

export class TranslationCacheManager {
  private generateCacheKey(text: string, from: string, to: string, engine: string): string {
    return `${engine}_${from}_${to}_${btoa(encodeURIComponent(text)).replace(/[+/=]/g, '')}`;
  }

  async getEntries(): Promise<TranslationCacheEntry[]> {
    return cacheStore.getAll();
  }

  async get(text: string, from: string, to: string, engine: string): Promise<string | null> {
    try {
      const key = this.generateCacheKey(text, from, to, engine);
      const entries = await this.getEntries();
      const entry = entries.find((item) => item.key === key);

      if (!entry) {
        return null;
      }

      await cacheStore.update({
        ...entry,
        lastAccessed: Date.now(),
        accessCount: entry.accessCount + 1,
      });

      return entry.translation;
    } catch (error) {
      logExtensionError('Failed to read translation cache', error);
      return null;
    }
  }

  async set(
    text: string,
    translation: string,
    from: string,
    to: string,
    engine: string
  ): Promise<boolean> {
    try {
      const key = this.generateCacheKey(text, from, to, engine);
      const entry: TranslationCacheEntry = {
        id: key,
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

      const entries = await this.getEntries();
      const nextEntries = entries.filter((item) => item.key !== key);
      nextEntries.push(entry);

      if (nextEntries.length > 10000) {
        nextEntries.sort((a, b) => b.lastAccessed - a.lastAccessed);
        nextEntries.splice(9000);
      }

      return cacheStore.replaceAll(nextEntries);
    } catch (error) {
      logExtensionError('Failed to write translation cache', error);
      return false;
    }
  }

  async clear(): Promise<boolean> {
    return cacheStore.clear();
  }

  async cleanupExpired(maxAge = 30 * 24 * 60 * 60 * 1000): Promise<boolean> {
    const now = Date.now();
    const entries = await this.getEntries();
    const validEntries = entries.filter((entry) => now - entry.timestamp < maxAge);
    return cacheStore.replaceAll(validEntries);
  }

  async getStats(): Promise<{ count: number; size: number }> {
    try {
      const entries = await this.getEntries();
      return {
        count: entries.length,
        size: JSON.stringify(entries).length,
      };
    } catch (error) {
      logExtensionError('Failed to get cache stats', error);
      return { count: 0, size: 0 };
    }
  }
}

export const favoritesManager = new FavoritesManager();
export const customDictionaryManager = new CustomDictionaryManager();
export const domainSettingsManager = new DomainSettingsManager();
export const translationCacheManager = new TranslationCacheManager();
