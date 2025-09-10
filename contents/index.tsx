import { StyleProvider } from "@ant-design/cssinjs"
import { useEffect, useCallback, useRef } from "react"
import { App } from 'antd';
import { useImmer } from 'use-immer';
import { mapUiLangToI18nKey } from '~lib/constants/languages';
import './styles/index.css';
import antdResetCssText from "data-text:antd/dist/reset.css"
import type { PlasmoGetShadowHostId } from "plasmo"
import TranslatorIcon from './components/TranslatorIcon';
import TranslatorResult from './components/TranslatorResult';
import InputTranslator from './components/InputTranslator';
import i18n, { initI18n } from '../i18n';
import { ThemeProvider } from '~lib/theme/theme';

// 引入拆分后的模块
import { setupSelectionHandler } from '~lib/translate/selection';
import { setupShortcutHandler } from '~lib/translate/shortcuts';
import { setupMessageHandler } from '~lib/messages/message';
import { setupAutoTranslate } from '~lib/translate/page_translate_trigger';

// 使用新的全局配置系统
import {
    useGlobalSettings,
    useEngineSettings,
    useTextTranslateSettings,
    useThemeSettings,
    useShortcutSettings,
    usePageTranslateSettings
} from '~lib/settings/settings';
import { useDomainSettings } from '~lib/storage/chrome_storage_hooks';
import { callTranslateAPI, callTTSAPI, stopTTSAPI } from './content';

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
    const { message } = App.useApp();
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
    const [icon, setIcon] = useImmer<{
        x: number
        y: number
        text: string
    } | null>(null);
    const [result, setResult] = useImmer<{
        x: number;
        y: number;
        originalText: string;
    } | null>(null);
    const [showInputTranslator, setShowInputTranslator] = useImmer(false);

    // 新增：控制翻译时机
    const [shouldTranslate, setShouldTranslate] = useImmer(false);

    // 使用新的全局配置系统
    const { settings } = useGlobalSettings();
    const { engineSettings } = useEngineSettings();
    const { textTranslateSettings } = useTextTranslateSettings();
    const { themeSettings } = useThemeSettings();
    const { shortcutSettings } = useShortcutSettings();
    const { pageTranslateSettings } = usePageTranslateSettings();
    const { domainSettings, getWhitelistedDomains } = useDomainSettings();

    // 从全局设置中提取值
    const engine = engineSettings.default;
    const autoRead = settings.speech.autoPlay;
    const textTranslateEnabled = textTranslateSettings.enabled; // 是否启用划词翻译功能
    const selectTranslateEnabled = textTranslateSettings.selectTranslate; // 是否在选择时自动翻译
    const textTargetLang = settings.languages.textTarget;
    const pageTargetLang = settings.languages.pageTarget;
    const uiLang = themeSettings.uiLanguage;

    // 快捷键设置
    const shortcutEnabled = shortcutSettings.enabled;
    const customShortcut = shortcutSettings.translateSelection;

    const engineRef = useRef(engine);
    const autoReadRef = useRef(autoRead);

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
            // 如果开启了选择时自动翻译，直接触发翻译
            if (selectTranslateEnabled) {
                // 将翻译结果显示在选中文字的正下方
                setResult({
                    x: rect.left + window.scrollX,
                    y: rect.bottom + window.scrollY,
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
                text: text
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
                    y: rect.bottom + 5, // 选中文字的下方
                    originalText: selection.toString().trim()
                });
            } else {
                // 如果没有选中文字，则使用图标位置作为备选
                setResult({
                    x: icon?.x || 0,
                    y: (icon?.y || 0) + 30, // 在图标下方偏移30
                    originalText: icon?.text || ''
                });
            }
            setShouldTranslate(true);
        }
        setIcon(null); // 清除图标
    };

    // 初始化默认设置
    useEffect(() => {
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
            clearTranslationState,
            textTranslateEnabled // 传入划词翻译启用状态
        );
    }, [showInputTranslator, result, icon, textTranslateEnabled, selectTranslateEnabled]);

    // 设置快捷键处理器
    useEffect(() => {
        return setupShortcutHandler(
            triggerTranslation,
            setShowInputTranslator,
            textTranslateEnabled, // 传入划词翻译启用状态
            {
                enabled: shortcutEnabled,
                openPopup: customShortcut
            }
        );
    }, [shortcutEnabled, customShortcut, triggerTranslation, textTranslateEnabled]); // 添加textTranslateEnabled依赖

    // 设置消息处理器，确保只注册一次
    useEffect(() => {
        setupMessageHandler(setShowInputTranslator);
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
        const setupAutoTranslation = async () => {
            // 异步获取白名单站点列表
            const whitelistedSites = await getWhitelistedDomains();
            
            return setupAutoTranslate(
                pageTargetLang, 
                engine, 
                stopTTSAPICallback,
                pageTranslateSettings.autoTranslate,
                whitelistedSites,
                pageTranslateSettings.mode || 'translated'
            );
        };

        let cleanup: (() => void) | undefined;
        setupAutoTranslation().then(cleanupFn => {
            cleanup = cleanupFn;
        });

        return () => {
            if (cleanup) {
                cleanup();
            }
        };
    }, [pageTargetLang, engine, stopTTSAPICallback, pageTranslateSettings, getWhitelistedDomains]);

    (window as any).callTranslateAPI = callTranslateAPICallback;

    return (
        <ThemeProvider>
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
    const [ready, setReady] = useImmer(false);
    useEffect(() => {
        initI18n().then(() => setReady(true));
    }, []);
    if (!ready) return null;
    return <ContentScript />;
};

export default ContentRoot;

