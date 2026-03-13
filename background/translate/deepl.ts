import { getEngineLangCode } from '~lib/constants/languages';

const DEEPL_ENDPOINT = 'https://www2.deepl.com/jsonrpc';
const DEEPL_HEADERS = {
  Accept: '*/*',
  'Accept-Language': 'en-US,en;q=0.9',
  'Content-Type': 'application/json',
  'User-Agent':
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
  'x-app-os-name': 'iOS',
  'x-app-os-version': '16.3.0',
};

let requestId = Math.floor(Math.random() * 10_000) * 10_000 + 1;

function nextRequestId() {
  requestId += 1;
  return requestId;
}

function normalizeDeepLLanguage(code: string, role: 'source' | 'target') {
  const normalized = getEngineLangCode(code, 'deepl');

  if (!normalized || (role === 'source' && normalized === 'auto')) {
    return role === 'source' ? 'auto' : '';
  }

  if (normalized.startsWith('EN')) {
    return 'EN';
  }

  if (normalized.startsWith('PT')) {
    return 'PT';
  }

  if (normalized.startsWith('ZH')) {
    return 'ZH';
  }

  return normalized.toUpperCase();
}

function countLetterI(text: string) {
  return (text.match(/i/g) || []).length;
}

function buildTimestamp(text: string) {
  const count = countLetterI(text);
  const now = Date.now();

  if (count === 0) {
    return now;
  }

  return now - (now % (count + 1)) + (count + 1);
}

function formatDeepLBody(payload: Record<string, unknown>, id: number) {
  const body = JSON.stringify(payload);
  const replacement = (id + 5) % 29 === 0 || (id + 3) % 13 === 0 ? '"method" : "' : '"method": "';
  return body.replace('"method":"', replacement);
}

async function requestDeepL(text: string, from: string, to: string) {
  const sourceLang = normalizeDeepLLanguage(from, 'source');
  const targetLang = normalizeDeepLLanguage(to, 'target');

  if (!targetLang) {
    throw new Error(`Unsupported DeepL target language: ${to}`);
  }

  const id = nextRequestId();
  const payload = {
    jsonrpc: '2.0',
    method: 'LMT_handle_texts',
    id,
    params: {
      splitting: 'newlines',
      lang: {
        source_lang_user_selected: sourceLang,
        target_lang: targetLang,
      },
      texts: [
        {
          text,
          requestAlternatives: 0,
        },
      ],
      timestamp: buildTimestamp(text),
      commonJobParams: {
        wasSpoken: false,
        transcribe_as: '',
      },
    },
  };

  const response = await fetch(DEEPL_ENDPOINT, {
    method: 'POST',
    headers: DEEPL_HEADERS,
    body: formatDeepLBody(payload, id),
    signal: AbortSignal.timeout(20_000),
  });

  if (!response.ok) {
    throw new Error(`DeepL web request failed with status ${response.status}`);
  }

  const data = (await response.json()) as {
    result?: {
      texts?: Array<{ text?: string }>;
    };
  };

  const translation = data?.result?.texts?.[0]?.text?.trim();
  if (!translation) {
    throw new Error('DeepL web response did not include translated text');
  }

  return translation;
}

export async function deeplTranslate(text: string, from: string, to: string): Promise<string> {
  return requestDeepL(text, from, to);
}

export async function deeplTranslateBatch(
  texts: string[],
  from: string,
  to: string
): Promise<string[]> {
  if (texts.length === 0) {
    return [];
  }

  const concurrency = 4;
  const results = new Array<string>(texts.length);

  for (let index = 0; index < texts.length; index += concurrency) {
    const chunk = texts.slice(index, index + concurrency);
    const translations = await Promise.all(
      chunk.map((text) => requestDeepL(text, from, to).catch(() => ''))
    );

    translations.forEach((translation, offset) => {
      results[index + offset] = translation;
    });
  }

  return results;
}
