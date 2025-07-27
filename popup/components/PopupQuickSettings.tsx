import React, { useEffect, useState } from 'react';
import { Card, Select, Switch, Divider, message } from 'antd';
import { Storage } from '@plasmohq/storage';
import { TRANSLATE_ENGINES } from '../../lib/engines';
import { useTranslation } from 'react-i18next';

const storage = new Storage();

const LOCAL_KEY = 'translate_settings';
const CACHE_KEY = 'translation_cache_enabled';
const SITE_LANG_KEY = 'pageTargetLang';
const TEXT_LANG_KEY = 'textTargetLang';

const PopupQuickSettings: React.FC = () => {
  const { t } = useTranslation();
  const [engine, setEngine] = useState('google');
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [autoRead, setAutoRead] = useState(false);
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [pageTargetLang, setPageTargetLang] = useState('zh-CN');
  const [textTargetLang, setTextTargetLang] = useState('zh-CN');

  useEffect(() => {
    storage.get(LOCAL_KEY).then((data) => {
      if (data && typeof data === 'object') {
        setEngine((data as any)?.engine || 'google');
        setAutoTranslate((data as any)?.autoTranslate ?? true);
        setAutoRead((data as any)?.autoRead ?? false);
      }
    });
    storage.get(CACHE_KEY).then((enabled) => {
      if (enabled !== null && enabled !== undefined) setCacheEnabled(Boolean(enabled));
    });
    storage.get(SITE_LANG_KEY).then((val) => {
      if (val) setPageTargetLang(val);
    });
    storage.get(TEXT_LANG_KEY).then((val) => {
      if (val) setTextTargetLang(val);
    });
  }, []);

  const handleEngineChange = async (val: string) => {
    setEngine(val);
    const prev = (await storage.get(LOCAL_KEY)) || {};
    await storage.set(LOCAL_KEY, { ...prev, engine: val });
    message.success(t('翻译引擎已保存'));
  };
  const handleAutoTranslateChange = async (checked: boolean) => {
    setAutoTranslate(checked);
    const prev = (await storage.get(LOCAL_KEY)) || {};
    await storage.set(LOCAL_KEY, { ...prev, autoTranslate: checked });
    message.success(t('自动翻译设置已保存'));
  };
  const handleAutoReadChange = async (checked: boolean) => {
    setAutoRead(checked);
    const prev = (await storage.get(LOCAL_KEY)) || {};
    await storage.set(LOCAL_KEY, { ...prev, autoRead: checked });
    message.success(t('自动朗读设置已保存'));
  };
  const handleCacheToggle = (checked: boolean) => {
    setCacheEnabled(checked);
    storage.set(CACHE_KEY, checked);
    message.success(checked ? t('已启用翻译缓存') : t('已禁用翻译缓存'));
  };
  const handlePageLangChange = (val: string) => {
    setPageTargetLang(val);
    storage.set(SITE_LANG_KEY, val);
    message.success(t('网页翻译目标语言已保存'));
  };
  const handleTextLangChange = (val: string) => {
    setTextTargetLang(val);
    storage.set(TEXT_LANG_KEY, val);
    message.success(t('划词翻译目标语言已保存'));
  };

  // 语言选项（可根据实际支持的语言调整）
  const langOptions = [
    { value: 'zh-CN', label: t('中文（简体）') },
    { value: 'en', label: t('英语') },
    { value: 'ja', label: t('日语') },
    { value: 'ko', label: t('韩语') },
    { value: 'fr', label: t('法语') },
    { value: 'de', label: t('德语') },
    { value: 'es', label: t('西班牙语') },
    { value: 'ru', label: t('俄语') },
    { value: 'pt', label: t('葡萄牙语') },
  ];

  return (
    <Card
      title={t('快速设置')}
      size="small"
      bodyStyle={{ padding: 16, width: '100%', height: '100%' }}
      style={{
        width: '100%',
        height: '100%',
        minWidth: 320,
        minHeight: 360,
        boxSizing: 'border-box',
        borderRadius: 12,
        border: 'none',
        boxShadow: 'none',
        margin: 0,
        padding: 0,
      }}
      headStyle={{ border: 'none', padding: '12px 16px 0 16px', borderRadius: 12 }}
    >
      <div style={{ marginBottom: 16 }}>
        <b>{t('翻译引擎')}：</b>
        <Select
          value={engine}
          onChange={handleEngineChange}
          style={{ width: 180, marginLeft: 8 }}
          size="small"
        >
          {TRANSLATE_ENGINES.map(e => (
            <Select.Option key={e.value} value={e.value} disabled={e.disabled}>
              {e.label}
            </Select.Option>
          ))}
        </Select>
      </div>
      <Divider style={{ margin: '8px 0' }} />
      <div style={{ marginBottom: 12 }}>
        <b>{t('自动翻译')}：</b>
        <Switch checked={autoTranslate} onChange={handleAutoTranslateChange} style={{ marginLeft: 8 }} size="small" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <b>{t('自动朗读翻译结果')}：</b>
        <Switch checked={autoRead} onChange={handleAutoReadChange} style={{ marginLeft: 8 }} size="small" />
      </div>
      <div style={{ marginBottom: 12 }}>
        <b>{t('是否启用缓存')}：</b>
        <Switch checked={cacheEnabled} onChange={handleCacheToggle} style={{ marginLeft: 8 }} size="small" />
      </div>
      <Divider style={{ margin: '8px 0' }} />
      <div style={{ marginBottom: 12 }}>
        <b>{t('网页翻译目标语言')}：</b>
        <Select
          value={pageTargetLang}
          onChange={handlePageLangChange}
          style={{ width: 180, marginLeft: 8 }}
          size="small"
        >
          {langOptions.map(opt => (
            <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
          ))}
        </Select>
      </div>
      <div style={{ marginBottom: 0 }}>
        <b>{t('划词翻译目标语言')}：</b>
        <Select
          value={textTargetLang}
          onChange={handleTextLangChange}
          style={{ width: 180, marginLeft: 8 }}
          size="small"
        >
          {langOptions.map(opt => (
            <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
          ))}
        </Select>
      </div>
    </Card>
  );
};

export default PopupQuickSettings; 