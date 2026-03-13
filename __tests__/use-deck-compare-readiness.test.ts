import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useDeckCompareReadiness } from '@/hooks/useDeckCompareReadiness';
import {
  asDeckId,
  asDeckTagId,
  type Deck,
  type DeckProfileSummary,
} from '@/types/domain';

const mockGetDb = jest.fn();
const mockUseDeckById = jest.fn();
const mockUseDeckProfileSummary = jest.fn();
const mockEvaluateDeckCompareReadiness = jest.fn();
const mockBuildDeckCompareConsentDraft = jest.fn();
const mockBuildComparePayload = jest.fn();
const mockBuildComparePayloadPreview = jest.fn();

jest.mock('@/lib/db', () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args),
}));

jest.mock('@/hooks/useDeckById', () => ({
  useDeckById: (...args: unknown[]) => mockUseDeckById(...args),
}));

jest.mock('@/hooks/useDeckProfileSummary', () => ({
  useDeckProfileSummary: (...args: unknown[]) =>
    mockUseDeckProfileSummary(...args),
}));

jest.mock('@/lib/compare/deckCompareReadiness', () => ({
  evaluateDeckCompareReadiness: (...args: unknown[]) =>
    mockEvaluateDeckCompareReadiness(...args),
  buildDeckCompareConsentDraft: (...args: unknown[]) =>
    mockBuildDeckCompareConsentDraft(...args),
}));

jest.mock('@/lib/compare/buildComparePayload', () => ({
  buildComparePayload: (...args: unknown[]) => mockBuildComparePayload(...args),
}));

jest.mock('@/lib/compare/comparePayloadPreview', () => ({
  buildComparePayloadPreview: (...args: unknown[]) =>
    mockBuildComparePayloadPreview(...args),
}));

function buildDeck(overrides: Partial<Deck> = {}): Deck {
  return {
    id: asDeckId('deck_movies_tv'),
    title: 'Movies & TV',
    description: 'Talk through favorites and comfort rewatches.',
    category: 'movies_tv',
    tier: 'tier_1',
    cardCount: 24,
    compareEligible: true,
    showdownEligible: true,
    sensitivity: 'standard',
    minCardsForProfile: 12,
    minCardsForCompare: 24,
    isCustom: false,
    coverTileKey: null,
    createdAt: 1700000000000,
    updatedAt: 1700000001000,
    ...overrides,
  };
}

function buildSummary(
  overrides: Partial<DeckProfileSummary> = {},
): DeckProfileSummary {
  return {
    deckId: asDeckId('deck_movies_tv'),
    stage: 'high_confidence',
    confidence: {
      value: 0.82,
      label: 'high',
      swipeCount: 31,
      cardCoverage: 0.78,
      components: {
        swipeSignal: 1,
        cardCoverage: 0.78,
        tagCoverage: 0.85,
        facetCoverage: 1,
        stability: 0.72,
        ambiguityPenalty: 0.18,
      },
    },
    coverage: {
      deckId: asDeckId('deck_movies_tv'),
      cardsSeen: 19,
      totalCards: 24,
      cardCoverage: 19 / 24,
      tags: {
        deckId: asDeckId('deck_movies_tv'),
        totalTagCount: 10,
        seenTagCount: 9,
        unseenTagCount: 1,
        resolvedTagCount: 7,
        uncertainTagCount: 3,
        coverageRatio: 0.9,
      },
      facets: {
        totalFacetCount: 4,
        seenFacetCount: 4,
        unseenFacetCount: 0,
        coverageRatio: 1,
      },
    },
    stability: {
      stabilityScore: 0.74,
      stableTagCount: 4,
      emergingTagCount: 2,
      mixedSignalTagCount: 1,
      retestedTagCount: 2,
      retestPendingCount: 0,
    },
    affinities: [
      {
        tagId: asDeckTagId('movies_tv:comfort_watch'),
        tag: 'Comfort watch',
        facet: 'Mood',
        score: 2.8,
        exposureCount: 4,
        stability: 'steady',
      },
    ],
    aversions: [],
    unresolved: [],
    nextSteps: [],
    readiness: {
      compareReady: true,
      blockers: [],
    },
    topCardsLiked: [],
    topCardsDisliked: [],
    generatedAt: 1700000005000,
    ...overrides,
  };
}

describe('useDeckCompareReadiness', () => {
  const fakeDb = { label: 'db' };
  const refreshDeck = jest.fn();
  const refetchSummary = jest.fn();
  let deckHookState: ReturnType<typeof mockUseDeckById>;
  let summaryHookState: ReturnType<typeof mockUseDeckProfileSummary>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(fakeDb);

    deckHookState = {
      deck: buildDeck(),
      loading: false,
      error: null,
      refresh: refreshDeck,
    };
    summaryHookState = {
      summary: buildSummary(),
      loading: false,
      error: null,
      refetch: refetchSummary,
    };

    mockUseDeckById.mockImplementation(() => deckHookState);
    mockUseDeckProfileSummary.mockImplementation(() => summaryHookState);
    mockEvaluateDeckCompareReadiness.mockImplementation(
      ({
        deck,
        summary,
      }: {
        deck: Deck;
        summary: DeckProfileSummary | null;
      }) =>
        deck && summary
          ? {
              deckId: deck.id,
              state: 'compare_ready',
              ready: true,
              caution: false,
              title: 'Compare ready',
              detail: 'Ready for compare.',
              reasons: [],
              recommendedAction: 'Go compare.',
            }
          : null,
    );
    mockBuildDeckCompareConsentDraft.mockImplementation(
      ({ deck }: { deck: Deck }) => ({
        deckId: deck.id,
        readinessState: 'compare_ready',
        disclosure: 'Deck-scoped compare export.',
        caution: null,
        exportPreview: [],
        keepsLocal: [],
        confirmations: [],
      }),
    );
    mockBuildComparePayload.mockImplementation(
      ({ deck }: { deck: Deck; summary: DeckProfileSummary }) => ({
        schema: 'datedeck.compare_payload.v1',
        generatedAt: 1700000010000,
        profileGeneratedAt: 1700000005000,
        deck: {
          deckId: deck.id,
          title: deck.title,
          category: deck.category,
          tier: deck.tier,
          sensitivity: deck.sensitivity,
          contentVersion: 2,
        },
        readiness: {
          state: 'compare_ready',
          ready: true,
          caution: false,
          reasons: [],
          recommendedAction: 'Go compare.',
        },
        confidence: {
          stage: 'high_confidence',
          value: 0.82,
          label: 'high',
          swipeCount: 31,
          cardCoverage: 0.78,
          tagCoverage: 0.85,
          facetCoverage: 1,
          stabilityScore: 0.74,
          ambiguityRatio: 0.18,
        },
        coverage: {
          cardsSeen: 19,
          totalCards: 24,
          seenTagCount: 9,
          totalTagCount: 10,
          seenFacetCount: 4,
          totalFacetCount: 4,
        },
        affinities: [],
        aversions: [],
        unresolvedAreas: [],
        evidence: {
          mode: 'summary_only',
          includedCardCount: 0,
          omittedRawCardCount: 0,
          cards: [],
        },
        policy: {
          cautionLevel: 'normal',
          maxAffinityThemes: 3,
          maxAversionThemes: 2,
          maxUnresolvedAreas: 2,
          maxEvidenceCards: 0,
          includeEvidenceCards: false,
          evidenceMode: 'summary_only',
          aiMode: 'local_fallback_allowed',
          showdownAllowed: true,
          safetyWarnings: [],
          redactions: [],
        },
      }),
    );
    mockBuildComparePayloadPreview.mockImplementation(
      (payload: { deck: { deckId: Deck['id'] } }) => ({
        deckId: payload.deck.deckId,
        generatedAt: 1700000010000,
        categories: [],
        debugSummary: {
          summaryLine: 'Preview ready',
          affinityCount: 0,
          aversionCount: 0,
          unresolvedCount: 0,
          evidenceCardCount: 0,
          evidenceMode: 'summary_only',
        },
      }),
    );
  });

  it('returns current compare readiness and payload for the requested deck', async () => {
    const { result } = renderHook(() =>
      useDeckCompareReadiness(asDeckId('deck_movies_tv')),
    );

    await waitFor(() => {
      expect(result.current.payload).not.toBeNull();
    });

    expect(result.current.loading).toBe(false);
    expect(result.current.deck?.id).toBe(asDeckId('deck_movies_tv'));
    expect(result.current.summary?.deckId).toBe(asDeckId('deck_movies_tv'));
    expect(result.current.readiness?.ready).toBe(true);
    expect(result.current.payload?.deck.deckId).toBe(
      asDeckId('deck_movies_tv'),
    );
    expect(result.current.payloadPreview?.deckId).toBe(
      asDeckId('deck_movies_tv'),
    );
  });

  it('suppresses stale deck state when the requested deck id changes', async () => {
    const { result, rerender } = renderHook(
      ({ deckId }: { deckId: Deck['id'] }) => useDeckCompareReadiness(deckId),
      {
        initialProps: { deckId: asDeckId('deck_movies_tv') },
      },
    );

    await waitFor(() => {
      expect(result.current.payload?.deck.deckId).toBe(
        asDeckId('deck_movies_tv'),
      );
    });

    rerender({ deckId: asDeckId('deck_values') });

    expect(result.current.loading).toBe(true);
    expect(result.current.deck).toBeNull();
    expect(result.current.summary).toBeNull();
    expect(result.current.readiness).toBeNull();
    expect(result.current.consentDraft).toBeNull();
    expect(result.current.payload).toBeNull();
    expect(result.current.payloadPreview).toBeNull();
  });

  it('suppresses a stale payload error when the requested deck changes', async () => {
    mockBuildComparePayload.mockRejectedValueOnce(
      new Error('Deck A payload failed.'),
    );

    const { result, rerender } = renderHook(
      ({ deckId }: { deckId: Deck['id'] }) => useDeckCompareReadiness(deckId),
      {
        initialProps: { deckId: asDeckId('deck_movies_tv') },
      },
    );

    await waitFor(() => {
      expect(result.current.payloadError).toBe('Deck A payload failed.');
    });

    deckHookState = {
      ...deckHookState,
      deck: buildDeck({
        id: asDeckId('deck_values'),
        title: 'Values',
        category: 'values',
      }),
    };
    summaryHookState = {
      ...summaryHookState,
      summary: buildSummary({
        deckId: asDeckId('deck_values'),
      }),
    };

    rerender({ deckId: asDeckId('deck_values') });

    expect(result.current.payloadError).toBeNull();

    await waitFor(() => {
      expect(result.current.payload?.deck.deckId).toBe(asDeckId('deck_values'));
    });
  });

  it('reruns payload generation when refetch is called after a payload failure', async () => {
    mockBuildComparePayload
      .mockRejectedValueOnce(new Error('Transient payload failure.'))
      .mockImplementationOnce(({ deck }: { deck: Deck }) => ({
        schema: 'datedeck.compare_payload.v1',
        generatedAt: 1700000010000,
        profileGeneratedAt: 1700000005000,
        deck: {
          deckId: deck.id,
          title: deck.title,
          category: deck.category,
          tier: deck.tier,
          sensitivity: deck.sensitivity,
          contentVersion: 2,
        },
        readiness: {
          state: 'compare_ready',
          ready: true,
          caution: false,
          reasons: [],
          recommendedAction: 'Go compare.',
        },
        confidence: {
          stage: 'high_confidence',
          value: 0.82,
          label: 'high',
          swipeCount: 31,
          cardCoverage: 0.78,
          tagCoverage: 0.85,
          facetCoverage: 1,
          stabilityScore: 0.74,
          ambiguityRatio: 0.18,
        },
        coverage: {
          cardsSeen: 19,
          totalCards: 24,
          seenTagCount: 9,
          totalTagCount: 10,
          seenFacetCount: 4,
          totalFacetCount: 4,
        },
        affinities: [],
        aversions: [],
        unresolvedAreas: [],
        evidence: {
          mode: 'summary_only',
          includedCardCount: 0,
          omittedRawCardCount: 0,
          cards: [],
        },
        policy: {
          cautionLevel: 'normal',
          maxAffinityThemes: 3,
          maxAversionThemes: 2,
          maxUnresolvedAreas: 2,
          maxEvidenceCards: 0,
          includeEvidenceCards: false,
          evidenceMode: 'summary_only',
          aiMode: 'local_fallback_allowed',
          showdownAllowed: true,
          safetyWarnings: [],
          redactions: [],
        },
      }));

    const { result } = renderHook(() =>
      useDeckCompareReadiness(asDeckId('deck_movies_tv')),
    );

    await waitFor(() => {
      expect(result.current.payloadError).toBe('Transient payload failure.');
    });

    await waitFor(() => {
      expect(result.current.payload).toBeNull();
    });

    await act(async () => {
      await result.current.refetch();
    });

    expect(refetchSummary).toHaveBeenCalled();
    await waitFor(() => {
      expect(mockBuildComparePayload).toHaveBeenCalledTimes(2);
    });
    await waitFor(() => {
      expect(result.current.payload?.deck.deckId).toBe(
        asDeckId('deck_movies_tv'),
      );
    });
    expect(result.current.payloadError).toBeNull();
  });
});
