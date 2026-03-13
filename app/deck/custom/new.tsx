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
import { createCustomDeck } from '@/lib/customDecks/createCustomDeck';

export default function CreateCustomDeckScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('custom');
  const [cardsText, setCardsText] = useState('');
  const [saving, setSaving] = useState(false);
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
        setSaving(false);
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

  const handleCreateDeck = async () => {
    if (saving) {
      return;
    }

    const requestId = activeRequestRef.current + 1;
    activeRequestRef.current = requestId;
    setSaving(true);
    setErrorMessage(null);

    try {
      const db = await getDb();
      const { deck } = await createCustomDeck(db, {
        title,
        description,
        category,
        cardsText,
      });

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
            : 'Unable to create this deck.',
        );
      }
    } finally {
      if (isMountedRef.current && activeRequestRef.current === requestId) {
        setSaving(false);
      }
    }
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: 'Create Custom Deck' }} />

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 12, paddingBottom: insets.bottom + 24 },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Build a local custom deck</Text>
        <Text style={styles.subtitle}>
          Custom decks stay on this device. They do not yet inherit the richer
          prebuilt taxonomy, compare, or report flow.
        </Text>

        <View style={styles.section}>
          <Text style={styles.label}>Deck title</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Weekend check-in"
            placeholderTextColor="rgba(255,255,255,0.38)"
            style={styles.input}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Description</Text>
          <TextInput
            value={description}
            onChangeText={setDescription}
            placeholder="A few low-pressure prompts for a first date."
            placeholderTextColor="rgba(255,255,255,0.38)"
            multiline
            style={[styles.input, styles.multilineInput]}
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Category label</Text>
          <TextInput
            value={category}
            onChangeText={setCategory}
            placeholder="custom"
            placeholderTextColor="rgba(255,255,255,0.38)"
            style={styles.input}
            autoCapitalize="none"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.label}>Cards</Text>
          <Text style={styles.helperText}>
            One card per line. This quick-create flow makes statement cards by
            default.
          </Text>
          <TextInput
            value={cardsText}
            onChangeText={setCardsText}
            placeholder={
              'I always notice the soundtrack first.\nI would rather plan loosely than over-schedule.\nI care more about kindness than polish.'
            }
            placeholderTextColor="rgba(255,255,255,0.38)"
            multiline
            style={[styles.input, styles.cardsInput]}
          />
        </View>

        {errorMessage ? (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        ) : null}

        <Pressable
          testID="create-custom-deck-submit"
          accessibilityRole="button"
          accessibilityLabel="Create custom deck"
          accessibilityHint="Creates the local custom deck and opens its detail screen"
          onPress={() => {
            void handleCreateDeck();
          }}
          style={({ pressed }) => [
            styles.primaryButton,
            pressed ? styles.primaryButtonPressed : null,
            saving ? styles.buttonDisabled : null,
          ]}
        >
          {saving ? (
            <ActivityIndicator color="#0B0B10" />
          ) : (
            <Text style={styles.primaryButtonText}>Create Deck</Text>
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
  section: {
    marginTop: 18,
  },
  label: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  helperText: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.58)',
    fontSize: 12,
    lineHeight: 18,
  },
  input: {
    marginTop: 10,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#FFFFFF',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
  },
  multilineInput: {
    minHeight: 96,
    textAlignVertical: 'top',
  },
  cardsInput: {
    minHeight: 180,
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
