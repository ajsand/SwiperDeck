type Brand<TValue, TBrand extends string> = TValue & {
  readonly __brand: TBrand;
};

export type EntityId = Brand<string, 'EntityId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type SwipeEventId = Brand<string, 'SwipeEventId'>;
export type SnapshotId = Brand<string, 'SnapshotId'>;
export type DeckId = Brand<string, 'DeckId'>;
export type DeckCardId = Brand<string, 'DeckCardId'>;
export type DeckTagFacetId = Brand<string, 'DeckTagFacetId'>;
export type DeckTagId = Brand<string, 'DeckTagId'>;
export type ShowdownSessionId = Brand<string, 'ShowdownSessionId'>;
export type ShowdownParticipantId = Brand<string, 'ShowdownParticipantId'>;

export function asEntityId(value: string): EntityId {
  return value as EntityId;
}

export function asSessionId(value: string): SessionId {
  return value as SessionId;
}

export function asSwipeEventId(value: string): SwipeEventId {
  return value as SwipeEventId;
}

export function asSnapshotId(value: string): SnapshotId {
  return value as SnapshotId;
}

export function asDeckId(value: string): DeckId {
  return value as DeckId;
}

export function asDeckCardId(value: string): DeckCardId {
  return value as DeckCardId;
}

export function asDeckTagFacetId(value: string): DeckTagFacetId {
  return value as DeckTagFacetId;
}

export function asDeckTagId(value: string): DeckTagId {
  return value as DeckTagId;
}

export function asShowdownSessionId(value: string): ShowdownSessionId {
  return value as ShowdownSessionId;
}

export function asShowdownParticipantId(value: string): ShowdownParticipantId {
  return value as ShowdownParticipantId;
}
