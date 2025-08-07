import {getEngineLangCode} from '~lib/constants/languages';
import {DEEPL_API_KEY} from '~lib/constants/settings';
import {getConfig} from "~lib/utils/storage";

// DeepL 免费 API 接口
export async function deeplTranslate(text: string, from: string, to: string): Promise<string> {
  try {
    // 从存储中获取 API key
    const apiKey = await getConfig(DEEPL_API_KEY, '');
    if (!apiKey || typeof apiKey !== 'string') {
      console.warn('请先在设置中配置 DeepL API Key');
    }
    
    // 语言代码映射 todo:迁移到language
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
      console.error(`DeepL翻译请求失败: ${res.status} ${errorText}`);
    }
    
    const data = await res.json();

    if (!data?.translations?.[0]?.text) {
      console.error('DeepL翻译失败: ' + JSON.stringify(data));
    }

    return data.translations[0].text;
  } catch (error) {
    console.error('DeepL翻译错误:', error);
  }
}

// export async function deeplTranslateBatch(texts: string[], from: string, to: string): Promise<string[]> {
//   // DeepL API 支持批量（多个 text 参数），但这里保险起见循环调用
//   const results: string[] = [];
//   for (const text of texts) {
//     try {
//       const result = await deeplTranslate(text, from, to);
//       results.push(result);
//     } catch (e) {
//       results.push('');
//     }
//   }
//   return results;
// }
export async function deeplTranslateBatch(texts: string[], from: string, to: string): Promise<string[]> {
  // DeepL API 支持批量（多个 text 参数），但这里保险起见并发调用
  return Promise.all(
    texts.map(async (text) => {
      try {
        return await deeplTranslate(text, from, to);
      } catch {
        return '';
      }
    })
  );
}