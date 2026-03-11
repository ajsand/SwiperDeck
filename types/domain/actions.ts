export const ACTIONS = ['hard_no', 'no', 'skip', 'yes', 'strong_yes'] as const;

export type SwipeAction = (typeof ACTIONS)[number];

export const CORE_ACTIONS = [
  'hard_no',
  'no',
  'skip',
  'yes',
  'strong_yes',
] as const;

export type CoreSwipeAction = (typeof CORE_ACTIONS)[number];

export const ACTION_LABELS = {
  hard_no: 'Hard No',
  no: 'No',
  skip: 'Skip',
  yes: 'Yes',
  strong_yes: 'Strong Yes',
} as const satisfies Record<SwipeAction, string>;

export const CORE_ACTION_LABELS = {
  hard_no: ACTION_LABELS.hard_no,
  no: ACTION_LABELS.no,
  skip: ACTION_LABELS.skip,
  yes: ACTION_LABELS.yes,
  strong_yes: ACTION_LABELS.strong_yes,
} as const satisfies Record<CoreSwipeAction, string>;

export const ACTION_WEIGHTS = {
  hard_no: -2,
  no: -1,
  skip: 0,
  yes: 1,
  strong_yes: 2,
} as const satisfies Record<SwipeAction, number>;

const ACTION_SET: ReadonlySet<string> = new Set(ACTIONS);
const CORE_ACTION_SET: ReadonlySet<string> = new Set(CORE_ACTIONS);

export function isSwipeAction(value: unknown): value is SwipeAction {
  return typeof value === 'string' && ACTION_SET.has(value);
}

export function isCoreSwipeAction(value: unknown): value is CoreSwipeAction {
  return typeof value === 'string' && CORE_ACTION_SET.has(value);
}

export function parseSwipeAction(value: unknown): SwipeAction | null {
  return isSwipeAction(value) ? value : null;
}

export function normalizeSwipeAction(value: unknown): SwipeAction {
  const parsedAction = parseSwipeAction(value);

  if (parsedAction !== null) {
    return parsedAction;
  }

  throw new Error(`Invalid swipe action: ${String(value)}`);
}

export function actionToDbStrength(action: SwipeAction): number {
  return Math.round(ACTION_WEIGHTS[action]);
}

export function assertNever(value: never): never {
  throw new Error(`Unhandled value: ${String(value)}`);
}
