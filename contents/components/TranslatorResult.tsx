import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button, Card, Divider, Spin } from 'antd';
import { useTranslation } from 'react-i18next';

import Icon from '~lib/components/Icon';
import { getBrowserLang, getEngineLangCode, getLangAbbr } from '~lib/constants/languages';
import { isExtensionContextInvalidatedError } from '~lib/utils/extensionContext';
import {
  useFavoritesData,
  useFavoritesSettings,
  useLanguageSettings,
  useSpeechSettings,
} from '~lib/settings/settings';
import { useTranslatorSpeech } from '../hooks/useTranslatorSpeech';
import '../styles/index.css';

const getEngineDisplayName = (engine: string) => {
  const engineNames: Record<string, string> = {
    bing: 'Bing',
    google: 'Google',
    deepl: 'DeepL',
    edge: 'Edge',
  };

  return engineNames[engine] || engine;
};

interface TranslatorResultProps {
  x: number;
  y: number;
  text: string;
  originalText?: string;
  showMessage: (type: 'success' | 'error' | 'warning' | 'info', content: string) => void;
  autoRead?: boolean;
  engine: string;
  onClose: () => void;
  targetLang?: string;
  shouldTranslate?: boolean;
  onTranslationComplete?: () => void;
  callTranslateAPI: (
    text: string,
    from: string,
    to: string,
    engine: string
  ) => Promise<{ result: string; engine: string }>;
  callTTSAPI: (
    text: string,
    lang: string,
    speechOptions?: {
      voice?: string;
      speed: number;
      pitch: number;
      volume: number;
    }
  ) => Promise<{ success: boolean; audioData?: ArrayBuffer; error?: string }>;
  stopTTSAPI: () => Promise<void>;
  setShouldTranslate?: (should: boolean) => void;
}

const TranslatorResult: React.FC<TranslatorResultProps> = ({
  x,
  y,
  text,
  originalText,
  showMessage,
  autoRead,
  engine,
  onClose,
  targetLang: propTargetLang,
  shouldTranslate,
  onTranslationComplete,
  callTranslateAPI,
  callTTSAPI,
  stopTTSAPI,
  setShouldTranslate,
}) => {
  const { t } = useTranslation();
  const { languageSettings } = useLanguageSettings();
  const { speechSettings } = useSpeechSettings();
  const { favoritesSettings } = useFavoritesSettings();
  const { favorites, addFavorite, deleteFavorite } = useFavoritesData();

  const [targetLang, setTargetLang] = useState<string>();
  const [translatedText, setTranslatedText] = useState('');
  const [loading, setLoading] = useState(false);
  const [usedEngine, setUsedEngine] = useState(engine);
  const [isFavorited, setIsFavorited] = useState(false);

  const textRef = useRef(originalText || text);
  const lastTargetLangRef = useRef<string | undefined>(propTargetLang);
  const hasTranslatedRef = useRef(false);
  const isLanguageSwitchingRef = useRef(false);
  const translationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAutoReadKeyRef = useRef<string>('');

  const isRenderable = useMemo(
    () =>
      typeof x === 'number' &&
      typeof y === 'number' &&
      !Number.isNaN(x) &&
      !Number.isNaN(y) &&
      typeof text === 'string' &&
      text.length > 0,
    [text, x, y]
  );

  const favoriteLangs = languageSettings.favorites;
  const sourceText = originalText || text;
  const translateFailedText = t('Translation failed, please try again');

  const { isSpeaking, setIsSpeaking, speak, stopSpeaking } = useTranslatorSpeech({
    speechConfig: {
      voice: speechSettings.voice,
      speed: speechSettings.speed,
      pitch: speechSettings.pitch,
      volume: speechSettings.volume,
    },
    translateFailedText,
    callTTSAPI,
    stopTTSAPI,
  });

  useEffect(() => {
    if (!isRenderable || isLanguageSwitchingRef.current) {
      return;
    }

    if (propTargetLang) {
      setTargetLang(propTargetLang);
      return;
    }

    if (favoriteLangs.length > 0) {
      setTargetLang(favoriteLangs[0]);
      return;
    }

    setTargetLang((current) => current || getEngineLangCode(getBrowserLang(), 'bing'));
  }, [favoriteLangs, isRenderable, propTargetLang]);

  const translate = useCallback(
    async (nextText: string, nextTargetLang: string) => {
      setLoading(true);
      hasTranslatedRef.current = true;
      isLanguageSwitchingRef.current = false;

      try {
        const result = await callTranslateAPI(nextText, 'auto', nextTargetLang, engine);
        setTranslatedText(result.result ?? '');
        setUsedEngine(result.engine || engine);
      } catch (error) {
        console.error('Translation failed:', error);
        setTranslatedText(
          isExtensionContextInvalidatedError(error)
            ? 'Extension reloaded. Refresh the page and try again.'
            : translateFailedText
        );
        setUsedEngine('');
      } finally {
        setLoading(false);
        onTranslationComplete?.();
      }
    },
    [callTranslateAPI, engine, onTranslationComplete, translateFailedText]
  );

  useEffect(() => {
    if (!isRenderable || !targetLang || shouldTranslate === false) {
      return;
    }

    if (sourceText !== textRef.current || targetLang !== lastTargetLangRef.current) {
      hasTranslatedRef.current = false;
      setTranslatedText('');
      lastAutoReadKeyRef.current = '';
      textRef.current = sourceText;
      lastTargetLangRef.current = targetLang;
    }

    if (hasTranslatedRef.current && !isLanguageSwitchingRef.current) {
      return;
    }

    if (translationTimeoutRef.current) {
      clearTimeout(translationTimeoutRef.current);
    }

    translationTimeoutRef.current = setTimeout(() => {
      translate(sourceText, targetLang);
    }, 100);

    return () => {
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current);
      }
    };
  }, [isRenderable, shouldTranslate, sourceText, targetLang, translate]);

  useEffect(() => {
    if (!isRenderable || !autoRead || !translatedText || translatedText === translateFailedText || loading) {
      return;
    }

    if (targetLang !== lastTargetLangRef.current || isLanguageSwitchingRef.current) {
      return;
    }

    const autoReadKey = `${targetLang}::${translatedText}`;
    if (lastAutoReadKeyRef.current === autoReadKey) {
      return;
    }

    lastAutoReadKeyRef.current = autoReadKey;

    speak(translatedText, targetLang).catch((error) => {
      console.error('Auto read failed:', error);
      lastAutoReadKeyRef.current = '';
      setIsSpeaking(false);
    });
  }, [
    autoRead,
    isRenderable,
    loading,
    setIsSpeaking,
    speak,
    targetLang,
    translateFailedText,
    translatedText,
  ]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  useEffect(() => {
    if (!isRenderable || !translatedText || translatedText === translateFailedText) {
      return;
    }

    setIsFavorited(
      favorites.some(
        (favorite) =>
          favorite.originalText === sourceText && favorite.translatedText === translatedText
      )
    );
  }, [favorites, isRenderable, sourceText, translateFailedText, translatedText]);

  useEffect(() => {
    return () => {
      stopSpeaking().catch(() => {});
      if (translationTimeoutRef.current) {
        clearTimeout(translationTimeoutRef.current);
      }
    };
  }, [stopSpeaking]);

  const handleLangClick = useCallback(
    async (event: React.MouseEvent, lang: string) => {
      event.preventDefault();
      event.stopPropagation();

      if (lang === targetLang) {
        return;
      }

      isLanguageSwitchingRef.current = true;

      if (isSpeaking) {
        await stopSpeaking();
      }

      hasTranslatedRef.current = false;
      setTranslatedText('');
      setLoading(true);
      setUsedEngine('');
      setTargetLang(lang);
      lastTargetLangRef.current = lang;
      setShouldTranslate?.(true);
    },
    [isSpeaking, setShouldTranslate, stopSpeaking, targetLang]
  );

  const handleSpeak = useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (isSpeaking) {
        await stopSpeaking();
        showMessage('info', t('Done'));
        return;
      }

      if (!translatedText || translatedText === translateFailedText) {
        showMessage('warning', t('Nothing to copy'));
        return;
      }

      if (!targetLang) {
        showMessage('warning', t('Select a language'));
        return;
      }

      try {
        setIsSpeaking(true);
        await speak(translatedText, targetLang);
      } catch (error) {
        console.error('Manual speech failed:', error);
        setIsSpeaking(false);
        showMessage('error', t('Speech test failed'));
      }
    },
    [isSpeaking, setIsSpeaking, showMessage, speak, stopSpeaking, t, targetLang, translateFailedText, translatedText]
  );

  const handleCopy = useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (!translatedText) {
        showMessage('warning', t('Nothing to copy'));
        return;
      }

      try {
        await navigator.clipboard.writeText(translatedText);
        showMessage('success', t('Copied'));
      } catch {
        showMessage('error', t('Translation failed, please try again'));
      }
    },
    [showMessage, t, translatedText]
  );

  const handleFavorite = useCallback(
    async (event: React.MouseEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (!translatedText || translatedText === translateFailedText || !targetLang) {
        showMessage('warning', t('Translation failed, please try again'));
        return;
      }

      try {
        if (isFavorited) {
          const favoriteItem = favorites.find(
            (item) => item.originalText === sourceText && item.translatedText === translatedText
          );

          if (favoriteItem && (await deleteFavorite(favoriteItem.id))) {
            setIsFavorited(false);
            showMessage('success', t('Favorite removed'));
          }

          return;
        }

        if (
          await addFavorite({
            originalText: sourceText,
            translatedText,
          })
        ) {
          setIsFavorited(true);
          showMessage('success', t('Saved'));
        }
      } catch (error) {
        console.error('Favorite action failed:', error);
        showMessage('error', t('Failed to remove favorite'));
      }
    },
    [
      addFavorite,
      deleteFavorite,
      favorites,
      isFavorited,
      showMessage,
      sourceText,
      t,
      targetLang,
      translateFailedText,
      translatedText,
    ]
  );

  if (!isRenderable || !targetLang) {
    return null;
  }

  return (
    <Card
      data-translator-result
      className="translator-result-card"
      style={{
        left: `${x}px`,
        top: `${y}px`,
        position: 'fixed',
        maxWidth: 'min(90vw, 480px)',
        minWidth: '320px',
        zIndex: 2147483647,
        fontSize: '14px',
        lineHeight: 1.4,
        pointerEvents: 'auto',
        padding: 0,
        transform: 'none',
        margin: 0,
      }}
      styles={{ body: { padding: '12px 16px' } }}
      variant="outlined"
      onMouseDown={(event) => event.stopPropagation()}
      onMouseUp={(event) => event.stopPropagation()}
      onClick={(event) => event.stopPropagation()}
    >
      <div className="translator-result-content">
        <div className="translator-result-text">
          {loading ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Spin
                size="small"
                indicator={<Icon name="loader" size={14} style={{ color: '#1890ff' }} />}
              />
              <span style={{ color: '#1890ff' }}>{t('Translating...')}</span>
            </div>
          ) : (
            translatedText
          )}
        </div>

        <Divider style={{ margin: '12px 0 8px 0' }} />
        <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
          {usedEngine && translatedText !== translateFailedText
            ? `${t('Translated by')} ${getEngineDisplayName(usedEngine)}`
            : null}
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
          {favoriteLangs.length > 0 && (
            <div style={{ display: 'flex', gap: 0, flexShrink: 0 }}>
              {favoriteLangs.map((lang, index) => (
                <Button
                  key={lang}
                  type={targetLang === lang ? 'primary' : 'default'}
                  size="small"
                  onClick={(event) => handleLangClick(event, lang)}
                  style={{
                    minWidth: '32px',
                    padding: '0 8px',
                    marginRight: index !== favoriteLangs.length - 1 ? '8px' : 0,
                  }}
                >
                  {getLangAbbr(lang)}
                </Button>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>
            {speechSettings.enabled && (
              <Button
                type={isSpeaking ? 'primary' : 'text'}
                icon={<Icon name="volume-2" />}
                size="small"
                onClick={handleSpeak}
                title={t('Speech settings')}
                style={{ marginRight: '4px' }}
                disabled={!translatedText || loading}
              />
            )}

            {favoritesSettings.enabled && (
              <Button
                type={isFavorited ? 'primary' : 'text'}
                icon={isFavorited ? <Icon name="star-filled" /> : <Icon name="star" />}
                size="small"
                onClick={handleFavorite}
                title={t('Favorites')}
                style={{ marginRight: '4px' }}
                disabled={!translatedText || loading}
              />
            )}

            <Button
              type="text"
              icon={<Icon name="copy" />}
              size="small"
              onClick={handleCopy}
              title={t('Copy')}
              disabled={!translatedText || loading}
            />
          </div>
        </div>
      </div>
    </Card>
  );
};

TranslatorResult.defaultProps = {
  onClose: () => {},
};

export default TranslatorResult;
