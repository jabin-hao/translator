import { Storage } from '@plasmohq/storage';
import { isInputElement } from '../utils/domUtil';

const storage = new Storage();

// 快捷键处理逻辑
export const setupShortcutHandler = (
  triggerTranslation: (text: string, rect: DOMRect) => void,
  setShowInputTranslator: (show: boolean) => void
) => {
  let lastCtrlPressTime = 0;
  let isTranslating = false;

  const handleKeyDown = async (e: KeyboardEvent) => {
    // 如果当前焦点在输入元素上，不处理快捷键
    const activeElement = document.activeElement;
    if (activeElement && isInputElement(activeElement)) {
      return;
    }

    let shouldTrigger = false;
    let isDoubleCtrl = false;

    // 检测双击Ctrl
    if (e.key === 'Control') {
      const now = Date.now();
      if (now - lastCtrlPressTime < 300) {
        isDoubleCtrl = true;
      }
      lastCtrlPressTime = now;
    }

    // 获取快捷键设置
    const shortcutSettings = await storage.get('shortcut_settings') as any;
    const shortcutEnabled = shortcutSettings?.enabled !== false;
    const customShortcut = shortcutSettings?.customShortcut || '';

    // 检查自定义快捷键
    let isCustomShortcut = false;
    if (customShortcut) {
      const isCtrlPressed = e.ctrlKey || e.key === 'Control';
      const isAltPressed = e.altKey || e.key === 'Alt';
      const isShiftPressed = e.shiftKey || e.key === 'Shift';
      const isMetaPressed = e.metaKey || e.key === 'Meta';
      const pressedKeys = [];
      if (isCtrlPressed) pressedKeys.push('ctrl');
      if (isAltPressed) pressedKeys.push('alt');
      if (isShiftPressed) pressedKeys.push('shift');
      if (isMetaPressed) pressedKeys.push('meta');
      let keyName = e.key.toLowerCase();
      if (keyName === ' ') keyName = 'space';
      if (keyName === 'enter') keyName = 'enter';
      if (keyName === 'escape') keyName = 'escape';
      if (keyName === 'tab') keyName = 'tab';
      if (keyName === 'backspace') keyName = 'backspace';
      if (keyName === 'delete') keyName = 'delete';
      if (!['control', 'alt', 'shift', 'meta'].includes(keyName)) {
        pressedKeys.push(keyName);
      }
      const currentCombination = pressedKeys.join('+');
      if (currentCombination === customShortcut) {
        isCustomShortcut = true;
      }
    }

    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (text && text.length > 0 && selection && selection.rangeCount > 0) {
      // 有选中文字
      if (customShortcut) {
        if (isCustomShortcut) {
          shouldTrigger = true;
        }
      } else {
        if (isDoubleCtrl) {
          shouldTrigger = true;
        }
      }
      if (shouldTrigger) {
        // 防止重复调用
        if (isTranslating) {
          return;
        }
        
        if (!shortcutEnabled) return;
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
    } else {
      // 没有选中文字，双击Ctrl始终唤起输入组件
      if (isDoubleCtrl) {
        setShowInputTranslator(true);
      }
    }
  };

  document.addEventListener('keydown', handleKeyDown);
  
  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
};
