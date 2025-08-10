import React from 'react';
import { Select, Switch, Input, Button, message, Segmented, ConfigProvider } from 'antd';
import { TRANSLATE_ENGINES } from '~lib/constants/engines';
import { useTranslation } from 'react-i18next';
import { useStorage } from '~lib/utils/storage';
import { TRANSLATE_SETTINGS_KEY, DEEPL_API_KEY, YANDEX_API_KEY } from '~lib/constants/settings';
import SettingsPageContainer from '../../components/SettingsPageContainer';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import { useTheme } from '~lib/utils/theme';

const { Option } = Select;

const TextTranslateSettings: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  
  // 使用useStorage hooks管理设置
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

  const [deeplApiKey, setDeeplApiKey] = useStorage(DEEPL_API_KEY, '');
  const [yandexApiKey, setYandexApiKey] = useStorage(YANDEX_API_KEY, '');

  const handleEngineChange = (value: string) => {
    setTranslateSettings({ ...translateSettings, engine: value });
  };

  const handleSwitchChange = (key: string, checked: boolean) => {
    setTranslateSettings({ ...translateSettings, [key]: checked });
  };

  const handleKeyCodeChange = (value: string) => {
    setTranslateSettings({ ...translateSettings, keyCode: value });
  };

  const testApiKey = async (engine: 'deepl' | 'yandex') => {
    // TODO: 实现API密钥测试逻辑
    message.info(t('API密钥测试功能正在开发中'));
  };

  return (
    <SettingsPageContainer title={t('划词翻译设置')}>
      <SettingsGroup title={t('翻译引擎')}>
        <SettingsItem 
          label={t('翻译引擎')}
          description={t('选择文本翻译使用的引擎')}
        >
          <Select 
            value={translateSettings.engine} 
            onChange={handleEngineChange}
            style={{ width: 150 }}
          >
            {TRANSLATE_ENGINES.map((engine) => (
              <Option key={engine.value} value={engine.value}>
                {engine.label}
              </Option>
            ))}
          </Select>
        </SettingsItem>

        {translateSettings.engine === 'deepl' && (
          <SettingsItem 
            label={t('DeepL API密钥')}
            description={t('输入您的DeepL API密钥以使用DeepL翻译服务')}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input.Password
                value={deeplApiKey}
                onChange={(e) => setDeeplApiKey(e.target.value)}
                placeholder={t('请输入DeepL API密钥')}
                style={{ width: 300 }}
              />
              <Button onClick={() => testApiKey('deepl')}>
                {t('测试')}
              </Button>
            </div>
          </SettingsItem>
        )}

        {translateSettings.engine === 'yandex' && (
          <SettingsItem 
            label={t('Yandex API密钥')}
            description={t('输入您的Yandex API密钥以使用Yandex翻译服务')}
          >
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <Input.Password
                value={yandexApiKey}
                onChange={(e) => setYandexApiKey(e.target.value)}
                placeholder={t('请输入Yandex API密钥')}
                style={{ width: 300 }}
              />
              <Button onClick={() => testApiKey('yandex')}>
                {t('测试')}
              </Button>
            </div>
          </SettingsItem>
        )}
      </SettingsGroup>

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
    </SettingsPageContainer>
  );
};

export default TextTranslateSettings;
