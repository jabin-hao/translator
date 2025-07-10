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

const InputTranslator: React.FC<{
  onClose: () => void
}> = ({ onClose }) => {
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState('zh');
  const [isTranslating, setIsTranslating] = useState(false);

  const languages = [
    { code: 'auto', name: '自动检测' },
    { code: 'zh', name: '中文' },
    { code: 'en', name: '英语' },
    { code: 'ja', name: '日语' },
    { code: 'ko', name: '韩语' },
    { code: 'fr', name: '法语' },
    { code: 'de', name: '德语' },
    { code: 'es', name: '西班牙语' },
    { code: 'ru', name: '俄语' },
    { code: 'pt', name: '葡萄牙语' }
  ];

  const handleTranslate = async () => {
    if (!inputText.trim()) return;
    
    setIsTranslating(true);
    try {
      // 这里可以调用翻译API，暂时使用模拟翻译
      const mockTranslation = `翻译结果: ${inputText} (${sourceLang} → ${targetLang})`;
      setTranslatedText(mockTranslation);
    } catch (error) {
      setTranslatedText('翻译失败，请重试');
    } finally {
      setIsTranslating(false);
    }
  };

  const handleSwapLanguages = () => {
    if (sourceLang !== 'auto') {
      setSourceLang(targetLang);
      setTargetLang(sourceLang);
    }
  };

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: "50%",
        transform: "translateX(-50%)",
        width: 600,
        background: "white",
        border: "1px solid #ddd",
        borderRadius: 12,
        boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
        zIndex: 2147483647,
        padding: "20px",
        pointerEvents: "auto"
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
        <h3 style={{ margin: 0, color: "#333", fontSize: "18px" }}>翻译工具</h3>
        <button
          onClick={onClose}
          style={{
            background: "none",
            border: "none",
            fontSize: "20px",
            cursor: "pointer",
            color: "#666",
            padding: "4px 8px"
          }}
        >
          ×
        </button>
      </div>

      <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
        <select
          value={sourceLang}
          onChange={(e) => setSourceLang(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px"
          }}
        >
          {languages.map(lang => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>

        <button
          onClick={handleSwapLanguages}
          style={{
            padding: "8px 12px",
            background: "#f0f0f0",
            border: "1px solid #ddd",
            borderRadius: "6px",
            cursor: "pointer",
            fontSize: "14px"
          }}
        >
          ⇄
        </button>

        <select
          value={targetLang}
          onChange={(e) => setTargetLang(e.target.value)}
          style={{
            padding: "8px 12px",
            border: "1px solid #ddd",
            borderRadius: "6px",
            fontSize: "14px"
          }}
        >
          {languages.filter(lang => lang.code !== 'auto').map(lang => (
            <option key={lang.code} value={lang.code}>{lang.name}</option>
          ))}
        </select>
      </div>

      <div style={{ display: "flex", gap: "16px" }}>
        <div style={{ flex: 1 }}>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="请输入要翻译的文字..."
            style={{
              width: "100%",
              height: "120px",
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
              resize: "none"
            }}
          />
        </div>

        <div style={{ flex: 1 }}>
          <textarea
            value={translatedText}
            readOnly
            placeholder="翻译结果..."
            style={{
              width: "100%",
              height: "120px",
              padding: "12px",
              border: "1px solid #ddd",
              borderRadius: "6px",
              fontSize: "14px",
              resize: "none",
              background: "#f9f9f9"
            }}
          />
        </div>
      </div>

      <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
        <button
          onClick={handleTranslate}
          disabled={isTranslating || !inputText.trim()}
          style={{
            padding: "10px 24px",
            background: isTranslating || !inputText.trim() ? "#ccc" : "#2386e1",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: "14px",
            cursor: isTranslating || !inputText.trim() ? "not-allowed" : "pointer"
          }}
        >
          {isTranslating ? "翻译中..." : "翻译"}
        </button>
      </div>
    </div>
  );
};

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
              // 有选中文字，显示翻译结果
              const rect = selection.getRangeAt(0).getBoundingClientRect();
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
      {showInputTranslator && (
        <InputTranslator
          onClose={() => setShowInputTranslator(false)}
        />
      )}
    </>
  );
};

export default ContentScript; 