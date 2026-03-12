import type { FavoriteWord } from '~lib/constants/types';
import { favoritesRepository } from '~lib/storage/indexed_db';

type FavoriteAction = 'list' | 'add' | 'delete' | 'clear' | 'replace' | 'search';

export interface FavoritesMessageRequest {
  action: FavoriteAction;
  options?: {
    id?: string;
    query?: string;
    favorite?: Omit<FavoriteWord, 'id' | 'timestamp'>;
    favorites?: FavoriteWord[];
  };
}

export async function handleFavoritesMessage(request: FavoritesMessageRequest) {
  switch (request.action) {
    case 'list':
      return { success: true, data: await favoritesRepository.list() };
    case 'add':
      if (!request.options?.favorite) {
        return { success: false, error: 'Favorite payload is required' };
      }
      return { success: await favoritesRepository.add(request.options.favorite) };
    case 'delete':
      if (!request.options?.id) {
        return { success: false, error: 'Favorite id is required' };
      }
      return { success: await favoritesRepository.delete(request.options.id) };
    case 'clear':
      return { success: await favoritesRepository.clear() };
    case 'replace':
      return {
        success: await favoritesRepository.replace(request.options?.favorites || []),
      };
    case 'search':
      return {
        success: true,
        data: await favoritesRepository.search(request.options?.query || ''),
      };
    default:
      return { success: false, error: `Unknown favorites action: ${request.action}` };
  }
}

export default handleFavoritesMessage;
