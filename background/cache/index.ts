// 处理缓存清理和定时任务
import { cacheManager } from '~lib/cache/cache';
import {DEFAULT_CACHE_CONFIG, TRANSLATION_CACHE_CONFIG_KEY} from '~lib/constants/settings';
import {getConfig} from "~lib/utils/storage";

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

async function getCleanupInterval() {
  // 从配置中获取清理间隔
  let raw = await getConfig(TRANSLATION_CACHE_CONFIG_KEY, '');
  let config: any = raw;
  if (typeof raw === 'string') {
    try {
      config = JSON.parse(raw);
    } catch (e) {
      config = DEFAULT_CACHE_CONFIG;
    }
  }
  if (!config || typeof config.maxAge !== 'number') {
    config = DEFAULT_CACHE_CONFIG;
  }
  // 取 maxAge/2，最小1分钟，最大12小时
  return Math.max(Math.min(config.maxAge / 2, 12 * 60 * 60 * 1000), 60 * 1000);
}

export async function scheduleCacheCleanup() {
  if (cleanupTimer) clearInterval(cleanupTimer);
  const interval = await getCleanupInterval();
  cleanupTimer = setInterval(cleanCache, interval);
}

// 立即清理一次
export async function cleanCache() {
  await cacheManager.clear();
}

// 消息处理（可供 background/messages/cache.ts 调用）
export async function handleCacheMessage(action: string, body: any) {
  if (action === 'clean') {
    await cleanCache();
    return { success: true };
  }
  if (action === 'reschedule') {
    await scheduleCacheCleanup();
    return { success: true };
  }
  return { success: false, error: 'Unknown cache action' };
}

// 启动时立即清理并定时
cleanCache().then(() => {});
scheduleCacheCleanup().then(() => {});