import {StyleProvider} from "@ant-design/cssinjs"
import { useEffect, useState, useCallback, useMemo, useRef } from "react"
import {App} from 'antd';
import {getBrowserLang, mapUiLangToI18nKey} from '~lib/constants/languages';
import './index.css';
import antdResetCssText from "data-text:antd/dist/reset.css"
import type { PlasmoGetShadowHostId } from "plasmo"
import TranslatorIcon from './components/TranslatorIcon';
import TranslatorResult from './components/TranslatorResult';
import InputTranslator from './components/InputTranslator';
import i18n, {initI18n} from '../i18n';
import {ThemeProvider} from '~lib/utils/theme';

// 引入拆分后的模块
import {setupSelectionHandler} from '~lib/translate/selection';
import {setupShortcutHandler} from '~lib/translate/shortcuts';
import {setupMessageHandler} from '~lib/messages/messaging';
import {setupAutoTranslate} from '~lib/translate/autoTranslate';

import {
    FAVORITE_LANGS_KEY,
    PAGE_LANG_KEY,
    SHORTCUT_SETTINGS_KEY,
    TEXT_LANG_KEY,
    TRANSLATE_SETTINGS_KEY,
    UI_LANG_KEY
} from '~lib/constants/settings';
import {initializeDefaultSettings, callTranslateAPI, callTTSAPI, stopTTSAPI} from './content';
import {useStorage} from "~lib/utils/storage";

const HOST_ID = "translator-csui"

export const getShadowHostId: PlasmoGetShadowHostId = () => HOST_ID

export const getStyle = () => {
  const style = document.createElement("style")
  style.textContent = antdResetCssText
  return style
}

let shadowRoot: ShadowRoot | null = null

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
                        onCloseResult,
                        onTranslationComplete,
                    }: {
    icon: { x: number; y: number; text: string } | null;
    result: { x: number; y: number; originalText: string } | null;
    showInputTranslator: boolean;
    handleTranslation: () => void;
    setShowInputTranslator: (show: boolean) => void;
    autoRead: boolean;
    engine: string;
    textTargetLang: string;
    shouldTranslate: boolean;
    setShouldTranslate: (should: boolean) => void;
    callTranslateAPI: (text: string, from: string, to: string, engine: string) => Promise<{
        result: string,
        engine: string
    }>;
    callTTSAPI: (text: string, lang: string) => Promise<{ success: boolean; audioData?: ArrayBuffer; error?: string }>;
    stopTTSAPI: () => Promise<void>;
    onCloseResult: () => void;
    onTranslationComplete: () => void;
}) => {
    // 在 App 组件内部使用 App.useApp() 获取 messages 实例
    const {message} = App.useApp();
    // 创建message适配器函数
    const showMessage = (type: 'success' | 'error' | 'warning' | 'info', content: string) => {
        switch (type) {
            case 'success':
                message.success(content).then();
                break;
            case 'error':
                message.error(content).then();
                break;
            case 'warning':
                message.warning(content).then();
                break;
            case 'info':
                message.info(content).then();
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
                    onTranslationComplete={onTranslationComplete}
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
    const resultPosRef = useRef<{ x: number; y: number; text: string } | null>(null);
    const lastCtrlPressRef = useRef<number>(0);

    // 新增：控制翻译时机
    const [shouldTranslate, setShouldTranslate] = useState(false);

    // 翻译设置相关 state - 使用 useStorage hook
    const [translateSettings, setTranslateSettings] = useStorage(TRANSLATE_SETTINGS_KEY, {
        engine: 'google',
        autoTranslate: true,
        autoRead: false
    });

    // 从 translateSettings 对象中提取值
    const engine = translateSettings?.engine || 'google';
    const autoRead = translateSettings?.autoRead ?? false;
    const autoTranslate = translateSettings?.autoTranslate ?? true;

    const engineRef = useRef(engine);
    const autoReadRef = useRef(autoRead);

    // 快捷键设置状态 - 使用 useStorage hook
    const [shortcutSettings, setShortcutSettings] = useStorage(SHORTCUT_SETTINGS_KEY, {
        enabled: true,
        customShortcut: ''
    });

    const shortcutEnabled = shortcutSettings?.enabled !== false;
    const customShortcut = shortcutSettings?.customShortcut || '';

    // 使用常量避免每次渲染都调用函数
    const defaultLang = useMemo(() => getBrowserLang(), []);

    // 划词翻译目标语言和偏好语言 - 使用 useStorage hook
    const [textTargetLang, setTextTargetLang] = useStorage(TEXT_LANG_KEY, defaultLang);
    const [favoriteLangs, setFavoriteLangs] = useStorage(FAVORITE_LANGS_KEY, []);

    // UI语言设置 - 使用 useStorage hook
    const [uiLang, setUILang] = useStorage(UI_LANG_KEY, defaultLang);

    // 读取网页翻译目标语言 - 使用 useStorage hook
    const [pageTargetLang, setPageTargetLang] = useStorage(PAGE_LANG_KEY, 'zh-CN');

    // 保持 ref 与 state 同步
    useEffect(() => {
        engineRef.current = engine;
    }, [engine]);
    useEffect(() => {
        autoReadRef.current = autoRead;
    }, [autoRead]);

    // 监听UI语言变化
    useEffect(() => {
        if (uiLang) {
            i18n.changeLanguage(mapUiLangToI18nKey(uiLang));
        }
    }, [uiLang]);

    // 用 ref 保证 handleTranslation 始终用到最新的 textTargetLang
    const textTargetLangRef = useRef(textTargetLang);
    useEffect(() => {
        textTargetLangRef.current = textTargetLang
    }, [textTargetLang]);

    // 显示翻译图标
    const showTranslationIcon = (text: string, rect: DOMRect) => {
        if (!showInputTranslator && !result) {
            // 如果开启了自动翻译，直接触发翻译
            if (autoTranslate) {
                // 将翻译结果显示在选中文字的正下方
                setResult({
                    x: rect.left + window.scrollX, // 左对齐
                    y: rect.bottom + window.scrollY, // 正下方
                    originalText: text
                });
                setShouldTranslate(true);
                return;
            }
            
            // 更精确的位置计算 - 使用视窗相对坐标，因为图标使用fixed定位
            const iconWidth = 32;
            const iconHeight = 32;
            const margin = 10;
            
            // 图标使用fixed定位，所以直接使用rect的坐标即可
            let iconX = rect.right;
            let iconY = rect.top - 15; // 调整为-15，让图标更偏上
            
            // 边界检查 - 使用视窗坐标系
            // 检查右边界 - 如果图标会超出右边界，移到文字左侧
            if (iconX + iconWidth + margin > window.innerWidth) {
                iconX = rect.left - iconWidth - margin;
            }
            
            // 检查左边界
            if (iconX < margin) {
                iconX = margin;
            }
            
            // 检查上边界 - 如果图标会超出上边界，移到文字下方
            if (iconY < margin) {
                iconY = rect.bottom + margin;
            }
            
            // 检查下边界
            if (iconY + iconHeight + margin > window.innerHeight) {
                iconY = window.innerHeight - iconHeight - margin;
            }
            
            setIcon({ 
                x: iconX, 
                y: iconY,
                text 
            });
        }
    };

    // 清除翻译状态
    const clearTranslationState = () => {
        setIcon(null);
        setResult(null);
        setShouldTranslate(false);
    };

    // 触发翻译 - 支持快捷键传参 - 使用useCallback稳定引用
    const triggerTranslation = useCallback((text?: string, rect?: DOMRect) => {
        const selection = window.getSelection();
        if (selection && selection.toString().trim()) {
            const selectionText = text || selection.toString().trim();
            const range = selection.getRangeAt(0);
            const selectionRect = rect || range.getBoundingClientRect();

            // 将翻译结果显示在选中文字的正下方
            setResult({
                x: selectionRect.left + window.scrollX, // 左对齐
                y: selectionRect.bottom + window.scrollY, // 正下方
                originalText: selectionText
            });
            setShouldTranslate(true);
        }
    }, []);

    // 处理翻译
    const handleTranslation = () => {
        if (icon) {
            // 重新获取当前选中文字的位置，确保翻译结果显示在选中文字的正下方
            const selection = window.getSelection();
            if (selection && selection.toString().trim()) {
                const range = selection.getRangeAt(0);
                const rect = range.getBoundingClientRect();
                
                setResult({
                    x: rect.left, // 使用视窗相对坐标，因为结果组件也使用fixed定位
                    y: rect.bottom + 5, // 选中文字的正下方
                    originalText: icon.text
                });
            } else {
                // 如果没有选中文字，则使用图标位置作为备选
                setResult({
                    x: icon.x,
                    y: icon.y + 30, // 在图标下方偏移30px
                    originalText: icon.text
                });
            }
            setShouldTranslate(true);
        }
    };

    // 初始化默认设置
    useEffect(() => {
        initializeDefaultSettings().then(() => {
        });
        
        // 获取Shadow Root
        const hostElement = document.getElementById(HOST_ID);
        if (hostElement?.shadowRoot) {
            shadowRoot = hostElement.shadowRoot;
        }
    }, []);

    // 设置文本选择处理器
    useEffect(() => {
        return setupSelectionHandler(
            shadowRoot,
            showTranslationIcon,
            clearTranslationState
        );
    }, [showInputTranslator, result, icon, autoTranslate]);

    // 设置快捷键处理器
    useEffect(() => {
        return setupShortcutHandler(
            triggerTranslation,
            setShowInputTranslator
        );
    }, [shortcutEnabled, customShortcut, triggerTranslation]); // 添加triggerTranslation依赖

    // 设置消息处理器，确保只注册一次
    useEffect(() => {
        setupMessageHandler();
    }, []);

    // 监听 result 状态变化，result 出现后再 setIcon(null)
    useEffect(() => {
        if (result) {
            setIcon(null);
        }
    }, [result]);

    // 使用useCallback包装函数，避免每次渲染都创建新的函数引用
    const callTranslateAPICallback = useCallback(callTranslateAPI, []);
    const callTTSAPICallback = useCallback(callTTSAPI, []);
    const stopTTSAPICallback = useCallback(stopTTSAPI, []);
    
    // 包装onCloseResult函数
    const onCloseResultCallback = useCallback(() => {
        setResult(null);
        setShouldTranslate(false);
    }, []);
    
    // 包装onTranslationComplete函数
    const onTranslationCompleteCallback = useCallback(() => {
        // 翻译完成后的处理逻辑
    }, []);

    // 设置自动翻译
    useEffect(() => {
        return setupAutoTranslate(pageTargetLang, engine, stopTTSAPICallback);
    }, [pageTargetLang, engine, stopTTSAPICallback]);

    (window as any).callTranslateAPI = callTranslateAPICallback;

    return (
        <ThemeProvider storageKey="content_theme_mode">
            <StyleProvider hashPriority="high" container={document.getElementById(HOST_ID)?.shadowRoot}>
                <App
                    message={{
                        top: 0, // 从顶部开始，因为容器已经有padding-top
                        duration: 3,
                        maxCount: 3,
                        getContainer: () => {
                            const shadowHost = document.getElementById(HOST_ID);
                            if (shadowHost?.shadowRoot) {
                                // 在shadow root内部创建一个容器元素来承载message
                                let messageContainer = shadowHost.shadowRoot.querySelector('#message-container') as HTMLElement;
                                if (!messageContainer) {
                                    messageContainer = document.createElement('div');
                                    messageContainer.id = 'message-container';
                                    messageContainer.style.cssText = `
                                        position: fixed; 
                                        top: 20px; 
                                        left: 50%;
                                        transform: translateX(-50%);
                                        width: 100vw; 
                                        height: auto; 
                                        pointer-events: none; 
                                        z-index: 2147483647;
                                        display: block;
                                        text-align: center;
                                        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                                        line-height: normal;
                                        white-space: normal;
                                        word-break: normal;
                                        writing-mode: horizontal-tb;
                                        direction: ltr;
                                    `;
                                    shadowHost.shadowRoot.appendChild(messageContainer);
                                }
                                return messageContainer;
                            }
                            return document.body;
                        },
                    }}
                >
                    <AppContent
                        icon={icon}
                        result={result}
                        showInputTranslator={showInputTranslator}
                        handleTranslation={handleTranslation}
                        setShowInputTranslator={setShowInputTranslator}
                        autoRead={autoRead}
                        engine={engine}
                        textTargetLang={textTargetLang}
                        shouldTranslate={shouldTranslate}
                        setShouldTranslate={setShouldTranslate}
                        callTranslateAPI={callTranslateAPICallback}
                        callTTSAPI={callTTSAPICallback}
                        stopTTSAPI={stopTTSAPICallback}
                        onCloseResult={onCloseResultCallback}
                        onTranslationComplete={onTranslationCompleteCallback}
                    />
                </App>
            </StyleProvider>
        </ThemeProvider>
    );
};

// 新增：i18n异步初始化包装
const ContentRoot = () => {
    const [ready, setReady] = useState(false);
    useEffect(() => {
        initI18n().then(() => setReady(true));
    }, []);
    if (!ready) return null;
    return <ContentScript/>;
};

export default ContentRoot;

