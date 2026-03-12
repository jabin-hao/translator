import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, Card, Divider, Input, Select, Space, Typography } from 'antd';
import { useTranslation } from 'react-i18next';

import Icon from '~lib/components/Icon';
import { TRANSLATE_ENGINES } from '~lib/constants/engines';
import { getBrowserLang, getLocalizedLangLabel, LANGUAGES } from '~lib/constants/languages';
import '../styles/index.css';

const { TextArea } = Input;
const { Title } = Typography;

interface InputTranslatorProps {
  onClose: () => void;
  showMessage: (type: 'success' | 'error' | 'warning' | 'info', content: string) => void;
  engine: string;
  defaultTargetLang: string;
  callTranslateAPI: (
    text: string,
    from: string,
    to: string,
    engine: string
  ) => Promise<{ result: string; engine: string }>;
}

const InputTranslator: React.FC<InputTranslatorProps> = ({
  onClose,
  showMessage,
  engine: defaultEngine,
  defaultTargetLang,
  callTranslateAPI,
}) => {
  const { t, i18n } = useTranslation();
  const [inputText, setInputText] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [sourceLang, setSourceLang] = useState('auto');
  const [targetLang, setTargetLang] = useState(defaultTargetLang || getBrowserLang());
  const [isTranslating, setIsTranslating] = useState(false);
  const [engine, setEngine] = useState(defaultEngine);
  const [usedEngine, setUsedEngine] = useState(defaultEngine);

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

  const sourceLanguages = useMemo(
    () => [
      { label: t('Auto detect'), code: 'auto' },
      ...LANGUAGES.map((lang) => ({
        ...lang,
        label: getLocalizedLangLabel(lang.code, i18n.language)
      }))
    ],
    [i18n.language, t]
  );

  const targetLanguages = useMemo(
    () =>
      LANGUAGES.map((lang) => ({
        ...lang,
        label: getLocalizedLangLabel(lang.code, i18n.language)
      })),
    [i18n.language]
  );

  const handleTranslate = useCallback(async () => {
    if (!inputText.trim()) {
      showMessage('warning', t('Please enter text to translate'));
      return;
    }

    setIsTranslating(true);

    try {
      const { result, engine: actualEngine } = await callTranslateAPI(
        inputText,
        sourceLang,
        targetLang,
        engine
      );
      setTranslatedText(result);
      setUsedEngine(actualEngine || engine);
      showMessage('success', t('Translation complete'));
    } catch (error) {
      setTranslatedText(t('Translation failed, please try again'));
      setUsedEngine(engine);
      showMessage(
        'error',
        typeof error === 'string' ? error : t('Translation failed, please try again')
      );
    } finally {
      setIsTranslating(false);
    }
  }, [callTranslateAPI, engine, inputText, showMessage, sourceLang, t, targetLang]);

  const handleSwapLanguages = useCallback(() => {
    if (sourceLang === 'auto') {
      return;
    }

    setSourceLang(targetLang);
    setTargetLang(sourceLang);
    showMessage('success', t('Languages swapped'));
  }, [showMessage, sourceLang, t, targetLang]);

  const handleClear = useCallback(() => {
    setInputText('');
    setTranslatedText('');
    setUsedEngine(defaultEngine);
    showMessage('success', t('Content cleared'));
  }, [defaultEngine, showMessage, t]);

  return (
    <Card
      className="input-translator-card"
      style={{
        position: 'fixed',
        bottom: '20px',
        left: '50%',
        transform: 'translateX(-50%)',
        width: '600px',
        maxWidth: '90vw',
        zIndex: 2147483647,
        borderRadius: '12px',
      }}
      styles={{ body: { padding: '8px 8px' } }}
      title={
        <Space className="custom-card-header" align="center">
          <Icon name="translate" size={24} style={{ color: '#2386e1' }} />
          <Title level={4} style={{ margin: 0, lineHeight: '36px', height: 36 }}>
            {t('Translation tool')}
          </Title>
        </Space>
      }
      extra={
        <Button type="text" icon={<Icon name="close" size={16} />} onClick={onClose} size="small" />
      }
    >
      <div className="input-translator-content" style={{ width: '100%' }}>
        <Space size={4} className="input-translator-language-selector">
          <Select
            value={sourceLang}
            onChange={setSourceLang}
            style={{ width: 120 }}
            placeholder={t('Source language')}
            size="small"
            className="custom-select"
            getPopupContainer={(triggerNode) => triggerNode.parentNode as HTMLElement}
          >
            {sourceLanguages.map((lang) => (
              <Select.Option key={lang.code} value={lang.code}>
                {lang.label}
              </Select.Option>
            ))}
          </Select>

          <Button
            type="default"
            icon={<Icon name="swap" size={16} />}
            onClick={handleSwapLanguages}
            disabled={sourceLang === 'auto'}
            size="small"
          >
            {t('Swap')}
          </Button>

          <Select
            value={targetLang}
            onChange={setTargetLang}
            style={{ width: 120 }}
            placeholder={t('Target language')}
            size="small"
            className="custom-select"
            getPopupContainer={(triggerNode) => triggerNode.parentNode as HTMLElement}
          >
            {targetLanguages.map((lang) => (
              <Select.Option key={lang.code} value={lang.code}>
                {lang.label}
              </Select.Option>
            ))}
          </Select>

          <Select
            value={engine}
            onChange={setEngine}
            style={{ width: 140 }}
            placeholder={t('Engine')}
            size="small"
            className="custom-select"
            getPopupContainer={(triggerNode) => triggerNode.parentNode as HTMLElement}
          >
            {TRANSLATE_ENGINES.map((item) => (
              <Select.Option key={item.value} value={item.value} disabled={item.disabled}>
                {item.icon && (
                  <Icon name={item.icon} size={16} style={{ verticalAlign: 'middle', marginRight: 6 }} />
                )}
                {item.label}
              </Select.Option>
            ))}
          </Select>
        </Space>

        <Divider style={{ margin: '8px 0' }} />

        <div
          className="input-translator-translation-area"
          style={{ width: '100%', display: 'flex', gap: '16px' }}
        >
          <div className="input-translator-text-area" style={{ flex: 1, minWidth: 0, width: '100%' }}>
            <TextArea
              value={inputText}
              onChange={(event) => setInputText(event.target.value)}
              placeholder={t('Enter text to translate...')}
              rows={6}
              showCount
              maxLength={1000}
            />
          </div>

          <div className="input-translator-result-area" style={{ flex: 1, minWidth: 0, width: '100%' }}>
            <TextArea
              value={translatedText}
              placeholder={t('Translation result...')}
              rows={6}
              readOnly
              className="input-translator-result-textarea"
            />
            {translatedText && usedEngine && (
              <div style={{ fontSize: 12, color: '#888', marginTop: 4 }}>
                {t('Translated by')} {t(`engine.${usedEngine}`, { defaultValue: usedEngine })}
              </div>
            )}
          </div>
        </div>

        <div className="input-translator-actions" style={{ marginTop: '40px', width: '100%' }}>
          <Space
            className="input-translator-actions-space"
            style={{ justifyContent: 'center', width: '100%' }}
          >
            {!translatedText.trim() ? (
              <Button
                type="primary"
                onClick={handleTranslate}
                loading={isTranslating}
                disabled={!inputText.trim()}
              >
                {isTranslating ? t('Translating...') : t('Translate')}
              </Button>
            ) : (
              <Button
                type="primary"
                onClick={handleClear}
                disabled={!inputText.trim() && !translatedText.trim()}
              >
                {t('Clear')}
              </Button>
            )}
            <Button
              onClick={() => {
                if (translatedText.trim()) {
                  navigator.clipboard.writeText(translatedText);
                  showMessage('success', t('Copied'));
                } else {
                  showMessage('warning', t('Nothing to copy'));
                }
              }}
              disabled={!translatedText.trim()}
            >
              {t('Copy')}
            </Button>
          </Space>
        </div>
      </div>
    </Card>
  );
};

export default InputTranslator;
