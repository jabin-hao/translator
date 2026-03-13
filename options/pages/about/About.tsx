import React from 'react';
import { useTranslation } from 'react-i18next';

import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import SettingsPageContainer from '../../components/SettingsPageContainer';

const About: React.FC = () => {
  const { t } = useTranslation();

  return (
    <SettingsPageContainer
      title={t('About')}
      description={t('Extension and developer information')}
    >
      <SettingsGroup title={t('Extension information')} first>
        <SettingsItem label={t('Extension name')}>
          <span>{t('Web Translator Extension')}</span>
        </SettingsItem>

        <SettingsItem label={t('Extension features')}>
          <span>{t('This extension supports selection translation, language switching, and automatic translation.')}</span>
        </SettingsItem>

        <SettingsItem label={t('Version')}>
          <span>0.0.0</span>
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t('Developer information')}>
        <SettingsItem label={t('Author')}>
          <span>Jason Hao</span>
        </SettingsItem>

        <SettingsItem label={t('Repository')}>
          <a
            href="https://github.com/jabin-hao/translator"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: 'var(--ant-color-primary)' }}
          >
            https://github.com/jabin-hao/translator
          </a>
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t('Usage help')}>
        <SettingsItem label={t('Basic usage')}>
          <div style={{ fontSize: 13, color: 'var(--ant-color-text-secondary)' }}>
            <div style={{ marginBottom: 4 }}>1. {t('Select text on a web page to show the translation icon, then click it to translate.')}</div>
            <div style={{ marginBottom: 4 }}>2. {t('You can configure auto translation, shortcuts, and more in settings.')}</div>
            <div style={{ marginBottom: 4 }}>3. {t('Supports multiple translation engines, including Google, DeepL, and Bing.')}</div>
            <div style={{ marginBottom: 4 }}>4. {t('You can configure preferred languages and site white/blacklists.')}</div>
            <div style={{ marginBottom: 0 }}>5. {t('All settings can be exported for backup and sync across devices.')}</div>
          </div>
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t('Shortcut usage')}>
        <SettingsItem label={t('Description')}>
          <div style={{ fontSize: 13, lineHeight: 1.6, color: 'var(--ant-color-text-secondary)' }}>
            <p>1. {t('After selecting text, double-press Ctrl to translate quickly.')}</p>
            <p>2. {t('You can set a custom shortcut instead of the default Ctrl double-press.')}</p>
            <p>3. {t('Custom shortcuts support key combinations such as Ctrl+Shift+T.')}</p>
            <p>4. {t('Even with shortcuts disabled, you can still click the translation icon.')}</p>
          </div>
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t('Cache information')}>
        <SettingsItem label={t('Description')}>
          <div style={{ fontSize: 13, color: 'var(--ant-color-text-secondary)' }}>
            <div style={{ marginBottom: 4 }}>1. {t('Translation cache can significantly speed up repeated translations.')}</div>
            <div style={{ marginBottom: 4 }}>2. {t('Cache expires automatically to keep translations fresh.')}</div>
            <div style={{ marginBottom: 4 }}>3. {t('Cache data is stored locally and is not uploaded to a server.')}</div>
            <div style={{ marginBottom: 0 }}>4. {t('Clearing cache does not affect translation, but future requests must be translated again.')}</div>
          </div>
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t('Custom dictionary information')}>
        <SettingsItem label={t('Description')}>
          <div style={{ fontSize: 13, color: 'var(--ant-color-text-secondary)' }}>
            <div style={{ marginBottom: 4 }}>1. {t('You can create site-specific dictionaries to override translation results.')}</div>
            <div style={{ marginBottom: 4 }}>2. {t('Original text must match exactly; case sensitivity is recommended.')}</div>
            <div style={{ marginBottom: 4 }}>3. {t('Custom dictionaries only apply to their matching sites.')}</div>
            <div style={{ marginBottom: 0 }}>4. {t('Dictionary settings are saved to local storage.')}</div>
          </div>
        </SettingsItem>
      </SettingsGroup>
    </SettingsPageContainer>
  );
};

export default About;
