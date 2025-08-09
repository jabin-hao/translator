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
  let node: Node;
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
  
  // 清理所有loading指示器
  const indicators = document.querySelectorAll('.translation-loading-indicator');
  indicators.forEach(indicator => indicator.remove());
  
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
  return !(style.display === 'none' || style.visibility === 'hidden');
}

import { sendToBackground } from '@plasmohq/messaging';
import { PROGRAMMING_LANGUAGES, CODE_FILE_SUFFIXES, GITHUB_CODE_SELECTORS, GITHUB_CODE_CLASSES, EXCLUDE_TAGS } from '../constants/constants';

// 创建简单的loading指示器
function createSimpleLoadingIndicator(): HTMLSpanElement {
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
  
  // 添加动画样式
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

// 为文本节点添加loading指示器（更安全的方式）
function addLoadingIndicatorSafely(textNode: Text): HTMLSpanElement | null {
  if (!textNode.parentNode) return null;
  
  // 检查是否已经有指示器
  const existingIndicator = textNode.parentNode.querySelector('.translation-loading-indicator');
  if (existingIndicator) {
    return null;
  }
  
  const indicator = createSimpleLoadingIndicator();
  
  try {
    // 将指示器插入到文本节点之前
    textNode.parentNode.insertBefore(indicator, textNode);
    return indicator;
  } catch (error) {
    console.warn('无法添加loading指示器:', error);
    return null;
  }
}

// 移除与文本节点相关的loading指示器
function removeLoadingIndicatorSafely(textNode: Text): void {
  if (!textNode.parentNode) return;
  
  try {
    // 查找并移除前面的指示器
    let previousSibling = textNode.previousSibling;
    while (previousSibling) {
      if (previousSibling.nodeType === Node.ELEMENT_NODE) {
        const element = previousSibling as HTMLElement;
        if (element.classList.contains('translation-loading-indicator')) {
          element.remove();
          break;
        }
        // 如果遇到其他元素，停止查找
        break;
      }
      previousSibling = previousSibling.previousSibling;
    }
  } catch (error) {
    console.warn('无法移除loading指示器:', error);
  }
}

function getDomain() {
  return location.hostname;
}

// 批量翻译文本
async function batchTranslateTexts(texts: string[], from: string, to: string, engine: string): Promise<string[]> {
  const domain = getDomain();
  
  // 直接调用 background 服务，让 background 处理自定义词库逻辑
  const resp = await sendToBackground({
    name: 'handle' as never,
    body: {
      service: 'translate',
      action: 'translateBatch',
      texts: texts,
      host: domain, // 传递域名给 background
      options: { from, to, engine }
    }
  });
  
  if (resp && resp.success && Array.isArray(resp.data)) {
    const results = resp.data.map((r: any) => r.translation || '');
    
    // 统计自定义词库命中情况
    const customHits = resp.data.filter((r: any) => r.engine === 'custom').length;
    const cacheHits = resp.data.filter((r: any) => r.cached === true).length;
    const apiCalls = resp.data.length - customHits - cacheHits;

    return results;
  } else {
    console.error('[fullPageTranslate] 翻译失败:', resp);
    return texts; // 失败时返回原文
  }
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

// 判断是否为代码文件名
function isCodeFileName(text: string): boolean {
  const trimmed = text.trim();
  return CODE_FILE_SUFFIXES.some(suffix => trimmed.toLowerCase().endsWith(suffix));
}
// 判断是否为编程语言名称
function isProgrammingLanguageName(text: string): boolean {
  const t = text.trim().toLowerCase();
  return PROGRAMMING_LANGUAGES.includes(t);
}
// 判断是否为纯数字、小数、百分数或科学计数法
function isPureNumber(text: string): boolean {
  const t = text.trim();
  // 匹配纯数字、小数、百分数、科学计数法
  return /^([+-]?(\d+(\.\d+)?|\.\d+)(e[+-]?\d+)?%?)$/.test(t);
}
// 判断是否为版权信息
function isCopyrightText(text: string): boolean {
  const t = text.trim().toLowerCase();
  // 以 © 或 (c) 开头，或包含 copyright
  return /^©|^\(c\)|copyright/.test(t);
}

// 收集所有文本节点
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

  return nodes;
}

let compareIdCounter = 1;
// 判断是否有兄弟节点是 compare span
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
    /^\s*[{}\[\]();,]\s*$/, // 只包含标点符号
    /^\s*[a-zA-Z_$][a-zA-Z0-9_$]*\s*[=:(){\[\]]+/, // 变量赋值或函数调用
    /^\s*(<\/?[a-zA-Z][^>]*>|<!--.*-->)/, // HTML标签
    /^\s*(\/\/|\/\*|\*|#|<!--)/, // 注释
    /^\s*(import|export|function|class|const|let|var|if|for|while|return)\s/, // 关键字
    /^\s*\d+\s*[|\-+]/, // 行号或表格分隔符
    /^\s*[+\-]\s*/, // Git diff标记
    /^\s*[a-zA-Z0-9_]+\s*[:=]\s*['"]/, // 配置文件格式
    /^\s*\$\s+/, // Shell命令提示符
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
  
  // 进度管理状态
  let totalNodes = 0;
  let completedNodes = 0;
  let progressCallback: ((total: number, completed: number) => void) | null = null;
  
  // 保存原始文本映射
  saveOriginalTextMap();
  
  async function translateVisible() {
    if (isStopped) return;
    
    // 收集所有可见的文本节点
    const nodes = collectAllTextNodes(document.body, translatedSet, mode);
    
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
    
    // 更新总数
    totalNodes = Math.max(totalNodes, validNodes.length);
    
    // 通知进度更新
    if (progressCallback) {
      progressCallback(totalNodes, completedNodes);
    }
    
    // 批量翻译，每批20个
    const BATCH_SIZE = 20;
    for (let i = 0; i < validNodes.length; i += BATCH_SIZE) {
      if (isStopped) break;
      
      const batch = validNodes.slice(i, i + BATCH_SIZE);
      
      // 为每个待翻译的节点添加进度指示器
      const addedIndicators: Text[] = [];
      batch.forEach(node => {
        const indicator = addLoadingIndicatorSafely(node);
        if (indicator) {
          addedIndicators.push(node);
        }
      });
      
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
        
        // 检查节点是否仍然有效
        if (!node || !node.parentNode || !node.nodeValue) {
          console.warn('节点无效，跳过翻译:', node);
          continue;
        }
        
        // 移除进度指示器
        removeLoadingIndicatorSafely(node);
        
        // 保存原始文本以防万一
        const originalText = node.nodeValue;
        
        if (mode === 'translated') {
          try {
            // 只有当翻译结果有效时才更新
            if (translated && translated.trim()) {
              node.nodeValue = translated;
              translatedSet.add(node);
              completedNodes++;
              // 标记节点为已翻译
              if (node.parentElement) {
                node.parentElement.setAttribute('data-translated', 'true');
              }
            } else {
              // 如果翻译结果为空，保持原文
              console.warn('翻译结果为空，保持原文:', originalText);
            }
          } catch (error) {
            console.error('翻译节点时出错:', error, '恢复原文:', originalText);
            // 发生错误时恢复原文
            try {
              node.nodeValue = originalText;
            } catch (restoreError) {
              console.error('无法恢复原文:', restoreError);
            }
          }
        } else if (mode === 'compare') {
          try {
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
            span.setAttribute('data-compare-original', originalText);
            span.innerHTML = `<span style=\"color:#888;\">${originalText}</span><br/><span style=\"color:${origColor || '#222'};\">${translated || originalText}</span>`;
            node.parentNode.replaceChild(span, node);
            completedNodes++;
          } catch (error) {
            console.error('Compare模式处理失败:', error);
          }
        }
        
        // 每个节点翻译完成后更新进度
        if (progressCallback) {
          progressCallback(totalNodes, completedNodes);
        }
      }
    }
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
      
      // 清理所有进度指示器
      const indicators = document.querySelectorAll('.translation-loading-indicator');
      indicators.forEach(indicator => indicator.remove());
      
      // 恢复原始文本映射
      restoreOriginalTextMap();
      
      // 重置翻译状态
      const state = getTranslationState();
      state.stopTranslation = null;
      state.isPageTranslated = false;
      setTranslationState(state);
      
      // 重置自动翻译标记
      resetAutoTranslateFlag();
    },
    setProgressCallback: (callback: (total: number, completed: number) => void) => {
      progressCallback = callback;
    },
    getProgress: () => ({
      total: totalNodes,
      completed: completedNodes
    })
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