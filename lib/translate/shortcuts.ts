import { isInputElement } from '../utils/domUtil';

// 快捷键处理逻辑
export const setupShortcutHandler = (
  triggerTranslation: (text: string, rect: DOMRect) => void,
  setShowInputTranslator: (show: boolean) => void,
  isTextTranslateEnabled: boolean = true, // 新增：是否启用划词翻译
  shortcutSettings: {
    enabled: boolean;
    openPopup?: string;
  }
) => {
  let isTranslating = false;

  const handleKeyDown = async (e: KeyboardEvent) => {
    // 如果当前焦点在输入元素上，不处理快捷键
    const activeElement = document.activeElement;
    if (activeElement && isInputElement(activeElement)) {
      return;
    }

    // 使用传入的快捷键设置
    const shortcutEnabled = shortcutSettings.enabled;
    const customShortcut = shortcutSettings.openPopup;

    // 如果没有启用快捷键或没有设置自定义快捷键，不处理任何快捷键
    if (!shortcutEnabled || !customShortcut) {
      return;
    }

    // 检查自定义快捷键
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
    
    const currentCombination = pressedKeys.join('+');
    const isCustomShortcut = currentCombination === customShortcut;
    
    // 调试信息
    console.log('快捷键检测:', {
      pressed: currentCombination,
      expected: customShortcut,
      match: isCustomShortcut
    });

    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (text && text.length > 0 && selection && selection.rangeCount > 0) {
      // 有选中文字 - 检查是否启用划词翻译和是否匹配自定义快捷键
      if (!isTextTranslateEnabled || !isCustomShortcut) {
        return;
      }
      
      // 防止重复调用
      if (isTranslating) {
        return;
      }
      
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      if (isNaN(rect.left) || isNaN(rect.bottom)) {
        return;
      }
      
      // 设置翻译状态
      isTranslating = true;
      
      // 触发翻译
      triggerTranslation(text, rect);
      
      // 重置翻译状态
      setTimeout(() => {
        isTranslating = false;
      }, 100);
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
};
