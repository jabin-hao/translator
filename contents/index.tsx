import React, { useEffect, useRef, useState } from 'react';

const TranslatorIcon: React.FC<{
  x: number
  y: number
  text: string
  onClick: () => void
}> = ({ x, y, onClick }) => (
  <div
    style={{
      position: "fixed",
      width: 32,
      height: 32,
      background: "white",
      border: "2px solid #2386e1",
      borderRadius: "50%",
      cursor: "pointer",
      zIndex: 2147483647,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: "0 2px 8px rgba(0,0,0,0.2)",
      pointerEvents: "auto",
      userSelect: "none",
      left: x + 10,
      top: y - 10
    }}
    tabIndex={0}
    onClick={e => {
      e.stopPropagation();
      e.preventDefault();
      onClick();
    }}
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24">
      <path fill="#2386e1" d="m19.713 8.128l-.246.566a.506.506 0 0 1-.934 0l-.246-.566a4.36 4.36 0 0 0-2.22-2.25l-.759-.339a.53.53 0 0 1 0-.963l.717-.319a4.37 4.37 0 0 0 2.251-2.326l.253-.611a.506.506 0 0 1 .942 0l.253.61a4.37 4.37 0 0 0 2.25 2.327l.718.32a.53.53 0 0 1 0 .962l-.76.338a4.36 4.36 0 0 0-2.219 2.251M22.9 21l-4.4-11h-2l-4.399 11h2.154l1.199-3h4.09l1.201 3zm-6.647-5l1.247-3.115L18.745 16zm-8.706-3.696A18.3 18.3 0 0 1 4.723 8h2.24a16.3 16.3 0 0 0 2.021 2.91A15.5 15.5 0 0 0 11.996 6H2V4h6V2h2v2h4.65q-.131.645-.309 1.272a17.5 17.5 0 0 1-3.952 7.066a16.3 16.3 0 0 0 2.325 1.743l-.753 1.882a18.3 18.3 0 0 1-3.01-2.23a17.5 17.5 0 0 1-6.148 3.449l-.606-1.906a15.5 15.5 0 0 0 5.35-2.972"/>
    </svg>
  </div>
);

const TranslatorResult: React.FC<{
  x: number
  y: number
  text: string
}> = ({ x, y, text }) => (
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
  const resultPosRef = useRef<{ x: number; y: number; text: string } | null>(null);
  const lastCtrlPressRef = useRef<number>(0);
  const doubleClickThreshold = 300;
  const ctrlPressedRef = useRef<boolean>(false);

  const showTranslationIcon = (text: string, rect: DOMRect) => {
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
              const rect = selection.getRangeAt(0).getBoundingClientRect();
              
              const x = rect.left;
              const y = rect.bottom;
              setResult({ x, y, text });
              setIcon(null);
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
    <>
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
    </>
  );
};

export default ContentScript; 