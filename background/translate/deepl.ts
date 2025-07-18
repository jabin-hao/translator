import { getEngineLangCode } from '../../lib/languages';

// 模拟DeepL网页接口（TWP方案，无需API Key）
export async function deeplTranslate(text: string, from: string, to: string): Promise<string> {
  const fromMapped = getEngineLangCode(from, 'deepl');
  const toMapped = getEngineLangCode(to, 'deepl');
  const url = 'https://www.deepl.com/jsonrpc';
  const body = {
    jsonrpc: "2.0",
    method: "LMT_handle_texts",
    id: Date.now(),
    params: {
      texts: [{ text, requestAlternatives: 3 }],
      splitting: "newlines",
      lang: {
        source_lang_user_selected: fromMapped,
        target_lang: toMapped
      },
      timestamp: Date.now()
    }
  };
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': '*/*',
      'Referer': 'https://www.deepl.com/translator'
    },
    body: JSON.stringify(body)
  });
  const data = await res.json();
  if (!data?.result?.texts?.[0]?.text) {
    throw new Error('DeepL网页接口翻译失败: ' + JSON.stringify(data));
  }
  return data.result.texts[0].text;
} 