import { lazyFullPageTranslate } from '../../lib/fullPageTranslate';

// 整页翻译状态管理 - 使用全局变量确保跨模块访问
if (!(window as any).__translationState) {
  (window as any).__translationState = {
    isPageTranslated: false,
    stopTranslation: null
  };
}

// 初始化原始文本映射
if (!(window as any).__originalPageTextMap) {
  (window as any).__originalPageTextMap = new Map();
}

// 获取翻译状态
const getTranslationState = () => {
  return (window as any).__translationState;
};

// 设置翻译状态
const setTranslationState = (state: { isPageTranslated: boolean; stopTranslation: (() => void) | null }) => {
  (window as any).__translationState = state;
};

// 消息处理逻辑
export const setupMessageHandler = () => {
  if (typeof window !== 'undefined' && chrome?.runtime?.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.type === 'FULL_PAGE_TRANSLATE') {
        // 保存原文
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node;
        const originalMap = (window as any).__originalPageTextMap;
        while ((node = walker.nextNode())) {
          if (node.nodeValue && node.nodeValue.trim()) {
            originalMap.set(node, node.nodeValue);
          }
        }
        
        // 调用整页翻译
        lazyFullPageTranslate(msg.lang, 'translated', msg.engine).then((result) => {
          const state = getTranslationState();
          state.stopTranslation = result.stop;
          state.isPageTranslated = true;
          setTranslationState(state);
          sendResponse({ success: true });
        }).catch(err => {
          console.error('整页翻译失败:', err);
          sendResponse({ success: false, error: err.message });
        });
        return true; // 异步响应
      } else if (msg.type === 'RESTORE_ORIGINAL_PAGE') {
        // 停止翻译
        const state = getTranslationState();
        if (state.stopTranslation) {
          state.stopTranslation();
          state.stopTranslation = null;
        }
        
        // 还原原文
        const originalMap = (window as any).__originalPageTextMap;
        for (const [node, text] of originalMap.entries()) {
          try {
            node.nodeValue = text;
          } catch {}
        }
        
        // 清理已翻译的节点标记
        const translatedNodes = document.querySelectorAll('[data-translated="true"]');
        translatedNodes.forEach(node => {
          node.removeAttribute('data-translated');
        });
        
        state.isPageTranslated = false;
        setTranslationState(state);
        sendResponse({ success: true });
      } else if (msg.type === 'CHECK_PAGE_TRANSLATED') {
        const state = getTranslationState();
        sendResponse({ translated: state.isPageTranslated });
      }
    });
  }
};

// 获取页面翻译状态
export const getPageTranslationStatus = (): boolean => {
  const state = getTranslationState();
  return state.isPageTranslated;
};

// 手动触发整页翻译
export const triggerFullPageTranslation = async (
  targetLang: string, 
  engine: string
): Promise<{ success: boolean; error?: string }> => {
  try {
    // 保存原文
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    const originalMap = (window as any).__originalPageTextMap;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.trim()) {
        originalMap.set(node, node.nodeValue);
      }
    }
    
    // 调用整页翻译
    const result = await lazyFullPageTranslate(targetLang, 'translated', engine);
    const state = getTranslationState();
    state.stopTranslation = result.stop;
    state.isPageTranslated = true;
    setTranslationState(state);
    
    return { success: true };
  } catch (error) {
    console.error('整页翻译失败:', error);
    return { success: false, error: error.message };
  }
};

// 手动还原原网页
export const restoreOriginalPage = (): { success: boolean; error?: string } => {
  try {
    // 停止翻译
    const state = getTranslationState();
    if (state.stopTranslation) {
      state.stopTranslation();
      state.stopTranslation = null;
    }
    
    // 还原原文
    const originalMap = (window as any).__originalPageTextMap;
    for (const [node, text] of originalMap.entries()) {
      try {
        node.nodeValue = text;
      } catch {}
    }
    
    // 清理已翻译的节点标记
    const translatedNodes = document.querySelectorAll('[data-translated="true"]');
    translatedNodes.forEach(node => {
      node.removeAttribute('data-translated');
    });
    
    state.isPageTranslated = false;
    setTranslationState(state);
    return { success: true };
  } catch (error) {
    console.error('还原原网页失败:', error);
    return { success: false, error: error.message };
  }
}; 