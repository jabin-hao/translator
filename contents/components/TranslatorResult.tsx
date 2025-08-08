import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Card, Button, Divider } from 'antd';
import { CopyOutlined, SoundOutlined } from '@ant-design/icons';
import '../index.css';
import { Storage } from '@plasmohq/storage';
import { getEngineLangCode, getLangAbbr, getTTSLang, getBrowserLang } from '~lib/constants/languages';
import { useTranslation } from 'react-i18next';

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

const storage = new Storage();

// 获取友好的引擎名称
const getEngineDisplayName = (engine: string) => {
  const engineNames = {
    'bing': 'Bing',
    'google': 'Google',
    'deepl': 'DeepL'
  };
  return engineNames[engine] || engine;
};

const TranslatorResult: React.FC<TranslatorResultProps> = (props) => {
  // =============== 最关键：useTranslation 必须在最前面，无条件调用 ===============
  const { t } = useTranslation();
  
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
  const [targetLang, setTargetLang] = useState<string | undefined>(undefined);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [favoriteLangs, setFavoriteLangs] = useState<string[]>([]);
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [usedEngine, setUsedEngine] = useState(props.engine);
  const [shouldRender, setShouldRender] = useState(false);
  
  // refs - 也必须无条件调用
  const originalTextRef = useRef(props.text);
  const hasTranslatedRef = useRef(false);
  const isInitializedRef = useRef(false);
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

  // 2. 获取收藏语言
  useEffect(() => {
    if (!shouldRender) return;
    
    let isMounted = true;
    const fetchFav = async () => {
      try {
        const fav = await storage.get('favoriteLangs');
        if (isMounted && Array.isArray(fav)) {
          setFavoriteLangs(fav);
        }
      } catch (e) {
        console.error('获取收藏语言失败:', e);
      }
    };
    fetchFav();
    
    return () => {
      isMounted = false;
    };
  }, [shouldRender]);

  // 3. 设置目标语言
  useEffect(() => {
    if (!shouldRender) return;
    
    // 如果正在语言切换，不要被父组件的 props.targetLang 覆盖
    if (isLanguageSwitchingRef.current) {
      console.log('正在语言切换中，跳过父组件的 targetLang 设置');
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
    console.log('TranslatorResult 开始翻译:', {
      srcText,
      targetLang,
      engine: props.engine,
      hasTranslated: hasTranslatedRef.current,
      isLanguageSwitching: isLanguageSwitchingRef.current
    });
    
    setLoading(true);
    hasTranslatedRef.current = true;
    isLanguageSwitchingRef.current = false; // 重置语言切换标志
    
    // 直接传递 targetLang，让 callTranslateAPI 处理语言映射
    props.callTranslateAPI(srcText, 'auto', targetLang, props.engine)
      .then(res => {
        console.log('翻译成功:', res);
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
        console.log('翻译完成，设置loading为false');
        setLoading(false);
      });
  }, [props.callTranslateAPI, props.engine, props.onTranslationComplete, t]);

  // 4. 翻译逻辑
  useEffect(() => {
    if (!shouldRender || !targetLang || !props.callTranslateAPI) {
      return;
    }
    
    console.log('翻译逻辑 useEffect 触发:', { 
      targetLang, 
      hasCallTranslateAPI: !!props.callTranslateAPI,
      hasTranslated: hasTranslatedRef.current,
      translatedText: translatedText ? '有内容' : '无内容',
      shouldTranslate: props.shouldTranslate,
      lastTargetLang: lastTargetLangRef.current,
      isLanguageSwitching: isLanguageSwitchingRef.current
    });
    
    // 检查是否应该开始翻译
    if (props.shouldTranslate === false) {
      console.log('TranslatorResult shouldTranslate 为 false，跳过自动翻译');
      return;
    }
    
    const srcText = props.originalText || props.text;
    // 检查文本或目标语言是否变化
    if (
      srcText !== originalTextRef.current ||
      targetLang !== lastTargetLangRef.current
    ) {
      console.log('文本或目标语言已改变，重置翻译状态:', {
        srcText,
        originalTextRef: originalTextRef.current,
        targetLang,
        lastTargetLang: lastTargetLangRef.current,
        isLanguageSwitching: isLanguageSwitchingRef.current
      });
      hasTranslatedRef.current = false;
      setTranslatedText('');
      originalTextRef.current = srcText;
      lastTargetLangRef.current = targetLang;
    }
    
    // 如果已经翻译过相同内容，跳过
    if (hasTranslatedRef.current && !isLanguageSwitchingRef.current) {
      console.log('已经翻译过相同内容，跳过');
      return;
    }
    
    // 如果正在语言切换，强制重新翻译
    if (isLanguageSwitchingRef.current) {
      console.log('正在语言切换，强制重新翻译');
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
      console.log('正在语言切换过程中，跳过自动朗读');
      return;
    }
    
    // 检查翻译文本是否与当前目标语言匹配
    // 如果目标语言刚改变，翻译文本可能还是旧的，不要朗读
    if (targetLang !== lastTargetLangRef.current) {
      console.log('目标语言刚改变，跳过自动朗读');
      return;
    }
    
    console.log('触发自动朗读:', { translatedText, targetLang });
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

  // 7. 组件卸载清理
  useEffect(() => {
    return () => {
      // 停止朗读
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current);
      }
      setIsSpeaking(false);
      isPlayingAudioRef.current = false; // 重置播放状态
    };
  }, []);

  // 调试：监控状态变化
  useEffect(() => {
    console.log('targetLang 变化:', {
      targetLang,
      lastTargetLang: lastTargetLangRef.current,
      isLanguageSwitching: isLanguageSwitchingRef.current
    });
  }, [targetLang]);

  // =============== 事件处理函数 ===============
  
  // 创建音频播放函数 - 使用Web Audio API避免CSP问题
  const playAudioFromArrayBuffer = (audioData: ArrayBuffer): Promise<void> => {
    return new Promise((resolve, reject) => {
      // 防重复调用
      if (isPlayingAudioRef.current) {
        console.warn('音频正在播放中，忽略重复调用');
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
        
        console.log('开始解码音频数据，大小:', audioData.byteLength);
        
        audioContext.decodeAudioData(audioData)
          .then((audioBuffer) => {
            console.log('音频解码成功，时长:', audioBuffer.duration, '秒');
            
            const source = audioContext!.createBufferSource();
            source.buffer = audioBuffer;
            source.connect(audioContext!.destination);
            
            // 设置事件监听器
            source.onended = () => {
              console.log('音频播放结束');
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
            
            // 开始播放
            console.log('音频开始播放');
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

  // 创建从Base64播放音频的函数（备用）
  const playAudioFromBase64 = (base64Data: string): Promise<void> => {
    return new Promise((resolve, reject) => {
      try {
        // 解码 Base64 数据
        const binaryString = atob(base64Data.split(',')[1] || base64Data);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }

        // 使用Web Audio API方法播放
        playAudioFromArrayBuffer(bytes.buffer)
          .then(resolve)
          .catch(reject);

      } catch (error) {
        console.error('Base64解码失败:', error);
        setIsSpeaking(false);
        reject(error);
      }
    });
  };

  // 自动朗读处理函数
  const handleAutoRead = async () => {
    if (!translatedText || translatedText === t('翻译失败')) return;

    setIsSpeaking(true);
    
    try {
      // 使用 Edge TTS 服务，获取音频数据
      const edgeResult = await props.callTTSAPI(translatedText, targetLang);
      
      if (edgeResult.success && edgeResult.audioData) {
        console.log('Edge TTS 成功，尝试播放音频数据');
        try {
          // 使用我们的 playAudioFromArrayBuffer 函数播放音频
          await playAudioFromArrayBuffer(edgeResult.audioData);
          return;
        } catch (audioError) {
          console.warn('Web Audio API 播放失败，回退到 Web Speech API:', audioError);
          // 继续执行下面的 Web Speech API 回退逻辑
        }
      }
      
      // Edge TTS 失败或没有音频数据，回退到 Web Speech API
      console.log('使用 Web Speech API 作为回退方案');
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(translatedText);
        utterance.lang = getTTSLang(targetLang);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onstart = () => {
          setIsSpeaking(true);
        };
        
        utterance.onend = () => {
          setIsSpeaking(false);
        };
        
        utterance.onerror = () => {
          setIsSpeaking(false);
        };
        
        window.speechSynthesis.speak(utterance);
      } else {
        setIsSpeaking(false);
      }
    } catch (error) {
      console.error('自动朗读失败，尝试 Web Speech API:', error);
      setIsSpeaking(false);
      
      // 最后的回退方案：Web Speech API
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(translatedText);
        utterance.lang = getTTSLang(targetLang);
        utterance.rate = 1;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onstart = () => {
          setIsSpeaking(true);
        };
        
        utterance.onend = () => {
          setIsSpeaking(false);
        };
        
        utterance.onerror = () => {
          setIsSpeaking(false);
        };
        
        window.speechSynthesis.speak(utterance);
      }
    }
  };

  // 语言切换处理
  const handleLangClick = async (e: React.MouseEvent, lang: string) => {
    e.stopPropagation();
    e.preventDefault();
    if (lang === targetLang) return;
    
    console.log('点击语言按钮，切换语言:', { from: targetLang, to: lang });
    
    // 标记正在切换语言
    isLanguageSwitchingRef.current = true;
    
    // 停止当前的朗读
    if (isSpeaking) {
      await props.stopTTSAPI();
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      isPlayingAudioRef.current = false;
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
    if (!translatedText || translatedText === t('翻译失败')) {
      props.showMessage('warning', t('没有可朗读的内容'));
      return;
    }

    if (isSpeaking) {
      // 停止朗读
      await props.stopTTSAPI();
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      isPlayingAudioRef.current = false;
      props.showMessage('info', t('已停止朗读'));
    } else {
      // 开始朗读
      setIsSpeaking(true);
      props.showMessage('success', t('开始朗读'));
      
      try {
        // 使用 Edge TTS 服务，获取音频数据
        const edgeResult = await props.callTTSAPI(translatedText, targetLang);
        
        if (edgeResult.success && edgeResult.audioData) {
          console.log('Edge TTS 成功，尝试播放音频数据');
          try {
            // 使用我们的 playAudioFromArrayBuffer 函数播放音频
            await playAudioFromArrayBuffer(edgeResult.audioData);
            return;
          } catch (audioError) {
            console.warn('Web Audio API 播放失败，回退到 Web Speech API:', audioError);
            // 继续执行下面的 Web Speech API 回退逻辑
          }
        }
        
        // Edge TTS 失败或没有音频数据，回退到 Web Speech API
        console.log('使用 Web Speech API 作为回退方案');
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(translatedText);
          utterance.lang = getTTSLang(targetLang);
          utterance.rate = 1;
          utterance.pitch = 1;
          utterance.volume = 1;
          
          utterance.onstart = () => {
            setIsSpeaking(true);
          };
          
          utterance.onend = () => {
            setIsSpeaking(false);
          };
          
          utterance.onerror = () => {
            setIsSpeaking(false);
            props.showMessage('error', t('朗读失败'));
          };
          
          window.speechSynthesis.speak(utterance);
        } else {
          setIsSpeaking(false);
          props.showMessage('error', t('朗读功能不可用'));
        }
      } catch (error) {
        console.error('朗读失败，尝试 Web Speech API:', error);
        setIsSpeaking(false);
        
        // 最后的回退方案：Web Speech API
        if ('speechSynthesis' in window) {
          const utterance = new SpeechSynthesisUtterance(translatedText);
          utterance.lang = getTTSLang(targetLang);
          utterance.rate = 1;
          utterance.pitch = 1;
          utterance.volume = 1;
          
          utterance.onstart = () => {
            setIsSpeaking(true);
          };
          
          utterance.onend = () => {
            setIsSpeaking(false);
          };
          
          utterance.onerror = () => {
            setIsSpeaking(false);
            props.showMessage('error', t('朗读失败'));
          };
          
          window.speechSynthesis.speak(utterance);
        } else {
          props.showMessage('error', t('朗读功能不可用'));
        }
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
          {loading ? t('翻译中...') : translatedText}
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
              disabled={!translatedText || loading}
            />
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