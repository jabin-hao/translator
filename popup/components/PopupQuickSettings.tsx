import React, { useEffect, useState } from 'react';
import { Card, Select, Switch, Divider, message, Button } from 'antd';
import { Storage } from '@plasmohq/storage';
import { TRANSLATE_ENGINES } from '../../lib/engines';
import { useTranslation } from 'react-i18next';
import { ReloadOutlined, TranslationOutlined } from '@ant-design/icons';

// 1. 引入 storage 工具
import {
  getDictConfig,
  addAlwaysSite,
  removeAlwaysSite,
  addNeverSite,
  removeNeverSite
} from '../../lib/siteTranslateSettings';
import { TRANSLATE_SETTINGS_KEY, CACHE_KEY, SITE_LANG_KEY, TEXT_LANG_KEY } from '../../lib/constants';

const storage = new Storage();

const PopupQuickSettings: React.FC = () => {
  const { t } = useTranslation();
  const [engine, setEngine] = useState('google');
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [autoRead, setAutoRead] = useState(false);
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [pageTargetLang, setPageTargetLang] = useState('zh-CN');
  const [textTargetLang, setTextTargetLang] = useState('zh-CN');
  const [isPageTranslated, setIsPageTranslated] = useState(false); // 新增：页面翻译状态

  const [siteKey, setSiteKey] = useState('');
  const [siteSettings, setSiteSettings] = useState({ always: false, never: false });

  useEffect(() => {
    storage.get(TRANSLATE_SETTINGS_KEY).then((data) => {
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

  // 获取当前 tab 的 host+path
  useEffect(() => {
    chrome.tabs && chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const url = tabs[0]?.url;
      if (url) {
        try {
          const u = new URL(url);
          const key = u.pathname === '/' ? u.hostname : u.hostname + u.pathname;
          setSiteKey(key);
          const dict = await getDictConfig();
          setSiteSettings({
            always: dict.siteAlwaysList.includes(key),
            never: dict.siteNeverList.includes(key)
          });
        } catch {}
      }
    });
  }, []);

  // 检查当前页面是否已翻译
  useEffect(() => {
    chrome.tabs && chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;
      chrome.tabs.sendMessage(tabId, { type: 'CHECK_PAGE_TRANSLATED' }, (res) => {
        setIsPageTranslated(res?.translated === true);
      });
    });
  }, []);

  const handleEngineChange = async (val: string) => {
    setEngine(val);
    const prev = (await storage.get(TRANSLATE_SETTINGS_KEY)) || {};
    await storage.set(TRANSLATE_SETTINGS_KEY, { ...prev, engine: val });
    message.success(t('翻译引擎已保存'));
  };
  const handleAutoTranslateChange = async (checked: boolean) => {
    setAutoTranslate(checked);
    const prev = (await storage.get(TRANSLATE_SETTINGS_KEY)) || {};
    await storage.set(TRANSLATE_SETTINGS_KEY, { ...prev, autoTranslate: checked });
    message.success(t('自动翻译设置已保存'));
  };
  const handleAutoReadChange = async (checked: boolean) => {
    setAutoRead(checked);
    const prev = (await storage.get(TRANSLATE_SETTINGS_KEY)) || {};
    await storage.set(TRANSLATE_SETTINGS_KEY, { ...prev, autoRead: checked });
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

  const handleAlways = async () => {
    if (!siteKey) return;
    if (siteSettings.always) {
      await removeAlwaysSite(siteKey);
    } else {
      await addAlwaysSite(siteKey);
    }
    const dict = await getDictConfig();
    setSiteSettings({
      always: dict.siteAlwaysList.includes(siteKey),
      never: dict.siteNeverList.includes(siteKey)
    });
    message.success(siteSettings.always ? t('已移除总是翻译该网站') : t('已添加到总是翻译该网站'));
  };
  const handleNever = async () => {
    if (!siteKey) return;
    if (siteSettings.never) {
      await removeNeverSite(siteKey);
    } else {
      await addNeverSite(siteKey);
    }
    const dict = await getDictConfig();
    setSiteSettings({
      always: dict.siteAlwaysList.includes(siteKey),
      never: dict.siteNeverList.includes(siteKey)
    });
    message.success(siteSettings.never ? t('已移除永不翻译该网站') : t('已添加到永不翻译该网站'));
  };

  // 切换整页翻译/还原
  const handleToggleFullPageTranslate = async () => {
    chrome.tabs && chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
      const tabId = tabs[0]?.id;
      if (!tabId) return;
      if (!isPageTranslated) {
        // 执行整页翻译
        chrome.tabs.sendMessage(tabId, {
          type: 'FULL_PAGE_TRANSLATE',
          lang: pageTargetLang,
          engine
        }, (res) => {
          if (res?.success) {
            setIsPageTranslated(true);
            message.success(t('已翻译当前网站'));
          } else {
            message.error(t('翻译失败'));
          }
        });
      } else {
        // 还原原网页
        chrome.tabs.sendMessage(tabId, { type: 'RESTORE_ORIGINAL_PAGE' }, (res) => {
          if (res?.success) {
            setIsPageTranslated(false);
            message.success(t('已还原原网页'));
          } else {
            message.error(t('还原失败'));
          }
        });
      }
    });
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
      <Divider style={{ margin: '8px 0' }} />
      <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
        <Button
          type={siteSettings.always ? 'primary' : 'default'}
          block
          onClick={handleAlways}
          style={{ borderRadius: 6 }}
        >
          {siteSettings.always ? t('已设为总是翻译该网站') : t('总是翻译该网站')}
        </Button>
        <Button
          type={siteSettings.never ? 'primary' : 'default'}
          danger={siteSettings.never}
          block
          onClick={handleNever}
          style={{ borderRadius: 6 }}
        >
          {siteSettings.never ? t('已设为永不翻译该网站') : t('永不翻译该网站')}
        </Button>
      </div>
      <Divider style={{ margin: '8px 0' }} />
      <div style={{ marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8 }}>
        <Button
          type={isPageTranslated ? 'default' : 'primary'}
          icon={isPageTranslated ? <ReloadOutlined /> : <TranslationOutlined />}
          onClick={handleToggleFullPageTranslate}
          block
          style={{ borderRadius: 6 }}
        >
          {isPageTranslated ? t('显示原网页') : t('翻译当前网站')}
        </Button>
      </div>
    </Card>
  );
};

export default PopupQuickSettings; 