import React, { useState } from 'react';
import { Button, Radio, Select, Slider, Space, Switch } from 'antd';
import { useTranslation } from 'react-i18next';

import Icon from '~lib/components/Icon';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import SettingsPageContainer from '../../components/SettingsPageContainer';

type PdfTranslateMode = 'overlay' | 'replace' | 'side-by-side';
type PdfTranslationPosition = 'below' | 'above' | 'right';
type PdfTriggerMethod = 'hover' | 'click' | 'selection';

type PdfFontSettings = {
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
};

type PdfSettingsState = {
  enabled: boolean;
  autoDetectLanguage: boolean;
  translateMode: PdfTranslateMode;
  showOriginal: boolean;
  translationPosition: PdfTranslationPosition;
  fontSettings: PdfFontSettings;
  triggerMethod: PdfTriggerMethod;
  autoTranslate: boolean;
  preserveFormatting: boolean;
  scrollSync: boolean;
};

const PdfTranslateSettings: React.FC = () => {
  const { t } = useTranslation();
  const [pdfSettings, setPdfSettings] = useState<PdfSettingsState>({
    enabled: true,
    autoDetectLanguage: true,
    translateMode: 'overlay',
    showOriginal: true,
    translationPosition: 'below',
    fontSettings: {
      fontSize: 14,
      fontFamily: 'Arial',
      color: '#000000',
      backgroundColor: 'rgba(255,255,255,0.9)',
    },
    triggerMethod: 'hover',
    autoTranslate: false,
    preserveFormatting: true,
    scrollSync: true,
  });

  const updateSetting = <K extends keyof PdfSettingsState>(key: K, value: PdfSettingsState[K]) => {
    setPdfSettings((current) => ({ ...current, [key]: value }));
  };

  const updateFontSetting = <K extends keyof PdfFontSettings>(
    key: K,
    value: PdfFontSettings[K]
  ) => {
    setPdfSettings((current) => ({
      ...current,
      fontSettings: {
        ...current.fontSettings,
        [key]: value,
      },
    }));
  };

  return (
    <SettingsPageContainer
      title={t('PDF translation')}
      description={t('Configure translation behavior for PDF documents opened in the browser')}
    >
      <SettingsGroup title={t('Basic settings')} first>
        <SettingsItem
          label={t('Enable PDF translation')}
          description={t('Allow translating PDF documents opened in the browser')}
        >
          <Switch checked={pdfSettings.enabled} onChange={(checked) => updateSetting('enabled', checked)} />
        </SettingsItem>
      </SettingsGroup>

      {pdfSettings.enabled && (
        <>
          <SettingsGroup title={t('Translation settings')}>
            <SettingsItem
              label={t('Auto detect language')}
              description={t('Detect the source language automatically')}
            >
              <Switch
                checked={pdfSettings.autoDetectLanguage}
                onChange={(checked) => updateSetting('autoDetectLanguage', checked)}
              />
            </SettingsItem>

            <SettingsItem
              label={t('Translate mode')}
              description={t('Choose how translated PDF text should be displayed')}
            >
              <Radio.Group
                value={pdfSettings.translateMode}
                onChange={(event) => updateSetting('translateMode', event.target.value as PdfTranslateMode)}
              >
                <Radio value="overlay">{t('Overlay')}</Radio>
                <Radio value="replace">{t('Replace original')}</Radio>
                <Radio value="side-by-side">{t('Side by side')}</Radio>
              </Radio.Group>
            </SettingsItem>

            <SettingsItem
              label={t('Show original')}
              description={t('Keep original text visible with the translation')}
            >
              <Switch checked={pdfSettings.showOriginal} onChange={(checked) => updateSetting('showOriginal', checked)} />
            </SettingsItem>

            <SettingsItem
              label={t('Translation position')}
              description={t('Choose where translated text appears relative to the original')}
            >
              <Select
                value={pdfSettings.translationPosition}
                onChange={(value) => updateSetting('translationPosition', value)}
                style={{ width: 140 }}
                disabled={pdfSettings.translateMode === 'replace'}
              >
                <Select.Option value="below">{t('Below')}</Select.Option>
                <Select.Option value="above">{t('Above')}</Select.Option>
                <Select.Option value="right">{t('Right')}</Select.Option>
              </Select>
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('Trigger settings')}>
            <SettingsItem
              label={t('Trigger method')}
              description={t('Choose how PDF translation is triggered')}
            >
              <Radio.Group
                value={pdfSettings.triggerMethod}
                onChange={(event) => updateSetting('triggerMethod', event.target.value as PdfTriggerMethod)}
              >
                <Radio value="hover">{t('Hover')}</Radio>
                <Radio value="click">{t('Click')}</Radio>
                <Radio value="selection">{t('Selection')}</Radio>
              </Radio.Group>
            </SettingsItem>

            <SettingsItem
              label={t('Auto translate')}
              description={t('Translate the document automatically when it opens')}
            >
              <Switch checked={pdfSettings.autoTranslate} onChange={(checked) => updateSetting('autoTranslate', checked)} />
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('Display settings')}>
            <SettingsItem
              label={t('Font size')}
              description={t('Control translated text size')}
            >
              <Slider
                min={10}
                max={24}
                value={pdfSettings.fontSettings.fontSize}
                onChange={(value) => updateFontSetting('fontSize', value)}
                style={{ width: 200 }}
              />
            </SettingsItem>

            <SettingsItem
              label={t('Font family')}
              description={t('Choose the font used for translated text')}
            >
              <Select
                value={pdfSettings.fontSettings.fontFamily}
                onChange={(value) => updateFontSetting('fontFamily', value)}
                style={{ width: 160 }}
              >
                <Select.Option value="Arial">Arial</Select.Option>
                <Select.Option value="SimSun">{t('SimSun')}</Select.Option>
                <Select.Option value="SimHei">{t('SimHei')}</Select.Option>
                <Select.Option value="Microsoft YaHei">{t('Microsoft YaHei')}</Select.Option>
              </Select>
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('Advanced settings')}>
            <SettingsItem
              label={t('Preserve formatting')}
              description={t('Keep the original layout and formatting where possible')}
            >
              <Switch
                checked={pdfSettings.preserveFormatting}
                onChange={(checked) => updateSetting('preserveFormatting', checked)}
              />
            </SettingsItem>

            <SettingsItem
              label={t('Scroll sync')}
              description={t('Keep translated overlays aligned while scrolling')}
            >
              <Switch checked={pdfSettings.scrollSync} onChange={(checked) => updateSetting('scrollSync', checked)} />
            </SettingsItem>
          </SettingsGroup>

          <SettingsGroup title={t('Quick actions')}>
            <SettingsItem
              label={t('Common actions')}
              description={t('Preview and maintenance actions for PDF translation')}
            >
              <Space wrap>
                <Button icon={<Icon name="book" size={16} />} disabled={!pdfSettings.enabled}>
                  {t('Preview translation')}
                </Button>
                <Button icon={<Icon name="reload" size={16} />} disabled={!pdfSettings.enabled}>
                  {t('Retranslate page')}
                </Button>
                <Button icon={<Icon name="export" size={16} />} disabled={!pdfSettings.enabled}>
                  {t('Export translated text')}
                </Button>
                <Button type="link" disabled={!pdfSettings.enabled}>
                  {t('View translation history')}
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
