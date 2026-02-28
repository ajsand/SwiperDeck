type Brand<TValue, TBrand extends string> = TValue & {
  readonly __brand: TBrand;
};

export type EntityId = Brand<string, 'EntityId'>;
export type SessionId = Brand<string, 'SessionId'>;
export type SwipeEventId = Brand<string, 'SwipeEventId'>;
export type SnapshotId = Brand<string, 'SnapshotId'>;

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
