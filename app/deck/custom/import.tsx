import { Stack, useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getDb } from '@/lib/db';
import { importCustomDeck } from '@/lib/customDecks/importCustomDeck';

const IMPORT_EXAMPLE = `{
  "title": "Weekend vibes",
  "description": "A few prompts for a lighter first-date deck.",
  "category": "weekend_vibes",
  "cards": [
    "I would rather wake up early than stay out late.",
    {
      "title": "A last-minute road trip sounds fun to me.",
      "tags": ["travel", "spontaneous"]
    },
    {
      "title": "My ideal weekend includes good food and no strict plan.",
      "descriptionShort": "Quick custom prompt"
    }
  ]
}`;

export default function ImportCustomDeckScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [source, setSource] = useState('');
  const [importing, setImporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeRequestRef = useRef(0);
  const isMountedRef = useRef(true);
  const isFocusedRef = useRef(false);
  const resetStateOnNextFocusRef = useRef(false);

  useEffect(() => {
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      isFocusedRef.current = true;

      if (resetStateOnNextFocusRef.current && isMountedRef.current) {
        setImporting(false);
        setErrorMessage(null);
        resetStateOnNextFocusRef.current = false;
      }

      return () => {
        isFocusedRef.current = false;
        activeRequestRef.current += 1;
        resetStateOnNextFocusRef.current = true;
      };
    }, []),
  );

  const handleImport = async () => {
    if (importing) {
      return;
    }

    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;
    setImporting(true);
    setErrorMessage(null);

    try {
      const db = await getDb();
      const { deck } = await importCustomDeck(db, source);

      if (
        !isMountedRef.current ||
        !isFocusedRef.current ||
        activeRequestRef.current !== requestId
      ) {
        return;
      }

      router.replace(`/deck/${deck.id as string}` as never);
    } catch (error) {
      if (
        isMountedRef.current &&
        isFocusedRef.current &&
        activeRequestRef.current === requestId
      ) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to import this deck.',
        );
      }
    } finally {
      if (isMountedRef.current && activeRequestRef.current === requestId) {
        setImporting(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Import Custom Deck' }} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Import local custom deck JSON</Text>
        <Text style={styles.subtitle}>
          Paste a local JSON payload. Custom decks stay on this device and do
          not yet inherit prebuilt taxonomy, compare, or report guarantees.
        </Text>

        <View style={styles.noteCard}>
          <Text style={styles.noteTitle}>Supported shape</Text>
          <Text style={styles.noteBody}>
            Include `title`, `description`, and a `cards` array. Cards can be
            plain strings or objects with `title`, optional `descriptionShort`,
            and optional display `tags`.
          </Text>
        </View>

        <TextInput
          testID="import-custom-deck-input"
          value={source}
          onChangeText={setSource}
          placeholder={IMPORT_EXAMPLE}
          placeholderTextColor="rgba(255,255,255,0.32)"
          multiline
          autoCapitalize="none"
          style={styles.input}
        />

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Pressable
          testID="import-custom-deck-submit"
          accessibilityRole="button"
          accessibilityLabel="Import custom deck"
          accessibilityHint="Imports the local custom deck JSON and opens its detail screen"
          onPress={() => {
            void handleImport();
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryButtonPressed : null,
            importing ? styles.buttonDisabled : null,
          ]}
        >
          {importing ? (
            <ActivityIndicator color="#0B0B10" />
          ) : (
            <Text style={styles.primaryButtonText}>Import Deck</Text>
          )}
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  content: {
    paddingHorizontal: 16,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    lineHeight: 22,
  },
  noteCard: {
    marginTop: 18,
    borderRadius: 16,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  noteTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  noteBody: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.74)',
    fontSize: 14,
    lineHeight: 21,
  },
  input: {
    marginTop: 18,
    minHeight: 260,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    textAlignVertical: 'top',
  },
  errorCard: {
    marginTop: 18,
    borderRadius: 14,
    padding: 14,
    backgroundColor: 'rgba(239,68,68,0.18)',
  },
  errorText: {
    color: '#FECACA',
    fontSize: 13,
    lineHeight: 20,
  },
  primaryButton: {
    marginTop: 22,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  primaryButtonPressed: {
    opacity: 0.82,
  },
  buttonDisabled: {
    opacity: 0.72,
  },
  primaryButtonText: {
    color: '#0B0B10',
    fontSize: 15,
    fontWeight: '700',
  },
});
