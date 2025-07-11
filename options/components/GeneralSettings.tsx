import React, { useState, useEffect } from 'react';
import { Select, Switch, Card, Radio, Divider } from 'antd';

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

function getInitSettings() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { targetLang: 'zh', autoTranslate: true };
}

function getInitTheme() {
  try {
    const raw = localStorage.getItem(THEME_KEY);
    if (raw) return raw;
  } catch {}
  return 'auto';
}

const GeneralSettings: React.FC = () => {
  const [targetLang, setTargetLang] = useState('zh');
  const [autoTranslate, setAutoTranslate] = useState(true);
  const [theme, setTheme] = useState(getInitTheme());

  useEffect(() => {
    const init = getInitSettings();
    setTargetLang(init.targetLang);
    setAutoTranslate(init.autoTranslate);
  }, []);

  useEffect(() => {
    localStorage.setItem(
      LOCAL_KEY,
      JSON.stringify({ targetLang, autoTranslate })
    );
  }, [targetLang, autoTranslate]);

  useEffect(() => {
    localStorage.setItem(THEME_KEY, theme);
  }, [theme]);

  return (
    <Card title="通用设置" size="small" style={{ width: 400 }}>
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
        <b>主题模式：</b>
        <Radio.Group value={theme} onChange={e => setTheme(e.target.value)} style={{ marginLeft: 16 }}>
          <Radio.Button value="auto">自动</Radio.Button>
          <Radio.Button value="light">日间</Radio.Button>
          <Radio.Button value="dark">夜间</Radio.Button>
        </Radio.Group>
      </div>
      <div style={{ color: '#888', fontSize: 13 }}>
        自动：跟随系统/浏览器主题<br />
        日间/夜间：强制切换插件所有界面为对应主题
      </div>
    </Card>
  );
};

export default GeneralSettings; 