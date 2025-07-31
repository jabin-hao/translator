import { Storage } from '@plasmohq/storage';
import { getSiteTranslateSettings, getDictConfig, matchSiteList } from '../../lib/siteTranslateSettings';
import { lazyFullPageTranslate } from '../../lib/fullPageTranslate';
import { PAGE_LANG_KEY } from '../../lib/constants';

const storage = new Storage();

// 自动翻译逻辑
export const setupAutoTranslate = (
  pageTargetLang: string,
  engine: string,
  stopTTSAPI: () => Promise<void>
) => {
  console.log('setupAutoTranslate 被调用，参数:', { pageTargetLang, engine });
  
  // 整页翻译自动触发逻辑
  const triggerFullPageTranslation = async () => {
    console.log('triggerFullPageTranslation 被触发');
    const host = window.location.hostname;
    const path = window.location.pathname;
    const fullUrl = path === '/' ? host : host + path;
    console.log('当前页面信息:', { host, path, fullUrl });
    
    try {
      const settings = await getSiteTranslateSettings();
      const dict = await getDictConfig();
      console.log('自动翻译设置:', settings);
      console.log('白名单配置:', dict);
      
      if (!settings.autoTranslateEnabled) {
        console.log('自动翻译已禁用');
        return;
      }
      
      if (matchSiteList(dict.siteNeverList || [], fullUrl)) {
        console.log('当前页面在永不翻译列表中');
        return;
      }
      
      if (matchSiteList(dict.siteAlwaysList || [], fullUrl)) {
        console.log('当前页面在总是翻译列表中，开始自动翻译');
        if (typeof (window as any).__autoFullPageTranslated === 'undefined') {
          (window as any).__autoFullPageTranslated = true;
          const mode = (settings as any).pageTranslateMode || 'translated';
          console.log('开始执行 lazyFullPageTranslate，模式:', mode);
          
          const result = await lazyFullPageTranslate(pageTargetLang, mode, engine);
          
          // 更新全局状态
          const state = (window as any).__translationState;
          state.stopTranslation = result.stop;
          state.isPageTranslated = true;
          console.log('自动翻译完成');
          
          // 通知 popup 更新状态
          if (chrome?.runtime?.id) {
            chrome.runtime.sendMessage({ type: 'FULL_PAGE_TRANSLATE_DONE' });
          }
        } else {
          console.log('页面已经自动翻译过了，跳过');
        }
      } else {
        console.log('当前页面不在白名单中，不自动翻译');
        console.log('当前白名单:', dict.siteAlwaysList);
        console.log('当前黑名单:', dict.siteNeverList);
      }
    } catch (error) {
      console.error('自动翻译过程中发生错误:', error);
    }
  };

  // 监听页面加载完成事件
  const handleLoad = () => {
    console.log('页面 load 事件触发');
    // 延迟执行，确保 DOM 已完全加载
    setTimeout(() => {
      console.log('执行延迟的 triggerFullPageTranslation');
      triggerFullPageTranslation();
    }, 100);
  };

  // 监听页面卸载事件
  const handleBeforeUnload = () => {
    console.log('页面 beforeunload 事件触发');
    // 在页面卸载前，停止所有 TTS 播放
    stopTTSAPI();
  };

  // 监听页面内容变化事件
  const handleContentChange = () => {
    console.log('页面内容变化事件触发');
    // 当页面内容发生变化时，重新触发整页翻译
    triggerFullPageTranslation();
  };

  console.log('开始注册事件监听器');
  
  // 监听页面卸载事件
  window.addEventListener('beforeunload', handleBeforeUnload);
  // 监听页面加载完成事件
  window.addEventListener('load', handleLoad);
  // 监听页面内容变化事件
  document.addEventListener('DOMContentLoaded', handleContentChange);
  document.addEventListener('readystatechange', () => {
    console.log('readystatechange 事件触发，readyState:', document.readyState);
    if (document.readyState === 'interactive') {
      console.log('页面进入 interactive 状态，触发 handleContentChange');
      handleContentChange(); // 在交互状态时也触发一次
    }
  });

  // 如果页面已经加载完成，立即触发一次
  if (document.readyState === 'complete') {
    console.log('页面已经加载完成，立即触发自动翻译');
    setTimeout(() => triggerFullPageTranslation(), 100);
  }

  return () => {
    console.log('清理自动翻译事件监听器');
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('load', handleLoad);
    document.removeEventListener('DOMContentLoaded', handleContentChange);
    document.removeEventListener('readystatechange', () => {});
  };
}; 