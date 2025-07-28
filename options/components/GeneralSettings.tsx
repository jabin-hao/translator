import React, { useState, useEffect } from 'react';
import { Select, Card, Radio, Divider, Button, message, Upload, Typography, Space, Modal } from 'antd';
import { Storage } from '@plasmohq/storage';
import { LANGUAGES, UI_LANGUAGES } from '../../lib/languages';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {POPUP_SETTINGS_KEY, PLUGIN_THEME_KEY, CONTENT_THEME_KEY, TRANSLATION_CACHE_CONFIG_KEY, UI_LANG_KEY, SHORTCUT_SETTINGS_KEY, PAGE_LANG_KEY, TEXT_LANG_KEY, FAVORITE_LANGS_KEY, NEVER_LANGS_KEY, ALWAYS_LANGS_KEY, TRANSLATE_SETTINGS_KEY, SITE_TRANSLATE_SETTINGS_KEY, DICT_KEY } from '../../lib/constants';

const { Title, Paragraph } = Typography;

const storage = new Storage();

async function getInitSettings() {
  try {
    const settings = await storage.get(POPUP_SETTINGS_KEY);
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
  const { t, i18n } = useTranslation();
  // 删除 targetLang 相关
  const [contentTheme, setContentTheme] = useState('auto');
  // 将 uiLang 的 useState 初始值设为 undefined
  const [uiLang, setUiLang] = useState<string | undefined>(undefined);
  const [clearConfigModalVisible, setClearConfigModalVisible] = useState(false);

  useEffect(() => {
    const initData = async () => {
      const [settings, savedContentTheme] = await Promise.all([
        getInitSettings(),
        getInitContentTheme()
      ]);
      setContentTheme(savedContentTheme);
    };
    initData();
  }, []);

  useEffect(() => {
  }, []); // 依赖项也去掉autoTranslate

  useEffect(() => {
    const saveContentTheme = async () => {
      await storage.set(CONTENT_THEME_KEY, contentTheme);
    };
    saveContentTheme();
  }, [contentTheme]);

  // 初始化和storage监听
  const validLangCodes = ['default', ...LANGUAGES.map(l => l.code)];

  useEffect(() => {
    const getUiLang = async () => {
      let val = await storage.get(UI_LANG_KEY);
      if (!val) {
        // 自动检测浏览器语言，使用正确的映射函数
        const browserLang = navigator.language;
        
        // 使用 mapUiLangToI18nKey 函数来正确映射语言代码
        const { mapUiLangToI18nKey } = await import('../../lib/languages');
        val = mapUiLangToI18nKey(browserLang);
        
        // 保存检测到的语言到storage
        await storage.set(UI_LANG_KEY, val);
      }
      setUiLang(val);
      // 只有当当前i18n语言与检测到的语言不同时才调用changeLanguage
      if (i18n.language !== val) {
        await i18n.changeLanguage(val);
      }
    };
    getUiLang();
  }, [i18n.language]);

  const saveUiLang = async (val) => {
    setUiLang(val);
    await storage.set(UI_LANG_KEY, val);
    // 只有当语言真正改变时才调用changeLanguage
    if (i18n.language !== val) {
      await i18n.changeLanguage(val);
    }
    message.success(t('界面语言已保存'));
  };

  // 主题切换时同步 localStorage，保证多标签页同步
  const handleThemeChange = async (e) => {
    setThemeMode(e.target.value);
    await storage.set(PLUGIN_THEME_KEY, e.target.value);
  };

  return (
    <Card 
      title={t('通用设置')} 
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      bodyStyle={{ padding: 0, flex: 1, display: 'flex', flexDirection: 'column' }}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {/* 界面语言设置 */}
        <div style={{ marginBottom: 24 }}>
          <b>{t('设置页面语言')}：</b>
          <Select
            key={i18n.language}
            value={uiLang}
            options={UI_LANGUAGES.map(l => ({
              value: l.code, // 必须是 zh, zh-TW, en 等
              label: t('lang.' + l.code)
            }))}
            onChange={saveUiLang}
            style={{ width: 200, marginLeft: 16 }}
          />
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {t('控制插件界面显示的语言')}
          </div>
        </div>
        <Divider />
        <div style={{ marginBottom: 8 }}>
          <b>{t('设置页面主题')}：</b>
          <Radio.Group value={themeMode} onChange={handleThemeChange} style={{ marginLeft: 16 }}>
            <Radio.Button value="auto">{t('自动')}</Radio.Button>
            <Radio.Button value="light">{t('日间')}</Radio.Button>
            <Radio.Button value="dark">{t('夜间')}</Radio.Button>
          </Radio.Group>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {t('控制设置页面的主题样式')}
        </div>
        </div>
        <Divider />
        <div style={{ marginBottom: 8 }}>
          <b>{t('悬浮窗组件主题')}：</b>
          <Radio.Group value={contentTheme} onChange={e => setContentTheme(e.target.value)} style={{ marginLeft: 16 }}>
            <Radio.Button value="auto">{t('自动')}</Radio.Button>
            <Radio.Button value="light">{t('日间')}</Radio.Button>
            <Radio.Button value="dark">{t('夜间')}</Radio.Button>
          </Radio.Group>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
            {t('控制翻译悬浮窗、输入翻译器等组件的主题样式')}<br />
          </div>
        </div>
        <Divider />
        {/* 导入导出配置功能优化 */}
        <div style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <Title level={5} style={{ margin: 0, fontWeight: 'bold', fontSize: 13, flex: 'none' }}>{t('配置导入/导出')}：</Title>
            <Space style={{ marginLeft: 8 }}>
              <Button
                icon={<DownloadOutlined />}
                onClick={async () => {
                  const keys = [
                    UI_LANG_KEY,
                    PAGE_LANG_KEY,
                    TEXT_LANG_KEY,
                    FAVORITE_LANGS_KEY,
                    NEVER_LANGS_KEY,
                    ALWAYS_LANGS_KEY,
                    TRANSLATE_SETTINGS_KEY,
                    SITE_TRANSLATE_SETTINGS_KEY,
                    POPUP_SETTINGS_KEY,
                    PLUGIN_THEME_KEY,
                    CONTENT_THEME_KEY,
                    SHORTCUT_SETTINGS_KEY,
                    TRANSLATION_CACHE_CONFIG_KEY,
                  ];
                  const data = {};
                  for (const key of keys) {
                    data[key] = await storage.get(key);
                  }
                  // 直接导出 dict 字段
                  data['dict'] = await storage.get('dict') || {};
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
                {t('导出配置')}
              </Button>
              <Upload
                accept="application/json"
                showUploadList={false}
                beforeUpload={async (file) => {
                  try {
                    const text = await file.text();
                    const json = JSON.parse(text);
                    const keys = [
                      UI_LANG_KEY,
                      PAGE_LANG_KEY,
                      TEXT_LANG_KEY,
                      FAVORITE_LANGS_KEY,
                      NEVER_LANGS_KEY,
                      ALWAYS_LANGS_KEY,
                      TRANSLATE_SETTINGS_KEY,
                      POPUP_SETTINGS_KEY,
                      PLUGIN_THEME_KEY,
                      CONTENT_THEME_KEY,
                      SHORTCUT_SETTINGS_KEY,
                      TRANSLATION_CACHE_CONFIG_KEY,
                    ];
                    for (const key of keys) {
                      if (json[key] !== undefined) {
                        await storage.set(key, json[key]);
                      }
                    }
                    // 导入所有自定义词库
                    if (json.customDicts) {
                      for (const host in json.customDicts) {
                        await storage.set(`site_custom_dict_${host}`, json.customDicts[host]);
                      }
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
                  {t('导入配置')}
                </Button>
              </Upload>
            </Space>
          </div>
          <Paragraph type="secondary" style={{ marginBottom: 16, color: '#888', fontSize: 13 }}>
            {t('可将插件所有设置导出为 JSON 文件，或从 JSON 文件导入并完全覆盖当前配置。导入后页面会自动刷新。')}
          </Paragraph>
        </div>
        <Divider />
        {/* 清空配置功能 */}
        <div style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <Title level={5} style={{ margin: 0, fontWeight: 'bold', fontSize: 13, flex: 'none' }}>{t('重置配置')}：</Title>
            <Button
              danger
              style={{ marginLeft: 8 }}
              onClick={() => setClearConfigModalVisible(true)}
            >
              {t('清空配置')}
            </Button>
          </div>
          <Paragraph type="secondary" style={{ marginBottom: 16, color: '#888', fontSize: 13 }}>
            {t('清空所有配置并重置到默认状态。此操作不可恢复，请谨慎使用。')}
          </Paragraph>
        </div>
      </div>
      <div style={{padding: '0 24px 16px 24px', color: '#888', fontSize: 13}}>
        {t('所有设置均会自动保存，无需手动操作。')}
      </div>
      <Modal
        title={t('清空配置')}
        open={clearConfigModalVisible}
        onOk={async () => {
          try {
            const keys = [
              UI_LANG_KEY,
              DICT_KEY,
              PAGE_LANG_KEY,
              TEXT_LANG_KEY,
              FAVORITE_LANGS_KEY,
              NEVER_LANGS_KEY,
              ALWAYS_LANGS_KEY,
              TRANSLATE_SETTINGS_KEY,
              SITE_TRANSLATE_SETTINGS_KEY,
              POPUP_SETTINGS_KEY,
              PLUGIN_THEME_KEY,
              CONTENT_THEME_KEY,
              SHORTCUT_SETTINGS_KEY,
              TRANSLATION_CACHE_CONFIG_KEY,
            ];
            // 清空所有配置
            for (const key of keys) {
              await storage.remove(key);
            }
            // 重置缓存配置为 7*24小时、2000条
            await storage.set(TRANSLATION_CACHE_CONFIG_KEY, { maxAge: 7*24*60*60*1000, maxSize: 2000 });
            message.success(t('配置已清空，页面即将刷新'));
            setTimeout(() => window.location.reload(), 1000);
          } catch (err) {
            message.error(t('清空配置失败，请重试'));
          }
          setClearConfigModalVisible(false);
        }}
        onCancel={() => setClearConfigModalVisible(false)}
        okText={t('确定')}
        cancelText={t('取消')}
      >
        <p>{t('确定要清空所有配置吗？此操作不可恢复，将重置所有设置到默认状态。')}</p>
      </Modal>
    </Card>
  );
};

export default GeneralSettings; 