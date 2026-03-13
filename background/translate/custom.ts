import { DEFAULT_LLM_PROMPT, OPENAI_COMPATIBLE_PROVIDERS } from '~lib/constants/customEngines';
import type { CustomEngine, CustomEngineProvider, GlobalSettings } from '~lib/constants/types';
import { GLOBAL_SETTINGS_KEY } from '~lib/settings/settings';
import { storageApi } from '~lib/storage/storage';

type JsonRecord = Record<string, unknown>;

function resolvePrompt(engine: CustomEngine, text: string, from: string, to: string) {
  const template = engine.prompt?.trim() || DEFAULT_LLM_PROMPT;

  return template
    .replaceAll('{text}', text)
    .replaceAll('{sourceLang}', from)
    .replaceAll('{targetLang}', to)
    .replaceAll('{from}', from)
    .replaceAll('{to}', to);
}

function mergeHeaders(engine: CustomEngine) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(engine.headers || {}),
  };

  if (!engine.apiKey) {
    return headers;
  }

  if (engine.provider === 'anthropic') {
    if (!headers['x-api-key']) {
      headers['x-api-key'] = engine.apiKey;
    }
    if (!headers['anthropic-version']) {
      headers['anthropic-version'] = '2023-06-01';
    }
    return headers;
  }

  if (engine.provider === 'gemini') {
    return headers;
  }

  if (!headers.Authorization) {
    headers.Authorization = `Bearer ${engine.apiKey}`;
  }

  return headers;
}

function resolveUrl(engine: CustomEngine) {
  if (engine.provider !== 'gemini' || !engine.apiKey) {
    return engine.apiUrl.replace('{model}', engine.model || '');
  }

  const url = new URL(engine.apiUrl.replace('{model}', engine.model || ''));
  if (!url.searchParams.has('key')) {
    url.searchParams.set('key', engine.apiKey);
  }
  return url.toString();
}

function extractTextFromUnknown(value: unknown): string | null {
  if (typeof value === 'string') {
    return value.trim() || null;
  }

  if (Array.isArray(value)) {
    const joined = value
      .map((item) => extractTextFromUnknown(item))
      .filter(Boolean)
      .join('\n')
      .trim();
    return joined || null;
  }

  if (value && typeof value === 'object') {
    const record = value as JsonRecord;
    return (
      extractTextFromUnknown(record.translation) ||
      extractTextFromUnknown(record.translatedText) ||
      extractTextFromUnknown(record.text) ||
      extractTextFromUnknown(record.content) ||
      extractTextFromUnknown(record.result) ||
      null
    );
  }

  return null;
}

function parseCustomApiResponse(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Custom API must return a JSON object with a "translation" field');
  }

  const record = payload as JsonRecord;
  const translation =
    extractTextFromUnknown(record.translation) ||
    extractTextFromUnknown(record.translatedText) ||
    extractTextFromUnknown(record.result) ||
    extractTextFromUnknown((record.data as JsonRecord | undefined)?.translation) ||
    extractTextFromUnknown((record.data as JsonRecord | undefined)?.translatedText);

  if (!translation) {
    throw new Error('Custom API response must include "translation" or "translatedText"');
  }

  return translation;
}

function parseOpenAICompatibleResponse(payload: unknown) {
  const choices = (payload as JsonRecord | undefined)?.choices;
  if (!Array.isArray(choices) || choices.length === 0) {
    throw new Error('LLM response does not contain choices');
  }

  const firstChoice = choices[0] as JsonRecord;
  const translation =
    extractTextFromUnknown((firstChoice.message as JsonRecord | undefined)?.content) ||
    extractTextFromUnknown(firstChoice.text);

  if (!translation) {
    throw new Error('LLM response does not contain readable message content');
  }

  return translation;
}

function parseAnthropicResponse(payload: unknown) {
  const content = (payload as JsonRecord | undefined)?.content;
  const translation = extractTextFromUnknown(content);

  if (!translation) {
    throw new Error('Anthropic response does not contain text content');
  }

  return translation;
}

function parseGeminiResponse(payload: unknown) {
  const candidates = (payload as JsonRecord | undefined)?.candidates;
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new Error('Gemini response does not contain candidates');
  }

  const firstCandidate = candidates[0] as JsonRecord;
  const translation = extractTextFromUnknown(
    (firstCandidate.content as JsonRecord | undefined)?.parts
  );

  if (!translation) {
    throw new Error('Gemini response does not contain text parts');
  }

  return translation;
}

function parseOllamaResponse(payload: unknown) {
  const record = payload as JsonRecord | undefined;
  const translation =
    extractTextFromUnknown((record?.message as JsonRecord | undefined)?.content) ||
    extractTextFromUnknown(record?.response);

  if (!translation) {
    throw new Error('Ollama response does not contain text content');
  }

  return translation;
}

function buildLlmBody(engine: CustomEngine, text: string, from: string, to: string) {
  const prompt = resolvePrompt(engine, text, from, to);

  if (OPENAI_COMPATIBLE_PROVIDERS.has(engine.provider)) {
    return {
      model: engine.model,
      temperature: 0.2,
      messages: [{ role: 'user', content: prompt }],
    };
  }

  if (engine.provider === 'anthropic') {
    return {
      model: engine.model,
      max_tokens: 2048,
      messages: [{ role: 'user', content: prompt }],
    };
  }

  if (engine.provider === 'gemini') {
    return {
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
      },
    };
  }

  if (engine.provider === 'ollama') {
    return {
      model: engine.model,
      stream: false,
      messages: [{ role: 'user', content: prompt }],
    };
  }

  throw new Error(`Unsupported LLM provider: ${engine.provider}`);
}

function parseLlmResponse(provider: CustomEngineProvider, payload: unknown) {
  if (OPENAI_COMPATIBLE_PROVIDERS.has(provider)) {
    return parseOpenAICompatibleResponse(payload);
  }

  if (provider === 'anthropic') {
    return parseAnthropicResponse(payload);
  }

  if (provider === 'gemini') {
    return parseGeminiResponse(payload);
  }

  if (provider === 'ollama') {
    return parseOllamaResponse(payload);
  }

  throw new Error(`Unsupported LLM provider: ${provider}`);
}

export async function getCustomEngineById(engineId: string) {
  const globalSettings = (await storageApi.get(GLOBAL_SETTINGS_KEY)) as GlobalSettings | undefined;
  return (
    globalSettings?.engines?.customEngines?.find(
      (engine) => engine.id === engineId && engine.enabled
    ) || null
  );
}

export async function customTranslate(
  text: string,
  from: string,
  to: string,
  engine: CustomEngine
) {
  const headers = mergeHeaders(engine);
  const response = await fetch(resolveUrl(engine), {
    method: 'POST',
    headers,
    body: JSON.stringify(
      engine.type === 'llm'
        ? buildLlmBody(engine, text, from, to)
        : {
            text,
            sourceLang: from,
            targetLang: to,
            from,
            to,
            format: 'text',
          }
    ),
  });

  if (!response.ok) {
    throw new Error(`Custom engine request failed with status ${response.status}`);
  }

  const payload = (await response.json()) as unknown;

  return engine.type === 'llm'
    ? parseLlmResponse(engine.provider, payload)
    : parseCustomApiResponse(payload);
}
