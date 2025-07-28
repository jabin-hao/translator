import { handleCacheMessage } from '../cache';

export default async function handle(request, sender) {
  const { action, body } = request;
  return await handleCacheMessage(action, body);
} 