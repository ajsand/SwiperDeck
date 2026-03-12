import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { useDecksWithProfileStatus } from '@/hooks/useDecksWithProfileStatus';

function pluralize(value: number, singular: string, plural: string): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

export default function SettingsScreen() {
  const { decks, loading } = useDecksWithProfileStatus();
  const activeDecks = decks.filter((entry) => entry.swipeCount > 0).length;
  const compareReadyDecks = decks.filter((entry) => entry.compareReady).length;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>
        DateDeck stays local-first, deck-first, and consent-gated by design.
      </Text>

      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Decks on device</Text>
          <Text style={styles.statValue}>{loading ? '--' : decks.length}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active decks</Text>
          <Text style={styles.statValue}>{loading ? '--' : activeDecks}</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Compare-ready</Text>
          <Text style={styles.statValue}>
            {loading ? '--' : compareReadyDecks}
          </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Local-first by default</Text>
        <Text style={styles.sectionBody}>
          Swipe history, deck profiles, and custom content stay on this device
          unless you explicitly start a compare or report flow.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Compare is consent-gated</Text>
        <Text style={styles.sectionBody}>
          Compare only makes sense when both people choose the same deck, have
          enough local signal, and explicitly approve what leaves the device.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>
          Prebuilt decks get richer sequencing
        </Text>
        <Text style={styles.sectionBody}>
          Canonical tag taxonomy, tag-aware sequencing, coverage logic, and
          retest behavior currently apply to shipped prebuilt decks. Custom deck
          support remains local-first but does not promise the same profile
          depth yet.
        </Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sensitive decks stay bounded</Text>
        <Text style={styles.sectionBody}>
          Some decks require stronger safeguards, more cautious compare
          thresholds, or no showdown support at all. The app should never drift
          into hidden profiling or public compatibility scoring.
        </Text>
      </View>

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Current local state</Text>
        <Text style={styles.footerText}>
          {loading
            ? 'Loading local deck state...'
            : `${pluralize(activeDecks, 'deck has', 'decks have')} local activity and ${pluralize(compareReadyDecks, 'deck is', 'decks are')} currently compare-ready.`}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
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
  statsRow: {
    marginTop: 18,
    flexDirection: 'row',
    gap: 10,
  },
  statCard: {
    flex: 1,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  statLabel: {
    color: 'rgba(255,255,255,0.62)',
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statValue: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  section: {
    marginTop: 16,
    borderRadius: 18,
    padding: 16,
    backgroundColor: 'rgba(255,255,255,0.05)',
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
  footerCard: {
    marginTop: 16,
    borderRadius: 18,
    padding: 16,
    backgroundColor: 'rgba(14,165,233,0.12)',
  },
  footerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  footerText: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.78)',
    fontSize: 14,
    lineHeight: 22,
  },
});
