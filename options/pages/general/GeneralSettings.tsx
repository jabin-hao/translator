import React, { useCallback, useEffect } from 'react';
import { useImmer } from 'use-immer';
import { Select, Button, message, Upload, Modal, ConfigProvider, Segmented } from 'antd';
import { UI_LANGUAGES } from '~/lib/constants/languages';
import { UploadOutlined, DownloadOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import { useGlobalSettings, useThemeSettings } from '~lib/settings/settingsHooks';
import { GLOBAL_SETTINGS_KEY } from '~lib/settings/settings';
import SettingsPageContainer from '../../components/SettingsPageContainer';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import { produce } from 'immer';
import {THEME_OPTIONS} from '~lib/settings/settings'

// 新增 props 类型
interface GeneralSettingsProps {
  themeMode: "light" | "dark" | "auto";
  setThemeMode: (val: "light" | "dark" | "auto") => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ themeMode, setThemeMode }) => {
  const { t, i18n } = useTranslation();
  
  // 使用新的全局配置系统
  const { settings, updateSettings, resetSettings } = useGlobalSettings();
  const { themeSettings, updateTheme } = useThemeSettings();
  
  // 从全局设置中提取值
  const uiLang = themeSettings.uiLanguage;
  
  const [clearConfigModalVisible, setClearConfigModalVisible] = useImmer(false);

  // 监听UI语言变化并自动设置默认值
  useEffect(() => {
    const initUiLang = async () => {
      if (!uiLang) {
        // 自动检测浏览器语言
        const browserLang = navigator.language;
        const { mapUiLangToI18nKey } = await import('../../../lib/constants/languages');
        const detectedLang = mapUiLangToI18nKey(browserLang);
        await updateTheme({ uiLanguage: detectedLang });
      } else {
        // 只有当当前i18n语言与设置的语言不同时才调用changeLanguage
        if (i18n.language !== uiLang) {
          await i18n.changeLanguage(uiLang);
        }
      }
    };
    initUiLang();
  }, [uiLang, i18n, updateTheme]);

  const saveUiLang = async (val: string) => {
    await updateTheme({ uiLanguage: val });
    // 只有当语言真正改变时才调用changeLanguage
    if (i18n.language !== val) {
      await i18n.changeLanguage(val);
    }
    message.success(t('界面语言已保存'));
  };

  // 主题切换时同步 localStorage，保证多标签页同步
  const handleThemeChange = async (value: "light" | "dark" | "auto") => {
      setThemeMode(value); // Directly set the value as immer is unnecessary here
      updateTheme({ mode: value });
  };

  const handleExportConfig = useCallback(async () => {
    // 导出全局设置
    const data = { [GLOBAL_SETTINGS_KEY]: settings };
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
  }, [settings]);

  const handleImportConfig = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const json = JSON.parse(text);

        if (json[GLOBAL_SETTINGS_KEY]) {
          const updatedSettings = produce(settings, (draft) => {
            Object.assign(draft, json[GLOBAL_SETTINGS_KEY]);
          });
          await updateSettings(updatedSettings);
          message.success('配置已导入，页面将刷新以应用新设置');
          setTimeout(() => window.location.reload(), 1000);
        } else {
          message.error('无效的配置文件格式');
        }
      } catch (error) {
        message.error('配置文件格式错误');
      }
      return false; // 阻止自动上传
    },
    [settings, updateSettings]
  );

  const handleClearConfig = useCallback(async () => {
    try {
      // 重置为默认设置
      await resetSettings();
      message.success('配置已清除，页面将刷新');
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      message.error('清除配置失败');
    }
  }, [resetSettings]);

  return (
    <SettingsPageContainer 
      title={t('通用设置')} 
      description={t('配置插件的基本设置和外观')}>
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
          <ConfigProvider
                theme={{
                  components: {
                    Segmented: {
                      itemSelectedBg: 'transparent',
                      itemSelectedColor: 'var(--ant-color-primary)',
                      itemColor: 'var(--ant-color-text)',
                      itemHoverBg: 'var(--ant-color-primary-bg)',
                      itemHoverColor: 'var(--ant-color-primary)',
                      trackBg: 'var(--ant-color-fill-quaternary)',
                    },
                  },
                }}
              >
                <Segmented
                  value={themeMode}
                  onChange={handleThemeChange}
                  options={[...THEME_OPTIONS]}
                />
              </ConfigProvider>
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
