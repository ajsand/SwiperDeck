import { dispatchDeckAction } from '@/components/deck';

describe('dispatchDeckAction', () => {
  it('returns null and does not dispatch when lock is active', () => {
    const lock = jest.fn();
    const onAction = jest.fn();

    const result = dispatchDeckAction({
      action: 'yes',
      meta: { source: 'button' },
      isLocked: true,
      lock,
      onAction,
    });

    expect(result).toBeNull();
    expect(lock).not.toHaveBeenCalled();
    expect(onAction).not.toHaveBeenCalled();
  });

  it('locks and dispatches a normalized payload when unlocked', () => {
    const lock = jest.fn();
    const onAction = jest.fn();

    const result = dispatchDeckAction({
      action: 'hard_no',
      meta: {
        source: 'gesture',
        distanceX: 188,
        velocityX: 940,
      },
      isLocked: false,
      lock,
      onAction,
    });

    expect(lock).toHaveBeenCalledTimes(1);
    expect(onAction).toHaveBeenCalledWith('hard_no', {
      source: 'gesture',
      distanceX: 188,
      velocityX: 940,
    });
    expect(result).toEqual({
      action: 'hard_no',
      source: 'gesture',
      distanceX: 188,
      velocityX: 940,
    });
  });
});
