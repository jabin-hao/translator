export interface PageTranslationRuntimeState {
  isPageTranslated: boolean;
  stopTranslation: (() => void) | null;
}

function ensureTranslationState() {
  if (!window.__translationState) {
    window.__translationState = {
      isPageTranslated: false,
      stopTranslation: null
    };
  }

  return window.__translationState;
}

function ensureOriginalPageTextMap() {
  if (!window.__originalPageTextMap) {
    window.__originalPageTextMap = new Map();
  }

  return window.__originalPageTextMap;
}

function ensureOriginalElementHtmlMap() {
  if (!window.__originalPageHtmlMap) {
    window.__originalPageHtmlMap = new Map();
  }

  return window.__originalPageHtmlMap;
}

export function getTranslationState(): PageTranslationRuntimeState {
  return ensureTranslationState();
}

export function setTranslationState(state: PageTranslationRuntimeState) {
  window.__translationState = state;
}

export function saveOriginalTextMap() {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  const originalMap = ensureOriginalPageTextMap();
  originalMap.clear();
  let node: Node | null = walker.nextNode();

  while (node) {
    if (node.nodeValue?.trim()) {
      originalMap.set(node, node.nodeValue);
    }
    node = walker.nextNode();
  }
}

export function restoreOriginalTextMap() {
  const originalMap = ensureOriginalPageTextMap();
  const originalHtmlMap = ensureOriginalElementHtmlMap();

  for (const [element, html] of originalHtmlMap.entries()) {
    try {
      element.innerHTML = html;
      element.removeAttribute('data-block-translated');
    } catch {}
  }

  for (const [node, text] of originalMap.entries()) {
    try {
      node.nodeValue = text;
    } catch {}
  }

  document
    .querySelectorAll('.translation-loading-indicator')
    .forEach((indicator) => indicator.remove());

  document
    .querySelectorAll('[data-translated="true"]')
    .forEach((node) => node.removeAttribute('data-translated'));

  document
    .querySelectorAll('[data-compare-translated="1"]')
    .forEach((span) => {
      const originalText = span.getAttribute('data-compare-original');
      if (originalText && span.parentNode) {
        span.parentNode.replaceChild(document.createTextNode(originalText), span);
      }
    });

  document
    .querySelectorAll('[data-inline-translated="1"]')
    .forEach((span) => {
      const originalText = span.getAttribute('data-inline-original');
      if (originalText && span.parentNode) {
        span.parentNode.replaceChild(document.createTextNode(originalText), span);
      }
    });

  originalMap.clear();
  originalHtmlMap.clear();
}

export function rememberOriginalElementHtml(element: HTMLElement) {
  const originalHtmlMap = ensureOriginalElementHtmlMap();
  if (!originalHtmlMap.has(element)) {
    originalHtmlMap.set(element, element.innerHTML);
  }
}

export function resetAutoTranslateFlag() {
  if (window.__autoFullPageTranslated) {
    delete window.__autoFullPageTranslated;
  }
}
