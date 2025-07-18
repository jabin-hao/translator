import React, { useState, useEffect } from 'react';
import { Select, Switch, Card, Radio, Divider, Button, message, Upload, Typography, Space } from 'antd';
import { Storage } from '@plasmohq/storage';
import { LANGUAGES, UI_LANGUAGES } from '../../lib/languages';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';

const { Title, Paragraph } = Typography;

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
  const [contentTheme, setContentTheme] = useState('auto');
  const [uiLang, setUiLang] = useState('default');

  useEffect(() => {
    const initData = async () => {
      const [settings, savedContentTheme] = await Promise.all([
        getInitSettings(),
        getInitContentTheme()
      ]);
      // if (typeof settings === 'object' && settings !== null && 'autoTranslate' in settings) {
      //   setAutoTranslate(settings.autoTranslate);
      // }
      setContentTheme(savedContentTheme);
    };
    initData();
  }, []);

  useEffect(() => {
    // const saveSettings = async () => {
    //   await storage.set(
    //     LOCAL_KEY,
    //     { autoTranslate }
    //   );
    // };
    // saveSettings();
  }, []); // 依赖项也去掉autoTranslate

  useEffect(() => {
    const saveContentTheme = async () => {
      await storage.set(CONTENT_THEME_KEY, contentTheme);
    };
    saveContentTheme();
  }, [contentTheme]);

  useEffect(() => {
    const getUiLang = async () => {
      try {
        const val = await storage.get('uiLang');
        if (val) setUiLang(val);
      } catch {}
    };
    getUiLang();
  }, []);
  const saveUiLang = async (val) => {
    setUiLang(val);
    await storage.set('uiLang', val);
    message.success('界面语言已保存');
  };

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
        {/* 界面语言设置 */}
        <div style={{ marginBottom: 24 }}>
          <b>设置页面语言：</b>
          <Select
            value={uiLang}
            options={UI_LANGUAGES}
            onChange={saveUiLang}
            style={{ width: 200, marginLeft: 16 }}
          />
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            控制插件界面显示的语言
          </div>
        </div>
        <Divider />
        <div style={{ marginBottom: 8 }}>
          <b>设置页面主题：</b>
          <Radio.Group value={themeMode} onChange={handleThemeChange} style={{ marginLeft: 16 }} buttonStyle='solid'>
            <Radio.Button value="auto">自动</Radio.Button>
            <Radio.Button value="light">日间</Radio.Button>
            <Radio.Button value="dark">夜间</Radio.Button>
          </Radio.Group>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            控制设置页面的主题样式
          </div>
        </div>
        <Divider />
        <div style={{ marginBottom: 8 }}>
          <b>悬浮窗组件主题：</b>
          <Radio.Group value={contentTheme} onChange={e => setContentTheme(e.target.value)} style={{ marginLeft: 16 }} buttonStyle='solid'>
            <Radio.Button value="auto">自动</Radio.Button>
            <Radio.Button value="light">日间</Radio.Button>
            <Radio.Button value="dark">夜间</Radio.Button>
          </Radio.Group>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            控制翻译悬浮窗、输入翻译器等组件的主题样式<br />
            自动：跟随系统/浏览器主题
          </div>
        </div>
        <Divider />
        {/* 导入导出配置功能优化 */}
        <div style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <Title level={5} style={{ margin: 0, fontWeight: 'bold', fontSize: 13, flex: 'none' }}>配置导入/导出：</Title>
            <Space style={{ marginLeft: 8 }}>
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={async () => {
                  const keys = [
                    'uiLang',
                    'pageTargetLang',
                    'textTargetLang',
                    'favoriteLangs',
                    'neverLangs',
                    'alwaysLangs',
                    'translate_settings',
                    'popup_settings',
                    'plugin_theme_mode',
                    'content_theme_mode',
                  ];
                  const data = {};
                  for (const key of keys) {
                    data[key] = await storage.get(key);
                  }
                  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = 'translator-config.json';
                  document.body.appendChild(a);
                  a.click();
                  document.body.removeChild(a);
                  URL.revokeObjectURL(url);
                  message.success('配置已导出');
                }}
              >
                导出配置
              </Button>
              <Upload
                accept="application/json"
                showUploadList={false}
                beforeUpload={async (file) => {
                  try {
                    const text = await file.text();
                    const json = JSON.parse(text);
                    const keys = [
                      'uiLang',
                      'pageTargetLang',
                      'textTargetLang',
                      'favoriteLangs',
                      'neverLangs',
                      'alwaysLangs',
                      'translate_settings',
                      'popup_settings',
                      'plugin_theme_mode',
                      'content_theme_mode',
                    ];
                    for (const key of keys) {
                      await storage.set(key, json[key]);
                    }
                    message.success('配置已导入（已完全覆盖）');
                    setTimeout(() => window.location.reload(), 1000);
                  } catch (err) {
                    message.error('导入失败，文件格式错误或内容无效');
                  }
                  return false; // 阻止自动上传
                }}
              >
                <Button icon={<UploadOutlined />}>
                  导入配置
                </Button>
              </Upload>
            </Space>
          </div>
          <Paragraph type="secondary" style={{ marginBottom: 16, color: '#888', fontSize: 13 }}>
            可将插件所有设置导出为 JSON 文件，或从 JSON 文件导入并完全覆盖当前配置。导入后页面会自动刷新。
          </Paragraph>
        </div>
      </div>
      <div style={{padding: '0 24px 16px 24px', color: '#888', fontSize: 13}}>
        所有设置均会自动保存，无需手动操作。
      </div>
    </Card>
  );
};

export default GeneralSettings; 