import { hashTileKey } from './hashTileKey';
import { paletteFromHash, type PaletteFromHashResult } from './paletteFromHash';

export interface TileTokens extends PaletteFromHashResult {
  tileKey: string;
  hash: number;
}

export function getTileTokens(tileKey: string): TileTokens {
  const hash = hashTileKey(tileKey);
  const palette = paletteFromHash(hash);

  return {
    tileKey,
    hash,
    ...palette,
  };
}
