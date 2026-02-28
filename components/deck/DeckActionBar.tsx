import { memo, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import { CORE_ACTIONS } from '@/types/domain';

import { DeckActionButton } from './DeckActionButton';
import type { DeckActionHandler } from './deckActionPayload';

export interface DeckActionBarProps {
  onAction: DeckActionHandler;
  disabled?: boolean;
}

function DeckActionBarImpl({ onAction, disabled = false }: DeckActionBarProps) {
  const actionOrder = useMemo(() => [...CORE_ACTIONS], []);

  return (
    <View
      testID="deck-action-bar"
      accessibilityRole="toolbar"
      accessibilityLabel="Card actions"
      style={styles.container}
    >
      {actionOrder.map((action) => (
        <DeckActionButton
          key={action}
          action={action}
          disabled={disabled}
          onPress={(selectedAction) =>
            onAction(selectedAction, {
              source: 'button',
            })
          }
        />
      ))}
    </View>
  );
}

export const DeckActionBar = memo(DeckActionBarImpl);

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    alignItems: 'center',
    gap: 8,
  },
});
