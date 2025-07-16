import React, { useState, useEffect } from 'react';
import { Select, Switch, Card, Radio, Divider, Button, message, Upload, Typography } from 'antd';
import { Storage } from '@plasmohq/storage';
import { LANGUAGES } from '../../lib/languages';
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
          <Radio.Group value={themeMode} onChange={handleThemeChange} style={{ marginLeft: 16 }} buttonStyle='solid'>
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
          <Radio.Group value={contentTheme} onChange={e => setContentTheme(e.target.value)} style={{ marginLeft: 16 }} buttonStyle='solid'>
            <Radio.Button value="auto">自动</Radio.Button>
            <Radio.Button value="light">日间</Radio.Button>
            <Radio.Button value="dark">夜间</Radio.Button>
          </Radio.Group>
        </div>
        <div style={{ fontSize: 13, opacity: 0.7 }}>
          控制翻译悬浮窗、输入翻译器等组件的主题样式<br />
          自动：跟随系统/浏览器主题
        </div>
        <Divider />
        {/* 导入导出配置功能优化 */}
        <div style={{ marginTop: 24 }}>
          <Title level={5}>配置导入/导出</Title>
          <Paragraph type="secondary" style={{ marginBottom: 12 }}>
            可将插件所有设置导出为 JSON 文件，或从 JSON 文件导入并完全覆盖当前配置。导入后页面会自动刷新。
          </Paragraph>
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
            <Button icon={<UploadOutlined />} style={{ marginLeft: 16 }}>
              导入配置
            </Button>
          </Upload>
        </div>
      </div>
    </Card>
  );
};

export default GeneralSettings; 