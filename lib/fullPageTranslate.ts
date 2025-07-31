// 全局状态管理
if (!(window as any).__translationState) {
  (window as any).__translationState = {
    isPageTranslated: false,
    stopTranslation: null
  };
}

// 初始化原始文本映射
if (!(window as any).__originalPageTextMap) {
  (window as any).__originalPageTextMap = new Map();
}

// 获取翻译状态
const getTranslationState = () => {
  return (window as any).__translationState;
};

// 设置翻译状态
const setTranslationState = (state: { isPageTranslated: boolean; stopTranslation: (() => void) | null }) => {
  (window as any).__translationState = state;
};

// 保存原始文本映射
const saveOriginalTextMap = () => {
  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
  let node;
  const originalMap = (window as any).__originalPageTextMap;
  while ((node = walker.nextNode())) {
    if (node.nodeValue && node.nodeValue.trim()) {
      originalMap.set(node, node.nodeValue);
    }
  }
};

// 恢复原始文本映射
const restoreOriginalTextMap = () => {
  const originalMap = (window as any).__originalPageTextMap;
  for (const [node, text] of originalMap.entries()) {
    try {
      node.nodeValue = text;
    } catch {}
  }
  
  // 清理已翻译的节点标记
  const translatedNodes = document.querySelectorAll('[data-translated="true"]');
  translatedNodes.forEach(node => {
    node.removeAttribute('data-translated');
  });
  
  // 清理 compare 模式的 span
  const compareSpans = document.querySelectorAll('[data-compare-translated="1"]');
  compareSpans.forEach(span => {
    const originalText = span.getAttribute('data-compare-original');
    if (originalText && span.parentNode) {
      const textNode = document.createTextNode(originalText);
      span.parentNode.replaceChild(textNode, span);
    }
  });
};

// 重置自动翻译标记
const resetAutoTranslateFlag = () => {
  if ((window as any).__autoFullPageTranslated) {
    delete (window as any).__autoFullPageTranslated;
  }
};

function isVisible(node: Node): boolean {
  if (!(node instanceof HTMLElement)) return true;
  
  // 检查元素是否真的隐藏
  const style = window.getComputedStyle(node);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  
  return true;
}

import { sendToBackground } from '@plasmohq/messaging';
import { getCustomDict } from './siteTranslateSettings';
import { PROGRAMMING_LANGUAGES, CODE_FILE_SUFFIXES, GITHUB_CODE_SELECTORS, GITHUB_CODE_CLASSES, EXCLUDE_TAGS } from './constants';

function getDomain() {
  return location.hostname.replace(/^www\./, '');
}

async function batchTranslateTexts(texts: string[], from: string, to: string, engine: string): Promise<string[]> {
  const domain = getDomain();
  const dict = await getCustomDict(domain);
  const dictTrimmed: Record<string, string> = {};
  for (const k in dict) {
    dictTrimmed[k.trim()] = dict[k].trim();
  }

  // 记录哪些文本命中词库，哪些需要翻译
  const result: string[] = [];
  const toTranslate: string[] = [];
  const toTranslateIndices: number[] = [];

  texts.forEach((t, i) => {
    const key = (t || '').trim();
    if (dictTrimmed[key]) {
      result[i] = dictTrimmed[key];
    } else {
      toTranslate.push(t);
      toTranslateIndices.push(i);
    }
  });

  // 只对未命中的文本调用翻译API
  let translatedArr: string[] = [];
  if (toTranslate.length > 0) {
    const resp = await sendToBackground({
      name: 'handle',
      body: {
        service: 'translate',
        action: 'translateBatch',
        texts: toTranslate,
        options: { from, to, engine }
      }
    });
    if (resp && resp.success && Array.isArray(resp.data)) {
      translatedArr = resp.data.map((r: any) => r.translation || '');
    } else {
      translatedArr = toTranslate;
    }
    // 回填到 result
    toTranslateIndices.forEach((idx, j) => {
      result[idx] = translatedArr[j];
    });
  }

  return result;
}

// 判断块是否在视窗内
function isInViewport(node: Text): boolean {
  const el = node.parentElement;
  if (!el) return false;
  const rect = el.getBoundingClientRect();
  return rect.bottom > 0 && rect.top < window.innerHeight;
}

function hasCompareAncestor(node: Node): boolean {
  let p = node.parentElement;
  while (p) {
    if (p.getAttribute && p.getAttribute('data-compare-translated') === '1') return true;
    p = p.parentElement;
  }
  return false;
}

function isProgrammingLanguageName(text: string): boolean {
  const t = text.trim().toLowerCase();
  return PROGRAMMING_LANGUAGES.includes(t);
}

function isPureNumber(text: string): boolean {
  const t = text.trim();
  // 匹配纯数字、小数、百分数、科学计数法
  return /^([+-]?(\d+(\.\d+)?|\.\d+)(e[+-]?\d+)?%?)$/.test(t);
}

function isCopyrightText(text: string): boolean {
  const t = text.trim().toLowerCase();
  // 以 © 或 (c) 开头，或包含 copyright
  return /^©|^\(c\)|copyright/.test(t);
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
  let totalFound = 0;
  let totalCollected = 0;
  
  while (node) {
    totalFound++;
    const parent = node.parentElement;
    if (parent && isVisible(parent) && node.nodeValue && node.nodeValue.trim()) {
      // 跳过输入组件及其祖先为输入组件的内容（包括 className 含 input 的）
      let skip = false;
      let p = parent;
      while (p) {
        const tag = p.tagName.toLowerCase();
        const className = typeof p.className === 'string'
          ? p.className
          : (p.className && typeof (p.className as any).baseVal === 'string'
              ? (p.className as any).baseVal
              : '');
        if (
          tag === 'input' ||
          tag === 'textarea' ||
          p.hasAttribute('contenteditable') ||
          className.toLowerCase().includes('input')
        ) {
          skip = true;
          break;
        }
        p = p.parentElement;
      }
      if (skip) {
        node = walker.nextNode() as Text;
        continue;
      }
      if (isCodeContext(node)) { node = walker.nextNode() as Text; continue; }
      if (isCodeFileName(node.nodeValue || '')) {
        node = walker.nextNode() as Text;
        continue;
      }
      // 跳过编程语言名称、纯数字、版权信息
      if (
        isProgrammingLanguageName(node.nodeValue || '') ||
        isPureNumber(node.nodeValue || '') ||
        isCopyrightText(node.nodeValue || '')
      ) {
        node = walker.nextNode() as Text;
        continue;
      }
      if (mode === 'compare') {
        nodes.push(node);
        totalCollected++;
      } else {
        // 在 translated 模式下，只收集未翻译过的节点
        if (!translatedSet.has(node)) {
          nodes.push(node);
          totalCollected++;
        }
      }
    }
    node = walker.nextNode() as Text;
  }
  
  console.log(`收集文本节点: 找到 ${totalFound}, 收集 ${totalCollected}`);
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

function isCodeFileName(text: string): boolean {
  const trimmed = text.trim();
  return CODE_FILE_SUFFIXES.some(suffix => trimmed.toLowerCase().endsWith(suffix));
}

/**
 * 检查元素是否匹配特定选择器列表
 */
function matchesSelectors(element: HTMLElement, selectors: string[]): boolean {
  return selectors.some(selector => {
    try {
      return element.matches(selector);
    } catch {
      return false;
    }
  });
}


/**
 * 检查文本内容是否像代码
 */
function looksLikeCode(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length < 3) return false;
  
  // 常见代码模式
  const codePatterns = [
    /^[\s]*[\{\}\[\]();,][\s]*$/, // 只包含标点符号
    /^[\s]*[a-zA-Z_$][a-zA-Z0-9_$]*[\s]*[=:(){\[\]]+/, // 变量赋值或函数调用
    /^[\s]*(<\/?[a-zA-Z][^>]*>|<!--.*-->)/, // HTML标签
    /^[\s]*(\/\/|\/\*|\*|#|<!--)/, // 注释
    /^[\s]*(import|export|function|class|const|let|var|if|for|while|return)\s/, // 关键字
    /^[\s]*\d+[\s]*[\|\-\+]/, // 行号或表格分隔符
    /^\s*[+\-]\s*/, // Git diff标记
    /^[\s]*[a-zA-Z0-9_]+\s*[:=]\s*['""]/, // 配置文件格式
    /^[\s]*\$\s+/, // Shell命令提示符
  ];
  
  return codePatterns.some(pattern => pattern.test(trimmed));
}

// isCodeContext 保持递归父级，但不再对主内容区 class/selector 做排除
function isCodeContext(node: Text): boolean {
  let parent = node.parentElement;
  if (!parent) return false;
  // 首先检查文本内容是否像代码
  if (looksLikeCode(node.nodeValue || '')) {
    return true;
  }
  while (parent) {
    const tag = parent.tagName.toLowerCase();
    if (EXCLUDE_TAGS.includes(tag) || parent.hasAttribute('contenteditable')) {
      return true;
    }
    // 只检查真正的代码区选择器
    if (matchesSelectors(parent, GITHUB_CODE_SELECTORS)) {
      return true;
    }
    // 检查类名（只针对代码/编辑器类）
    const className = typeof parent.className === 'string'
      ? parent.className
      : (parent.className && typeof (parent.className as any).baseVal === 'string'
          ? (parent.className as any).baseVal
          : '');
    const classList = className.split(/\s+/).filter(Boolean);
    if (classList.length > 0) {
      for (const cls of classList) {
        if (GITHUB_CODE_CLASSES.includes(cls)) {
          return true;
        }
        // 只做部分匹配，不再对主内容区关键词做匹配
        if (GITHUB_CODE_CLASSES.some(key => cls.includes(key) || key.includes(cls))) {
          return true;
        }
      }
    }
    // 检查特殊属性
    if (parent.hasAttribute('data-code-marker') ||
        parent.hasAttribute('data-line-number') ||
        parent.hasAttribute('data-file-type') ||
        parent.getAttribute('role') === 'gridcell') {
      return true;
    }
    // 检查等宽字体且在代码容器中
    const style = window.getComputedStyle(parent);
    if (style.fontFamily && 
        (style.fontFamily.includes('monospace') || 
         style.fontFamily.includes('Monaco') || 
         style.fontFamily.includes('Consolas') ||
         style.fontFamily.includes('Courier'))) {
      if (parent.closest('.highlight, .blob-code, .CodeMirror, .monaco-editor, pre, code')) {
        return true;
      }
    }
    parent = parent.parentElement;
  }
  return false;
}

export async function lazyFullPageTranslate(targetLang: string, mode: 'translated' | 'compare', engine: string) {
  const callTranslateAPI = (window as any).callTranslateAPI;
  if (typeof callTranslateAPI !== 'function') throw new Error('callTranslateAPI not found on window');
  let translatedSet = new Set<Text>();
  let isStopped = false;
  
  // 保存原始文本映射
  saveOriginalTextMap();
  
  async function translateVisible() {
    if (isStopped) return;
    
    // 收集所有可见的文本节点
    const nodes = collectAllTextNodes(document.body, translatedSet, mode);
    console.log(`懒加载翻译: 收集到 ${nodes.length} 个节点`);
    
    // 只处理在视窗内的节点
    const visibleNodes = nodes.filter(node => isInViewport(node));
    if (visibleNodes.length === 0) return;
    
    // compare模式下过滤 compare span
    const validNodes: Text[] = [];
    for (const node of visibleNodes) {
      if (mode === 'compare' && (hasCompareAncestor(node) || hasSiblingCompareSpan(node))) continue;
      if (!node.parentNode) continue;
      validNodes.push(node);
    }
    if (validNodes.length === 0) return;
    
    // 批量翻译，每批20个
    const BATCH_SIZE = 20;
    let translatedCount = 0;
    for (let i = 0; i < validNodes.length; i += BATCH_SIZE) {
      if (isStopped) break;
      
      const batch = validNodes.slice(i, i + BATCH_SIZE);
      const texts = batch.map(n => n.nodeValue || '');
      let translatedArr: string[] = [];
      try {
        translatedArr = await batchTranslateTexts(texts, 'auto', targetLang, engine);
      } catch (e) {
        // 批量失败时，回退为原文
        translatedArr = texts;
      }
      for (let j = 0; j < batch.length; j++) {
        if (isStopped) break;
        
        const node = batch[j];
        const translated = translatedArr[j];
        if (!node.parentNode) continue;
        if (mode === 'translated') {
          node.nodeValue = translated;
          translatedSet.add(node);
          translatedCount++;
          // 标记节点为已翻译
          if (node.parentElement) {
            node.parentElement.setAttribute('data-translated', 'true');
          }
        } else if (mode === 'compare') {
          // 动态获取原文颜色
          let origColor = '';
          try {
            const computed = window.getComputedStyle(node.parentElement!);
            origColor = computed && computed.color ? computed.color : '';
          } catch {}
          const span = document.createElement('span');
          span.style.display = 'inline-block';
          span.setAttribute('data-compare-translated', '1');
          span.setAttribute('data-compare-id', String(compareIdCounter++));
          span.setAttribute('data-compare-original', node.nodeValue || '');
          span.innerHTML = `<span style=\"color:#888;\">${node.nodeValue}</span><br/><span style=\"color:${origColor || '#222'};\">${translated}</span>`;
          node.parentNode.replaceChild(span, node);
          translatedCount++;
        }
      }
    }
    console.log(`懒加载翻译完成: 批量翻译了 ${translatedCount} 个节点`);
  }
  
  // 初始翻译
  await translateVisible();
  
  // 监听滚动/resize
  const handleScroll = () => {
    if (!isStopped) translateVisible();
  };
  const handleResize = () => {
    if (!isStopped) translateVisible();
  };
  
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleResize);
  
  // 动态内容监听
  let observer: MutationObserver | null = new MutationObserver(async () => {
    if (!isStopped) await translateVisible();
  });
  observer.observe(document.body, { childList: true, subtree: true });
  
  // 返回停止函数
  return {
    stop: () => {
      isStopped = true;
      if (observer) {
        observer.disconnect();
        observer = null;
      }
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('resize', handleResize);
      
      // 恢复原始文本映射
      restoreOriginalTextMap();
      
      // 重置翻译状态
      const state = getTranslationState();
      state.stopTranslation = null;
      state.isPageTranslated = false;
      setTranslationState(state);
      
      // 重置自动翻译标记
      resetAutoTranslateFlag();
    }
  };
}

// 导出状态管理函数
export const getPageTranslationStatus = (): boolean => {
  const state = getTranslationState();
  return state.isPageTranslated;
};

export const restoreOriginalPage = () => {
  // 停止翻译
  const state = getTranslationState();
  if (state.stopTranslation) {
    state.stopTranslation();
  }
  
  // 恢复原始文本映射
  restoreOriginalTextMap();
  
  // 重置翻译状态
  state.stopTranslation = null;
  state.isPageTranslated = false;
  setTranslationState(state);
  
  // 重置自动翻译标记
  resetAutoTranslateFlag();
};