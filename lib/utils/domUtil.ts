// DOM 工具函数
// 检查元素是否为输入元素或可编辑元素
export function isInputElement(element: Element | null): boolean {
  if (!element) return false;

  const tagName = element.tagName.toLowerCase();

  // 检查是否为输入元素
  if (['input', 'textarea', 'select'].includes(tagName)) {
    return true;
  }

  // 检查是否为可编辑元素
  if (element.hasAttribute('contenteditable')) {
    const contentEditable = element.getAttribute('contenteditable');
    return contentEditable === '' || contentEditable === 'true';
  }

  return false;
}

