import type { CoreSwipeAction } from '@/types/domain';
import {
  createDeckActionPayload,
  type DeckActionHandler,
  type DeckActionMeta,
  type DeckActionPayload,
} from './deckActionPayload';

export interface DispatchDeckActionArgs {
  action: CoreSwipeAction;
  meta: DeckActionMeta;
  onAction: DeckActionHandler;
  isLocked: boolean;
  lock: () => void;
}

export function dispatchDeckAction(
  args: DispatchDeckActionArgs,
): DeckActionPayload | null {
  if (args.isLocked) {
    return null;
  }

  args.lock();
  const payload = createDeckActionPayload(args.action, args.meta);
  args.onAction(payload.action, {
    source: payload.source,
    velocityX: payload.velocityX,
    distanceX: payload.distanceX,
  });

  return payload;
}
