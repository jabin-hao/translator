// 处理缓存清理和定时任务
import { cacheManager } from '~lib/cache/cache';
import { GLOBAL_SETTINGS_KEY } from '~lib/settings/settings';
import type { GlobalSettings } from '~lib/settings/settings';
import {storageApi} from "~lib/storage/storage";

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

async function getCleanupInterval() {
  try {
    // 优先从全局配置获取 maxAge
    const settings = (await storageApi.get(GLOBAL_SETTINGS_KEY)) as unknown as GlobalSettings | undefined;
    const maxAge = settings?.cache?.maxAge;
    // 取 maxAge/2，最小1分钟，最大12小时
    return Math.max(Math.min(maxAge / 2, 12 * 60 * 60 * 1000), 60 * 1000);
  } catch (error) {
    console.error('获取清理间隔失败:', error);
  }
}

export async function scheduleCacheCleanup() {
  if (cleanupTimer) clearInterval(cleanupTimer);
  const interval = await getCleanupInterval();
  cleanupTimer = setInterval(cleanCache, interval);
}

// 立即清理一次过期缓存
export async function cleanCache() {
  try {
    await cacheManager.initDB(); // 确保数据库已初始化
    
    // 获取清理前的统计信息
    const beforeStats = await cacheManager.getStats();

    // 调用正确的清理过期缓存方法
    const result = await cacheManager.cleanupExpired();
    
    // 获取清理后的统计信息
    const afterStats = await cacheManager.getStats();
    
  } catch (error) {
    console.error('[缓存清理] 清理过期缓存失败:', error);
  }
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