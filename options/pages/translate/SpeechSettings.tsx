import React from 'react';
import { Button, Select, Slider, Switch, message } from 'antd';
import { useTranslation } from 'react-i18next';

import { TTS_ENGINES } from '~lib/constants/engines';
import type { GlobalSettings } from '~lib/constants/types';
import { useSpeechSettings } from '~lib/settings/settings';
import { useTheme } from '~lib/theme/theme';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import SettingsPageContainer from '../../components/SettingsPageContainer';

type SpeechSettingKey = 'enabled' | 'voice' | 'speed' | 'pitch' | 'volume' | 'autoPlay';

const SpeechSettings: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const { speechSettings, updateSpeech } = useSpeechSettings();

  const handleSettingChange = async (
    key: SpeechSettingKey,
    value: GlobalSettings['speech'][SpeechSettingKey]
  ) => {
    await updateSpeech({ [key]: value });
  };

  const testSpeech = async (text = t('This is a speech test')) => {
    try {
      message.info(t('Playing test speech...'));

      if (!('speechSynthesis' in window)) {
        message.error(t('Your browser does not support speech synthesis'));
        return;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = speechSettings.speed || 1.0;
      utterance.pitch = speechSettings.pitch || 1.0;
      utterance.volume = speechSettings.volume || 1.0;

      if (speechSettings.voice && speechSettings.voice !== 'auto') {
        const voice = speechSynthesis.getVoices().find((item) => item.name === speechSettings.voice);
        if (voice) {
          utterance.voice = voice;
        }
      }

      speechSynthesis.speak(utterance);
    } catch (error) {
      console.error('Speech test failed:', error);
      message.error(t('Speech test failed'));
    }
  };

  const getAvailableVoices = () => ('speechSynthesis' in window ? speechSynthesis.getVoices() : []);

  return (
    <SettingsPageContainer
      title={t('Speech settings')}
      description={t('Configure reading and playback behavior')}
    >
      <SettingsGroup title={t('Basic settings')} first>
        <SettingsItem
          label={t('Enable speech')}
          description={t('Read translated text aloud')}
        >
          <Switch
            checked={speechSettings.enabled}
            onChange={(checked) => void handleSettingChange('enabled', checked)}
          />
        </SettingsItem>
      </SettingsGroup>

      {speechSettings.enabled && (
        <>
          <SettingsGroup title={t('Voice settings')}>
            <SettingsItem
              label={t('Speech engine')}
              description={t('Engine selection is managed in engine settings')}
            >
              <span style={{ color: isDark ? '#999' : '#666' }}>
                {t('Current engine')}: {TTS_ENGINES.find((item) => item.value === speechSettings.engine)?.label || 'Google TTS'}
              </span>
            </SettingsItem>

            <SettingsItem
              label={t('Default voice')}
              description={t('Choose the default browser voice')}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Select
                  value={speechSettings.voice || 'auto'}
                  onChange={(value) => void handleSettingChange('voice', value)}
                  style={{ width: 240 }}
                >
                  <Select.Option value="auto">{t('Auto select')}</Select.Option>
                  {getAvailableVoices().map((voice) => (
                    <Select.Option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </Select.Option>
                  ))}
                </Select>
                <Button onClick={() => void testSpeech()}>{t('Test')}</Button>
              </div>
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('Playback')}>
            <SettingsItem
              label={t('Speed')}
              description={t('Adjust the reading speed')}
            >
              <div style={{ width: 300 }}>
                <Slider
                  min={0.1}
                  max={2}
                  step={0.1}
                  value={speechSettings.speed}
                  onChange={(value) => void handleSettingChange('speed', value)}
                  marks={{ 0.5: '0.5x', 1: '1.0x', 1.5: '1.5x', 2: '2.0x' }}
                />
              </div>
            </SettingsItem>

            <SettingsItem
              label={t('Pitch')}
              description={t('Adjust the reading pitch')}
            >
              <div style={{ width: 300 }}>
                <Slider
                  min={0.1}
                  max={2}
                  step={0.1}
                  value={speechSettings.pitch}
                  onChange={(value) => void handleSettingChange('pitch', value)}
                  marks={{ 0.5: t('Low'), 1: t('Normal'), 1.5: t('High'), 2: t('Very high') }}
                />
              </div>
            </SettingsItem>

            <SettingsItem
              label={t('Volume')}
              description={t('Adjust the reading volume')}
            >
              <div style={{ width: 300 }}>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={speechSettings.volume}
                  onChange={(value) => void handleSettingChange('volume', value)}
                  marks={{ 0: '0%', 0.5: '50%', 1: '100%' }}
                />
              </div>
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('Auto play')}>
            <SettingsItem
              label={t('Auto play translated text')}
              description={t('Play speech automatically after translation completes')}
            >
              <Switch
                checked={speechSettings.autoPlay}
                onChange={(checked) => void handleSettingChange('autoPlay', checked)}
              />
            </SettingsItem>
          </SettingsGroup>
        </>
      )}
    </SettingsPageContainer>
  );
};

export default SpeechSettings;
