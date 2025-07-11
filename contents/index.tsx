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
import { message } from 'antd';
import './index.css';
import TranslatorIcon from './components/TranslatorIcon';
import TranslatorResult from './components/TranslatorResult';
import InputTranslator from './components/InputTranslator';

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
  const resultPosRef = useRef<{ x: number; y: number; text: string } | null>(null);
  const lastCtrlPressRef = useRef<number>(0);
  const doubleClickThreshold = 300;
  const ctrlPressedRef = useRef<boolean>(false);

  // 配置message组件
  useEffect(() => {
    message.config({
      top: 20,
      duration: 2.5,
      maxCount: 3,
      rtl: false,
      prefixCls: 'ant-message',
      getContainer: () => document.body,
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
    </StyleProvider>
  );
};

export default ContentScript; 