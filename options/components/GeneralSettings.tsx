import React, { useState, useEffect } from 'react';
import { Select, Switch, Card, Radio, Divider } from 'antd';
import { Storage } from '@plasmohq/storage';

const storage = new Storage();

const LANG_OPTIONS = [
  { label: '中文', value: 'zh' },
  { label: '英文', value: 'en' },
  { label: '日文', value: 'ja' },
  { label: '韩文', value: 'ko' },
  { label: '法语', value: 'fr' },
  { label: '德语', value: 'de' },
  { label: '西班牙语', value: 'es' },
  { label: '俄语', value: 'ru' },
  { label: '葡萄牙语', value: 'pt' },
];

const LOCAL_KEY = 'popup_settings';
const THEME_KEY = 'plugin_theme_mode';
const CONTENT_THEME_KEY = 'content_theme_mode';

async function getInitSettings() {
  try {
    const settings = await storage.get(LOCAL_KEY);
    if (settings) return settings;
  } catch {}
  return { targetLang: 'zh', autoTranslate: true };
}

async function getInitTheme() {
  try {
    const theme = await storage.get(THEME_KEY);
    if (theme) return theme;
  } catch {}
  return 'auto';
}

async function getInitContentTheme() {
  try {
    const theme = await storage.get(CONTENT_THEME_KEY);
    if (theme) return theme;
  } catch {}
  return 'auto';
}

const GeneralSettings: React.FC = () => {
  const [targetLang, setTargetLang] = useState('zh');
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [theme, setTheme] = useState('auto');
  const [contentTheme, setContentTheme] = useState('auto');

  useEffect(() => {
    const initData = async () => {
      const [settings, savedTheme, savedContentTheme] = await Promise.all([
        getInitSettings(),
        getInitTheme(),
        getInitContentTheme()
      ]);
      if (typeof settings === 'object' && settings !== null && 'targetLang' in settings && 'autoTranslate' in settings) {
        setTargetLang(settings.targetLang);
        setAutoTranslate(settings.autoTranslate);
      }
      setTheme(savedTheme);
      setContentTheme(savedContentTheme);
    };
    initData();
  }, []);

  useEffect(() => {
    const saveSettings = async () => {
      await storage.set(
        LOCAL_KEY,
        { targetLang, autoTranslate }
      );
    };
    saveSettings();
  }, [targetLang, autoTranslate]);

  useEffect(() => {
    const saveTheme = async () => {
      await storage.set(THEME_KEY, theme);
    };
    saveTheme();
  }, [theme]);

  useEffect(() => {
    const saveContentTheme = async () => {
      await storage.set(CONTENT_THEME_KEY, contentTheme);
    };
    saveContentTheme();
  }, [contentTheme]);

  return (
    <Card 
      title="通用设置" 
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        <div style={{ marginBottom: 16 }}>
          <span style={{ marginRight: 8 }}>目标语言：</span>
          <Select
            value={targetLang}
            options={LANG_OPTIONS}
            onChange={setTargetLang}
            style={{ width: 120 }}
          />
        </div>
        <div style={{ marginBottom: 16 }}>
          <span style={{ marginRight: 8 }}>自动翻译：</span>
          <Switch checked={autoTranslate} onChange={setAutoTranslate} />
        </div>
        <Divider />
        <div style={{ marginBottom: 8 }}>
          <b>设置页面主题：</b>
          <Radio.Group value={theme} onChange={e => setTheme(e.target.value)} style={{ marginLeft: 16 }}>
            <Radio.Button value="auto">自动</Radio.Button>
            <Radio.Button value="light">日间</Radio.Button>
            <Radio.Button value="dark">夜间</Radio.Button>
          </Radio.Group>
        </div>
        <div style={{ fontSize: 13, marginBottom: 16, opacity: 0.7 }}>
          控制设置页面的主题样式
        </div>
        <Divider />
        <div style={{ marginBottom: 8 }}>
          <b>悬浮窗组件主题：</b>
          <Radio.Group value={contentTheme} onChange={e => setContentTheme(e.target.value)} style={{ marginLeft: 16 }}>
            <Radio.Button value="auto">自动</Radio.Button>
            <Radio.Button value="light">日间</Radio.Button>
            <Radio.Button value="dark">夜间</Radio.Button>
          </Radio.Group>
        </div>
        <div style={{ fontSize: 13, opacity: 0.7 }}>
          控制翻译悬浮窗、输入翻译器等组件的主题样式<br />
          自动：跟随系统/浏览器主题
        </div>
      </div>
    </Card>
  );
};

export default GeneralSettings; 