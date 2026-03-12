import { getEngineLangCode } from '~lib/constants/languages';

const YANDEX_WIDGET_URL =
  'https://translate.yandex.net/website-widget/v1/widget.js?widgetId=ytWidget&pageLang=en&widgetTheme=light&autoMode=false';
const YANDEX_TRANSLATE_URL = 'https://translate.yandex.net/api/v1/tr.json/translate?srv=tr-url-widget';
const YANDEX_HEADERS = {
  Accept: 'application/json, text/javascript, */*; q=0.01',
  'Accept-Language': 'en-US,en;q=0.9',
  Referer: 'https://translate.yandex.net/',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
};

let cachedSid = '';
let sidFetchedAt = 0;

function normalizeYandexLanguage(code: string, role: 'source' | 'target') {
  const normalized = getEngineLangCode(code, 'yandex');

  if (!normalized || (role === 'source' && normalized === 'auto')) {
    return role === 'source' ? 'auto' : '';
  }

  return normalized.toLowerCase();
}

async function getWidgetSid() {
  const now = Date.now();
  if (cachedSid && now - sidFetchedAt < 10 * 60 * 1000) {
    return cachedSid;
  }

  const response = await fetch(YANDEX_WIDGET_URL, {
    headers: YANDEX_HEADERS,
    signal: AbortSignal.timeout(10_000),
  });

  if (!response.ok) {
    throw new Error(`Yandex widget bootstrap failed with status ${response.status}`);
  }

  const script = await response.text();
  const match = script.match(/sid:\s*'([^']+)'/i);

  if (!match?.[1]) {
    throw new Error('Unable to resolve Yandex widget SID');
  }

  cachedSid = match[1];
  sidFetchedAt = now;
  return cachedSid;
}

function buildWidgetRequestId(baseSid: string, batchIndex: number) {
  return `${baseSid}-${batchIndex}-0`;
}

async function requestYandex(texts: string[], from: string, to: string) {
  const sourceLang = normalizeYandexLanguage(from, 'source');
  const targetLang = normalizeYandexLanguage(to, 'target');

  if (!targetLang) {
    throw new Error(`Unsupported Yandex target language: ${to}`);
  }

  const baseSid = await getWidgetSid();
  const params = new URLSearchParams();
  params.append('id', buildWidgetRequestId(baseSid, 0));
  params.append('srv', 'tr-url-widget');
  params.append('format', 'html');
  params.append('lang', sourceLang === 'auto' ? targetLang : `${sourceLang}-${targetLang}`);
  params.append('reason', 'auto');
  params.append('context_title', 'translator');
  texts.forEach((text) => params.append('text', text));

  const response = await fetch(`${YANDEX_TRANSLATE_URL}&${params.toString()}`, {
    headers: YANDEX_HEADERS,
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    cachedSid = '';
    throw new Error(`Yandex widget request failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    code?: number;
    text?: string[];
  };

  if (data?.code !== 200 || !Array.isArray(data.text)) {
    throw new Error(`Yandex widget response error: ${data?.code ?? 'unknown'}`);
  }

  return data.text.map((item) => item.replace(/<wbr>/g, ''));
}

export async function yandexTranslate(text: string, from: string, to: string): Promise<string> {
  const [translation] = await requestYandex([text], from, to);
  if (!translation?.trim()) {
    throw new Error('Yandex widget response did not include translated text');
  }
  return translation;
}

export async function yandexTranslateBatch(
  texts: string[],
  from: string,
  to: string
): Promise<string[]> {
  if (texts.length === 0) {
    return [];
  }

  const batchSize = 8;
  const results: string[] = [];

  for (let index = 0; index < texts.length; index += batchSize) {
    const chunk = texts.slice(index, index + batchSize);

    try {
      const translated = await requestYandex(chunk, from, to);
      results.push(...translated);
    } catch {
      const fallback = await Promise.all(chunk.map((text) => yandexTranslate(text, from, to).catch(() => '')));
      results.push(...fallback);
    }

    if (index + batchSize < texts.length) {
      await new Promise((resolve) => setTimeout(resolve, 120));
    }
  }

  return results;
}
