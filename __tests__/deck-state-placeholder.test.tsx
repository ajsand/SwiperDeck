import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react-native';

import { DeckStatePlaceholder } from '@/components/deck';

describe('DeckStatePlaceholder', () => {
  it('renders loading state with required testID and accessibility semantics', () => {
    render(<DeckStatePlaceholder state="loading" />);

    const loadingNode = screen.getByTestId('deck-placeholder-loading');
    expect(loadingNode).toBeTruthy();
    expect(loadingNode.props.accessibilityRole).toBe('progressbar');
    expect(loadingNode.props.accessibilityState).toEqual({ busy: true });
  });

  it('renders empty state and triggers filter callback', () => {
    const onOpenFilters = jest.fn();
    render(
      <DeckStatePlaceholder state="empty" onOpenFilters={onOpenFilters} />,
    );

    expect(screen.getByTestId('deck-placeholder-empty')).toBeTruthy();
    const button = screen.getByTestId('deck-placeholder-open-filters');
    fireEvent.press(button);
    expect(onOpenFilters).toHaveBeenCalledTimes(1);
  });

  it('renders error state and triggers retry callback', () => {
    const onRetry = jest.fn();
    render(
      <DeckStatePlaceholder
        state="error"
        errorMessage="Catalog import failed."
        onRetry={onRetry}
      />,
    );

    expect(screen.getByTestId('deck-placeholder-error')).toBeTruthy();
    expect(screen.getByText('Catalog import failed.')).toBeTruthy();
    const retry = screen.getByTestId('deck-placeholder-retry');
    fireEvent.press(retry);
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it('keeps placeholder state matrix stable', () => {
    const loading = render(<DeckStatePlaceholder state="loading" />);
    const empty = render(<DeckStatePlaceholder state="empty" />);
    const error = render(
      <DeckStatePlaceholder
        state="error"
        errorMessage="Recoverable deck error."
      />,
    );

    const snapshot = {
      loading: {
        hasRoot: !!loading.queryByTestId('deck-placeholder-loading'),
        title: loading.getByText('Loading cards...').props.children,
      },
      empty: {
        hasRoot: !!empty.queryByTestId('deck-placeholder-empty'),
        title: empty.getByText('No cards in this deck').props.children,
      },
      error: {
        hasRoot: !!error.queryByTestId('deck-placeholder-error'),
        title: error.getByText('Unable to load cards').props.children,
        message: error.getByText('Recoverable deck error.').props.children,
      },
    };

    expect(snapshot).toMatchSnapshot();
  });
});
