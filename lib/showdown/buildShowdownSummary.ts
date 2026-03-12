import { ACTION_WEIGHTS } from '@/types/domain/actions';
import {
  createShowdownSummary,
  createShowdownSummaryItem,
  type ShowdownResponse,
  type ShowdownSelectedCard,
  type ShowdownSession,
  type ShowdownSummary,
  type ShowdownSummaryItem,
} from '@/types/domain/showdown';

interface RoundStats {
  card: ShowdownSelectedCard;
  responses: ShowdownResponse[];
  positiveCount: number;
  negativeCount: number;
  skipCount: number;
  agreementRatio: number;
  splitRatio: number;
  positiveRatio: number;
  negativeRatio: number;
  averageWeight: number;
}

function calculateRoundStats(
  card: ShowdownSelectedCard,
  responses: ShowdownResponse[],
  participantCount: number,
): RoundStats {
  const weights = responses.map((response) => ACTION_WEIGHTS[response.action]);
  const totalWeight = weights.reduce<number>((sum, value) => sum + value, 0);
  const positiveCount = weights.filter((value) => value > 0).length;
  const negativeCount = weights.filter((value) => value < 0).length;
  const skipCount = participantCount - positiveCount - negativeCount;
  const largestBucket = Math.max(positiveCount, negativeCount, skipCount);
  const agreementRatio =
    participantCount > 0 ? largestBucket / participantCount : 0;
  const splitRatio =
    participantCount > 0
      ? Math.min(positiveCount, negativeCount) / participantCount
      : 0;

  return {
    card,
    responses,
    positiveCount,
    negativeCount,
    skipCount,
    agreementRatio,
    splitRatio,
    positiveRatio: participantCount > 0 ? positiveCount / participantCount : 0,
    negativeRatio: participantCount > 0 ? negativeCount / participantCount : 0,
    averageWeight: participantCount > 0 ? totalWeight / participantCount : 0,
  };
}

function toSummaryItem(
  stats: RoundStats,
  kind: ShowdownSummaryItem['kind'],
  reason: string,
): ShowdownSummaryItem {
  return createShowdownSummaryItem({
    kind,
    cardId: stats.card.cardId,
    title: stats.card.title,
    subtitle: stats.card.subtitle,
    tagLabels: [
      ...new Set(
        [
          stats.card.primaryTagLabel,
          stats.card.facetLabel,
          ...stats.card.tags.slice(0, 2),
        ].filter(Boolean) as string[],
      ),
    ],
    reason,
    agreementRatio: stats.agreementRatio,
    splitRatio: stats.splitRatio,
    positiveRatio: stats.positiveRatio,
    negativeRatio: stats.negativeRatio,
  });
}

function buildOverview(args: {
  session: ShowdownSession;
  alignments: ShowdownSummaryItem[];
  splits: ShowdownSummaryItem[];
}): string {
  const parts = [
    `${args.session.participants.length} players answered ${args.session.rounds.length} cards in ${args.session.deckTitle}.`,
  ];

  if (args.alignments[0]) {
    parts.push(`The clearest shared read was "${args.alignments[0].title}".`);
  }

  if (args.splits[0]) {
    parts.push(`The biggest split landed on "${args.splits[0].title}".`);
  }

  if (!args.alignments[0] && !args.splits[0]) {
    parts.push(
      'The round stayed fairly exploratory, so the best follow-up is to talk through the cards that felt most surprising.',
    );
  }

  return parts.join(' ');
}

export function buildShowdownSummary(
  session: ShowdownSession,
): ShowdownSummary {
  const selectedCardsById = new Map(
    session.selectedCards.map((card) => [card.cardId as string, card] as const),
  );
  const stats = session.rounds
    .map((round) => {
      const card = selectedCardsById.get(round.cardId as string);
      if (!card) {
        return null;
      }

      return calculateRoundStats(
        card,
        round.responses,
        session.participants.length,
      );
    })
    .filter(Boolean) as RoundStats[];

  const strongestAlignments = stats
    .filter(
      (entry) =>
        entry.agreementRatio >= 0.67 && Math.abs(entry.averageWeight) >= 0.5,
    )
    .sort((left, right) => {
      const leftScore = left.agreementRatio + Math.abs(left.averageWeight) / 3;
      const rightScore =
        right.agreementRatio + Math.abs(right.averageWeight) / 3;
      return rightScore - leftScore;
    })
    .slice(0, 3)
    .map((entry) =>
      toSummaryItem(
        entry,
        'alignment',
        entry.averageWeight >= 0
          ? 'Shared enthusiasm showed up quickly across the group.'
          : 'The group lined up clearly on a collective no.',
      ),
    );

  const majorSplits = stats
    .filter((entry) => entry.splitRatio >= 0.25)
    .sort((left, right) => {
      if (left.splitRatio !== right.splitRatio) {
        return right.splitRatio - left.splitRatio;
      }

      return right.agreementRatio - left.agreementRatio;
    })
    .slice(0, 3)
    .map((entry) =>
      toSummaryItem(
        entry,
        'split_topic',
        'This card split the room enough to make it a good conversation pivot.',
      ),
    );

  const surpriseConsensus = stats
    .filter(
      (entry) =>
        entry.agreementRatio >= 0.75 &&
        entry.positiveRatio >= 0.5 &&
        entry.card.popularity <= 0.7,
    )
    .sort((left, right) => {
      if (left.card.popularity !== right.card.popularity) {
        return left.card.popularity - right.card.popularity;
      }

      return right.agreementRatio - left.agreementRatio;
    })
    .slice(0, 2)
    .map((entry) =>
      toSummaryItem(
        entry,
        'surprise_consensus',
        'The group unexpectedly converged here, which makes it a strong icebreaker follow-up.',
      ),
    );

  const conversationSparkPool = [...majorSplits, ...strongestAlignments];
  const conversationSparks = conversationSparkPool.slice(0, 4).map((entry) => ({
    ...entry,
    kind: 'conversation_spark' as const,
    reason:
      entry.kind === 'split_topic'
        ? 'Use this split to compare why people answered differently.'
        : 'Use this consensus to ask what made the card land so similarly.',
  }));

  return createShowdownSummary({
    deckId: session.deckId,
    deckTitle: session.deckTitle,
    participantCount: session.participants.length,
    completedRounds: session.rounds.length,
    totalCards: session.selectedCards.length,
    overview: buildOverview({
      session,
      alignments: strongestAlignments,
      splits: majorSplits,
    }),
    strongestAlignments,
    majorSplits,
    surpriseConsensus,
    conversationSparks,
  });
}
