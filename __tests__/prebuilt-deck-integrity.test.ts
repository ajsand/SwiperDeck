import prebuiltDecksData from '@/assets/data/prebuilt-decks.json';
import { CARD_KINDS, DECK_CATEGORIES } from '@/types/domain';

describe('prebuilt deck integrity', () => {
  it('parses successfully and contains the 10 Tier 1 decks', () => {
    expect(prebuiltDecksData).toBeTruthy();
    expect(prebuiltDecksData.version).toBe(1);
    expect(prebuiltDecksData.decks).toHaveLength(10);
  });

  it('uses unique deck ids and covers all Tier 1 categories', () => {
    const deckIds = prebuiltDecksData.decks.map((deck) => deck.id);
    expect(new Set(deckIds).size).toBe(deckIds.length);

    const categories = prebuiltDecksData.decks
      .map((deck) => deck.category)
      .sort();
    expect(categories).toEqual([...DECK_CATEGORIES].sort());
  });

  it('uses globally unique card ids across all decks', () => {
    const cardIds = prebuiltDecksData.decks.flatMap((deck) =>
      deck.cards.map((card) => card.id),
    );

    expect(new Set(cardIds).size).toBe(cardIds.length);
  });

  it('keeps every deck within the expected size bounds', () => {
    prebuiltDecksData.decks.forEach((deck) => {
      expect(deck.cards.length).toBeGreaterThanOrEqual(30);
      expect(deck.cards.length).toBeLessThanOrEqual(100);
    });

    const totalCards = prebuiltDecksData.decks.reduce(
      (sum, deck) => sum + deck.cards.length,
      0,
    );
    expect(totalCards).toBeGreaterThanOrEqual(400);
    expect(totalCards).toBeLessThanOrEqual(600);
  });

  it('keeps every card structurally valid', () => {
    const validKinds = new Set(CARD_KINDS);

    prebuiltDecksData.decks.forEach((deck) => {
      deck.cards.forEach((card) => {
        expect(typeof card.id).toBe('string');
        expect(card.id.trim()).not.toBe('');
        expect(validKinds.has(card.kind as (typeof CARD_KINDS)[number])).toBe(
          true,
        );
        expect(typeof card.title).toBe('string');
        expect(card.title.trim()).not.toBe('');
        expect(Array.isArray(card.tags)).toBe(true);
        expect(card.tags.length).toBeGreaterThanOrEqual(1);
        expect(card.tags.length).toBeLessThanOrEqual(15);
        expect(typeof card.popularity).toBe('number');
        expect(card.popularity).toBeGreaterThanOrEqual(0);
        expect(card.popularity).toBeLessThanOrEqual(1);
      });
    });
  });
});
