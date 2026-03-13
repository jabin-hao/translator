import { handleCacheMessage } from '../cache';
import type { HandlerRequest } from './handle';

export default async function handle(request: HandlerRequest) {
  return handleCacheMessage(
    request.action as 'clean' | 'reschedule' | 'stats' | 'list' | 'clear'
  );
}
