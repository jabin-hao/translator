import type { CustomEngineProvider } from './types';

export interface CustomEngineProviderOption {
  value: CustomEngineProvider;
  label: string;
  color: string;
  monogram: string;
}

export interface LlmTemplate {
  name: string;
  type: 'llm';
  provider: Exclude<CustomEngineProvider, 'custom-api'>;
  apiUrl: string;
  model: string;
  prompt: string;
  headers: Record<string, string>;
}

export const DEFAULT_LLM_PROMPT =
  'You are a translation engine. Translate the text from {sourceLang} to {targetLang}. Return translation only.\n\n{text}';

export const DEFAULT_CUSTOM_API_HEADERS = {
  'Content-Type': 'application/json',
};

export const CUSTOM_ENGINE_PROVIDER_OPTIONS: CustomEngineProviderOption[] = [
  { value: 'custom-api', label: 'Custom API', color: '#1677ff', monogram: 'API' },
  { value: 'openai', label: 'OpenAI', color: '#10a37f', monogram: 'OA' },
  { value: 'anthropic', label: 'Anthropic', color: '#191919', monogram: 'AN' },
  { value: 'gemini', label: 'Gemini', color: '#4285f4', monogram: 'GM' },
  { value: 'deepseek', label: 'DeepSeek', color: '#4d6bfe', monogram: 'DS' },
  { value: 'moonshot', label: 'Moonshot', color: '#7b61ff', monogram: 'MS' },
  { value: 'qwen', label: 'Qwen', color: '#5b8cff', monogram: 'QW' },
  { value: 'mistral', label: 'Mistral', color: '#ff6b3d', monogram: 'MI' },
  { value: 'xai', label: 'xAI', color: '#111111', monogram: 'XA' },
  { value: 'ollama', label: 'Ollama', color: '#111111', monogram: 'OL' },
];

export const OPENAI_COMPATIBLE_PROVIDERS = new Set<CustomEngineProvider>([
  'openai',
  'deepseek',
  'moonshot',
  'qwen',
  'mistral',
  'xai',
]);

export const LLM_ENGINE_TEMPLATES: LlmTemplate[] = [
  {
    name: 'OpenAI GPT',
    type: 'llm',
    provider: 'openai',
    apiUrl: 'https://api.openai.com/v1/chat/completions',
    model: 'gpt-4o-mini',
    prompt: DEFAULT_LLM_PROMPT,
    headers: { ...DEFAULT_CUSTOM_API_HEADERS },
  },
  {
    name: 'Anthropic Claude',
    type: 'llm',
    provider: 'anthropic',
    apiUrl: 'https://api.anthropic.com/v1/messages',
    model: 'claude-3-5-sonnet-latest',
    prompt: DEFAULT_LLM_PROMPT,
    headers: { ...DEFAULT_CUSTOM_API_HEADERS },
  },
  {
    name: 'Google Gemini',
    type: 'llm',
    provider: 'gemini',
    apiUrl: 'https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent',
    model: 'gemini-2.0-flash',
    prompt: DEFAULT_LLM_PROMPT,
    headers: { ...DEFAULT_CUSTOM_API_HEADERS },
  },
  {
    name: 'DeepSeek',
    type: 'llm',
    provider: 'deepseek',
    apiUrl: 'https://api.deepseek.com/chat/completions',
    model: 'deepseek-chat',
    prompt: DEFAULT_LLM_PROMPT,
    headers: { ...DEFAULT_CUSTOM_API_HEADERS },
  },
  {
    name: 'Moonshot AI',
    type: 'llm',
    provider: 'moonshot',
    apiUrl: 'https://api.moonshot.cn/v1/chat/completions',
    model: 'moonshot-v1-8k',
    prompt: DEFAULT_LLM_PROMPT,
    headers: { ...DEFAULT_CUSTOM_API_HEADERS },
  },
  {
    name: 'Qwen',
    type: 'llm',
    provider: 'qwen',
    apiUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    model: 'qwen-turbo',
    prompt: DEFAULT_LLM_PROMPT,
    headers: { ...DEFAULT_CUSTOM_API_HEADERS },
  },
  {
    name: 'Mistral',
    type: 'llm',
    provider: 'mistral',
    apiUrl: 'https://api.mistral.ai/v1/chat/completions',
    model: 'mistral-small-latest',
    prompt: DEFAULT_LLM_PROMPT,
    headers: { ...DEFAULT_CUSTOM_API_HEADERS },
  },
  {
    name: 'xAI Grok',
    type: 'llm',
    provider: 'xai',
    apiUrl: 'https://api.x.ai/v1/chat/completions',
    model: 'grok-2-latest',
    prompt: DEFAULT_LLM_PROMPT,
    headers: { ...DEFAULT_CUSTOM_API_HEADERS },
  },
  {
    name: 'Ollama',
    type: 'llm',
    provider: 'ollama',
    apiUrl: 'https://ollama.com/api/chat',
    model: 'qwen2.5:7b',
    prompt: DEFAULT_LLM_PROMPT,
    headers: { ...DEFAULT_CUSTOM_API_HEADERS },
  },
];

export function getProviderOption(provider: CustomEngineProvider) {
  return (
    CUSTOM_ENGINE_PROVIDER_OPTIONS.find((item) => item.value === provider) ||
    CUSTOM_ENGINE_PROVIDER_OPTIONS[0]
  );
}
