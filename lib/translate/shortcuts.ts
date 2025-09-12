import { isInputElement } from '../utils/domUtil';

// 快捷键处理逻辑
export const setupShortcutHandler = (
  triggerTranslation: (text: string, rect: DOMRect) => void,
  setShowInputTranslator: (show: boolean) => void,
  isTextTranslateEnabled: boolean = true, // 新增：是否启用划词翻译
  shortcutSettings: {
    enabled: boolean;
    toggleTranslate?: string;
    textTranslate?: string;
    inputTranslate?: string;
    pageTranslate?: string;
    openInput?: string;
  },
  callbacks?: {
    toggleTranslate?: () => void;
    textTranslate?: () => void;
    inputTranslate?: () => void;
    pageTranslate?: () => void;
    openInput?: () => void;
  }
) => {
  let isTranslating = false;

  // 生成当前按键组合的函数
  const getCurrentKeyCombination = (e: KeyboardEvent): string => {
    const isCtrlPressed = e.ctrlKey || e.key === 'Control';
    const isAltPressed = e.altKey || e.key === 'Alt';
    const isShiftPressed = e.shiftKey || e.key === 'Shift';
    const isMetaPressed = e.metaKey || e.key === 'Meta';
    const pressedKeys = [];
    
    // 使用与设置页面相同的格式（首字母大写）
    if (isCtrlPressed) pressedKeys.push('Ctrl');
    if (isAltPressed) pressedKeys.push('Alt');
    if (isShiftPressed) pressedKeys.push('Shift');
    if (isMetaPressed) pressedKeys.push('Meta');
    
    let keyName = e.key.toLowerCase();
    if (keyName === ' ') keyName = 'Space';
    else if (keyName === 'enter') keyName = 'Enter';
    else if (keyName === 'escape') keyName = 'Escape';
    else if (keyName === 'tab') keyName = 'Tab';
    else if (keyName === 'backspace') keyName = 'Backspace';
    else if (keyName === 'delete') keyName = 'Delete';
    else {
      // 普通键首字母大写
      keyName = keyName.charAt(0).toUpperCase() + keyName.slice(1);
    }
    
    // 只有非修饰键才添加到组合中
    if (!['control', 'alt', 'shift', 'meta'].includes(e.key.toLowerCase())) {
      pressedKeys.push(keyName);
    }
    
    return pressedKeys.join('+');
  };

  const handleKeyDown = async (e: KeyboardEvent) => {
    // 如果当前焦点在输入元素上，不处理快捷键
    const activeElement = document.activeElement;
    if (activeElement && isInputElement(activeElement)) {
      return;
    }

    // 如果快捷键未启用，不处理
    if (!shortcutSettings.enabled) {
      return;
    }

    const currentCombination = getCurrentKeyCombination(e);
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    // 检查各种快捷键类型
    
    // 1. 切换翻译功能
    if (shortcutSettings.toggleTranslate && currentCombination === shortcutSettings.toggleTranslate) {
      e.preventDefault();
      e.stopPropagation();
      callbacks?.toggleTranslate?.();
      return;
    }
    
    // 2. 快捷键翻译选中文本
    if (shortcutSettings.textTranslate && currentCombination === shortcutSettings.textTranslate) {
      e.preventDefault();
      e.stopPropagation();
      callbacks?.textTranslate?.();
      return;
    }
    
    // 3. 翻译输入框内容
    if (shortcutSettings.inputTranslate && currentCombination === shortcutSettings.inputTranslate) {
      e.preventDefault();
      e.stopPropagation();
      callbacks?.inputTranslate?.();
      return;
    }
    
    // 4. 翻译整个页面
    if (shortcutSettings.pageTranslate && currentCombination === shortcutSettings.pageTranslate) {
      e.preventDefault();
      e.stopPropagation();
      callbacks?.pageTranslate?.();
      return;
    }
    
    // 5. 打开输入翻译
    if (shortcutSettings.openInput && currentCombination === shortcutSettings.openInput) {
      e.preventDefault();
      e.stopPropagation();
      callbacks?.openInput?.();
      return;
    }

  };

  document.addEventListener('keydown', handleKeyDown);
  
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
};
