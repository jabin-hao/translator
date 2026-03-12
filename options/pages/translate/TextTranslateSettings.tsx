import React from 'react';
import { Switch } from 'antd';
import { useTranslation } from 'react-i18next';

import { useTextTranslateSettings } from '~lib/settings/settings';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import SettingsPageContainer from '../../components/SettingsPageContainer';

type ToggleSettingKey = 'selectTranslate' | 'pressKeyTranslate' | 'quickTranslate';

const TextTranslateSettings: React.FC = () => {
  const { t } = useTranslation();
  const { textTranslateSettings, setTriggerMode, toggleEnabled } = useTextTranslateSettings();

  const handleSwitchChange = async (key: ToggleSettingKey, checked: boolean) => {
    await setTriggerMode(key, checked);
  };

  return (
    <SettingsPageContainer
      title={t('Text translation settings')}
      description={t('Configure translation behavior for selected text')}
    >
      <SettingsGroup title={t('Basic settings')} first>
        <SettingsItem
          label={t('Enable text translation')}
          description={t('Translate selected text on the page')}
        >
          <Switch checked={textTranslateSettings.enabled} onChange={toggleEnabled} />
        </SettingsItem>
      </SettingsGroup>

      {textTranslateSettings.enabled && (
        <SettingsGroup title={t('Trigger settings')}>
          <SettingsItem
            label={t('Auto translate selected text')}
            description={t('Translate immediately after selecting text')}
          >
            <Switch
              checked={textTranslateSettings.selectTranslate}
              onChange={(checked) => void handleSwitchChange('selectTranslate', checked)}
            />
          </SettingsItem>

          <SettingsItem
            label={t('Translate with hotkey')}
            description={t('Translate selected text only after pressing the shortcut')}
          >
            <Switch
              checked={textTranslateSettings.pressKeyTranslate}
              onChange={(checked) => void handleSwitchChange('pressKeyTranslate', checked)}
            />
          </SettingsItem>

          <SettingsItem
            label={t('Quick translate')}
            description={t('Show translation quickly after hover or selection')}
          >
            <Switch
              checked={textTranslateSettings.quickTranslate}
              onChange={(checked) => void handleSwitchChange('quickTranslate', checked)}
            />
          </SettingsItem>
        </SettingsGroup>
      )}
    </SettingsPageContainer>
  );
};

export default TextTranslateSettings;
