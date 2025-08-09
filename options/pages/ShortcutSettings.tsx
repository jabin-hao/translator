import React, { useState } from 'react';
import { Switch, Typography, message, Input, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useStorage } from '~lib/utils/storage';
import SettingsPageContainer from '../components/SettingsPageContainer';
import SettingsGroup from '../components/SettingsGroup';
import SettingsItem from '../components/SettingsItem';

const { Title, Paragraph } = Typography;

const SHORTCUT_KEY = 'shortcut_settings';

// 快捷键设置类型定义
interface ShortcutSettings {
  enabled: boolean;
  customShortcut?: string;
}

const ShortcutSettings: React.FC = () => {
  const { t } = useTranslation();
  
  // 使用 useStorage hook 管理快捷键设置
  const [shortcutSettings, setShortcutSettings] = useStorage<ShortcutSettings>(SHORTCUT_KEY, {
    enabled: true,
    customShortcut: ''
  });
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);

  // 保存设置的辅助函数
  const updateSetting = (key: keyof ShortcutSettings, value: any) => {
    const newSettings = { ...shortcutSettings, [key]: value };
    setShortcutSettings(newSettings);
    message.success(t('设置已保存'));
  };

  // 切换快捷键启用状态
  const handleToggleEnabled = (checked: boolean) => {
    updateSetting('enabled', checked);
  };

  // 开始录制快捷键
  const startRecording = () => {
    setIsRecording(true);
    setRecordedKeys([]);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const key = e.key.toLowerCase();
      const modifiers = [];
      
      if (e.ctrlKey) modifiers.push('ctrl');
      if (e.altKey) modifiers.push('alt');
      if (e.shiftKey) modifiers.push('shift');
      if (e.metaKey) modifiers.push('meta');
      
      let keyName = key;
      if (key === ' ') keyName = 'space';
      if (key === 'enter') keyName = 'enter';
      if (key === 'escape') keyName = 'escape';
      if (key === 'tab') keyName = 'tab';
      if (keyName === 'backspace') keyName = 'backspace';
      if (keyName === 'delete') keyName = 'delete';
      
      // 只允许录制普通组合键
      if (!['control', 'alt', 'shift', 'meta'].includes(keyName)) {
        const combination = [...modifiers, keyName].join('+');
        setRecordedKeys([combination]);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown, true);
    
    // 保存事件处理器引用以便清理
    (window as any).__shortcutRecorder = { handleKeyDown };
  };

  // 停止录制快捷键
  const stopRecording = () => {
    setIsRecording(false);
    
    if ((window as any).__shortcutRecorder) {
      const { handleKeyDown } = (window as any).__shortcutRecorder;
      document.removeEventListener('keydown', handleKeyDown, true);
      delete (window as any).__shortcutRecorder;
    }
    
    // 延迟保存，确保状态已更新
    setTimeout(() => {
      if (recordedKeys.length > 0) {
        const newShortcut = recordedKeys[0];
        updateSetting('customShortcut', newShortcut);
        message.success(t('快捷键已保存'));
      }
      // 清空录制状态
      setRecordedKeys([]);
    }, 50);
  };

  // 清除自定义快捷键
  const clearCustomShortcut = () => {
    updateSetting('customShortcut', '');
    message.success(t('快捷键已清除'));
  };

  return (
    <SettingsPageContainer
      title={t('快捷键设置')}
      description={t('配置划词翻译的快捷键功能')}
    >
      <SettingsGroup title={t('快捷键功能')} first>
        <SettingsItem
          label={t('启用快捷键功能')}
          description={t('开启后可以使用快捷键快速翻译选中的文字')}
        >
          <Switch
            checked={shortcutSettings.enabled}
            onChange={handleToggleEnabled}
          />
        </SettingsItem>

        <SettingsItem
          label={t('自定义快捷键')}
          description={t('默认为双击Ctrl键，可以设置自定义快捷键组合')}
        >
          <div style={{ width: '100%' }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <Input
                value={shortcutSettings.customShortcut || ''}
                onChange={(e) => updateSetting('customShortcut', e.target.value)}
                placeholder={t('点击右侧按钮录制快捷键，或手动输入（如：ctrl+shift+t）')}
                disabled={!shortcutSettings.enabled}
                style={{ width: 300, marginRight: 8 }}
              />
              <Button
                type={isRecording ? 'primary' : 'default'}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!shortcutSettings.enabled}
              >
                {isRecording ? t('停止录制') : t('开始录制')}
              </Button>
              {shortcutSettings.customShortcut && (
                <Button
                  danger 
                  onClick={clearCustomShortcut} 
                  disabled={!shortcutSettings.enabled}
                  style={{ marginLeft: 8 }}
                >
                  {t('清除')}
                </Button>
              )}
            </div>
            {isRecording && (
              <div style={{ marginTop: 8, padding: 8, background: 'var(--ant-color-fill-quaternary)', borderRadius: 4 }}>
                <span style={{ color: 'var(--ant-color-primary)', fontSize: 13 }}>
                  {t('请按下您想要设置的快捷键组合，然后点击"停止录制"按钮结束录制...')}
                </span>
              </div>
            )}
            {recordedKeys.length > 0 && (
              <div style={{ marginTop: 8, padding: 8, background: 'var(--ant-color-success-bg)', borderRadius: 4 }}>
                <span style={{ color: 'var(--ant-color-success)', fontSize: 13 }}>
                  {t('检测到快捷键')}: {recordedKeys[0]}
                </span>
              </div>
            )}
          </div>
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t('使用说明')}>
        <SettingsItem
          label={t('功能说明')}
        >
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ant-color-text-secondary)' }}>
            <p>• {t('选中文字后，双击 Ctrl 键即可快速翻译')}</p>
            <p>• {t('可以设置自定义快捷键替代默认的 Ctrl 双击')}</p>
            <p>• {t('自定义快捷键支持组合键，如 Ctrl+Shift+T')}</p>
            <p>• {t('关闭快捷键功能后，仍可通过点击翻译图标进行翻译')}</p>
          </div>
        </SettingsItem>
      </SettingsGroup>
    </SettingsPageContainer>
  );
};

export default ShortcutSettings; 