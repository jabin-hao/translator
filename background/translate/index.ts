import { googleTranslate } from './google'
import { bingTranslate } from './bing'

export async function handleTranslateRequest({ text, from, to, engine }: { text: string, from: string, to: string, engine: string }) {
  if (engine === 'google') return await googleTranslate(text, from, to)
  if (engine === 'bing') return await bingTranslate(text, from, to)
  throw new Error('不支持的翻译引擎')
} 