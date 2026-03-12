import type { PlasmoMessaging } from '@plasmohq/messaging';

import cacheHandler from './cache';
import type { SpeechMessageRequest, SpeechMessageResponse } from './speech';
import { handleSpeechMessage } from './speech';
import type { TranslateMessage, TranslateResponse } from './translate';
import { handleTranslateMessage } from './translate';

type HandlerService = 'translate' | 'speech' | 'cache';

type HandlerBody = {
  service: HandlerService;
  action: string;
  options?: Record<string, unknown>;
  text?: string;
  texts?: string[];
  host?: string;
};

export interface HandlerRequest extends HandlerBody {}

export interface HandlerResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

const createErrorResponse = (error: unknown): HandlerResponse => ({
  success: false,
  error: error instanceof Error ? error.message : String(error),
});

const handler: PlasmoMessaging.MessageHandler<HandlerRequest, HandlerResponse> = async (
  req,
  res
) => {
  const body = req.body;

  if (!body) {
    res.send({ success: false, error: 'Request body is required' });
    return;
  }

  try {
    switch (body.service) {
      case 'translate': {
        const response = await handleTranslateMessage({
          type: body.action as TranslateMessage['type'],
          text: body.text,
          texts: body.texts,
          host: body.host,
          options: {
            from: String(body.options?.from || 'auto'),
            to: String(body.options?.to || 'zh-CN'),
            engine: String(body.options?.engine || 'bing'),
            useCache: body.options?.useCache ?? true,
          },
        });

        res.send(response as TranslateResponse);
        return;
      }

      case 'speech': {
        const response = await handleSpeechMessage({
          action: body.action as SpeechMessageRequest['action'],
          options: body.options as SpeechMessageRequest['options'],
        });

        res.send(response as SpeechMessageResponse);
        return;
      }

      case 'cache': {
        res.send(await cacheHandler(body));
        return;
      }

      default:
        res.send({ success: false, error: `Unknown service: ${body.service}` });
    }
  } catch (error) {
    console.error('Background message handling failed:', error);
    res.send(createErrorResponse(error));
  }
};

export default handler;
