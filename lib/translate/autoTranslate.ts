import { lazyFullPageTranslate } from '~lib/translate/fullPageTranslate';
import { GLOBAL_SETTINGS_KEY, DEFAULT_SETTINGS } from '~lib/settings/globalSettings';
import type { GlobalSettings } from '~lib/settings/globalSettings';
import { storageApi } from '~lib/storage/storage';
import { IndexedDBManager, DATABASE_CONFIGS } from '~lib/storage/indexedDB';
import type { DomainSetting } from '~lib/storage/indexedHooks';

// 获取全局配置
const getGlobalSettings = async (): Promise<GlobalSettings> => {
  const settings = await storageApi.get(GLOBAL_SETTINGS_KEY);
  if (typeof settings === 'string') {
    try {
      return JSON.parse(settings);
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return settings || DEFAULT_SETTINGS;
};

// 获取域名设置
const getDomainSettings = async (): Promise<DomainSetting[]> => {
  try {
    const dbManager = new IndexedDBManager(DATABASE_CONFIGS.USER_DATA);
    await dbManager.init();
    return await dbManager.getAll<DomainSetting>('domainSettings');
  } catch (error) {
    console.error('获取域名设置失败:', error);
    return [];
  }
};

// 网站匹配逻辑 - 从 siteTranslateSettings 迁移
const matchSiteList = (list: string[], url: string): boolean => {
  console.log('[AutoTranslate] matchSiteList 检查:', { list, url });
  
  return list.some(item => {
    if (item === url) {
      console.log('[AutoTranslate] 精确匹配:', item);
      return true;
    }
    if (item.includes('*')) {
      const regex = new RegExp(item.replace(/\*/g, '.*'));
      const match = regex.test(url);
      console.log('[AutoTranslate] 通配符匹配:', { item, url, match });
      return match;
    }
    
    // 简单的域名匹配
    if (url.startsWith(item)) {
      console.log('[AutoTranslate] 前缀匹配:', item);
      return true;
    }
    
    return false;
  });
};

// 自动翻译逻辑
export const setupAutoTranslate = (
  pageTargetLang: string,
  engine: string,
  stopTTSAPI: () => Promise<void>
) => {
  // 整页翻译自动触发逻辑
  const triggerFullPageTranslation = async () => {
    const host = window.location.hostname;
    const path = window.location.pathname;
    const fullUrl = path === '/' ? host : host + path;
    
    console.log('[AutoTranslate] 检查自动翻译:', { host, path, fullUrl });
    
    try {
      const settings = await getGlobalSettings();
      const pageTranslateConfig = settings.pageTranslate;
      
      console.log('[AutoTranslate] 页面翻译配置:', pageTranslateConfig);
      
      if (!pageTranslateConfig.autoTranslate) {
        console.log('[AutoTranslate] 自动翻译已禁用');
        return;
      }
      
      // 获取域名设置
      const domainSettings = await getDomainSettings();
      console.log('[AutoTranslate] 域名设置:', domainSettings);
      
      const neverList = domainSettings
        .filter(setting => setting.type === 'blacklist' && setting.enabled)
        .map(setting => setting.domain);
      const alwaysList = domainSettings
        .filter(setting => setting.type === 'whitelist' && setting.enabled)
        .map(setting => setting.domain);
        
      console.log('[AutoTranslate] 黑白名单:', { neverList, alwaysList });
      
      if (matchSiteList(neverList, fullUrl)) {
        console.log('[AutoTranslate] 网站在黑名单中，跳过翻译');
        return;
      }
      
      if (matchSiteList(alwaysList, fullUrl)) {
        console.log('[AutoTranslate] 网站在白名单中，开始自动翻译');
        if (typeof (window as any).__autoFullPageTranslated === 'undefined') {
          (window as any).__autoFullPageTranslated = true;
          const mode = (pageTranslateConfig.mode || 'translated') as 'translated' | 'compare';
          
          console.log('[AutoTranslate] 执行全页翻译:', { mode, pageTargetLang, engine });
          const result = await lazyFullPageTranslate(pageTargetLang, mode, engine);
          
          // 更新全局状态
          const state = (window as any).__translationState;
          state.stopTranslation = result.stop;
          state.isPageTranslated = true;
          
          // 通知 popup 更新状态
          if (chrome?.runtime?.id) {
            try {
              await chrome.runtime.sendMessage({type: 'FULL_PAGE_TRANSLATE_DONE'});
            } catch (error) {
              // 忽略消息发送错误，可能是因为扩展上下文已失效
              console.warn('消息发送失败，可能是扩展上下文已失效:', error);
            }
          }
        }
      }
    } catch (error) {
      console.error('自动翻译过程中发生错误:', error);
    }
  };

  // 监听页面加载完成事件
  const handleLoad = () => {
    // 延迟执行，确保 DOM 已完全加载
    setTimeout(() => {
      triggerFullPageTranslation().then(() => {});
    }, 100);
  };

  // 监听页面卸载事件
  const handleBeforeUnload = () => {
    // 在页面卸载前，停止所有 TTS 播放
    stopTTSAPI().then(() => {});
  };

  // 监听页面内容变化事件
  const handleContentChange = () => {
    // 当页面内容发生变化时，重新触发整页翻译
    triggerFullPageTranslation().then(() => {});
  };

  // 监听页面卸载事件
  window.addEventListener('beforeunload', handleBeforeUnload);
  // 监听页面加载完成事件
  window.addEventListener('load', handleLoad);
  // 监听页面内容变化事件
  document.addEventListener('DOMContentLoaded', handleContentChange);
  document.addEventListener('readystatechange', () => {
    if (document.readyState === 'interactive') {
      handleContentChange(); // 在交互状态时也触发一次
    }
  });

  // 如果页面已经加载完成，立即触发一次
  if (document.readyState === 'complete') {
    setTimeout(() => triggerFullPageTranslation(), 100);
  }

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('load', handleLoad);
    document.removeEventListener('DOMContentLoaded', handleContentChange);
    document.removeEventListener('readystatechange', () => {});
  };
}; 