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

export const handleSpeechMessage = async (
  req: SpeechMessageRequest
): Promise<SpeechMessageResponse> => {
  try {
    switch (req.action) {
      case 'speak': {
        if (!req.options) {
          return {
            success: false,
            error: 'Speech options are required',
          };
        }

        const result = await speechManager.speak(req.options);

        if (result.requiresBrowser && result.error === 'browser_tts_required') {
          return {
            success: false,
            error: 'browser_tts_required',
            data: result,
          };
        }

        if (result.success && result.audioData instanceof ArrayBuffer) {
          if (result.audioData.byteLength === 0) {
            return {
              success: false,
              error: 'Audio payload is empty',
            };
          }

          return {
            success: true,
            data: {
              ...result,
              audioData: new Uint8Array(result.audioData),
            },
            error: result.error,
          };
        }

        return {
          success: result.success,
          data: result,
          error: result.error,
        };
      }

      case 'stop':
        speechManager.stop();
        return { success: true };

      case 'checkAvailability': {
        const currentService = speechManager.getCurrentService();
        const available = await speechManager.checkServiceAvailability(currentService);
        return {
          success: true,
          data: { success: available } as SpeechResult,
        };
      }

      default:
        return {
          success: false,
          error: `Unknown speech action: ${req.action}`,
        };
    }
  } catch (error) {
    console.error('Speech message handling failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
};

export default handleSpeechMessage;
