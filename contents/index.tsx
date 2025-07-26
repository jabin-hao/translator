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
import { message, ConfigProvider, theme, App } from 'antd';
import { Storage } from '@plasmohq/storage';
import { sendToBackground } from '@plasmohq/messaging';
import { TRANSLATE_ENGINES } from '../lib/engines';
import { getEngineLangCode, getBrowserLang, mapUiLangToI18nKey } from '../lib/languages';
import './index.css';
import TranslatorIcon from './components/TranslatorIcon';
import TranslatorResult from './components/TranslatorResult';
import InputTranslator from './components/InputTranslator';
import i18n, { initI18n } from '../i18n';

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

    /* Message组件样式 */
    .ant-message {
      z-index: 2147483647 !important;
    }

    .ant-message-notice {
      background: var(--card-bg) !important;
      border: 1px solid var(--card-border) !important;
      color: var(--text-primary) !important;
      box-shadow: var(--shadow) !important;
    }

    .ant-message-notice-content {
      color: var(--text-primary) !important;
    }

    .ant-message-success .anticon {
      color: #52c41a !important;
    }

    .ant-message-error .anticon {
      color: #ff4d4f !important;
    }

    .ant-message-warning .anticon {
      color: #faad14 !important;
    }

    .ant-message-info .anticon {
      color: #1890ff !important;
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

// 修改翻译API调用，集成缓存功能
async function callTranslateAPI(
  text: string,
  from: string,
  to: string,
  engine = 'bing'
): Promise<{ result: string, engine: string }> {
  const fromMapped = getEngineLangCode(from, engine);
  const toMapped = getEngineLangCode(to, engine);
  
  try {
    console.log('callTranslateAPI 开始:', { text, from, to, engine, fromMapped, toMapped });
    
    // 使用通用消息处理器
    const response = await sendToBackground({
      name: "handle" as any,
      body: {
        service: 'translate',
        action: 'translate',
        text,
        options: {
          from: fromMapped,
          to: toMapped,
          engine,
          useCache: true, // 启用缓存
        },
      },
    });

    console.log('callTranslateAPI 收到响应:', response);

    if (response.success && response.data) {
      const result = { 
        result: response.data.translation, 
        engine: response.data.engine 
      };
      console.log('callTranslateAPI 返回结果:', result);
      return result;
    } else {
      const error = response.error || '翻译失败';
      console.error('callTranslateAPI 翻译失败:', error);
      throw new Error(error);
    }
  } catch (error) {
    console.error('callTranslateAPI 异常:', error);
    
    // 如果是网络错误，尝试重试一次
    if (error instanceof Error && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
      console.log('检测到网络错误，尝试重试...');
      try {
        const response = await sendToBackground({
          name: "handle" as any,
          body: {
            service: 'translate',
            action: 'translate',
            text,
            options: {
              from: fromMapped,
              to: toMapped,
              engine,
              useCache: true,
            },
          },
        });
        
        if (response.success && response.data) {
          const result = { 
            result: response.data.translation, 
            engine: response.data.engine 
          };
          console.log('callTranslateAPI 重试成功:', result);
          return result;
        } else {
          throw new Error(response.error || '翻译失败');
        }
      } catch (retryError) {
        console.error('callTranslateAPI 重试也失败:', retryError);
        throw retryError;
      }
    }
    
    throw error;
  }
}

// 在App组件内部使用message的组件
const AppContent = ({ 
  icon, 
  result, 
  showInputTranslator, 
  handleTranslation, 
  setShowInputTranslator,
  setIcon, // 新增
  autoRead,
  engine,
  textTargetLang,
  favoriteLangs,
  callTranslateAPI,
  onCloseResult, // 新增
}: {
  icon: { x: number; y: number; text: string } | null;
  result: { x: number; y: number; originalText: string } | null;
  showInputTranslator: boolean;
  handleTranslation: () => void;
  setShowInputTranslator: (show: boolean) => void;
  setIcon: (icon: any) => void; // 新增
  autoRead: boolean;
  engine: string;
  textTargetLang: string;
  favoriteLangs: string[];
  callTranslateAPI: (text: string, from: string, to: string, engine: string) => Promise<{ result: string, engine: string }>;
  onCloseResult: () => void; // 新增
}) => {
  // 创建message适配器函数
  const showMessage = (type: 'success' | 'error' | 'warning' | 'info', content: string) => {
    
    // 使用全局message对象，但确保在ConfigProvider内部
    const messageInstance = message;
    
    switch (type) {
      case 'success':
        messageInstance.success(content);
        break;
      case 'error':
        messageInstance.error(content);
        break;
      case 'warning':
        messageInstance.warning(content);
        break;
      case 'info':
        messageInstance.info(content);
        break;
    }
  };

  return (
    <>
      {icon && (
        <TranslatorIcon
          x={icon.x}
          y={icon.y}
          text={icon.text}
          onClick={() => {
            // 不立即 setIcon(null)
            handleTranslation();
          }}
        />
      )}
      {result && (
        <TranslatorResult
          x={result.x}
          y={result.y}
          text={result.originalText}
          originalText={result.originalText}
          showMessage={showMessage}
          autoRead={autoRead}
          engine={engine}
          onClose={onCloseResult}
          targetLang={textTargetLang}
          shouldTranslate={false} // 使用状态控制翻译时机
          onTranslationComplete={() => {}} // 翻译完成后重置状态
          callTranslateAPI={callTranslateAPI} 
        />
      )}
      {showInputTranslator && (
        <InputTranslator
          onClose={() => setShowInputTranslator(false)}
          showMessage={showMessage}
          engine={engine}
          defaultTargetLang={textTargetLang}
          callTranslateAPI={callTranslateAPI}
        />
      )}
    </>
  );
};

const ContentScript = () => {
  const [icon, setIcon] = useState<{
    x: number
    y: number
    text: string
  } | null>(null);
  const [result, setResult] = useState<{
    x: number;
    y: number;
    originalText: string;
  } | null>(null);
  const [showInputTranslator, setShowInputTranslator] = useState(false);
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('light');
  const resultPosRef = useRef<{ x: number; y: number; text: string } | null>(null);
  const lastCtrlPressRef = useRef<number>(0);
  const doubleClickThreshold = 300;
  const ctrlPressedRef = useRef<boolean>(false);
  // 新增：划词翻译目标语言
  const [textTargetLang, setTextTargetLang] = useState(getBrowserLang()); // 使用浏览器语言作为默认值
  // 新增：偏好语言
  const [favoriteLangs, setFavoriteLangs] = useState<string[]>([]);

  // 新增：用 ref 保证 handleTranslation 始终用到最新的 textTargetLang
  const textTargetLangRef = useRef(textTargetLang);
  useEffect(() => { textTargetLangRef.current = textTargetLang }, [textTargetLang]);

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

  // 翻译设置相关 state
  const [engine, setEngine] = useState('google');
  const [autoRead, setAutoRead] = useState(false);
  const engineRef = useRef(engine);
  const autoReadRef = useRef(autoRead);

  // 新增：快捷键设置状态
  const [shortcutEnabled, setShortcutEnabled] = useState(true);
  const [customShortcut, setCustomShortcut] = useState('');

  // 保持 ref 与 state 同步
  useEffect(() => { engineRef.current = engine; }, [engine]);
  useEffect(() => { autoReadRef.current = autoRead; }, [autoRead]);

  // 初始化时读取设置
  useEffect(() => {
    storage.get('translate_settings').then((data) => {
      if (data && typeof data === 'object') {
        setEngine((data as any)?.engine || 'google');
        setAutoRead(!!(data as any)?.autoRead);
      }
    });
    // 新增：监听 storage 变化，实时同步引擎设置
    const handler = (changes, area) => {
      if (area === 'local' && changes['translate_settings']) {
        const data = changes['translate_settings'].newValue;
        if (data && typeof data === 'object') {
          setEngine(data.engine || 'google');
          setAutoRead(!!data.autoRead);
        }
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);

  // 新增：初始化快捷键设置，并监听storage变化
  useEffect(() => {
    storage.get('shortcut_settings').then((data) => {
      if (data && typeof data === 'object') {
        const enabled = (data as any)?.enabled !== false;
        const shortcut = (data as any)?.customShortcut || '';
        setShortcutEnabled(enabled);
        setCustomShortcut(shortcut);
        console.log('快捷键设置已加载:', { enabled, shortcut });
      } else {
        console.log('快捷键设置为空，使用默认值');
      }
    });
    // 监听快捷键设置变化
    const handler = (changes, area) => {
      if (area === 'local' && changes['shortcut_settings']) {
        const data = changes['shortcut_settings'].newValue;
        if (data && typeof data === 'object') {
          const enabled = data.enabled !== false;
          const shortcut = data.customShortcut || '';
          setShortcutEnabled(enabled);
          setCustomShortcut(shortcut);
          console.log('快捷键设置已更新:', { enabled, shortcut });
          // 重置状态
          lastCtrlPressRef.current = 0;
        }
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);

  // 新增：初始化textTargetLang和favoriteLangs，并监听storage变化
  useEffect(() => {
    storage.get('textTargetLang').then(val => {
      if (val) setTextTargetLang(val);
    });
    storage.get('favoriteLangs').then(val => {
      if (Array.isArray(val)) setFavoriteLangs(val);
    });
    const handler = (changes, area) => {
      if (area === 'local') {
        if (changes['textTargetLang']) setTextTargetLang(changes['textTargetLang'].newValue);
        if (changes['favoriteLangs']) setFavoriteLangs(changes['favoriteLangs'].newValue || []);
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);

  // 语言同步：初始化和监听storage变化
  useEffect(() => {
    // 初始化时读取
    storage.get('uiLang').then((lang) => {
      i18n.changeLanguage(mapUiLangToI18nKey(lang));
    });
    // 监听storage变化
    if (chrome && chrome.storage && chrome.storage.onChanged) {
      const handler = (changes, area) => {
        if (area === 'local' && changes['uiLang']) {
          const newLang = changes['uiLang'].newValue;
          i18n.changeLanguage(mapUiLangToI18nKey(newLang));
        }
      };
      chrome.storage.onChanged.addListener(handler);
      return () => chrome.storage.onChanged.removeListener(handler);
    }
  }, []);

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

  const handleTranslation = async () => {
    const { x, y, text } = resultPosRef.current || { x: icon?.x || 0, y: (icon?.y || 0) + 40, text: icon?.text || "" };
    setIcon(null);
    // 优先用textTargetLang，没有则用favoriteLangs[0]，再没有用浏览器语言
    let targetLang = textTargetLangRef.current;
    if (!targetLang) {
      if (favoriteLangs && favoriteLangs.length > 0) targetLang = favoriteLangs[0];
      else targetLang = getBrowserLang();
    }
    setResult({ x, y, originalText: text }); // 只存原文
  };

  // 修复 icon 一出现就消失、input 输入框无法输入的问题
  useEffect(() => {
    const handleMouseUp = (e: MouseEvent) => {
      // 1. 获取 shadowRoot 下的弹窗、icon、result 节点
      let inputTranslatorElement = null, resultElement = null, iconElement = null;
      if (shadowRoot) {
        inputTranslatorElement = shadowRoot.querySelector('.input-translator-card');
        resultElement = shadowRoot.querySelector('[data-translator-result]');
        iconElement = shadowRoot.querySelector('.translator-icon');
      }
      const path = e.composedPath();

      // 2. 如果点击在弹窗/输入框/icon 内部，直接 return
      if (
        (showInputTranslator && inputTranslatorElement && path.includes(inputTranslatorElement)) ||
        (result && resultElement && path.includes(resultElement)) ||
        (icon && iconElement && path.includes(iconElement))
      ) {
        return;
      }

      // 3. 判断 selection
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 0 && selection && selection.rangeCount > 0) {
        // 只在不是点击 icon 时显示 icon
        if (!(icon && iconElement && path.includes(iconElement))) {
          const rect = selection.getRangeAt(0).getBoundingClientRect();
          showTranslationIcon(text, rect);
        }
        // 不要立刻清空 icon/result，但也不要阻止后续处理
      } else {
        // 4. 没有选中内容，且不是点击在弹窗/输入框/icon 内部，清空所有
        resultPosRef.current = null;
        setResult(null);
        setIcon(null);
        setShowInputTranslator(false);
        
        // 清除选中状态
        if (window.getSelection) {
          const sel = window.getSelection();
          if (sel) sel.removeAllRanges();
        }
      }
    };

    // 添加 mousedown 事件监听器，确保点击外部时能清空结果
    const handleMouseDown = (e: MouseEvent) => {
      // 获取 shadowRoot 下的弹窗、icon、result 节点
      let inputTranslatorElement = null, resultElement = null, iconElement = null;
      if (shadowRoot) {
        inputTranslatorElement = shadowRoot.querySelector('.input-translator-card');
        resultElement = shadowRoot.querySelector('[data-translator-result]');
        iconElement = shadowRoot.querySelector('.translator-icon');
      }
      const path = e.composedPath();

      // 如果点击在弹窗/输入框/icon 内部，不处理
      if (
        (showInputTranslator && inputTranslatorElement && path.includes(inputTranslatorElement)) ||
        (result && resultElement && path.includes(resultElement)) ||
        (icon && iconElement && path.includes(iconElement))
      ) {
        return;
      }

      // 点击外部，清空所有状态
      resultPosRef.current = null;
      setResult(null);
      setIcon(null);
      setShowInputTranslator(false);
      
      // 清除选中状态
      if (window.getSelection) {
        const sel = window.getSelection();
        if (sel) sel.removeAllRanges();
      }
    };

    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousedown', handleMouseDown);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [showInputTranslator, result, icon]);

  // 2. 监听 result 状态变化，result 出现后再 setIcon(null)
  useEffect(() => {
    if (result) {
      setIcon(null);
    }
  }, [result]);

  // 新增：双击快捷键检测状态
  const [doubleClickState, setDoubleClickState] = useState<{
    lastKey: string;
    lastTime: number;
    threshold: number;
  }>({ lastKey: '', lastTime: 0, threshold: 300 });

  // 组件外部
  const lastCtrlPressTimeRef = useRef(0);
  const isTranslatingRef = useRef(false); // 添加翻译状态标记

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      let shouldTrigger = false;
      let isDoubleCtrl = false;

      // 检测双击Ctrl
      if (e.key === 'Control') {
        const now = Date.now();
        if (now - lastCtrlPressTimeRef.current < 300) {
          isDoubleCtrl = true;
        }
        lastCtrlPressTimeRef.current = now;
      }

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
          if (isTranslatingRef.current) {
            console.log('翻译正在进行中，跳过重复调用');
            return;
          }
          
          const selection = window.getSelection();
          const text = selection?.toString().trim();
          if (text && text.length > 0 && selection && selection.rangeCount > 0) {
            if (!shortcutEnabled) return;
            const rect = selection.getRangeAt(0).getBoundingClientRect();
            if (isNaN(rect.left) || isNaN(rect.bottom)) {
              return;
            }
            const x = rect.left;
            const y = rect.bottom;
            setIcon(null);
            let targetLang = textTargetLangRef.current;
            if (!targetLang) {
              if (favoriteLangs && favoriteLangs.length > 0) targetLang = favoriteLangs[0];
              else targetLang = getBrowserLang();
            }
            
            // 设置翻译状态
            isTranslatingRef.current = true;
            console.log('开始快捷键翻译:', text);
            
            // 只设置 result 状态，让 TranslatorResult 组件处理翻译
            setResult({ x, y, originalText: text });
            isTranslatingRef.current = false;
          } else {
            setShowInputTranslator(true);
          }
        }
      } else {
        // 没有选中文字，双击Ctrl始终唤起输入组件
        if (isDoubleCtrl) {
          setShowInputTranslator(true);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {};

    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [shortcutEnabled, customShortcut, textTargetLang, favoriteLangs]);

  // 朗读功能
  let currentUtterance: SpeechSynthesisUtterance | null = null;

  // 朗读文本
  async function speakText(text: string, lang: string, speed = 1, pitch = 1, volume = 1): Promise<{ success: boolean; error?: string }> {
    try {
      // 停止当前朗读
      if (currentUtterance) {
        window.speechSynthesis.cancel();
        currentUtterance = null;
      }
      
      if (!('speechSynthesis' in window)) {
        return {
          success: false,
          error: 'Web Speech API not supported'
        };
      }
      
      return new Promise((resolve) => {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = lang;
        utterance.rate = speed;
        utterance.pitch = pitch;
        utterance.volume = volume;
        
        utterance.onend = () => {
          currentUtterance = null;
          resolve({ success: true });
        };
        
        utterance.onerror = (event) => {
          currentUtterance = null;
          resolve({
            success: false,
            error: `Speech synthesis error: ${event.error}`
          });
        };
        
        currentUtterance = utterance;
        window.speechSynthesis.speak(utterance);
      });
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error)
      };
    }
  }

  // 停止朗读
  function stopSpeaking(): void {
    if (currentUtterance) {
      window.speechSynthesis.cancel();
      currentUtterance = null;
    }
  }

  return (
    <StyleProvider hashPriority="high" container={shadowRoot}>
      <ConfigProvider
        theme={{
          algorithm: actualTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm,
        }}
      >
        <App
          message={{
            top: 20,
            duration: 2.5,
            maxCount: 3,
            getContainer: () => (shadowRoot?.host as HTMLElement) || document.body,
          }}
        >
          <AppContent 
            icon={icon} 
            result={result} 
            showInputTranslator={showInputTranslator} 
            handleTranslation={handleTranslation} 
            setShowInputTranslator={setShowInputTranslator} 
            setIcon={setIcon} // 新增
            autoRead={autoRead}
            engine={engine}
            textTargetLang={textTargetLang}
            favoriteLangs={favoriteLangs}
            callTranslateAPI={callTranslateAPI}
            onCloseResult={() => setResult(null)}
        />
        </App>
      </ConfigProvider>
    </StyleProvider>
  );
};

// 新增：i18n异步初始化包装
const ContentRoot = () => {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    initI18n().then(() => setReady(true));
  }, []);
  if (!ready) return null;
  return <ContentScript />;
};

export default ContentRoot; 