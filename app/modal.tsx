import { StatusBar } from 'expo-status-bar';
import { useRouter } from 'expo-router';
import {
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

export default function ModalScreen() {
  const router = useRouter();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Deck Browser Filters</Text>
      <Text style={styles.subtitle}>
        Browse stays broad in this build. Personalization starts only after you
        enter a deck and build deck-specific local signal.
      </Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>What happens now</Text>
        <Text style={styles.sectionBody}>
          Prebuilt decks are shown as local options in the browser. The app does
          not quietly hide or reorder decks based on cloud profiling.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Where adaptation happens</Text>
        <Text style={styles.sectionBody}>
          The richer sequencing logic lives inside prebuilt decks: broad-start,
          tag-aware scoring, coverage guardrails, and purposeful retest happen
          after you start swiping a deck.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy boundary</Text>
        <Text style={styles.sectionBody}>
          Swipe history and profile structure stay on this device until you
          explicitly start a compare or report flow for one deck.
        </Text>
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to decks"
        onPress={() => router.back()}
        style={({ pressed }) => [
          styles.primaryButton,
          pressed ? styles.buttonPressed : null,
        ]}
      >
        <Text style={styles.primaryButtonText}>Back to Decks</Text>
      </Pressable>

      <StatusBar style={Platform.OS === 'ios' ? 'light' : 'auto'} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  content: {
    padding: 20,
    paddingBottom: 32,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    lineHeight: 22,
  },
  section: {
    marginTop: 16,
    borderRadius: 18,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
  sectionBody: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.74)',
    fontSize: 14,
    lineHeight: 22,
  },
  primaryButton: {
    marginTop: 20,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  primaryButtonText: {
    color: '#0B0B10',
    fontSize: 15,
    fontWeight: '700',
  },
  buttonPressed: {
    opacity: 0.82,
  },
});
