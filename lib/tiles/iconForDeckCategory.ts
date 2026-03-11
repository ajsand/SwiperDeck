import type { DeckCategory } from '@/types/domain';

import type { TileIconName } from './iconForEntityType';

const DECK_CATEGORY_ICON_MAP: Record<string, TileIconName> = {
  movies_tv: 'film-outline',
  music: 'musical-notes-outline',
  food_drinks: 'restaurant-outline',
  travel: 'airplane-outline',
  lifestyle: 'sunny-outline',
  social_habits: 'people-outline',
  humor: 'happy-outline',
  relationship_preferences: 'heart-outline',
  values: 'shield-checkmark-outline',
  communication_style: 'chatbubbles-outline',
};

export const FALLBACK_DECK_CATEGORY_ICON: TileIconName = 'albums-outline';

export function iconForDeckCategory(
  category: DeckCategory | string,
): TileIconName {
  const normalizedCategory = category.trim().toLowerCase();
  return (
    DECK_CATEGORY_ICON_MAP[normalizedCategory] ?? FALLBACK_DECK_CATEGORY_ICON
  );
}
