import Ionicons from '@expo/vector-icons/Ionicons';
import { LinearGradient } from 'expo-linear-gradient';
import { memo, useMemo } from 'react';
import {
  StyleProp,
  StyleSheet,
  Text,
  View,
  type ViewStyle,
} from 'react-native';

import { getTileTokens } from '@/lib/tiles';
import { iconForEntityType } from '@/lib/tiles/iconForEntityType';

export type DeterministicTileVariant = 'deck' | 'library';

export interface DeterministicTileProps {
  tileKey: string;
  type: string;
  title?: string | null;
  subtitle?: string | null;
  variant?: DeterministicTileVariant;
  style?: StyleProp<ViewStyle>;
  accessibilityLabel?: string;
}

function normalizeTitle(title?: string | null): string {
  const normalized = (title ?? '').trim();
  return normalized.length > 0 ? normalized : 'Untitled';
}

function normalizeSubtitle(subtitle?: string | null): string | null {
  const normalized = (subtitle ?? '').trim();
  return normalized.length > 0 ? normalized : null;
}

function toScrimAlpha(overlayStyleKey: 'scrim_soft' | 'scrim_medium'): number {
  return overlayStyleKey === 'scrim_medium' ? 0.55 : 0.45;
}

/**
 * Determinism contract: same tileKey always yields identical visual tokens.
 * The component has no randomness or time-dependent rendering branches.
 */
function DeterministicTileImpl({
  tileKey,
  type,
  title,
  subtitle,
  variant = 'deck',
  style,
  accessibilityLabel,
}: DeterministicTileProps) {
  const tokens = useMemo(() => getTileTokens(tileKey), [tileKey]);
  const iconName = useMemo(() => iconForEntityType(type), [type]);
  const normalizedTitle = useMemo(() => normalizeTitle(title), [title]);
  const normalizedSubtitle = useMemo(
    () => normalizeSubtitle(subtitle),
    [subtitle],
  );
  const isDeckVariant = variant === 'deck';
  const titleLineCount = isDeckVariant ? 2 : 1;
  const tileA11yLabel =
    accessibilityLabel ?? `${normalizedTitle}, ${(type || 'unknown').trim()}`;
  const deckScrimColors: readonly [string, string] = [
    'rgba(0, 0, 0, 0)',
    `rgba(0, 0, 0, ${toScrimAlpha(tokens.overlayStyleKey)})`,
  ];

  return (
    <View
      testID="deterministic-tile"
      accessibilityRole="image"
      accessibilityLabel={tileA11yLabel}
      style={[
        styles.baseContainer,
        isDeckVariant ? styles.deckContainer : styles.libraryContainer,
        style,
      ]}
    >
      <LinearGradient
        testID="tile-gradient"
        colors={tokens.colors}
        start={tokens.gradientStart}
        end={tokens.gradientEnd}
        style={StyleSheet.absoluteFillObject}
      />

      {isDeckVariant ? (
        <LinearGradient
          testID="tile-overlay"
          colors={deckScrimColors}
          start={stylesTokens.topToBottom.start}
          end={stylesTokens.topToBottom.end}
          style={[StyleSheet.absoluteFillObject, styles.deckScrim]}
          pointerEvents="none"
        />
      ) : (
        <View
          testID="tile-overlay"
          style={[
            StyleSheet.absoluteFillObject,
            styles.libraryScrim,
            tokens.overlayStyleKey === 'scrim_medium'
              ? styles.libraryScrimMedium
              : null,
          ]}
          pointerEvents="none"
        />
      )}

      {isDeckVariant ? (
        <View
          testID="tile-icon-badge"
          style={[
            styles.deckIconBadge,
            { backgroundColor: `rgba(255, 255, 255, ${tokens.accentAlpha})` },
          ]}
          pointerEvents="none"
          accessible={false}
        >
          <Ionicons testID="tile-icon" name={iconName} size={22} color="#FFFFFF" />
        </View>
      ) : (
        <View
          testID="tile-icon-container"
          style={styles.libraryIconContainer}
          pointerEvents="none"
          accessible={false}
        >
          <Ionicons testID="tile-icon" name={iconName} size={28} color="#FFFFFF" />
        </View>
      )}

      <View
        testID="tile-text-block"
        style={isDeckVariant ? styles.deckTextBlock : styles.libraryTextBlock}
        pointerEvents="none"
        accessible={false}
      >
        <Text
          testID="tile-title"
          style={isDeckVariant ? styles.deckTitleText : styles.libraryTitleText}
          numberOfLines={titleLineCount}
          ellipsizeMode="tail"
        >
          {normalizedTitle}
        </Text>

        {isDeckVariant && normalizedSubtitle ? (
          <Text
            testID="tile-subtitle"
            style={styles.deckSubtitleText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {normalizedSubtitle}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export const DeterministicTile = memo(DeterministicTileImpl);
export default DeterministicTile;

const stylesTokens = {
  topToBottom: {
    start: { x: 0, y: 0 },
    end: { x: 0, y: 1 },
  },
} as const;

const styles = StyleSheet.create({
  baseContainer: {
    overflow: 'hidden',
    position: 'relative',
  },
  deckContainer: {
    width: '100%',
    aspectRatio: 3 / 4,
    borderRadius: 20,
  },
  libraryContainer: {
    width: 64,
    height: 64,
    borderRadius: 12,
  },
  deckScrim: {
    top: '45%',
  },
  libraryScrim: {
    backgroundColor: 'rgba(0, 0, 0, 0.10)',
  },
  libraryScrimMedium: {
    backgroundColor: 'rgba(0, 0, 0, 0.14)',
  },
  deckIconBadge: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  libraryIconContainer: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deckTextBlock: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
  },
  libraryTextBlock: {
    position: 'absolute',
    left: 6,
    right: 6,
    bottom: 5,
  },
  deckTitleText: {
    color: '#FFFFFF',
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  libraryTitleText: {
    color: '#FFFFFF',
    fontSize: 10,
    lineHeight: 12,
    fontWeight: '600',
  },
  deckSubtitleText: {
    marginTop: 4,
    color: 'rgba(255, 255, 255, 0.75)',
    fontSize: 15,
    lineHeight: 20,
    fontWeight: '400',
  },
});
