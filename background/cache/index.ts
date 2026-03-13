import type { GlobalSettings } from '~lib/constants/types';
import { cacheManager } from '~lib/cache/cache';
import { GLOBAL_SETTINGS_KEY } from '~lib/settings/settings';
import { translationCacheRepository } from '~lib/storage/indexed_db';
import { storageApi } from '~lib/storage/storage';

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

type CacheAction = 'clean' | 'reschedule' | 'stats' | 'list' | 'clear';

async function getCleanupInterval() {
  try {
    const settings = (await storageApi.get(GLOBAL_SETTINGS_KEY)) as GlobalSettings | undefined;
    const maxAge = settings?.cache?.maxAge ?? 24 * 60 * 60 * 1000;

    return Math.max(Math.min(maxAge / 2, 12 * 60 * 60 * 1000), 60 * 1000);
  } catch (error) {
    console.error('Failed to resolve cache cleanup interval:', error);
    return 60 * 60 * 1000;
  }
}

export async function scheduleCacheCleanup() {
  if (cleanupTimer) {
    clearInterval(cleanupTimer);
  }

  const interval = await getCleanupInterval();
  cleanupTimer = setInterval(() => {
    void cleanCache();
  }, interval);
}

export async function cleanCache() {
  try {
    await cacheManager.initDB();
    await cacheManager.cleanupExpiredCache();
  } catch (error) {
    console.error('Failed to clean expired cache:', error);
  }
}

export async function handleCacheMessage(action: CacheAction) {
  if (action === 'clean') {
    await cleanCache();
    return { success: true };
  }

  if (action === 'reschedule') {
    await cleanCache();
    await scheduleCacheCleanup();
    return { success: true };
  }

  if (action === 'stats') {
    return {
      success: true,
      data: await cacheManager.getStats(),
    };
  }

  if (action === 'list') {
    return {
      success: true,
      data: await translationCacheRepository.getEntries(),
    };
  }

  if (action === 'clear') {
    await cacheManager.clear();
    return { success: true };
  }

  return { success: false, error: `Unknown cache action: ${action}` };
}

void cleanCache();
void scheduleCacheCleanup();
