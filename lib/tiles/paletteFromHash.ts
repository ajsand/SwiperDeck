export type GradientDirectionKey =
  | 'diagonal_tl_br'
  | 'diagonal_tr_bl'
  | 'vertical_top_bottom'
  | 'horizontal_left_right';

export type OverlayStyleKey = 'scrim_soft' | 'scrim_medium';

export interface GradientPoint {
  x: number;
  y: number;
}

export interface TilePaletteDefinition {
  id: string;
  colors: readonly [string, string];
}

export interface PaletteFromHashResult {
  paletteId: string;
  paletteIndex: number;
  colors: readonly [string, string];
  gradientDirection: GradientDirectionKey;
  gradientStart: GradientPoint;
  gradientEnd: GradientPoint;
  textColor: '#FFFFFF';
  overlayStyleKey: OverlayStyleKey;
  accentAlpha: number;
}

function createPalette(
  id: string,
  colorTop: string,
  colorBottom: string,
): TilePaletteDefinition {
  return Object.freeze({
    id,
    colors: Object.freeze([colorTop, colorBottom]) as readonly [string, string],
  });
}

const TILE_PALETTES_INTERNAL: readonly TilePaletteDefinition[] = Object.freeze([
  createPalette('indigo_dusk', '#4C1D95', '#312E81'),
  createPalette('crimson_sun', '#B91C1C', '#7F1D1D'),
  createPalette('emerald_twilight', '#065F46', '#115E59'),
  createPalette('ocean_night', '#1D4ED8', '#0F766E'),
  createPalette('amber_deep', '#B45309', '#78350F'),
  createPalette('violet_storm', '#7E22CE', '#4338CA'),
  createPalette('slate_mist', '#334155', '#1E293B'),
  createPalette('rose_midnight', '#BE185D', '#881337'),
]);

const GRADIENT_DIRECTIONS = Object.freeze<
  Record<GradientDirectionKey, Readonly<{ start: GradientPoint; end: GradientPoint }>>
>({
  diagonal_tl_br: Object.freeze({
    start: Object.freeze({ x: 0, y: 0 }),
    end: Object.freeze({ x: 1, y: 1 }),
  }),
  diagonal_tr_bl: Object.freeze({
    start: Object.freeze({ x: 1, y: 0 }),
    end: Object.freeze({ x: 0, y: 1 }),
  }),
  vertical_top_bottom: Object.freeze({
    start: Object.freeze({ x: 0.5, y: 0 }),
    end: Object.freeze({ x: 0.5, y: 1 }),
  }),
  horizontal_left_right: Object.freeze({
    start: Object.freeze({ x: 0, y: 0.5 }),
    end: Object.freeze({ x: 1, y: 0.5 }),
  }),
});

const DIRECTION_ORDER: readonly GradientDirectionKey[] = Object.freeze([
  'diagonal_tl_br',
  'diagonal_tr_bl',
  'vertical_top_bottom',
  'horizontal_left_right',
]);

const ACCENT_ALPHA_VALUES: readonly number[] = Object.freeze([0.16, 0.2, 0.24]);
const OVERLAY_STYLE_VALUES: readonly OverlayStyleKey[] = Object.freeze([
  'scrim_soft',
  'scrim_medium',
]);

export const TILE_PALETTES: readonly TilePaletteDefinition[] = TILE_PALETTES_INTERNAL;

export function paletteFromHash(hash: number): PaletteFromHashResult {
  const normalizedHash = hash >>> 0;
  const paletteIndex = normalizedHash % TILE_PALETTES.length;
  const palette = TILE_PALETTES[paletteIndex];

  const direction =
    DIRECTION_ORDER[(normalizedHash >>> 3) % DIRECTION_ORDER.length];
  const directionSpec = GRADIENT_DIRECTIONS[direction];
  const overlayStyleKey =
    OVERLAY_STYLE_VALUES[(normalizedHash >>> 5) % OVERLAY_STYLE_VALUES.length];
  const accentAlpha =
    ACCENT_ALPHA_VALUES[(normalizedHash >>> 7) % ACCENT_ALPHA_VALUES.length];

  return {
    paletteId: palette.id,
    paletteIndex,
    colors: palette.colors,
    gradientDirection: direction,
    gradientStart: directionSpec.start,
    gradientEnd: directionSpec.end,
    textColor: '#FFFFFF',
    overlayStyleKey,
    accentAlpha,
  };
}
