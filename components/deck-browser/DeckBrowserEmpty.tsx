import Ionicons from '@expo/vector-icons/Ionicons';
import { memo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

function DeckBrowserEmptyImpl() {
  return (
    <View
      testID="deck-browser-empty"
      accessible
      accessibilityRole="text"
      accessibilityLabel="No decks available. Prebuilt decks will appear here once loaded."
      style={styles.container}
    >
      <View style={styles.iconBadge} accessible={false}>
        <Ionicons name="albums-outline" size={24} color="#FFFFFF" />
      </View>
      <Text style={styles.title}>No decks yet</Text>
      <Text style={styles.message}>
        Prebuilt decks will appear here once they are loaded.
      </Text>
    </View>
  );
}

export const DeckBrowserEmpty = memo(DeckBrowserEmptyImpl);

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
    backgroundColor: 'rgba(255,255,255,0.1)',
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
});
