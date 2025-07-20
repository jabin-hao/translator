import React, { useState, useEffect } from 'react';
import { Card, Switch, Divider, Typography, Space, message, Input, Button } from 'antd';
import { Storage } from '@plasmohq/storage';
import { useTranslation } from 'react-i18next';

const { Title, Paragraph } = Typography;

const storage = new Storage();

const SHORTCUT_KEY = 'shortcut_settings';

// 快捷键设置类型定义
interface ShortcutSettings {
  enabled: boolean;
  customShortcut?: string;
}

async function getInitShortcutSettings(): Promise<ShortcutSettings> {
  try {
    const settings = await storage.get(SHORTCUT_KEY);
    if (settings && typeof settings === 'object') return settings as ShortcutSettings;
  } catch {}
  return { 
    enabled: true,
    customShortcut: ''
  };
}

const ShortcutSettings: React.FC = () => {
  const { t } = useTranslation();
  const [enabled, setEnabled] = useState(true);
  const [customShortcut, setCustomShortcut] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordedKeys, setRecordedKeys] = useState<string[]>([]);

  useEffect(() => {
    const initData = async () => {
      const settings = await getInitShortcutSettings();
      setEnabled(settings.enabled);
      setCustomShortcut(settings.customShortcut || '');
    };
    initData();
  }, []);

  // 保存设置
  const saveSettings = async (key: keyof ShortcutSettings, value: any) => {
    try {
      const currentSettings = await getInitShortcutSettings();
      const newSettings = { ...currentSettings, [key]: value };
      await storage.set(SHORTCUT_KEY, newSettings);
      message.success(t('设置已保存'));
    } catch (err) {
      message.error(t('保存失败，请重试'));
    }
  };

  // 切换快捷键启用状态
  const handleToggleEnabled = async (checked: boolean) => {
    setEnabled(checked);
    await saveSettings('enabled', checked);
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
        setCustomShortcut(newShortcut);
        saveSettings('customShortcut', newShortcut);
        message.success(t('快捷键已保存'));
      }
      // 清空录制状态
      setRecordedKeys([]);
    }, 50);
  };

  // 清除自定义快捷键
  const clearCustomShortcut = async () => {
    setCustomShortcut('');
    await saveSettings('customShortcut', '');
    message.success(t('快捷键已清除'));
  };

  return (
    <Card 
      title={t('快捷键设置')} 
      style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      styles={{ body: { padding: 0, flex: 1, display: 'flex', flexDirection: 'column' } }}
    >
      <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
        {/* 划词翻译快捷键 */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
            <b style={{ fontSize: 13, flex: 'none' }}>{t('划词翻译')}：</b>
            <Switch 
              checked={enabled} 
              onChange={handleToggleEnabled}
              size="default"
              style={{ marginLeft: 16 }}
            />
          </div>
          
          <div style={{ marginBottom: 12 }}>
            <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>
              {t('默认快捷键：双击 Ctrl 键')}{t('选中文字后，双击 Ctrl 键即可快速翻译')}
            </div>
          </div>

          {/* 自定义快捷键输入 */}
          <div style={{ marginTop: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <Title level={5} style={{ margin: 0, fontWeight: 'bold', fontSize: 13, flex: 'none' }}>{t('自定义快捷键')}：</Title>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 12 }}>
              <Input
                value={customShortcut}
                onChange={(e) => setCustomShortcut(e.target.value)}
                placeholder={t('点击右侧按钮录制快捷键，或手动输入（如：ctrl+shift+t）')}
                disabled={!enabled}
                style={{ width: 200, marginRight: 8 }}
              />
              <Button
                type={isRecording ? 'primary' : 'default'}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={!enabled}
              >
                {isRecording ? t('停止录制') : t('开始录制')}
              </Button>
              {customShortcut && (
                <Button
                  danger 
                  onClick={clearCustomShortcut} 
                  disabled={!enabled}
                  style={{ marginLeft: 8 }}
                >
                  {t('清除')}
                </Button>
              )}
            </div>
            {isRecording && (
              <div style={{ marginTop: 8, padding: 8, background: '#f0f0f0', borderRadius: 4 }}>
                <span style={{ color: '#1890ff', fontSize: 13 }}>
                  {t('请按下您想要设置的快捷键组合，然后点击"停止录制"按钮结束录制...')}
                </span>
              </div>
            )}
            {recordedKeys.length > 0 && (
              <div style={{ marginTop: 8, padding: 8, background: '#f6ffed', borderRadius: 4 }}>
                <span style={{ color: '#52c41a', fontSize: 13 }}>
                  {t('检测到快捷键')}: {recordedKeys[0]}
                </span>
              </div>
            )}
            <Paragraph type="secondary" style={{ margin: '12px 0 0 0', fontSize: 13 }}>
              {t('默认快捷键为双击Ctrl。支持自定义组合键（如 Ctrl+T、Alt+F1），不支持自定义双击类快捷键。')}
            </Paragraph>
          </div>
        </div>

        <Divider />

        {/* 使用说明 */}
        <div style={{ marginBottom: 0 }}>
          <Title level={5} style={{ margin: '0 0 12px 0', fontWeight: 'bold', fontSize: 14 }}>
            {t('使用说明')}
          </Title>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: '#666' }}>
            <p>• {t('选中文字后，双击 Ctrl 键即可快速翻译')}</p>
            <p>• {t('可以设置自定义快捷键替代默认的 Ctrl 双击')}</p>
            <p>• {t('自定义快捷键支持组合键，如 Ctrl+Shift+T')}</p>
            <p>• {t('关闭快捷键功能后，仍可通过点击翻译图标进行翻译')}</p>
          </div>
        </div>
      </div>
      <div style={{padding: '0 24px 16px 24px', color: '#888', fontSize: 13}}>
        {t('所有设置均会自动保存，无需手动操作。')}
      </div>
    </Card>
  );
};

export default ShortcutSettings; 