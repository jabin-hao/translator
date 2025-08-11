import { lazyFullPageTranslate } from '~lib/translate/fullPageTranslate';
import { GLOBAL_SETTINGS_KEY, DEFAULT_SETTINGS } from '~lib/settings/globalSettings';
import type { GlobalSettings } from '~lib/settings/globalSettings';
import { storageApi } from '~lib/utils/storage';

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

// 网站匹配逻辑 - 从 siteTranslateSettings 迁移
const matchSiteList = (list: string[], url: string): boolean => {
  if (list.includes(url)) {
    return true;
  }
  
  try {
    const u = new URL(url.startsWith('http') ? url : 'https://' + url);
    let path = u.pathname;

    while (path && path !== '/') {
      const test = u.hostname + path;
      if (list.includes(test)) {
        return true;
      }
      path = path.substring(0, path.lastIndexOf('/'));
    }
    
    return list.includes(u.hostname);
  } catch (error) {
    return list.some(item => url.startsWith(item));
  }
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
    
    try {
      const settings = await getGlobalSettings();
      const pageTranslateConfig = settings.pageTranslate;
      
      if (!pageTranslateConfig.autoTranslateEnabled) {
        return;
      }
      
      if (matchSiteList(pageTranslateConfig.neverList || [], fullUrl)) {
        return;
      }
      
      if (matchSiteList(pageTranslateConfig.alwaysList || [], fullUrl)) {
        if (typeof (window as any).__autoFullPageTranslated === 'undefined') {
          (window as any).__autoFullPageTranslated = true;
          const mode = (pageTranslateConfig.pageTranslateMode || 'translated') as 'translated' | 'compare';
          
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