import { memo } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import type { DeckViewState } from './deckState';

type DeckPlaceholderState = Exclude<DeckViewState, 'ready'>;

export interface DeckStatePlaceholderProps {
  state: DeckPlaceholderState;
  errorMessage?: string;
  onRetry?: () => void;
  onOpenFilters?: () => void;
}

function DeckStatePlaceholderImpl({
  state,
  errorMessage,
  onRetry,
  onOpenFilters,
}: DeckStatePlaceholderProps) {
  if (state === 'loading') {
    return (
      <View
        testID="deck-placeholder-loading"
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Loading next card"
        accessibilityState={{ busy: true }}
        style={styles.container}
      >
        <ActivityIndicator size="large" color="#FFFFFF" />
        <Text style={styles.title}>Loading cards...</Text>
        <Text style={styles.message}>Preparing your next swipe choices.</Text>
      </View>
    );
  }

  if (state === 'empty') {
    return (
      <View
        testID="deck-placeholder-empty"
        accessible
        accessibilityRole="text"
        accessibilityLabel="No cards found. Try adjusting filters or broadening types."
        style={styles.container}
      >
        <Text style={styles.title}>No cards found</Text>
        <Text style={styles.message}>
          Try adjusting filters or broadening media types.
        </Text>
        {onOpenFilters ? (
          <Pressable
            testID="deck-placeholder-open-filters"
            accessibilityRole="button"
            accessibilityLabel="Adjust filters"
            accessibilityHint="Opens filtering options to broaden deck results"
            onPress={onOpenFilters}
            style={({ pressed }) => [
              styles.button,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.buttonText}>Adjust filters</Text>
          </Pressable>
        ) : null}
      </View>
    );
  }

  return (
    <View
      testID="deck-placeholder-error"
      accessible
      accessibilityRole="text"
      accessibilityLabel="Something went wrong loading cards"
      style={styles.container}
    >
      <Text style={styles.title}>Unable to load cards</Text>
      <Text style={styles.message}>
        {errorMessage?.trim() || 'A recoverable error occurred while loading Deck.'}
      </Text>
      <Pressable
        testID="deck-placeholder-retry"
        accessibilityRole="button"
        accessibilityLabel="Retry"
        accessibilityHint="Try loading cards again"
        onPress={onRetry}
        style={({ pressed }) => [
          styles.button,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        <Text style={styles.buttonText}>Retry</Text>
      </Pressable>
    </View>
  );
}

export const DeckStatePlaceholder = memo(DeckStatePlaceholderImpl);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    maxWidth: 560,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingVertical: 24,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
  },
  title: {
    marginTop: 12,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  message: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  button: {
    marginTop: 16,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  buttonPressed: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
