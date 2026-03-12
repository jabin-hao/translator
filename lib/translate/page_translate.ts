import { sendToBackground } from '@plasmohq/messaging';

import {
  addLoadingIndicatorSafely,
  collectAllTextNodes,
  createCompareReplacement,
  hasCompareAncestor,
  hasSiblingCompareSpan,
  isInViewport,
  removeLoadingIndicatorSafely,
} from './pageTranslateDom';
import {
  getTranslationState,
  resetAutoTranslateFlag,
  restoreOriginalTextMap,
  saveOriginalTextMap,
  setTranslationState,
} from './pageTranslateRuntime';

type PageTranslateMode = 'translated' | 'compare';

type PageTranslateController = {
  stop: () => void;
  setProgressCallback: (callback: (total: number, completed: number) => void) => void;
  getProgress: () => { total: number; completed: number };
};

function getDomain() {
  return location.hostname;
}

async function batchTranslateTexts(
  texts: string[],
  from: string,
  to: string,
  engine: string
): Promise<string[]> {
  const response = await sendToBackground({
    name: 'handle' as never,
    body: {
      service: 'translate',
      action: 'translateBatch',
      texts,
      host: getDomain(),
      options: { from, to, engine },
    },
  });

  if (response?.success && Array.isArray(response.data)) {
    return response.data.map((item: { translation?: string }) => item.translation || '');
  }

  console.error('[fullPageTranslate] Translation failed:', response);
  return texts;
}

function cleanupTranslatedPage() {
  restoreOriginalTextMap();

  const state = getTranslationState();
  state.stopTranslation = null;
  state.isPageTranslated = false;
  setTranslationState(state);
  resetAutoTranslateFlag();
}

export async function lazyFullPageTranslate(
  targetLang: string,
  mode: PageTranslateMode,
  engine: string
): Promise<PageTranslateController> {
  if (typeof window.callTranslateAPI !== 'function') {
    throw new Error('callTranslateAPI not found on window');
  }

  let translatedSet = new Set<Text>();
  let isStopped = false;
  let totalNodes = 0;
  let completedNodes = 0;
  let progressCallback: ((total: number, completed: number) => void) | null = null;

  saveOriginalTextMap();

  async function translateVisible() {
    if (isStopped) {
      return;
    }

    const nodes = collectAllTextNodes(document.body, translatedSet, mode);
    const visibleNodes = nodes.filter((node) => isInViewport(node));

    if (visibleNodes.length === 0) {
      return;
    }

    const validNodes = visibleNodes.filter(
      (node) =>
        !!node.parentNode &&
        !(mode === 'compare' && (hasCompareAncestor(node) || hasSiblingCompareSpan(node)))
    );

    if (validNodes.length === 0) {
      return;
    }

    totalNodes = Math.max(totalNodes, validNodes.length);
    progressCallback?.(totalNodes, completedNodes);

    const batchSize = 20;

    for (let index = 0; index < validNodes.length; index += batchSize) {
      if (isStopped) {
        break;
      }

      const batch = validNodes.slice(index, index + batchSize);
      batch.forEach((node) => {
        addLoadingIndicatorSafely(node);
      });

      const texts = batch.map((node) => node.nodeValue || '');
      let translatedTexts = texts;

      try {
        translatedTexts = await batchTranslateTexts(texts, 'auto', targetLang, engine);
      } catch {
        translatedTexts = texts;
      }

      for (let batchIndex = 0; batchIndex < batch.length; batchIndex += 1) {
        if (isStopped) {
          break;
        }

        const node = batch[batchIndex];
        const translatedText = translatedTexts[batchIndex];

        if (!node?.parentNode || !node.nodeValue) {
          continue;
        }

        removeLoadingIndicatorSafely(node);

        const originalText = node.nodeValue;

        if (mode === 'translated') {
          if (translatedText?.trim()) {
            node.nodeValue = translatedText;
            translatedSet.add(node);
            completedNodes += 1;
            node.parentElement?.setAttribute('data-translated', 'true');
          }
        } else {
          const originalColor = node.parentElement
            ? window.getComputedStyle(node.parentElement).color || ''
            : '';
          const compareNode = createCompareReplacement(
            originalText,
            translatedText || originalText,
            originalColor
          );
          node.parentNode.replaceChild(compareNode, node);
          completedNodes += 1;
        }

        progressCallback?.(totalNodes, completedNodes);
      }
    }
  }

  await translateVisible();

  const handleScroll = () => {
    void translateVisible();
  };
  const handleResize = () => {
    void translateVisible();
  };
  const observer = new MutationObserver(() => {
    void translateVisible();
  });

  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleResize);
  observer.observe(document.body, { childList: true, subtree: true });

  return {
    stop: () => {
      isStopped = true;
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      cleanupTranslatedPage();
    },
    setProgressCallback: (callback) => {
      progressCallback = callback;
    },
    getProgress: () => ({
      total: totalNodes,
      completed: completedNodes,
    }),
  };
}

export const getPageTranslationStatus = () => getTranslationState().isPageTranslated;

export const restoreOriginalPage = () => {
  const state = getTranslationState();
  state.stopTranslation?.();
  cleanupTranslatedPage();
};
