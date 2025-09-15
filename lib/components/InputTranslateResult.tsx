import React, { useEffect, useRef, useCallback } from 'react';
import { useImmer } from 'use-immer';
import { Card, Button, Typography, Space, message } from 'antd';
import Icon from './Icon';

interface InputTranslateResultProps {
  x: number;
  y: number;
  originalText: string;
  translatedText: string;
  engine?: string;
  onReplace: () => void;
  onCancel: () => void;
}

const InputTranslateResult: React.FC<InputTranslateResultProps> = ({
  x,
  y,
  originalText,
  translatedText,
  engine = '',
  onReplace,
  onCancel
}) => {
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
      message.success('翻译已替换');
    } catch (error) {
      console.error('Replace failed:', error);
      message.error('替换失败');
    }
  }, [onReplace]);

  // 处理取消按钮点击
  const handleCancel = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onCancel();
  }, [onCancel]);

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
          icon={<Icon name="close" />}
          size="small"
          onClick={handleCancel}
          title="取消"
        />

        <Button
          type="primary"
          icon={<Icon name="check" />}
          size="small"
          onClick={handleReplace}
          title="替换"
        />
      </div>
    </Card>
  );
};

export default InputTranslateResult;