import React from 'react';
import { Switch, Select, InputNumber, Button, Space, Divider, Radio, Slider } from 'antd';
import { useTranslation } from 'react-i18next';
import Icon from '~lib/components/Icon';
import SettingsPageContainer from '../../components/SettingsPageContainer';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';

const { Option } = Select;

const SubtitleTranslateSettings: React.FC = () => {
  const { t } = useTranslation();

  // 模拟设置状态（后续需要连接到实际的设置系统）
  const [subtitleSettings, setSubtitleSettings] = React.useState({
    enabled: true,
    autoDetectLanguage: true,
    autoTranslate: true,
    supportedPlatforms: {
      youtube: true,
      bilibili: true,
      netflix: false,
      prime: false,
    },
    speechToText: {
      enabled: true,
      language: 'auto',
      accuracy: 'high',
    },
    subtitleStyle: {
      fontSize: 16,
      fontColor: '#ffffff',
      backgroundColor: 'rgba(0,0,0,0.8)',
      position: 'bottom',
      fontFamily: 'Arial',
    },
    displayMode: 'overlay', // overlay, replace, dual
    showOriginal: true,
    realTimeTranslate: true,
    cacheDuration: 7, // 天数
  });

  const handleSwitchChange = (key: string, checked: boolean) => {
    setSubtitleSettings(prev => ({ ...prev, [key]: checked }));
  };

  const handleSelectChange = (key: string, value: string) => {
    setSubtitleSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleNumberChange = (key: string, value: number | null) => {
    if (value !== null) {
      setSubtitleSettings(prev => ({ ...prev, [key]: value }));
    }
  };

  const handleStyleChange = (styleKey: string, value: any) => {
    setSubtitleSettings(prev => ({
      ...prev,
      subtitleStyle: {
        ...prev.subtitleStyle,
        [styleKey]: value
      }
    }));
  };



  return (
    <SettingsPageContainer 
      title={t('字幕翻译')} 
      description={t('配置视频平台字幕翻译和语音生成字幕的相关设置')}
    >
      {/* 字幕翻译总开关 */}
      <SettingsGroup title={t('基础设置')} first>
        <SettingsItem
          label={t('启用字幕翻译')}
          description={t('开启后可以翻译视频平台的字幕和生成语音字幕')}
        >
          <Switch
            checked={subtitleSettings.enabled}
            onChange={(checked) => handleSwitchChange('enabled', checked)}
          />
        </SettingsItem>
      </SettingsGroup>

      {/* 字幕翻译相关设置 */}
      {subtitleSettings.enabled && (
        <>
          <SettingsGroup title={t('平台支持')}>
            <SettingsItem
              label={t('YouTube字幕翻译')}
              description={t('在YouTube视频页面自动翻译字幕')}
            >
              <Switch
                checked={subtitleSettings.supportedPlatforms.youtube}
                onChange={(checked) => setSubtitleSettings(prev => ({
                  ...prev,
                  supportedPlatforms: { ...prev.supportedPlatforms, youtube: checked }
                }))}
              />
            </SettingsItem>

            <SettingsItem
              label={t('Bilibili字幕翻译')}
              description={t('在Bilibili视频页面自动翻译字幕')}
            >
              <Switch
                checked={subtitleSettings.supportedPlatforms.bilibili}
                onChange={(checked) => setSubtitleSettings(prev => ({
                  ...prev,
                  supportedPlatforms: { ...prev.supportedPlatforms, bilibili: checked }
                }))}
              />
            </SettingsItem>

            <SettingsItem
              label={t('Netflix字幕翻译')}
              description={t('在Netflix视频页面自动翻译字幕')}
            >
              <Switch
                checked={subtitleSettings.supportedPlatforms.netflix}
                onChange={(checked) => setSubtitleSettings(prev => ({
                  ...prev,
                  supportedPlatforms: { ...prev.supportedPlatforms, netflix: checked }
                }))}
              />
            </SettingsItem>

            <SettingsItem
              label={t('Prime Video字幕翻译')}
              description={t('在Amazon Prime Video页面自动翻译字幕')}
            >
              <Switch
                checked={subtitleSettings.supportedPlatforms.prime}
                onChange={(checked) => setSubtitleSettings(prev => ({
                  ...prev,
                  supportedPlatforms: { ...prev.supportedPlatforms, prime: checked }
                }))}
              />
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('翻译设置')}>
            <SettingsItem
              label={t('自动检测语言')}
              description={t('自动识别视频字幕的源语言')}
            >
              <Switch
                checked={subtitleSettings.autoDetectLanguage}
                onChange={(checked) => handleSwitchChange('autoDetectLanguage', checked)}
              />
            </SettingsItem>

            <SettingsItem
              label={t('自动翻译字幕')}
              description={t('视频播放时自动翻译显示的字幕')}
            >
              <Switch
                checked={subtitleSettings.autoTranslate}
                onChange={(checked) => handleSwitchChange('autoTranslate', checked)}
              />
            </SettingsItem>

            <SettingsItem
              label={t('实时翻译')}
              description={t('字幕出现时立即进行翻译，而不是等待整句')}
            >
              <Switch
                checked={subtitleSettings.realTimeTranslate}
                onChange={(checked) => handleSwitchChange('realTimeTranslate', checked)}
              />
            </SettingsItem>

            <SettingsItem
              label={t('显示模式')}
              description={t('选择翻译字幕的显示方式')}
            >
              <Radio.Group
                value={subtitleSettings.displayMode}
                onChange={(e) => handleSelectChange('displayMode', e.target.value)}
              >
                <Radio value="overlay">{t('覆盖显示')}</Radio>
                <Radio value="replace">{t('替换原文')}</Radio>
                <Radio value="dual">{t('双语显示')}</Radio>
              </Radio.Group>
            </SettingsItem>

            <SettingsItem
              label={t('显示原文')}
              description={t('翻译后是否同时显示原始字幕')}
            >
              <Switch
                checked={subtitleSettings.showOriginal}
                onChange={(checked) => handleSwitchChange('showOriginal', checked)}
                disabled={subtitleSettings.displayMode === 'dual'}
              />
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('语音识别')}>
            <SettingsItem
              label={t('启用语音字幕')}
              description={t('为没有字幕的视频生成语音识别字幕')}
            >
              <Switch
                checked={subtitleSettings.speechToText.enabled}
                onChange={(checked) => setSubtitleSettings(prev => ({
                  ...prev,
                  speechToText: { ...prev.speechToText, enabled: checked }
                }))}
              />
            </SettingsItem>

            <SettingsItem
              label={t('识别语言')}
              description={t('语音识别的源语言')}
            >
              <Select
                value={subtitleSettings.speechToText.language}
                onChange={(value) => setSubtitleSettings(prev => ({
                  ...prev,
                  speechToText: { ...prev.speechToText, language: value }
                }))}
                style={{ width: 120 }}
                disabled={!subtitleSettings.speechToText.enabled}
              >
                <Option value="auto">{t('自动检测')}</Option>
                <Option value="zh-CN">{t('中文')}</Option>
                <Option value="en">{t('英语')}</Option>
                <Option value="ja">{t('日语')}</Option>
                <Option value="ko">{t('韩语')}</Option>
              </Select>
            </SettingsItem>

            <SettingsItem
              label={t('识别精度')}
              description={t('语音识别的精确度设置')}
            >
              <Select
                value={subtitleSettings.speechToText.accuracy}
                onChange={(value) => setSubtitleSettings(prev => ({
                  ...prev,
                  speechToText: { ...prev.speechToText, accuracy: value }
                }))}
                style={{ width: 120 }}
                disabled={!subtitleSettings.speechToText.enabled}
              >
                <Option value="fast">{t('快速')}</Option>
                <Option value="balanced">{t('平衡')}</Option>
                <Option value="high">{t('高精度')}</Option>
              </Select>
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('显示样式')}>
            <SettingsItem
              label={t('字体大小')}
              description={t('翻译字幕的字体大小')}
            >
              <Slider
                min={12}
                max={32}
                value={subtitleSettings.subtitleStyle.fontSize}
                onChange={(value) => handleStyleChange('fontSize', value)}
                style={{ width: 200 }}
              />
            </SettingsItem>

            <SettingsItem
              label={t('字体')}
              description={t('翻译字幕的字体样式')}
            >
              <Select
                value={subtitleSettings.subtitleStyle.fontFamily}
                onChange={(value) => handleStyleChange('fontFamily', value)}
                style={{ width: 150 }}
              >
                <Option value="Arial">Arial</Option>
                <Option value="SimSun">{t('宋体')}</Option>
                <Option value="SimHei">{t('黑体')}</Option>
                <Option value="Microsoft YaHei">{t('微软雅黑')}</Option>
              </Select>
            </SettingsItem>

            <SettingsItem
              label={t('字幕位置')}
              description={t('翻译字幕在视频中的显示位置')}
            >
              <Radio.Group
                value={subtitleSettings.subtitleStyle.position}
                onChange={(e) => handleStyleChange('position', e.target.value)}
              >
                <Radio value="top">{t('顶部')}</Radio>
                <Radio value="center">{t('居中')}</Radio>
                <Radio value="bottom">{t('底部')}</Radio>
              </Radio.Group>
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('缓存设置')}>
            <SettingsItem
              label={t('缓存翻译结果')}
              description={t('缓存已翻译的字幕以提高加载速度')}
            >
              <InputNumber
                min={0}
                max={30}
                value={subtitleSettings.cacheDuration}
                onChange={(value) => handleNumberChange('cacheDuration', value)}
                addonAfter={t('天')}
                style={{ width: 120 }}
              />
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('快捷操作')}>
            <SettingsItem
              label={t('常用操作')}
              description={t('视频字幕翻译的常用操作')}
            >
              <Space wrap>
                <Button icon={<Icon name="reload" size={16} />} disabled={!subtitleSettings.enabled}>
                  {t('重新识别字幕')}
                </Button>
                <Button icon={<Icon name="download" size={16} />} disabled={!subtitleSettings.enabled}>
                  {t('导出翻译字幕')}
                </Button>
                <Button icon={<Icon name="settings" size={16} />} disabled={!subtitleSettings.enabled}>
                  {t('字幕样式设置')}
                </Button>
                <Button type="link" disabled={!subtitleSettings.enabled}>
                  {t('查看翻译历史')}
                </Button>
              </Space>
            </SettingsItem>
          </SettingsGroup>
        </>
      )}
    </SettingsPageContainer>
  );
};

export default SubtitleTranslateSettings;