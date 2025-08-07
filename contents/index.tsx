import {StyleProvider} from "@ant-design/cssinjs"

import React, {useEffect, useRef, useState} from 'react';
import {App} from 'antd';
import {getBrowserLang, mapUiLangToI18nKey} from '~lib/constants/languages';
import './index.css';
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
import {getAndWatchConfig} from "~lib/utils/storage";

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
    callTranslateAPI: (text: string, from: string, to: string, engine: string) => Promise<{
        result: string,
        engine: string
    }>;
    callTTSAPI: (text: string, lang: string) => Promise<{ success: boolean; audioData?: ArrayBuffer; error?: string }>;
    stopTTSAPI: () => Promise<void>;
    onCloseResult: () => void; // 新增
}) => {
    // 在 App 组件内部使用 App.useApp() 获取 messages 实例
    const {message} = App.useApp();
    // 创建message适配器函数
    const showMessage = (type: 'success' | 'error' | 'warning' | 'info', content: string) => {
        switch (type) {
            case 'success':
                message.success(content).then(() => {
                });
                break;
            case 'error':
                message.error(content).then(() => {
                });
                break;
            case 'warning':
                message.warning(content).then(() => {
                });
                break;
            case 'info':
                message.info(content).then(() => {
                });
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
                    onTranslationComplete={() => {}}
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
    useEffect(() => {
        textTargetLangRef.current = textTargetLang
    }, [textTargetLang]);

    // 初始化默认设置
    useEffect(() => {
        initializeDefaultSettings().then(() => {
        });
    }, []);

    // 翻译设置相关 state
    const [engine, setEngine] = useState('google');
    const [autoRead, setAutoRead] = useState(false);
    const engineRef = useRef(engine);
    const autoReadRef = useRef(autoRead);

    // 新增：快捷键设置状态
    const [shortcutEnabled, setShortcutEnabled] = useState(true);
    const [customShortcut, setCustomShortcut] = useState('');

    // 保持 ref 与 state 同步
    useEffect(() => {
        engineRef.current = engine;
    }, [engine]);
    useEffect(() => {
        autoReadRef.current = autoRead;
    }, [autoRead]);

    // 初始化时读取设置 - 使用 getAndWatchConfig 重构
    useEffect(() => {
        let unwatchTranslateSettings: (() => void) | undefined;

        getAndWatchConfig<any>(
            TRANSLATE_SETTINGS_KEY,
            (data) => {
                if (data && typeof data === 'object') {
                    setEngine(data?.engine || 'google');
                    setAutoRead(!!data?.autoRead);
                    setAutoTranslate(data?.autoTranslate ?? true);
                }
            },
            {}
        ).then(unwatch => {
            unwatchTranslateSettings = unwatch;
        });

        return () => {
            unwatchTranslateSettings?.();
        };
    }, []);

    // 新增：快捷键设置 - 使用 getAndWatchConfig 重构
    useEffect(() => {
        let unwatchShortcutSettings: (() => void) | undefined;

        getAndWatchConfig<any>(
            SHORTCUT_SETTINGS_KEY,
            (data) => {
                if (data && typeof data === 'object') {
                    const enabled = data?.enabled !== false;
                    const shortcut = data?.customShortcut || '';
                    setShortcutEnabled(enabled);
                    setCustomShortcut(shortcut);
                    // 重置状态
                    lastCtrlPressRef.current = 0;
                }
            },
            {enabled: true, customShortcut: ''}
        ).then(unwatch => {
            unwatchShortcutSettings = unwatch;
        });

        return () => {
            unwatchShortcutSettings?.();
        };
    }, []);

    // 新增：初始化textTargetLang和favoriteLangs - 使用 getAndWatchConfig 重构
    useEffect(() => {
        let unwatchTextLang: (() => void) | undefined;
        let unwatchFavoriteLangs: (() => void) | undefined;

        getAndWatchConfig<string>(
            TEXT_LANG_KEY,
            setTextTargetLang,
            getBrowserLang()
        ).then(unwatch => {
            unwatchTextLang = unwatch;
        });

        getAndWatchConfig<string[]>(
            FAVORITE_LANGS_KEY,
            setFavoriteLangs,
            []
        ).then(unwatch => {
            unwatchFavoriteLangs = unwatch;
        });

        return () => {
            unwatchTextLang?.();
            unwatchFavoriteLangs?.();
        };
    }, []);

    // 新增：语言同步 - 使用 getAndWatchConfig 重构
    useEffect(() => {
        let unwatchUILang: (() => void) | undefined;

        getAndWatchConfig<string>(
            UI_LANG_KEY,
            (lang) => {
                if (lang) {
                    i18n.changeLanguage(mapUiLangToI18nKey(lang)).then(() => {
                    });
                }
            },
            getBrowserLang()
        ).then(unwatch => {
            unwatchUILang = unwatch;
        });

        return () => {
            unwatchUILang?.();
        };
    }, []);

    const showTranslationIcon = (text: string, rect: DOMRect) => {
        // 验证rect的值，确保它们是有效的数字
        if (isNaN(rect.left) || isNaN(rect.bottom) || isNaN(rect.right) || isNaN(rect.top)) {
            return; // 如果坐标无效，不显示图标
        }

        const x = rect.left;
        const y = rect.bottom;
        const iconData = {x: rect.right, y: rect.top, text};
        resultPosRef.current = {x, y, text};
        if (autoTranslate) {
            // 自动翻译：直接弹出翻译结果
            handleTranslation().then(() => {
            });
        } else {
            // 只显示icon
            setIcon(iconData);
        }
    };

    const handleTranslation = async () => {
        const {x, y, text} = resultPosRef.current || {x: icon?.x || 0, y: (icon?.y || 0) + 40, text: icon?.text || ""};
        setIcon(null);
        setResult({x, y, originalText: text}); // 只存原文
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
        resultPosRef.current = {x, y, text};
        setIcon(null);
        setResult({x, y, originalText: text});
        setShouldTranslate(true);
    };

    // 设置文本选择处���器
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
    }, [shortcutEnabled, customShortcut, textTargetLang, favoriteLangs, shouldTranslate, autoTranslate]);

    // 设置消息处理器���确保只注册一次
    useEffect(() => {
        setupMessageHandler();
    }, []);

    // 2. 监听 result 状态变化，result 出现后再 setIcon(null)
    useEffect(() => {
        if (result) {
            setIcon(null);
        }
    }, [result]);

    // 读取网页翻译目标语言 - 使用 getAndWatchConfig 重构
    const [pageTargetLang, setPageTargetLang] = useState('zh-CN');
    useEffect(() => {
        let unwatchPageLang: (() => void) | undefined;

        getAndWatchConfig<string>(
            PAGE_LANG_KEY,
            setPageTargetLang,
            'zh-CN'
        ).then(unwatch => {
            unwatchPageLang = unwatch;
        });

        return () => {
            unwatchPageLang?.();
        };
    }, []);

    // 设置自动翻译
    useEffect(() => {
        return setupAutoTranslate(pageTargetLang, engine, stopTTSAPI);
    }, [pageTargetLang, engine, stopTTSAPI]);

    (window as any).callTranslateAPI = callTranslateAPI;

    return (
        <ThemeProvider storageKey="content_theme_mode">
            <StyleProvider hashPriority="high" container={shadowRoot}>
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
                        setIcon={setIcon}
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

