import { getEngineLangCode } from '../../lib/languages';
import { Storage } from '@plasmohq/storage';

const storage = new Storage();
const DEEPL_API_KEY = 'deepl_api_key';

// DeepL 免费 API 接口
export async function deeplTranslate(text: string, from: string, to: string): Promise<string> {
  try {
    console.log('DeepL翻译开始:', { text, from, to });
    
    // 从存储中获取 API key
    const apiKey = await storage.get(DEEPL_API_KEY);
    if (!apiKey || typeof apiKey !== 'string') {
      throw new Error('请先在设置中配置 DeepL API Key');
    }
    
    // 语言代码映射
    let targetLang = getEngineLangCode(to, 'deepl');
    if (targetLang === "pt") {
      targetLang = "pt-BR";
    } else if (targetLang === "no") {
      targetLang = "nb";
    } else if (targetLang.startsWith("zh-")) {
      targetLang = "zh";
    } else if (targetLang.startsWith("fr-")) {
      targetLang = "fr";
    }
    
    const url = 'https://api-free.deepl.com/v2/translate';
    const params = new URLSearchParams();
    params.append("text", text);
    if (from !== "auto") {
      // params.append("source_lang", from); // 可选参数
    }
    params.append("target_lang", targetLang);
    
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `DeepL-Auth-Key ${apiKey}`
      },
      body: params.toString(),
      signal: AbortSignal.timeout(15000), // 15秒超时
    });
    
    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`DeepL翻译请求失败: ${res.status} ${errorText}`);
    }
    
    const data = await res.json();
    console.log('DeepL翻译响应:', data);
    
    if (!data?.translations?.[0]?.text) {
      throw new Error('DeepL翻译失败: ' + JSON.stringify(data));
    }
    
    const result = data.translations[0].text;
    console.log('DeepL翻译完成:', result);
    return result;
  } catch (error) {
    console.error('DeepL翻译错误:', error);
    throw error;
  }
}

export async function deeplTranslateBatch(texts: string[], from: string, to: string): Promise<string[]> {
  // DeepL API 支持批量（多个 text 参数），但这里保险起见循环调用
  const results: string[] = [];
  for (const text of texts) {
    try {
      const result = await deeplTranslate(text, from, to);
      results.push(result);
    } catch (e) {
      results.push('');
    }
  }
  return results;
} 