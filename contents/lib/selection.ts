import { Storage } from '@plasmohq/storage';
import { getBrowserLang } from '../../lib/languages';
import { TRANSLATE_SETTINGS_KEY, TEXT_LANG_KEY } from '../../lib/constants';

const storage = new Storage();

// 检查元素是否为输入元素或可编辑元素
function isInputElement(element: Element | null): boolean {
  if (!element) return false;
  
  const tagName = element.tagName.toLowerCase();
  
  // 检查是否为输入元素
  if (['input', 'textarea', 'select'].includes(tagName)) {
    return true;
  }
  
  // 检查是否为可编辑元素
  if (element.hasAttribute('contenteditable')) {
    const contentEditable = element.getAttribute('contenteditable');
    return contentEditable === '' || contentEditable === 'true';
  }
  
  return false;
}

// 检查点击路径中是否包含输入元素
function pathContainsInputElement(path: EventTarget[]): boolean {
  return path.some(target => {
    if (target instanceof Element) {
      return isInputElement(target);
    }
    return false;
  });
}

// 检查是否点击在翻译组件内部
function isClickOnTranslatorComponent(path: EventTarget[], shadowRoot: ShadowRoot | null): boolean {
  if (!shadowRoot) return false;
  
  const inputTranslatorElement = shadowRoot.querySelector('.input-translator-card');
  const resultElement = shadowRoot.querySelector('[data-translator-result]');
  const iconElement = shadowRoot.querySelector('.translator-icon');
  
  return path.some(target => {
    return (inputTranslatorElement && target === inputTranslatorElement) ||
           (resultElement && target === resultElement) ||
           (iconElement && target === iconElement) ||
           (inputTranslatorElement && target instanceof Node && inputTranslatorElement.contains(target)) ||
           (resultElement && target instanceof Node && resultElement.contains(target)) ||
           (iconElement && target instanceof Node && iconElement.contains(target));
  });
}

// 文本选择和翻译触发逻辑
export const setupSelectionHandler = (
  shadowRoot: ShadowRoot | null,
  showTranslationIcon: (text: string, rect: DOMRect) => void,
  clearTranslationState: () => void,
  setShowInputTranslator: (show: boolean) => void
) => {
  const handleMouseUp = (e: MouseEvent) => {
    const path = e.composedPath();
    
    // 1. 如果点击路径中包含输入元素，直接返回，不处理翻译逻辑
    if (pathContainsInputElement(path)) {
      return;
    }
    
    // 2. 如果点击在翻译组件内部，直接返回
    if (isClickOnTranslatorComponent(path, shadowRoot)) {
      return;
    }

    // 3. 处理文本选择逻辑
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (text && text.length > 0 && selection && selection.rangeCount > 0) {
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      showTranslationIcon(text, rect);
    } else {
      // 4. 没有选中内容，且不是点击在翻译组件内部，清空所有
      clearTranslationState();
      
      // 清除选中状态
      if (window.getSelection) {
        const sel = window.getSelection();
        if (sel) sel.removeAllRanges();
      }
    }
  };

  // 优化 mousedown 事件处理器，减少对输入框的干扰
  const handleMouseDown = (e: MouseEvent) => {
    const path = e.composedPath();
    
    // 如果点击路径中包含输入元素，直接返回，不处理任何逻辑
    if (pathContainsInputElement(path)) {
      return;
    }
    
    // 如果点击在翻译组件内部，不处理
    if (isClickOnTranslatorComponent(path, shadowRoot)) {
      return;
    }

    // 只在点击外部且没有输入元素时才清空状态
    // 延迟执行，避免干扰正常的点击事件
    setTimeout(() => {
      const currentSelection = window.getSelection();
      const currentText = currentSelection?.toString().trim();
      
      // 如果当前没有选中文本，则清空翻译状态
      if (!currentText) {
        clearTranslationState();
      }
    }, 10);
  };

  document.addEventListener('mouseup', handleMouseUp, { passive: true });
  document.addEventListener('mousedown', handleMouseDown, { passive: true });
  
  return () => {
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('mousedown', handleMouseDown);
  };
};

// 获取翻译目标语言
export const getTargetLanguage = async (): Promise<string> => {
  const textTargetLang = await storage.get(TEXT_LANG_KEY);
  if (textTargetLang) return textTargetLang;
  
  const favoriteLangs = await storage.get('favoriteLangs');
  if (Array.isArray(favoriteLangs) && favoriteLangs.length > 0) {
    return favoriteLangs[0];
  }
  
  return getBrowserLang();
}; 