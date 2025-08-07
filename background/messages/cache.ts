// 缓存消息转发
import { handleCacheMessage } from '../cache';
import type { HandlerRequest } from './handle';

export default async function handle(request: HandlerRequest) {
  const { action, body } = request;
  return await handleCacheMessage(action, body);
} 