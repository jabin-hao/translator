import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Space, Divider } from 'antd';
import { CopyOutlined, SoundOutlined } from '@ant-design/icons';
import '../index.css';
import { Storage } from '@plasmohq/storage';
import { getEngineLangCode, getLangAbbr, getSpeechLang, LANGUAGES, getBrowserLang } from '../../lib/languages';
import { sendToBackground } from '@plasmohq/messaging';
import { useTranslation } from 'react-i18next';

interface TranslatorResultProps {
  x: number;
  y: number;
  text: string; // 原文
  originalText?: string; // 新增，原文
  showMessage: (type: 'success' | 'error' | 'warning' | 'info', content: string) => void;
  autoRead?: boolean; // 新增
  engine: string; // 新增
  onClose: () => void; // 新增
  targetLang?: string; // 新增
  callTranslateAPI: (
    text: string,
    from: string,
    to: string,
    engine: string
  ) => Promise<{ result: string; engine: string }>;
}

const storage = new Storage();
const DEFAULT_TARGET_LANG = 'zh-CN';

// 获取可用 voice，优先选用目标语言
const getVoice = (lang: string) => {
  const voices = window.speechSynthesis.getVoices();
  // 优先找完全匹配，其次找前缀匹配
  let voice = voices.find(v => v.lang === lang);
  if (!voice) voice = voices.find(v => v.lang.startsWith(lang.split('-')[0]));
  return voice || voices[0];
};

const TranslatorResult: React.FC<TranslatorResultProps> = (props) => {
  const { t } = useTranslation();
  // 所有 hooks 必须无条件执行
  const [targetLang, setTargetLang] = useState<string | undefined>(undefined);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [favoriteLangs, setFavoriteLangs] = useState<string[]>([]);
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [usedEngine, setUsedEngine] = useState(props.engine);
  const originalTextRef = useRef(props.text);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);

  // 监听 favoriteLangs 变化，并同步 targetLang
  useEffect(() => {
    const fetchFav = async () => {
      const fav = await storage.get('favoriteLangs');
      if (Array.isArray(fav)) setFavoriteLangs(fav); // 允许空数组
    };
    fetchFav();
    // Plasmo Storage watch
    const handler = (val) => {
      if (Array.isArray(val)) setFavoriteLangs(val);
    };
    storage.watch({ favoriteLangs: handler });
    return () => { storage.unwatch({ favoriteLangs: handler }); };
  }, []);

  // targetLang 优先级：propTargetLang > favoriteLangs > 浏览器语言
  useEffect(() => {
    if (props.targetLang) {
      setTargetLang(props.targetLang);
    } else if (favoriteLangs.length > 0) {
      setTargetLang(favoriteLangs[0]);
    } else {
      setTargetLang(getEngineLangCode(getBrowserLang(), 'bing'));
    }
  }, [props.targetLang, favoriteLangs]);

  // useEffect 依赖 originalText, targetLang, engine
  useEffect(() => {
    if (!targetLang) return;
    const srcText = props.originalText || props.text;
    originalTextRef.current = srcText;
    setLoading(true);
    const engineTargetLang = getEngineLangCode(targetLang, props.engine);
    props.callTranslateAPI(srcText, 'auto', engineTargetLang, props.engine)
      .then(res => {
        setTranslatedText(res.result ?? '');
        setUsedEngine(res.engine || props.engine);
      })
      .catch(err => {
        setTranslatedText('翻译失败');
        setUsedEngine('');
      })
        .finally(() => setLoading(false));
  }, [props.originalText, props.text, targetLang, props.engine]);

  // 自动朗读
  useEffect(() => {
    if (props.autoRead && translatedText && translatedText !== '翻译失败') {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      const utter = new window.SpeechSynthesisUtterance(translatedText);
      utter.lang = getSpeechLang(targetLang);
      const voice = getVoice(utter.lang);
      if (utter.lang.startsWith('ja') && (!voice || !voice.lang.startsWith('ja'))) {
        props.showMessage('warning', t('未检测到日语语音，已用默认语音朗读'));
      }
      if (voice) utter.voice = voice;
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      utterRef.current = utter;
      setIsSpeaking(true);
      window.speechSynthesis.speak(utter);
    }
    // 只依赖 autoRead 和 translatedText，保证翻译结果出来后自动朗读
  }, [props.autoRead, translatedText, targetLang, props.showMessage]);

  // 组件卸载时停止朗读
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    };
  }, []);

  // esc 关闭
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        props.onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [props.onClose]);

  // 重新翻译逻辑
  const handleLangClick = async (e: React.MouseEvent, lang: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (lang === targetLang) return;
    setTargetLang(lang);
  };

  // 停止朗读
  const stopSpeak = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  };

  // 手动朗读/停止
  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (!translatedText || translatedText === '翻译失败') {
      props.showMessage('warning', t('没有可朗读的内容'));
      return;
    }
    if (isSpeaking) {
      stopSpeak();
      props.showMessage('info', t('已停止朗读'));
    } else {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      const utter = new window.SpeechSynthesisUtterance(translatedText);
      utter.lang = getSpeechLang(targetLang);
      const voice = getVoice(utter.lang);
      if (utter.lang.startsWith('ja') && (!voice || !voice.lang.startsWith('ja'))) {
        props.showMessage('warning', t('未检测到日语语音，已用默认语音朗读'));
      }
      if (voice) utter.voice = voice;
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      utterRef.current = utter;
      setIsSpeaking(true);
      window.speechSynthesis.speak(utter);
      props.showMessage('success', t('开始朗读'));
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (translatedText) {
      try {
        await navigator.clipboard.writeText(translatedText);
        props.showMessage('success', t('已复制'));
      } catch (err) {
        props.showMessage('error', t('复制失败，可能是浏览器限制或权限问题'));
      }
    } else {
      props.showMessage('warning', t('没有可复制的内容'));
    }
  };

  // hooks 顶层执行完毕，下面做条件渲染
  const shouldHide = (
    !targetLang ||
    typeof props.x !== 'number' || typeof props.y !== 'number' ||
    isNaN(props.x) || isNaN(props.y) ||
    loading
  );

  if (shouldHide) {
    return null;
  }

  return (
    <Card
      data-translator-result
      className="translator-result-card"
      style={{ 
        left: props.x, 
        top: props.y + 10,
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
        <div className="translator-result-text">{loading ? t('翻译中...') : translatedText}</div>
        
        {/* Footer区域 */}
        <Divider style={{ margin: '12px 0 8px 0' }} />
        <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
          {usedEngine && translatedText !== '翻译失败' && `${t('本次翻译由')} ${t('engine.' + usedEngine, { defaultValue: usedEngine })} ${t('提供')}`}
        </div>
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
              title={isSpeaking ? t('停止朗读') : t('朗读')}
              style={{ marginRight: '4px' }}
              disabled={!translatedText}
            />
            <Button
              type="text"
              icon={<CopyOutlined />}
              size="small"
              onClick={handleCopy}
              title={t('复制')}
              disabled={!translatedText}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

export default TranslatorResult; 

// 防御：onClose 默认空函数，防止未传时报错
TranslatorResult.defaultProps = {
  onClose: () => {},
}; 