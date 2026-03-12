import prebuiltDecksData from '@/assets/data/prebuilt-decks.json';
import prebuiltDeckTaxonomiesData from '@/assets/data/prebuilt-deck-taxonomies.json';

describe('prebuilt deck taxonomy integrity', () => {
  it('keeps taxonomy and deck files on the same content version', () => {
    expect(prebuiltDecksData.version).toBe(2);
    expect(prebuiltDeckTaxonomiesData.version).toBe(2);
    expect(prebuiltDeckTaxonomiesData.decks).toHaveLength(
      prebuiltDecksData.decks.length,
    );
  });

  it('defines 3-6 facets and 8-20 tags for every prebuilt deck', () => {
    prebuiltDeckTaxonomiesData.decks.forEach((deck) => {
      expect(deck.facets.length).toBeGreaterThanOrEqual(3);
      expect(deck.facets.length).toBeLessThanOrEqual(6);
      expect(deck.tags.length).toBeGreaterThanOrEqual(8);
      expect(deck.tags.length).toBeLessThanOrEqual(20);
    });
  });

  it('keeps every card aligned with canonical assignments', () => {
    const taxonomyByDeckId = new Map(
      prebuiltDeckTaxonomiesData.decks.map((deck) => [deck.deck_id, deck]),
    );

    prebuiltDecksData.decks.forEach((deck) => {
      const taxonomy = taxonomyByDeckId.get(deck.id);
      expect(taxonomy).toBeTruthy();
      const tagIds = new Set((taxonomy?.tags ?? []).map((tag) => tag.id));

      deck.cards.forEach((card) => {
        expect(card.tag_assignments.length).toBeGreaterThanOrEqual(1);
        expect(card.tag_assignments.length).toBeLessThanOrEqual(3);

        const primaryAssignments = card.tag_assignments.filter(
          (assignment) => assignment.role === 'primary',
        );
        expect(primaryAssignments).toHaveLength(1);

        const assignmentIds = new Set(
          card.tag_assignments.map((assignment) => assignment.tag_id),
        );
        expect(assignmentIds.size).toBe(card.tag_assignments.length);

        card.tag_assignments.forEach((assignment) => {
          expect(tagIds.has(assignment.tag_id)).toBe(true);
        });

        const assignedTagSlugs = new Set(
          card.tag_assignments.map(
            (assignment) =>
              taxonomy?.tags.find((tag) => tag.id === assignment.tag_id)?.slug,
          ),
        );
        card.tags.forEach((tag) => {
          expect(assignedTagSlugs.has(tag)).toBe(true);
        });
      });
    });
  });

  it('ensures every canonical tag is used by at least two cards', () => {
    const cardDeckMap = new Map(
      prebuiltDecksData.decks.map((deck) => [deck.id, deck]),
    );

    prebuiltDeckTaxonomiesData.decks.forEach((deckTaxonomy) => {
      const deck = cardDeckMap.get(deckTaxonomy.deck_id);
      expect(deck).toBeTruthy();

      const usage = new Map<string, number>();
      deck?.cards.forEach((card) => {
        card.tag_assignments.forEach((assignment) => {
          usage.set(assignment.tag_id, (usage.get(assignment.tag_id) ?? 0) + 1);
        });
      });

      deckTaxonomy.tags.forEach((tag) => {
        expect(usage.get(tag.id) ?? 0).toBeGreaterThanOrEqual(2);
      });
    });
  });
});
