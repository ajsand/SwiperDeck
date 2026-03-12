export interface TileTokenFixture {
  tileKey: string;
  expectedHash: number;
}

export interface TileComponentFixture {
  id: string;
  tileKey: string;
  type: string;
  title?: string | null;
  subtitle?: string | null;
  variant?: 'deck' | 'library';
}

export const TILE_CONTRACT = Object.freeze({
  fallbackTitle: 'Untitled',
  fallbackIcon: 'help-circle-outline',
  paletteIds: Object.freeze([
    'indigo_dusk',
    'crimson_sun',
    'emerald_twilight',
    'ocean_night',
    'amber_deep',
    'violet_storm',
    'slate_mist',
    'rose_midnight',
  ]),
});

export const TILE_HASH_FIXTURES: readonly TileTokenFixture[] = Object.freeze([
  Object.freeze({
    tileKey: 'movie:movie-the-shawshank-redemption',
    expectedHash: 3687060668,
  }),
  Object.freeze({
    tileKey: 'book:book-1984',
    expectedHash: 3528621556,
  }),
  Object.freeze({
    tileKey: 'podcast:hardcore-history',
    expectedHash: 1480735700,
  }),
  Object.freeze({
    tileKey: 'concept:stoicism',
    expectedHash: 646912148,
  }),
  Object.freeze({
    tileKey: 'unicode:café',
    expectedHash: 119925020,
  }),
  Object.freeze({
    tileKey: 'unicode:cafe\u0301',
    expectedHash: 756723148,
  }),
  Object.freeze({
    tileKey: 'unicode:こんにちは',
    expectedHash: 1984463008,
  }),
]);

export const TILE_SNAPSHOT_KEYS: readonly string[] = Object.freeze([
  'tile:a',
  'tile:b',
  'movie:movie-the-shawshank-redemption',
  'podcast:hardcore-history',
  'unicode:こんにちは',
]);

export const TILE_COMPONENT_FIXTURES: readonly TileComponentFixture[] =
  Object.freeze([
    Object.freeze({
      id: 'deck-basic-movie',
      tileKey: 'movie:movie-the-shawshank-redemption',
      type: 'movie',
      title: 'The Shawshank Redemption',
      subtitle: 'Frank Darabont, 1994',
      variant: 'deck',
    }),
    Object.freeze({
      id: 'deck-missing-title-subtitle',
      tileKey: 'movie:missing-label',
      type: 'movie',
      title: '   ',
      subtitle: '  ',
      variant: 'deck',
    }),
    Object.freeze({
      id: 'deck-unknown-type',
      tileKey: 'unknown:entity',
      type: 'unknown_type',
      title: 'Unknown Entity',
      variant: 'deck',
    }),
    Object.freeze({
      id: 'library-unicode-long-title',
      tileKey: 'unicode:こんにちは',
      type: 'book',
      title: 'こんにちは世界これはとても長いタイトルです',
      subtitle: 'Subtitle ignored in library variant',
      variant: 'library',
    }),
    Object.freeze({
      id: 'library-podcast',
      tileKey: 'podcast:hardcore-history',
      type: 'podcast',
      title: 'Hardcore History',
      subtitle: 'Dan Carlin',
      variant: 'library',
    }),
  ]);
