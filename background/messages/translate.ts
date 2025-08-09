// 翻译消息处理服务
import { translate, translateBatch } from '~lib/translate/translate';
import type { TranslateOptions, TranslateResult } from '~lib/translate/translate';

export interface TranslateMessage {
  type: 'translate' | 'translateBatch';
  text?: string;
  texts?: string[];
  options: TranslateOptions;
}

export interface TranslateResponse {
  success: boolean;
  data?: TranslateResult | TranslateResult[];
  error?: string;
}

// 处理翻译消息
export async function handleTranslateMessage(message: TranslateMessage): Promise<TranslateResponse> {
  try {
    
    if (message.type === 'translate' && message.text) {
      const result = await translate(message.text, message.options);
      return {
        success: true,
        data: result,
      };
    } else if (message.type === 'translateBatch' && message.texts) {
      const results = await translateBatch(message.texts, message.options);
      return {
        success: true,
        data: results,
      };
    } else {
      console.error('无效的消息格式:', message);
      return {
        success: false,
        error: '无效的消息格式',
      };
    }
  } catch (error) {
    console.error('翻译消息处理失败:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

// 为了兼容性，添加默认导出
export default handleTranslateMessage; 