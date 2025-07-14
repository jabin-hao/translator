import React, { useState, useEffect } from 'react';
import { Select, Switch, Card, Radio, Divider } from 'antd';
import { Storage } from '@plasmohq/storage';
import { LANGUAGES } from '../../lib/languages';

const storage = new Storage();

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

async function getInitContentTheme() {
  try {
    const theme = await storage.get(CONTENT_THEME_KEY);
    if (theme) return theme;
  } catch {}
  return 'auto';
}

// 新增 props 类型
interface GeneralSettingsProps {
  themeMode: string;
  setThemeMode: (val: string) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ themeMode, setThemeMode }) => {
  // 删除 targetLang 相关
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [contentTheme, setContentTheme] = useState('auto');

  useEffect(() => {
    const initData = async () => {
      const [settings, savedContentTheme] = await Promise.all([
        getInitSettings(),
        getInitContentTheme()
      ]);
      if (typeof settings === 'object' && settings !== null && 'autoTranslate' in settings) {
        setAutoTranslate(settings.autoTranslate);
      }
      setContentTheme(savedContentTheme);
    };
    initData();
  }, []);

  useEffect(() => {
    const saveSettings = async () => {
      await storage.set(
        LOCAL_KEY,
        { autoTranslate }
      );
    };
    saveSettings();
  }, [autoTranslate]);

  useEffect(() => {
    const saveContentTheme = async () => {
      await storage.set(CONTENT_THEME_KEY, contentTheme);
    };
    saveContentTheme();
  }, [contentTheme]);

  // 主题切换时同步 localStorage，保证多标签页同步
  const handleThemeChange = (e) => {
    setThemeMode(e.target.value);
    window.localStorage.setItem('plugin_theme_mode', e.target.value);
  };

  return (
    <Card 
      title="通用设置" 
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {/* 删除目标语言选择器 */}
        <div style={{ marginBottom: 16 }}>
          <span style={{ marginRight: 8 }}>自动翻译：</span>
          <Switch checked={autoTranslate} onChange={setAutoTranslate} />
        </div>
        <Divider />
        <div style={{ marginBottom: 8 }}>
          <b>设置页面主题：</b>
          <Radio.Group value={themeMode} onChange={handleThemeChange} style={{ marginLeft: 16 }}>
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