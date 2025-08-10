import React, { useCallback, useEffect, useState } from 'react';
import { Select, Radio, Button, message, Upload, Typography, Modal } from 'antd';
import { useStorage, storageApi } from '~/lib/utils/storage';
import { UI_LANGUAGES } from '~/lib/constants/languages';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import {POPUP_SETTINGS_KEY, THEME_MODE_KEY, TRANSLATION_CACHE_CONFIG_KEY, UI_LANG_KEY, SHORTCUT_SETTINGS_KEY, PAGE_LANG_KEY, TEXT_LANG_KEY, FAVORITE_LANGS_KEY, TRANSLATE_SETTINGS_KEY, SITE_TRANSLATE_SETTINGS_KEY, DICT_KEY } from '~lib/constants/settings';
import SettingsPageContainer from '../components/SettingsPageContainer';
import SettingsGroup from '../components/SettingsGroup';
import SettingsItem from '../components/SettingsItem';

const { Title, Paragraph } = Typography;

// 新增 props 类型
interface GeneralSettingsProps {
  themeMode: string;
  setThemeMode: (val: string) => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ themeMode, setThemeMode }) => {
  const { t, i18n } = useTranslation();
  
  // 使用 useStorage hook 替换手动的 storage 操作
  // 移除单独的 contentTheme，统一使用 themeMode
  const [uiLang, setUiLang] = useStorage(UI_LANG_KEY, undefined);
  
  const [clearConfigModalVisible, setClearConfigModalVisible] = useState(false);

  // 监听UI语言变化并自动设置默认值
  useEffect(() => {
    const initUiLang = async () => {
      if (!uiLang) {
        // 自动检测浏览器语言
        const browserLang = navigator.language;
        const { mapUiLangToI18nKey } = await import('../../lib/constants/languages');
        const detectedLang = mapUiLangToI18nKey(browserLang);
        setUiLang(detectedLang);
      } else {
        // 只有当当前i18n语言与设置的语言不同时才调用changeLanguage
        if (i18n.language !== uiLang) {
          await i18n.changeLanguage(uiLang);
        }
      }
    };
    initUiLang();
  }, [uiLang, i18n, setUiLang]);

  const saveUiLang = async (val: string) => {
    setUiLang(val);
    // 只有当语言真正改变时才调用changeLanguage
    if (i18n.language !== val) {
      await i18n.changeLanguage(val);
    }
    message.success(t('界面语言已保存'));
  };

  // 主题切换时同步 localStorage，保证多标签页同步
  const handleThemeChange = async (e: import('antd').RadioChangeEvent) => {
    setThemeMode(e.target.value);
    await storageApi.set(THEME_MODE_KEY, e.target.value);
  };

  const handleExportConfig = useCallback(async () => {
    const keys = [
      UI_LANG_KEY,
      PAGE_LANG_KEY,
      TEXT_LANG_KEY,
      FAVORITE_LANGS_KEY,
      TRANSLATE_SETTINGS_KEY,
      SITE_TRANSLATE_SETTINGS_KEY,
      POPUP_SETTINGS_KEY,
      THEME_MODE_KEY,
      SHORTCUT_SETTINGS_KEY,
      TRANSLATION_CACHE_CONFIG_KEY,
    ];
    const data = {};
    for (const key of keys) {
      data[key] = await storageApi.get(key);
    }
    // 直接导出 dict 字段
    data['dict'] = await storageApi.get('dict') || {};
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
  }, []);

  const handleImportConfig = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const keys = [
        UI_LANG_KEY,
        PAGE_LANG_KEY,
        TEXT_LANG_KEY,
        FAVORITE_LANGS_KEY,
        TRANSLATE_SETTINGS_KEY,
        POPUP_SETTINGS_KEY,
        THEME_MODE_KEY,
        SHORTCUT_SETTINGS_KEY,
        TRANSLATION_CACHE_CONFIG_KEY,
      ];
      for (const key of keys) {
        if (json[key] !== undefined) {
          await storageApi.set(key, json[key]);
        }
      }
      // 导入所有自定义词库
      if (json.customDicts) {
        for (const host in json.customDicts) {
          await storageApi.set(`site_custom_dict_${host}`, json.customDicts[host]);
        }
      }
      message.success('配置已导入（已完全覆盖）');
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      message.error('导入失败，文件格式错误或内容无效');
    }
    return false; // 阻止自动上传
  }, []);

  const handleClearConfig = useCallback(async () => {
    try {
      const keys = [
        UI_LANG_KEY,
        DICT_KEY,
        PAGE_LANG_KEY,
        TEXT_LANG_KEY,
        FAVORITE_LANGS_KEY,
        TRANSLATE_SETTINGS_KEY,
        SITE_TRANSLATE_SETTINGS_KEY,
        POPUP_SETTINGS_KEY,
        THEME_MODE_KEY,
        SHORTCUT_SETTINGS_KEY,
        TRANSLATION_CACHE_CONFIG_KEY,
      ];
      // 清空所有配置
      for (const key of keys) {
        await storageApi.set(key, undefined);
      }
      // 重置缓存配置为 7*24小时、2000条
      await storageApi.set(TRANSLATION_CACHE_CONFIG_KEY, { maxAge: 7*24*60*60*1000, maxSize: 2000 });
      message.success(t('配置已清空，页面即将刷新'));
      setTimeout(() => window.location.reload(), 1000);
    } catch (err) {
      message.error(t('清空配置失败，请重试'));
    }
    setClearConfigModalVisible(false);
  }, [setClearConfigModalVisible]);

  return (
    <SettingsPageContainer 
      title={t('通用设置')}
      description={t('配置插件的基本设置和外观')}
    >
      <SettingsGroup title={t('界面设置')} first>
        <SettingsItem 
          label={t('设置页面语言')}
          description={t('控制插件界面显示的语言')}
        >
          <Select
            key={i18n.language}
            value={uiLang}
            options={UI_LANGUAGES.map(l => ({
              value: l.code,
              label: t('lang.' + l.code)
            }))}
            onChange={saveUiLang}
            style={{ width: 200 }}
            size="middle"
          />
        </SettingsItem>

        <SettingsItem 
          label={t('设置页面主题')}
          description={t('控制设置页面的主题样式')}
        >
          <Radio.Group value={themeMode} onChange={handleThemeChange}>
            <Radio.Button value="auto">{t('自动')}</Radio.Button>
            <Radio.Button value="light">{t('日间')}</Radio.Button>
            <Radio.Button value="dark">{t('夜间')}</Radio.Button>
          </Radio.Group>
        </SettingsItem>

      </SettingsGroup>

      <SettingsGroup title={t('数据管理')}>
        <SettingsItem 
          label={t('导出配置')}
          description={t('将所有设置导出为文件，方便备份和迁移')}
        >
          <Button 
            icon={<DownloadOutlined />} 
            onClick={handleExportConfig}
          >
            {t('导出配置文件')}
          </Button>
        </SettingsItem>

        <SettingsItem 
          label={t('导入配置')}
          description={t('从配置文件恢复设置')}
        >
          <Upload
            accept=".json"
            showUploadList={false}
            beforeUpload={handleImportConfig}
          >
            <Button icon={<UploadOutlined />}>
              {t('选择配置文件')}
            </Button>
          </Upload>
        </SettingsItem>

        <SettingsItem 
          label={t('重置配置')}
          description={t('清除所有设置并恢复默认值')}
        >
          <Button 
            danger 
            onClick={() => setClearConfigModalVisible(true)}
          >
            {t('重置所有设置')}
          </Button>
        </SettingsItem>
      </SettingsGroup>

      {/* 重置确认弹窗 */}
      <Modal
        title={t('确认重置')}
        open={clearConfigModalVisible}
        onOk={handleClearConfig}
        onCancel={() => setClearConfigModalVisible(false)}
        okText={t('确认重置')}
        cancelText={t('取消')}
        okButtonProps={{ danger: true }}
      >
        <div>
          <p>{t('此操作将清除所有设置并恢复默认值，包括：')}</p>
          <ul style={{ paddingLeft: 20 }}>
            <li>{t('翻译引擎设置')}</li>
            <li>{t('快捷键设置')}</li>
            <li>{t('语言偏好')}</li>
            <li>{t('网站自动翻译列表')}</li>
            <li>{t('主题设置')}</li>
            <li>{t('其他所有配置')}</li>
          </ul>
          <p style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
            {t('此操作不可恢复，请确认后继续。')}
          </p>
        </div>
      </Modal>
    </SettingsPageContainer>
  );
};

export default GeneralSettings;
