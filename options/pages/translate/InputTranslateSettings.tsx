import React from 'react';
import { Input, InputNumber, Radio, Select, Space, Switch, Tag, message } from 'antd';
import { useTranslation } from 'react-i18next';

import { appendUniqueItem, removeItem } from '~lib/settings/hooks/settingArrayUtils';
import { useInputTranslateSettings } from '~lib/settings/settings';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import SettingsPageContainer from '../../components/SettingsPageContainer';

const supportedInputTypes = [
  'text',
  'textarea',
  'email',
  'search',
  'url',
  'password',
  'tel',
  'contenteditable'
];

const InputTranslateSettings: React.FC = () => {
  const { t } = useTranslation();
  const { inputTranslateSettings, updateInputTranslate } = useInputTranslateSettings();

  const handleToggleEnabled = async (enabled: boolean) => {
    await updateInputTranslate({ enabled });
    message.success(enabled ? t('Input translation enabled') : t('Input translation disabled'));
  };

  const handleTriggerModeChange = async (value: string) => {
    await updateInputTranslate({ triggerMode: value as 'auto' | 'hotkey' });
  };

  const handleAutoTranslateDelayChange = async (autoTranslateDelay: number | null) => {
    if (autoTranslateDelay !== null) {
      await updateInputTranslate({ autoTranslateDelay });
    }
  };

  const handleMinTextLengthChange = async (minTextLength: number | null) => {
    if (minTextLength !== null) {
      await updateInputTranslate({ minTextLength });
    }
  };

  const handleAutoReplaceChange = async (autoReplace: boolean) => {
    await updateInputTranslate({ autoReplace });
    message.success(autoReplace ? t('Auto replace enabled') : t('Auto replace disabled'));
  };

  const handleAddInputType = async (inputType: string) => {
    await updateInputTranslate({
      enabledInputTypes: appendUniqueItem(inputTranslateSettings.enabledInputTypes, inputType)
    });
  };

  const handleRemoveInputType = async (inputType: string) => {
    await updateInputTranslate({
      enabledInputTypes: removeItem(inputTranslateSettings.enabledInputTypes, inputType)
    });
  };

  const handleAddExcludeSelector = async (selector: string) => {
    await updateInputTranslate({
      excludeSelectors: appendUniqueItem(inputTranslateSettings.excludeSelectors, selector)
    });
  };

  const handleRemoveExcludeSelector = async (selector: string) => {
    await updateInputTranslate({
      excludeSelectors: removeItem(inputTranslateSettings.excludeSelectors, selector)
    });
  };

  return (
    <SettingsPageContainer
      title={t('Input translation settings')}
      description={t('Configure translation behavior for editable fields')}
    >
      <SettingsGroup title={t('Basic settings')} first>
        <SettingsItem
          label={t('Enable input translation')}
          description={t('Turn on translation support inside page input fields')}
        >
          <Switch checked={inputTranslateSettings.enabled} onChange={handleToggleEnabled} />
        </SettingsItem>
      </SettingsGroup>

      {inputTranslateSettings.enabled && (
        <SettingsGroup title={t('Trigger settings')}>
          <SettingsItem
            label={t('Trigger mode')}
            description={t('Choose how input translation starts')}
          >
            <Radio.Group
              value={inputTranslateSettings.triggerMode}
              onChange={(event) => handleTriggerModeChange(event.target.value)}
            >
              <Radio value="auto">{t('Automatic')}</Radio>
              <Radio value="hotkey">{t('Hotkey')}</Radio>
            </Radio.Group>
          </SettingsItem>

          {inputTranslateSettings.triggerMode === 'auto' && (
            <>
              <SettingsItem
                label={t('Auto translate delay')}
                description={t('Delay after typing stops before translation starts (ms)')}
              >
                <InputNumber
                  value={inputTranslateSettings.autoTranslateDelay}
                  onChange={handleAutoTranslateDelayChange}
                  style={{ width: 120 }}
                  min={500}
                  max={5000}
                  step={100}
                />
              </SettingsItem>

              <SettingsItem
                label={t('Minimum text length')}
                description={t('Minimum characters required before auto translation starts')}
              >
                <InputNumber
                  value={inputTranslateSettings.minTextLength}
                  onChange={handleMinTextLengthChange}
                  style={{ width: 120 }}
                  min={1}
                  max={20}
                />
              </SettingsItem>
            </>
          )}

          <SettingsItem
            label={t('Auto replace')}
            description={t('Replace the original input directly after translation')}
          >
            <Switch
              checked={inputTranslateSettings.autoReplace}
              onChange={handleAutoReplaceChange}
            />
          </SettingsItem>
        </SettingsGroup>
      )}

      {inputTranslateSettings.enabled && (
        <SettingsGroup title={t('Advanced settings')}>
          <SettingsItem
            label={t('Supported input types')}
            description={t('Choose which editable field types can trigger translation')}
          >
            <div>
              <Space wrap style={{ marginBottom: 8 }}>
                {inputTranslateSettings.enabledInputTypes.map((type) => (
                  <Tag key={type} closable onClose={() => void handleRemoveInputType(type)}>
                    {type}
                  </Tag>
                ))}
              </Space>
              <Select
                placeholder={t('Add an input type')}
                style={{ width: 200 }}
                onSelect={(value) => void handleAddInputType(value)}
                value={undefined}
              >
                {supportedInputTypes.map((type) => (
                  <Select.Option
                    key={type}
                    value={type}
                    disabled={inputTranslateSettings.enabledInputTypes.includes(type)}
                  >
                    {type}
                  </Select.Option>
                ))}
              </Select>
            </div>
          </SettingsItem>

          <SettingsItem
            label={t('Excluded selectors')}
            description={t('Fields matching these CSS selectors will not use input translation')}
          >
            <div>
              <Space wrap style={{ marginBottom: 8 }}>
                {inputTranslateSettings.excludeSelectors.map((selector) => (
                  <Tag key={selector} closable onClose={() => void handleRemoveExcludeSelector(selector)}>
                    {selector}
                  </Tag>
                ))}
              </Space>
              <Input
                placeholder={t('Add a CSS selector, for example .no-translate')}
                style={{ width: 300 }}
                onPressEnter={(event) => {
                  const value = (event.target as HTMLInputElement).value.trim();
                  if (!value) {
                    return;
                  }

                  void handleAddExcludeSelector(value);
                  (event.target as HTMLInputElement).value = '';
                }}
              />
            </div>
          </SettingsItem>
        </SettingsGroup>
      )}
    </SettingsPageContainer>
  );
};

export default InputTranslateSettings;
