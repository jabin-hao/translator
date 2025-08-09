// 处理缓存清理和定时任务
import { cacheManager } from '~lib/cache/cache';
import {DEFAULT_CACHE_CONFIG, TRANSLATION_CACHE_CONFIG_KEY} from '~lib/constants/settings';
import {storageApi} from "~lib/utils/storage";

let cleanupTimer: ReturnType<typeof setInterval> | null = null;

async function getCleanupInterval() {
  // 从配置中获取清理间隔
  let raw = await storageApi.get(TRANSLATION_CACHE_CONFIG_KEY);
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

// 立即清理一次过期缓存
export async function cleanCache() {
  try {
    console.log('[缓存清理] 开始清理过期缓存...');
    await cacheManager.initDB(); // 确保数据库已初始化
    
    // 获取清理前的统计信息
    const beforeStats = await cacheManager.getStats();
    console.log(`[缓存清理] 清理前: ${beforeStats.count} 个缓存条目, 大小: ${beforeStats.size} 字节`);
    
    // 调用正确的清理过期缓存方法
    const result = await cacheManager.cleanupExpired();
    
    console.log(`[缓存清理] ${result.message}`);
    
    // 获取清理后的统计信息
    const afterStats = await cacheManager.getStats();
    console.log(`[缓存清理] 清理后: ${afterStats.count} 个缓存条目, 大小: ${afterStats.size} 字节`);
    
    if (result.removed > 0) {
      console.log(`[缓存清理] 成功清理了 ${result.removed} 个过期缓存条目`);
    } else {
      console.log('[缓存清理] 没有发现过期的缓存条目');
    }
    
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