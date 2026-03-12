import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import CompareReportScreen from '../app/compare/[deckId]/report';
import { asDeckCardId, asDeckId, asDeckTagId } from '@/types/domain';

const mockPush = jest.fn();
const mockUseDeckCompareReadiness = jest.fn();
const mockGenerateCompareReport = jest.fn();
const mockHasDeckCompareConsentApproval = jest.fn();

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => ({
    deckId: 'deck_movies_tv',
    approval: 'approval-1',
  }),
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/hooks/useDeckCompareReadiness', () => ({
  useDeckCompareReadiness: (...args: unknown[]) =>
    mockUseDeckCompareReadiness(...args),
}));

jest.mock('@/lib/ai/compareReportClient', () => ({
  generateCompareReport: (...args: unknown[]) =>
    mockGenerateCompareReport(...args),
}));

jest.mock('@/lib/compare/compareConsentSession', () => ({
  hasDeckCompareConsentApproval: (...args: unknown[]) =>
    mockHasDeckCompareConsentApproval(...args),
}));

describe('CompareReportScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockHasDeckCompareConsentApproval.mockReturnValue(true);
    mockGenerateCompareReport.mockResolvedValue({
      schema: 'datedeck.compare_report.v1',
      generatedAt: 1700000009000,
      deckId: asDeckId('deck_movies_tv'),
      deckTitle: 'Movies & TV',
      source: {
        kind: 'local_fallback',
        model: null,
        fallbackReason: 'No OpenAI API key is configured.',
      },
      confidence: {
        value: 0.62,
        label: 'medium',
        note: 'This compare has useful structure, but uncertainty still matters.',
      },
      sections: [],
      summary: {
        id: 'summary',
        title: 'A few shared lanes stand out right away',
        summary:
          'Both people overlap most around comfort-watch energy, while a few differences are still worth unpacking.',
        tone: 'supporting',
      },
      alignments: [
        {
          title: 'Comfort watch lands for both people',
          detail: 'Both payloads show positive signal here.',
          tag: 'Comfort watch',
          facet: 'Mood',
          evidence: ['Knives Out (positive anchor)'],
        },
      ],
      contrasts: [
        {
          title: 'Prestige splits the two profiles',
          detail: 'One person leans in while the other leans away.',
          tag: 'Prestige',
          facet: 'Audience',
          evidence: ['Past Lives (contrast anchor)'],
        },
      ],
      unresolvedAreas: [
        {
          title: 'Arthouse still needs more signal',
          detail: 'Treat this as an open question.',
          tag: 'Arthouse',
          facet: 'Audience',
          confidenceNote: 'High uncertainty remains here.',
        },
      ],
      conversationStarters: [
        {
          title: 'Trade comfort-watch examples',
          prompt:
            'What is a recent comfort watch that each of you keeps returning to, and why?',
          rationale: 'Shared lanes are easiest to deepen through examples.',
          relatedTags: ['Comfort watch'],
        },
      ],
      guardrails: ['Stay inside this deck only.'],
    });
    mockUseDeckCompareReadiness.mockReturnValue({
      deck: {
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
      },
      readiness: {
        deckId: asDeckId('deck_movies_tv'),
        state: 'compare_ready',
        ready: true,
        caution: false,
        title: 'Compare ready',
        detail: 'This deck has enough breadth to compare.',
        reasons: [],
        recommendedAction: 'Ready.',
      },
      payload: {
        schema: 'datedeck.compare_payload.v1',
        generatedAt: 1700000000000,
        profileGeneratedAt: 1700000001000,
        deck: {
          deckId: asDeckId('deck_movies_tv'),
          title: 'Movies & TV',
          category: 'movies_tv',
          tier: 'tier_1',
          sensitivity: 'standard',
          contentVersion: 2,
        },
        readiness: {
          state: 'compare_ready',
          ready: true,
          caution: false,
          reasons: [],
          recommendedAction: 'Ready.',
        },
        confidence: {
          stage: 'meaningful',
          value: 0.67,
          label: 'medium',
          swipeCount: 27,
          cardCoverage: 0.62,
          tagCoverage: 0.8,
          facetCoverage: 1,
          stabilityScore: 0.68,
          ambiguityRatio: 0.14,
        },
        coverage: {
          cardsSeen: 15,
          totalCards: 24,
          seenTagCount: 8,
          totalTagCount: 10,
          seenFacetCount: 4,
          totalFacetCount: 4,
        },
        affinities: [
          {
            tagId: asDeckTagId('movies_tv:comfort_watch'),
            tag: 'Comfort watch',
            facet: 'Mood',
            score: 3.1,
            exposureCount: 4,
            stability: 'steady',
          },
        ],
        aversions: [],
        unresolvedAreas: [],
        evidence: {
          mode: 'summary_with_minimal_evidence',
          includedCardCount: 1,
          omittedRawCardCount: 14,
          cards: [
            {
              cardId: asDeckCardId('movies_tv_001'),
              kind: 'entity',
              title: 'Knives Out',
              subtitle: '',
              leaning: 'affinity',
              reason: 'Grounding example.',
              supportingTagIds: [asDeckTagId('movies_tv:comfort_watch')],
              supportingTags: ['Comfort watch'],
            },
          ],
        },
        policy: {
          cautionLevel: 'standard',
          maxAffinityThemes: 5,
          maxAversionThemes: 5,
          maxUnresolvedAreas: 5,
          maxEvidenceCards: 2,
          includeEvidenceCards: true,
          evidenceMode: 'summary_with_minimal_evidence',
          aiMode: 'allow',
          showdownAllowed: true,
          safetyWarnings: [],
          redactions: ['full_swipe_history'],
        },
      },
      payloadPreview: {
        deckId: asDeckId('deck_movies_tv'),
        generatedAt: 1700000000000,
        categories: [],
        debugSummary: {
          summaryLine:
            '1 affinities, 0 aversions, 0 unresolved areas, 1 evidence cards.',
          affinityCount: 1,
          aversionCount: 0,
          unresolvedCount: 0,
          evidenceCardCount: 1,
          evidenceMode: 'summary_with_minimal_evidence',
        },
      },
      consentDraft: null,
      payloadLoading: false,
      payloadError: null,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });
  });

  it('renders the compare report after a valid partner payload is pasted', async () => {
    render(<CompareReportScreen />);

    fireEvent.changeText(
      screen.getByTestId('compare-report-partner-payload-input'),
      JSON.stringify({
        schema: 'datedeck.compare_payload.v1',
        generatedAt: 1700000000000,
        profileGeneratedAt: 1700000001000,
        deck: {
          deckId: 'deck_movies_tv',
          title: 'Movies & TV',
          category: 'movies_tv',
          tier: 'tier_1',
          sensitivity: 'standard',
          contentVersion: 2,
        },
        readiness: {
          state: 'compare_ready',
          ready: true,
          caution: false,
          reasons: [],
          recommendedAction: 'Ready.',
        },
        confidence: {
          stage: 'meaningful',
          value: 0.63,
          label: 'medium',
          swipeCount: 25,
          cardCoverage: 0.58,
          tagCoverage: 0.8,
          facetCoverage: 1,
          stabilityScore: 0.61,
          ambiguityRatio: 0.17,
        },
        coverage: {
          cardsSeen: 14,
          totalCards: 24,
          seenTagCount: 8,
          totalTagCount: 10,
          seenFacetCount: 4,
          totalFacetCount: 4,
        },
        affinities: [
          {
            tagId: 'movies_tv:comfort_watch',
            tag: 'Comfort watch',
            facet: 'Mood',
            score: 2.8,
            exposureCount: 3,
            stability: 'steady',
          },
        ],
        aversions: [],
        unresolvedAreas: [],
        evidence: {
          mode: 'summary_with_minimal_evidence',
          includedCardCount: 0,
          omittedRawCardCount: 14,
          cards: [],
        },
        policy: {
          maxAffinityThemes: 5,
          maxAversionThemes: 5,
          maxUnresolvedAreas: 5,
          maxEvidenceCards: 2,
          includeEvidenceCards: true,
          evidenceMode: 'summary_with_minimal_evidence',
          redactions: ['full_swipe_history'],
        },
      }),
    );

    fireEvent.press(screen.getByTestId('compare-report-generate'));

    await waitFor(() => {
      expect(mockGenerateCompareReport).toHaveBeenCalled();
      expect(screen.getByTestId('compare-report-output')).toBeTruthy();
    });

    expect(
      screen.getByText('A few shared lanes stand out right away'),
    ).toBeTruthy();
    expect(screen.getByText('Strongest alignments')).toBeTruthy();
    expect(screen.getByText('Conversation starters')).toBeTruthy();
  });

  it('clears a stale report when the pasted partner payload changes', async () => {
    render(<CompareReportScreen />);

    const input = screen.getByTestId('compare-report-partner-payload-input');

    fireEvent.changeText(
      input,
      JSON.stringify({
        schema: 'datedeck.compare_payload.v1',
        generatedAt: 1700000000000,
        profileGeneratedAt: 1700000001000,
        deck: {
          deckId: 'deck_movies_tv',
          title: 'Movies & TV',
          category: 'movies_tv',
          tier: 'tier_1',
          sensitivity: 'standard',
          contentVersion: 2,
        },
        readiness: {
          state: 'compare_ready',
          ready: true,
          caution: false,
          reasons: [],
          recommendedAction: 'Ready.',
        },
        confidence: {
          stage: 'meaningful',
          value: 0.63,
          label: 'medium',
          swipeCount: 25,
          cardCoverage: 0.58,
          tagCoverage: 0.8,
          facetCoverage: 1,
          stabilityScore: 0.61,
          ambiguityRatio: 0.17,
        },
        coverage: {
          cardsSeen: 14,
          totalCards: 24,
          seenTagCount: 8,
          totalTagCount: 10,
          seenFacetCount: 4,
          totalFacetCount: 4,
        },
        affinities: [
          {
            tagId: 'movies_tv:comfort_watch',
            tag: 'Comfort watch',
            facet: 'Mood',
            score: 2.8,
            exposureCount: 3,
            stability: 'steady',
          },
        ],
        aversions: [],
        unresolvedAreas: [],
        evidence: {
          mode: 'summary_with_minimal_evidence',
          includedCardCount: 0,
          omittedRawCardCount: 14,
          cards: [],
        },
        policy: {
          maxAffinityThemes: 5,
          maxAversionThemes: 5,
          maxUnresolvedAreas: 5,
          maxEvidenceCards: 2,
          includeEvidenceCards: true,
          evidenceMode: 'summary_with_minimal_evidence',
          redactions: ['full_swipe_history'],
        },
      }),
    );

    fireEvent.press(screen.getByTestId('compare-report-generate'));

    await waitFor(() => {
      expect(screen.getByTestId('compare-report-output')).toBeTruthy();
    });

    fireEvent.changeText(input, '{');

    expect(screen.queryByTestId('compare-report-output')).toBeNull();
    expect(
      screen.getByText('Paste a valid compare payload JSON export.'),
    ).toBeTruthy();
  });

  it('blocks access when consent approval is missing', () => {
    mockHasDeckCompareConsentApproval.mockReturnValue(false);

    render(<CompareReportScreen />);

    expect(screen.getByText('Consent approval is required')).toBeTruthy();
    fireEvent.press(screen.getByTestId('compare-report-back-to-consent'));
    expect(mockPush).toHaveBeenCalledWith('/compare/deck_movies_tv/consent');
  });

  it('blocks partner payloads from a different deck', async () => {
    render(<CompareReportScreen />);

    fireEvent.changeText(
      screen.getByTestId('compare-report-partner-payload-input'),
      JSON.stringify({
        schema: 'datedeck.compare_payload.v1',
        generatedAt: 1700000000000,
        profileGeneratedAt: 1700000001000,
        deck: {
          deckId: 'deck_food_drinks',
          title: 'Food & Drinks',
          category: 'food_drinks',
          tier: 'tier_1',
          sensitivity: 'standard',
          contentVersion: 2,
        },
        readiness: {
          state: 'compare_ready',
          ready: true,
          caution: false,
          reasons: [],
          recommendedAction: 'Ready.',
        },
        confidence: {
          stage: 'meaningful',
          value: 0.63,
          label: 'medium',
          swipeCount: 25,
          cardCoverage: 0.58,
          tagCoverage: 0.8,
          facetCoverage: 1,
          stabilityScore: 0.61,
          ambiguityRatio: 0.17,
        },
        coverage: {
          cardsSeen: 14,
          totalCards: 24,
          seenTagCount: 8,
          totalTagCount: 10,
          seenFacetCount: 4,
          totalFacetCount: 4,
        },
        affinities: [],
        aversions: [],
        unresolvedAreas: [],
        evidence: {
          mode: 'summary_with_minimal_evidence',
          includedCardCount: 0,
          omittedRawCardCount: 14,
          cards: [],
        },
        policy: {
          maxAffinityThemes: 5,
          maxAversionThemes: 5,
          maxUnresolvedAreas: 5,
          maxEvidenceCards: 2,
          includeEvidenceCards: true,
          evidenceMode: 'summary_with_minimal_evidence',
          redactions: ['full_swipe_history'],
        },
      }),
    );

    expect(
      screen.getByText(
        'The pasted payload is for a different deck. Compare must stay scoped to the same deck on both devices.',
      ),
    ).toBeTruthy();

    fireEvent.press(screen.getByTestId('compare-report-generate'));

    await waitFor(() => {
      expect(mockGenerateCompareReport).not.toHaveBeenCalled();
      expect(
        screen.getAllByText(
          'The pasted payload is for a different deck. Compare must stay scoped to the same deck on both devices.',
        ).length,
      ).toBeGreaterThan(0);
    });
  });

  it('blocks partner payloads that are not compare-ready', async () => {
    render(<CompareReportScreen />);

    fireEvent.changeText(
      screen.getByTestId('compare-report-partner-payload-input'),
      JSON.stringify({
        schema: 'datedeck.compare_payload.v1',
        generatedAt: 1700000000000,
        profileGeneratedAt: 1700000001000,
        deck: {
          deckId: 'deck_movies_tv',
          title: 'Movies & TV',
          category: 'movies_tv',
          tier: 'tier_1',
          sensitivity: 'standard',
          contentVersion: 2,
        },
        readiness: {
          state: 'needs_more_breadth',
          ready: false,
          caution: false,
          reasons: ['not_enough_tag_coverage'],
          recommendedAction: 'Swipe more cards first.',
        },
        confidence: {
          stage: 'lightweight',
          value: 0.31,
          label: 'low',
          swipeCount: 10,
          cardCoverage: 0.33,
          tagCoverage: 0.4,
          facetCoverage: 0.5,
          stabilityScore: 0.22,
          ambiguityRatio: 0.34,
        },
        coverage: {
          cardsSeen: 8,
          totalCards: 24,
          seenTagCount: 4,
          totalTagCount: 10,
          seenFacetCount: 2,
          totalFacetCount: 4,
        },
        affinities: [],
        aversions: [],
        unresolvedAreas: [],
        evidence: {
          mode: 'summary_only',
          includedCardCount: 0,
          omittedRawCardCount: 8,
          cards: [],
        },
        policy: {
          maxAffinityThemes: 5,
          maxAversionThemes: 5,
          maxUnresolvedAreas: 5,
          maxEvidenceCards: 2,
          includeEvidenceCards: false,
          evidenceMode: 'summary_only',
          redactions: ['full_swipe_history'],
        },
      }),
    );

    expect(
      screen.getByText(
        'The pasted payload is not compare-ready yet. Both people need a compare-ready deck profile before generating a report.',
      ),
    ).toBeTruthy();

    fireEvent.press(screen.getByTestId('compare-report-generate'));

    await waitFor(() => {
      expect(mockGenerateCompareReport).not.toHaveBeenCalled();
      expect(
        screen.getAllByText(
          'The pasted payload is not compare-ready yet. Both people need a compare-ready deck profile before generating a report.',
        ).length,
      ).toBeGreaterThan(0);
    });
  });
});
