import { useCallback } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  DeckBrowserCard,
  DeckBrowserEmpty,
  DeckBrowserError,
} from '@/components/deck-browser';
import { useDecks } from '@/hooks/useDecks';
import type { DeckId } from '@/types/domain';

export default function DeckScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { decks, loading, error, refresh } = useDecks();

  const handleOpenDeck = useCallback(
    (deckId: DeckId) => {
      router.push(`/deck/${deckId as string}` as never);
    },
    [router],
  );

  const refreshing = loading && decks.length > 0;

  const body = (() => {
    if (loading && decks.length === 0) {
      return (
        <View testID="deck-browser-loading" style={styles.stateContainer}>
          <ActivityIndicator size="large" color="#FFFFFF" />
          <Text style={styles.stateTitle}>Loading decks...</Text>
          <Text style={styles.stateMessage}>
            Fetching the decks available on this device.
          </Text>
        </View>
      );
    }

    if (error) {
      return (
        <DeckBrowserError
          title="Unable to load decks"
          message={error.message}
          onRetry={refresh}
        />
      );
    }

    if (decks.length === 0) {
      return <DeckBrowserEmpty />;
    }

    return (
      <FlatList
        testID="deck-browser-list"
        data={decks}
        keyExtractor={(deck) => deck.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refresh}
            tintColor="#FFFFFF"
          />
        }
        renderItem={({ item }) => (
          <DeckBrowserCard deck={item} onPress={handleOpenDeck} />
        )}
        contentContainerStyle={styles.listContent}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    );
  })();

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <Text style={styles.title}>Decks</Text>
        <Text style={styles.subtitle}>Choose a deck to explore.</Text>
        <View style={styles.headerActions}>
          <Pressable
            testID="deck-browser-create-custom"
            accessibilityRole="button"
            accessibilityLabel="Create a custom deck"
            accessibilityHint="Opens the local custom deck creation form"
            onPress={() => router.push('/deck/custom/new' as never)}
            style={({ pressed }) => [
              styles.headerActionButton,
              pressed ? styles.headerActionButtonPressed : null,
            ]}
          >
            <Text style={styles.headerActionButtonText}>Create Custom</Text>
          </Pressable>
          <Pressable
            testID="deck-browser-import-custom"
            accessibilityRole="button"
            accessibilityLabel="Import a custom deck"
            accessibilityHint="Opens the local custom deck import screen"
            onPress={() => router.push('/deck/custom/import' as never)}
            style={({ pressed }) => [
              styles.headerActionButtonSecondary,
              pressed ? styles.headerActionButtonPressed : null,
            ]}
          >
            <Text style={styles.headerActionButtonSecondaryText}>
              Import JSON
            </Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.content}>{body}</View>
      {!loading && decks.length > 0 ? (
        <Text style={styles.footerHint}>
          Pick a deck to see its details before you start swiping.
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  header: {
    paddingHorizontal: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  subtitle: {
    marginTop: 6,
    fontSize: 15,
    color: 'rgba(255,255,255,0.68)',
  },
  headerActions: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 10,
  },
  headerActionButton: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: '#FFFFFF',
  },
  headerActionButtonSecondary: {
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 11,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  headerActionButtonPressed: {
    opacity: 0.8,
  },
  headerActionButtonText: {
    color: '#0B0B10',
    fontSize: 13,
    fontWeight: '700',
  },
  headerActionButtonSecondaryText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 10,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stateTitle: {
    marginTop: 14,
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateMessage: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
  listContent: {
    paddingBottom: 28,
  },
  separator: {
    height: 12,
  },
  footerHint: {
    paddingHorizontal: 16,
    paddingBottom: 18,
    color: 'rgba(255,255,255,0.52)',
    fontSize: 12,
    textAlign: 'center',
  },
});
