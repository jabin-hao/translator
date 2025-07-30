import { Storage } from '@plasmohq/storage';
import { getSiteTranslateSettings, getDictConfig, matchSiteList } from '../../lib/siteTranslateSettings';
import { lazyFullPageTranslate } from '../../lib/fullPageTranslate';
import { PAGE_LANG_KEY, ALWAYS_LANGS_KEY, NEVER_LANGS_KEY } from '../../lib/constants';

const storage = new Storage();

// 获取翻译状态
const getTranslationState = () => {
  if (!(window as any).__translationState) {
    (window as any).__translationState = {
      isPageTranslated: false,
      stopTranslation: null
    };
  }
  return (window as any).__translationState;
};

// 设置翻译状态
const setTranslationState = (state: { isPageTranslated: boolean; stopTranslation: (() => void) | null }) => {
  (window as any).__translationState = state;
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
    console.log('fullUrl', fullUrl);
    const settings = await getSiteTranslateSettings();
    const dict = await getDictConfig();
    if (!settings.autoTranslateEnabled) return;
    if (matchSiteList(dict.siteNeverList || [], fullUrl)) return;
    if (matchSiteList(dict.siteAlwaysList || [], fullUrl)) {
      if (typeof (window as any).__autoFullPageTranslated === 'undefined') {
        (window as any).__autoFullPageTranslated = true;
        const mode = (settings as any).pageTranslateMode || 'translated';
        const result = await lazyFullPageTranslate(pageTargetLang, mode, engine);
        
        // 更新全局状态
        const state = getTranslationState();
        state.stopTranslation = result.stop;
        state.isPageTranslated = true;
        setTranslationState(state);
      }
    }
  };

  // 整页翻译触发逻辑
  const triggerFullPageTranslationByUrl = async () => {
    const currentUrl = window.location.href;
    console.log('currentUrl', currentUrl);
    const alwaysTranslate = await storage.get(ALWAYS_LANGS_KEY);
    const neverTranslate = await storage.get(NEVER_LANGS_KEY);

    if (alwaysTranslate && Array.isArray(alwaysTranslate) && alwaysTranslate.includes(currentUrl)) {
      // 在 always 列表中，自动触发整页翻译
      const result = await lazyFullPageTranslate(pageTargetLang, 'translated', engine);
      
      // 更新全局状态
      const state = getTranslationState();
      state.stopTranslation = result.stop;
      state.isPageTranslated = true;
      setTranslationState(state);
      
      console.log('整页翻译完成！');
    } else if (neverTranslate && Array.isArray(neverTranslate) && neverTranslate.includes(currentUrl)) {
      // 在 never 列表中，禁止自动整页翻译
      console.log('当前页面禁止自动整页翻译。');
    } else {
      // 不在列表中，不自动触发整页翻译
    }
  };

  // 监听页面加载完成事件
  const handleLoad = () => {
    // 延迟执行，确保 DOM 已完全加载
    setTimeout(() => {
      triggerFullPageTranslation();
      triggerFullPageTranslationByUrl();
    }, 100);
  };

  // 监听页面卸载事件
  const handleBeforeUnload = () => {
    // 在页面卸载前，停止所有 TTS 播放
    stopTTSAPI();
  };

  // 监听页面内容变化事件
  const handleContentChange = () => {
    // 当页面内容发生变化时，重新触发整页翻译
    triggerFullPageTranslation();
    triggerFullPageTranslationByUrl();
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

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('load', handleLoad);
    document.removeEventListener('DOMContentLoaded', handleContentChange);
    document.removeEventListener('readystatechange', () => {});
  };
}; 