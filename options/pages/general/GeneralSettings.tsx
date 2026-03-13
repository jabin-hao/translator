import React, { useCallback, useEffect, useState } from 'react';
import { Button, ConfigProvider, message, Modal, Select, Segmented, Upload } from 'antd';
import { useTranslation } from 'react-i18next';

import Icon from '~lib/components/Icon';
import { getLocalizedLangLabel, mapUiLangToI18nKey, UI_LANGUAGES } from '~/lib/constants/languages';
import { GLOBAL_SETTINGS_KEY, useGlobalSettings, useThemeSettings } from '~lib/settings/settings';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import SettingsPageContainer from '../../components/SettingsPageContainer';

interface GeneralSettingsProps {
  themeMode: 'light' | 'dark' | 'auto';
  setThemeMode: (val: 'light' | 'dark' | 'auto') => void;
}

const GeneralSettings: React.FC<GeneralSettingsProps> = ({ themeMode, setThemeMode }) => {
  const { t, i18n } = useTranslation();
  const { settings, updateSettings, resetSettings } = useGlobalSettings();
  const { themeSettings, setThemeMode: saveThemeMode, setUiLanguage } = useThemeSettings();
  const [clearConfigModalVisible, setClearConfigModalVisible] = useState(false);
  const uiLang = themeSettings.uiLanguage;
  const uiLanguageOptions = UI_LANGUAGES.map((language) => ({
    value: language.code,
    label: getLocalizedLangLabel(language.code, i18n.language)
  }));
  const themeOptions = [
    { label: t('Light'), value: 'light' as const },
    { label: t('Dark'), value: 'dark' as const },
    { label: t('Auto'), value: 'auto' as const }
  ];

  useEffect(() => {
    const initUiLang = async () => {
      if (!uiLang) {
        const browserLang = navigator.language;
        const detectedLang = browserLang === 'en' || browserLang.startsWith('en-') ? 'en' : 'zh-CN';
        await setUiLanguage(detectedLang);
        return;
      }

      const nextLanguage = mapUiLangToI18nKey(uiLang);
      if (i18n.language !== nextLanguage) {
        await i18n.changeLanguage(nextLanguage);
      }
    };

    void initUiLang();
  }, [i18n, setUiLanguage, uiLang]);

  const saveUiLang = async (value: string) => {
    await setUiLanguage(value);
    const nextLanguage = mapUiLangToI18nKey(value);
    if (i18n.language !== nextLanguage) {
      await i18n.changeLanguage(nextLanguage);
    }
    message.success(t('Interface language saved'));
  };

  const handleThemeChange = async (value: 'light' | 'dark' | 'auto') => {
    setThemeMode(value);
    await saveThemeMode(value);
  };

  const handleExportConfig = useCallback(async () => {
    const data = { [GLOBAL_SETTINGS_KEY]: settings };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'translator-config.json';
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
    message.success(t('Settings exported'));
  }, [settings, t]);

  const handleImportConfig = useCallback(
    async (file: File) => {
      try {
        const text = await file.text();
        const json = JSON.parse(text);

        if (!json[GLOBAL_SETTINGS_KEY]) {
          message.error(t('Invalid config file'));
          return false;
        }

        await updateSettings(json[GLOBAL_SETTINGS_KEY]);
        message.success(t('Settings imported, page will refresh'));
        setTimeout(() => window.location.reload(), 1000);
      } catch (error) {
        console.error('Failed to import config:', error);
        message.error(t('Invalid config file'));
      }
      return false;
    },
    [t, updateSettings]
  );

  const handleClearConfig = useCallback(async () => {
    try {
      await resetSettings();
      message.success(t('Settings reset, page will refresh'));
      setTimeout(() => window.location.reload(), 1000);
    } catch (error) {
      console.error('Failed to reset settings:', error);
      message.error(t('Failed to reset settings'));
    }
  }, [resetSettings, t]);

  return (
    <SettingsPageContainer
      title={t('General settings')}
      description={t('Configure the extension appearance and basic preferences')}
    >
      <SettingsGroup title={t('Interface settings')} first>
        <SettingsItem
          label={t('Interface language')}
          description={t('Controls the language used by the extension UI')}
        >
          <Select
            key={i18n.language}
            value={uiLang || 'zh-CN'}
            options={uiLanguageOptions}
            onChange={saveUiLang}
            style={{ width: 200 }}
            size="middle"
          />
        </SettingsItem>

        <SettingsItem
          label={t('Theme')}
          description={t('Controls the appearance of the settings UI')}
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
                  trackBg: 'var(--ant-color-fill-quaternary)'
                }
              }
            }}
          >
            <Segmented
              value={themeMode}
              onChange={(value) => {
                void handleThemeChange(value as 'light' | 'dark' | 'auto');
              }}
              options={themeOptions}
            />
          </ConfigProvider>
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t('Data management')}>
        <SettingsItem
          label={t('Export settings')}
          description={t('Export all settings to a file for backup or migration')}
        >
          <Button icon={<Icon name="download" size={16} />} onClick={handleExportConfig}>
            {t('Export settings file')}
          </Button>
        </SettingsItem>

        <SettingsItem
          label={t('Import settings')}
          description={t('Restore settings from a config file')}
        >
          <Upload accept=".json" showUploadList={false} beforeUpload={handleImportConfig}>
            <Button icon={<Icon name="upload" size={16} />}>{t('Choose config file')}</Button>
          </Upload>
        </SettingsItem>

        <SettingsItem
          label={t('Reset settings')}
          description={t('Clear all settings and restore defaults')}
        >
          <Button danger onClick={() => setClearConfigModalVisible(true)}>
            {t('Reset all settings')}
          </Button>
        </SettingsItem>
      </SettingsGroup>

      <Modal
        title={t('Confirm reset')}
        open={clearConfigModalVisible}
        onOk={handleClearConfig}
        onCancel={() => setClearConfigModalVisible(false)}
        okText={t('Reset settings')}
        cancelText={t('Cancel')}
        okButtonProps={{ danger: true }}
      >
        <div>
          <p>{t('This will remove all saved settings and restore defaults, including:')}</p>
          <ul style={{ paddingLeft: 20 }}>
            <li>{t('Translation engine settings')}</li>
            <li>{t('Shortcut settings')}</li>
            <li>{t('Language preferences')}</li>
            <li>{t('Site auto-translate rules')}</li>
            <li>{t('Theme settings')}</li>
            <li>{t('All other saved configuration')}</li>
          </ul>
          <p style={{ color: '#ff4d4f', fontWeight: 'bold' }}>
            {t('This action cannot be undone.')}
          </p>
        </div>
      </Modal>
    </SettingsPageContainer>
  );
};

export default GeneralSettings;
