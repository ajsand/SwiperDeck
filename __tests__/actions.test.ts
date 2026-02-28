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
    expect(ACTIONS).toEqual([
      'hard_no',
      'no',
      'skip',
      'yes',
      'love',
      'respect',
      'curious',
    ]);
    expect(CORE_ACTIONS).toEqual(['hard_no', 'no', 'skip', 'yes', 'love']);
  });

  it('parses and validates action values', () => {
    expect(isSwipeAction('yes')).toBe(true);
    expect(isSwipeAction('hardYes')).toBe(false);
    expect(isCoreSwipeAction('love')).toBe(true);
    expect(isCoreSwipeAction('respect')).toBe(false);
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
    expect(ACTION_LABELS.love).toBe('Love');
    expect(ACTION_WEIGHTS.hard_no).toBe(-2);
    expect(ACTION_WEIGHTS.respect).toBe(0.5);
    expect(ACTION_WEIGHTS.curious).toBe(0.25);
  });

  it('converts action weights to integer DB strength', () => {
    expect(actionToDbStrength('hard_no')).toBe(-2);
    expect(actionToDbStrength('yes')).toBe(1);
    expect(actionToDbStrength('respect')).toBe(1);
    expect(actionToDbStrength('curious')).toBe(0);
  });
});
