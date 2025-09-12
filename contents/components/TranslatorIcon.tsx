import React from 'react';
import '../styles/index.css';
import Icon from '~lib/components/Icon';
import { useTheme } from '~lib/theme/theme';

interface TranslatorIconProps {
  x: number;
  y: number;
  text: string;
  onClick: () => void;
}

const TranslatorIcon: React.FC<TranslatorIconProps> = ({ x, y, onClick }) => {
  const { isDark } = useTheme();
  
  // 验证坐标值，如果无效则不渲染
  if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
    return null;
  }

  // 确保图标位置在合理范围内（视窗相对坐标，用于fixed定位）
  const safeX = Math.max(0, Math.min(x, window.innerWidth - 50));
  const safeY = Math.max(0, Math.min(y, window.innerHeight - 50));

  return (
    <div
      className="translator-icon"
      style={{ 
        left: safeX, // 移除额外的 +10 偏移
        top: safeY,  // 移除额外的 -10 偏移
        position: 'fixed',
        width: '32px',
        height: '32px',
        background: isDark ? '#2a2a2a' : '#ffffff',
        border: '2px solid #2386e1',
        borderRadius: '50%',
        cursor: 'pointer',
        zIndex: 2147483647,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: isDark ? '0 8px 24px rgba(0,0,0,0.3)' : '0 8px 24px rgba(0,0,0,0.15)',
        pointerEvents: 'auto',
        userSelect: 'none',
        transition: 'all 0.1s ease-out'
      }}
      tabIndex={0}
      onClick={e => {
        e.stopPropagation();
        e.preventDefault();
        onClick();
      }}
    >
      <Icon name="language" size={24} />
    </div>
  );
};

export default TranslatorIcon; 