import React, { useEffect, useState } from 'react';
import { App, Button, Select, Tag } from 'antd';
import { useTranslation } from 'react-i18next';

import Icon from '~lib/components/Icon';
import { getLocalizedLangLabel, LANGUAGES } from '~lib/constants/languages';
import { useLanguageSettings } from '~lib/settings/settings';
import SettingsGroup from '../../components/SettingsGroup';
import SettingsItem from '../../components/SettingsItem';
import SettingsPageContainer from '../../components/SettingsPageContainer';

const LanguageSettings: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { message } = App.useApp();
  const {
    languageSettings,
    setPageTargetLanguage,
    setTextTargetLanguage,
    setInputTargetLanguage,
    addFavoriteLanguage,
    removeFavoriteLanguage,
    addNeverLanguage,
    removeNeverLanguage,
    addAlwaysLanguage,
    removeAlwaysLanguage
  } = useLanguageSettings();

  const [favoriteCandidate, setFavoriteCandidate] = useState<string>();
  const [neverCandidate, setNeverCandidate] = useState<string>();
  const [alwaysCandidate, setAlwaysCandidate] = useState<string>();

  const { pageTarget, textTarget, inputTarget, favorites, never, always } = languageSettings;

  useEffect(() => {
    if (textTarget) {
      return;
    }

    const defaultTextLang =
      favorites[0] ||
      (navigator.language.startsWith('zh')
        ? 'zh-CN'
        : navigator.language.startsWith('en')
          ? 'en'
          : 'zh-CN');

    void setTextTargetLanguage(defaultTextLang);
  }, [favorites, setTextTargetLanguage, textTarget]);

  const languageOptions = LANGUAGES.map((language) => ({
    label: getLocalizedLangLabel(language.code, i18n.language),
    value: language.code
  }));

  const saveAndNotify = async (action: () => Promise<unknown>) => {
    await action();
    message.success(t('Saved'));
  };

  return (
    <SettingsPageContainer
      title={t('Language settings')}
      description={t('Configure target languages and language preferences')}
    >
      <SettingsGroup title={t('Target languages')} first>
        <SettingsItem
          label={t('Page translation target')}
          description={t('Target language for full-page translation')}
        >
          <Select
            value={pageTarget}
            options={languageOptions}
            onChange={(value) => saveAndNotify(() => setPageTargetLanguage(value))}
            style={{ width: 240 }}
            size="middle"
          />
        </SettingsItem>

        <SettingsItem
          label={t('Text translation target')}
          description={t('Default target language for selection and quick translation')}
        >
          <Select
            value={textTarget}
            options={languageOptions}
            onChange={(value) => saveAndNotify(() => setTextTargetLanguage(value))}
            style={{ width: 240 }}
            size="middle"
          />
        </SettingsItem>

        <SettingsItem
          label={t('Input translation target')}
          description={t('Dedicated target language for input translation')}
        >
          <Select
            value={inputTarget}
            options={languageOptions}
            onChange={(value) => saveAndNotify(() => setInputTargetLanguage(value))}
            style={{ width: 240 }}
            size="middle"
            placeholder={t('Select a language')}
          />
        </SettingsItem>
      </SettingsGroup>

      <SettingsGroup title={t('Language preferences')}>
        <SettingsItem
          label={t('Favorite languages')}
          description={t('Preferred target languages, up to 3')}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Select
                value={favoriteCandidate}
                options={LANGUAGES.filter((language) => !favorites.includes(language.code)).map((language) => ({
                  label: getLocalizedLangLabel(language.code, i18n.language),
                  value: language.code
                }))}
                onChange={setFavoriteCandidate}
                style={{ width: 200 }}
                size="middle"
                placeholder={t('Select a language')}
                allowClear
              />
              <Button
                icon={<Icon name="plus" size={16} />}
                onClick={() =>
                  saveAndNotify(async () => {
                    if (!favoriteCandidate) {
                      return;
                    }
                    if (favorites.length >= 3) {
                      message.warning(t('You can select up to 3 favorite languages'));
                      return;
                    }
                    await addFavoriteLanguage(favoriteCandidate);
                    setFavoriteCandidate(undefined);
                  })
                }
                disabled={!favoriteCandidate || favorites.length >= 3}
                size="middle"
              >
                {t('Add')}
              </Button>
            </div>
            <div>
              {favorites.map((language) => (
                <Tag
                  key={language}
                  closable
                  onClose={() => {
                    void saveAndNotify(() => removeFavoriteLanguage(language));
                  }}
                  color="blue"
                  style={{ marginBottom: 4 }}
                >
                  {getLocalizedLangLabel(language, i18n.language)}
                </Tag>
              ))}
            </div>
          </div>
        </SettingsItem>

        <SettingsItem
          label={t('Never translate these languages')}
          description={t('These languages will not be translated automatically')}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Select
                value={neverCandidate}
                options={LANGUAGES.filter((language) => !never.includes(language.code)).map((language) => ({
                  label: getLocalizedLangLabel(language.code, i18n.language),
                  value: language.code
                }))}
                onChange={setNeverCandidate}
                style={{ width: 200 }}
                size="middle"
                placeholder={t('Select a language')}
                allowClear
              />
              <Button
                icon={<Icon name="plus" size={16} />}
                onClick={() =>
                  saveAndNotify(async () => {
                    if (!neverCandidate) {
                      return;
                    }
                    await addNeverLanguage(neverCandidate);
                    setNeverCandidate(undefined);
                  })
                }
                disabled={!neverCandidate}
                size="middle"
              >
                {t('Add')}
              </Button>
            </div>
            <div>
              {never.map((language) => (
                <Tag
                  key={language}
                  closable
                  onClose={() => {
                    void saveAndNotify(() => removeNeverLanguage(language));
                  }}
                  color="red"
                  style={{ marginBottom: 4 }}
                >
                  {getLocalizedLangLabel(language, i18n.language)}
                </Tag>
              ))}
            </div>
          </div>
        </SettingsItem>

        <SettingsItem
          label={t('Always translate these languages')}
          description={t('These languages will always be translated to your target language')}
        >
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <Select
                value={alwaysCandidate}
                options={LANGUAGES.filter((language) => !always.includes(language.code)).map((language) => ({
                  label: getLocalizedLangLabel(language.code, i18n.language),
                  value: language.code
                }))}
                onChange={setAlwaysCandidate}
                style={{ width: 200 }}
                size="middle"
                placeholder={t('Select a language')}
                allowClear
              />
              <Button
                icon={<Icon name="plus" size={16} />}
                onClick={() =>
                  saveAndNotify(async () => {
                    if (!alwaysCandidate) {
                      return;
                    }
                    await addAlwaysLanguage(alwaysCandidate);
                    setAlwaysCandidate(undefined);
                  })
                }
                disabled={!alwaysCandidate}
                size="middle"
              >
                {t('Add')}
              </Button>
            </div>
            <div>
              {always.map((language) => (
                <Tag
                  key={language}
                  closable
                  onClose={() => {
                    void saveAndNotify(() => removeAlwaysLanguage(language));
                  }}
                  color="green"
                  style={{ marginBottom: 4 }}
                >
                  {getLocalizedLangLabel(language, i18n.language)}
                </Tag>
              ))}
            </div>
          </div>
        </SettingsItem>
      </SettingsGroup>
    </SettingsPageContainer>
  );
};

export default LanguageSettings;
