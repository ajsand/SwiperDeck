import type { CoreSwipeAction } from '@/types/domain';

export type DeckActionSource = 'button' | 'gesture';

export interface DeckActionMeta {
  source: DeckActionSource;
  velocityX?: number;
  distanceX?: number;
}

export interface DeckActionPayload extends DeckActionMeta {
  action: CoreSwipeAction;
}

export type DeckActionHandler = (
  action: CoreSwipeAction,
  meta: DeckActionMeta,
) => void;

export function createDeckActionPayload(
  action: CoreSwipeAction,
  meta: DeckActionMeta,
): DeckActionPayload {
  return {
    action,
    source: meta.source,
    velocityX: meta.velocityX,
    distanceX: meta.distanceX,
  };
}
