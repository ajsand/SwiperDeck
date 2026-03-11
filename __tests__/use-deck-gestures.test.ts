import { resolveDeckSwipeAction } from '@/hooks/useDeckGestures';

describe('resolveDeckSwipeAction', () => {
  const screenWidth = 375;

  it('maps strong right swipe to strong_yes', () => {
    expect(
      resolveDeckSwipeAction({
        translationX: 220,
        translationY: 12,
        velocityX: 320,
        screenWidth,
      }),
    ).toEqual({
      action: 'strong_yes',
      distanceX: 220,
      velocityX: 320,
    });
  });

  it('maps strong left swipe to hard_no', () => {
    expect(
      resolveDeckSwipeAction({
        translationX: -220,
        translationY: 8,
        velocityX: -280,
        screenWidth,
      }),
    ).toEqual({
      action: 'hard_no',
      distanceX: 220,
      velocityX: 280,
    });
  });

  it('maps regular right swipe to yes', () => {
    expect(
      resolveDeckSwipeAction({
        translationX: 120,
        translationY: 16,
        velocityX: 300,
        screenWidth,
      }),
    ).toEqual({
      action: 'yes',
      distanceX: 120,
      velocityX: 300,
    });
  });

  it('maps regular left swipe to no', () => {
    expect(
      resolveDeckSwipeAction({
        translationX: -120,
        translationY: 10,
        velocityX: -380,
        screenWidth,
      }),
    ).toEqual({
      action: 'no',
      distanceX: 120,
      velocityX: 380,
    });
  });

  it('commits with high velocity even if below distance threshold', () => {
    expect(
      resolveDeckSwipeAction({
        translationX: 48,
        translationY: 6,
        velocityX: 920,
        screenWidth,
      }),
    ).toEqual({
      action: 'yes',
      distanceX: 48,
      velocityX: 920,
    });
  });

  it('cancels diagonal and low-intent gestures', () => {
    expect(
      resolveDeckSwipeAction({
        translationX: 80,
        translationY: 80,
        velocityX: 600,
        screenWidth,
      }),
    ).toBeNull();
    expect(
      resolveDeckSwipeAction({
        translationX: 65,
        translationY: 12,
        velocityX: 200,
        screenWidth,
      }),
    ).toBeNull();
  });
});
