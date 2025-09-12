import { isInputElement } from '../utils/domUtil';


// 检查点击路径中是否包含输入元素
function pathContainsInputElement(path: EventTarget[]): boolean {
  return path.some(target => {
    if (target instanceof Element) {
      return isInputElement(target);
    }
    return false;
  });
}

// 检查是否点击在翻译组件内部
function isClickOnTranslatorComponent(path: EventTarget[], shadowRoot: ShadowRoot | null): boolean {
  if (!shadowRoot) return false;
  
  const inputTranslatorElement = shadowRoot.querySelector('.input-translator-card');
  const resultElement = shadowRoot.querySelector('[data-translator-result]');
  const iconElement = shadowRoot.querySelector('.translator-icon');
  
  return path.some(target => {
    return (inputTranslatorElement && target === inputTranslatorElement) ||
           (resultElement && target === resultElement) ||
           (iconElement && target === iconElement) ||
           (inputTranslatorElement && target instanceof Node && inputTranslatorElement.contains(target)) ||
           (resultElement && target instanceof Node && resultElement.contains(target)) ||
           (iconElement && target instanceof Node && iconElement.contains(target));
  });
}

// 文本选择和翻译触发逻辑
export const setupSelectionHandler = (
  shadowRoot: ShadowRoot | null,
  showTranslationIcon: (text: string, rect: DOMRect, forceTranslate?: boolean) => void,
  clearTranslationState: () => void,
  isTextTranslateEnabled: boolean = true, // 新增：是否启用划词翻译
  settings: {
    selectTranslate: boolean; // 选择时自动翻译
    doubleClickTranslate: boolean; // 双击翻译
    quickTranslate: boolean; // 悬停翻译
    pressKeyTranslate: boolean; // 快捷键翻译
  } = {
    selectTranslate: false,
    doubleClickTranslate: false,
    quickTranslate: false,
    pressKeyTranslate: false,
  }
) => {
  let currentSelectionRange: Range | null = null;
  let iconUpdateTimer: NodeJS.Timeout | null = null;
  let mutationObserver: MutationObserver | null = null;
  let isUserSelecting: boolean = false; // 跟踪用户是否正在选择文本

  // 检查选区是否仍然有效（DOM节点未被删除）
  const isSelectionValid = (range: Range): boolean => {
    try {
      // 检查 range 的容器节点是否仍在文档中
      const startContainer = range.startContainer;
      const endContainer = range.endContainer;
      
      return document.contains(startContainer) && document.contains(endContainer);
    } catch (error) {
      return false;
    }
  };

  // 更新图标位置
  const updateIconPosition = () => {
    // 如果划词翻译功能未启用，不显示图标
    if (!isTextTranslateEnabled) {
      clearTranslationState();
      currentSelectionRange = null;
      return;
    }
    
    if (currentSelectionRange) {
      try {
        // 首先检查保存的选区是否仍然有效
        if (!isSelectionValid(currentSelectionRange)) {
          clearTranslationState();
          currentSelectionRange = null;
          return;
        }

        // 重新获取当前选区，而不是依赖保存的 range
        const selection = window.getSelection();
        const text = selection?.toString().trim();
        
        if (text && text.length > 0 && selection && selection.rangeCount > 0) {
          // 使用当前选区而不是保存的 range
          const currentRange = selection.getRangeAt(0);
          const rect = currentRange.getBoundingClientRect();
          
          // 检查选区是否仍然可见（在视窗内或部分可见）
          if (rect.width > 0 && rect.height > 0) {
            // 更新保存的选区引用
            currentSelectionRange = currentRange.cloneRange();
            showTranslationIcon(text, rect);
          } else {
            clearTranslationState();
            currentSelectionRange = null;
          }
        } else {
          clearTranslationState();
          currentSelectionRange = null;
        }
      } catch (error) {
        clearTranslationState();
        currentSelectionRange = null;
      }
    }
  };

  // 防抖的位置更新
  const debouncedUpdatePosition = () => {
    if (iconUpdateTimer) {
      clearTimeout(iconUpdateTimer);
    }
    iconUpdateTimer = setTimeout(updateIconPosition, 100);
  };

  // 处理滚动事件
  const handleScroll = () => {
    debouncedUpdatePosition();
  };

  // 处理窗口大小变化
  const handleResize = () => {
    debouncedUpdatePosition();
  };

  // 处理DOM变化（如动态内容加载）
  const handleDOMChange = () => {
    // 如果用户正在选择，延迟处理
    if (isUserSelecting) {
      if (iconUpdateTimer) {
        clearTimeout(iconUpdateTimer);
      }
      iconUpdateTimer = setTimeout(() => {
        if (!isUserSelecting) {
          updateIconPosition();
        }
      }, 200);
      return;
    }

    // 使用更短的延迟来快速响应DOM变化
    if (iconUpdateTimer) {
      clearTimeout(iconUpdateTimer);
    }
    iconUpdateTimer = setTimeout(updateIconPosition, 50);
  };

  // 设置 MutationObserver 监听DOM变化
  const setupMutationObserver = () => {
    if (mutationObserver) {
      mutationObserver.disconnect();
    }

    mutationObserver = new MutationObserver((mutations) => {
      // 如果用户正在选择文本，完全忽略DOM变化
      if (isUserSelecting) {
        return;
      }

      // 只有在存在当前选区时才处理DOM变化
      if (!currentSelectionRange) {
        return;
      }

      // 检查是否有真正影响布局的变化
      const hasSignificantChange = mutations.some(mutation => {
        // 排除翻译组件自身的变化
        if (mutation.target && shadowRoot) {
          const target = mutation.target as Element;
          if (shadowRoot.contains(target)) {
            return false;
          }
        }

        // 只关注重要的DOM变化
        if (mutation.type === 'childList') {
          // 忽略文本节点的变化，只关注元素的添加删除
          const hasElementChanges = Array.from(mutation.addedNodes).some(node => node.nodeType === Node.ELEMENT_NODE) ||
                                   Array.from(mutation.removedNodes).some(node => node.nodeType === Node.ELEMENT_NODE);
          return hasElementChanges;
        }
        
        if (mutation.type === 'attributes') {
          // 只关注可能影响位置的属性
          const criticalAttributes = ['style', 'class', 'transform', 'data-*'];
          return criticalAttributes.some(attr => 
            mutation.attributeName === attr || 
            (attr === 'data-*' && mutation.attributeName?.startsWith('data-'))
          );
        }
        
        return false;
      });

      if (hasSignificantChange) {
        handleDOMChange();
      }
    });

    // 减少监听范围，提高性能
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['style', 'class', 'transform'], // 只监听关键属性
      characterData: false // 不监听文本内容变化
    });
  };

  const handleMouseUp = (e: MouseEvent) => {
    const path = e.composedPath();
    
    // 0. 如果划词翻译功能未启用，不处理翻译逻辑
    if (!isTextTranslateEnabled) {
      isUserSelecting = false;
      return;
    }
    
    // 1. 如果点击路径中包含输入元素，直接返回，不处理翻译逻辑
    if (pathContainsInputElement(path)) {
      isUserSelecting = false;
      return;
    }
    
    // 2. 如果点击在翻译组件内部，直接返回
    if (isClickOnTranslatorComponent(path, shadowRoot)) {
      isUserSelecting = false;
      return;
    }

    // 延迟处理，确保选择完全完成，但使用更短的延迟
    setTimeout(() => {
      // 标记用户完成选择
      isUserSelecting = false;
      
      // 3. 处理文本选择逻辑
      const selection = window.getSelection();
      const text = selection?.toString().trim();

      if (text && text.length > 0 && selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        // 验证选区是否有效
        if (rect.width > 0 && rect.height > 0) {
          currentSelectionRange = range.cloneRange(); // 保存选区的副本
          showTranslationIcon(text, rect);
        } else {
          currentSelectionRange = null;
          clearTranslationState();
        }
      } else {
        // 4. 没有选中内容，且不是点击在翻译组件内部，清空所有
        currentSelectionRange = null;
        clearTranslationState();
        
        // 清除选中状态
        if (window.getSelection) {
          const sel = window.getSelection();
          if (sel) sel.removeAllRanges();
        }
      }
    }, 50); // 减少延迟到50ms
  };

  // 优化 mousedown 事件处理器，减少对输入框的干扰
  const handleMouseDown = (e: MouseEvent) => {
    const path = e.composedPath();
    
    // 如果划词翻译功能未启用，不处理翻译逻辑
    if (!isTextTranslateEnabled) {
      isUserSelecting = false;
      return;
    }
    
    // 如果点击路径中包含输入元素，直接返回，不处理任何逻辑
    if (pathContainsInputElement(path)) {
      isUserSelecting = false;
      return;
    }
    
    // 如果点击在翻译组件内部，不处理
    if (isClickOnTranslatorComponent(path, shadowRoot)) {
      isUserSelecting = false;
      return;
    }

    // 标记用户开始选择文本
    isUserSelecting = true;

    // 简化清理逻辑 - 如果点击空白区域且没有立即开始拖拽，则清理状态
    setTimeout(() => {
      if (!isUserSelecting) return; // 如果已经在mouseup中处理了，就不再处理
      
      const currentSelection = window.getSelection();
      const currentText = currentSelection?.toString().trim();
      
      // 如果当前没有选中文本，则清空翻译状态
      if (!currentText) {
        currentSelectionRange = null;
        clearTranslationState();
      }
    }, 100);
  };

  // 处理选择变化事件（更可靠的选择检测）
  const handleSelectionChange = () => {
    // 如果划词翻译功能未启用，不处理选择变化
    if (!isTextTranslateEnabled) {
      return;
    }
    
    // 防止在用户明确开始选择时过早触发
    if (isUserSelecting) {
      return;
    }

    const selection = window.getSelection();
    const text = selection?.toString().trim();
    
    if (text && text.length > 0 && selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();
      
      if (rect.width > 0 && rect.height > 0) {
        currentSelectionRange = range.cloneRange();
        showTranslationIcon(text, rect);
      }
    }
  };

  // 双击翻译处理器
  const handleDoubleClick = (e: MouseEvent) => {
    if (!isTextTranslateEnabled || !settings.doubleClickTranslate) {
      return;
    }

    const path = e.composedPath();
    
    // 如果双击在输入元素或翻译组件内部，不处理
    if (pathContainsInputElement(path) || isClickOnTranslatorComponent(path, shadowRoot)) {
      return;
    }

    // 获取双击位置的单词
    const selection = window.getSelection();
    let text = '';
    let rect: DOMRect | null = null;

    if (selection && selection.toString().trim()) {
      // 如果有选中文本，使用选中的文本
      text = selection.toString().trim();
      if (selection.rangeCount > 0) {
        rect = selection.getRangeAt(0).getBoundingClientRect();
      }
    } else {
      // 如果没有选中文本，尝试选择双击位置的单词
      const range = document.caretRangeFromPoint(e.clientX, e.clientY);
      if (range) {
        // 扩展选区到完整单词
        const textNode = range.startContainer;
        if (textNode.nodeType === Node.TEXT_NODE) {
          const textContent = textNode.textContent || '';
          const offset = range.startOffset;
          
          // 向前查找单词边界
          let start = offset;
          while (start > 0 && /\w/.test(textContent[start - 1])) {
            start--;
          }
          
          // 向后查找单词边界
          let end = offset;
          while (end < textContent.length && /\w/.test(textContent[end])) {
            end++;
          }
          
          if (start < end) {
            range.setStart(textNode, start);
            range.setEnd(textNode, end);
            text = range.toString().trim();
            if (text) {
              selection?.removeAllRanges();
              selection?.addRange(range);
              rect = range.getBoundingClientRect();
            }
          }
        }
      }
    }

    if (text && rect && rect.width > 0 && rect.height > 0) {
      currentSelectionRange = selection?.rangeCount ? selection.getRangeAt(0).cloneRange() : null;
      // 双击翻译应该直接显示翻译结果
      showTranslationIcon(text, rect, true); // 传入 forceTranslate=true
    }
  };

  // 悬停翻译处理器
  let hoverTimer: NodeJS.Timeout | null = null;
  const handleMouseMove = (e: MouseEvent) => {
    if (!isTextTranslateEnabled || !settings.quickTranslate) {
      return;
    }

    // 清除之前的定时器
    if (hoverTimer) {
      clearTimeout(hoverTimer);
      hoverTimer = null;
    }

    const path = e.composedPath();
    
    // 如果鼠标在输入元素或翻译组件内部，不处理
    if (pathContainsInputElement(path) || isClickOnTranslatorComponent(path, shadowRoot)) {
      return;
    }

    // 设置悬停延迟
    hoverTimer = setTimeout(() => {
      const selection = window.getSelection();
      
      // 如果已经有选中的文本，使用选中的文本
      if (selection && selection.toString().trim()) {
        const text = selection.toString().trim();
        if (selection.rangeCount > 0) {
          const rect = selection.getRangeAt(0).getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) {
            currentSelectionRange = selection.getRangeAt(0).cloneRange();
            // 悬停翻译应该直接显示翻译结果
            showTranslationIcon(text, rect, true); // 传入 forceTranslate=true
          }
        }
      } else {
        // 尝试获取鼠标位置的单词
        const range = document.caretRangeFromPoint(e.clientX, e.clientY);
        if (range) {
          // 扩展选区到完整单词
          const textNode = range.startContainer;
          if (textNode.nodeType === Node.TEXT_NODE) {
            const textContent = textNode.textContent || '';
            const offset = range.startOffset;
            
            // 向前查找单词边界
            let start = offset;
            while (start > 0 && /\w/.test(textContent[start - 1])) {
              start--;
            }
            
            // 向后查找单词边界
            let end = offset;
            while (end < textContent.length && /\w/.test(textContent[end])) {
              end++;
            }
            
            if (start < end) {
              range.setStart(textNode, start);
              range.setEnd(textNode, end);
              const text = range.toString().trim();
              if (text && text.length > 1) { // 至少2个字符才触发
                const rect = range.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                  selection?.removeAllRanges();
                  selection?.addRange(range);
                  currentSelectionRange = range.cloneRange();
                  // 悬停翻译应该直接显示翻译结果
                  showTranslationIcon(text, rect, true); // 传入 forceTranslate=true
                }
              }
            }
          }
        }
      }
    }, 800); // 800ms 悬停延迟
  };

  // 添加事件监听器
  document.addEventListener('mouseup', handleMouseUp, { passive: true });
  document.addEventListener('mousedown', handleMouseDown, { passive: true });
  document.addEventListener('selectionchange', handleSelectionChange, { passive: true });
  document.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleResize, { passive: true });
  
  // 添加双击和悬停事件监听器
  if (settings.doubleClickTranslate) {
    document.addEventListener('dblclick', handleDoubleClick, { passive: true });
  }
  if (settings.quickTranslate) {
    document.addEventListener('mousemove', handleMouseMove, { passive: true });
  }
  
  // 设置DOM变化监听
  setupMutationObserver();
  
  return () => {
    // 清理定时器
    if (iconUpdateTimer) {
      clearTimeout(iconUpdateTimer);
    }
    if (hoverTimer) {
      clearTimeout(hoverTimer);
    }
    
    // 断开 MutationObserver
    if (mutationObserver) {
      mutationObserver.disconnect();
      mutationObserver = null;
    }
    
    // 移除事件监听器
    document.removeEventListener('mouseup', handleMouseUp);
    document.removeEventListener('mousedown', handleMouseDown);
    document.removeEventListener('selectionchange', handleSelectionChange);
    document.removeEventListener('scroll', handleScroll);
    window.removeEventListener('resize', handleResize);
    document.removeEventListener('dblclick', handleDoubleClick);
    document.removeEventListener('mousemove', handleMouseMove);
    
    // 清理状态
    currentSelectionRange = null;
  };
};

// 获取翻译目标语言