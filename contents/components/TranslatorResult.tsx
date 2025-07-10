import React from 'react';

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
    <div
      style={{
        position: "fixed",
        maxWidth: 300,
        padding: "12px 16px",
        background: "white",
        border: "1px solid #ddd",
        borderRadius: 8,
        boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
        zIndex: 2147483647,
        fontSize: 14,
        lineHeight: 1.4,
        color: "#333",
        pointerEvents: "auto",
        left: x,
        top: y + 10
      }}
    >
      {text}
    </div>
  );
};

export default TranslatorResult; 