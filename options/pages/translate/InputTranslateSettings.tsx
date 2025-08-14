import React from 'react';
import { produce } from 'immer';
import { Switch, Select, Radio, Input, InputNumber, Button, message, Tag, Space } from 'antd';
import { useTranslation } from 'react-i18next';
import { useInputTranslateSettings } from '~lib/settings/globalSettingsHooks';
import { LANGUAGES } from '~lib/constants/languages';
import SettingsPageContainer from '../../components/SettingsPageContainer';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';

const { Option } = Select;

const InputTranslateSettings: React.FC = () => {
  const { t } = useTranslation();
  const { inputTranslateSettings, updateInputTranslate } = useInputTranslateSettings();

  const handleToggleEnabled = async (enabled: boolean) => {
    await updateInputTranslate({ enabled });
    message.success(enabled ? t('已启用输入框翻译') : t('已禁用输入框翻译'));
  };

  const handleTargetLanguageChange = async (targetLanguage: string) => {
    await updateInputTranslate({ targetLanguage });
  };

  const handleAutoDetectLanguageChange = async (autoDetectLanguage: boolean) => {
    await updateInputTranslate({ autoDetectLanguage });
  };

  const handleShowTranslateButtonChange = async (showTranslateButton: boolean) => {
    await updateInputTranslate({ showTranslateButton });
  };

  const handleButtonPositionChange = async (e: any) => {
    await updateInputTranslate({ buttonPosition: e.target.value });
  };

  const handleTriggerModeChange = async (e: any) => {
    await updateInputTranslate({ triggerMode: e.target.value });
  };

  const handleHotkeyChange = async (hotkey: string) => {
    await updateInputTranslate({ hotkey });
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

  const handleShowOriginalTextChange = async (showOriginalText: boolean) => {
    await updateInputTranslate({ showOriginalText });
  };

  const handleReplaceOriginalTextChange = async (replaceOriginalText: boolean) => {
    await updateInputTranslate({ replaceOriginalText });
  };

  const handleAddInputType = async (inputType: string) => {
    if (inputType && !inputTranslateSettings.enabledInputTypes.includes(inputType)) {
      // 使用 immer 优化数组添加
      const newTypes = produce(inputTranslateSettings.enabledInputTypes, (draft) => {
        draft.push(inputType);
      });
      await updateInputTranslate({ enabledInputTypes: newTypes });
    }
  };

  const handleRemoveInputType = async (inputType: string) => {
    // 使用 immer 优化数组过滤
    const newTypes = produce(inputTranslateSettings.enabledInputTypes, (draft) => {
      return draft.filter(type => type !== inputType);
    });
    await updateInputTranslate({ enabledInputTypes: newTypes });
  };

  const handleAddExcludeSelector = async (selector: string) => {
    if (selector && !inputTranslateSettings.excludeSelectors.includes(selector)) {
      // 使用 immer 优化数组添加
      const newSelectors = produce(inputTranslateSettings.excludeSelectors, (draft) => {
        draft.push(selector);
      });
      await updateInputTranslate({ excludeSelectors: newSelectors });
    }
  };

  const handleRemoveExcludeSelector = async (selector: string) => {
    // 使用 immer 优化数组过滤
    const newSelectors = produce(inputTranslateSettings.excludeSelectors, (draft) => {
      return draft.filter(s => s !== selector);
    });
    await updateInputTranslate({ excludeSelectors: newSelectors });
  };

  const testHotkey = () => {
    message.info(t('快捷键 {{hotkey}} 已设置', { hotkey: inputTranslateSettings.hotkey }));
  };

  return (
    <SettingsPageContainer
      title={t('输入框翻译设置')}
      description={t('配置网页输入框的翻译功能')}
    >
      {/* 基础设置 */}
      <SettingsGroup title={t('基础设置')} first>
        <SettingsItem
          label={t('启用输入框翻译')}
          description={t('在网页的输入框中启用翻译功能')}
        >
          <Switch
            checked={inputTranslateSettings.enabled}
            onChange={handleToggleEnabled}
          />
        </SettingsItem>

        {inputTranslateSettings.enabled && (
          <>
            <SettingsItem
              label={t('自动检测语言')}
              description={t('自动检测输入文本的语言')}
            >
              <Switch
                checked={inputTranslateSettings.autoDetectLanguage}
                onChange={handleAutoDetectLanguageChange}
              />
            </SettingsItem>

            <SettingsItem
              label={t('目标语言')}
              description={t('输入框翻译的目标语言')}
            >
              <Select
                value={inputTranslateSettings.targetLanguage}
                onChange={handleTargetLanguageChange}
                style={{ width: 200 }}
                showSearch
                placeholder={t('选择目标语言')}
                optionFilterProp="children"
              >
                {LANGUAGES.map((lang) => (
                  <Option key={lang.code} value={lang.code}>
                    {lang.label}
                  </Option>
                ))}
              </Select>
            </SettingsItem>
          </>
        )}
      </SettingsGroup>

      {/* 触发设置 */}
      {inputTranslateSettings.enabled && (
        <SettingsGroup title={t('触发设置')}>
          <SettingsItem
            label={t('触发模式')}
            description={t('选择如何触发翻译')}
          >
            <Radio.Group
              value={inputTranslateSettings.triggerMode}
              onChange={handleTriggerModeChange}
            >
              <Radio value="auto">{t('自动触发')}</Radio>
              <Radio value="hotkey">{t('快捷键触发')}</Radio>
            </Radio.Group>
          </SettingsItem>

          {inputTranslateSettings.triggerMode === 'auto' && (
            <>
              <SettingsItem
                label={t('自动翻译延迟')}
                description={t('停止输入后多长时间自动翻译（毫秒）')}
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
                label={t('最小文本长度')}
                description={t('触发自动翻译的最小文本长度')}
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
        </SettingsGroup>
      )}

      {/* 高级设置 */}
      {inputTranslateSettings.enabled && (
        <SettingsGroup title={t('高级设置')}>
          <SettingsItem
            label={t('支持的输入类型')}
            description={t('选择哪些类型的输入框启用翻译')}
          >
            <div>
              <Space wrap style={{ marginBottom: 8 }}>
                {inputTranslateSettings.enabledInputTypes.map(type => (
                  <Tag
                    key={type}
                    closable
                    onClose={() => handleRemoveInputType(type)}
                  >
                    {type}
                  </Tag>
                ))}
              </Space>
              <Select
                placeholder={t('添加输入类型')}
                style={{ width: 200 }}
                onSelect={handleAddInputType}
                value={undefined}
              >
                {['text', 'textarea', 'email', 'search', 'url', 'password', 'tel', 'contenteditable'].map(type => (
                  <Option key={type} value={type} disabled={inputTranslateSettings.enabledInputTypes.includes(type)}>
                    {type}
                  </Option>
                ))}
              </Select>
            </div>
          </SettingsItem>

          <SettingsItem
            label={t('排除选择器')}
            description={t('匹配这些CSS选择器的输入框将不启用翻译')}
          >
            <div>
              <Space wrap style={{ marginBottom: 8 }}>
                {inputTranslateSettings.excludeSelectors.map(selector => (
                  <Tag
                    key={selector}
                    closable
                    onClose={() => handleRemoveExcludeSelector(selector)}
                  >
                    {selector}
                  </Tag>
                ))}
              </Space>
              <Input
                placeholder={t('添加CSS选择器（如：.no-translate）')}
                style={{ width: 300 }}
                onPressEnter={(e) => {
                  const value = (e.target as HTMLInputElement).value.trim();
                  if (value) {
                    handleAddExcludeSelector(value);
                    (e.target as HTMLInputElement).value = '';
                  }
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
