import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Space, Divider } from 'antd';
import { CopyOutlined, SoundOutlined } from '@ant-design/icons';
import '../index.css';

interface TranslatorResultProps {
  x: number;
  y: number;
  text: string;
  showMessage: (type: 'success' | 'error' | 'warning' | 'info', content: string) => void;
  autoRead?: boolean; // 新增
}

const TranslatorResult: React.FC<TranslatorResultProps> = ({ x, y, text, showMessage, autoRead }) => {
  const [targetLang, setTargetLang] = useState('zh');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  // 自动朗读
  useEffect(() => {
    if (autoRead && text) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      const utter = new window.SpeechSynthesisUtterance(text);
      utter.lang = targetLang === 'zh' ? 'zh-CN' : targetLang;
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      utterRef.current = utter;
      setIsSpeaking(true);
      window.speechSynthesis.speak(utter);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoRead, text, targetLang]);

  // 停止朗读
  const stopSpeak = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // 手动朗读/停止
  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!text) {
      showMessage('warning', '没有可朗读的内容');
      return;
    }
    if (isSpeaking) {
      stopSpeak();
      showMessage('info', '已停止朗读');
    } else {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      const utter = new window.SpeechSynthesisUtterance(text);
      utter.lang = targetLang === 'zh' ? 'zh-CN' : targetLang;
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      utterRef.current = utter;
      setIsSpeaking(true);
      window.speechSynthesis.speak(utter);
      showMessage('success', '开始朗读');
    }
  };

  // 组件卸载时停止朗读
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    };
  }, []);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (text) {
      try {
        await navigator.clipboard.writeText(text);
        showMessage('success', '已复制');
      } catch (err) {
        showMessage('error', '复制失败，可能是浏览器限制或权限问题');
        console.error('复制失败', err);
      }
    } else {
      showMessage('warning', '没有可复制的内容');
    }
  };

  const handleLangClick = (e: React.MouseEvent, lang: string) => {
    e.stopPropagation();
    e.preventDefault();
    setTargetLang(lang);
  };

  // 获取语言缩写
  const getLangAbbr = (langCode: string) => {
    const langMap: { [key: string]: string } = {
      'zh': '中',
      'en': '英',
      'ja': '日',
      'ko': '韩',
      'fr': '法',
      'de': '德',
      'es': '西',
      'ru': '俄',
      'pt': '葡'
    };
    return langMap[langCode] || langCode.toUpperCase();
  };

  // 验证坐标值，如果无效则不渲染
  if (typeof x !== 'number' || typeof y !== 'number' || isNaN(x) || isNaN(y)) {
    return null;
  }

  return (
    <Card
      data-translator-result
      className="translator-result-card"
      style={{ 
        left: x, 
        top: y + 10,
        position: 'fixed',
        maxWidth: 'min(90vw, 480px)',
        minWidth: '320px',
        zIndex: 2147483647,
        fontSize: '14px',
        lineHeight: 1.4,
        pointerEvents: 'auto',
        padding: 0
      }}
      styles={{ body: { padding: '12px 16px' } }}
      variant="outlined"
      onMouseDown={(e) => e.stopPropagation()}
      onMouseUp={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="translator-result-content">
        <div className="translator-result-text">{text}</div>
        
        {/* Footer区域 */}
        <Divider style={{ margin: '12px 0 8px 0' }} />
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            width: '100%',
            padding: '0 4px',
            marginTop: 8,
            flexWrap: 'nowrap',
          }}
        >
          {/* 左侧：主要翻译语言缩写按钮 */}
          <div
            style={{
              display: 'flex',
              gap: 0,
              flexShrink: 0,
            }}
          >
            {['zh', 'en', 'ja'].map((lang, idx) => (
              <Button
                key={lang}
                type={targetLang === lang ? 'primary' : 'default'}
                size="small"
                onClick={(e) => handleLangClick(e, lang)}
                style={{
                  minWidth: '32px',
                  padding: '0 8px',
                  marginRight: idx !== 2 ? '8px' : 0,
                }}
              >
                {getLangAbbr(lang)}
              </Button>
            ))}
          </div>

          {/* 右侧：复制和朗读按钮 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            <Button
              type={isSpeaking ? 'primary' : 'text'}
              icon={<SoundOutlined />}
              size="small"
              onClick={handleSpeak}
              title={isSpeaking ? '停止朗读' : '朗读'}
              style={{ marginRight: '4px' }}
            />
            <Button
              type="text"
              icon={<CopyOutlined />}
              size="small"
              onClick={handleCopy}
              title="复制"
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TranslatorResult; 