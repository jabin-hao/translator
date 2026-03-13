import {
  BLOCKED_TRANSLATION_TAGS,
  CODE_CLASS_TOKENS,
  CODE_CONTAINER_SELECTORS,
  CODE_LIKE_FILE_SUFFIXES,
  PROGRAMMING_LANGUAGE_TOKENS,
} from '../constants/contentGuards';

let compareIdCounter = 1;
const TRANSLATABLE_BLOCK_TAGS = new Set([
  'p',
  'li',
  'blockquote',
  'figcaption',
  'dd',
  'dt',
  'h1',
  'h2',
  'h3',
  'h4',
  'h5',
  'h6',
]);

export function isInViewport(node: Text): boolean {
  const element = node.parentElement;
  if (!element) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

export function isElementInViewport(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

const FORM_CONTROL_CLASS_TOKENS = [
  'input',
  'textarea',
  'select',
  'ant-input',
  'ant-select',
  'form-control',
  'search-input',
  'search-box',
  'editor-input'
];

const DECORATIVE_CLASS_TOKENS = ['icon-font'];
const STRUCTURAL_UI_TAGS = ['header', 'nav', 'footer'];
const STRUCTURAL_UI_CLASS_TOKENS = ['topbar', 'navbar', 'navigation', 'menu'];

export function hasCompareAncestor(node: Node): boolean {
  let parent = node.parentElement;

  while (parent) {
    if (parent.getAttribute?.('data-compare-translated') === '1') {
      return true;
    }
    parent = parent.parentElement;
  }

  return false;
}

export function hasSiblingCompareSpan(node: Text): boolean {
  if (!node.parentNode) {
    return false;
  }

  return Array.from(node.parentNode.childNodes).some(
    (sibling) =>
      sibling.nodeType === Node.ELEMENT_NODE &&
      (sibling as HTMLElement).getAttribute('data-compare-translated') === '1' &&
      (sibling as HTMLElement).getAttribute('data-compare-original') === node.nodeValue
  );
}

export function hasInlineTranslationAncestor(node: Node): boolean {
  let parent = node.parentElement;

  while (parent) {
    if (parent.getAttribute?.('data-inline-translated') === '1') {
      return true;
    }
    parent = parent.parentElement;
  }

  return false;
}

export function createCompareReplacement(
  originalText: string,
  translatedText: string,
  originalColor: string
) {
  const span = document.createElement('span');
  span.style.display = 'inline-block';
  span.setAttribute('data-compare-translated', '1');
  span.setAttribute('data-compare-id', String(compareIdCounter++));
  span.setAttribute('data-compare-original', originalText);
  span.innerHTML = `<span style="color:#888;">${originalText}</span><br/><span style="color:${
    originalColor || '#222'
  };">${translatedText || originalText}</span>`;
  return span;
}

export function createTranslatedReplacement(originalText: string, translatedText: string) {
  const span = document.createElement('span');
  span.setAttribute('data-inline-translated', '1');
  span.setAttribute('data-inline-original', originalText);
  span.style.display = 'contents';
  span.textContent = translatedText;
  return span;
}

export function addLoadingIndicatorSafely(textNode: Text): HTMLSpanElement | null {
  if (!textNode.parentNode) {
    return null;
  }

  const existingIndicator = textNode.parentNode.querySelector('.translation-loading-indicator');
  if (existingIndicator) {
    return null;
  }

  const spinner = createSimpleLoadingIndicator();

  try {
    textNode.parentNode.insertBefore(spinner, textNode);
    return spinner;
  } catch (error) {
    console.warn('Failed to add loading indicator:', error);
    return null;
  }
}

export function removeLoadingIndicatorSafely(textNode: Text) {
  if (!textNode.parentNode) {
    return;
  }

  try {
    let previousSibling = textNode.previousSibling;
    while (previousSibling) {
      if (previousSibling.nodeType === Node.ELEMENT_NODE) {
        const element = previousSibling as HTMLElement;
        if (element.classList.contains('translation-loading-indicator')) {
          element.remove();
        }
        break;
      }
      previousSibling = previousSibling.previousSibling;
    }
  } catch (error) {
    console.warn('Failed to remove loading indicator:', error);
  }
}

export function collectAllTextNodes(
  root: HTMLElement,
  translatedSet: Set<Text>,
  mode?: 'translated' | 'compare'
): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    mode === 'compare'
      ? {
          acceptNode: (node) =>
            hasCompareAncestor(node) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
        }
      : null
  );

  let node = walker.nextNode() as Text | null;

  while (node) {
    const parent = node.parentElement;

    if (parent && isVisible(parent) && node.nodeValue?.trim()) {
      // Filter out code/editor/input contexts up front so later translation passes only work on
      // user-facing prose instead of mutating controls or developer surfaces.
      if (hasInlineTranslationAncestor(node) || shouldSkipNode(node, parent)) {
        node = walker.nextNode() as Text | null;
        continue;
      }

      if (mode === 'compare' || !translatedSet.has(node)) {
        nodes.push(node);
      }
    }

    node = walker.nextNode() as Text | null;
  }

  return nodes;
}

export function collectTranslatableBlocks(
  root: HTMLElement,
  translatedSet: Set<HTMLElement>
): HTMLElement[] {
  const blocks: HTMLElement[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let current = walker.nextNode() as HTMLElement | null;

  while (current) {
    if (
      current instanceof HTMLElement &&
      isCandidateBlock(current) &&
      !translatedSet.has(current) &&
      !current.closest('[data-block-translated="true"]')
    ) {
      const text = getElementTextForTranslation(current);
      if (text && !shouldSkipElement(current, text)) {
        blocks.push(current);
      }
    }

    current = walker.nextNode() as HTMLElement | null;
  }

  return blocks;
}

export function collectTextNodesFromRoots(
  roots: HTMLElement[],
  translatedSet: Set<Text>,
  mode?: 'translated' | 'compare'
): Text[] {
  const nodes: Text[] = [];
  const seen = new Set<Text>();

  roots.forEach((root) => {
    collectAllTextNodes(root, translatedSet, mode).forEach((node) => {
      if (!seen.has(node)) {
        seen.add(node);
        nodes.push(node);
      }
    });
  });

  return nodes;
}

export function collectBlocksFromRoots(
  roots: HTMLElement[],
  translatedSet: Set<HTMLElement>
): HTMLElement[] {
  const blocks: HTMLElement[] = [];
  const seen = new Set<HTMLElement>();

  roots.forEach((root) => {
    collectTranslatableBlocks(root, translatedSet).forEach((element) => {
      if (!seen.has(element)) {
        seen.add(element);
        blocks.push(element);
      }
    });
  });

  return blocks;
}

export function getElementTextForTranslation(element: HTMLElement) {
  const clone = element.cloneNode(true) as HTMLElement;

  clone.querySelectorAll('script, style, noscript, svg, img, picture, source').forEach((node) => {
    node.remove();
  });

  clone.querySelectorAll('a').forEach((anchor) => {
    const text = anchor.textContent || '';
    anchor.replaceWith(document.createTextNode(text));
  });

  const text = (clone.textContent || '').replace(/\s+/g, ' ').trim();
  return text;
}

function createSimpleLoadingIndicator() {
  const spinner = document.createElement('span');
  spinner.className = 'translation-loading-indicator';
  spinner.style.cssText = `
    display: inline-flex;
    align-items: center;
    margin-right: 6px;
    width: 16px;
    height: 16px;
    border: 2px solid #f3f3f3;
    border-top: 2px solid #1890ff;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    vertical-align: middle;
  `;

  if (!document.querySelector('#translation-spinner-style')) {
    const style = document.createElement('style');
    style.id = 'translation-spinner-style';
    style.textContent = `
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
  }

  return spinner;
}

function isVisible(node: Node): boolean {
  if (!(node instanceof HTMLElement)) {
    return true;
  }

  const style = window.getComputedStyle(node);
  return !(style.display === 'none' || style.visibility === 'hidden');
}

function isCandidateBlock(element: HTMLElement) {
  const tag = element.tagName.toLowerCase();
  if (!TRANSLATABLE_BLOCK_TAGS.has(tag)) {
    return false;
  }

  if (!isVisible(element)) {
    return false;
  }

  if (element.childElementCount === 1) {
    const onlyChild = element.firstElementChild as HTMLElement | null;
    if (onlyChild && TRANSLATABLE_BLOCK_TAGS.has(onlyChild.tagName.toLowerCase())) {
      return false;
    }
  }

  return true;
}

function shouldSkipNode(node: Text, parent: HTMLElement) {
  let current: HTMLElement | null = parent;

  while (current) {
    const tag = current.tagName.toLowerCase();
    const className =
      typeof current.className === 'string'
        ? current.className
        : typeof (current.className as { baseVal?: string })?.baseVal === 'string'
          ? (current.className as { baseVal: string }).baseVal
          : '';

    if (
      tag === 'input' ||
      tag === 'textarea' ||
      tag === 'select' ||
      current.hasAttribute('contenteditable') ||
      hasFormControlClass(className) ||
      hasDecorativeClass(className)
    ) {
      return true;
    }

    current = current.parentElement;
  }

  const content = node.nodeValue || '';

  return (
    isCodeContext(node) ||
    isCodeFileName(content) ||
    isProgrammingLanguageName(content) ||
    isPureNumber(content) ||
    isCopyrightText(content)
  );
}

function shouldSkipElement(element: HTMLElement, text: string) {
  let current: HTMLElement | null = element;

  while (current) {
    const tag = current.tagName.toLowerCase();
    const className =
      typeof current.className === 'string'
        ? current.className
        : typeof (current.className as { baseVal?: string })?.baseVal === 'string'
          ? (current.className as { baseVal: string }).baseVal
          : '';

    if (
      tag === 'input' ||
      tag === 'textarea' ||
      tag === 'select' ||
      current.hasAttribute('contenteditable') ||
      hasFormControlClass(className) ||
      hasDecorativeClass(className) ||
      isStructuralUiContainer(tag, className, current)
    ) {
      return true;
    }

    current = current.parentElement;
  }

  return (
    isCodeContextFromElement(element, text) ||
    isCodeFileName(text) ||
    isProgrammingLanguageName(text) ||
    isPureNumber(text) ||
    isCopyrightText(text)
  );
}

function hasFormControlClass(className: string) {
  const tokens = className
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  return tokens.some((token) => {
    if (FORM_CONTROL_CLASS_TOKENS.includes(token)) {
      return true;
    }

    return (
      (token.endsWith('-input') || token.endsWith('_input')) &&
      !token.startsWith('language-')
    );
  });
}

function hasDecorativeClass(className: string) {
  const tokens = className
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  return tokens.some((token) => DECORATIVE_CLASS_TOKENS.includes(token));
}

function isStructuralUiContainer(tag: string, className: string, element: HTMLElement) {
  if (STRUCTURAL_UI_TAGS.includes(tag)) {
    return true;
  }

  if (element.getAttribute('role') === 'navigation') {
    return true;
  }

  const tokens = className
    .toLowerCase()
    .split(/\s+/)
    .map((token) => token.trim())
    .filter(Boolean);

  return tokens.some((token) =>
    STRUCTURAL_UI_CLASS_TOKENS.some(
      (keyword) => token === keyword || token.endsWith(`-${keyword}`) || token.startsWith(`${keyword}-`)
    )
  );
}

function isCodeFileName(text: string): boolean {
  return CODE_LIKE_FILE_SUFFIXES.some((suffix) => text.trim().toLowerCase().endsWith(suffix));
}

function isProgrammingLanguageName(text: string): boolean {
  return PROGRAMMING_LANGUAGE_TOKENS.includes(text.trim().toLowerCase());
}

function isPureNumber(text: string): boolean {
  return /^([+-]?(\d+(\.\d+)?|\.\d+)(e[+-]?\d+)?%?)$/.test(text.trim());
}

function isCopyrightText(text: string): boolean {
  return /^(©|\(c\)|copyright)/i.test(text.trim());
}

function matchesSelectors(element: HTMLElement, selectors: string[]): boolean {
  return selectors.some((selector) => {
    try {
      return element.matches(selector);
    } catch {
      return false;
    }
  });
}

function isCodeClassToken(token: string): boolean {
  if (!token) {
    return false;
  }

  if (CODE_CLASS_TOKENS.includes(token)) {
    return true;
  }

  return token.startsWith('language-');
}

function looksLikeCode(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) {
    return false;
  }

  const codePatterns = [
    /^\s*[{}\[\]();,]\s*$/,
    /^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*[=:(){\[\]]+/,
    /^\s*(<\/?[a-zA-Z][^>]*>|<!--.*-->)/,
    /^\s*(\/\/|\/\*|\*|#|<!--)/,
    /^\s*(import|export|function|class|const|let|var|if|for|while|return)\s/,
    /^\s*\d+\s*[|\-+]/,
    /^\s*[+\-]\s*/,
    /^\s*[a-zA-Z0-9_]+\s*[:=]\s*['"]/,
    /^\s*\$\s+/
  ];

  return codePatterns.some((pattern) => pattern.test(trimmed));
}

function isCodeContext(node: Text): boolean {
  let parent = node.parentElement;
  if (!parent) {
    return false;
  }

  if (looksLikeCode(node.nodeValue || '')) {
    return true;
  }

  // Ancestry checks stay intentionally conservative: a false positive is safer than translating
  // code blocks or editor surfaces and corrupting the current page state.
  while (parent) {
    const tag = parent.tagName.toLowerCase();
    if (BLOCKED_TRANSLATION_TAGS.includes(tag) || parent.hasAttribute('contenteditable')) {
      return true;
    }

    if (matchesSelectors(parent, CODE_CONTAINER_SELECTORS)) {
      return true;
    }

    const className =
      typeof parent.className === 'string'
        ? parent.className
        : typeof (parent.className as { baseVal?: string })?.baseVal === 'string'
          ? (parent.className as { baseVal: string }).baseVal
          : '';

    for (const cls of className.split(/\s+/).filter(Boolean)) {
      if (isCodeClassToken(cls)) {
        return true;
      }
    }

    if (
      parent.hasAttribute('data-code-marker') ||
      parent.hasAttribute('data-line-number') ||
      parent.hasAttribute('data-file-type') ||
      parent.getAttribute('role') === 'gridcell'
    ) {
      return true;
    }

    const style = window.getComputedStyle(parent);
    if (
      style.fontFamily &&
      ['monospace', 'Monaco', 'Consolas', 'Courier'].some((font) =>
        style.fontFamily.includes(font)
      ) &&
      parent.closest('.highlight, .blob-code, .CodeMirror, .monaco-editor, pre, code')
    ) {
      return true;
    }

    parent = parent.parentElement;
  }

  return false;
}

function isCodeContextFromElement(element: HTMLElement, text: string): boolean {
  if (looksLikeCode(text)) {
    return true;
  }

  let parent: HTMLElement | null = element;
  while (parent) {
    const tag = parent.tagName.toLowerCase();
    if (BLOCKED_TRANSLATION_TAGS.includes(tag) || parent.hasAttribute('contenteditable')) {
      return true;
    }

    if (matchesSelectors(parent, CODE_CONTAINER_SELECTORS)) {
      return true;
    }

    const className =
      typeof parent.className === 'string'
        ? parent.className
        : typeof (parent.className as { baseVal?: string })?.baseVal === 'string'
          ? (parent.className as { baseVal: string }).baseVal
          : '';

    for (const cls of className.split(/\s+/).filter(Boolean)) {
      if (isCodeClassToken(cls)) {
        return true;
      }
    }

    parent = parent.parentElement;
  }

  return false;
}
