import { lazyFullPageTranslate, getPageTranslationStatus, restoreOriginalPage } from '~lib/translate/fullPageTranslate';

// 消息处理逻辑
export const setupMessageHandler = () => {
  if (typeof window !== 'undefined' && chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === 'FULL_PAGE_TRANSLATE') {
        // 调用整页翻译
        lazyFullPageTranslate(msg.lang, 'translated', msg.engine).then((result) => {
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
        }).catch(err => {
          console.error('整页翻译失败:', err);
          sendResponse({ success: false, error: err.message });
        });
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