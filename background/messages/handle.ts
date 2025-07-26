import type { PlasmoMessaging } from "@plasmohq/messaging"
import { handleTranslateMessage } from './translate'

// 翻译消息类型
export type TranslateHandlerRequest = {
  type: 'translate' | 'translateBatch';
  text?: string;
  texts?: string[];
  options: any;
}

export type TranslateHandlerResponse = {
  success: boolean;
  data?: any;
  error?: string;
}

// 通用消息请求类型
export type HandlerRequest = {
  service: 'translate' | 'cache' | 'settings' | 'other'; // 服务类型
  action: string; // 具体操作
  data?: any; // 数据
} & TranslateHandlerRequest; // 继承翻译消息类型

// 通用消息响应类型
export type HandlerResponse = {
  success: boolean;
  data?: any;
  error?: string;
}

// 通用消息处理器
const handler: PlasmoMessaging.MessageHandler<HandlerRequest, HandlerResponse> = async (req, res) => {
  try {
    console.log('收到消息请求:', req.body);
    console.log('请求类型:', typeof req.body);
    console.log('请求服务:', req.body?.service);
    console.log('请求操作:', req.body?.action);
    
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
          console.log('处理翻译请求:', { action, data });
          // 处理翻译相关消息
          const translateResponse = await handleTranslateMessage({
            type: action as 'translate' | 'translateBatch',
            ...data
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
        
      case 'cache':
        // 处理缓存相关消息（未来扩展）
        console.log('缓存服务:', action, data);
        res.send({
          success: false,
          error: '缓存服务暂未实现'
        });
        break;
        
      case 'settings':
        // 处理设置相关消息（未来扩展）
        console.log('设置服务:', action, data);
        res.send({
          success: false,
          error: '设置服务暂未实现'
        });
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