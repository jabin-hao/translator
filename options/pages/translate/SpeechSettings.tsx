import React from 'react';
import { Select, Switch, Slider, Button, message, Segmented, ConfigProvider } from 'antd';
import { TTS_ENGINES } from '~lib/constants/engines';
import { useTranslation } from 'react-i18next';
import { 
  useSpeechSettings} from '~lib/settings/settings';
import SettingsPageContainer from '../../components/SettingsPageContainer';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import { useTheme } from '~lib/theme/theme';

const { Option } = Select;

const SpeechSettings: React.FC = () => {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  
  // 使用新的全局配置系统
  const { speechSettings, updateSpeech } = useSpeechSettings();
  
  const handleSettingChange = async (key: string, value: any) => {
    await updateSpeech({ [key]: value } as any);
  };

  const handleLanguageChange = async (langCode: string, voice: string) => {
    // 注意：这里可能需要根据实际的全局设置结构调整
    // 如果语言设置不在 speech 模块中，可能需要使用 updateSettings
    await updateSpeech({
      voice: voice
    } as any);
  };

  const testSpeech = async (text: string = t('这是一个测试语音')) => {
    try {
      // TODO: 实现语音测试逻辑
      message.info(t('正在播放测试语音...'));
      
      // 使用Web Speech API进行测试
      if ('speechSynthesis' in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = speechSettings?.speed || 1.0;
        utterance.pitch = speechSettings?.pitch || 1.0;
        utterance.volume = speechSettings?.volume || 1.0;
        
        if (speechSettings?.voice && speechSettings.voice !== 'auto') {
          const voices = speechSynthesis.getVoices();
          const voice = voices.find(v => v.name === speechSettings.voice);
          if (voice) {
            utterance.voice = voice;
          }
        }
        
        speechSynthesis.speak(utterance);
      } else {
        message.error(t('您的浏览器不支持语音合成'));
      }
    } catch (error) {
      message.error(t('语音测试失败'));
    }
  };

  const getAvailableVoices = () => {
    if ('speechSynthesis' in window) {
      return speechSynthesis.getVoices();
    }
    return [];
  };

  const languageLabels = {
    'zh-CN': t('中文'),
    'en-US': t('英语'),
    'ja-JP': t('日语'),
    'ko-KR': t('韩语'),
    'fr-FR': t('法语'),
    'de-DE': t('德语'),
    'es-ES': t('西班牙语'),
    'ru-RU': t('俄语')
  };

  return (
    <SettingsPageContainer title={t('朗读设置')} description={t('配置语音朗读的相关设置')}>
      {/* 语音朗读总开关 */}
      <SettingsGroup title={t('基础设置')} first>
        <SettingsItem 
          label={t('启用语音朗读')}
          description={t('启用翻译结果的语音朗读功能')}
        >
          <Switch
            checked={speechSettings?.enabled || false}
            onChange={(checked) => handleSettingChange('enabled', checked)}
          />
        </SettingsItem>
      </SettingsGroup>

      {/* 语音朗读详细设置 - 条件渲染 */}
      {speechSettings?.enabled && (
        <>
          <SettingsGroup title={t('朗读引擎')}>
            <SettingsItem 
              label={t('朗读引擎')}
              description={t('选择语音合成引擎')}
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
                  value={speechSettings?.engine || 'google'}
                  onChange={(value) => handleSettingChange('engine', value)}
                  options={TTS_ENGINES.map(engine => ({
                    label: engine.label,
                    value: engine.value,
                  }))}
                />
              </ConfigProvider>
            </SettingsItem>

            <SettingsItem 
              label={t('默认语音')}
              description={t('选择默认的语音声音')}
            >
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <Select
                  value={speechSettings?.voice || 'auto'}
                  onChange={(value) => handleSettingChange('voice', value)}
                  style={{ width: 200 }}
                >
                  <Option value="auto">{t('自动选择')}</Option>
                  {getAvailableVoices().map(voice => (
                    <Option key={voice.name} value={voice.name}>
                      {voice.name} ({voice.lang})
                    </Option>
                  ))}
                </Select>
                <Button onClick={() => testSpeech()}>
                  {t('测试')}
                </Button>
              </div>
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('朗读参数')}>
            <SettingsItem 
              label={t('语速')}
              description={t('调整语音朗读的速度')}
            >
              <div style={{ width: 300 }}>
                <Slider
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  value={speechSettings?.speed || 1.0}
                  onChange={(value) => handleSettingChange('speed', value)}
                  marks={{
                    0.5: '0.5x',
                    1.0: '1.0x',
                    1.5: '1.5x',
                    2.0: '2.0x'
                  }}
                />
              </div>
            </SettingsItem>

            <SettingsItem 
              label={t('音调')}
              description={t('调整语音朗读的音调高低')}
            >
              <div style={{ width: 300 }}>
                <Slider
                  min={0.1}
                  max={2.0}
                  step={0.1}
                  value={speechSettings?.pitch || 1.0}
                  onChange={(value) => handleSettingChange('pitch', value)}
                  marks={{
                    0.5: t('低'),
                    1.0: t('正常'),
                    1.5: t('高'),
                    2.0: t('很高')
                  }}
                />
              </div>
            </SettingsItem>

            <SettingsItem 
              label={t('音量')}
              description={t('调整语音朗读的音量大小')}
            >
              <div style={{ width: 300 }}>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={speechSettings?.volume || 1.0}
                  onChange={(value) => handleSettingChange('volume', value)}
                  marks={{
                    0: '0%',
                    0.5: '50%',
                    1.0: '100%'
                  }}
                />
              </div>
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('自动播放')}>
            <SettingsItem 
              label={t('自动播放翻译结果')}
              description={t('翻译完成后自动播放语音')}
            >
              <Switch
                checked={speechSettings?.autoPlay || false}
                onChange={(checked) => handleSettingChange('autoPlay', checked)}
              />
            </SettingsItem>

            {speechSettings?.autoPlay && (
              <SettingsItem 
                label={t('自动播放延迟')}
                description={t('翻译完成后延迟多少毫秒开始播放')}
              >
                <Select
                  value={1000} // 暂时使用固定值，因为全局设置中没有 autoPlayDelay
                  onChange={(value) => handleSettingChange('autoPlayDelay', value)}
                  style={{ width: 120 }}
                >
                  <Option value={0}>{t('立即')}</Option>
                  <Option value={500}>500ms</Option>
                  <Option value={1000}>1s</Option>
                  <Option value={2000}>2s</Option>
                  <Option value={3000}>3s</Option>
                </Select>
              </SettingsItem>
            )}
          </SettingsGroup>

          <SettingsGroup title={t('语言特定设置')}>
            {Object.entries(languageLabels).map(([langCode, label]) => (
              <SettingsItem 
                key={langCode}
                label={`${label}语音`}
                description={`为${label}选择特定的语音`}
              >
                <Select
                  value={speechSettings?.voice || 'auto'}
                  onChange={(value) => handleLanguageChange(langCode, value)}
                  style={{ width: 200 }}
                >
                  <Option value="auto">{t('自动选择')}</Option>
                  {getAvailableVoices()
                    .filter(voice => voice.lang.startsWith(langCode.split('-')[0]))
                    .map(voice => (
                      <Option key={voice.name} value={voice.name}>
                        {voice.name}
                      </Option>
                    ))}
                </Select>
              </SettingsItem>
            ))}
          </SettingsGroup>
        </>
      )}
    </SettingsPageContainer>
  );
};

export default SpeechSettings;
