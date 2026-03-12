import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { SwipeCard } from '@/components/deck';
import { useShowdownSession } from '@/hooks/useShowdownSession';
import {
  ACTIONS,
  ACTION_LABELS,
  asShowdownSessionId,
  type CoreSwipeAction,
  type ShowdownParticipant,
  type ShowdownSummaryItem,
} from '@/types/domain';

function formatSecondsRemaining(valueMs: number): string {
  return `${Math.max(0, Math.ceil(valueMs / 1000))}s`;
}

function ActionChoiceButton({
  action,
  selected,
  onPress,
  disabled,
}: {
  action: CoreSwipeAction;
  selected: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ACTION_LABELS[action]}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionChoice,
        selected ? styles.actionChoiceSelected : null,
        disabled ? styles.disabledButton : null,
        pressed ? styles.buttonPressed : null,
      ]}
    >
      <Text
        style={[
          styles.actionChoiceText,
          selected ? styles.actionChoiceTextSelected : null,
        ]}
      >
        {ACTION_LABELS[action]}
      </Text>
    </Pressable>
  );
}

function SummarySection({
  title,
  items,
}: {
  title: string;
  items: ShowdownSummaryItem[];
}) {
  if (items.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {items.map((item) => (
        <View key={`${item.kind}-${item.cardId}`} style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>{item.title}</Text>
          <Text style={styles.summaryMeta}>
            {item.tagLabels.join(' | ') || item.subtitle}
          </Text>
          <Text style={styles.summaryReason}>{item.reason}</Text>
        </View>
      ))}
    </View>
  );
}

function ParticipantRow({
  participant,
  selectedAction,
  onSelect,
  disabled,
}: {
  participant: ShowdownParticipant;
  selectedAction: CoreSwipeAction | null;
  onSelect: (action: CoreSwipeAction) => void;
  disabled: boolean;
}) {
  return (
    <View style={styles.participantCard}>
      <Text style={styles.participantTitle}>{participant.label}</Text>
      <Text style={styles.participantMeta}>
        {selectedAction
          ? `Locked in: ${ACTION_LABELS[selectedAction]}`
          : 'No answer yet'}
      </Text>
      <View style={styles.actionGrid}>
        {ACTIONS.map((action) => (
          <ActionChoiceButton
            key={`${participant.id}-${action}`}
            action={action}
            selected={selectedAction === action}
            disabled={disabled}
            onPress={() => onSelect(action)}
          />
        ))}
      </View>
    </View>
  );
}

export default function ShowdownSessionScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ sessionId?: string | string[] }>();
  const routeSessionId = Array.isArray(params.sessionId)
    ? params.sessionId[0]
    : params.sessionId;
  const sessionId = routeSessionId ? asShowdownSessionId(routeSessionId) : null;
  const {
    session,
    loading,
    error,
    timeRemainingMs,
    setParticipantAction,
    advanceRound,
    refresh,
  } = useShowdownSession(sessionId);
  const currentRound = session?.rounds[session.currentCardIndex] ?? null;
  const currentCard = session?.selectedCards[session.currentCardIndex] ?? null;
  const responseMap = useMemo(
    () =>
      new Map(
        (currentRound?.responses ?? []).map((response) => [
          response.participantId as string,
          response.action,
        ]),
      ),
    [currentRound?.responses],
  );
  const allAnswered = Boolean(
    session &&
    currentRound &&
    currentRound.responses.length >= session.participants.length,
  );

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: session?.deckTitle ?? 'Showdown' }} />

      {loading ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Loading showdown...</Text>
        </View>
      ) : error ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Showdown unavailable</Text>
          <Text style={styles.stateMessage}>{error}</Text>
          <Pressable
            accessibilityRole="button"
            onPress={refresh}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>Retry</Text>
          </Pressable>
        </View>
      ) : !session ? (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>No showdown session</Text>
        </View>
      ) : session.completedAt || session.summary ? (
        <ScrollView
          testID="showdown-summary-scroll"
          contentContainerStyle={styles.content}
        >
          <Text style={styles.title}>Showdown summary</Text>
          <Text style={styles.subtitle}>{session.summary?.overview}</Text>

          <SummarySection
            title="Strongest alignments"
            items={session.summary?.strongestAlignments ?? []}
          />
          <SummarySection
            title="Major split topics"
            items={session.summary?.majorSplits ?? []}
          />
          <SummarySection
            title="Surprise consensus"
            items={session.summary?.surpriseConsensus ?? []}
          />
          <SummarySection
            title="Conversation sparks"
            items={session.summary?.conversationSparks ?? []}
          />

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to deck"
            onPress={() =>
              router.push(`/deck/${session.deckId as string}` as never)
            }
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>Back to Deck</Text>
          </Pressable>
        </ScrollView>
      ) : currentCard && currentRound ? (
        <ScrollView
          testID="showdown-session-scroll"
          contentContainerStyle={styles.content}
        >
          <View style={styles.headerCard}>
            <Text style={styles.title}>{session.deckTitle}</Text>
            <Text style={styles.subtitle}>
              Card {session.currentCardIndex + 1} of{' '}
              {session.selectedCards.length}
            </Text>
            <View style={styles.badgeRow}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {session.participants.length} players
                </Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {formatSecondsRemaining(timeRemainingMs)} left
                </Text>
              </View>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>
                  {currentRound.responses.length}/{session.participants.length}{' '}
                  answered
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.cardShell}>
            <SwipeCard
              title={currentCard.title}
              subtitle={currentCard.subtitle}
              tags={currentCard.tags}
              tileKey={currentCard.tileKey}
              tileType={session.deckCategory}
            />
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Player responses</Text>
            <Text style={styles.sectionHint}>
              Everyone answers the same card before the round moves on.
              Unanswered players become Skip when the timer runs out.
            </Text>
            {session.participants.map((participant) => (
              <ParticipantRow
                key={participant.id}
                participant={participant}
                selectedAction={
                  (responseMap.get(participant.id as string) as
                    | CoreSwipeAction
                    | undefined) ?? null
                }
                disabled={allAnswered}
                onSelect={(action) =>
                  setParticipantAction(participant.id, action)
                }
              />
            ))}
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Why this card is here</Text>
            <Text style={styles.sectionBody}>
              {currentCard.selectionReason
                .replace(':', ' | ')
                .replace(/_/g, ' ')}
            </Text>
            <Text style={styles.sectionHint}>
              Showdown stays representative and avoids sensitive deck/tag areas.
            </Text>
          </View>

          <Pressable
            testID="showdown-advance-round"
            accessibilityRole="button"
            accessibilityLabel={
              allAnswered
                ? 'Next card'
                : 'Advance with skips for unanswered players'
            }
            onPress={advanceRound}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed ? styles.buttonPressed : null,
            ]}
          >
            <Text style={styles.primaryButtonText}>
              {allAnswered ? 'Next Card' : 'Advance Round'}
            </Text>
          </Pressable>
        </ScrollView>
      ) : (
        <View style={styles.stateContainer}>
          <Text style={styles.stateTitle}>Showdown round missing</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0B0B10',
  },
  content: {
    padding: 16,
    paddingBottom: 32,
  },
  stateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  stateTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
  },
  stateMessage: {
    marginTop: 10,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
  },
  headerCard: {
    borderRadius: 20,
    padding: 18,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  title: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.72)',
    fontSize: 15,
  },
  badgeRow: {
    marginTop: 14,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  cardShell: {
    marginTop: 18,
    alignItems: 'center',
  },
  section: {
    marginTop: 18,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  sectionHint: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.62)',
    fontSize: 13,
    lineHeight: 20,
  },
  sectionBody: {
    marginTop: 10,
    color: '#FFFFFF',
    fontSize: 15,
    lineHeight: 22,
  },
  participantCard: {
    marginTop: 12,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  participantTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  participantMeta: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 13,
  },
  actionGrid: {
    marginTop: 12,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionChoice: {
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },
  actionChoiceSelected: {
    backgroundColor: '#FFFFFF',
  },
  actionChoiceText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  actionChoiceTextSelected: {
    color: '#0B0B10',
  },
  summaryCard: {
    marginTop: 10,
    borderRadius: 16,
    padding: 14,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },
  summaryTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  summaryMeta: {
    marginTop: 6,
    color: 'rgba(255,255,255,0.68)',
    fontSize: 13,
  },
  summaryReason: {
    marginTop: 8,
    color: 'rgba(255,255,255,0.82)',
    fontSize: 14,
    lineHeight: 21,
  },
  primaryButton: {
    marginTop: 24,
    borderRadius: 14,
    paddingHorizontal: 18,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  primaryButtonText: {
    color: '#0B0B10',
    fontSize: 15,
    fontWeight: '700',
  },
  disabledButton: {
    opacity: 0.45,
  },
  buttonPressed: {
    opacity: 0.82,
  },
});
