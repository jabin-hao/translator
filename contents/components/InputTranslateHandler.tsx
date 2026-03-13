import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Button, Card, Typography } from 'antd';

import Icon from '../../lib/components/Icon';
import type { InputTranslateSettings } from '../../lib/constants/types';
import { useTheme } from '../../lib/theme/theme';
import { isInputElement } from '../../lib/utils/domUtil';
import { getOverlayPosition } from '../utils/overlayPosition';

interface InputTranslateHandlerProps {
  settings: InputTranslateSettings;
  targetLanguage: string;
  engine: string;
  callTranslateAPI: (
    text: string,
    from: string,
    to: string,
    engine: string
  ) => Promise<{ result: string; engine: string }>;
  showMessage: (type: 'success' | 'error' | 'warning' | 'info', content: string) => void;
}

interface InputTranslateState {
  x: number;
  y: number;
  originalText: string;
  translatedText: string;
  targetElement: HTMLElement;
}

const RESULT_SIZE = { width: 400, height: 200 };

const TranslateResultCard: React.FC<{
  x: number;
  y: number;
  originalText: string;
  translatedText: string;
  onReplace: () => void;
}> = ({ x, y, originalText, translatedText, onReplace }) => {
  const { isDark } = useTheme();

  return (
    <Card
      size="small"
      style={{
        position: 'fixed',
        top: `${y}px`,
        left: `${x}px`,
        zIndex: 2147483647,
        minWidth: '280px',
        maxWidth: '400px',
        boxShadow: isDark ? '0 4px 12px rgba(0,0,0,0.6)' : '0 4px 12px rgba(0,0,0,0.15)',
        borderRadius: '8px',
        background: isDark ? '#1f1f1f' : 'white',
        border: isDark ? '1px solid #434343' : '1px solid #d9d9d9',
      }}
      styles={{ body: { padding: '16px' } }}
      onClick={(event) => event.stopPropagation()}
    >
      <div
        style={{
          background: isDark ? '#262626' : '#f5f5f5',
          padding: '10px 12px',
          borderRadius: '6px',
          marginBottom: '10px',
        }}
      >
        <Typography.Text
          style={{
            fontSize: '13px',
            wordBreak: 'break-word',
            display: 'block',
            maxHeight: '60px',
            overflow: 'auto',
            color: isDark ? '#a6a6a6' : '#666',
            lineHeight: '1.4',
          }}
        >
          {originalText}
        </Typography.Text>
      </div>

      <div
        style={{
          background: isDark ? '#0f1419' : '#e6f7ff',
          padding: '10px 12px',
          borderRadius: '6px',
          marginBottom: '16px',
          border: isDark ? '1px solid #1890ff' : 'none',
        }}
      >
        <Typography.Text
          style={{
            fontSize: '14px',
            color: isDark ? '#ffffff' : '#262626',
            wordBreak: 'break-word',
            display: 'block',
            maxHeight: '80px',
            overflow: 'auto',
            userSelect: 'text',
            lineHeight: '1.5',
          }}
        >
          {translatedText}
        </Typography.Text>
      </div>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'flex-end',
          gap: '6px',
        }}
      >
        <Button
          type="text"
          icon={<Icon name="copy" />}
          size="small"
          onClick={async (event) => {
            event.preventDefault();
            event.stopPropagation();
            await navigator.clipboard.writeText(translatedText);
          }}
          title="复制"
        />
        <Button
          type="text"
          icon={<Icon name="check" />}
          size="small"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onReplace();
          }}
          title="替换"
        />
      </div>
    </Card>
  );
};

const InputTranslateHandler: React.FC<InputTranslateHandlerProps> = ({
  settings,
  targetLanguage,
  engine,
  callTranslateAPI,
  showMessage,
}) => {
  const [translateState, setTranslateState] = useState<InputTranslateState | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const currentInputElement = useRef<HTMLElement | null>(null);
  const translateTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTranslateTimer = useCallback(() => {
    if (translateTimer.current) {
      clearTimeout(translateTimer.current);
      translateTimer.current = null;
    }
  }, []);

  const shouldEnableTranslateForInput = useCallback(
    (element: HTMLElement | null): element is HTMLElement => {
      if (!settings.enabled || !element || !isInputElement(element)) {
        return false;
      }

      if (settings.excludeSelectors?.some((selector) => element.matches(selector))) {
        return false;
      }

      const tagName = element.tagName.toLowerCase();
      if (tagName === 'input') {
        const inputType = (element as HTMLInputElement).type.toLowerCase();
        return inputType !== 'password' && settings.enabledInputTypes?.includes(inputType);
      }

      if (tagName === 'textarea') {
        return settings.enabledInputTypes?.includes('textarea') ?? false;
      }

      if (element.hasAttribute('contenteditable')) {
        return settings.enabledInputTypes?.includes('contenteditable') ?? false;
      }

      return false;
    },
    [settings]
  );

  const getInputText = useCallback((element: HTMLElement): string => {
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'input' || tagName === 'textarea') {
      return (element as HTMLInputElement).value;
    }

    return element.innerText || element.textContent || '';
  }, []);

  const setInputText = useCallback((element: HTMLElement, text: string) => {
    const tagName = element.tagName.toLowerCase();

    if (tagName === 'input' || tagName === 'textarea') {
      const inputElement = element as HTMLInputElement;
      const nativeSetter = Object.getOwnPropertyDescriptor(
        inputElement.constructor.prototype,
        'value'
      )?.set;

      if (nativeSetter) {
        nativeSetter.call(inputElement, text);
      } else {
        inputElement.value = text;
      }

      inputElement.dispatchEvent(new Event('input', { bubbles: true }));
      inputElement.dispatchEvent(new Event('change', { bubbles: true }));
      inputElement.focus();
      inputElement.setSelectionRange(text.length, text.length);
      return;
    }

    element.innerText = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    element.dispatchEvent(new Event('change', { bubbles: true }));
    element.focus();
  }, []);

  const performTranslate = useCallback(
    async (element: HTMLElement, text: string) => {
      if (isTranslating) {
        return;
      }

      setIsTranslating(true);

      try {
        const { result } = await callTranslateAPI(text, 'auto', targetLanguage, engine);

        if (settings.autoReplace) {
          setInputText(element, result);
          showMessage('success', '翻译完成');
          return;
        }

        const rect = element.getBoundingClientRect();
        setTranslateState({
          ...getOverlayPosition(rect, RESULT_SIZE, 5),
          originalText: text,
          translatedText: result,
          targetElement: element,
        });
      } catch {
        showMessage('error', '翻译失败，请重试');
      } finally {
        setIsTranslating(false);
      }
    },
    [
      callTranslateAPI,
      engine,
      isTranslating,
      setInputText,
      settings.autoReplace,
      showMessage,
      targetLanguage,
    ]
  );

  const triggerInputTranslate = useCallback(() => {
    const activeElement = document.activeElement as HTMLElement | null;

    if (!shouldEnableTranslateForInput(activeElement)) {
      showMessage('warning', '当前焦点不在可翻译输入框中');
      return;
    }

    const text = getInputText(activeElement).trim();

    if (text.length < settings.minTextLength) {
      showMessage('warning', `文本长度至少需要 ${settings.minTextLength} 个字符`);
      return;
    }

    performTranslate(activeElement, text);
  }, [
    getInputText,
    performTranslate,
    settings.minTextLength,
    shouldEnableTranslateForInput,
    showMessage,
  ]);

  const handleReplace = useCallback(() => {
    if (!translateState) {
      return;
    }

    setInputText(translateState.targetElement, translateState.translatedText);
    setTranslateState(null);
    showMessage('success', '翻译已替换');
  }, [setInputText, showMessage, translateState]);

  const handleInput = useCallback(
    (event: Event) => {
      const element = event.target as HTMLElement;
      if (!shouldEnableTranslateForInput(element)) {
        return;
      }

      const text = getInputText(element).trim();
      if (text.length < settings.minTextLength) {
        clearTranslateTimer();
        return;
      }

      if (settings.triggerMode !== 'auto') {
        return;
      }

      clearTranslateTimer();
      translateTimer.current = setTimeout(() => {
        if (element === document.activeElement && getInputText(element).trim() === text) {
          performTranslate(element, text);
        }
      }, settings.autoTranslateDelay);
    },
    [
      clearTranslateTimer,
      getInputText,
      performTranslate,
      settings.autoTranslateDelay,
      settings.minTextLength,
      settings.triggerMode,
      shouldEnableTranslateForInput,
    ]
  );

  const handleFocus = useCallback(
    (event: Event) => {
      const element = event.target as HTMLElement;
      if (shouldEnableTranslateForInput(element)) {
        currentInputElement.current = element;
      }
    },
    [shouldEnableTranslateForInput]
  );

  const handleBlur = useCallback(
    (event: Event) => {
      clearTranslateTimer();
      if (event.target === currentInputElement.current) {
        currentInputElement.current = null;
      }
    },
    [clearTranslateTimer]
  );

  const handleDocumentClick = useCallback((event: Event) => {
    const target = event.target as HTMLElement;
    if (!target.closest('[data-translate-ui]')) {
      setTranslateState(null);
    }
  }, []);

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      setTranslateState(null);
    }
  }, []);

  useEffect(() => {
    if (!settings.enabled) {
      clearTranslateTimer();
      setTranslateState(null);
      return;
    }

    document.addEventListener('input', handleInput, true);
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);
    document.addEventListener('keydown', handleKeyDown, true);

    const timeoutId = setTimeout(() => {
      document.addEventListener('click', handleDocumentClick, false);
    }, 100);

    return () => {
      clearTranslateTimer();
      document.removeEventListener('input', handleInput, true);
      document.removeEventListener('focus', handleFocus, true);
      document.removeEventListener('blur', handleBlur, true);
      document.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('click', handleDocumentClick, false);
      clearTimeout(timeoutId);
    };
  }, [
    clearTranslateTimer,
    handleBlur,
    handleDocumentClick,
    handleFocus,
    handleInput,
    handleKeyDown,
    settings.enabled,
  ]);

  useEffect(() => {
    window.triggerInputTranslate = triggerInputTranslate;
    return () => {
      delete window.triggerInputTranslate;
    };
  }, [triggerInputTranslate]);

  if (!settings.enabled) {
    return null;
  }

  return (
    <>
      {translateState && (
        <div data-translate-ui>
          <TranslateResultCard
            x={translateState.x}
            y={translateState.y}
            originalText={translateState.originalText}
            translatedText={translateState.translatedText}
            onReplace={handleReplace}
          />
        </div>
      )}
    </>
  );
};

export default InputTranslateHandler;
