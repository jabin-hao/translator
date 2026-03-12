import { lazyFullPageTranslate } from '~lib/translate/page_translate';
import { resolvePageTranslationPolicy } from '~lib/translate/page_language';

const notifyTranslationDone = () => {
  if (!chrome?.runtime?.id) {
    return;
  }

  void chrome.runtime.sendMessage({ type: 'FULL_PAGE_TRANSLATE_DONE' }).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('message channel closed before a response was received')) {
      return;
    }

    console.error('Failed to notify auto translation completion:', error);
  });
};

export const setupAutoTranslate = (
  pageTargetLang: string,
  engine: string,
  stopTTSAPI: () => Promise<void>,
  autoTranslateEnabled = false,
  whitelistedSites: string[] = [],
  mode: 'translated' | 'compare' = 'translated',
  alwaysLanguages: string[] = [],
  neverLanguages: string[] = []
) => {
  const triggerFullPageTranslation = async () => {
    if (!autoTranslateEnabled || window.__autoFullPageTranslated) {
      return;
    }

    const policy = resolvePageTranslationPolicy({
      alwaysLanguages,
      neverLanguages,
      whitelistedSites,
      targetLanguage: pageTargetLang,
    });

    if (!policy.shouldAutoTranslate) {
      return;
    }

    try {
      window.__autoFullPageTranslated = true;
      const result = await lazyFullPageTranslate(pageTargetLang, mode, engine);

      if (window.__translationState) {
        window.__translationState.stopTranslation = result.stop;
        window.__translationState.isPageTranslated = true;
      }

      notifyTranslationDone();
    } catch (error) {
      console.error('Auto page translation failed:', error);
    }
  };

  const handleLoad = () => {
    setTimeout(() => {
      void triggerFullPageTranslation();
    }, 100);
  };

  const handleBeforeUnload = () => {
    void stopTTSAPI();
  };

  const handleContentChange = () => {
    void triggerFullPageTranslation();
  };

  const handleReadyStateChange = () => {
    if (document.readyState === 'interactive') {
      handleContentChange();
    }
  };

  window.addEventListener('beforeunload', handleBeforeUnload);
  window.addEventListener('load', handleLoad);
  document.addEventListener('DOMContentLoaded', handleContentChange);
  document.addEventListener('readystatechange', handleReadyStateChange);

  if (document.readyState === 'complete') {
    setTimeout(() => {
      void triggerFullPageTranslation();
    }, 100);
  }

  return () => {
    window.removeEventListener('beforeunload', handleBeforeUnload);
    window.removeEventListener('load', handleLoad);
    document.removeEventListener('DOMContentLoaded', handleContentChange);
    document.removeEventListener('readystatechange', handleReadyStateChange);
  };
};
