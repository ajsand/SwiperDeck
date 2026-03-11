import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export interface DeckBrowserErrorProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
  retryLabel?: string;
  retryAccessibilityLabel?: string;
  retryAccessibilityHint?: string;
}

function DeckBrowserErrorImpl({
  title = 'Unable to load decks',
  message = 'A recoverable error occurred while loading your decks.',
  onRetry,
  retryLabel = 'Retry',
  retryAccessibilityLabel = 'Retry loading decks',
  retryAccessibilityHint = 'Attempts to load the deck list again',
}: DeckBrowserErrorProps) {
  return (
    <View
      testID="deck-browser-error"
      accessible
      accessibilityRole="text"
      accessibilityLabel={`${title}. ${message}`}
      style={styles.container}
    >
      <View style={styles.iconBadge} accessible={false}>
        <Ionicons name="alert-circle-outline" size={24} color="#FFFFFF" />
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {onRetry ? (
        <Pressable
          testID="deck-browser-retry"
          accessibilityRole="button"
          accessibilityLabel={retryAccessibilityLabel}
          accessibilityHint={retryAccessibilityHint}
          onPress={onRetry}
          style={({ pressed }) => [
            styles.button,
            pressed ? styles.buttonPressed : null,
          ]}
        >
          <Text style={styles.buttonText}>{retryLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

export const DeckBrowserError = memo(DeckBrowserErrorImpl);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    borderRadius: 18,
    paddingHorizontal: 24,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  iconBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,68,68,0.18)',
  },
  title: {
    marginTop: 14,
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  button: {
    marginTop: 18,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  buttonPressed: {
    opacity: 0.75,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
