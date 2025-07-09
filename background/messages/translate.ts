import type { PlasmoMessaging } from "@plasmohq/messaging"

const handler: PlasmoMessaging.MessageHandler = async (req, res) => {
  const { text } = req.body
  
  try {
    const result = await translateText(text)
    res.send({ result })
  } catch (error) {
    res.send({ error: error.message })
  }
}

export default handler

// 翻译函数
async function translateText(text: string) {
  const sourceLang = detectLanguage(text);
  const targetLang = 'zh';
  
  // 如果已经是中文，直接返回原文
  if (sourceLang === 'zh') {
    return text;
  }
  
  console.log('Background: 开始翻译:', text);
  console.log('Background: 检测到的语言:', sourceLang);
  
  const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${sourceLang}|${targetLang}`;
  
  try {
    const response = await fetch(url);
    
    if (!response.ok) {
      throw new Error(`HTTP错误: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('Background: API响应:', data);
    
    if (data.responseStatus === 200) {
      return data.responseData.translatedText;
    } else {
      throw new Error(`API错误: ${data.responseDetails || '未知错误'}`);
    }
  } catch (error) {
    console.error('Background: 翻译失败:', error);
    throw error;
  }
}

// 简单的语言检测函数
function detectLanguage(text: string): string {
  const chineseRegex = /[\u4e00-\u9fff]/;
  const englishRegex = /[a-zA-Z]/;
  const japaneseRegex = /[\u3040-\u309f\u30a0-\u30ff]/;
  const koreanRegex = /[\uac00-\ud7af]/;
  
  if (chineseRegex.test(text)) {
    return 'zh';
  } else if (japaneseRegex.test(text)) {
    return 'ja';
  } else if (koreanRegex.test(text)) {
    return 'ko';
  } else if (englishRegex.test(text)) {
    return 'en';
  } else {
    return 'en';
  }
} 