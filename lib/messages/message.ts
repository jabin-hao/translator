import { Storage } from '@plasmohq/storage';

import type { GlobalSettings } from '~lib/constants/types';
import { DEFAULT_SETTINGS, GLOBAL_SETTINGS_KEY } from '~lib/settings/settings';
import {
  getPageTranslationStatus,
  lazyFullPageTranslate,
  restoreOriginalPage,
} from '~lib/translate/page_translate';
import { resolvePageTranslationPolicy } from '~lib/translate/page_language';

const storage = new Storage();

const getGlobalSettings = async (): Promise<GlobalSettings> => {
  const settings = await storage.get(GLOBAL_SETTINGS_KEY);

  if (typeof settings === 'string') {
    try {
      return JSON.parse(settings);
    } catch {
      return DEFAULT_SETTINGS;
    }
  }

  return settings || DEFAULT_SETTINGS;
};

const notifyRuntimeMessage = (type: 'FULL_PAGE_TRANSLATE_DONE' | 'RESTORE_ORIGINAL_PAGE_DONE') => {
  if (!chrome?.runtime?.id) {
    return;
  }

  void chrome.runtime.sendMessage({ type }).catch((error) => {
    const message = error instanceof Error ? error.message : String(error);

    if (message.includes('message channel closed before a response was received')) {
      return;
    }

    console.error(`Failed to notify runtime message "${type}":`, error);
  });
};

type RuntimeMessage =
  | { type: 'FULL_PAGE_TRANSLATE'; lang: string; engine: string }
  | { type: 'RESTORE_ORIGINAL_PAGE' }
  | { type: 'CHECK_PAGE_TRANSLATED' };

export const setupMessageHandler = () => {
  if (typeof window === 'undefined' || !chrome?.runtime?.onMessage) {
    return () => {};
  }

  const listener = (
    msg: RuntimeMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    if (msg.type === 'FULL_PAGE_TRANSLATE') {
      void (async () => {
        try {
          const settings = await getGlobalSettings();
          const mode = (settings.pageTranslate.mode || 'translated') as
            | 'translated'
            | 'compare';
          const policy = resolvePageTranslationPolicy({
            alwaysLanguages: settings.languages.always,
            neverLanguages: settings.languages.never,
            targetLanguage: msg.lang,
          });

          if (!policy.canTranslatePage) {
            sendResponse({
              success: false,
              error:
                policy.reason === 'already_target_language'
                  ? 'Page is already in the target language'
                  : 'Page language is excluded from translation',
            });
            return;
          }

          const state = (window as unknown as { __translationState?: TranslationState })
            .__translationState;

          state?.stopTranslation?.();

          const result = await lazyFullPageTranslate(msg.lang, mode, msg.engine);

          if (state) {
            state.stopTranslation = result.stop;
            state.isPageTranslated = true;
          }

          sendResponse({ success: true });

          notifyRuntimeMessage('FULL_PAGE_TRANSLATE_DONE');
        } catch (error) {
          console.error('Full page translation failed:', error);
          sendResponse({
            success: false,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      })();

      return true;
    }

    if (msg.type === 'RESTORE_ORIGINAL_PAGE') {
      restoreOriginalPage();
      sendResponse({ success: true });

      notifyRuntimeMessage('RESTORE_ORIGINAL_PAGE_DONE');

      return true;
    }

    if (msg.type === 'CHECK_PAGE_TRANSLATED') {
      sendResponse({ translated: getPageTranslationStatus() });
      return true;
    }

    return false;
  };

  chrome.runtime.onMessage.addListener(listener);
  return () => chrome.runtime.onMessage.removeListener(listener);
};
