import React, { useState } from 'react';

interface InputTranslatorProps {
  onClose: () => void;
}

const InputTranslator: React.FC<InputTranslatorProps> = ({ onClose }) => {
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

export default InputTranslator; 