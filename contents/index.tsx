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
import { getEngineLangCode, getBrowserLang, mapUiLangToI18nKey, getTTSLang } from '../lib/languages';
import './index.css';
import TranslatorIcon from './components/TranslatorIcon';
import TranslatorResult from './components/TranslatorResult';
import InputTranslator from './components/InputTranslator';
import i18n, { initI18n } from '../i18n';

// 1. 引入 storage 工具
import { getSiteTranslateSettings, getDictConfig, matchSiteList } from '../lib/siteTranslateSettings';
import { lazyFullPageTranslate } from '../lib/fullPageTranslate';
import { TRANSLATE_SETTINGS_KEY, CACHE_KEY, PAGE_LANG_KEY, TEXT_LANG_KEY, UI_LANG_KEY, ALWAYS_LANGS_KEY, NEVER_LANGS_KEY } from '../lib/constants';

const storage = new Storage();

// 初始化默认设置
async function initializeDefaultSettings() {
  try {
    // 检查并设置缓存默认值
    const cacheEnabled = await storage.get(CACHE_KEY);
    if (cacheEnabled === null || cacheEnabled === undefined) {
      console.log('设置缓存默认值为启用');
      await storage.set(CACHE_KEY, true);
    }
  } catch (error) {
    console.error('初始化默认设置失败:', error);
  }
}

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

    /* Message组件样式优化 */
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

    if (response.success && response.data) {
      const result = { 
        result: response.data.translation, 
        engine: response.data.engine 
      };
      return result;
    } else {
      const error = response.error || '翻译失败';
      throw new Error(error);
    }
  } catch (error) {
    
    // 如果是网络错误，尝试重试一次
    if (error instanceof Error && (error.message.includes('Failed to fetch') || error.message.includes('NetworkError'))) {
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
          return result;
        } else {
          throw new Error(response.error || '翻译失败');
        }
      } catch (retryError) {
        throw retryError;
      }
    }
    
    throw error;
  }
}

// TTS 朗读方法
async function callTTSAPI(
  text: string,
  lang: string
): Promise<{ success: boolean; error?: string }> {
  try {
    
    // 使用通用消息处理器
    const response = await sendToBackground({
      name: "handle" as any,
      body: {
        service: 'speech',
        action: 'speak',
        options: {
          text,
          lang: getTTSLang(lang),
          speed: 1,
          pitch: 1,
          volume: 1
        }
      },
    });

    if (response.success && response.data) {
      // 如果有音频数据，播放音频
      if (response.data.audioData) {
        try {
          
          // 将 base64 数据转换为 blob
          const audioBlob = new Blob(
            [Uint8Array.from(atob(response.data.audioData), c => c.charCodeAt(0))],
            { type: response.data.audioType || 'audio/mpeg' }
          );
          
          // 使用 data URL 而不是 blob URL 来避免 CSP 问题
          const reader = new FileReader();
          reader.onload = async () => {
            try {
              const audio = new Audio(reader.result as string);
              
              // 添加音频加载事件监听
              audio.onloadstart = () => {};
              audio.oncanplay = () => {};
              audio.onerror = (e) => {
                console.warn('音频播放错误:', e);
              };
              
              // 播放音频
              await audio.play();
              
            } catch (audioError) {
              console.warn('音频播放失败:', audioError);
            }
          };
          
          reader.readAsDataURL(audioBlob);
          
          return { success: true };
        } catch (audioError) {
          return { success: false, error: `音频播放失败: ${audioError.message}` };
        }
      } else {
        return { success: true };
      }
    } else {
      const error = response.error || '朗读失败';
      return { success: false, error };
    }
  } catch (error) {
    return { success: false, error: error.message };
  }
}

// 停止朗读方法
async function stopTTSAPI(): Promise<void> {
  try {
    
    await sendToBackground({
      name: "handle" as any,
      body: {
        service: 'speech',
        action: 'stop'
      },
    });
    
  } catch (error) {
  }
}

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

// 在App组件内部使用message的组件
const AppContent = ({ 
  icon, 
  result, 
  showInputTranslator, 
  handleTranslation, 
  setShowInputTranslator,
  autoRead,
  engine,
  textTargetLang,
  shouldTranslate,
  setShouldTranslate,
  callTranslateAPI,
  callTTSAPI,
  stopTTSAPI,
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
  shouldTranslate: boolean;
  setShouldTranslate: (should: boolean) => void;
  callTranslateAPI: (text: string, from: string, to: string, engine: string) => Promise<{ result: string, engine: string }>;
  callTTSAPI: (text: string, lang: string) => Promise<{ success: boolean; error?: string }>;
  stopTTSAPI: () => Promise<void>;
  onCloseResult: () => void; // 新增
}) => {
  // 在 App 组件内部使用 App.useApp() 获取 message 实例
  const { message } = App.useApp();
  
  // 创建message适配器函数
  const showMessage = (type: 'success' | 'error' | 'warning' | 'info', content: string) => {
    switch (type) {
      case 'success':
        message.success(content);
        break;
      case 'error':
        message.error(content);
        break;
      case 'warning':
        message.warning(content);
        break;
      case 'info':
        message.info(content);
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
          shouldTranslate={shouldTranslate}
          onTranslationComplete={() => {}} // 翻译完成后不自动归零 shouldTranslate
          callTranslateAPI={callTranslateAPI} 
          callTTSAPI={callTTSAPI}
          stopTTSAPI={stopTTSAPI}
          setShouldTranslate={setShouldTranslate}
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
  // 新增：划词翻译目标语言
  const [textTargetLang, setTextTargetLang] = useState(getBrowserLang()); // 使用浏览器语言作为默认值
  // 新增：偏好语言
  const [favoriteLangs, setFavoriteLangs] = useState<string[]>([]);
  // 新增：控制翻译时机
  const [shouldTranslate, setShouldTranslate] = useState(false);
  // 新增：控制自动翻译
  const [autoTranslate, setAutoTranslate] = useState(true);

  // 新增：用 ref 保证 handleTranslation 始终用到最新的 textTargetLang
  const textTargetLangRef = useRef(textTargetLang);
  useEffect(() => { textTargetLangRef.current = textTargetLang }, [textTargetLang]);

  // 初始化默认设置
  useEffect(() => {
    initializeDefaultSettings();
  }, []);

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
    storage.get(TRANSLATE_SETTINGS_KEY).then((data) => {
      if (data && typeof data === 'object') {
        setEngine((data as any)?.engine || 'google');
        setAutoRead(!!(data as any)?.autoRead);
      }
    });
    // 新增：监听 storage 变化，实时同步引擎设置
    storage.watch({
      [TRANSLATE_SETTINGS_KEY]: (newValue) => {
        if (newValue && typeof newValue === 'object') {
          setEngine((newValue as any)?.engine || 'google');
          setAutoRead(!!(newValue as any)?.autoRead);
        }
      }
    });
  }, []);

  // 新增：初始化快捷键设置，并监听storage变化
  useEffect(() => {
    storage.get('shortcut_settings').then((data) => {
      if (data && typeof data === 'object') {
        const enabled = (data as any)?.enabled !== false;
        const shortcut = (data as any)?.customShortcut || '';
        setShortcutEnabled(enabled);
        setCustomShortcut(shortcut);
      } else {
      }
    });
    // 监听快捷键设置变化
    storage.watch({
      'shortcut_settings': (change) => {
        if (change.newValue && typeof change.newValue === 'object') {
          const enabled = change.newValue.enabled !== false;
          const shortcut = change.newValue.customShortcut || '';
          setShortcutEnabled(enabled);
          setCustomShortcut(shortcut);
          // 重置状态
          lastCtrlPressRef.current = 0;
        }
      }
    });
  }, []);

  // 新增：初始化textTargetLang和favoriteLangs，并监听storage变化
  useEffect(() => {
    storage.get(TEXT_LANG_KEY).then(val => {
      if (val) setTextTargetLang(val);
    });
    storage.get('favoriteLangs').then(val => {
      if (Array.isArray(val)) setFavoriteLangs(val);
    });
    storage.watch({
      [TEXT_LANG_KEY]: (change) => {
        if (change.newValue) setTextTargetLang(change.newValue);
      },
      'favoriteLangs': (change) => {
        if (Array.isArray(change.newValue)) setFavoriteLangs(change.newValue);
      }
    });
  }, []);

  // 新增：控制自动翻译
  useEffect(() => {
    storage.get(TRANSLATE_SETTINGS_KEY).then((data) => {
      if (data && typeof data === 'object') {
        setAutoTranslate((data as any)?.autoTranslate ?? true);
      }
    });
    // 监听 storage 变化
    storage.watch({
      [TRANSLATE_SETTINGS_KEY]: (change) => {
        if (change.newValue && typeof change.newValue === 'object') {
          setAutoTranslate((change.newValue as any)?.autoTranslate ?? true);
        }
      }
    });
  }, []);

  // 语言同步：初始化和监听storage变化
  useEffect(() => {
    // 初始化时读取
    storage.get(UI_LANG_KEY).then((lang) => {
      i18n.changeLanguage(mapUiLangToI18nKey(lang));
    });
    // 监听storage变化
    storage.watch({
      [UI_LANG_KEY]: (change) => {
        i18n.changeLanguage(mapUiLangToI18nKey(change.newValue));
      }
    });
  }, []);

  const showTranslationIcon = (text: string, rect: DOMRect) => {
    // 验证rect的值，确保它们是有效的数字
    if (isNaN(rect.left) || isNaN(rect.bottom) || isNaN(rect.right) || isNaN(rect.top)) {
      return; // 如果坐标无效，不显示图标
    }
    
    const x = rect.left;
    const y = rect.bottom;
    const iconData = { x: rect.right, y: rect.top, text };
    resultPosRef.current = { x, y, text };
    if (autoTranslate) {
      // 自动翻译：直接弹出翻译结果
      handleTranslation();
    } else {
      // 只显示icon
      setIcon(iconData);
    }
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
    setShouldTranslate(true); // 设置开始翻译
  };

  // 修复输入框光标问题的事件处理逻辑
  useEffect(() => {
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
          resultPosRef.current = null;
          setResult(null);
          setIcon(null);
          setShowInputTranslator(false);
        }
      }, 10);
    };

    document.addEventListener('mouseup', handleMouseUp, { passive: true });
    document.addEventListener('mousedown', handleMouseDown, { passive: true });
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousedown', handleMouseDown);
    };
  }, [showInputTranslator, result, icon, autoTranslate]);

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
            
            // 只设置 result 状态，让 TranslatorResult 组件处理翻译
            setResult({ x, y, originalText: text });
            setShouldTranslate(true); // 设置开始翻译
            
            // 重置翻译状态
            setTimeout(() => {
              isTranslatingRef.current = false;
            }, 100);
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

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [shortcutEnabled, customShortcut, textTargetLang, favoriteLangs, shouldTranslate, autoTranslate]);

  // 读取网页翻译目标语言
  const [pageTargetLang, setPageTargetLang] = useState('zh-CN');
  useEffect(() => {
    storage.get(PAGE_LANG_KEY).then((val) => {
      if (val) setPageTargetLang(val);
    });
    storage.watch({
      [PAGE_LANG_KEY]: (change) => {
        if (change.newValue) setPageTargetLang(change.newValue);
      }
    });
  }, []);

  // 新增：整页翻译自动触发逻辑
  useEffect(() => {
    const triggerFullPageTranslation = async () => {
      const host = window.location.hostname;
      const path = window.location.pathname;
      const fullUrl = path === '/' ? host : host + path;
      console.log('fullUrl', fullUrl);
      const settings = await getSiteTranslateSettings();
      const dict = await getDictConfig();
      if (!settings.autoTranslateEnabled) return;
      if (matchSiteList(dict.siteNeverList || [], fullUrl)) return;
      if (matchSiteList(dict.siteAlwaysList || [], fullUrl)) {
        if (typeof (window as any).__autoFullPageTranslated === 'undefined') {
          (window as any).__autoFullPageTranslated = true;
          const mode = (settings as any).pageTranslateMode || 'translated';
          await lazyFullPageTranslate(pageTargetLang, mode, engine);
        }
      }
    };
    // 页面加载后触发
    triggerFullPageTranslation();
  }, [pageTargetLang, engine]);

  // 新增：整页翻译触发逻辑
  useEffect(() => {
    const triggerFullPageTranslation = async () => {
      const currentUrl = window.location.href;
      console.log('currentUrl', currentUrl);
      const alwaysTranslate = await storage.get(ALWAYS_LANGS_KEY);
      const neverTranslate = await storage.get(NEVER_LANGS_KEY);

      if (alwaysTranslate && Array.isArray(alwaysTranslate) && alwaysTranslate.includes(currentUrl)) {
        // 在 always 列表中，自动触发整页翻译
        await callTranslateAPI(document.body.innerText, getBrowserLang(), textTargetLang, engine);
        message.success('整页翻译完成！');
      } else if (neverTranslate && Array.isArray(neverTranslate) && neverTranslate.includes(currentUrl)) {
        // 在 never 列表中，禁止自动整页翻译
        message.warning('当前页面禁止自动整页翻译。');
      } else {
        // 不在列表中，不自动触发整页翻译
      }
    };

    // 监听页面加载完成事件
    const handleLoad = () => {
      // 延迟执行，确保 DOM 已完全加载
      setTimeout(triggerFullPageTranslation, 100);
    };

    // 监听页面卸载事件
    const handleBeforeUnload = () => {
      // 在页面卸载前，停止所有 TTS 播放
      stopTTSAPI();
    };

    // 监听页面内容变化事件
    const handleContentChange = () => {
      // 当页面内容发生变化时，重新触发整页翻译
      triggerFullPageTranslation();
    };

    // 监听页面卸载事件
    window.addEventListener('beforeunload', handleBeforeUnload);
    // 监听页面加载完成事件
    window.addEventListener('load', handleLoad);
    // 监听页面内容变化事件
    document.addEventListener('DOMContentLoaded', handleContentChange);
    document.addEventListener('readystatechange', () => {
      if (document.readyState === 'interactive') {
        handleContentChange(); // 在交互状态时也触发一次
      }
    });

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('load', handleLoad);
      document.removeEventListener('DOMContentLoaded', handleContentChange);
      document.removeEventListener('readystatechange', () => {});
    };
  }, [textTargetLang, engine, autoTranslate]);

  (window as any).callTranslateAPI = callTranslateAPI;

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
            getContainer: () => (shadowRoot?.host || document.body) as HTMLElement,
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
            shouldTranslate={shouldTranslate}
            setShouldTranslate={setShouldTranslate}
            callTranslateAPI={callTranslateAPI}
            callTTSAPI={callTTSAPI}
            stopTTSAPI={stopTTSAPI}
            onCloseResult={() => {
              setResult(null);
              setShouldTranslate(false);
            }}
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