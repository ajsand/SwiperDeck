import React from 'react';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react-native';

import CreateCustomDeckScreen from '../app/deck/custom/new';
import ImportCustomDeckScreen from '../app/deck/custom/import';
import { asDeckId } from '@/types/domain';

const mockReplace = jest.fn();
const mockGetDb = jest.fn();
const mockCreateCustomDeck = jest.fn();
const mockImportCustomDeck = jest.fn();

jest.mock('expo-router', () => {
  const ReactModule = jest.requireActual('react');

  return {
    Stack: {
      Screen: () => null,
    },
    useRouter: () => ({
      replace: mockReplace,
    }),
    useFocusEffect: (effect: () => void | (() => void)) => {
      ReactModule.useEffect(() => effect(), [effect]);
    },
  };
});

jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, bottom: 0, left: 0, right: 0 }),
}));

jest.mock('@/lib/db', () => ({
  getDb: (...args: unknown[]) => mockGetDb(...args),
}));

jest.mock('@/lib/customDecks/createCustomDeck', () => ({
  createCustomDeck: (...args: unknown[]) => mockCreateCustomDeck(...args),
}));

jest.mock('@/lib/customDecks/importCustomDeck', () => ({
  importCustomDeck: (...args: unknown[]) => mockImportCustomDeck(...args),
}));

describe('custom deck create/import screens', () => {
  const fakeDb = { label: 'db' };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetDb.mockResolvedValue(fakeDb);
  });

  it('ignores an in-flight create result after the create screen unmounts', async () => {
    const deferredCreate: {
      resolve:
        | ((value: { deck: { id: ReturnType<typeof asDeckId> } }) => void)
        | null;
    } = {
      resolve: null,
    };

    mockCreateCustomDeck.mockImplementation(
      () =>
        new Promise<{ deck: { id: ReturnType<typeof asDeckId> } }>(
          (resolve) => {
            deferredCreate.resolve = resolve;
          },
        ),
    );

    const { unmount } = render(<CreateCustomDeckScreen />);

    fireEvent.changeText(
      screen.getByPlaceholderText('Weekend check-in'),
      'Late night snacks',
    );
    fireEvent.changeText(
      screen.getByPlaceholderText(
        'A few low-pressure prompts for a first date.',
      ),
      'A quick custom deck.',
    );
    fireEvent.changeText(screen.getByPlaceholderText('custom'), 'snacks');
    fireEvent.changeText(
      screen.getByPlaceholderText(
        'I always notice the soundtrack first.\nI would rather plan loosely than over-schedule.\nI care more about kindness than polish.',
      ),
      'First line\nSecond line\nThird line',
    );
    fireEvent.press(screen.getByTestId('create-custom-deck-submit'));

    await waitFor(() => {
      expect(mockCreateCustomDeck).toHaveBeenCalledTimes(1);
    });

    unmount();

    await act(async () => {
      deferredCreate.resolve?.({
        deck: { id: asDeckId('deck_custom_late_night') },
      });
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });

  it('ignores an in-flight import result after the import screen unmounts', async () => {
    const deferredImport: {
      resolve:
        | ((value: { deck: { id: ReturnType<typeof asDeckId> } }) => void)
        | null;
    } = {
      resolve: null,
    };

    mockImportCustomDeck.mockImplementation(
      () =>
        new Promise<{ deck: { id: ReturnType<typeof asDeckId> } }>(
          (resolve) => {
            deferredImport.resolve = resolve;
          },
        ),
    );

    const { unmount } = render(<ImportCustomDeckScreen />);

    fireEvent.changeText(
      screen.getByTestId('import-custom-deck-input'),
      JSON.stringify({
        title: 'Night drive',
        description: 'A few custom prompts.',
        cards: ['One', 'Two', 'Three'],
      }),
    );
    fireEvent.press(screen.getByTestId('import-custom-deck-submit'));

    await waitFor(() => {
      expect(mockImportCustomDeck).toHaveBeenCalledTimes(1);
    });

    unmount();

    await act(async () => {
      deferredImport.resolve?.({
        deck: { id: asDeckId('deck_custom_night_drive') },
      });
    });

    expect(mockReplace).not.toHaveBeenCalled();
  });
});
