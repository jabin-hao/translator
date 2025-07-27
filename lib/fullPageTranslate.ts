// 判断是否为 block 元素
const blockTags = [
  'p', 'div', 'li', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'section', 'article', 'header', 'footer', 'aside', 'nav', 'main', 'blockquote', 'pre', 'dl', 'dt', 'dd', 'form', 'fieldset', 'legend', 'address', 'figure', 'figcaption'
];

function isVisible(node: Node): boolean {
  if (!(node instanceof HTMLElement)) return true;
  const style = window.getComputedStyle(node);
  if (style.display === 'none' || style.visibility === 'hidden' || style.opacity === '0') return false;
  return true;
}

import { sendToBackground } from '@plasmohq/messaging';
async function batchTranslateTexts(texts: string[], from: string, to: string, engine: string): Promise<string[]> {
  const resp = await sendToBackground({
    name: 'handle',
    body: {
      service: 'translate',
      action: 'translateBatch',
      texts,
      options: { from, to, engine }
    }
  });
  if (resp && resp.success && Array.isArray(resp.data)) {
    return resp.data.map((r: any) => r.translation || '');
  } else {
    throw new Error(resp?.error || '批量翻译失败');
  }
}

async function translateSubtree(root: HTMLElement | ShadowRoot, targetLang: string, mode: 'translated' | 'compare', engine: string, callTranslateAPI: any, progress?: {done: number, total: number}) {
  // 1. 处理 select/option
  const selects = root.querySelectorAll?.('select, datalist') || [];
  for (const el of selects) {
    for (const option of (el as HTMLSelectElement | HTMLDataListElement).querySelectorAll('option')) {
      if (option.textContent && option.textContent.trim()) {
        const { result } = await callTranslateAPI(option.textContent, 'auto', targetLang, engine);
        option.textContent = result;
      }
    }
  }
  // 2. 处理普通文本节点（批量请求）
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let nodes: Text[] = [];
  let node: Text | null = walker.nextNode() as Text;
  while (node) {
    if (!isVisible(node.parentElement!)) {
      node = walker.nextNode() as Text;
      continue;
    }
    // 新增：如果父节点已是 compare span，跳过
    if (node.parentElement && node.parentElement.getAttribute && node.parentElement.getAttribute('data-compare-translated') === '1') {
      node = walker.nextNode() as Text;
      continue;
    }
    if (node.parentElement && ['option'].includes(node.parentElement.tagName.toLowerCase())) {
      node = walker.nextNode() as Text;
      continue;
    }
    if (node.nodeValue && node.nodeValue.trim()) {
      nodes.push(node);
    }
    node = walker.nextNode() as Text;
  }
  // 批量翻译（内容脚本端直接发消息到 background 批量接口）
  const batchSize = 20;
  for (let i = 0; i < nodes.length; i += batchSize) {
    const batch = nodes.slice(i, i + batchSize);
    const texts = batch.map(n => n.nodeValue!);
    let translatedArr: string[] = [];
    try {
      translatedArr = await batchTranslateTexts(texts, 'auto', targetLang, engine);
    } catch (e) {
      translatedArr = texts.map(() => '');
    }
    for (let j = 0; j < batch.length; j++) {
      const node = batch[j];
      if (mode === 'translated') {
        if (node.parentNode) node.nodeValue = translatedArr[j] || node.nodeValue;
      } else if (mode === 'compare') {
        if (node.parentNode) {
          const span = document.createElement('span');
          span.style.display = 'inline-block';
          span.setAttribute('data-compare-translated', '1'); // 标记已对照翻译
          span.innerHTML = `<span style=\"color:#888;\">${node.nodeValue}</span><br/><span style=\"color:#222;\">${translatedArr[j]}</span>`;
          node.parentNode.replaceChild(span, node);
        }
      }
      if (progress) {
        progress.done++;
        // showProgress(progress.done, progress.total); // Removed
      }
    }
  }
  // 3. 递归 shadowRoot
  const elements = root instanceof HTMLElement ? root.querySelectorAll('*') : [];
  for (const el of elements) {
    if ((el as any).shadowRoot) {
      await translateSubtree((el as any).shadowRoot, targetLang, mode, engine, callTranslateAPI, progress);
    }
  }
  // 4. 属性翻译
  const attrList = [
    { selector: 'input[placeholder], textarea[placeholder]', attr: 'placeholder' },
    { selector: 'img[alt], area[alt], input[type=\"image\"][alt]', attr: 'alt' },
    { selector: '[title]', attr: 'title' }
  ];
  for (const { selector, attr } of attrList) {
    const nodes = root.querySelectorAll?.(selector) || [];
    for (const el of nodes) {
      const val = el.getAttribute(attr);
      if (val && val.trim()) {
        const { result } = await callTranslateAPI(val, 'auto', targetLang, engine);
        el.setAttribute(attr, result);
      }
    }
  }
}

// 判断块是否在视窗内
function isInViewport(node: Text): boolean {
  const el = node.parentElement;
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

// 分块收集文本节点及主块元素
function getPiecesToTranslateWithBlock(root: HTMLElement): { nodes: Text[], block: HTMLElement }[] {
  const pieces: { nodes: Text[], block: HTMLElement }[] = [];
  let currentPiece: Text[] = [];
  let currentBlock: HTMLElement | null = null;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
  let node: Text | null = walker.nextNode() as Text;
  while (node) {
    const parent = node.parentElement;
    if (!parent || !isVisible(parent)) {
      node = walker.nextNode() as Text;
      continue;
    }
    const tag = parent.tagName.toLowerCase();
    if (blockTags.includes(tag)) {
      if (currentPiece.length > 0 && currentBlock) {
        pieces.push({ nodes: currentPiece, block: currentBlock });
        currentPiece = [];
      }
      currentBlock = parent;
    }
    if (node.nodeValue && node.nodeValue.trim()) {
      currentPiece.push(node);
      if (!currentBlock) currentBlock = parent;
    }
    node = walker.nextNode() as Text;
  }
  if (currentPiece.length > 0 && currentBlock) pieces.push({ nodes: currentPiece, block: currentBlock });
  return pieces;
}

const translatedTextNodes = new WeakSet<Text>();

function hasCompareAncestor(node: Node): boolean {
  let p = node.parentElement;
  while (p) {
    if (p.getAttribute && p.getAttribute('data-compare-translated') === '1') return true;
    p = p.parentElement;
  }
  return false;
}

function collectAllTextNodes(root: HTMLElement, translatedSet: Set<Text>, mode?: 'translated' | 'compare'): Text[] {
  const nodes: Text[] = [];
  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT,
    mode === 'compare'
      ? {
          acceptNode: (node) => {
            // 跳过 compare span 及其子树（祖先链上有compare span）
            if (hasCompareAncestor(node)) {
              return NodeFilter.FILTER_REJECT;
            }
            return NodeFilter.FILTER_ACCEPT;
          }
        }
      : null
  );
  let node: Text | null = walker.nextNode() as Text;
  while (node) {
    const parent = node.parentElement;
    if (parent && isVisible(parent) && node.nodeValue && node.nodeValue.trim()) {
      if (mode === 'compare') {
        nodes.push(node);
      } else {
        if (!translatedSet.has(node)) {
          nodes.push(node);
        }
      }
    }
    node = walker.nextNode() as Text;
  }
  return nodes;
}

let compareIdCounter = 1;

function hasSiblingCompareSpan(node: Text): boolean {
  if (!node.parentNode) return false;
  const siblings = Array.from(node.parentNode.childNodes);
  for (const sib of siblings) {
    if (
      sib.nodeType === 1 &&
      (sib as HTMLElement).getAttribute &&
      (sib as HTMLElement).getAttribute('data-compare-translated') === '1' &&
      (sib as HTMLElement).getAttribute('data-compare-original') === node.nodeValue
    ) {
      return true;
    }
  }
  return false;
}

export async function lazyFullPageTranslate(targetLang: string, mode: 'translated' | 'compare', engine: string) {
  const callTranslateAPI = (window as any).callTranslateAPI;
  if (typeof callTranslateAPI !== 'function') throw new Error('callTranslateAPI not found on window');
  let translatedSet = new Set<Text>();
  async function translateVisible() {
    // 每次只收集一次未被 compare span 包裹的原始文本节点
    const nodes = collectAllTextNodes(document.body, translatedSet, mode);
    // 复制一份，避免遍历过程中DOM变化影响本轮节点
    const nodesToProcess = nodes.slice();
    for (const node of nodesToProcess) {
      if (isInViewport(node)) {
        // compare模式下，祖先链上有compare span直接跳过
        if (mode === 'compare' && hasCompareAncestor(node)) continue;
        if (mode === 'compare' && hasSiblingCompareSpan(node)) continue;
        try {
          const { result } = await callTranslateAPI(node.nodeValue, 'auto', targetLang, engine);
          if (mode === 'translated') {
            if (node.parentNode) node.nodeValue = result;
            translatedSet.add(node);
          } else if (mode === 'compare') {
            if (node.parentNode) {
              // 动态获取原文颜色
              let origColor = '';
              try {
                const computed = window.getComputedStyle(node.parentElement);
                origColor = computed && computed.color ? computed.color : '';
              } catch {}
              const span = document.createElement('span');
              span.style.display = 'inline-block';
              span.setAttribute('data-compare-translated', '1'); // 标记已对照翻译
              span.setAttribute('data-compare-id', String(compareIdCounter++));
              span.setAttribute('data-compare-original', node.nodeValue || '');
              // 译文颜色跟随原文
              span.innerHTML = `<span style=\"color:#888;\">${node.nodeValue}</span><br/><span style=\"color:${origColor || '#222'};\">${result}</span>`;
              node.parentNode.replaceChild(span, node);
            }
          }
        } catch {}
      }
    }
  }
  // 初始翻译
  await translateVisible();
  // 监听滚动/resize
  window.addEventListener('scroll', translateVisible, { passive: true });
  window.addEventListener('resize', translateVisible);
  // 动态内容监听
  let observer: MutationObserver | null = new MutationObserver(async () => {
    await translateVisible();
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

// 动态内容监听
let observer: MutationObserver | null = null;
export async function fullPageTranslateV2(targetLang: string, mode: 'translated' | 'compare', engine: string) {
  const callTranslateAPI = (window as any).callTranslateAPI;
  if (typeof callTranslateAPI !== 'function') throw new Error('callTranslateAPI not found on window');
  // 统计总节点数
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  let total = 0;
  let n = walker.nextNode();
  while (n) { total++; n = walker.nextNode(); }
  // showProgress(0, total); // Removed
  await translateSubtree(document.body, targetLang, mode, engine, callTranslateAPI, { done: 0, total });
  // hideProgress(); // Removed
  // 动态内容监听
  if (observer) observer.disconnect();
  observer = new MutationObserver(async (mutations) => {
    for (const mutation of mutations) {
      for (const node of Array.from(mutation.addedNodes)) {
        if (node.nodeType === 1) {
          await translateSubtree(node as HTMLElement, targetLang, mode, engine, callTranslateAPI);
        }
      }
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });
} 