import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { usePathname, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';
import {
  resolveAppNavSection,
  shouldShowAppBottomNav,
  type AppNavSection,
} from '@/lib/navigation/appShell';

type NavItem = {
  section: AppNavSection;
  label: string;
  href: string;
  icon: React.ComponentProps<typeof FontAwesome>['name'];
};

const NAV_ITEMS: NavItem[] = [
  {
    section: 'decks',
    label: 'Decks',
    href: '/',
    icon: 'th-large',
  },
  {
    section: 'profile',
    label: 'Profile',
    href: '/profile',
    icon: 'user',
  },
  {
    section: 'history',
    label: 'History',
    href: '/library',
    icon: 'clock-o',
  },
  {
    section: 'settings',
    label: 'Settings',
    href: '/settings',
    icon: 'cog',
  },
];

export default function PersistentBottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const insets = useSafeAreaInsets();

  if (!shouldShowAppBottomNav(pathname)) {
    return null;
  }

  const activeSection = resolveAppNavSection(pathname);
  const palette = Colors[colorScheme ?? 'light'];

  return (
    <View
      accessibilityRole="tablist"
      style={[
        styles.container,
        {
          paddingBottom: Math.max(insets.bottom, 10),
          borderTopColor: 'rgba(255,255,255,0.08)',
          backgroundColor: '#090A0F',
        },
      ]}
    >
      {NAV_ITEMS.map((item) => {
        const isActive = item.section === activeSection;

        return (
          <Pressable
            key={item.section}
            accessibilityRole="tab"
            accessibilityState={{ selected: isActive }}
            accessibilityLabel={item.label}
            onPress={() => {
              if (pathname === item.href) {
                return;
              }

              router.replace(item.href as never);
            }}
            style={({ pressed }) => [
              styles.tabButton,
              isActive ? styles.tabButtonActive : null,
              pressed ? styles.tabButtonPressed : null,
            ]}
          >
            <FontAwesome
              name={item.icon}
              size={20}
              color={isActive ? palette.tint : 'rgba(255,255,255,0.58)'}
            />
            <Text
              style={[
                styles.tabLabel,
                {
                  color: isActive ? palette.tint : 'rgba(255,255,255,0.62)',
                },
              ]}
            >
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'stretch',
    justifyContent: 'space-around',
    paddingTop: 10,
    paddingHorizontal: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  tabButton: {
    flex: 1,
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 14,
    marginHorizontal: 4,
  },
  tabButtonActive: {
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  tabButtonPressed: {
    opacity: 0.8,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '700',
  },
});
