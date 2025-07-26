import React, { useState, useEffect, useRef } from 'react';
import { Card, Button, Space, Divider } from 'antd';
import { CopyOutlined, SoundOutlined } from '@ant-design/icons';
import '../index.css';
import { Storage } from '@plasmohq/storage';
import { getEngineLangCode, getLangAbbr, getSpeechLang, LANGUAGES, getBrowserLang } from '../../lib/languages';
import { sendToBackground } from '@plasmohq/messaging';
// import { useTranslation } from 'react-i18next';

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
  shouldTranslate?: boolean; // 新增：是否应该开始翻译
  onTranslationComplete?: () => void; // 新增：翻译完成回调
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

// 获取友好的引擎名称
const getEngineDisplayName = (engine: string) => {
  const engineNames = {
    'bing': 'Bing',
    'google': 'Google',
    'deepl': 'DeepL'
  };
  return engineNames[engine] || engine;
};

// 自定义翻译函数，避免使用 useTranslation hook
const getText = (key: string) => {
  const translations = {
    'translating': '翻译中...',
    'copy': '复制',
    'speak': '朗读',
    'stopSpeak': '停止朗读',
    'noContentToSpeak': '没有可朗读的内容',
    'noContentToCopy': '没有可复制的内容',
    'copySuccess': '已复制',
    'copyFailed': '复制失败，可能是浏览器限制或权限问题',
    'speakStarted': '开始朗读',
    'speakStopped': '已停止朗读',
    'noJapaneseVoice': '未检测到日语语音，已用默认语音朗读',
    'translationBy': '本次翻译由',
    'provided': '提供'
  };
  return translations[key] || key;
};

const TranslatorResult: React.FC<TranslatorResultProps> = (props) => {
  // 移除 useTranslation，使用自定义翻译函数
  // const { t } = useTranslation();
  
  // 所有 hooks 必须无条件执行，按照固定顺序
  const [targetLang, setTargetLang] = useState<string | undefined>(undefined);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [favoriteLangs, setFavoriteLangs] = useState<string[]>([]);
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [usedEngine, setUsedEngine] = useState(props.engine);
  const originalTextRef = useRef(props.text);
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null);
  const hasTranslatedRef = useRef(false);
  const isInitializedRef = useRef(false); // 添加初始化标志
  const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null); // 添加防抖定时器

  // 监听 favoriteLangs 变化
  useEffect(() => {
    const fetchFav = async () => {
      const fav = await storage.get('favoriteLangs');
      if (Array.isArray(fav)) setFavoriteLangs(fav);
    };
    fetchFav();
    const handler = (val) => {
      if (Array.isArray(val)) setFavoriteLangs(val);
    };
    storage.watch({ favoriteLangs: handler });
    return () => { storage.unwatch({ favoriteLangs: handler }); };
  }, []);

  // 设置目标语言
  useEffect(() => {
    // 如果props.targetLang存在，直接使用
    if (props.targetLang) {
      setTargetLang(props.targetLang);
      return;
    }
    
    // 如果favoriteLangs存在且不为空，使用第一个
    if (favoriteLangs.length > 0) {
      setTargetLang(favoriteLangs[0]);
      return;
    }
    
    // 只有在targetLang还没有设置时才使用默认值
    if (!targetLang) {
      const defaultLang = getEngineLangCode(getBrowserLang(), 'bing');
      setTargetLang(defaultLang);
    }
  }, [props.targetLang, favoriteLangs]); // 移除targetLang依赖，避免循环

  // 翻译逻辑
  useEffect(() => {
    if (!targetLang || !props.callTranslateAPI) return;
    
    const srcText = props.originalText || props.text;
    
    // 如果文本改变了，重置翻译标志
    if (srcText !== originalTextRef.current) {
      hasTranslatedRef.current = false;
      setTranslatedText('');
      originalTextRef.current = srcText;
    }
    
    // 如果已经翻译过相同的文本，不再重复翻译
    if (hasTranslatedRef.current && translatedText && translatedText !== '翻译失败') {
      return;
    }
    
    // 清除之前的定时器
    if (translationTimeoutRef.current) {
      clearTimeout(translationTimeoutRef.current);
    }
    
    // 设置防抖定时器，延迟100ms执行翻译
    translationTimeoutRef.current = setTimeout(() => {
      console.log('TranslatorResult 开始翻译:', {
        srcText,
        targetLang,
        engine: props.engine,
        hasTranslated: hasTranslatedRef.current
      });
      
      setLoading(true);
      hasTranslatedRef.current = true;
      
      // 直接传递 targetLang，让 callTranslateAPI 处理语言映射
      props.callTranslateAPI(srcText, 'auto', targetLang, props.engine)
        .then(res => {
          setTranslatedText(res.result ?? '');
          setUsedEngine(res.engine || props.engine);
          props.onTranslationComplete?.(); // 翻译成功时调用回调
        })
        .catch(err => {
          setTranslatedText('翻译失败');
          setUsedEngine('');
          props.onTranslationComplete?.(); // 翻译失败时也调用回调
        })
        .finally(() => setLoading(false));
    }, 100);
    
    // 清理定时器
    return () => {
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current);
      }
    };
  }, [props.originalText, props.text, targetLang, props.engine]); // 恢复所有依赖

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
        props.showMessage('warning', getText('noJapaneseVoice'));
      }
      if (voice) utter.voice = voice;
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      utterRef.current = utter;
      setIsSpeaking(true);
      window.speechSynthesis.speak(utter);
    }
  }, [props.autoRead, translatedText, targetLang]);

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
    
    // 重置翻译状态，触发重新翻译
    hasTranslatedRef.current = false;
    setTranslatedText('');
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
      props.showMessage('warning', getText('noContentToSpeak'));
      return;
    }
    if (isSpeaking) {
      stopSpeak();
      props.showMessage('info', getText('speakStopped'));
    } else {
      if (window.speechSynthesis.speaking) {
        window.speechSynthesis.cancel();
      }
      const utter = new window.SpeechSynthesisUtterance(translatedText);
      utter.lang = getSpeechLang(targetLang);
      const voice = getVoice(utter.lang);
      if (utter.lang.startsWith('ja') && (!voice || !voice.lang.startsWith('ja'))) {
        props.showMessage('warning', getText('noJapaneseVoice'));
      }
      if (voice) utter.voice = voice;
      utter.onend = () => setIsSpeaking(false);
      utter.onerror = () => setIsSpeaking(false);
      utterRef.current = utter;
      setIsSpeaking(true);
      window.speechSynthesis.speak(utter);
      props.showMessage('success', getText('speakStarted'));
    }
  };

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    if (translatedText) {
      try {
        await navigator.clipboard.writeText(translatedText);
        props.showMessage('success', getText('copySuccess'));
      } catch (err) {
        props.showMessage('error', getText('copyFailed'));
      }
    } else {
      props.showMessage('warning', getText('noContentToCopy'));
    }
  };

  // hooks 顶层执行完毕，下面做条件渲染
  const shouldHide = (
    !targetLang ||
    typeof props.x !== 'number' || typeof props.y !== 'number' ||
    isNaN(props.x) || isNaN(props.y)
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
        <div className="translator-result-text">{loading ? getText('translating') : translatedText}</div>
        
        {/* Footer区域 */}
        <Divider style={{ margin: '12px 0 8px 0' }} />
        <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
          {usedEngine && translatedText !== '翻译失败' && `${getText('translationBy')} ${getEngineDisplayName(usedEngine)} ${getText('provided')}`}
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
              title={isSpeaking ? getText('stopSpeak') : getText('speak')}
              style={{ marginRight: '4px' }}
              disabled={!translatedText}
            />
            <Button
              type="text"
              icon={<CopyOutlined />}
              size="small"
              onClick={handleCopy}
              title={getText('copy')}
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