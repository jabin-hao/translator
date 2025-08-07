import React, { useState } from 'react';
import { Card, Radio, Divider } from 'antd';
import { Storage } from '@plasmohq/storage';

const storage = new Storage();
const THEME_KEY = 'plugin_theme_mode';
const getInitTheme = async () => {
  try {
    const raw = await storage.get(THEME_KEY);
    if (raw) return raw;
  } catch {}
  return 'auto';
};

const ThemeSettings: React.FC = () => {
  const [theme, setTheme] = useState(getInitTheme());

  const handleChange = async (e :any) => {
    setTheme(e.target.value);
    await storage.set(THEME_KEY, e.target.value);
  };

  return (
    <Card title="主题设置" style={{ width: 400 }}>
      <div style={{ marginBottom: 16 }}>
        <b>主题模式：</b>
        <Radio.Group value={theme} onChange={handleChange} style={{ marginLeft: 16 }}>
          <Radio.Button value="auto">自动</Radio.Button>
          <Radio.Button value="light">日间</Radio.Button>
          <Radio.Button value="dark">夜间</Radio.Button>
        </Radio.Group>
      </div>
      <Divider />
      <div style={{ color: '#888', fontSize: 13 }}>
        自动：跟随系统/浏览器主题<br />
        日间/夜间：强制切换插件所有界面为对应主题
      </div>
    </Card>
  );
};

export default ThemeSettings; 