import type { TranslateOptions, TranslateResult } from '~lib/constants/types';
import { translate, translateBatch } from '~lib/translate/translate';

export interface TranslateMessage {
  type: 'translate' | 'translateBatch';
  text?: string;
  texts?: string[];
  options: TranslateOptions;
  host?: string;
}

export interface TranslateResponse {
  success: boolean;
  data?: TranslateResult | TranslateResult[];
  error?: string;
}

export async function handleTranslateMessage(
  message: TranslateMessage
): Promise<TranslateResponse> {
  try {
    if (message.type === 'translate' && message.text) {
      return {
        success: true,
        data: await translate(message.text, message.options, message.host),
      };
    }

    if (message.type === 'translateBatch' && message.texts) {
      return {
        success: true,
        data: await translateBatch(message.texts, message.options, message.host),
      };
    }

    return {
      success: false,
      error: 'Invalid translate message payload',
    };
  } catch (error) {
    console.error('Translate message handling failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export default handleTranslateMessage;
