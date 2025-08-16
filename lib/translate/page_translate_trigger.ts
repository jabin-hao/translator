import { lazyFullPageTranslate } from '~lib/translate/page_translate';
import { usePageTranslateSettings } from '~lib/settings/settings';
import { useDomainSettings } from '~lib/storage/indexed';

const { pageTranslateSettings } = usePageTranslateSettings();
const { isWhitelisted } = useDomainSettings();

// 网站匹配逻辑
const matchSiteList = (list: string[], url: string): boolean => {
  return list.some(item => {
    if (item === url) {
      return true;
    }
    if (item.includes('*')) {
      const regex = new RegExp(item.replace(/\*/g, '.*'));
      const match = regex.test(url);
      return match;
    }
    
    // 简单的域名匹配
    if (url.startsWith(item)) {
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
    
    try {
      // 是否开启自动翻译白名单网页
      if (!pageTranslateSettings.autoTranslate) { 
        return;
      }
      
      if (isWhitelisted(fullUrl)) {
        if (typeof (window as any).__autoFullPageTranslated === 'undefined') {
          (window as any).__autoFullPageTranslated = true;
          const mode = (pageTranslateSettings.mode || 'translated') as 'translated' | 'compare';
          
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
    stopTTSAPI().then();
  };

  // 监听页面内容变化事件
  const handleContentChange = () => {
    // 当页面内容发生变化时，重新触发整页翻译
    triggerFullPageTranslation().then();
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