// 处理朗读相关的消息
import type { SpeechOptions, SpeechResult } from '~lib/constants/speech';
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

    switch (req.action) {
      case 'speak':
        if (!req.options) {
          return {
            success: false,
            error: '缺少朗读选项'
          };
        }
        
        // 直接使用speechManager，它会根据设置自动选择引擎并处理回退
        const result = await speechManager.speak(req.options);
        
        // 如果结果需要browser环境处理（Web Speech API），直接返回标记
        if (result.requiresBrowser && result.error === 'browser_tts_required') {
          return {
            success: false, // 在background中标记为失败
            error: 'browser_tts_required', // content script会识别这个错误并使用Web Speech API
            data: result
          };
        }
        
        // 如果有 audioData 且为 ArrayBuffer，需要转换为可传递的格式
        if (result.success && result.audioData && result.audioData instanceof ArrayBuffer) {
          // 验证 ArrayBuffer 是否有效
          if (result.audioData.byteLength === 0) {
            console.error('[Speech Message] 收到空的 ArrayBuffer，标记为失败');
            return {
              success: false,
              error: '音频数据为空'
            };
          }
          
          // 将 ArrayBuffer 转换为 Uint8Array，这样可以通过消息传递
          const uint8Array = new Uint8Array(result.audioData);
          
          return {
            success: result.success,
            data: {
              ...result,
              audioData: uint8Array
            },
            error: result.error
          };
        }
        
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