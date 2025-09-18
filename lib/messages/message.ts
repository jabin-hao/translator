import { lazyFullPageTranslate, getPageTranslationStatus, restoreOriginalPage } from '~lib/translate/page_translate';
import { Storage } from '@plasmohq/storage';
import { GLOBAL_SETTINGS_KEY, DEFAULT_SETTINGS } from '~lib/settings/settings';
import type { GlobalSettings } from '~lib/constants/types';

const storage = new Storage();

// 获取全局配置
const getGlobalSettings = async (): Promise<GlobalSettings> => {
  const settings = await storage.get(GLOBAL_SETTINGS_KEY);
  if (typeof settings === 'string') {
    try {
      return JSON.parse(settings);
    } catch {
      return DEFAULT_SETTINGS;
    }
  }
  return settings || DEFAULT_SETTINGS;
};

// 消息处理逻辑
export const setupMessageHandler = (setShowInputTranslator?: (show: boolean) => void) => {
  if (typeof window !== 'undefined' && chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === 'SHOW_INPUT_TRANSLATOR') {
        // 显示输入翻译器
        if (setShowInputTranslator) {
          setShowInputTranslator(true);
          sendResponse({ success: true });
        } else {
          sendResponse({ success: false, error: 'setShowInputTranslator function not available' });
        }
        return true; // 异步响应
      } else if (msg.type === 'FULL_PAGE_TRANSLATE') {
        // 调用整页翻译
        (async () => {
          try {
            // 读取用户的翻译模式设置
            const settings = await getGlobalSettings();
            const mode = (settings.pageTranslate.mode || 'translated') as 'translated' | 'compare';
            
            const result = await lazyFullPageTranslate(msg.lang, mode, msg.engine);
            const state = (window as any).__translationState;
            state.stopTranslation = result.stop;
            state.isPageTranslated = true;
            sendResponse({ success: true });
            
            // 翻译完成后通知前端隐藏 loading
            if (chrome?.runtime?.id) {
              try {
                chrome.runtime.sendMessage({type: 'FULL_PAGE_TRANSLATE_DONE'}).then(() => {});
              } catch (error) {
                console.error('消息发送失败，可能是扩展上下文已失效:', error);
              }
            }
          } catch (error) {
            console.error('整页翻译失败:', error);
            sendResponse({ success: false, error: error.message });
          }
        })();
        return true; // 异步响应
      } else if (msg.type === 'RESTORE_ORIGINAL_PAGE') {
        // 使用统一的恢复函数
        restoreOriginalPage();
        sendResponse({ success: true });
        // 还原完成后通知 popup 结束 loading
        if (chrome?.runtime?.id) {
          try {
            chrome.runtime.sendMessage({type: 'RESTORE_ORIGINAL_PAGE_DONE'}).then(() => {});
          } catch (error) {
            console.error('消息发送失败，可能是扩展上下文已失效:', error);
          }
        }
        return true; // 异步响应
      } else if (msg.type === 'CHECK_PAGE_TRANSLATED') {
        const translated = getPageTranslationStatus();
        sendResponse({ translated });
        return true; // 异步响应
      }
    });
  }
}; 