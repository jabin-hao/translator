import React from 'react';
import { Switch, Select } from 'antd';
import { useTranslation } from 'react-i18next';
import { useStorage } from '~lib/utils/storage';
import { TRANSLATE_SETTINGS_KEY } from '~lib/constants/settings';
import SettingsPageContainer from '../../components/SettingsPageContainer';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import { useTheme } from '~lib/utils/theme';

const { Option } = Select;

const TextTranslateSettings: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  
  // 使用useStorage hooks管理设置
  const [textTranslateEnabled, setTextTranslateEnabled] = useStorage('textTranslateEnabled', true);
  const [translateSettings, setTranslateSettings] = useStorage(TRANSLATE_SETTINGS_KEY, {
    engine: 'google',
    autoDetectLanguage: true,
    showOriginal: false,
    doubleClickTranslate: true,
    selectTranslate: true,
    quickTranslate: false,
    pressKeyTranslate: false,
    keyCode: 'Space',
    pressKeyWithCtrl: false,
    pressKeyWithShift: false,
    pressKeyWithAlt: false,
  });

  const handleSwitchChange = (key: string, checked: boolean) => {
    setTranslateSettings({ ...translateSettings, [key]: checked });
  };

  const handleKeyCodeChange = (value: string) => {
    setTranslateSettings({ ...translateSettings, keyCode: value });
  };

  return (
    <SettingsPageContainer title={t('划词翻译设置')}>
      {/* 划词翻译总开关 */}
      <SettingsGroup title={t('划词翻译')}>
        <SettingsItem 
          label={t('启用划词翻译')}
          description={t('开启后，选中文本即可进行翻译')}
        >
          <Switch 
            checked={textTranslateEnabled} 
            onChange={setTextTranslateEnabled} 
          />
        </SettingsItem>
      </SettingsGroup>

      {/* 只有开启划词翻译时才显示其他设置 */}
      {textTranslateEnabled && (
        <>
          <SettingsGroup title={t('翻译触发方式')}>
        <SettingsItem 
          label={t('选词翻译')}
          description={t('选择文本后显示翻译')}
        >
          <Switch
            checked={translateSettings.selectTranslate}
            onChange={(checked) => handleSwitchChange('selectTranslate', checked)}
          />
        </SettingsItem>

        <SettingsItem 
          label={t('双击翻译')}
          description={t('双击单词进行翻译')}
        >
          <Switch
            checked={translateSettings.doubleClickTranslate}
            onChange={(checked) => handleSwitchChange('doubleClickTranslate', checked)}
          />
        </SettingsItem>

        <SettingsItem 
          label={t('快速翻译')}
          description={t('鼠标悬停自动显示翻译')}
        >
          <Switch
            checked={translateSettings.quickTranslate}
            onChange={(checked) => handleSwitchChange('quickTranslate', checked)}
          />
        </SettingsItem>

        <SettingsItem 
          label={t('按键翻译')}
          description={t('按下指定按键进行翻译')}
        >
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <Switch
              checked={translateSettings.pressKeyTranslate}
              onChange={(checked) => handleSwitchChange('pressKeyTranslate', checked)}
            />
            {translateSettings.pressKeyTranslate && (
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Select 
                  value={translateSettings.keyCode} 
                  onChange={handleKeyCodeChange}
                  style={{ width: 100 }}
                >
                  <Option value="Space">{t('空格')}</Option>
                  <Option value="Enter">{t('回车')}</Option>
                  <Option value="Tab">{t('Tab')}</Option>
                  <Option value="Escape">{t('Esc')}</Option>
                </Select>
                <div style={{ display: 'flex', gap: 4 }}>
                  <label>
                    <input
                      type="checkbox"
                      checked={translateSettings.pressKeyWithCtrl}
                      onChange={(e) => handleSwitchChange('pressKeyWithCtrl', e.target.checked)}
                    />
                    Ctrl
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={translateSettings.pressKeyWithShift}
                      onChange={(e) => handleSwitchChange('pressKeyWithShift', e.target.checked)}
                    />
                    Shift
                  </label>
                  <label>
                    <input
                      type="checkbox"
                      checked={translateSettings.pressKeyWithAlt}
                      onChange={(e) => handleSwitchChange('pressKeyWithAlt', e.target.checked)}
                    />
                    Alt
                  </label>
                </div>
              </div>
            )}
          </div>
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t('翻译选项')}>
        <SettingsItem 
          label={t('自动检测语言')}
          description={t('自动检测要翻译的文本语言')}
        >
          <Switch
            checked={translateSettings.autoDetectLanguage}
            onChange={(checked) => handleSwitchChange('autoDetectLanguage', checked)}
          />
        </SettingsItem>

        <SettingsItem 
          label={t('显示原文')}
          description={t('在翻译结果中显示原文')}
        >
          <Switch
            checked={translateSettings.showOriginal}
            onChange={(checked) => handleSwitchChange('showOriginal', checked)}
          />
        </SettingsItem>
      </SettingsGroup>
        </>
      )}
    </SettingsPageContainer>
  );
};

export default TextTranslateSettings;
