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
import { getBrowserLang } from '../lib/languages';
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

// 新增：调用后台翻译API的方法（Plasmo消息）
async function callTranslateAPI(text: string, from: string, to: string, engine = 'google'): Promise<string> {
  try {
    const res = await sendToBackground({
      name: 'translate',
      body: { text, from, to, engine }
    });
    if (res?.result) return res.result;
    throw new Error(res?.error || '翻译失败');
  } catch (e) {
    throw typeof e === 'string' ? e : (e?.message || '翻译失败');
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
  result: { x: number; y: number; text: string } | null;
  showInputTranslator: boolean;
  handleTranslation: () => void;
  setShowInputTranslator: (show: boolean) => void;
  setIcon: (icon: any) => void; // 新增
  autoRead: boolean;
  engine: string;
  textTargetLang: string;
  favoriteLangs: string[];
  callTranslateAPI: (text: string, from: string, to: string, engine: string) => Promise<string>;
  onCloseResult: () => void; // 新增
}) => {
  // 创建message适配器函数
  const showMessage = (type: 'success' | 'error' | 'warning' | 'info', content: string) => {
    console.log('showMessage called:', type, content); // 调试信息
    
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
            setIcon(null); // 点击后立即隐藏图标
            handleTranslation();
          }}
        />
      )}
      {result && (
        <TranslatorResult
          x={result.x}
          y={result.y}
          text={result.text}
          showMessage={showMessage}
          autoRead={autoRead}
          engine={engine}
          onClose={onCloseResult}
          targetLang={textTargetLang}
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
  // 新增：划词翻译目标语言
  const [textTargetLang, setTextTargetLang] = useState('');
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
    try {
      const translated = await callTranslateAPI(text, 'auto', targetLang, engineRef.current); // 用最新的 engine
      setResult({ x, y, text: translated });
      // 自动朗读
      if (autoReadRef.current && translated) {
        if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
        const utter = new window.SpeechSynthesisUtterance(translated);
        utter.lang = targetLang;
        window.speechSynthesis.speak(utter);
      }
    } catch (e) {
      setResult({ x, y, text: '翻译失败: ' + e });
    }
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
        // 不要立刻清空 icon/result
        return;
      }

      // 4. 没有选中内容，且不是点击在弹窗/输入框/icon 内部，清空所有
        if (window.getSelection) {
          const sel = window.getSelection();
          if (sel) sel.removeAllRanges();
        }
        resultPosRef.current = null;
      setResult(null);
      setIcon(null);
      setShowInputTranslator(false);
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [showInputTranslator, result, icon]);

  // 保持键盘事件监听在 document 上
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Control' || e.ctrlKey) {
        if (!ctrlPressedRef.current) {
          ctrlPressedRef.current = true;
          const now = Date.now();
          if (now - lastCtrlPressRef.current < doubleClickThreshold) {
            const selection = window.getSelection();
            const text = selection?.toString().trim();
            if (text && text.length > 0 && selection && selection.rangeCount > 0) {
              // 有选中文字，自动翻译并显示结果
              const rect = selection.getRangeAt(0).getBoundingClientRect();
              if (isNaN(rect.left) || isNaN(rect.bottom)) {
                return;
              }
              const x = rect.left;
              const y = rect.bottom;
              setIcon(null); // 双击Ctrl时也立即隐藏icon
              // 复用handleTranslation的目标语言逻辑
              let targetLang = textTargetLangRef.current;
              if (!targetLang) {
                if (favoriteLangs && favoriteLangs.length > 0) targetLang = favoriteLangs[0];
                else targetLang = getBrowserLang();
              }
              callTranslateAPI(text, 'auto', targetLang, engineRef.current)
                .then(translated => {
                  setResult({ x, y, text: translated });
                  // 自动朗读
                  if (autoReadRef.current && translated) {
                    if (window.speechSynthesis.speaking) window.speechSynthesis.cancel();
                    const utter = new window.SpeechSynthesisUtterance(translated);
                    utter.lang = targetLang;
                    window.speechSynthesis.speak(utter);
                  }
                })
                .catch(e => {
                  setResult({ x, y, text: '翻译失败: ' + e });
                });
            } else {
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
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
    };
  }, [textTargetLang, favoriteLangs]);

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

export default ContentScript; 