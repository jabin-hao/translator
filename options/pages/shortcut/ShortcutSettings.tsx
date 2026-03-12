import React, { useEffect, useMemo, useState } from 'react';
import { Button, Input, Switch, Typography, message } from 'antd';
import { useTranslation } from 'react-i18next';

import { useShortcutSettings } from '~lib/settings/settings';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import SettingsPageContainer from '../../components/SettingsPageContainer';

const { Title, Paragraph, Text } = Typography;

type ShortcutKey = 'toggleTranslate' | 'textTranslate' | 'inputTranslate' | 'pageTranslate';

const normalizeShortcut = (event: KeyboardEvent) => {
  const modifiers: string[] = [];

  if (event.ctrlKey) modifiers.push('Ctrl');
  if (event.altKey) modifiers.push('Alt');
  if (event.shiftKey) modifiers.push('Shift');
  if (event.metaKey) modifiers.push('Meta');

  let key = event.key;
  if (key === ' ') key = 'Space';
  if (key.length === 1) key = key.toUpperCase();
  if (key === 'Escape') key = 'Esc';

  if (['Control', 'Alt', 'Shift', 'Meta'].includes(key)) {
    return '';
  }

  return [...modifiers, key].join('+');
};

const ShortcutSettings: React.FC = () => {
  const { t } = useTranslation();
  const { shortcutSettings, toggleEnabled, updateShortcut } = useShortcutSettings();
  const [recordingType, setRecordingType] = useState<ShortcutKey | null>(null);
  const [recordedShortcut, setRecordedShortcut] = useState('');

  useEffect(() => {
    if (!recordingType) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      const shortcut = normalizeShortcut(event);
      if (!shortcut) {
        return;
      }

      setRecordedShortcut(shortcut);
    };

    document.addEventListener('keydown', handleKeyDown, true);
    return () => document.removeEventListener('keydown', handleKeyDown, true);
  }, [recordingType]);

  const stopRecording = async () => {
    if (recordingType && recordedShortcut) {
      await updateShortcut(recordingType, recordedShortcut);
      message.success(t('Shortcut saved'));
    }

    setRecordingType(null);
    setRecordedShortcut('');
  };

  const startRecording = (type: ShortcutKey) => {
    setRecordingType(type);
    setRecordedShortcut('');
  };

  const clearShortcut = async (type: ShortcutKey) => {
    await updateShortcut(type, '');
    message.success(t('Shortcut cleared'));
  };

  const shortcutItems = useMemo(
    () => [
      {
        key: 'toggleTranslate' as const,
        label: t('Toggle translation features'),
        description: t('Quickly enable or disable selection translation')
      },
      {
        key: 'textTranslate' as const,
        label: t('Translate selected text'),
        description: t('Translate the currently selected text')
      },
      {
        key: 'inputTranslate' as const,
        label: t('Translate input content'),
        description: t('Translate content from the focused input field')
      },
      {
        key: 'pageTranslate' as const,
        label: t('Translate full page'),
        description: t('Translate the current page')
      }
    ],
    [t]
  );

  return (
    <SettingsPageContainer
      title={t('Shortcut settings')}
      description={t('Configure global shortcuts for translator actions')}
    >
      <SettingsGroup title={t('Basic settings')} first>
        <SettingsItem
          label={t('Enable shortcuts')}
          description={t('Use keyboard shortcuts to access translation features quickly')}
        >
          <Switch checked={shortcutSettings.enabled} onChange={toggleEnabled} />
        </SettingsItem>
      </SettingsGroup>

      {shortcutSettings.enabled && (
        <SettingsGroup title={t('Shortcut bindings')}>
          {shortcutItems.map((item) => (
            <SettingsItem key={item.key} label={item.label} description={item.description}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Input
                  value={
                    recordingType === item.key && recordedShortcut
                      ? recordedShortcut
                      : shortcutSettings[item.key] || ''
                  }
                  placeholder={t('Click set shortcut, then press a key combination')}
                  readOnly
                  style={{ width: 220 }}
                />
                <Button
                  onClick={() =>
                    recordingType === item.key ? void stopRecording() : startRecording(item.key)
                  }
                  type={recordingType === item.key ? 'primary' : 'default'}
                >
                  {recordingType === item.key ? t('Save shortcut') : t('Set shortcut')}
                </Button>
                {shortcutSettings[item.key] && (
                  <Button onClick={() => void clearShortcut(item.key)} danger>
                    {t('Clear')}
                  </Button>
                )}
              </div>
            </SettingsItem>
          ))}

          {recordingType && (
            <div
              style={{
                padding: 16,
                background: '#f5f5f5',
                borderRadius: 6,
                marginTop: 16,
                textAlign: 'center'
              }}
            >
              <Title level={5}>{t('Recording shortcut')}</Title>
              <Paragraph>{t('Press the key combination you want to assign')}</Paragraph>
              {recordedShortcut && <Text strong>{`${t('Current')}: ${recordedShortcut}`}</Text>}
            </div>
          )}
        </SettingsGroup>
      )}
    </SettingsPageContainer>
  );
};

export default ShortcutSettings;
