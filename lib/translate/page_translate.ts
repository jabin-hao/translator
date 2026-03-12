import { sendToBackground } from '@plasmohq/messaging';

import {
  addLoadingIndicatorSafely,
  collectAllTextNodes,
  collectBlocksFromRoots,
  collectTextNodesFromRoots,
  collectTranslatableBlocks,
  createTranslatedReplacement,
  createCompareReplacement,
  getElementTextForTranslation,
  hasCompareAncestor,
  hasInlineTranslationAncestor,
  hasSiblingCompareSpan,
  isElementInViewport,
  isInViewport,
  removeLoadingIndicatorSafely,
} from './pageTranslateDom';
import {
  getTranslationState,
  rememberOriginalElementHtml,
  resetAutoTranslateFlag,
  restoreOriginalTextMap,
  saveOriginalTextMap,
  setTranslationState,
} from './pageTranslateRuntime';
import { detectPageLanguage } from './page_language';

type PageTranslateMode = 'translated' | 'compare';
type PageLayoutKind = 'article' | 'app';

type PageTranslateController = {
  stop: () => void;
  setProgressCallback: (callback: (total: number, completed: number) => void) => void;
  getProgress: () => { total: number; completed: number };
};

function getDomain() {
  return location.hostname;
}

function dedupeSpecificRoots(elements: HTMLElement[]) {
  return elements.filter((element, index, array) => {
    return (
      element.isConnected &&
      !array.some(
        (other, otherIndex) => otherIndex !== index && element.contains(other)
      )
    );
  });
}

function isLikelyArticleRoot(element: HTMLElement) {
  const paragraphCount = element.querySelectorAll('p').length;
  const listItemCount = element.querySelectorAll('li').length;
  const interactiveCount = element.querySelectorAll(
    'button, input, select, textarea, [role="button"], [role="tab"], [role="tablist"], [role="navigation"]'
  ).length;
  const textLength = getElementTextForTranslation(element).length;

  if (interactiveCount > 20) {
    return false;
  }

  if (paragraphCount >= 5) {
    return true;
  }

  if (paragraphCount >= 3 && textLength >= 1200) {
    return true;
  }

  if (paragraphCount >= 1 && listItemCount >= 3 && textLength >= 1800) {
    return true;
  }

  return false;
}

function getPageTranslationTargets(): {
  layoutKind: PageLayoutKind;
  blockRoots: HTMLElement[];
  fallbackRoots: HTMLElement[];
} {
  const explicitArticleRoots = dedupeSpecificRoots(
    ['.articlebody', '[itemprop="articleBody"]', '.post-body', '.entry-content', '.article-content']
      .flatMap((selector) => Array.from(document.querySelectorAll<HTMLElement>(selector)))
  );

  if (explicitArticleRoots.length > 0) {
    return {
      layoutKind: 'article',
      blockRoots: explicitArticleRoots,
      fallbackRoots: getFallbackTranslationRoots(explicitArticleRoots),
    };
  }

  const semanticArticleRoots = dedupeSpecificRoots(
    ['article', 'main']
      .flatMap((selector) => Array.from(document.querySelectorAll<HTMLElement>(selector)))
      .filter((element) => isLikelyArticleRoot(element))
  );

  if (semanticArticleRoots.length > 0) {
    return {
      layoutKind: 'article',
      blockRoots: semanticArticleRoots,
      fallbackRoots: getFallbackTranslationRoots(semanticArticleRoots),
    };
  }

  return {
    layoutKind: 'app',
    blockRoots: [],
    fallbackRoots: [document.body],
  };
}

function getFallbackTranslationRoots(blockRoots: HTMLElement[]) {
  const roots = [...blockRoots];

  if (document.body && !roots.includes(document.body)) {
    roots.push(document.body);
  }

  return roots;
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
      options: { from, to, engine, useCache: false },
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
  let translatedBlocks = new Set<HTMLElement>();
  let isStopped = false;
  let totalNodes = 0;
  let completedNodes = 0;
  let isPassRunning = false;
  let rerunRequested = false;
  let progressCallback: ((total: number, completed: number) => void) | null = null;
  const sourceLang = detectPageLanguage() || 'auto';
  const { layoutKind, blockRoots, fallbackRoots } = getPageTranslationTargets();

  saveOriginalTextMap();

  async function translateVisible() {
    if (isStopped || isPassRunning) {
      rerunRequested = rerunRequested || !isStopped;
      return;
    }

    isPassRunning = true;

    try {
      do {
        rerunRequested = false;

        if (mode === 'translated' && layoutKind === 'article') {
          const blocks = collectBlocksFromRoots(blockRoots, translatedBlocks);
          const visibleBlocks = blocks.filter((element) => isElementInViewport(element));
          const deferredBlocks = blocks.filter((element) => !isElementInViewport(element));
          const orderedBlocks = [...visibleBlocks, ...deferredBlocks];

          if (orderedBlocks.length > 0) {
            totalNodes = Math.max(totalNodes, completedNodes + orderedBlocks.length);
            progressCallback?.(totalNodes, completedNodes);

            const batchSize = 12;

            for (let index = 0; index < orderedBlocks.length; index += batchSize) {
              if (isStopped) {
                break;
              }

              const batch = orderedBlocks.slice(index, index + batchSize);
              const texts = batch.map((element) => getElementTextForTranslation(element));
              let translatedTexts = texts;

              try {
                translatedTexts = await batchTranslateTexts(texts, sourceLang, targetLang, engine);
              } catch {
                translatedTexts = texts;
              }

              for (let batchIndex = 0; batchIndex < batch.length; batchIndex += 1) {
                if (isStopped) {
                  break;
                }

                const element = batch[batchIndex];
                const translatedText = translatedTexts[batchIndex];

                if (!element?.isConnected) {
                  continue;
                }

                const originalText = texts[batchIndex];
                if (!translatedText?.trim() || translatedText.trim() === originalText.trim()) {
                  continue;
                }

                rememberOriginalElementHtml(element);
                element.textContent = translatedText;
                element.setAttribute('data-translated', 'true');
                element.setAttribute('data-block-translated', 'true');
                translatedBlocks.add(element);
                completedNodes += 1;
                progressCallback?.(totalNodes, completedNodes);
              }
            }
          }
        }

        const nodes = collectTextNodesFromRoots(fallbackRoots, translatedSet, mode);
        const visibleNodes = nodes.filter((node) => isInViewport(node));
        const deferredNodes = nodes.filter((node) => !isInViewport(node));
        const orderedNodes = [...visibleNodes, ...deferredNodes];

        if (orderedNodes.length === 0) {
          continue;
        }

        const validNodes = orderedNodes.filter(
          (node) =>
            !!node.parentNode &&
            !hasInlineTranslationAncestor(node) &&
            !node.parentElement?.closest('[data-block-translated="true"]') &&
            !(mode === 'compare' && (hasCompareAncestor(node) || hasSiblingCompareSpan(node)))
        );

        if (validNodes.length === 0) {
          continue;
        }

        totalNodes = Math.max(totalNodes, completedNodes + validNodes.length);
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
            translatedTexts = await batchTranslateTexts(texts, sourceLang, targetLang, engine);
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
              if (translatedText?.trim() && translatedText.trim() !== originalText.trim()) {
                const replacement = createTranslatedReplacement(originalText, translatedText);
                node.parentNode.replaceChild(replacement, node);
                translatedSet.add(node);
                completedNodes += 1;
                progressCallback?.(totalNodes, completedNodes);
              } else {
                translatedSet.add(node);
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
              translatedSet.add(node);
              completedNodes += 1;
              progressCallback?.(totalNodes, completedNodes);
            }
          }
        }
      } while (!isStopped && rerunRequested);
    } finally {
      isPassRunning = false;
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
