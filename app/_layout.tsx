import FontAwesome from '@expo/vector-icons/FontAwesome';
import {
  DarkTheme,
  DefaultTheme,
  ThemeProvider,
} from '@react-navigation/native';
import { useFonts } from 'expo-font';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StyleSheet, Text, View } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/components/useColorScheme';
import { initializeDatabase } from '@/lib/db';

export { ErrorBoundary } from 'expo-router';

export const unstable_settings = {
  initialRouteName: '(tabs)',
};

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useFonts({
    SpaceMono: require('../assets/fonts/SpaceMono-Regular.ttf'),
    ...FontAwesome.font,
  });
  const [isDbReady, setIsDbReady] = useState(false);
  const [dbInitError, setDbInitError] = useState<Error | null>(null);

  useEffect(() => {
    if (error) throw error;
  }, [error]);

  useEffect(() => {
    if (!loaded || isDbReady || dbInitError) {
      return;
    }

    let cancelled = false;

    const initDb = async () => {
      try {
        await initializeDatabase();

        if (cancelled) {
          return;
        }

        setIsDbReady(true);
      } catch (initError) {
        if (cancelled) {
          return;
        }

        const normalizedError =
          initError instanceof Error ? initError : new Error(String(initError));
        setDbInitError(normalizedError);
      }
    };

    void initDb();

    return () => {
      cancelled = true;
    };
  }, [dbInitError, isDbReady, loaded]);

  useEffect(() => {
    if (loaded) {
      void SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  if (dbInitError) {
    return <DbInitializationError error={dbInitError} />;
  }

  if (!isDbReady) {
    return <DbInitializationLoading />;
  }

  return <RootLayoutNav />;
}

function DbInitializationLoading() {
  return (
    <View style={styles.initContainer}>
      <Text style={styles.title}>Preparing your decks...</Text>
      <Text style={styles.subtitle}>
        DateDeck is setting up your local data.
      </Text>
    </View>
  );
}

function DbInitializationError({ error }: { error: Error }) {
  return (
    <View style={styles.initContainer}>
      <Text style={styles.title}>Database initialization failed</Text>
      <Text style={styles.subtitle}>
        Please restart the app. If this continues, clear app data and try again.
      </Text>
      <Text style={styles.errorText}>{error.message}</Text>
    </View>
  );
}

function RootLayoutNav() {
  const colorScheme = useColorScheme();

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
        <Stack>
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen
            name="deck/[deckId]"
            options={{ title: 'Deck Detail', headerShown: true }}
          />
          <Stack.Screen
            name="deck/[deckId]/play"
            options={{ headerShown: false, gestureEnabled: false }}
          />
          <Stack.Screen
            name="deck/[deckId]/profile"
            options={{ title: 'Deck Profile' }}
          />
          <Stack.Screen name="details/[id]" options={{ title: 'Details' }} />
          <Stack.Screen
            name="modal"
            options={{ presentation: 'modal', title: 'Filters' }}
          />
          <Stack.Screen name="+not-found" />
        </Stack>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  initContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
  },
  subtitle: {
    marginTop: 12,
    fontSize: 14,
    opacity: 0.7,
    textAlign: 'center',
  },
  errorText: {
    marginTop: 16,
    fontSize: 12,
    opacity: 0.6,
    textAlign: 'center',
  },
  gestureRoot: {
    flex: 1,
  },
});
