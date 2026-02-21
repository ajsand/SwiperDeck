import { Link } from 'expo-router';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/Themed';

export default function DeckScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Deck</Text>
      <View style={styles.separator} lightColor="#eee" darkColor="rgba(255,255,255,0.1)" />
      <Text style={styles.subtitle}>Swipe to teach your taste.</Text>
      <Link href="/details/example-id" style={styles.link}>
        Open example detail route
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  separator: {
    marginVertical: 20,
    height: 1,
    width: '80%',
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.6,
  },
  link: {
    marginTop: 20,
    fontSize: 16,
    color: '#2e78b7',
  },
});
