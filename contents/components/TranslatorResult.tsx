import React from 'react';
import { Card, Button, message } from 'antd';
import { CopyOutlined } from '@ant-design/icons';
import './TranslatorResult.css';

interface TranslatorResultProps {
  x: number;
  y: number;
  text: string;
}

const TranslatorResult: React.FC<TranslatorResultProps> = ({ x, y, text }) => {
  // 验证坐标值，如果无效则不渲染
  if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
    return null;
  }

  return (
    <Card
      style={{
        position: 'fixed',
        left: x,
        top: y + 10,
        maxWidth: 'min(90vw, 480px)',
        minWidth: 120,
        zIndex: 2147483647,
        fontSize: 14,
        lineHeight: 1.4,
        color: '#333',
        pointerEvents: 'auto',
        padding: 0,
      }}
      styles={{ body: { padding: '12px 16px' } }}
      variant="outlined"
      // 不用extra，icon绝对定位在内容区右上角
    >
      <div style={{ position: 'relative' }}>
        <Button
          type="primary"
          icon={<CopyOutlined className="translator-copy-icon" />}
          size="small"
          title="复制"
          style={{ position: 'absolute', top: 0, right: 4, padding: 4, zIndex: 10 }}
          onMouseDown={e => e.stopPropagation()}
          onClick={async (e) => {
            e.stopPropagation();
            if (text) {
              try {
                await navigator.clipboard.writeText(text);
                message.success('已复制');
              } catch (err) {
                message.error('复制失败，可能是浏览器限制或权限问题');
                console.error('复制失败', err);
              }
            } else {
              message.warning('没有可复制的内容');
            }
          }}
        />
        <div style={{ paddingTop: 4, paddingRight: 36, wordBreak: 'break-all', overflowWrap: 'break-word' }}>{text}</div>
      </div>
    </Card>
  );
};

export default TranslatorResult; 