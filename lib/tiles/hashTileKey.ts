const FNV_OFFSET_BASIS_32 = 0x811c9dc5;
const FNV_PRIME_32 = 0x01000193;

const UTF8_ENCODER = new TextEncoder();

export function hashTileKey(tileKey: string): number {
  let hash = FNV_OFFSET_BASIS_32;
  const bytes = UTF8_ENCODER.encode(tileKey);

  for (const byte of bytes) {
    hash ^= byte;
    hash = Math.imul(hash, FNV_PRIME_32) >>> 0;
  }

  return hash >>> 0;
}
