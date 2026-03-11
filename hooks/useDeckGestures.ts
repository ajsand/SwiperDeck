import { Gesture } from 'react-native-gesture-handler';
import {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import type { CoreSwipeAction } from '@/types/domain';
import type { DeckActionHandler } from '@/components/deck/deckActionPayload';

import {
  CARD_ROTATION_DEGREES,
  HORIZONTAL_INTENT_RATIO,
  SNAP_BACK_DAMPING,
  SNAP_BACK_MASS,
  SNAP_BACK_STIFFNESS,
  STRONG_SWIPE_DISTANCE_RATIO,
  SWIPE_ANIMATION_DURATION_MS,
  SWIPE_COMMIT_DISTANCE_RATIO,
  SWIPE_COMMIT_VELOCITY,
  SWIPE_OFFSCREEN_MULTIPLIER,
  VERTICAL_DRAG_DAMPING,
} from './useDeckGestures.constants';

export type GestureSwipeAction = Exclude<CoreSwipeAction, 'skip'>;

export interface ResolveDeckSwipeActionInput {
  translationX: number;
  translationY: number;
  velocityX: number;
  screenWidth: number;
}

export interface ResolvedDeckSwipeAction {
  action: GestureSwipeAction;
  distanceX: number;
  velocityX: number;
}

export interface UseDeckGesturesOptions {
  enabled: boolean;
  screenWidth: number;
  onAction: DeckActionHandler;
}

export function resolveDeckSwipeAction(
  input: ResolveDeckSwipeActionInput,
): ResolvedDeckSwipeAction | null {
  const distanceX = Math.abs(input.translationX);
  const distanceY = Math.abs(input.translationY);
  const velocityX = Math.abs(input.velocityX);
  const hasHorizontalIntent = distanceX > HORIZONTAL_INTENT_RATIO * distanceY;

  if (!hasHorizontalIntent) {
    return null;
  }

  const direction = input.translationX >= 0 ? 1 : -1;
  const strongDistance = input.screenWidth * STRONG_SWIPE_DISTANCE_RATIO;
  const commitDistance = input.screenWidth * SWIPE_COMMIT_DISTANCE_RATIO;

  if (distanceX >= strongDistance) {
    return {
      action: direction > 0 ? 'strong_yes' : 'hard_no',
      distanceX,
      velocityX,
    };
  }

  if (distanceX >= commitDistance || velocityX >= SWIPE_COMMIT_VELOCITY) {
    return {
      action: direction > 0 ? 'yes' : 'no',
      distanceX,
      velocityX,
    };
  }

  return null;
}

export function useDeckGestures({
  enabled,
  screenWidth,
  onAction,
}: UseDeckGesturesOptions) {
  const translationX = useSharedValue(0);
  const translationY = useSharedValue(0);
  const rotation = useSharedValue(0);

  const snapBack = () => {
    'worklet';

    translationX.value = withSpring(0, {
      damping: SNAP_BACK_DAMPING,
      stiffness: SNAP_BACK_STIFFNESS,
      mass: SNAP_BACK_MASS,
    });
    translationY.value = withSpring(0, {
      damping: SNAP_BACK_DAMPING,
      stiffness: SNAP_BACK_STIFFNESS,
      mass: SNAP_BACK_MASS,
    });
    rotation.value = withSpring(0, {
      damping: SNAP_BACK_DAMPING,
      stiffness: SNAP_BACK_STIFFNESS,
      mass: SNAP_BACK_MASS,
    });
  };

  const emitGestureActionOnJs = (resolved: ResolvedDeckSwipeAction) => {
    onAction(resolved.action, {
      source: 'gesture',
      distanceX: resolved.distanceX,
      velocityX: resolved.velocityX,
    });
  };

  const gesture = Gesture.Pan()
    .enabled(enabled)
    .onUpdate((event) => {
      translationX.value = event.translationX;
      translationY.value = event.translationY * VERTICAL_DRAG_DAMPING;
      rotation.value =
        (event.translationX / screenWidth) * CARD_ROTATION_DEGREES;
    })
    .onEnd((event) => {
      const resolved = resolveDeckSwipeAction({
        translationX: event.translationX,
        translationY: event.translationY,
        velocityX: event.velocityX,
        screenWidth,
      });

      if (!resolved) {
        snapBack();
        return;
      }

      const direction = event.translationX >= 0 ? 1 : -1;
      const targetX = screenWidth * SWIPE_OFFSCREEN_MULTIPLIER * direction;

      translationX.value = withTiming(
        targetX,
        {
          duration: SWIPE_ANIMATION_DURATION_MS,
          easing: Easing.out(Easing.cubic),
        },
        (finished) => {
          if (!finished) {
            return;
          }

          translationX.value = 0;
          translationY.value = 0;
          rotation.value = 0;
          runOnJS(emitGestureActionOnJs)(resolved);
        },
      );
      translationY.value = withTiming(0, {
        duration: SWIPE_ANIMATION_DURATION_MS,
      });
      rotation.value = withTiming(0, {
        duration: SWIPE_ANIMATION_DURATION_MS,
      });
    });

  const animatedCardStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: translationX.value },
        { translateY: translationY.value },
        { rotateZ: `${rotation.value}deg` },
      ],
    };
  });

  return {
    gesture,
    animatedCardStyle,
  };
}
