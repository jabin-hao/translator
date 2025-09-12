import React from 'react';
import { Switch, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import {
  useTextTranslateSettings,
} from '~lib/settings/settings';
import SettingsPageContainer from '../../components/SettingsPageContainer';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';

const { Option } = Select;

const TextTranslateSettings: React.FC = () => {
  const { t } = useTranslation();

  // 使用新的全局配置系统
  const { textTranslateSettings, updateTextTranslate, toggleEnabled } = useTextTranslateSettings();

  const handleSwitchChange = async (key: string, checked: boolean) => {
    await updateTextTranslate({ [key]: checked } as any);
  };

  return (
    <SettingsPageContainer title={t('划词翻译设置')} description={t('配置划词翻译的相关设置')}>
      {/* 划词翻译总开关 */}
      <SettingsGroup title={t('基础设置')} first>
        <SettingsItem
          label={t('启用划词翻译')}
          description={t('开启后，选中文本即可进行翻译')}
        >
          <Switch
            checked={textTranslateSettings.enabled}
            onChange={toggleEnabled}
          />
        </SettingsItem>
      </SettingsGroup>

      {/* 只有开启划词翻译时才显示其他设置 */}
      {textTranslateSettings.enabled && (
        <>
          <SettingsGroup title={t('触发设置')}>
            <SettingsItem
              label={t('选词自动翻译')}
              description={t('选择文本后自动翻译，关闭则显示翻译图标')}
            >
              <Switch
                checked={textTranslateSettings.selectTranslate}
                onChange={(checked) => handleSwitchChange('selectTranslate', checked)}
              />
            </SettingsItem>

            <SettingsItem
              label={t('快捷键翻译')}
              description={t('选中文本后按快捷键进行翻译')}
            >
              <Switch
                checked={textTranslateSettings.pressKeyTranslate}
                onChange={(checked) => handleSwitchChange('pressKeyTranslate', checked)}
              />
            </SettingsItem>

            <SettingsItem
              label={t('快速翻译')}
              description={t('鼠标悬停自动显示翻译')}
            >
              <Switch
                checked={textTranslateSettings.quickTranslate}
                onChange={(checked) => handleSwitchChange('quickTranslate', checked)}
              />
            </SettingsItem>
          </SettingsGroup>
        </>
      )}
    </SettingsPageContainer>
  );
};

export default TextTranslateSettings;
