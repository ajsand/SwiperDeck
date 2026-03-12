import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import CompareConsentScreen from '../app/compare/[deckId]/consent';
import { asDeckId } from '@/types/domain';

const mockPush = jest.fn();
const mockUseDeckCompareReadiness = jest.fn();

jest.mock('expo-router', () => ({
  Stack: {
    Screen: () => null,
  },
  useLocalSearchParams: () => ({ deckId: 'deck_movies_tv' }),
  useRouter: () => ({
    push: mockPush,
  }),
}));

jest.mock('@/hooks/useDeckCompareReadiness', () => ({
  useDeckCompareReadiness: (...args: unknown[]) =>
    mockUseDeckCompareReadiness(...args),
}));

describe('CompareConsentScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
      loading: false,
      error: null,
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
    expect(mockPush).toHaveBeenCalledWith('/deck/deck_movies_tv/compare');
  });
});
