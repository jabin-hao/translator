import React, { useState } from 'react';
import { Switch, Typography, message, Input, Button } from 'antd';
import { useTranslation } from 'react-i18next';
import { useShortcutSettings } from '~lib/utils/globalSettingsHooks';
import SettingsPageContainer from '../components/SettingsPageContainer';
import SettingsGroup from '../components/SettingsGroup';
import SettingsItem from '../components/SettingsItem';

const { Title, Paragraph } = Typography;

const ShortcutSettings: React.FC = () => {
  const { t } = useTranslation();
  
  // 使用新的快捷键设置 Hook
  const { shortcutSettings, updateShortcuts, toggleEnabled, updateShortcut } = useShortcutSettings();
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);
  const [recordingType, setRecordingType] = useState<keyof Omit<typeof shortcutSettings, 'enabled'> | null>(null);

  // 保存设置的辅助函数
  const saveShortcut = async (key: keyof Omit<typeof shortcutSettings, 'enabled'>, value: string) => {
    await updateShortcut(key, value);
    message.success(t('快捷键已保存'));
  };

  // 开始录制快捷键
  const startRecording = (type: keyof Omit<typeof shortcutSettings, 'enabled'>) => {
    setIsRecording(true);
    setRecordingType(type);
    setRecordedKeys([]);
    
    const handleKeyDown = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      
      const key = e.key.toLowerCase();
      const modifiers = [];
      
      if (e.ctrlKey) modifiers.push('Ctrl');
      if (e.altKey) modifiers.push('Alt');
      if (e.shiftKey) modifiers.push('Shift');
      if (e.metaKey) modifiers.push('Meta');
      
      let keyName = key;
      if (key === ' ') keyName = 'Space';
      if (key === 'enter') keyName = 'Enter';
      if (key === 'escape') keyName = 'Escape';
      if (key === 'tab') keyName = 'Tab';
      if (keyName === 'backspace') keyName = 'Backspace';
      if (keyName === 'delete') keyName = 'Delete';
      
      // 只允许录制普通组合键
      if (!['control', 'alt', 'shift', 'meta'].includes(keyName)) {
        const combination = [...modifiers, keyName.charAt(0).toUpperCase() + keyName.slice(1)].join('+');
        setRecordedKeys([combination]);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown, true);
    
    // 保存事件处理器引用以便清理
    (window as any).__shortcutRecorder = { handleKeyDown };
  };

  // 停止录制快捷键
  const stopRecording = async () => {
    setIsRecording(false);
    
    if ((window as any).__shortcutRecorder) {
      const { handleKeyDown } = (window as any).__shortcutRecorder;
      document.removeEventListener('keydown', handleKeyDown, true);
      delete (window as any).__shortcutRecorder;
    }
    
    // 延迟保存，确保状态已更新
    setTimeout(async () => {
      if (recordedKeys.length > 0 && recordingType) {
        const newShortcut = recordedKeys[0];
        await saveShortcut(recordingType, newShortcut);
      }
      // 清空录制状态
      setRecordedKeys([]);
      setRecordingType(null);
    }, 50);
  };

  // 清除快捷键
  const clearShortcut = async (type: keyof Omit<typeof shortcutSettings, 'enabled'>) => {
    await saveShortcut(type, '');
    message.success(t('快捷键已清除'));
  };

  const shortcutItems = [
    {
      key: 'toggleTranslate' as const,
      label: t('切换翻译功能'),
      description: t('快速启用/禁用翻译功能')
    },
    {
      key: 'translateSelection' as const,
      label: t('翻译选中文本'),
      description: t('翻译当前选中的文本')
    },
    {
      key: 'translatePage' as const,
      label: t('翻译整个页面'),
      description: t('翻译当前页面的所有内容')
    },
    {
      key: 'openPopup' as const,
      label: t('打开弹窗'),
      description: t('打开翻译器弹窗')
    }
  ];

  return (
    <SettingsPageContainer
      title={t('快捷键设置')}
      description={t('配置翻译器的全局快捷键')}
    >
      {/* 快捷键总开关 */}
      <SettingsGroup title={t('快捷键功能')} first>
        <SettingsItem
          label={t('启用快捷键')}
          description={t('开启后，可以使用快捷键快速访问翻译功能')}
        >
          <Switch 
            checked={shortcutSettings.enabled} 
            onChange={toggleEnabled} 
          />
        </SettingsItem>
      </SettingsGroup>

      {/* 快捷键配置 - 条件渲染 */}
      {shortcutSettings.enabled && (
        <SettingsGroup title={t('快捷键配置')}>
          {shortcutItems.map(item => (
            <SettingsItem
              key={item.key}
              label={item.label}
              description={item.description}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Input
                  value={shortcutSettings[item.key] || ''}
                  placeholder={t('点击设置快捷键按钮录制')}
                  readOnly
                  style={{ width: 200 }}
                />
                <Button
                  onClick={() => isRecording && recordingType === item.key ? stopRecording() : startRecording(item.key)}
                  type={isRecording && recordingType === item.key ? 'primary' : 'default'}
                >
                  {isRecording && recordingType === item.key ? t('停止录制') : t('设置快捷键')}
                </Button>
                {shortcutSettings[item.key] && (
                  <Button
                    onClick={() => clearShortcut(item.key)}
                    danger
                  >
                    {t('清除')}
                  </Button>
                )}
              </div>
            </SettingsItem>
          ))}
          
          {isRecording && (
            <div style={{ 
              padding: 16, 
              background: '#f0f0f0', 
              borderRadius: 6, 
              marginTop: 16,
              textAlign: 'center'
            }}>
              <Title level={5}>{t('正在录制快捷键...')}</Title>
              <Paragraph>
                {t('请按下您想要设置的快捷键组合')}
              </Paragraph>
              {recordedKeys.length > 0 && (
                <Typography.Text strong>
                  {t('当前录制: ')} {recordedKeys[0]}
                </Typography.Text>
              )}
            </div>
          )}
        </SettingsGroup>
      )}
    </SettingsPageContainer>
  );
};

export default ShortcutSettings; 