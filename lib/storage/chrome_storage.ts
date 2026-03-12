import type { CustomDictionaryEntry, DomainSetting } from '../constants/types';
import {
  hasExtensionContextBeenInvalidated,
  logExtensionError,
} from '../utils/extensionContext';

const STORAGE_KEYS = {
  CUSTOM_DICTIONARY: 'customDictionary',
  DOMAIN_SETTINGS: 'domainSettings',
} as const;

type CollectionKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

class ChromeStorageManager {
  async getCollection<T>(key: CollectionKey): Promise<T[]> {
    if (hasExtensionContextBeenInvalidated()) {
      return [];
    }

    try {
      if (!chrome?.storage?.local) {
        return [];
      }

      const result = await chrome.storage.local.get(key);
      const collection = result?.[key];
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

const chromeStorage = new ChromeStorageManager();
const dictionaryStore = new EntityCollectionStore<CustomDictionaryEntry>(
  chromeStorage,
  STORAGE_KEYS.CUSTOM_DICTIONARY
);

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

export const customDictionaryManager = new CustomDictionaryManager();
export const domainSettingsManager = new DomainSettingsManager();
