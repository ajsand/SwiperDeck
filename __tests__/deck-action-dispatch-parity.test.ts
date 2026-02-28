import { CORE_ACTIONS, isCoreSwipeAction } from '@/types/domain';
import { dispatchDeckAction } from '@/components/deck';
import { resolveDeckSwipeAction } from '@/hooks/useDeckGestures';

describe('deck action dispatch parity contract', () => {
  it('dispatches all canonical core actions from button path', () => {
    const onAction = jest.fn();

    CORE_ACTIONS.forEach((action) => {
      const payload = dispatchDeckAction({
        action,
        meta: { source: 'button' },
        isLocked: false,
        lock: jest.fn(),
        onAction,
      });

      expect(payload).toEqual({
        action,
        source: 'button',
        distanceX: undefined,
        velocityX: undefined,
      });
      expect(isCoreSwipeAction(payload?.action)).toBe(true);
    });
  });

  it('maps gesture input to canonical actions and shares payload shape with button path', () => {
    const onAction = jest.fn();
    const resolved = resolveDeckSwipeAction({
      translationX: 220,
      translationY: 10,
      velocityX: 450,
      screenWidth: 375,
    });

    expect(resolved).toBeTruthy();
    expect(resolved?.action).toBe('love');

    const payload = dispatchDeckAction({
      action: resolved!.action,
      meta: {
        source: 'gesture',
        distanceX: resolved!.distanceX,
        velocityX: resolved!.velocityX,
      },
      isLocked: false,
      lock: jest.fn(),
      onAction,
    });

    expect(payload).toEqual({
      action: 'love',
      source: 'gesture',
      distanceX: 220,
      velocityX: 450,
    });
    expect(Object.keys(payload ?? {}).sort()).toEqual([
      'action',
      'distanceX',
      'source',
      'velocityX',
    ]);
  });

  it('never emits skip from gesture mapping helper', () => {
    const right = resolveDeckSwipeAction({
      translationX: 120,
      translationY: 6,
      velocityX: 220,
      screenWidth: 375,
    });
    const left = resolveDeckSwipeAction({
      translationX: -120,
      translationY: 6,
      velocityX: -220,
      screenWidth: 375,
    });

    expect(right?.action).toBe('yes');
    expect(left?.action).toBe('no');
    expect(right?.action).not.toBe('skip');
    expect(left?.action).not.toBe('skip');
  });
});
