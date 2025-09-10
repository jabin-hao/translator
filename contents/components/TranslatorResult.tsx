import React, { useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, Button, Divider, Spin } from 'antd';
import { CopyOutlined, SoundOutlined, LoadingOutlined, StarOutlined, StarFilled } from '@ant-design/icons';
import { useImmer } from 'use-immer';
import '../styles/index.css';
import { getEngineLangCode, getLangAbbr, getTTSLang, getBrowserLang } from '~lib/constants/languages';
import { useTranslation } from 'react-i18next';
import { useLanguageSettings, useSpeechSettings, useFavoritesSettings } from '~lib/settings/settings';
import { useFavorites } from '~lib/storage/chrome_storage_hooks';

// 获取友好的引擎名称
const getEngineDisplayName = (engine: string) => {
  const engineNames = {
    'bing': 'Bing',
    'google': 'Google',
    'deepl': 'DeepL'
  };
  return engineNames[engine] || engine;
};

// 扩展 Window 接口以支持全局音频元素
declare global {
  interface Window {
    // 移除 _bingTtsAudio，因为我们现在使用 currentAudioRef
  }
}

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
  callTTSAPI: (text: string, lang: string) => Promise<{ success: boolean; audioData?: ArrayBuffer; error?: string }>;
  stopTTSAPI: () => Promise<void>;
  setShouldTranslate?: (should: boolean) => void; // 新增
}

const TranslatorResult: React.FC<TranslatorResultProps> = (props) => {
  // =============== 最关键：useTranslation 必须在最前面，无条件调用 ===============
  const { t } = useTranslation();
  
  // =============== 使用新的全局配置系统 ===============
  const { languageSettings } = useLanguageSettings();
  const { speechSettings } = useSpeechSettings();
  const { favoritesSettings } = useFavoritesSettings();
  const { favorites, addFavorite, deleteFavorite } = useFavorites();
  
  const favoriteLangs = languageSettings.favorites;
  const speechConfig = {
    speed: speechSettings.speed,
    pitch: speechSettings.pitch,
    volume: speechSettings.volume,
    engine: speechSettings.engine
  };

  // =============== 早期验证：检查基本props的合法性 ===============
  const isPropsValid = useMemo(() => {
    return (
      typeof props.x === 'number' && 
      typeof props.y === 'number' &&
      !isNaN(props.x) && 
      !isNaN(props.y) &&
      typeof props.text === 'string' &&
      props.text.length > 0
    );
  }, [props.x, props.y, props.text]);

  // =============== 所有其他 hooks 必须在这里，无条件执行 ===============
  const [targetLang, setTargetLang] = useImmer<string | undefined>(undefined);
  const [isSpeaking, setIsSpeaking] = useImmer(false);
  const [translatedText, setTranslatedText] = useImmer('');
  const [loading, setLoading] = useImmer(false);
  const [usedEngine, setUsedEngine] = useImmer(props.engine);
  const [shouldRender, setShouldRender] = useImmer(false);
  const [isFavorited, setIsFavorited] = useImmer(false);
  
  // refs - 也必须无条件调用
  const originalTextRef = useRef(props.text);
  const hasTranslatedRef = useRef(false);
  const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);
  const lastTargetLangRef = useRef<string | undefined>(props.targetLang);
  const isPlayingAudioRef = useRef(false); // 新增：跟踪音频播放状态
  const isLanguageSwitchingRef = useRef(false); // 新增：跟踪是否正在切换语言

  // =============== 所有 useEffect 也必须无条件调用 ===============
  
  // 1. 设置渲染状态
  useEffect(() => {
    setShouldRender(isPropsValid);
  }, [isPropsValid]);

  // 2. 设置目标语言
  useEffect(() => {
    if (!shouldRender) return;
    
    // 如果正在语言切换，不要被父组件的 props.targetLang 覆盖
    if (isLanguageSwitchingRef.current) {
      return;
    }
    
    if (props.targetLang) {
      setTargetLang(props.targetLang);
      return;
    }
    if (favoriteLangs.length > 0) {
      setTargetLang(favoriteLangs[0]);
      return;
    }
    if (!targetLang) {
      const defaultLang = getEngineLangCode(getBrowserLang(), 'bing');
      setTargetLang(defaultLang);
    }
  }, [props.targetLang, favoriteLangs, targetLang, shouldRender]);

  // 创建稳定的翻译函数
  const doTranslation = useCallback((srcText: string, targetLang: string) => {
    setLoading(true);
    hasTranslatedRef.current = true;
    isLanguageSwitchingRef.current = false; // 重置语言切换标志
    
    // 直接传递 targetLang，让 callTranslateAPI 处理语言映射
    props.callTranslateAPI(srcText, 'auto', targetLang, props.engine)
      .then(res => {
        setTranslatedText(res.result ?? '');
        setUsedEngine(res.engine || props.engine);
        isLanguageSwitchingRef.current = false; // 翻译完成后重置语言切换标志
        props.onTranslationComplete?.(); // 翻译成功时调用回调
      })
      .catch(err => {
        console.error('翻译失败:', err);
        setTranslatedText(t('翻译失败'));
        setUsedEngine('');
        isLanguageSwitchingRef.current = false; // 翻译失败后也重置语言切换标志
        props.onTranslationComplete?.(); // 翻译失败时也调用回调
      })
      .finally(() => {
        setLoading(false);
      });
  }, [props.callTranslateAPI, props.engine, props.onTranslationComplete, t]);

  // 4. 翻译逻辑
  useEffect(() => {
    if (!shouldRender || !targetLang || !props.callTranslateAPI) {
      return;
    }
    
    // 检查是否应该开始翻译
    if (props.shouldTranslate === false) {
      return;
    }
    
    const srcText = props.originalText || props.text;
    // 检查文本或目标语言是否变化
    if (
      srcText !== originalTextRef.current ||
      targetLang !== lastTargetLangRef.current
    ) {
      hasTranslatedRef.current = false;
      setTranslatedText('');
      originalTextRef.current = srcText;
      lastTargetLangRef.current = targetLang;
    }
    
    // 如果已经翻译过相同内容，跳过
    if (hasTranslatedRef.current && !isLanguageSwitchingRef.current) {
      return;
    }
    
    // 如果正在语言切换，强制重新翻译
    if (isLanguageSwitchingRef.current) {
      hasTranslatedRef.current = false;
    }
    
    // 清除之前的定时器
    if (translationTimeoutRef.current) {
      clearTimeout(translationTimeoutRef.current);
    }
    
    // 设置防抖定时器，延迟100ms执行翻译
    translationTimeoutRef.current = setTimeout(() => {
      doTranslation(srcText, targetLang);
    }, 100);
    
    // 清理定时器
    return () => {
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current);
      }
    };
  }, [props.originalText, props.text, targetLang, props.shouldTranslate, shouldRender, doTranslation]);

  // 5. 自动朗读
  useEffect(() => {
    if (!shouldRender || !props.autoRead || !translatedText || translatedText === t('翻译失败') || loading) {
      return;
    }
    
    // 如果正在语言切换过程中，等翻译完成后再朗读
    if (isLanguageSwitchingRef.current) {
      return;
    }
    
    // 检查翻译文本是否与当前目标语言匹配
    // 如果目标语言刚改变，翻译文本可能还是旧的，不要朗读
    if (targetLang !== lastTargetLangRef.current) {
      return;
    }
    
    handleAutoRead();
  }, [props.autoRead, translatedText, loading, shouldRender, t, targetLang]);

  // 6. ESC 关闭监听
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

  // 8. 检查收藏状态
  useEffect(() => {
    if (!shouldRender || !translatedText || !targetLang || translatedText === t('翻译失败')) {
      return;
    }
    
    const checkFavoriteStatus = () => {
      try {
        const sourceText = props.originalText || props.text;
        const isAlreadyFavorited = favorites.some(fav => 
          fav.originalText === sourceText &&
          fav.targetLanguage === targetLang
        );
        setIsFavorited(isAlreadyFavorited);
      } catch (error) {
        console.error('检查收藏状态失败:', error);
        setIsFavorited(false);
      }
    };
    
    checkFavoriteStatus();
  }, [shouldRender, translatedText, targetLang, props.originalText, props.text, t]);

  // 7. 组件卸载清理
  useEffect(() => {
    return () => {
      // 停止朗读
      stopSpeaking();
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current);
      }
    };
  }, []);

  // =============== 事件处理函数 ===============
  
  // 停止朗读的统一函数
  const stopSpeaking = async () => {
    await props.stopTTSAPI();
    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    isPlayingAudioRef.current = false;
  };

  // Web Speech API 朗读函数
  const speakWithWebSpeechAPI = async (text: string, lang: string): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      if (!('speechSynthesis' in window)) {
        reject(new Error('Web Speech API 不支持'));
        return;
      }

      try {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = getTTSLang(lang);
        utterance.rate = speechConfig.speed || 1;
        utterance.pitch = speechConfig.pitch || 1;
        utterance.volume = speechConfig.volume || 1;
        
        utterance.onstart = () => {
          setIsSpeaking(true);
        };
        
        utterance.onend = () => {
          setIsSpeaking(false);
          resolve();
        };
        
        utterance.onerror = (event) => {
          setIsSpeaking(false);
          reject(new Error(`Web Speech API 错误: ${event.error}`));
        };
        
        window.speechSynthesis.speak(utterance);
      } catch (error) {
        console.error('[Web Speech API] 获取设置失败:', error);
        reject(error);
      }
    });
  };

  // 统一的朗读函数
  const performSpeech = async (text: string, lang: string): Promise<void> => {
    if (!text || text === t('翻译失败')) {
      throw new Error('没有可朗读的内容');
    }
    if (!lang) {
      throw new Error('目标语言未设置');
    }

    try {
      // 调用background的TTS服务
      const result = await props.callTTSAPI(text, lang);

      // 如果TTS服务成功且有音频数据，播放音频
      if (result.success && result.audioData) {
        try {
          // 确保 audioData 是 ArrayBuffer 类型
          let audioBuffer: ArrayBuffer;
          
          if (result.audioData instanceof ArrayBuffer) {
            audioBuffer = result.audioData;
          } else if ((result.audioData as any) instanceof Uint8Array) {
            const uint8Array = result.audioData as Uint8Array;
            audioBuffer = uint8Array.buffer instanceof ArrayBuffer 
              ? uint8Array.buffer.slice(uint8Array.byteOffset, uint8Array.byteOffset + uint8Array.byteLength)
              : new ArrayBuffer(0);
          } else if (result.audioData && typeof result.audioData === 'object') {
            // 检查是否是通过消息传递序列化的 Uint8Array
            const obj = result.audioData as any;

            if (obj.constructor?.name === 'Uint8Array' || (obj.buffer && obj.byteLength !== undefined)) {
              const uint8Array = new Uint8Array(Object.values(obj));
              audioBuffer = uint8Array.buffer;
            } else if (typeof obj === 'object' && obj[0] !== undefined) {
              // 可能是普通对象形式的数组
              const values = Object.values(obj) as number[];
              if (values.length > 0) {
                const uint8Array = new Uint8Array(values);
                audioBuffer = uint8Array.buffer;
              } else {
                console.error('音频数据对象为空:', obj);
                throw new Error('收到空的音频数据');
              }
            } else {
              console.error('未知的音频数据格式:', obj);
              
              // 如果是空对象，给出更具体的错误信息
              if (Object.keys(obj).length === 0) {
                console.error('TTS 服务返回了空的音频数据，可能是网络问题或 API 限制');
                throw new Error('TTS 服务无法生成音频');
              } else {
                throw new Error('音频数据格式不支持');
              }
            }
          } else {
            console.error('无法识别的音频数据类型:', typeof result.audioData, result.audioData);
            throw new Error('音频数据格式不支持');
          }
          
          // 检查音频数据是否有效
          if (audioBuffer.byteLength === 0) {
            throw new Error('音频数据为空');
          }
          
          // 使用 Web Audio API 播放
          await playAudioFromArrayBuffer(audioBuffer);
          return;
        } catch (audioError) {
          console.warn('[TTS] Web Audio API 播放失败，回退到 Web Speech API:', audioError);
          // 如果播放失败，回退到本地Web Speech API
        }
      }
      
      // 检查是否需要使用Web Speech API (browser TTS)
      if (result.error === 'browser_tts_required' || !result.success) {
        await speakWithWebSpeechAPI(text, lang);
        return;
      }
      
      // 如果没有音频数据但标记为成功，也回退到Web Speech API
      if (result.success && !result.audioData) {
        await speakWithWebSpeechAPI(text, lang);
        return;
      }
      
      // 其他情况抛出错误
      throw new Error(result.error || 'TTS服务失败');
      
    } catch (error) {
      console.error('[TTS] TTS服务完全失败:', error);
      
      // 最后的回退方案：直接使用Web Speech API
      await speakWithWebSpeechAPI(text, lang);
    }
  };

  // 创建音频播放函数 - 使用Web Audio API避免CSP问题
  const playAudioFromArrayBuffer = (audioData: ArrayBuffer): Promise<void> => {
    return new Promise((resolve, reject) => {
      // 防重复调用
      if (isPlayingAudioRef.current) {
        reject(new Error('音频正在播放中'));
        return;
      }
      
      let audioContext: AudioContext | null = null;
      
      try {
        // 清理之前的音频
        if (currentAudioRef.current) {
          currentAudioRef.current.pause();
          currentAudioRef.current = null;
        }

        // 检查 Web Audio API 支持
        if (!window.AudioContext && !(window as any).webkitAudioContext) {
          console.warn('Web Audio API 不支持，回退到Web Speech API');
          reject(new Error('Web Audio API 不支持'));
          return;
        }

        // 设置播放状态
        isPlayingAudioRef.current = true;

        // 使用 Web Audio API 播放音频
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      
        audioContext.decodeAudioData(audioData)
          .then((audioBuffer) => {

            const source = audioContext!.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext!.destination);
            
            // 设置事件监听器
            source.onended = () => {
              setIsSpeaking(false);
              isPlayingAudioRef.current = false;
              if (audioContext && audioContext.state !== 'closed') {
                try {
                  audioContext.close();
                } catch (e) {
                  console.warn('关闭 AudioContext 时出错:', e);
                }
              }
              resolve();
            };
            
            setIsSpeaking(true);
            source.start(0);
            
            // 保存引用以便停止
            currentAudioRef.current = {
              pause: () => {
                try {
                  source.stop();
                  isPlayingAudioRef.current = false;
                  if (audioContext && audioContext.state !== 'closed') {
                    audioContext.close();
                  }
                  setIsSpeaking(false);
                } catch (e) {
                  console.warn('停止音频时出错:', e);
                }
              }
            } as any;
          })
          .catch((error) => {
            console.error('音频解码失败:', error);
            setIsSpeaking(false);
            isPlayingAudioRef.current = false;
            if (audioContext && audioContext.state !== 'closed') {
              try {
                audioContext.close();
              } catch (e) {
                console.warn('关闭 AudioContext 时出错:', e);
              }
            }
            reject(error);
          });

      } catch (error) {
        console.error('创建音频失败:', error);
        setIsSpeaking(false);
        isPlayingAudioRef.current = false;
        if (audioContext && audioContext.state !== 'closed') {
          try {
            audioContext.close();
          } catch (e) {
            console.warn('关闭 AudioContext 时出错:', e);
          }
        }
        reject(error);
      }
    });
  };

  // 自动朗读处理函数
  const handleAutoRead = async () => {
    if (!translatedText || translatedText === t('翻译失败')) return;
    if (!targetLang) {
      console.warn('targetLang 为空，跳过自动朗读');
      return;
    }

    try {
      setIsSpeaking(true);
      await performSpeech(translatedText, targetLang);
    } catch (error) {
      console.error('自动朗读失败:', error);
      setIsSpeaking(false);
    }
  };

  // 语言切换处理
  const handleLangClick = async (e: React.MouseEvent, lang: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (lang === targetLang) return;
    
    // 标记正在切换语言
    isLanguageSwitchingRef.current = true;
    
    // 停止当前的朗读
    if (isSpeaking) {
      await stopSpeaking();
    }
    
    // 重置翻译状态，触发重新翻译
    hasTranslatedRef.current = false;
    setTranslatedText('');
    setLoading(true); // 立即显示加载状态
    setUsedEngine(''); // 重置引擎状态
    
    // 设置新的目标语言
    setTargetLang(lang);
    
    // 立即更新 lastTargetLangRef，确保翻译逻辑能检测到变化
    lastTargetLangRef.current = lang;
    
    // 切换语言后触发翻译
    props.setShouldTranslate?.(true);
  };

  // 手动朗读/停止处理
  const handleSpeak = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (isSpeaking) {
      // 停止朗读
      await stopSpeaking();
      props.showMessage('info', t('已停止朗读'));
    } else {
      // 开始朗读
      try {
        if (!translatedText || translatedText === t('翻译失败')) {
          props.showMessage('warning', t('没有可朗读的内容'));
          return;
        }
        if (!targetLang) {
          props.showMessage('warning', t('目标语言未设置'));
          return;
        }

        setIsSpeaking(true);
        props.showMessage('success', t('开始朗读'));
        await performSpeech(translatedText, targetLang);
      } catch (error) {
        console.error('手动朗读失败:', error);
        setIsSpeaking(false);
        props.showMessage('error', t('朗读失败'));
      }
    }
  };

  // 复制处理
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

  // 收藏/取消收藏处理
  const handleFavorite = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    
    if (!translatedText || translatedText === t('翻译失败') || !targetLang) {
      props.showMessage('warning', t('没有可收藏的内容'));
      return;
    }
    
    try {
      const sourceText = props.originalText || props.text;
      
      if (isFavorited) {
        // 取消收藏 - 查找对应的收藏项
        const favoriteItem = favorites.find(
          item => item.originalText === sourceText && 
                  item.targetLanguage === targetLang
        );
        
        if (favoriteItem) {
          const success = await deleteFavorite(favoriteItem.id);
          if (success) {
            setIsFavorited(false);
            props.showMessage('success', t('已取消收藏'));
          }
        }
      } else {
        // 添加收藏
        const success = await addFavorite({
          originalText: sourceText,
          translatedText: translatedText,
          sourceLanguage: 'auto',  // 源语言设为auto
          targetLanguage: targetLang,
          engine: props.engine || 'bing'
        });
        if (success) {
          setIsFavorited(true);
          props.showMessage('success', t('已添加到收藏'));
        }
      }
    } catch (error) {
      console.error('收藏操作失败:', error);
      props.showMessage('error', t('收藏操作失败'));
    }
  };

  // =============== 渲染逻辑 ===============
  
  // 如果组件不应该渲染或目标语言未设置，返回null
  if (!shouldRender || !targetLang) {
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
        <div className="translator-result-text">
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Spin 
                size="small"
                indicator={<LoadingOutlined style={{ fontSize: 14, color: '#1890ff' }} spin />}
              />
              <span style={{ color: '#1890ff' }}>{t('翻译中...')}</span>
            </div>
          ) : translatedText}
        </div>
        
        {/* Footer区域 */}
        <Divider style={{ margin: '12px 0 8px 0' }} />
        <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
          {usedEngine && translatedText !== t('翻译失败') && 
            `${t('本次翻译由')} ${getEngineDisplayName(usedEngine)} ${t('提供')}`
          }
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
                  style={{ 
                    minWidth: '32px', 
                    padding: '0 8px', 
                    marginRight: idx !== favoriteLangs.length - 1 ? '8px' : 0 
                  }}
                  loading={loading && targetLang === lang}
                >
                  {getLangAbbr(lang)}
                </Button>
              ))}
            </div>
          )}

          {/* 右侧：复制、朗读和收藏按钮 */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              flexShrink: 0,
            }}
          >
            {/* 朗读按钮 - 根据朗读功能开关显示 */}
            {speechSettings.enabled && (
              <Button
                type={isSpeaking ? 'primary' : 'text'}
                icon={<SoundOutlined />}
                size="small"
                onClick={handleSpeak}
                title={isSpeaking ? t('停止朗读') : t('朗读')}
                style={{ marginRight: '4px' }}
                disabled={!translatedText || loading}
              />
            )}
            
            {/* 收藏按钮 - 根据收藏功能开关显示 */}
            {favoritesSettings.enabled && (
              <Button
                type={isFavorited ? 'primary' : 'text'}
                icon={isFavorited ? <StarFilled /> : <StarOutlined />}
                size="small"
                onClick={handleFavorite}
                title={isFavorited ? t('取消收藏') : t('收藏')}
                style={{ marginRight: '4px' }}
                disabled={!translatedText || loading}
              />
            )}
            
            <Button
              type="text"
              icon={<CopyOutlined />}
              size="small"
              onClick={handleCopy}
              title={t('复制')}
              disabled={!translatedText || loading}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

// 设置默认属性
TranslatorResult.defaultProps = {
  onClose: () => {},
};

export default TranslatorResult;