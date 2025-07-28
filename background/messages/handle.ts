import type { PlasmoMessaging } from "@plasmohq/messaging"
import { handleTranslateMessage } from './translate';
import { handleSpeechMessage } from './speech';
import cacheHandler from './cache';

// 添加初始化日志
console.log('Handle script 已加载 - handle.ts');

// 通用消息请求类型
export interface HandlerRequest {
  service: 'translate' | 'speech' | 'cache';
  action: string;
  [key: string]: any;
}

// 通用消息响应类型
export interface HandlerResponse {
  success: boolean;
  data?: any;
  error?: string;
}

// 通用消息处理器
const handler: PlasmoMessaging.MessageHandler<HandlerRequest, HandlerResponse> = async (req, res) => {
  // console.log('=== 收到消息请求 ===');
  // console.log('收到消息请求:', req.body);
  // console.log('请求类型:', typeof req.body);
  // console.log('请求服务:', req.body?.service);
  // console.log('请求操作:', req.body?.action);
  
  try {
    if (!req.body) {
      console.error('请求体为空');
      res.send({
        success: false,
        error: '请求体为空'
      });
      return;
    }
    
    const { service, action, ...data } = req.body;
    
    // 根据服务类型分发到不同的处理器
    switch (service) {
      case 'translate':
        try {
          // 处理翻译相关消息
          const translateResponse = await handleTranslateMessage({
            type: action as 'translate' | 'translateBatch',
            text: data.text,
            texts: data.texts,
            options: {
              from: data.options?.from || 'auto',
              to: data.options?.to || 'zh-CN',
              engine: data.options?.engine || 'bing',
              useCache: data.options?.useCache ?? true,
            }
          });
          console.log('翻译响应:', translateResponse);
          res.send(translateResponse);
        } catch (translateError) {
          console.error('翻译处理失败:', translateError);
          res.send({
            success: false,
            error: `翻译处理失败: ${translateError instanceof Error ? translateError.message : String(translateError)}`
          });
        }
        break;
        
      case 'speech':
        try {
          console.log('处理朗读请求:', { action, data });
          // 直接调用 handleSpeechMessage，它会根据设置自动选择引擎
          const speechResponse = await handleSpeechMessage({
            action: action as 'speak' | 'stop' | 'checkAvailability',
            options: data.options
          });
          console.log('朗读响应:', speechResponse);
          res.send(speechResponse);
        } catch (speechError) {
          console.error('朗读处理失败:', speechError);
          res.send({
            success: false,
            error: `朗读处理失败: ${speechError instanceof Error ? speechError.message : String(speechError)}`
          });
        }
        break;
        
      case 'cache':
        try {
          const cacheResponse = await cacheHandler(req.body, null);
          res.send(cacheResponse);
        } catch (cacheError) {
          res.send({ success: false, error: `缓存处理失败: ${cacheError instanceof Error ? cacheError.message : String(cacheError)}` });
        }
        break;
        
      default:
        // 处理其他类型的消息
        console.log('未知服务:', service, action, data);
        res.send({
          success: false,
          error: `未知的服务类型: ${service}`
        });
        break;
    }
  } catch (error) {
    console.error('消息处理失败:', error);
    
    // 确保错误响应被正确发送
    const errorResponse = {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    };
    
    console.log('发送错误响应:', errorResponse);
    res.send(errorResponse);
  }
}

export default handler 