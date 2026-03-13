import { createCache, StyleProvider } from '@ant-design/cssinjs';
import { App, message } from 'antd';
import type { PlasmoGetShadowHostId } from 'plasmo';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { reset as resetCssinjsCacheMap } from '@ant-design/cssinjs/es/util/cacheMapUtil';

import antdCssText from 'data-text:antd/dist/antd.css';
import antdResetCssText from 'data-text:antd/dist/reset.css';
import contentThemeCssText from 'data-text:./styles/theme.css';
import contentIndexCssText from 'data-text:./styles/index.css';

import i18n, { initI18n } from '../i18n';
import InputTranslateHandler from './components/InputTranslateHandler';
import TranslatorIcon from './components/TranslatorIcon';
import TranslatorResult from './components/TranslatorResult';
import { callTranslateAPI, callTTSAPI, stopTTSAPI } from './content';
import { getIconPosition, getOverlayPosition } from './utils/overlayPosition';
import { mapUiLangToI18nKey } from '~lib/constants/languages';
import { setupMessageHandler } from '~lib/messages/message';
import { hasExtensionContextBeenInvalidated } from '~lib/utils/extensionContext';
import {
  useDomainSettingsData,
  useEngineSettings,
  useInputTranslateSettings,
  useLanguageSettings,
  usePageTranslateSettings,
  useShortcutSettings,
  useSpeechSettings,
  useTextTranslateSettings,
  useThemeSettings,
} from '~lib/settings/settings';
import { ThemeProvider } from '~lib/theme/theme';
import { setupAutoTranslate } from '~lib/translate/page_translate_trigger';
import { setupSelectionHandler } from '~lib/translate/selection';
import { setupShortcutHandler } from '~lib/translate/shortcuts';

const HOST_ID = 'translator-csui';
const RESULT_SIZE = { width: 400, height: 150 };
const ICON_SIZE = { width: 32, height: 32 };

type IconState = {
  x: number;
  y: number;
  text: string;
};

type ResultState = {
  x: number;
  y: number;
  originalText: string;
};

export const getShadowHostId: PlasmoGetShadowHostId = () => HOST_ID;

// Content UI renders inside a shadow root, so it cannot rely on cssinjs cache-path
// markers from the outer document stylesheet. Force runtime style injection here.
resetCssinjsCacheMap({}, false);

export const getStyle = () => {
  const style = document.createElement('style');
  style.textContent = [
    antdCssText,
    antdResetCssText,
    contentThemeCssText,
    contentIndexCssText,
  ].join('\n');
  return style;
};

interface AppContentProps {
  icon: IconState | null;
  result: ResultState | null;
  autoRead: boolean;
  engine: string;
  textTargetLang: string;
  inputTargetLang: string;
  showMessage: (type: 'success' | 'error' | 'warning' | 'info', content: string) => void;
  shouldTranslate: boolean;
  inputTranslateSettings: ReturnType<typeof useInputTranslateSettings>['inputTranslateSettings'];
  handleTranslation: () => void;
  setShouldTranslate: (should: boolean) => void;
  onCloseResult: () => void;
}

const AppContent = ({
  icon,
  result,
  autoRead,
  engine,
  textTargetLang,
  inputTargetLang,
  showMessage,
  shouldTranslate,
  inputTranslateSettings,
  handleTranslation,
  setShouldTranslate,
  onCloseResult,
}: AppContentProps) => {
  return (
    <>
      {icon && (
        <TranslatorIcon
          x={icon.x}
          y={icon.y}
          text={icon.text}
          onClick={handleTranslation}
        />
      )}
      {result && (
        <TranslatorResult
          x={result.x}
          y={result.y}
          text={result.originalText}
          originalText={result.originalText}
          showMessage={showMessage}
          autoRead={autoRead}
          engine={engine}
          onClose={onCloseResult}
          targetLang={textTargetLang}
          shouldTranslate={shouldTranslate}
          onTranslationComplete={() => {}}
          callTranslateAPI={callTranslateAPI}
          callTTSAPI={callTTSAPI}
          stopTTSAPI={stopTTSAPI}
          setShouldTranslate={setShouldTranslate}
        />
      )}
      <InputTranslateHandler
        settings={inputTranslateSettings}
        targetLanguage={inputTargetLang}
        engine={engine}
        callTranslateAPI={callTranslateAPI}
        showMessage={showMessage}
      />
    </>
  );
};

const ContentScript = () => {
  const [icon, setIcon] = useState<IconState | null>(null);
  const [result, setResult] = useState<ResultState | null>(null);
  const [shouldTranslate, setShouldTranslate] = useState(false);
  const [styleContainer, setStyleContainer] = useState<ShadowRoot | null>(() => {
    if (typeof document === 'undefined') {
      return null;
    }

    return document.getElementById(HOST_ID)?.shadowRoot ?? null;
  });

  const { engineSettings } = useEngineSettings();
  const { languageSettings } = useLanguageSettings();
  const { speechSettings } = useSpeechSettings();
  const {
    textTranslateSettings,
    toggleEnabled: toggleTextTranslateEnabled,
  } = useTextTranslateSettings();
  const { inputTranslateSettings } = useInputTranslateSettings();
  const { themeSettings } = useThemeSettings();
  const { shortcutSettings } = useShortcutSettings();
  const { pageTranslateSettings } = usePageTranslateSettings();
  const { getWhitelistedDomains } = useDomainSettingsData();

  const triggerInputTranslateRef = useRef<(() => void) | null>(null);
  const shadowRootRef = useRef<ShadowRoot | null>(null);
  const messageContainerRef = useRef<HTMLDivElement | null>(null);
  const styleCache = useState(() => createCache())[0];
  const [messageApi, messageContextHolder] = message.useMessage({
    top: 20,
    duration: 3,
    maxCount: 3,
    getContainer: () => messageContainerRef.current ?? document.body,
  });
  const showMessage = useCallback(
    (type: 'success' | 'error' | 'warning' | 'info', content: string) => {
      messageApi[type](content).then();
    },
    [messageApi]
  );

  const engine = engineSettings.default;
  const autoRead = speechSettings.autoPlay;
  const textTargetLang = languageSettings.textTarget;
  const pageTargetLang = languageSettings.pageTarget;
  const inputTargetLang = languageSettings.inputTarget;
  const alwaysTranslateLanguages = languageSettings.always;
  const neverTranslateLanguages = languageSettings.never;

  const openResult = useCallback((text: string, rect: DOMRect) => {
    setResult({
      ...getOverlayPosition(rect, RESULT_SIZE),
      originalText: text,
    });
    setShouldTranslate(true);
    setIcon(null);
  }, []);

  const openIcon = useCallback((text: string, rect: DOMRect) => {
    setIcon({
      ...getIconPosition(rect, ICON_SIZE),
      text,
    });
  }, []);

  const clearTranslationState = useCallback(() => {
    setIcon(null);
    setResult(null);
    setShouldTranslate(false);
  }, []);

  const showTranslationIcon = useCallback(
    (text: string, rect: DOMRect, forceTranslate = false) => {
      if (result) {
        return;
      }

      if (textTranslateSettings.pressKeyTranslate && !forceTranslate) {
        return;
      }

      if (textTranslateSettings.selectTranslate || forceTranslate) {
        openResult(text, rect);
        return;
      }

      openIcon(text, rect);
    },
    [
      openIcon,
      openResult,
      result,
      textTranslateSettings.pressKeyTranslate,
      textTranslateSettings.selectTranslate,
    ]
  );

  const triggerTranslation = useCallback(() => {
    const selection = window.getSelection();
    const selectedText = selection?.toString().trim();

    if (!selectedText || !selection || selection.rangeCount === 0) {
      if (icon) {
        setResult({
          x: icon.x,
          y: icon.y + 30,
          originalText: icon.text,
        });
        setShouldTranslate(true);
        setIcon(null);
      }
      return;
    }

    openResult(selectedText, selection.getRangeAt(0).getBoundingClientRect());
  }, [icon, openResult]);

  const handlePageTranslate = useCallback(() => {
    chrome.runtime.sendMessage({
      type: 'FULL_PAGE_TRANSLATE',
      lang: pageTargetLang,
      engine,
    });
  }, [engine, pageTargetLang]);

  useEffect(() => {
    if (themeSettings.uiLanguage) {
      i18n.changeLanguage(mapUiLangToI18nKey(themeSettings.uiLanguage));
    }
  }, [themeSettings.uiLanguage]);

  useLayoutEffect(() => {
    const hostElement = document.getElementById(HOST_ID);
    shadowRootRef.current = hostElement?.shadowRoot ?? null;
    setStyleContainer(hostElement?.shadowRoot ?? null);
  }, []);

  useEffect(() => {
    return setupSelectionHandler(
      shadowRootRef.current,
      showTranslationIcon,
      clearTranslationState,
      textTranslateSettings.enabled,
      {
        selectTranslate: textTranslateSettings.selectTranslate,
        quickTranslate: textTranslateSettings.quickTranslate,
        pressKeyTranslate: textTranslateSettings.pressKeyTranslate,
      }
    );
  }, [clearTranslationState, showTranslationIcon, textTranslateSettings]);

  useEffect(() => {
    // Shortcuts are wired from settings into concrete UI actions here so the registration layer
    // stays generic and this file owns the actual content-script side effects.
    return setupShortcutHandler(
      () => {},
      shortcutSettings.enabled,
      {
        enabled: shortcutSettings.enabled,
        toggleTranslate: shortcutSettings.toggleTranslate,
        textTranslate: shortcutSettings.textTranslate,
        inputTranslate: shortcutSettings.inputTranslate,
        pageTranslate: shortcutSettings.pageTranslate,
      },
      {
        toggleTranslate: () => {
          toggleTextTranslateEnabled();
        },
        textTranslate: () => {
          if (textTranslateSettings.enabled && textTranslateSettings.pressKeyTranslate) {
            triggerTranslation();
          }
        },
        inputTranslate: () => {
          if (inputTranslateSettings.enabled && triggerInputTranslateRef.current) {
            triggerInputTranslateRef.current();
          }
        },
        pageTranslate: handlePageTranslate,
      }
    );
  }, [
    handlePageTranslate,
    inputTranslateSettings.enabled,
    shortcutSettings,
    textTranslateSettings.enabled,
    textTranslateSettings.pressKeyTranslate,
    toggleTextTranslateEnabled,
    triggerTranslation,
  ]);

  useEffect(() => {
    triggerInputTranslateRef.current = inputTranslateSettings.enabled
      ? () => {
          window.triggerInputTranslate?.();
        }
      : null;
  }, [inputTranslateSettings.enabled]);

  useEffect(() => {
    return setupMessageHandler();
  }, []);

  useEffect(() => {
    if (result) {
      setIcon(null);
    }
  }, [result]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    const setup = async () => {
      if (hasExtensionContextBeenInvalidated()) {
        return;
      }

      // Domain data is resolved lazily because whitelist storage is separate from page settings.
      const whitelistedSites = await getWhitelistedDomains();
      if (hasExtensionContextBeenInvalidated()) {
        return;
      }

      cleanup = setupAutoTranslate(
        pageTargetLang,
        engine,
        stopTTSAPI,
        pageTranslateSettings.autoTranslate,
        whitelistedSites,
        pageTranslateSettings.mode || 'translated',
        alwaysTranslateLanguages,
        neverTranslateLanguages
      );
    };

    setup().then();

    return () => {
      cleanup?.();
    };
  }, [
    alwaysTranslateLanguages,
    engine,
    getWhitelistedDomains,
    neverTranslateLanguages,
    pageTargetLang,
    pageTranslateSettings,
  ]);

  window.callTranslateAPI = callTranslateAPI;

  if (!styleContainer) {
    return null;
  }

  return (
    <StyleProvider
      hashPriority="high"
      cache={styleCache}
      container={styleContainer || undefined}
    >
      <ThemeProvider>
        <App>
          {messageContextHolder}
          <div
            id="message-container"
            ref={messageContainerRef}
            style={{
              position: 'fixed',
              inset: 0,
              pointerEvents: 'none',
              zIndex: 2147483647,
            }}
          />
          <AppContent
            icon={icon}
            result={result}
            autoRead={autoRead}
            engine={engine}
            textTargetLang={textTargetLang}
            inputTargetLang={inputTargetLang}
            showMessage={showMessage}
            shouldTranslate={shouldTranslate}
            inputTranslateSettings={inputTranslateSettings}
            handleTranslation={triggerTranslation}
            setShouldTranslate={setShouldTranslate}
            onCloseResult={() => {
              setResult(null);
              setShouldTranslate(false);
            }}
          />
        </App>
      </ThemeProvider>
    </StyleProvider>
  );
};

const ContentRoot = () => {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    initI18n().then(() => setReady(true));
  }, []);

  if (!ready) {
    return null;
  }

  return <ContentScript />;
};

export default ContentRoot;
