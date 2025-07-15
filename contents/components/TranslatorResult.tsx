import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Space, Divider } from 'antd';
import { CopyOutlined, SoundOutlined } from '@ant-design/icons';
import '../index.css';
import { Storage } from '@plasmohq/storage';
import { getEngineLangCode } from '../../lib/languages';

interface TranslatorResultProps {
  x: number;
  y: number;
  text: string;
  showMessage: (type: 'success' | 'error' | 'warning' | 'info', content: string) => void;
  autoRead?: boolean; // 新增
  engine: string; // 新增
}

const storage = new Storage();
const DEFAULT_TARGET_LANG = 'zh-CN';

// 调用后台翻译API（与index.tsx保持一致）
function callTranslateAPI(text: string, from: string, to: string, engine = 'google'): Promise<string> {
  return new Promise((resolve, reject) => {
    chrome.runtime.sendMessage(
      {
        type: 'translate',
        payload: { text, from, to, engine }
      },
      (response) => {
        if (response?.result) resolve(response.result)
        else reject(response?.error || '翻译失败')
      }
    )
  })
}

// 语音合成语言映射
function getSpeechLang(lang: string) {
  switch (lang) {
    case 'zh':
    case 'zh-CN':
    case 'zh-Hans':
      return 'zh-CN';
    case 'zh-TW':
    case 'zh-Hant':
      return 'zh-TW';
    case 'en':
      return 'en-US';
    case 'ja':
      return 'ja-JP';
    case 'ko':
      return 'ko-KR';
    case 'fr':
      return 'fr-FR';
    case 'de':
      return 'de-DE';
    case 'es':
      return 'es-ES';
    case 'ru':
      return 'ru-RU';
    case 'pt':
      return 'pt-PT';
    default:
      return lang;
  }
}

// 获取可用 voice，优先选用目标语言
const getVoice = (lang: string) => {
  const voices = window.speechSynthesis.getVoices();
  // 优先找完全匹配，其次找前缀匹配
  let voice = voices.find(v => v.lang === lang);
  if (!voice) voice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
  return voice || voices[0];
};

const TranslatorResult: React.FC<TranslatorResultProps> = ({ x, y, text, showMessage, autoRead, engine }) => {
  const [targetLang, setTargetLang] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [favoriteLangs, setFavoriteLangs] = useState<string[]>([]);
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const originalTextRef = useRef(text);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  // 监听 favoriteLangs 变化，并同步 targetLang
  useEffect(() => {
    const fetchFav = async () => {
      const fav = await storage.get('favoriteLangs');
      if (Array.isArray(fav)) setFavoriteLangs(fav); // 允许空数组
    };
    fetchFav();
    // 监听 storage 变化
    const handler = (changes, area) => {
      if (area === 'local' && changes['favoriteLangs']) {
        const fav = changes['favoriteLangs'].newValue;
        if (Array.isArray(fav)) setFavoriteLangs(fav); // 允许空数组
      }
    };
    chrome.storage.onChanged.addListener(handler);
    return () => chrome.storage.onChanged.removeListener(handler);
  }, []);

  // favoriteLangs 变化时自动同步 targetLang
  useEffect(() => {
    if (favoriteLangs.length > 0) {
      setTargetLang(prev => favoriteLangs.includes(prev) ? prev : favoriteLangs[0]);
    } else {
      // 自动用浏览器语言并做微软/Google映射
      setTargetLang(getEngineLangCode(getBrowserLang(), 'bing'));
    }
  }, [favoriteLangs]);

  // 翻译时始终用 props.engine
  useEffect(() => {
    originalTextRef.current = text;
    setLoading(true);
    if (targetLang) {
      callTranslateAPI(text, 'auto', targetLang, engine)
        .then(res => setTranslatedText(res))
        .catch(() => setTranslatedText('翻译失败'))
        .finally(() => setLoading(false));
    } else {
      // 不传 from/to，自动检测并自动目标语言
      callTranslateAPI(text, 'auto', undefined)
        .then(res => setTranslatedText(res))
        .catch(() => setTranslatedText('翻译失败'))
        .finally(() => setLoading(false));
    }
  }, [text, targetLang, engine]);

  // 自动朗读
  useEffect(() => {
    if (autoRead && translatedText) {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      const utter = new window.SpeechSynthesisUtterance(translatedText);
      utter.lang = getSpeechLang(targetLang);
      const voice = getVoice(utter.lang);
      if (utter.lang.startsWith('ja') && (!voice || !voice.lang.startsWith('ja'))) {
        showMessage('warning', '未检测到日语语音，已用默认语音朗读');
      }
      if (voice) utter.voice = voice;
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      utterRef.current = utter;
      setIsSpeaking(true);
      window.speechSynthesis.speak(utter);
    }
    // 只依赖 autoRead 和 translatedText，保证翻译结果出来后自动朗读
  }, [autoRead, translatedText]);

  // 停止朗读
  const stopSpeak = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // 手动朗读/停止
  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!translatedText) {
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
      const utter = new window.SpeechSynthesisUtterance(translatedText);
      utter.lang = getSpeechLang(targetLang);
      const voice = getVoice(utter.lang);
      if (utter.lang.startsWith('ja') && (!voice || !voice.lang.startsWith('ja'))) {
        showMessage('warning', '未检测到日语语音，已用默认语音朗读');
      }
      if (voice) utter.voice = voice;
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
    if (translatedText) {
      try {
        await navigator.clipboard.writeText(translatedText);
        showMessage('success', '已复制');
      } catch (err) {
        showMessage('error', '复制失败，可能是浏览器限制或权限问题');
        console.error('复制失败', err);
      }
    } else {
      showMessage('warning', '没有可复制的内容');
    }
  };

  // 重新翻译逻辑
  const handleLangClick = async (e: React.MouseEvent, lang: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (lang === targetLang) return;
    setTargetLang(lang);
  };

  // 获取语言缩写
  const getLangAbbr = (langCode: string) => {
    const langMap: { [key: string]: string } = {
      'zh': '中',
      'zh-CN': '中',
      'zh-Hans': '中',
      'zh-TW': '繁',
      'zh-Hant': '繁',
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

  const getBrowserLang = () => {
    // 取 navigator.language，如 zh-CN、en-US，做一次映射
    const lang = navigator.language || 'zh-CN';
    // 只取前两位或直接用
    if (lang.startsWith('zh')) return lang.includes('TW') ? 'zh-TW' : 'zh-CN';
    if (lang.startsWith('en')) return 'en';
    if (lang.startsWith('ja')) return 'ja';
    if (lang.startsWith('ko')) return 'ko';
    if (lang.startsWith('fr')) return 'fr';
    if (lang.startsWith('de')) return 'de';
    if (lang.startsWith('es')) return 'es';
    if (lang.startsWith('ru')) return 'ru';
    if (lang.startsWith('pt')) return 'pt';
    return 'en'; // 兜底
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
        <div className="translator-result-text">{loading ? '翻译中...' : translatedText}</div>
        
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
          {favoriteLangs.length > 0 && (
            <div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
              {favoriteLangs.map((lang, idx) => (
                <Button
                  key={lang}
                  type={targetLang === lang ? 'primary' : 'default'}
                  size="small"
                  onClick={(e) => handleLangClick(e, lang)}
                  style={{ minWidth: '32px', padding: '0 8px', marginRight: idx !== favoriteLangs.length - 1 ? '8px' : 0 }}
                >
                  {getLangAbbr(lang)}
                </Button>
              ))}
            </div>
          )}

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
              disabled={!translatedText}
            />
            <Button
              type="text"
              icon={<CopyOutlined />}
              size="small"
              onClick={handleCopy}
              title="复制"
              disabled={!translatedText}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TranslatorResult; 