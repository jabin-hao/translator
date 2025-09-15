import { isInputElement } from '../utils/domUtil';
import { createRoot } from 'react-dom/client';
import type { Root } from 'react-dom/client';
import React from 'react';
import InputTranslateResult from '../components/InputTranslateResult';

interface InputTranslateSettings {
    enabled: boolean;
    triggerMode: 'auto' | 'hotkey';
    autoTranslateDelay: number;
    minTextLength: number;
    enabledInputTypes: string[];
    excludeSelectors: string[];
    autoReplace: boolean;
}

interface InputTranslateCallbacks {
    callTranslateAPI: (text: string, from: string, to: string, engine: string) => Promise<{ result: string, engine: string }>;
    showMessage: (type: 'success' | 'error' | 'warning' | 'info', content: string) => void;
    getTargetLanguage: () => string;
    getEngine: () => string;
}

// 输入框翻译处理逻辑
export const setupInputTranslateHandler = (
    shadowRoot: ShadowRoot | null,
    settings: InputTranslateSettings,
    callbacks: InputTranslateCallbacks
): { cleanup: () => void; triggerInputTranslate: () => void } => {
    if (!settings.enabled) {
        return {
            cleanup: () => { },
            triggerInputTranslate: () => { }
        };
    }

    let currentInputElement: HTMLElement | null = null;
    let translateTimer: NodeJS.Timeout | null = null;
    let isTranslating: boolean = false;
    let currentTranslateUI: HTMLElement | null = null;
    let reactRoot: Root | null = null;

    // 检查输入元素是否应该启用翻译
    const shouldEnableTranslateForInput = (element: HTMLElement): boolean => {
        if (!isInputElement(element)) {
            return false;
        }

        // 检查排除选择器
        for (const selector of settings.excludeSelectors) {
            if (element.matches(selector)) {
                return false;
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

            return settings.enabledInputTypes.includes(inputType);
        } else if (tagName === 'textarea') {
            return settings.enabledInputTypes.includes('textarea');
        } else if (element.hasAttribute('contenteditable')) {
            return settings.enabledInputTypes.includes('contenteditable');
        }

        return false;
    };

    // 获取输入元素的文本内容
    const getInputText = (element: HTMLElement): string => {
        const tagName = element.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea') {
            return (element as HTMLInputElement).value;
        } else if (element.hasAttribute('contenteditable')) {
            return element.innerText || element.textContent || '';
        }
        return '';
    };

    // 设置输入元素的文本内容
    const setInputText = (element: HTMLElement, text: string): void => {
        const tagName = element.tagName.toLowerCase();
        if (tagName === 'input' || tagName === 'textarea') {
            const inputElement = element as HTMLInputElement;
            // 保存当前选择位置
            const start = inputElement.selectionStart;
            const end = inputElement.selectionEnd;

            // 设置新值
            inputElement.value = text;

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
    };

    // 创建翻译确认UI
    const createTranslateUI = (element: HTMLElement, originalText: string, translatedText: string): HTMLElement => {
        const rect = element.getBoundingClientRect();

        // 先清理之前的UI
        removeTranslateUI();

        // 创建容器
        const translateUI = document.createElement('div');
        translateUI.style.cssText = 'pointer-events: auto; user-select: none;';
        document.body.appendChild(translateUI);

        // 创建React根
        reactRoot = createRoot(translateUI);

        // 准备回调函数
        const handleReplaceCallback = () => {
            try {
                setInputText(element, translatedText);
                removeTranslateUI();
            } catch (error) {
                console.error('Replace failed:', error);
                throw error;
            }
        };

        const handleCancelCallback = () => {
            removeTranslateUI();
        };



        // 渲染React组件
        reactRoot.render(
            React.createElement(InputTranslateResult, {
                x: rect.left,
                y: rect.bottom + 5,
                originalText,
                translatedText,
                engine: callbacks.getEngine(),
                onReplace: handleReplaceCallback,
                onCancel: handleCancelCallback
            })
        );

        // 设置当前UI引用
        currentTranslateUI = translateUI;

        return translateUI;
    };

    // 移除翻译UI
    const removeTranslateUI = () => {
        if (reactRoot) {
            reactRoot.unmount();
            reactRoot = null;
        }
        if (currentTranslateUI && currentTranslateUI.parentNode) {
            currentTranslateUI.parentNode.removeChild(currentTranslateUI);
        }
        currentTranslateUI = null;
    };

    // 执行翻译
    const performTranslate = async (element: HTMLElement, text: string) => {
        if (isTranslating) return;

        isTranslating = true;

        try {
            const { result } = await callbacks.callTranslateAPI(
                text,
                'auto',
                callbacks.getTargetLanguage(),
                callbacks.getEngine()
            );

            if (settings.autoReplace) {
                // 自动替换模式
                setInputText(element, result);
                callbacks.showMessage('success', '翻译完成');
            } else {
                // 显示确认UI
                removeTranslateUI(); // 移除之前的UI
                currentTranslateUI = createTranslateUI(element, text, result);
            }
        } catch (error) {
            callbacks.showMessage('error', '翻译失败，请重试');
        } finally {
            isTranslating = false;
        }
    };

    // 清除翻译定时器
    const clearTranslateTimer = () => {
        if (translateTimer) {
            clearTimeout(translateTimer);
            translateTimer = null;
        }
    };

    // 处理输入事件
    const handleInput = (e: Event) => {
        const element = e.target as HTMLElement;

        if (!shouldEnableTranslateForInput(element)) {
            return;
        }

        const text = getInputText(element).trim();

        // 文本长度检查
        if (text.length < settings.minTextLength) {
            clearTranslateTimer();
            return;
        }

        // 只在auto模式下处理
        if (settings.triggerMode === 'auto') {
            clearTranslateTimer();

            translateTimer = setTimeout(() => {
                if (element === document.activeElement && getInputText(element).trim() === text) {
                    performTranslate(element, text);
                }
            }, settings.autoTranslateDelay);
        }
    };

    // 处理获得焦点
    const handleFocus = (e: Event) => {
        const element = e.target as HTMLElement;

        if (shouldEnableTranslateForInput(element)) {
            currentInputElement = element;
        }
    };

    // 处理失去焦点
    const handleBlur = (e: Event) => {
        const element = e.target as HTMLElement;
        clearTranslateTimer();

        if (element === currentInputElement) {
            currentInputElement = null;
        }
    };

    // 处理快捷键翻译
    const handleKeyDown = () => {
        // 这里可以处理快捷键触发翻译的逻辑
        // 但快捷键主要由shortcuts.ts处理，这里主要响应外部调用
    };

    // 外部调用的翻译函数（用于快捷键触发）
    const triggerInputTranslate = () => {
        const activeElement = document.activeElement as HTMLElement;

        if (shouldEnableTranslateForInput(activeElement)) {
            const text = getInputText(activeElement).trim();

            if (text.length >= settings.minTextLength) {
                performTranslate(activeElement, text);
            } else {
                callbacks.showMessage('warning', `文本长度至少需要 ${settings.minTextLength} 个字符`);
            }
        } else {
            callbacks.showMessage('warning', '当前焦点不在支持翻译的输入框中');
        }
    };

    // 点击其他地方时隐藏翻译UI
    const handleDocumentClick = (e: Event) => {
        const target = e.target as HTMLElement;

        // 如果点击的是翻译UI内部，完全不处理
        if (currentTranslateUI && currentTranslateUI.contains(target)) {
            return; // 让React组件处理所有内部点击
        }

        // 只有点击外部时才隐藏UI
        if (currentTranslateUI && !currentTranslateUI.contains(target)) {
            removeTranslateUI();
        }
    };

    // 绑定事件监听器
    document.addEventListener('input', handleInput, true);
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleBlur, true);
    document.addEventListener('keydown', handleKeyDown, true);

    // 延迟添加点击监听器，避免与React事件冲突
    setTimeout(() => {
        document.addEventListener('click', handleDocumentClick, false);
    }, 100);

    // 返回清理函数和触发函数
    return {
        cleanup: () => {
            clearTranslateTimer();
            removeTranslateUI();

            document.removeEventListener('input', handleInput, true);
            document.removeEventListener('focus', handleFocus, true);
            document.removeEventListener('blur', handleBlur, true);
            document.removeEventListener('keydown', handleKeyDown, true);
            document.removeEventListener('click', handleDocumentClick, false);

            // 确保React资源被清理
            if (reactRoot) {
                reactRoot.unmount();
                reactRoot = null;
            }
        },
        triggerInputTranslate
    };
};