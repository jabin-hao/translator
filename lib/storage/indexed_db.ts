import type { FavoriteWord, GlobalSettings, TranslationCacheEntry } from '../constants/types';
import { GLOBAL_SETTINGS_KEY } from '../settings/settings';
import { storageApi } from './storage';

const DB_NAME = 'translator-data';
const DB_VERSION = 1;
const FAVORITES_STORE = 'favorites';
const TRANSLATION_CACHE_STORE = 'translationCache';

const FAVORITES_UPDATED_EVENT = 'FAVORITES_UPDATED';
const CACHE_UPDATED_EVENT = 'CACHE_UPDATED';

const DEFAULT_CACHE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;
const DEFAULT_CACHE_MAX_ENTRIES = 5000;
const DEFAULT_FAVORITES_MAX_ENTRIES = 1000;
const FAVORITES_MAX_BYTES = 2 * 1024 * 1024;
const CACHE_MAX_BYTES = 15 * 1024 * 1024;

const textEncoder = new TextEncoder();

type FavoriteRecord = FavoriteWord & {
  fingerprint: string;
};

type StoreName = typeof FAVORITES_STORE | typeof TRANSLATION_CACHE_STORE;

interface FavoritesPolicy {
  maxEntries: number;
  maxBytes: number;
}

interface CachePolicy {
  maxEntries: number;
  maxAge: number;
  maxBytes: number;
}

const estimateBytes = (value: unknown) => textEncoder.encode(JSON.stringify(value)).length;

const normalizeFavoriteFingerprint = (
  favorite: Pick<FavoriteWord, 'originalText' | 'translatedText'>
) =>
  `${favorite.originalText.trim().toLowerCase()}::${favorite.translatedText
    .trim()
    .toLowerCase()}`;

const sortFavorites = (favorites: FavoriteWord[]) =>
  [...favorites].sort((a, b) => b.timestamp - a.timestamp);

const sortCacheEntries = (entries: TranslationCacheEntry[]) =>
  [...entries].sort(
    (a, b) =>
      Math.max(b.lastAccessed || 0, b.timestamp || 0) -
      Math.max(a.lastAccessed || 0, a.timestamp || 0)
  );

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = () => {
      const db = request.result;

      if (!db.objectStoreNames.contains(FAVORITES_STORE)) {
        const favoritesStore = db.createObjectStore(FAVORITES_STORE, {
          keyPath: 'id',
        });
        favoritesStore.createIndex('by_timestamp', 'timestamp');
        favoritesStore.createIndex('by_fingerprint', 'fingerprint', { unique: true });
      }

      if (!db.objectStoreNames.contains(TRANSLATION_CACHE_STORE)) {
        const cacheStore = db.createObjectStore(TRANSLATION_CACHE_STORE, {
          keyPath: 'key',
        });
        cacheStore.createIndex('by_last_accessed', 'lastAccessed');
        cacheStore.createIndex('by_timestamp', 'timestamp');
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB'));
  });
}

async function withStore<T>(
  storeName: StoreName,
  mode: IDBTransactionMode,
  operation: (store: IDBObjectStore, transaction: IDBTransaction) => Promise<T>
): Promise<T> {
  const db = await openDatabase();

  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const store = transaction.objectStore(storeName);
    let operationResult: T;
    let didFinishOperation = false;

    transaction.onabort = () => {
      db.close();
      reject(transaction.error || new Error(`Transaction aborted for store ${storeName}`));
    };
    transaction.onerror = () => {
      db.close();
      reject(transaction.error || new Error(`Transaction failed for store ${storeName}`));
    };
    transaction.oncomplete = () => {
      db.close();
      if (didFinishOperation) {
        resolve(operationResult);
      }
    };

    void operation(store, transaction)
      .then((result) => {
        operationResult = result;
        didFinishOperation = true;

        if (mode === 'readonly') {
          resolve(operationResult);
        }
      })
      .catch((error) => {
        try {
          transaction.abort();
        } catch {
          // noop
        }
        reject(error);
      });
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
  });
}

async function getGlobalSettings() {
  return (await storageApi.get<GlobalSettings>(GLOBAL_SETTINGS_KEY)) || undefined;
}

async function getFavoritesPolicy(): Promise<FavoritesPolicy> {
  const settings = await getGlobalSettings();

  return {
    maxEntries: Math.max(settings?.favorites?.maxSize || DEFAULT_FAVORITES_MAX_ENTRIES, 1),
    maxBytes: FAVORITES_MAX_BYTES,
  };
}

async function getCachePolicy(): Promise<CachePolicy> {
  const settings = await getGlobalSettings();

  return {
    maxAge: Math.max(settings?.cache?.maxAge || DEFAULT_CACHE_MAX_AGE, 0),
    maxEntries: Math.max(settings?.cache?.maxSize || DEFAULT_CACHE_MAX_ENTRIES, 1),
    maxBytes: CACHE_MAX_BYTES,
  };
}

async function notifyRuntime(type: string) {
  if (!chrome?.runtime?.sendMessage) {
    return;
  }

  try {
    await chrome.runtime.sendMessage({ type });
  } catch {
    // ignore when there are no listeners
  }
}

function normalizeFavoriteRecord(item: FavoriteWord): FavoriteRecord {
  const originalText = item.originalText.trim();
  const translatedText = item.translatedText.trim();

  return {
    id: item.id,
    originalText,
    translatedText,
    timestamp: Number.isFinite(item.timestamp) ? item.timestamp : Date.now(),
    fingerprint: normalizeFavoriteFingerprint({ originalText, translatedText }),
  };
}

function toFavoriteWord(record: FavoriteRecord): FavoriteWord {
  return {
    id: record.id,
    originalText: record.originalText,
    translatedText: record.translatedText,
    timestamp: record.timestamp,
  };
}

function applyFavoritesPolicy(
  favorites: FavoriteWord[],
  policy: FavoritesPolicy
): FavoriteRecord[] {
  const deduped = new Map<string, FavoriteRecord>();

  sortFavorites(
    favorites.filter((item) => item.originalText?.trim() && item.translatedText?.trim())
  ).forEach((item) => {
    const normalized = normalizeFavoriteRecord(item);
    if (!deduped.has(normalized.fingerprint)) {
      deduped.set(normalized.fingerprint, normalized);
    }
  });

  const nextFavorites = [...deduped.values()].slice(0, policy.maxEntries);

  while (nextFavorites.length > 0 && estimateBytes(nextFavorites) > policy.maxBytes) {
    nextFavorites.pop();
  }

  return nextFavorites;
}

function normalizeCacheEntry(entry: TranslationCacheEntry): TranslationCacheEntry {
  const now = Date.now();
  return {
    ...entry,
    id: entry.key,
    key: entry.key,
    timestamp: Number.isFinite(entry.timestamp) ? entry.timestamp : now,
    lastAccessed: Number.isFinite(entry.lastAccessed) ? entry.lastAccessed : now,
    accessCount: Number.isFinite(entry.accessCount) ? entry.accessCount : 0,
  };
}

function applyCachePolicy(
  entries: TranslationCacheEntry[],
  policy: CachePolicy
): TranslationCacheEntry[] {
  const now = Date.now();
  const deduped = new Map<string, TranslationCacheEntry>();

  sortCacheEntries(
    entries.filter((entry) => {
      const normalized = normalizeCacheEntry(entry);
      return (
        normalized.text?.trim() &&
        normalized.translation?.trim() &&
        now - Math.max(normalized.lastAccessed, normalized.timestamp) <= policy.maxAge
      );
    })
  ).forEach((entry) => {
    const normalized = normalizeCacheEntry(entry);
    if (!deduped.has(normalized.key)) {
      deduped.set(normalized.key, normalized);
    }
  });

  const nextEntries = [...deduped.values()].slice(0, policy.maxEntries);

  while (nextEntries.length > 0 && estimateBytes(nextEntries) > policy.maxBytes) {
    nextEntries.pop();
  }

  return nextEntries;
}

async function replaceAllInStore<T>(
  storeName: StoreName,
  items: T[]
) {
  await withStore(storeName, 'readwrite', async (store) => {
    await requestToPromise(store.clear());
    await Promise.all(items.map((item) => requestToPromise(store.put(item))));
    return undefined;
  });

  await notifyRuntime(
    storeName === FAVORITES_STORE ? FAVORITES_UPDATED_EVENT : CACHE_UPDATED_EVENT
  );
}

export class FavoritesRepository {
  async list(): Promise<FavoriteWord[]> {
    return withStore(FAVORITES_STORE, 'readonly', async (store) => {
      const items = (await requestToPromise(store.getAll())) as FavoriteRecord[];
      return sortFavorites(items.map(toFavoriteWord));
    });
  }

  async replace(favorites: FavoriteWord[]): Promise<boolean> {
    const policy = await getFavoritesPolicy();
    const nextFavorites = applyFavoritesPolicy(favorites, policy);
    await replaceAllInStore(FAVORITES_STORE, nextFavorites);
    return true;
  }

  async add(favorite: Omit<FavoriteWord, 'id' | 'timestamp'>): Promise<boolean> {
    const currentFavorites = await this.list();
    const nextFavorite: FavoriteWord = {
      id: `fav_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`,
      originalText: favorite.originalText,
      translatedText: favorite.translatedText,
      timestamp: Date.now(),
    };

    return this.replace([nextFavorite, ...currentFavorites]);
  }

  async delete(id: string): Promise<boolean> {
    const currentFavorites = await this.list();
    return this.replace(currentFavorites.filter((item) => item.id !== id));
  }

  async clear(): Promise<boolean> {
    await replaceAllInStore(FAVORITES_STORE, [] as FavoriteRecord[]);
    return true;
  }

  async search(query: string): Promise<FavoriteWord[]> {
    const normalizedQuery = query.trim().toLowerCase();
    const favorites = await this.list();

    if (!normalizedQuery) {
      return favorites;
    }

    return favorites.filter(
      (item) =>
        item.originalText.toLowerCase().includes(normalizedQuery) ||
        item.translatedText.toLowerCase().includes(normalizedQuery)
    );
  }
}

export class TranslationCacheRepository {
  private buildKey(text: string, from: string, to: string, engine: string) {
    return `${engine}_${from}_${to}_${btoa(encodeURIComponent(text)).replace(/[+/=]/g, '')}`;
  }

  async getEntries(): Promise<TranslationCacheEntry[]> {
    return withStore(TRANSLATION_CACHE_STORE, 'readonly', async (store) => {
      const entries = (await requestToPromise(store.getAll())) as TranslationCacheEntry[];
      return sortCacheEntries(entries.map(normalizeCacheEntry));
    });
  }

  async get(text: string, from: string, to: string, engine: string): Promise<string | null> {
    const key = this.buildKey(text, from, to, engine);

    return withStore(TRANSLATION_CACHE_STORE, 'readonly', async (store) => {
      const entry = (await requestToPromise(
        store.get(key)
      )) as TranslationCacheEntry | undefined;

      return entry ? normalizeCacheEntry(entry).translation : null;
    });
  }

  async touch(text: string, from: string, to: string, engine: string): Promise<boolean> {
    const key = this.buildKey(text, from, to, engine);

    await withStore(TRANSLATION_CACHE_STORE, 'readwrite', async (store) => {
      const entry = (await requestToPromise(
        store.get(key)
      )) as TranslationCacheEntry | undefined;

      if (!entry) {
        return undefined;
      }

      const normalized = normalizeCacheEntry(entry);
      await requestToPromise(
        store.put({
          ...normalized,
          lastAccessed: Date.now(),
          accessCount: normalized.accessCount + 1,
        })
      );

      return undefined;
    });

    return true;
  }

  async setMany(
    items: Array<{
      text: string;
      translation: string;
      from: string;
      to: string;
      engine: string;
    }>
  ): Promise<boolean> {
    if (items.length === 0) {
      return true;
    }

    const existingEntries = await this.getEntries();
    const now = Date.now();
    const merged = new Map(existingEntries.map((entry) => [entry.key, entry] as const));

    items.forEach((item) => {
      const key = this.buildKey(item.text, item.from, item.to, item.engine);
      merged.set(key, {
        id: key,
        key,
        text: item.text,
        translation: item.translation,
        from: item.from,
        to: item.to,
        engine: item.engine,
        timestamp: now,
        lastAccessed: now,
        accessCount: 1,
      });
    });

    const policy = await getCachePolicy();
    const nextEntries = applyCachePolicy([...merged.values()], policy);
    await replaceAllInStore(TRANSLATION_CACHE_STORE, nextEntries);
    return true;
  }

  async clear(): Promise<boolean> {
    await replaceAllInStore(TRANSLATION_CACHE_STORE, [] as TranslationCacheEntry[]);
    return true;
  }

  async cleanupExpired(maxAge?: number): Promise<boolean> {
    const policy = await getCachePolicy();
    const nextPolicy: CachePolicy = {
      ...policy,
      maxAge: typeof maxAge === 'number' ? maxAge : policy.maxAge,
    };

    const existingEntries = await this.getEntries();
    const nextEntries = applyCachePolicy(existingEntries, nextPolicy);
    await replaceAllInStore(TRANSLATION_CACHE_STORE, nextEntries);
    return true;
  }

  async getStats() {
    const entries = await this.getEntries();
    return {
      count: entries.length,
      size: estimateBytes(entries),
    };
  }
}

export const favoritesRepository = new FavoritesRepository();
export const translationCacheRepository = new TranslationCacheRepository();
export const storageEvents = {
  favoritesUpdated: FAVORITES_UPDATED_EVENT,
  cacheUpdated: CACHE_UPDATED_EVENT,
} as const;
