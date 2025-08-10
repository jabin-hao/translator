import React from 'react';
import { Switch, Select, Input, Button, message, Segmented, ConfigProvider } from 'antd';
import { useTranslation } from 'react-i18next';
import { useStorage } from '~lib/utils/storage';
import { POPUP_SETTINGS_KEY } from '~lib/constants/settings';
import { LANGUAGES } from '~lib/constants/languages';
import SettingsPageContainer from '../../components/SettingsPageContainer';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import { useTheme } from '~lib/utils/theme';

const { Option } = Select;

const InputTranslateSettings: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  
  // 输入翻译总开关和目标语言
  const [inputTranslateEnabled, setInputTranslateEnabled] = useStorage('inputTranslateEnabled', true);
  const [inputTranslateTargetLang, setInputTranslateTargetLang] = useStorage('inputTranslateTargetLang', 'zh');
  
  // popup设置
  const [popupSettings, setPopupSettings] = useStorage(POPUP_SETTINGS_KEY, {
    showInputTranslator: true,
    autoFocus: true,
    autoTranslate: false,
    rememberInput: true,
    maxHistoryCount: 100,
    theme: 'auto',
    position: 'center',
    shortcuts: {
      translate: 'Enter',
      clear: 'Ctrl+Delete',
      close: 'Escape'
    }
  });

  const handleSettingChange = (key: string, value: any) => {
    setPopupSettings({ ...popupSettings, [key]: value });
  };

  const handleShortcutChange = (key: string, value: string) => {
    setPopupSettings({
      ...popupSettings,
      shortcuts: {
        ...popupSettings.shortcuts,
        [key]: value
      }
    });
  };

  const testShortcut = (shortcut: string) => {
    message.info(t('快捷键测试: {{shortcut}}', { shortcut }));
  };

  return (
    <SettingsPageContainer title={t('输入翻译设置')}>
      {/* 输入翻译总开关 */}
      <SettingsGroup title={t('输入翻译')}>
        <SettingsItem 
          label={t('启用输入翻译')}
          description={t('开启后，可在搜索引擎等输入框中进行翻译')}
        >
          <Switch
            checked={inputTranslateEnabled}
            onChange={setInputTranslateEnabled}
          />
        </SettingsItem>

        {inputTranslateEnabled && (
          <SettingsItem 
            label={t('目标语言')}
            description={t('输入翻译的目标语言')}
          >
            <Select
              value={inputTranslateTargetLang}
              onChange={setInputTranslateTargetLang}
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
        )}
      </SettingsGroup>

      {/* 只有开启输入翻译时才显示其他设置 */}
      {inputTranslateEnabled && (
        <>
          <SettingsGroup title={t('基本设置')}>
            <SettingsItem 
              label={t('显示输入翻译器')}
              description={t('在弹窗中显示输入翻译功能')}
            >
              <Switch
                checked={popupSettings.showInputTranslator}
                onChange={(checked) => handleSettingChange('showInputTranslator', checked)}
              />
            </SettingsItem>

        <SettingsItem 
          label={t('自动聚焦')}
          description={t('打开输入翻译器时自动聚焦到输入框')}
        >
          <Switch
            checked={popupSettings.autoFocus}
            onChange={(checked) => handleSettingChange('autoFocus', checked)}
          />
        </SettingsItem>

        <SettingsItem 
          label={t('自动翻译')}
          description={t('输入文本后自动进行翻译')}
        >
          <Switch
            checked={popupSettings.autoTranslate}
            onChange={(checked) => handleSettingChange('autoTranslate', checked)}
          />
        </SettingsItem>

        <SettingsItem 
          label={t('记住输入内容')}
          description={t('保存翻译历史记录')}
        >
          <Switch
            checked={popupSettings.rememberInput}
            onChange={(checked) => handleSettingChange('rememberInput', checked)}
          />
        </SettingsItem>

        {popupSettings.rememberInput && (
          <SettingsItem 
            label={t('最大历史记录数')}
            description={t('保存的翻译历史记录最大条数')}
          >
            <Select
              value={popupSettings.maxHistoryCount}
              onChange={(value) => handleSettingChange('maxHistoryCount', value)}
              style={{ width: 120 }}
            >
              <Option value={50}>50</Option>
              <Option value={100}>100</Option>
              <Option value={200}>200</Option>
              <Option value={500}>500</Option>
            </Select>
          </SettingsItem>
        )}
      </SettingsGroup>

      <SettingsGroup title={t('界面设置')}>
        <SettingsItem 
          label={t('弹窗位置')}
          description={t('输入翻译器弹窗的显示位置')}
        >
          <ConfigProvider
            theme={{
              components: {
                Segmented: {
                  itemColor: isDark ? '#fff' : undefined,
                  itemHoverColor: isDark ? '#fff' : undefined,
                  itemSelectedColor: isDark ? '#fff' : undefined,
                }
              }
            }}
          >
            <Segmented
              value={popupSettings.position}
              onChange={(value) => handleSettingChange('position', value)}
              options={[
                { label: t('居中'), value: 'center' },
                { label: t('左上角'), value: 'top-left' },
                { label: t('右上角'), value: 'top-right' },
                { label: t('左下角'), value: 'bottom-left' },
                { label: t('右下角'), value: 'bottom-right' }
              ]}
            />
          </ConfigProvider>
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t('快捷键设置')}>
        <SettingsItem 
          label={t('翻译快捷键')}
          description={t('执行翻译的快捷键')}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Select
              value={popupSettings.shortcuts?.translate || 'Enter'}
              onChange={(value) => handleShortcutChange('translate', value)}
              style={{ width: 120 }}
            >
              <Option value="Enter">{t('回车')}</Option>
              <Option value="Tab">{t('Tab')}</Option>
              <Option value="Ctrl+Enter">Ctrl+Enter</Option>
              <Option value="Shift+Enter">Shift+Enter</Option>
            </Select>
            <Button 
              size="small"
              onClick={() => testShortcut(popupSettings.shortcuts?.translate || 'Enter')}
            >
              {t('测试')}
            </Button>
          </div>
        </SettingsItem>

        <SettingsItem 
          label={t('清空快捷键')}
          description={t('清空输入内容的快捷键')}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Select
              value={popupSettings.shortcuts?.clear || 'Ctrl+Delete'}
              onChange={(value) => handleShortcutChange('clear', value)}
              style={{ width: 120 }}
            >
              <Option value="Ctrl+Delete">Ctrl+Delete</Option>
              <Option value="Ctrl+Backspace">Ctrl+Backspace</Option>
              <Option value="Alt+Delete">Alt+Delete</Option>
              <Option value="Shift+Delete">Shift+Delete</Option>
            </Select>
            <Button 
              size="small"
              onClick={() => testShortcut(popupSettings.shortcuts?.clear || 'Ctrl+Delete')}
            >
              {t('测试')}
            </Button>
          </div>
        </SettingsItem>

        <SettingsItem 
          label={t('关闭快捷键')}
          description={t('关闭输入翻译器的快捷键')}
        >
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <Select
              value={popupSettings.shortcuts?.close || 'Escape'}
              onChange={(value) => handleShortcutChange('close', value)}
              style={{ width: 120 }}
            >
              <Option value="Escape">{t('Esc')}</Option>
              <Option value="Ctrl+W">Ctrl+W</Option>
              <Option value="Alt+F4">Alt+F4</Option>
            </Select>
            <Button 
              size="small"
              onClick={() => testShortcut(popupSettings.shortcuts?.close || 'Escape')}
            >
              {t('测试')}
            </Button>
          </div>
        </SettingsItem>
      </SettingsGroup>
        </>
      )}
    </SettingsPageContainer>
  );
};

export default InputTranslateSettings;
