import 'antd/dist/reset.css';

let shadowRoot: ShadowRoot | null = null

export const getRootContainer = async () => {
  const root = document.createElement("div")
  document.body.appendChild(root)
  shadowRoot = root.attachShadow({ mode: "open" })
  
  return shadowRoot
}

import React, { useEffect, useRef, useState } from 'react';
import { StyleProvider } from '@ant-design/cssinjs';
import { message, ConfigProvider, theme } from 'antd';
import { Storage } from '@plasmohq/storage';
import './index.css';
import TranslatorIcon from './components/TranslatorIcon';
import TranslatorResult from './components/TranslatorResult';
import InputTranslator from './components/InputTranslator';

const storage = new Storage();

// 主题检测和应用函数
const CONTENT_THEME_KEY = 'content_theme_mode';

async function getInitContentTheme() {
  try {
    const theme = await storage.get(CONTENT_THEME_KEY);
    if (theme) return theme;
  } catch {}
  return 'auto';
}

function applyThemeToShadowRoot(themeMode: string, shadowRoot: ShadowRoot) {
  let actualTheme = themeMode;
  
  if (themeMode === 'auto') {
    // 检测系统主题
    actualTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  
  // 设置 data-theme 属性到 shadowRoot
  shadowRoot.host.setAttribute('data-theme', actualTheme);
  
  // 确保CSS样式正确应用到Shadow DOM
  // 注入CSS样式到Shadow DOM
  const style = document.createElement('style');
  style.textContent = `
    /* 主题变量 */
    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f9f9f9;
      --text-primary: #333333;
      --text-secondary: #666666;
      --border-color: #d9d9d9;
      --card-bg: #ffffff;
      --card-border: #d9d9d9;
      --input-bg: #ffffff;
      --input-border: #d9d9d9;
      --select-bg: #ffffff;
      --select-border: #d9d9d9;
      --button-bg: #ffffff;
      --button-border: #d9d9d9;
      --result-bg: #f5f5f5;
      --shadow: 0 8px 24px rgba(0,0,0,0.15);
    }

    /* 夜间模式主题变量 */
    [data-theme="dark"] {
      --bg-primary: #1a1a1a;
      --bg-secondary: #2a2a2a;
      --text-primary: #ffffff;
      --text-secondary: #cccccc;
      --border-color: #404040;
      --card-bg: #2a2a2a;
      --card-border: #404040;
      --input-bg: #2a2a2a;
      --input-border: #404040;
      --select-bg: #2a2a2a;
      --select-border: #404040;
      --button-bg: #2a2a2a;
      --button-border: #404040;
      --result-bg: #1a1a1a;
      --shadow: 0 8px 24px rgba(0,0,0,0.3);
    }

    .translator-result-text {
      color: var(--text-primary) !important;
    }

    .input-translator-result-textarea {
      background-color: var(--result-bg) !important;
      color: var(--text-primary) !important;
    }

    .translator-icon {
      background: var(--card-bg) !important;
      border: 2px solid #2386e1 !important;
      box-shadow: var(--shadow) !important;
    }
  `;
  
  // 移除旧的样式元素（如果存在）
  const oldStyle = shadowRoot.querySelector('style');
  if (oldStyle) {
    shadowRoot.removeChild(oldStyle);
  }
  
  // 添加新的样式元素
  shadowRoot.appendChild(style);
}

const ContentScript = () => {
  const [icon, setIcon] = useState<{
    x: number
    y: number
    text: string
  } | null>(null);
  const [result, setResult] = useState<{
    x: number
    y: number
    text: string
  } | null>(null);
  const [showInputTranslator, setShowInputTranslator] = useState(false);
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');
  const resultPosRef = useRef<{ x: number; y: number; text: string } | null>(null);
  const lastCtrlPressRef = useRef<number>(0);
  const doubleClickThreshold = 300;
  const ctrlPressedRef = useRef<boolean>(false);

  // 主题检测和应用
  useEffect(() => {
    if (shadowRoot) {
      const initTheme = async () => {
        const theme = await getInitContentTheme();
        applyThemeToShadowRoot(theme, shadowRoot);
        
        // 设置实际主题状态
        let actual = theme;
        if (theme === 'auto') {
          actual = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        setActualTheme(actual as 'light' | 'dark');
      };
      initTheme();
      
      // 监听系统主题变化（仅在 auto 模式下）
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = async () => {
        const theme = await getInitContentTheme();
        if (theme === 'auto') {
          applyThemeToShadowRoot('auto', shadowRoot);
          const actual = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
          setActualTheme(actual);
        }
      };
      
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, [shadowRoot]);

  // 监听storage变化
  useEffect(() => {
    const handleStorageChange = async () => {
      if (shadowRoot) {
        const theme = await getInitContentTheme();
        applyThemeToShadowRoot(theme, shadowRoot);
        
        // 更新实际主题状态
        let actual = theme;
        if (theme === 'auto') {
          actual = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
        }
        setActualTheme(actual as 'light' | 'dark');
      }
    };

    // 监听storage变化
    storage.watch({
      [CONTENT_THEME_KEY]: handleStorageChange
    });

    return () => {
      storage.unwatch({
        [CONTENT_THEME_KEY]: handleStorageChange
      });
    };
  }, [shadowRoot]);

  const showTranslationIcon = (text: string, rect: DOMRect) => {
    // 验证rect的值，确保它们是有效的数字
    if (isNaN(rect.left) || isNaN(rect.bottom) || isNaN(rect.right) || isNaN(rect.top)) {
      return; // 如果坐标无效，不显示图标
    }
    
    const x = rect.left;
    const y = rect.bottom;
    const iconData = { x: rect.right, y: rect.top, text };
    setIcon(iconData);
    resultPosRef.current = { x, y, text };
  };

  const handleTranslation = () => {
    const { x, y, text } = resultPosRef.current || { x: icon?.x || 0, y: (icon?.y || 0) + 40, text: icon?.text || "" };
    setResult({ x, y, text });
    setIcon(null);
  };

  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // 检查点击是否发生在翻译结果悬浮窗内部
      const target = e.target as Element;
      if (target && (result || showInputTranslator)) {
        // 检查点击的元素是否在翻译结果区域内
        // 由于使用了Shadow DOM，需要从shadowRoot中查找
        const resultElement = shadowRoot?.querySelector('[data-translator-result]');
        const inputTranslatorElement = shadowRoot?.querySelector('.input-translator-card');
        if ((resultElement && resultElement.contains(target)) || 
            (inputTranslatorElement && inputTranslatorElement.contains(target))) {
          return; // 如果点击在结果区域或输入翻译器内，不关闭悬浮窗
        }
      }
      
      const selection = window.getSelection();
      const text = selection?.toString().trim();
      setResult(null);
      if (text && text.length > 0 && selection && selection.rangeCount > 0) {
        const rect = selection.getRangeAt(0).getBoundingClientRect();
        showTranslationIcon(text, rect);
      } else {
        setIcon(null);
        resultPosRef.current = null;
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.ctrlKey) {
        if (!ctrlPressedRef.current) {
          ctrlPressedRef.current = true;
          const now = Date.now();
          
          if (now - lastCtrlPressRef.current < doubleClickThreshold) {
            const selection = window.getSelection();
            const text = selection?.toString().trim();
            
            if (text && text.length > 0 && selection && selection.rangeCount > 0) {
              // 有选中文字，显示翻译结果
              const rect = selection.getRangeAt(0).getBoundingClientRect();
              
              // 验证坐标是否有效
              if (isNaN(rect.left) || isNaN(rect.bottom)) {
                return; // 如果坐标无效，不显示结果
              }
              
              const x = rect.left;
              const y = rect.bottom;
              setResult({ x, y, text });
              setIcon(null);
            } else {
              // 没有选中文字，显示输入翻译器
              setShowInputTranslator(true);
            }
          }
          lastCtrlPressRef.current = now;
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === 'Control' || !e.ctrlKey) {
        ctrlPressedRef.current = false;
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  return (
    <StyleProvider hashPriority="high" container={shadowRoot}>
      <ConfigProvider
        theme={{
          algorithm: actualTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        {icon && (
          <TranslatorIcon
            x={icon.x}
            y={icon.y}
            text={icon.text}
            onClick={handleTranslation}
          />
        )}
        {result && (
          <TranslatorResult
            x={result.x}
            y={result.y}
            text={result.text}
          />
        )}
        {showInputTranslator && (
          <InputTranslator
            onClose={() => setShowInputTranslator(false)}
          />
        )}
      </ConfigProvider>
    </StyleProvider>
  );
};

export default ContentScript; 