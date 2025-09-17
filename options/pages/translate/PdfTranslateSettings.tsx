import React from 'react';
import { Switch, Select, InputNumber, Button, Space, Divider, Radio, Slider } from 'antd';
import { useTranslation } from 'react-i18next';
import Icon from '~lib/components/Icon';
import SettingsPageContainer from '../../components/SettingsPageContainer';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';

const { Option } = Select;

const PdfTranslateSettings: React.FC = () => {
  const { t } = useTranslation();

  // 模拟设置状态（后续需要连接到实际的设置系统）
  const [pdfSettings, setPdfSettings] = React.useState({
    enabled: true,
    autoDetectLanguage: true,
    translateMode: 'overlay', // overlay, replace, side-by-side
    showOriginal: true,
    translationPosition: 'below', // below, above, right
    fontSettings: {
      fontSize: 14,
      fontFamily: 'Arial',
      color: '#000000',
      backgroundColor: 'rgba(255,255,255,0.9)',
    },
    triggerMethod: 'hover', // hover, click, selection
    autoTranslate: false,
    preserveFormatting: true,
    scrollSync: true,
  });

  const handleSwitchChange = (key: string, checked: boolean) => {
    setPdfSettings(prev => ({ ...prev, [key]: checked }));
  };

  const handleSelectChange = (key: string, value: string) => {
    setPdfSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleFontChange = (fontKey: string, value: any) => {
    setPdfSettings(prev => ({
      ...prev,
      fontSettings: {
        ...prev.fontSettings,
        [fontKey]: value
      }
    }));
  };

  return (
    <SettingsPageContainer 
      title={t('PDF文件翻译')} 
      description={t('配置PDF文件翻译的相关设置，支持浏览器中打开的PDF文件翻译')}
    >
      {/* PDF翻译总开关 */}
      <SettingsGroup title={t('基础设置')} first>
        <SettingsItem
          label={t('启用PDF翻译')}
          description={t('开启后可以翻译浏览器中打开的PDF文件')}
        >
          <Switch
            checked={pdfSettings.enabled}
            onChange={(checked) => handleSwitchChange('enabled', checked)}
          />
        </SettingsItem>
      </SettingsGroup>

      {/* PDF翻译相关设置 */}
      {pdfSettings.enabled && (
        <>
          <SettingsGroup title={t('翻译设置')}>
            <SettingsItem
              label={t('自动检测语言')}
              description={t('自动识别PDF文档的源语言')}
            >
              <Switch
                checked={pdfSettings.autoDetectLanguage}
                onChange={(checked) => handleSwitchChange('autoDetectLanguage', checked)}
              />
            </SettingsItem>

            <SettingsItem
              label={t('翻译模式')}
              description={t('选择PDF内容的翻译显示方式')}
            >
              <Radio.Group
                value={pdfSettings.translateMode}
                onChange={(e) => handleSelectChange('translateMode', e.target.value)}
              >
                <Radio value="overlay">{t('覆盖显示')}</Radio>
                <Radio value="replace">{t('替换原文')}</Radio>
                <Radio value="side-by-side">{t('对照显示')}</Radio>
              </Radio.Group>
            </SettingsItem>

            <SettingsItem
              label={t('显示原文')}
              description={t('翻译后是否同时显示原文')}
            >
              <Switch
                checked={pdfSettings.showOriginal}
                onChange={(checked) => handleSwitchChange('showOriginal', checked)}
              />
            </SettingsItem>

            <SettingsItem
              label={t('翻译位置')}
              description={t('选择翻译文本相对于原文的显示位置')}
            >
              <Select
                value={pdfSettings.translationPosition}
                onChange={(value) => handleSelectChange('translationPosition', value)}
                style={{ width: 120 }}
                disabled={pdfSettings.translateMode === 'replace'}
              >
                <Option value="below">{t('下方')}</Option>
                <Option value="above">{t('上方')}</Option>
                <Option value="right">{t('右侧')}</Option>
              </Select>
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('触发设置')}>
            <SettingsItem
              label={t('PDF触发方式')}
              description={t('选择如何触发PDF内容翻译')}
            >
              <Radio.Group
                value={pdfSettings.triggerMethod}
                onChange={(e) => handleSelectChange('triggerMethod', e.target.value)}
              >
                <Radio value="hover">{t('鼠标悬停')}</Radio>
                <Radio value="click">{t('鼠标点击')}</Radio>
                <Radio value="selection">{t('选中文本')}</Radio>
              </Radio.Group>
            </SettingsItem>

            <SettingsItem
              label={t('自动翻译')}
              description={t('打开PDF时自动翻译所有内容')}
            >
              <Switch
                checked={pdfSettings.autoTranslate}
                onChange={(checked) => handleSwitchChange('autoTranslate', checked)}
              />
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('显示设置')}>
            <SettingsItem
              label={t('字体大小')}
              description={t('翻译文本的字体大小')}
            >
              <Slider
                min={10}
                max={24}
                value={pdfSettings.fontSettings.fontSize}
                onChange={(value) => handleFontChange('fontSize', value)}
                style={{ width: 200 }}
              />
            </SettingsItem>

            <SettingsItem
              label={t('字体系列')}
              description={t('翻译文本的字体')}
            >
              <Select
                value={pdfSettings.fontSettings.fontFamily}
                onChange={(value) => handleFontChange('fontFamily', value)}
                style={{ width: 150 }}
              >
                <Option value="Arial">Arial</Option>
                <Option value="SimSun">{t('宋体')}</Option>
                <Option value="SimHei">{t('黑体')}</Option>
                <Option value="Microsoft YaHei">{t('微软雅黑')}</Option>
              </Select>
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('高级设置')}>
            <SettingsItem
              label={t('保持格式')}
              description={t('翻译时保持原文的格式和样式')}
            >
              <Switch
                checked={pdfSettings.preserveFormatting}
                onChange={(checked) => handleSwitchChange('preserveFormatting', checked)}
              />
            </SettingsItem>

            <SettingsItem
              label={t('滚动同步')}
              description={t('翻译内容随页面滚动保持同步')}
            >
              <Switch
                checked={pdfSettings.scrollSync}
                onChange={(checked) => handleSwitchChange('scrollSync', checked)}
              />
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('快捷操作')}>
            <SettingsItem
              label={t('常用操作')}
              description={t('PDF翻译的常用操作')}
            >
              <Space wrap>
                <Button icon={<Icon name="book" size={16} />} disabled={!pdfSettings.enabled}>
                  {t('预览翻译效果')}
                </Button>
                <Button icon={<Icon name="reload" size={16} />} disabled={!pdfSettings.enabled}>
                  {t('重新翻译页面')}
                </Button>
                <Button icon={<Icon name="export" size={16} />} disabled={!pdfSettings.enabled}>
                  {t('导出翻译文本')}
                </Button>
                <Button type="link" disabled={!pdfSettings.enabled}>
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

export default PdfTranslateSettings;