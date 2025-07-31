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
import { ConfigProvider, theme, App, Progress } from 'antd';
import { Storage } from '@plasmohq/storage';
import { sendToBackground } from '@plasmohq/messaging';
import { getEngineLangCode, getBrowserLang, mapUiLangToI18nKey, getTTSLang } from '../lib/languages';
import './index.css';
import TranslatorIcon from './components/TranslatorIcon';
import TranslatorResult from './components/TranslatorResult';
import InputTranslator from './components/InputTranslator';
import i18n, { initI18n } from '../i18n';

// 引入拆分后的模块
import { setupSelectionHandler } from './lib/selection';
import { setupShortcutHandler } from './lib/shortcuts';
import { setupMessageHandler } from './lib/messaging';
import { setupAutoTranslate } from './lib/autoTranslate';

// 1. 引入 storage 工具
import { TRANSLATE_SETTINGS_KEY, CACHE_KEY, PAGE_LANG_KEY, TEXT_LANG_KEY, UI_LANG_KEY } from '../lib/constants';

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
): Promise<{ success: boolean; audioData?: ArrayBuffer; error?: string }> {
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
      // 如果有音频数据，返回 ArrayBuffer
      if (response.data.audioData) {
        try {
          // 将 base64 数据转换为 ArrayBuffer
          const binaryString = atob(response.data.audioData);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          return { 
            success: true, 
            audioData: bytes.buffer 
          };
        } catch (audioError) {
          return { success: false, error: `音频数据转换失败: ${audioError.message}` };
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
  callTTSAPI: (text: string, lang: string) => Promise<{ success: boolean; audioData?: ArrayBuffer; error?: string }>;
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
  // 移除 isPageTranslating 状态，不再需要全局 loading

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

  // 清空翻译状态的函数
  const clearTranslationState = () => {
    resultPosRef.current = null;
    setResult(null);
    setIcon(null);
    setShowInputTranslator(false);
  };

  // 触发翻译的函数（用于快捷键）
  const triggerTranslation = (text: string, rect: DOMRect) => {
    const x = rect.left;
    const y = rect.bottom;
    resultPosRef.current = { x, y, text };
    setIcon(null);
    setResult({ x, y, originalText: text });
    setShouldTranslate(true);
  };

  // 设置文本选择处理器
  useEffect(() => {
    const cleanup = setupSelectionHandler(
      shadowRoot,
      showTranslationIcon,
      clearTranslationState,
      setShowInputTranslator
    );
    return cleanup;
  }, [showInputTranslator, result, icon, autoTranslate]);

  // 设置快捷键处理器
  useEffect(() => {
    const cleanup = setupShortcutHandler(
      triggerTranslation,
      setShowInputTranslator
    );
    return cleanup;
  }, [shortcutEnabled, customShortcut, textTargetLang, favoriteLangs, shouldTranslate, autoTranslate]);

  // 设置消息处理器，确保只注册一次
  useEffect(() => {
    setupMessageHandler();
  }, []);

  // 2. 监听 result 状态变化，result 出现后再 setIcon(null)
  useEffect(() => {
    if (result) {
      setIcon(null);
    }
  }, [result]);

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

  // 设置自动翻译
  useEffect(() => {
    console.log('ContentScript: 准备设置自动翻译，参数:', { pageTargetLang, engine });
    const cleanup = setupAutoTranslate(pageTargetLang, engine, stopTTSAPI);
    console.log('ContentScript: setupAutoTranslate 已调用，返回清理函数');
    return cleanup;
  }, [pageTargetLang, engine, stopTTSAPI]);

  // 移除全局 loading
  // useEffect(() => {
  //   if (chrome?.runtime?.onMessage) {
  //     const handler = (msg, sender, sendResponse) => {
  //       if (msg.type === 'FULL_PAGE_TRANSLATE') {
  //         setIsPageTranslating(true);
  //       }
  //       if (msg.type === 'FULL_PAGE_TRANSLATE_DONE') {
  //         setIsPageTranslating(false);
  //       }
  //       if (msg.type === 'RESTORE_ORIGINAL_PAGE') {
  //         setIsPageTranslating(true);
  //       }
  //       if (msg.type === 'RESTORE_ORIGINAL_PAGE_DONE') {
  //         setIsPageTranslating(false);
  //       }
  //     };
  //     chrome.runtime.onMessage.addListener(handler);
  //     return () => chrome.runtime.onMessage.removeListener(handler);
  //   }
  // }, []);

  // 在网页翻译完成后自动隐藏 loading（可在 lazyFullPageTranslate 完成后发送消息）
  useEffect(() => {
    // 假设 lazyFullPageTranslate 完成后会发送 'FULL_PAGE_TRANSLATE_DONE' 消息
    // 这里可以添加一个逻辑，当翻译完成时，发送 'FULL_PAGE_TRANSLATE_DONE' 消息
    // 例如，在 setupAutoTranslate 的 onComplete 回调中
    // 或者在翻译结果显示后，手动发送
    // 为了简化，这里直接在翻译完成后发送消息
    // 实际应用中，可能需要更复杂的逻辑来判断翻译是否真正完成
    // 例如，检查是否有新的翻译结果出现，或者等待一段时间
    // 这里简单地假设翻译完成后，isPageTranslating 会变为 false
    // 如果需要更精确的控制，可以考虑在翻译结果显示后，手动发送消息
  }, []); // 依赖于 isPageTranslating 的变化

  (window as any).callTranslateAPI = callTranslateAPI;

  // 新增：整页翻译/还原按钮逻辑（示例）
  const handleFullPageTranslate = () => {
    // setIsPageTranslating(true); // 移除全局 loading
    // setIsPageTranslated(true); // 移除全局 loading
    // 发送消息给 content-script 执行整页翻译
    chrome.runtime.sendMessage({ type: 'FULL_PAGE_TRANSLATE', lang: pageTargetLang, engine });
  };
  const handleRestorePage = () => {
    // setIsPageTranslating(true); // 移除全局 loading
    // setIsPageTranslated(false); // 移除全局 loading
    chrome.runtime.sendMessage({ type: 'RESTORE_ORIGINAL_PAGE' });
  };

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
        {/* 移除全局 loading */}
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