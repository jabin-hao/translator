import React, { useEffect, useState } from 'react';
import { App } from 'antd';
import { I18nextProvider } from 'react-i18next';

import { ThemeProvider } from '~lib/theme/theme';
import { initI18n } from '~i18n';
import i18n from '../i18n';
import OptionsInner from './OptionsInner';

const OptionsRoot = () => {
  const [i18nReady, setI18nReady] = useState(false);

  useEffect(() => {
    // Delay rendering until translations are ready so the options page does not
    // flash fallback keys and then re-layout immediately after initialization.
    initI18n()
      .catch((error) => {
        console.error('Failed to initialize options i18n:', error);
      })
      .finally(() => {
        setI18nReady(true);
      });
  }, []);

  if (!i18nReady) {
    return null;
  }

  return (
    <ThemeProvider>
      <I18nextProvider i18n={i18n}>
        <App>
          <OptionsInner />
        </App>
      </I18nextProvider>
    </ThemeProvider>
  );
};

export default OptionsRoot;
