import React, { useEffect } from 'react';

const ContentScript = () => {
  useEffect(() => {
    const handleMouseUp = async (e: MouseEvent) => {
      const selection = window.getSelection()?.toString().trim();
      if (selection) {
        const result = await translateWithBing(selection);
        alert(`翻译结果：${result}`);
      }
    };
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  return null;
};

export default ContentScript;

async function translateWithBing(text: string) {
  // 使用 Bing 翻译的免费接口（非官方API，仅供学习测试）
  const res = await fetch(
    `https://api.microsofttranslator.com/V2/Ajax.svc/Translate?from=auto&to=zh-CHS&text=${encodeURIComponent(text)}`
  );
  const data = await res.text();
  // Bing 返回的是 JSONP 格式，需要去除首尾引号
  return data.replace(/^"|"$/g, "");
} 