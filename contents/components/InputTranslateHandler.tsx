import React, { useEffect, useRef, useCallback, useState } from 'react';
import { useImmer } from 'use-immer';
import { Card, Button, Typography, message } from 'antd';
import Icon from '../../lib/components/Icon';
import { isInputElement } from '../../lib/utils/domUtil';
import type { GlobalSettings } from '../../lib/settings/settings';

type InputTranslateSettings = GlobalSettings['inputTranslate'];

interface InputTranslateHandlerProps {
    settings: InputTranslateSettings;
    targetLanguage: string;
    engine: string;
    callTranslateAPI: (text: string, from: string, to: string, engine: string) => Promise<{ result: string, engine: string }>;
    showMessage: (type: 'success' | 'error' | 'warning' | 'info', content: string) => void;
    onTriggerTranslate?: () => void; // 外部触发翻译的回调
}

interface InputTranslateState {
    x: number;
    y: number;
    originalText: string;
    translatedText: string;
    engine: string;
    targetElement: HTMLElement; // 添加目标元素引用
}

// 翻译结果展示组件（内联）
const TranslateResultCard: React.FC<{
    x: number;
    y: number;
    originalText: string;
    translatedText: string;
    engine: string;
    onReplace: () => void;
}> = ({ x, y, originalText, translatedText, onReplace }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [position, setPosition] = useImmer({ x, y });

    // 调整位置确保在视口内
    useEffect(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            let newX = x;
            let newY = y;

            // 检查右边界
            if (newX + rect.width > window.innerWidth) {
                newX = window.innerWidth - rect.width - 10;
            }

            // 检查下边界
            if (newY + rect.height > window.innerHeight) {
                newY = y - rect.height - 10; // 显示在上方
                if (newY < 10) {
                    newY = 10; // 确保不超出顶部
                }
            }

            // 检查左边界
            if (newX < 10) {
                newX = 10;
            }

            if (newX !== x || newY !== y) {
                setPosition({ x: newX, y: newY });
            }
        }
    }, [x, y, setPosition]);

    // 处理替换按钮点击
    const handleReplace = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            onReplace();
        } catch (error) {
            console.error('Replace failed:', error);
            message.error('替换失败');
        }
    }, [onReplace]);

    // 处理复制功能
    const handleCopy = useCallback(async (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        try {
            await navigator.clipboard.writeText(translatedText);
            message.success('已复制到剪贴板');
        } catch (error) {
            console.error('Copy failed:', error);
            message.error('复制失败');
        }
    }, [translatedText]);

    // 阻止点击事件冒泡
    const handleContainerClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
    }, []);

    return (
        <Card
            ref={containerRef}
            onClick={handleContainerClick}
            size="small"
            style={{
                position: 'fixed',
                top: `${position.y}px`,
                left: `${position.x}px`,
                zIndex: 2147483647,
                minWidth: '280px',
                maxWidth: '400px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                borderRadius: '8px',
                background: 'white',
            }}
            styles={{
                body: { padding: '16px' }
            }}
        >
            {/* 原文 */}
            <div
                style={{
                    background: '#f5f5f5',
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
                        color: '#666',
                        lineHeight: '1.4'
                    }}
                >
                    {originalText}
                </Typography.Text>
            </div>

            {/* 译文 */}
            <div
                style={{
                    background: '#e6f7ff',
                    padding: '10px 12px',
                    borderRadius: '6px',
                    marginBottom: '16px',
                }}
            >
                <Typography.Text
                    style={{
                        fontSize: '14px',
                        color: '#262626',
                        wordBreak: 'break-word',
                        display: 'block',
                        maxHeight: '80px',
                        overflow: 'auto',
                        userSelect: 'text',
                        lineHeight: '1.5'
                    }}
                >
                    {translatedText}
                </Typography.Text>
            </div>

            {/* 按钮区域 */}
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
                    onClick={handleCopy}
                    title="复制"
                />

                <Button
                    type="text"
                    icon={<Icon name="check" />}
                    size="small"
                    onClick={handleReplace}
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
    onTriggerTranslate
}) => {
    const [translateState, setTranslateState] = useState<InputTranslateState | null>(null);
    const [isTranslating, setIsTranslating] = useState(false);

    const currentInputElement = useRef<HTMLElement | null>(null);
    const translateTimer = useRef<NodeJS.Timeout | null>(null);

    // 如果 settings 未定义或未启用，则不渲染任何内容
    if (!settings || !settings.enabled) {
        return null;
    }

    // 检查输入元素是否应该启用翻译
    const shouldEnableTranslateForInput = useCallback((element: HTMLElement): boolean => {
        if (!settings || !isInputElement(element)) {
            return false;
        }

        // 检查排除选择器
        if (settings.excludeSelectors) {
            for (const selector of settings.excludeSelectors) {
                if (element.matches(selector)) {
                    return false;
                }
            }
        }

        // 检查输入类型
        const tagName = element.tagName.toLowerCase();
        if (tagName === 'input') {
            const inputElement = element as HTMLInputElement;
            const inputType = inputElement.type.toLowerCase();

            // password类型永远不启用翻译
            if (inputType === 'password') {
                return false;
            }

            return settings.enabledInputTypes?.includes(inputType) || false;
        } else if (tagName === 'textarea') {
            return settings.enabledInputTypes?.includes('textarea') || false;
        } else if (element.hasAttribute('contenteditable')) {
            return settings.enabledInputTypes?.includes('contenteditable') || false;
        }

        return false;
    }, [settings]);

    // 获取输入元素的文本内容
    const getInputText = useCallback((element: HTMLElement): string => {
        const tagName = element.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea') {
            return (element as HTMLInputElement).value;
        } else if (element.hasAttribute('contenteditable')) {
            return element.innerText || element.textContent || '';
        }
        return '';
    }, []);

    // 设置输入元素的文本内容
    const setInputText = useCallback((element: HTMLElement, text: string): void => {
        const tagName = element.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea') {
            const inputElement = element as HTMLInputElement;
            // 保存当前选择位置
            const start = inputElement.selectionStart;
            const end = inputElement.selectionEnd;

            // 使用 React 兼容的方式设置值
            try {
                const nativeInputValueSetter = Object.getOwnPropertyDescriptor(
                    inputElement.constructor.prototype,
                    "value"
                )?.set;
                if (nativeInputValueSetter) {
                    nativeInputValueSetter.call(inputElement, text);
                } else {
                    inputElement.value = text;
                }
            } catch (e) {
                // 回退到直接设置
                inputElement.value = text;
            }

            // 触发多个事件确保兼容性
            inputElement.dispatchEvent(new Event('input', { bubbles: true }));
            inputElement.dispatchEvent(new Event('change', { bubbles: true }));

            // 恢复焦点和光标位置
            inputElement.focus();
            if (start !== null && end !== null) {
                const newPos = Math.min(text.length, start);
                inputElement.setSelectionRange(newPos, newPos);
            }
        } else if (element.hasAttribute('contenteditable')) {
            element.innerText = text;
            // 触发事件
            element.dispatchEvent(new Event('input', { bubbles: true }));
            element.dispatchEvent(new Event('change', { bubbles: true }));

            // 恢复焦点
            element.focus();

            // 将光标移动到文本末尾
            const range = document.createRange();
            const selection = window.getSelection();
            if (element.childNodes.length > 0) {
                range.setStart(element.childNodes[0], text.length);
                range.collapse(true);
                selection?.removeAllRanges();
                selection?.addRange(range);
            }
        }
    }, []);

    // 执行翻译
    const performTranslate = useCallback(async (element: HTMLElement, text: string) => {
        if (isTranslating) return;

        setIsTranslating(true);

        try {
            const { result } = await callTranslateAPI(
                text,
                'auto',
                targetLanguage,
                engine
            );

            if (settings?.autoReplace) {
                // 自动替换模式
                setInputText(element, result);
                showMessage('success', '翻译完成');
            } else {
                // 显示确认UI
                const rect = element.getBoundingClientRect();
                let newX = rect.left;
                let newY = rect.bottom + 5;

                // 检查右边界
                if (newX + 400 > window.innerWidth) {
                    newX = window.innerWidth - 400 - 10;
                }

                // 检查下边界
                if (newY + 200 > window.innerHeight) {
                    newY = rect.top - 200 - 10;
                    if (newY < 10) {
                        newY = 10;
                    }
                }

                // 检查左边界
                if (newX < 10) {
                    newX = 10;
                }

                setTranslateState({
                    x: newX,
                    y: newY,
                    originalText: text,
                    translatedText: result,
                    engine: engine,
                    targetElement: element
                });
            }
        } catch (error) {
            showMessage('error', '翻译失败，请重试');
        } finally {
            setIsTranslating(false);
        }
    }, [isTranslating, callTranslateAPI, targetLanguage, engine, settings?.autoReplace, setInputText, showMessage]);

    // 清除翻译定时器
    const clearTranslateTimer = useCallback(() => {
        if (translateTimer.current) {
            clearTimeout(translateTimer.current);
            translateTimer.current = null;
        }
    }, []);

    // 外部触发翻译（用于快捷键）
    const triggerInputTranslate = useCallback(() => {
        const activeElement = document.activeElement as HTMLElement;

        if (shouldEnableTranslateForInput(activeElement)) {
            const text = getInputText(activeElement).trim();

            if (text.length >= (settings?.minTextLength || 1)) {
                performTranslate(activeElement, text);
            } else {
                showMessage('warning', `文本长度至少需要 ${settings?.minTextLength || 1} 个字符`);
            }
        } else {
            showMessage('warning', '当前焦点不在支持翻译的输入框中');
        }
    }, [shouldEnableTranslateForInput, getInputText, settings?.minTextLength, performTranslate, showMessage]);

    // 处理替换
    const handleReplace = useCallback(() => {
        if (translateState) {
            try {
                setInputText(translateState.targetElement, translateState.translatedText);
                setTranslateState(null);
                showMessage('success', '翻译已替换');
            } catch (error) {
                console.error('Replace failed:', error);
                showMessage('error', '替换失败');
                throw error; // 重新抛出错误，让 TranslateResultCard 处理
            }
        }
    }, [translateState, setInputText, showMessage]);



    // 处理输入事件
    const handleInput = useCallback((e: Event) => {
        const element = e.target as HTMLElement;

        if (!shouldEnableTranslateForInput(element)) {
            return;
        }

        const text = getInputText(element).trim();

        // 文本长度检查
        if (text.length < (settings?.minTextLength || 1)) {
            clearTranslateTimer();
            return;
        }

        // 只在auto模式下处理
        if (settings?.triggerMode === 'auto') {
            clearTranslateTimer();

            translateTimer.current = setTimeout(() => {
                if (element === document.activeElement && getInputText(element).trim() === text) {
                    performTranslate(element, text);
                }
            }, settings?.autoTranslateDelay || 1000);
        }
    }, [shouldEnableTranslateForInput, getInputText, settings?.minTextLength, settings?.triggerMode, settings?.autoTranslateDelay, clearTranslateTimer, performTranslate]);

    // 处理获得焦点
    const handleFocus = useCallback((e: Event) => {
        const element = e.target as HTMLElement;

        if (shouldEnableTranslateForInput(element)) {
            currentInputElement.current = element;
        }
    }, [shouldEnableTranslateForInput]);

    // 处理失去焦点
    const handleBlur = useCallback((e: Event) => {
        const element = e.target as HTMLElement;
        clearTranslateTimer();

        if (element === currentInputElement.current) {
            currentInputElement.current = null;
        }
    }, [clearTranslateTimer]);

    // 点击其他地方时隐藏翻译UI
    const handleDocumentClick = useCallback((e: Event) => {
        const target = e.target as HTMLElement;

        // 如果点击的不是翻译UI内部，则隐藏UI
        if (translateState && !target.closest('[data-translate-ui]')) {
            setTranslateState(null);
        }
    }, [translateState]);

    // 按ESC键隐藏翻译UI
    const handleKeyDown = useCallback((e: KeyboardEvent) => {
        if (e.key === 'Escape' && translateState) {
            setTranslateState(null);
        }
    }, [translateState]);

    // 设置事件监听器
    useEffect(() => {
        if (!settings?.enabled) {
            return;
        }

        document.addEventListener('input', handleInput, true);
        document.addEventListener('focus', handleFocus, true);
        document.addEventListener('blur', handleBlur, true);
        document.addEventListener('keydown', handleKeyDown, true);

        // 延迟添加点击监听器，避免与React事件冲突
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
    }, [settings?.enabled, handleInput, handleFocus, handleBlur, handleKeyDown, handleDocumentClick, clearTranslateTimer]);

    // 暴露触发函数给外部
    useEffect(() => {
        if (onTriggerTranslate) {
            // 这里可以通过某种方式将 triggerInputTranslate 暴露给外部
            // 由于我们需要将函数暴露给外部，我们可以使用 useImperativeHandle 或者其他方式
        }
    }, [onTriggerTranslate, triggerInputTranslate]);

    // 将触发函数暴露到全局，供快捷键调用
    useEffect(() => {
        (window as any).triggerInputTranslate = triggerInputTranslate;
        return () => {
            delete (window as any).triggerInputTranslate;
        };
    }, [triggerInputTranslate]);

    return (
        <>
            {translateState && (
                <div data-translate-ui>
                    <TranslateResultCard
                        x={translateState.x}
                        y={translateState.y}
                        originalText={translateState.originalText}
                        translatedText={translateState.translatedText}
                        engine={translateState.engine}
                        onReplace={handleReplace}
                    />
                </div>
            )}
        </>
    );
};

export default InputTranslateHandler;