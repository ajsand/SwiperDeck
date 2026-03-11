import {
  ACTIONS,
  ACTION_LABELS,
  ACTION_WEIGHTS,
  CORE_ACTIONS,
  actionToDbStrength,
  isCoreSwipeAction,
  isSwipeAction,
  normalizeSwipeAction,
  parseSwipeAction,
} from '@/types/domain';

describe('domain actions', () => {
  it('defines canonical action sets', () => {
    expect(ACTIONS).toEqual(['hard_no', 'no', 'skip', 'yes', 'strong_yes']);
    expect(CORE_ACTIONS).toEqual([
      'hard_no',
      'no',
      'skip',
      'yes',
      'strong_yes',
    ]);
  });

  it('parses and validates action values', () => {
    expect(isSwipeAction('yes')).toBe(true);
    expect(isSwipeAction('hardYes')).toBe(false);
    expect(isCoreSwipeAction('strong_yes')).toBe(true);
    expect(isCoreSwipeAction('love')).toBe(false);
    expect(parseSwipeAction('skip')).toBe('skip');
    expect(parseSwipeAction('hard_yes')).toBeNull();
  });

  it('normalizes strict values only', () => {
    expect(normalizeSwipeAction('hard_no')).toBe('hard_no');
    expect(() => normalizeSwipeAction('hard_yes')).toThrow(
      'Invalid swipe action: hard_yes',
    );
  });

  it('keeps labels and weight mappings exhaustive', () => {
    expect(ACTION_LABELS.hard_no).toBe('Hard No');
    expect(ACTION_LABELS.strong_yes).toBe('Strong Yes');
    expect(ACTION_WEIGHTS.hard_no).toBe(-2);
    expect(ACTION_WEIGHTS.strong_yes).toBe(2);
    expect(Object.keys(ACTION_WEIGHTS)).toHaveLength(5);
  });

  it('converts action weights to integer DB strength', () => {
    expect(actionToDbStrength('hard_no')).toBe(-2);
    expect(actionToDbStrength('yes')).toBe(1);
    expect(actionToDbStrength('strong_yes')).toBe(2);
  });
});
