import { isInputElement } from '../utils/domUtil';

export const setupShortcutHandler = (
  _triggerTranslation: (text: string, rect: DOMRect) => void,
  isTextTranslateEnabled: boolean = true,
  shortcutSettings: {
    enabled: boolean;
    toggleTranslate?: string;
    textTranslate?: string;
    inputTranslate?: string;
    pageTranslate?: string;
  },
  callbacks?: {
    toggleTranslate?: () => void;
    textTranslate?: () => void;
    inputTranslate?: () => void;
    pageTranslate?: () => void;
  }
) => {
  const getCurrentKeyCombination = (event: KeyboardEvent): string => {
    const pressedKeys: string[] = [];

    if (event.ctrlKey || event.key === 'Control') {
      pressedKeys.push('Ctrl');
    }
    if (event.altKey || event.key === 'Alt') {
      pressedKeys.push('Alt');
    }
    if (event.shiftKey || event.key === 'Shift') {
      pressedKeys.push('Shift');
    }
    if (event.metaKey || event.key === 'Meta') {
      pressedKeys.push('Meta');
    }

    let keyName = event.key.toLowerCase();
    if (keyName === ' ') keyName = 'Space';
    else if (keyName === 'enter') keyName = 'Enter';
    else if (keyName === 'escape') keyName = 'Escape';
    else if (keyName === 'tab') keyName = 'Tab';
    else if (keyName === 'backspace') keyName = 'Backspace';
    else if (keyName === 'delete') keyName = 'Delete';
    else keyName = keyName.charAt(0).toUpperCase() + keyName.slice(1);

    if (!['control', 'alt', 'shift', 'meta'].includes(event.key.toLowerCase())) {
      pressedKeys.push(keyName);
    }

    return pressedKeys.join('+');
  };

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!shortcutSettings.enabled) {
      return;
    }

    const activeElement = document.activeElement;
    const isInInputElement = activeElement && isInputElement(activeElement);
    const currentCombination = getCurrentKeyCombination(event);

    if (
      shortcutSettings.inputTranslate &&
      currentCombination === shortcutSettings.inputTranslate
    ) {
      event.preventDefault();
      event.stopPropagation();
      callbacks?.inputTranslate?.();
      return;
    }

    if (isInInputElement) {
      return;
    }

    if (
      shortcutSettings.toggleTranslate &&
      currentCombination === shortcutSettings.toggleTranslate
    ) {
      event.preventDefault();
      event.stopPropagation();
      callbacks?.toggleTranslate?.();
      return;
    }

    if (
      isTextTranslateEnabled &&
      shortcutSettings.textTranslate &&
      currentCombination === shortcutSettings.textTranslate
    ) {
      event.preventDefault();
      event.stopPropagation();
      callbacks?.textTranslate?.();
      return;
    }

    if (
      shortcutSettings.pageTranslate &&
      currentCombination === shortcutSettings.pageTranslate
    ) {
      event.preventDefault();
      event.stopPropagation();
      callbacks?.pageTranslate?.();
      return;
    }
  };

  document.addEventListener('keydown', handleKeyDown);

  return () => {
    document.removeEventListener('keydown', handleKeyDown);
  };
};
