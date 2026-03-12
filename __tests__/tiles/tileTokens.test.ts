import {
  FALLBACK_TILE_ICON,
  getTileTokens,
  hashTileKey,
  iconForEntityType,
  paletteFromHash,
  TILE_PALETTES,
} from '@/lib/tiles';
import {
  TILE_CONTRACT,
  TILE_HASH_FIXTURES,
  TILE_SNAPSHOT_KEYS,
} from '../../test-fixtures/tiles';

describe('tile token contract', () => {
  it('keeps FNV-1a hash fixtures stable', () => {
    TILE_HASH_FIXTURES.forEach(({ tileKey, expectedHash }) => {
      expect(hashTileKey(tileKey)).toBe(expectedHash);
    });
  });

  it('keeps unicode hashing deterministic without implicit normalization', () => {
    expect(hashTileKey('unicode:café')).toBe(119925020);
    expect(hashTileKey('unicode:cafe\u0301')).toBe(756723148);
    expect(hashTileKey('unicode:café')).not.toBe(
      hashTileKey('unicode:cafe\u0301'),
    );
  });

  it('freezes palette list and ids', () => {
    expect(Object.isFrozen(TILE_PALETTES)).toBe(true);
    expect(TILE_PALETTES.map((palette) => palette.id)).toEqual(
      TILE_CONTRACT.paletteIds,
    );
    expect(Object.isFrozen(TILE_PALETTES[0])).toBe(true);
    expect(Object.isFrozen(TILE_PALETTES[0].colors)).toBe(true);
  });

  it('keeps palette contract snapshot stable', () => {
    expect(TILE_PALETTES).toMatchSnapshot();
  });

  it('keeps token derivation snapshot matrix stable', () => {
    const tokenMatrix = TILE_SNAPSHOT_KEYS.map((tileKey) => {
      const token = getTileTokens(tileKey);
      return {
        tileKey,
        hash: token.hash,
        paletteId: token.paletteId,
        colors: token.colors,
        gradientDirection: token.gradientDirection,
        gradientStart: token.gradientStart,
        gradientEnd: token.gradientEnd,
        overlayStyleKey: token.overlayStyleKey,
        accentAlpha: token.accentAlpha,
        textColor: token.textColor,
      };
    });

    expect(tokenMatrix).toMatchSnapshot();
  });

  it('maps unknown types to fallback icon contract', () => {
    expect(FALLBACK_TILE_ICON).toBe(TILE_CONTRACT.fallbackIcon);
    expect(iconForEntityType('unknown_type')).toBe(TILE_CONTRACT.fallbackIcon);
    expect(iconForEntityType('movie')).toBe('film-outline');
  });

  it('keeps hash-to-palette selectors stable for a known hash', () => {
    expect(paletteFromHash(3144655672)).toMatchSnapshot();
  });
});
