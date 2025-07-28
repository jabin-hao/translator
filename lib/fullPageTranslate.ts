// 判断是否为 block 元素
const blockTags = [
  'p', 'div', 'li', 'ul', 'ol', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'table', 'tr', 'td', 'th', 'section', 'article', 'header', 'footer', 'aside', 'nav', 'main', 'blockquote', 'pre', 'dl', 'dt', 'dd', 'form', 'fieldset', 'legend', 'address', 'figure', 'figcaption'
];

function isVisible(node: Node): boolean {
  if (!(node instanceof HTMLElement)) return true;
  
  // 检查元素是否真的隐藏
  const style = window.getComputedStyle(node);
  if (style.display === 'none' || style.visibility === 'hidden') return false;
  
  // 对于 opacity 为 0 的元素，我们仍然翻译，因为它们可能是动画的一部分
  // if (style.opacity === '0') return false;
  
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

// 删除 translateSubtree、fullPageTranslateV2 及相关 observer，只保留 lazyFullPageTranslate 及 collectAllTextNodes、isCodeContext、isCodeFileName 等依赖

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

function isInInputOrTextarea(node: Node): boolean {
  let parent = node.parentElement;
  while (parent) {
    const tag = parent.tagName.toLowerCase();
    if (tag === 'input' || tag === 'textarea') {
      return true;
    }
    parent = parent.parentElement;
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
  let totalFound = 0;
  let totalCollected = 0;
  
  while (node) {
    totalFound++;
    const parent = node.parentElement;
    // 新增：彻底排除 input/textarea 及其所有子孙节点
    if (isInInputOrTextarea(node)) {
      node = walker.nextNode() as Text;
      continue;
    }
    if (parent && isVisible(parent) && node.nodeValue && node.nodeValue.trim()) {
      if (isCodeContext(node)) { node = walker.nextNode() as Text; continue; }
      if (isCodeFileName(node.nodeValue || '')) {
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

// 常见编程和配置文件后缀（去重并补充）
const CODE_FILE_SUFFIXES = [
  '.js', '.ts', '.jsx', '.tsx', '.c', '.cpp', '.h', '.hpp', '.py', '.java', '.go', '.rb', '.php', '.cs', '.swift', '.kt', '.m', '.sh', '.bat', '.pl', '.rs', '.dart', '.scala', '.lua', '.json', '.yaml', '.yml', '.xml', '.ini', '.conf', '.md', '.txt', '.csv', '.tsv', '.log', '.html', '.htm', '.css', '.scss', '.less', '.vue', '.svelte', '.lock', '.toml', '.gradle', '.make', '.mk', '.dockerfile', '.gitignore', '.gitattributes', '.env', '.config', '.properties', '.asm', '.sql', '.db', '.db3', '.sqlite', '.ps1', '.psm1', '.jsp', '.asp', '.aspx', '.vb', '.vbs', '.f90', '.f95', '.f03', '.f08', '.r', '.jl', '.groovy', '.erl', '.ex', '.exs', '.clj', '.cljs', '.edn', '.coffee', '.mjs', '.cjs', '.eslintrc', '.babelrc', '.npmrc', '.prettierrc', '.editorconfig', '.plist', '.crt', '.pem', '.key', '.csr', '.pub'
];

function isCodeFileName(text: string): boolean {
  const trimmed = text.trim();
  return CODE_FILE_SUFFIXES.some(suffix => trimmed.toLowerCase().endsWith(suffix));
}

// 增强的GitHub特定选择器和类名匹配
const GITHUB_CODE_SELECTORS = [
  // GitHub文件查看器
  '.blob-wrapper',
  '.blob-code',
  '.blob-code-inner', 
  '.blob-code-marker',
  '.blob-code-context',
  '.blob-code-addition',
  '.blob-code-deletion',
  '.blob-num',
  '.blob-num-addition',
  '.blob-num-deletion',
  '.blob-num-context',
  '.blob-num-hunk',
  
  // GitHub代码编辑器
  '.CodeMirror',
  '.CodeMirror-line',
  '.CodeMirror-code',
  '.CodeMirror-lines',
  '.cm-editor',
  '.cm-content',
  '.cm-line',
  '.cm-scroller',
  
  // GitHub文件树和导航
  '.js-navigation-item',
  '.file-navigation',
  '.file-tree',
  '.repository-content',
  
  // GitHub代码搜索结果
  '.code-list',
  '.code-list-item',
  '.highlight',
  '.search-code-line',
  
  // GitHub Pull Request diff
  '.file-diff',
  '.diff-table',
  '.js-file-line',
  '.js-line-number',
  
  // Monaco Editor (GitHub Codespaces)
  '.monaco-editor',
  '.monaco-scrollable-element',
  '.view-lines',
  '.view-line',
  
  // 其他代码相关
  '.highlight-source',
  '.pl-token',
  '.pl-c',
  '.pl-s',
  '.pl-k',
  '.pl-v',
  '.pl-en',
  '.pl-pds',
  '.pl-smi',
  '.pl-smw'
];

const GITHUB_CODE_CLASSES = [
  // GitHub原生类名
  'highlight', 'blob-code', 'hljs', 'language-', 'editor', 'CodeMirror', 'monaco', 'blob-textarea',
  'react-blob', 'file-editor', 'js-blob', 'js-code', 'cm-content', 'blob-code-inner', 'blob-code-marker',
  'blob-code-context', 'blob-code-addition', 'blob-code-deletion', 'react-blob-textarea',
  
  // 新增GitHub特定类名
  'blob-wrapper', 'blob-num', 'file-diff', 'diff-table', 'js-file-line', 'js-line-number',
  'code-list', 'search-code-line', 'highlight-source', 'repository-content', 'file-navigation',
  'js-navigation-item', 'file-tree', 'monaco-editor', 'view-lines', 'view-line',
  
  // Prism.js 和其他语法高亮
  'token', 'keyword', 'string', 'comment', 'number', 'operator', 'punctuation',
  'function', 'class-name', 'variable', 'constant', 'boolean', 'regex',
  
  // 通用代码标识符
  'source-code', 'syntax-highlight', 'code-block', 'code-snippet', 'terminal',
  'console', 'shell', 'command-line', 'output'
];

// 全局排除标签、class、选择器，可后续扩展
const EXCLUDE_TAGS = [
  'code', 'pre', 'samp', 'kbd', 'var', 'script', 'style', 'textarea', 'input'
];

const EXCLUDE_SELECTORS = [
  '[contenteditable]',
  // GitHub特定选择器
  '[data-code-marker]',
  '[data-line-number]',
  '[data-file-type]',
  '[role="gridcell"]', // GitHub表格单元格，通常包含代码
  '[class*="blob-"]',
  '[class*="CodeMirror"]',
  '[class*="monaco"]',
  '[class*="highlight"]'
];

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
 * 检查是否在GitHub代码相关容器中
 */
function isInGitHubCodeContainer(element: HTMLElement): boolean {
  // 检查当前元素及所有祖先元素
  let current: HTMLElement | null = element;
  while (current) {
    // 检查是否匹配GitHub代码选择器
    if (matchesSelectors(current, GITHUB_CODE_SELECTORS)) {
      return true;
    }
    
    // 检查data属性
    if (current.hasAttribute('data-code-marker') ||
        current.hasAttribute('data-line-number') ||
        current.hasAttribute('data-file-type') ||
        current.getAttribute('role') === 'gridcell') {
      return true;
    }
    
    current = current.parentElement;
  }
  return false;
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

function isCodeContext(node: Text): boolean {
  let parent = node.parentElement;
  if (!parent) return false;
  
  // 首先检查文本内容是否像代码
  if (looksLikeCode(node.nodeValue || '')) {
    return true;
  }
  
  while (parent) {
    const tag = parent.tagName.toLowerCase();
    
    // 检查标签名
    if (EXCLUDE_TAGS.includes(tag) || parent.hasAttribute('contenteditable')) {
      return true;
    }
    
    // 检查是否在GitHub代码容器中
    if (isInGitHubCodeContainer(parent)) {
      return true;
    }
    
    // 检查类名（增强模式）
    const classList = (parent.className || '').split(/\s+/).filter(Boolean);
    if (classList.length > 0) {
      // 完全匹配
      for (const cls of classList) {
        if (GITHUB_CODE_CLASSES.includes(cls)) {
          return true;
        }
      }
      
      // 部分匹配（包含关键词的类名）
      for (const cls of classList) {
        if (GITHUB_CODE_CLASSES.some(key => 
          cls.includes(key) || key.includes(cls)
        )) {
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
    
    // 检查是否为代码编辑器的特征元素
    const style = window.getComputedStyle(parent);
    if (style.fontFamily && 
        (style.fontFamily.includes('monospace') || 
         style.fontFamily.includes('Monaco') || 
         style.fontFamily.includes('Consolas') ||
         style.fontFamily.includes('Courier'))) {
      // 如果使用等宽字体，进一步检查是否在代码容器中
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
  
  async function translateVisible() {
    // 收集所有可见的文本节点
    const nodes = collectAllTextNodes(document.body, translatedSet, mode);
    console.log(`懒加载翻译: 收集到 ${nodes.length} 个节点`);
    
    // 复制一份，避免遍历过程中DOM变化影响本轮节点
    const nodesToProcess = nodes.slice();
    let translatedCount = 0;
    let skippedCodeCount = 0;
    
    for (const node of nodesToProcess) {
      // 检查是否在视窗内（对于懒加载模式）
      if (isInViewport(node)) {
        // compare模式下，祖先链上有compare span直接跳过
        if (mode === 'compare' && hasCompareAncestor(node)) continue;
        if (mode === 'compare' && hasSiblingCompareSpan(node)) continue;
        
        // 增强的代码检测
        if (isCodeContext(node)) {
          skippedCodeCount++;
          continue;
        }
        
        try {
          const { result } = await callTranslateAPI(node.nodeValue, 'auto', targetLang, engine);
          if (mode === 'translated') {
            if (node.parentNode) node.nodeValue = result;
            translatedSet.add(node);
            translatedCount++;
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
              span.setAttribute('data-compare-translated', '1');
              span.setAttribute('data-compare-id', String(compareIdCounter++));
              span.setAttribute('data-compare-original', node.nodeValue || '');
              span.innerHTML = `<span style=\"color:#888;\">${node.nodeValue}</span><br/><span style=\"color:${origColor || '#222'};\">${result}</span>`;
              node.parentNode.replaceChild(span, node);
              translatedCount++;
            }
          }
        } catch (error) {
          console.warn('翻译失败:', error);
        }
      }
    }
    
    console.log(`懒加载翻译完成: 翻译了 ${translatedCount} 个节点，跳过代码 ${skippedCodeCount} 个节点`);
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