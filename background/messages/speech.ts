import type { SpeechOptions, SpeechResult } from '../../lib/speech';
import { speechManager } from '../speech/manager';

export interface SpeechMessageRequest {
  action: 'speak' | 'stop' | 'checkAvailability';
  options?: SpeechOptions;
}

export interface SpeechMessageResponse {
  success: boolean;
  data?: SpeechResult;
  error?: string;
}

export const handleSpeechMessage = async (req: SpeechMessageRequest): Promise<SpeechMessageResponse> => {
  try {
    console.log('处理朗读消息:', req);

    switch (req.action) {
      case 'speak':
        if (!req.options) {
          return {
            success: false,
            error: '缺少朗读选项'
          };
        }
        
        // 直接使用speechManager，它会根据设置自动选择引擎
        const result = await speechManager.speak(req.options);
        return {
          success: result.success,
          data: result,
          error: result.error
        };

      case 'stop':
        speechManager.stop();
        return {
          success: true
        };

      case 'checkAvailability':
        // 检查当前设置的服务是否可用
        const currentService = speechManager.getCurrentService();
        const available = await speechManager.checkServiceAvailability(currentService);
        return {
          success: true,
          data: { success: available } as SpeechResult
        };

      default:
        return {
          success: false,
          error: `未知的朗读操作: ${req.action}`
        };
    }
  } catch (error) {
    console.error('朗读消息处理失败:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

// 为了兼容性，添加默认导出
export default handleSpeechMessage; 