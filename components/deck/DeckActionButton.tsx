import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import {
  Pressable,
  StyleSheet,
  View,
  type AccessibilityState,
} from 'react-native';
import { CORE_ACTION_LABELS, type CoreSwipeAction } from '@/types/domain';

interface DeckActionVisualConfig {
  iconName: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  borderColor: string;
  backgroundColor: string;
  size: number;
  iconSize: number;
}

const ACTION_VISUAL_CONFIG: Record<CoreSwipeAction, DeckActionVisualConfig> = {
  hard_no: {
    iconName: 'close-circle-outline',
    iconColor: '#EF4444',
    borderColor: '#EF4444',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    size: 52,
    iconSize: 26,
  },
  no: {
    iconName: 'close-outline',
    iconColor: '#F97316',
    borderColor: '#F97316',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    size: 48,
    iconSize: 22,
  },
  skip: {
    iconName: 'refresh-outline',
    iconColor: 'rgba(255, 255, 255, 0.5)',
    borderColor: 'rgba(255, 255, 255, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    size: 44,
    iconSize: 20,
  },
  yes: {
    iconName: 'checkmark-outline',
    iconColor: '#22C55E',
    borderColor: '#22C55E',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    size: 48,
    iconSize: 22,
  },
  strong_yes: {
    iconName: 'star-outline',
    iconColor: '#EC4899',
    borderColor: '#EC4899',
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    size: 52,
    iconSize: 26,
  },
};

const ACTION_HINTS: Record<CoreSwipeAction, string> = {
  hard_no: 'Strongly dislike this and move to next',
  no: 'Dislike this and move to next',
  skip: 'Skip without judging and move to next',
  yes: 'Like this and move to next',
  strong_yes: 'Strongly positive - move to next',
};

export interface DeckActionButtonProps {
  action: CoreSwipeAction;
  onPress: (action: CoreSwipeAction) => void;
  disabled?: boolean;
}

function DeckActionButtonImpl({
  action,
  onPress,
  disabled = false,
}: DeckActionButtonProps) {
  const visual = ACTION_VISUAL_CONFIG[action];
  const accessibilityState: AccessibilityState = { disabled };

  return (
    <Pressable
      testID={`deck-action-${action}`}
      accessibilityRole="button"
      accessibilityLabel={CORE_ACTION_LABELS[action]}
      accessibilityHint={ACTION_HINTS[action]}
      accessibilityState={accessibilityState}
      disabled={disabled}
      onPress={() => onPress(action)}
      android_ripple={{ color: visual.iconColor, borderless: false }}
      style={({ pressed }) => [
        styles.buttonBase,
        {
          width: visual.size,
          height: visual.size,
          borderRadius: visual.size / 2,
          borderColor: visual.borderColor,
          backgroundColor: visual.backgroundColor,
        },
        pressed && !disabled ? styles.pressed : null,
        disabled ? styles.disabled : null,
      ]}
    >
      <View pointerEvents="none" accessible={false}>
        <Ionicons
          testID={`deck-action-icon-${action}`}
          name={visual.iconName}
          size={visual.iconSize}
          color={visual.iconColor}
        />
      </View>
    </Pressable>
  );
}

export const DeckActionButton = memo(DeckActionButtonImpl);

const styles = StyleSheet.create({
  buttonBase: {
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
  disabled: {
    opacity: 0.45,
  },
});
