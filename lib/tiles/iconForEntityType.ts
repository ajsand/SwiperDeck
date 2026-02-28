import Ionicons from '@expo/vector-icons/Ionicons';
import { isEntityType, type EntityType } from '@/types/domain';

export type TileIconName = keyof typeof Ionicons.glyphMap;

const TYPE_ICON_MAP: Record<EntityType, TileIconName> = {
  movie: 'film-outline',
  tv: 'tv-outline',
  book: 'book-outline',
  podcast: 'mic-outline',
  album: 'disc-outline',
  artist: 'musical-notes-outline',
  game: 'game-controller-outline',
  team: 'people-outline',
  athlete: 'trophy-outline',
  thinker: 'bulb-outline',
  place: 'location-outline',
  concept: 'shapes-outline',
};

export const FALLBACK_TILE_ICON: TileIconName = 'help-circle-outline';

export function iconForEntityType(type: string): TileIconName {
  const normalizedType = type.trim().toLowerCase();

  if (!isEntityType(normalizedType)) {
    return FALLBACK_TILE_ICON;
  }

  return TYPE_ICON_MAP[normalizedType];
}
