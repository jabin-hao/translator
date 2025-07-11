import React from 'react';
import '../index.css';
import PluginIcon from '../../components/PluginIcon';
interface TranslatorIconProps {
  x: number;
  y: number;
  text: string;
  onClick: () => void;
}

const TranslatorIcon: React.FC<TranslatorIconProps> = ({ x, y, onClick }) => {
  // 验证坐标值，如果无效则不渲染
  if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
    return null;
  }

  return (
    <div
      className="translator-icon"
      style={{ 
        left: x + 10, 
        top: y - 10,
        position: 'fixed',
        width: '32px',
        height: '32px',
        background: 'white',
        border: '2px solid #2386e1',
        borderRadius: '50%',
        cursor: 'pointer',
        zIndex: 2147483647,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        pointerEvents: 'auto',
        userSelect: 'none'
      }}
      tabIndex={0}
      onClick={e => {
        e.stopPropagation();
        e.preventDefault();
        onClick();
      }}
    >
      <PluginIcon size={24} />
    </div>
  );
};

export default TranslatorIcon; 