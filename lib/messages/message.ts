import { Storage } from '@plasmohq/storage';

import type { GlobalSettings } from '~lib/constants/types';
import { DEFAULT_SETTINGS, GLOBAL_SETTINGS_KEY } from '~lib/settings/settings';
import {
  getPageTranslationStatus,
  lazyFullPageTranslate,
  restoreOriginalPage,
} from '~lib/translate/page_translate';

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

type RuntimeMessage =
  | { type: 'SHOW_INPUT_TRANSLATOR' }
  | { type: 'FULL_PAGE_TRANSLATE'; lang: string; engine: string }
  | { type: 'RESTORE_ORIGINAL_PAGE' }
  | { type: 'CHECK_PAGE_TRANSLATED' };

export const setupMessageHandler = (setShowInputTranslator?: (show: boolean) => void) => {
  if (typeof window === 'undefined' || !chrome?.runtime?.onMessage) {
    return () => {};
  }

  const listener = (
    msg: RuntimeMessage,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ) => {
    if (msg.type === 'SHOW_INPUT_TRANSLATOR') {
      if (!setShowInputTranslator) {
        sendResponse({ success: false, error: 'Input translator handler unavailable' });
        return true;
      }

      setShowInputTranslator(true);
      sendResponse({ success: true });
      return true;
    }

    if (msg.type === 'FULL_PAGE_TRANSLATE') {
      void (async () => {
        try {
          const settings = await getGlobalSettings();
          const mode = (settings.pageTranslate.mode || 'translated') as
            | 'translated'
            | 'compare';
          const result = await lazyFullPageTranslate(msg.lang, mode, msg.engine);
          const state = (window as unknown as { __translationState?: TranslationState })
            .__translationState;

          if (state) {
            state.stopTranslation = result.stop;
            state.isPageTranslated = true;
          }

          sendResponse({ success: true });

          if (chrome?.runtime?.id) {
            try {
              await chrome.runtime.sendMessage({ type: 'FULL_PAGE_TRANSLATE_DONE' });
            } catch (error) {
              console.error('Failed to notify translation completion:', error);
            }
          }
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

      if (chrome?.runtime?.id) {
        void chrome.runtime
          .sendMessage({ type: 'RESTORE_ORIGINAL_PAGE_DONE' })
          .catch((error) => {
            console.error('Failed to notify page restore completion:', error);
          });
      }

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
