import React from 'react';
import {
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import CompareConsentScreen from '../app/compare/[deckId]/consent';
import { asDeckId } from '@/types/domain';

const mockPush = jest.fn();
const mockReplace = jest.fn();
const mockUseDeckCompareReadiness = jest.fn();
const mockUseLocalSearchParams = jest.fn();
const mockCreateDeckCompareConsentApproval = jest.fn();
const mockClearDeckCompareConsentApproval = jest.fn();

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => mockUseLocalSearchParams(),
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
}));

jest.mock('@/hooks/useDeckCompareReadiness', () => ({
  useDeckCompareReadiness: (...args: unknown[]) =>
    mockUseDeckCompareReadiness(...args),
}));

jest.mock('@/lib/compare/compareConsentSession', () => ({
  buildDeckCompareConsentApprovalBasis: (
    payload: {
      deck: { deckId: string; contentVersion: number };
      profileGeneratedAt: number;
    } | null,
  ) =>
    payload
      ? `${payload.deck.deckId}|${payload.deck.contentVersion}|${payload.profileGeneratedAt}`
      : null,
  createDeckCompareConsentApproval: (...args: unknown[]) =>
    mockCreateDeckCompareConsentApproval(...args),
  clearDeckCompareConsentApproval: (...args: unknown[]) =>
    mockClearDeckCompareConsentApproval(...args),
}));

describe('CompareConsentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseLocalSearchParams.mockReturnValue({ deckId: 'deck_movies_tv' });
    mockCreateDeckCompareConsentApproval.mockReturnValue('approval-1');
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
        detail:
          'This deck has enough breadth, confidence, and stability for a deck-scoped compare flow.',
        reasons: [],
        recommendedAction:
          'This deck now has enough breadth, confidence, and stability for a deck-scoped compare flow.',
      },
      consentDraft: {
        deckId: asDeckId('deck_movies_tv'),
        readinessState: 'compare_ready',
        disclosure:
          'No data leaves the device until both people intentionally use this deck-scoped compare flow.',
        caution: null,
        exportPreview: [
          {
            category: 'deck_metadata',
            title: 'Deck scope and version context',
            detail: 'Deck identity only.',
          },
          {
            category: 'confidence_summary',
            title: 'Confidence and readiness metadata',
            detail: 'Confidence, coverage, and readiness.',
          },
        ],
        keepsLocal: ['Full swipe history and event timeline'],
        confirmations: [
          {
            id: 'same_deck',
            label: 'I am intentionally comparing this exact deck.',
            detail: 'Deck-scoped only.',
          },
          {
            id: 'explicit_consent',
            label:
              'Both people must explicitly consent before any external compare step.',
            detail: 'No hidden comparison.',
          },
          {
            id: 'export_preview',
            label: 'I reviewed what would leave the device.',
            detail: 'Minimal export only.',
          },
        ],
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
        affinities: [],
        aversions: [],
        unresolvedAreas: [],
        evidence: {
          mode: 'summary_only',
          includedCardCount: 0,
          omittedRawCardCount: 15,
          cards: [],
        },
        policy: {
          cautionLevel: 'standard',
          maxAffinityThemes: 5,
          maxAversionThemes: 5,
          maxUnresolvedAreas: 5,
          maxEvidenceCards: 0,
          includeEvidenceCards: false,
          evidenceMode: 'summary_only',
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
          summaryLine: 'Preview ready',
          affinityCount: 0,
          aversionCount: 0,
          unresolvedCount: 0,
          evidenceCardCount: 0,
          evidenceMode: 'summary_only',
        },
      },
      loading: false,
      error: null,
      payloadLoading: false,
      payloadError: null,
      refetch: jest.fn(),
    });
  });

  it('renders export disclosure and requires all confirmations before approval', () => {
    render(<CompareConsentScreen />);

    expect(screen.getByText('Review deck-scoped compare consent')).toBeTruthy();
    expect(screen.getByText('What would leave this device')).toBeTruthy();

    const approveButton = screen.getByTestId('compare-consent-approve');
    fireEvent.press(approveButton);
    expect(screen.queryByTestId('compare-consent-approved')).toBeNull();

    fireEvent.press(screen.getByTestId('compare-consent-check-same_deck'));
    fireEvent.press(
      screen.getByTestId('compare-consent-check-explicit_consent'),
    );
    fireEvent.press(screen.getByTestId('compare-consent-check-export_preview'));
    fireEvent.press(approveButton);

    expect(screen.getByTestId('compare-consent-approved')).toBeTruthy();
    expect(screen.getByText('Consent captured locally')).toBeTruthy();
    expect(mockCreateDeckCompareConsentApproval).toHaveBeenCalledWith({
      deckId: asDeckId('deck_movies_tv'),
      basis: 'deck_movies_tv|2|1700000001000',
    });
  });

  it('shows a blocked state when compare consent is reached too early', () => {
    mockUseDeckCompareReadiness.mockReturnValue({
      deck: {
        id: asDeckId('deck_movies_tv'),
        title: 'Movies & TV',
      },
      readiness: {
        deckId: asDeckId('deck_movies_tv'),
        state: 'needs_more_stability',
        ready: false,
        caution: false,
        title: 'More stability is needed',
        detail: 'Needs more stability.',
        reasons: [],
        recommendedAction: 'Swipe more.',
      },
      consentDraft: null,
      loading: false,
      error: null,
      refetch: jest.fn(),
    });

    render(<CompareConsentScreen />);

    expect(screen.getByText('Compare consent is not ready yet')).toBeTruthy();
    fireEvent.press(screen.getByTestId('compare-consent-back-to-readiness'));
    expect(mockReplace).toHaveBeenCalledWith('/deck/deck_movies_tv/compare');
  });

  it('recovers to decks when compare consent opens without a deck id', () => {
    mockUseLocalSearchParams.mockReturnValue({});

    render(<CompareConsentScreen />);

    fireEvent.press(screen.getByText('Back to Decks'));

    expect(mockReplace).toHaveBeenCalledWith('/');
  });

  it('clears a captured approval when the local export basis changes for the same deck', async () => {
    const { rerender } = render(<CompareConsentScreen />);

    fireEvent.press(screen.getByTestId('compare-consent-check-same_deck'));
    fireEvent.press(
      screen.getByTestId('compare-consent-check-explicit_consent'),
    );
    fireEvent.press(screen.getByTestId('compare-consent-check-export_preview'));
    fireEvent.press(screen.getByTestId('compare-consent-approve'));

    expect(screen.getByTestId('compare-consent-approved')).toBeTruthy();

    mockUseDeckCompareReadiness.mockReturnValue({
      ...mockUseDeckCompareReadiness.mock.results.at(-1)?.value,
      payload: {
        ...mockUseDeckCompareReadiness.mock.results.at(-1)?.value.payload,
        profileGeneratedAt: 1700000002000,
      },
    });

    rerender(<CompareConsentScreen />);

    await waitFor(() => {
      expect(screen.queryByTestId('compare-consent-approved')).toBeNull();
    });
  });

  it('does not leak approved consent UI when the route switches to a different deck', () => {
    const { rerender } = render(<CompareConsentScreen />);

    fireEvent.press(screen.getByTestId('compare-consent-check-same_deck'));
    fireEvent.press(
      screen.getByTestId('compare-consent-check-explicit_consent'),
    );
    fireEvent.press(screen.getByTestId('compare-consent-check-export_preview'));
    fireEvent.press(screen.getByTestId('compare-consent-approve'));

    expect(screen.getByTestId('compare-consent-approved')).toBeTruthy();

    mockUseLocalSearchParams.mockReturnValue({ deckId: 'deck_food_drink' });
    mockUseDeckCompareReadiness.mockReturnValue({
      ...mockUseDeckCompareReadiness.mock.results.at(-1)?.value,
      deck: {
        ...mockUseDeckCompareReadiness.mock.results.at(-1)?.value.deck,
        id: asDeckId('deck_food_drink'),
        title: 'Food & Drink',
        category: 'food_drink',
      },
      readiness: {
        ...mockUseDeckCompareReadiness.mock.results.at(-1)?.value.readiness,
        deckId: asDeckId('deck_food_drink'),
      },
      consentDraft: {
        ...mockUseDeckCompareReadiness.mock.results.at(-1)?.value.consentDraft,
        deckId: asDeckId('deck_food_drink'),
      },
      payload: {
        ...mockUseDeckCompareReadiness.mock.results.at(-1)?.value.payload,
        deck: {
          ...mockUseDeckCompareReadiness.mock.results.at(-1)?.value.payload
            .deck,
          deckId: asDeckId('deck_food_drink'),
          title: 'Food & Drink',
          category: 'food_drink',
        },
      },
      payloadPreview: {
        ...mockUseDeckCompareReadiness.mock.results.at(-1)?.value
          .payloadPreview,
        deckId: asDeckId('deck_food_drink'),
      },
    });

    rerender(<CompareConsentScreen />);

    expect(screen.queryByTestId('compare-consent-approved')).toBeNull();
    expect(screen.queryByText('Consent captured locally')).toBeNull();
  });
});
