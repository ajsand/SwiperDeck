import {
  ACTIONS,
  ACTION_LABELS,
  type CoreSwipeAction,
  type SwipeAction,
} from './actions';
import type { DeckCard } from './decks';
import {
  asDeckCardId,
  asDeckId,
  asDeckTagFacetId,
  asDeckTagId,
  asShowdownParticipantId,
  asShowdownSessionId,
  type DeckCardId,
  type DeckId,
  type DeckTagFacetId,
  type DeckTagId,
  type ShowdownParticipantId,
  type ShowdownSessionId,
} from './ids';

export const SHOWDOWN_CARD_COUNT_OPTIONS = [6, 8, 10] as const;
export const SHOWDOWN_RESPONSE_SECONDS_OPTIONS = [20, 30, 45] as const;
export const SHOWDOWN_PARTICIPANT_COUNT_OPTIONS = [2, 3, 4] as const;

export type ShowdownCardCountOption =
  (typeof SHOWDOWN_CARD_COUNT_OPTIONS)[number];
export type ShowdownResponseSecondsOption =
  (typeof SHOWDOWN_RESPONSE_SECONDS_OPTIONS)[number];
export type ShowdownParticipantCountOption =
  (typeof SHOWDOWN_PARTICIPANT_COUNT_OPTIONS)[number];

export const SHOWDOWN_SUMMARY_ITEM_KINDS = [
  'alignment',
  'split_topic',
  'surprise_consensus',
  'conversation_spark',
] as const;
export type ShowdownSummaryItemKind =
  (typeof SHOWDOWN_SUMMARY_ITEM_KINDS)[number];

export interface ShowdownParticipant {
  id: ShowdownParticipantId;
  label: string;
  seat: number;
}

export interface ShowdownSessionConfig {
  cardCount: ShowdownCardCountOption;
  responseSeconds: ShowdownResponseSecondsOption;
  participantCount: ShowdownParticipantCountOption;
}

export interface ShowdownSelectedCard {
  cardId: DeckCardId;
  title: string;
  subtitle: string;
  descriptionShort: string;
  tileKey: string;
  cardKind: DeckCard['kind'];
  tags: string[];
  popularity: number;
  primaryTagId: DeckTagId | null;
  primaryTagLabel: string | null;
  facetId: DeckTagFacetId | null;
  facetLabel: string | null;
  selectionScore: number;
  selectionReason: string;
}

export interface ShowdownResponse {
  participantId: ShowdownParticipantId;
  cardId: DeckCardId;
  action: CoreSwipeAction;
  respondedAt: number;
}

export interface ShowdownRound {
  cardId: DeckCardId;
  startedAt: number;
  deadlineAt: number;
  responses: ShowdownResponse[];
}

export interface ShowdownSummaryItem {
  kind: ShowdownSummaryItemKind;
  cardId: DeckCardId;
  title: string;
  subtitle: string;
  tagLabels: string[];
  reason: string;
  agreementRatio: number;
  splitRatio: number;
  positiveRatio: number;
  negativeRatio: number;
}

export interface ShowdownSummary {
  deckId: DeckId;
  deckTitle: string;
  participantCount: number;
  completedRounds: number;
  totalCards: number;
  overview: string;
  strongestAlignments: ShowdownSummaryItem[];
  majorSplits: ShowdownSummaryItem[];
  surpriseConsensus: ShowdownSummaryItem[];
  conversationSparks: ShowdownSummaryItem[];
}

export interface ShowdownSession {
  id: ShowdownSessionId;
  deckId: DeckId;
  deckTitle: string;
  deckCategory: string;
  participants: ShowdownParticipant[];
  config: ShowdownSessionConfig;
  selectedCards: ShowdownSelectedCard[];
  rounds: ShowdownRound[];
  currentCardIndex: number;
  startedAt: number;
  completedAt: number | null;
  summary: ShowdownSummary | null;
}

export function createDefaultShowdownParticipants(
  participantCount: ShowdownParticipantCountOption,
): ShowdownParticipant[] {
  return Array.from({ length: participantCount }, (_, index) => ({
    id: asShowdownParticipantId(`showdown_participant_${index + 1}`),
    label: `Player ${index + 1}`,
    seat: index + 1,
  }));
}

export function normalizeShowdownCardCount(
  value: unknown,
): ShowdownCardCountOption {
  const parsedValue = Number(value);

  if (
    Number.isInteger(parsedValue) &&
    SHOWDOWN_CARD_COUNT_OPTIONS.includes(parsedValue as ShowdownCardCountOption)
  ) {
    return parsedValue as ShowdownCardCountOption;
  }

  throw new Error(`Invalid showdown card count: ${String(value)}`);
}

export function normalizeShowdownResponseSeconds(
  value: unknown,
): ShowdownResponseSecondsOption {
  const parsedValue = Number(value);

  if (
    Number.isInteger(parsedValue) &&
    SHOWDOWN_RESPONSE_SECONDS_OPTIONS.includes(
      parsedValue as ShowdownResponseSecondsOption,
    )
  ) {
    return parsedValue as ShowdownResponseSecondsOption;
  }

  throw new Error(`Invalid showdown response seconds: ${String(value)}`);
}

export function normalizeShowdownParticipantCount(
  value: unknown,
): ShowdownParticipantCountOption {
  const parsedValue = Number(value);

  if (
    Number.isInteger(parsedValue) &&
    SHOWDOWN_PARTICIPANT_COUNT_OPTIONS.includes(
      parsedValue as ShowdownParticipantCountOption,
    )
  ) {
    return parsedValue as ShowdownParticipantCountOption;
  }

  throw new Error(`Invalid showdown participant count: ${String(value)}`);
}

export function createShowdownSessionId(value: string): ShowdownSessionId {
  return asShowdownSessionId(value);
}

export function createShowdownSelectedCard(args: {
  card: DeckCard;
  primaryTagId: DeckTagId | null;
  primaryTagLabel: string | null;
  facetId: DeckTagFacetId | null;
  facetLabel: string | null;
  selectionScore: number;
  selectionReason: string;
}): ShowdownSelectedCard {
  return {
    cardId: asDeckCardId(args.card.id),
    title: args.card.title,
    subtitle: args.card.subtitle,
    descriptionShort: args.card.descriptionShort,
    tileKey: args.card.tileKey,
    cardKind: args.card.kind,
    tags: args.card.tags,
    popularity: args.card.popularity,
    primaryTagId: args.primaryTagId,
    primaryTagLabel: args.primaryTagLabel,
    facetId: args.facetId,
    facetLabel: args.facetLabel,
    selectionScore: args.selectionScore,
    selectionReason: args.selectionReason,
  };
}

export function createShowdownRound(args: {
  cardId: DeckCardId;
  startedAt: number;
  responseSeconds: ShowdownResponseSecondsOption;
  responses?: ShowdownResponse[];
}): ShowdownRound {
  return {
    cardId: args.cardId,
    startedAt: args.startedAt,
    deadlineAt: args.startedAt + args.responseSeconds * 1000,
    responses: args.responses ?? [],
  };
}

export function createShowdownSession(args: {
  id: ShowdownSessionId;
  deckId: DeckId;
  deckTitle: string;
  deckCategory: string;
  participants: ShowdownParticipant[];
  config: ShowdownSessionConfig;
  selectedCards: ShowdownSelectedCard[];
  startedAt: number;
}): ShowdownSession {
  const firstCard = args.selectedCards[0];

  return {
    id: args.id,
    deckId: args.deckId,
    deckTitle: args.deckTitle,
    deckCategory: args.deckCategory,
    participants: args.participants,
    config: args.config,
    selectedCards: args.selectedCards,
    rounds: firstCard
      ? [
          createShowdownRound({
            cardId: firstCard.cardId,
            startedAt: args.startedAt,
            responseSeconds: args.config.responseSeconds,
          }),
        ]
      : [],
    currentCardIndex: 0,
    startedAt: args.startedAt,
    completedAt: null,
    summary: null,
  };
}

export function createShowdownResponse(args: {
  participantId: ShowdownParticipantId;
  cardId: DeckCardId;
  action: SwipeAction;
  respondedAt: number;
}): ShowdownResponse {
  return {
    participantId: args.participantId,
    cardId: args.cardId,
    action: args.action,
    respondedAt: args.respondedAt,
  };
}

export function createShowdownSummaryItem(args: {
  kind: ShowdownSummaryItemKind;
  cardId: DeckCardId;
  title: string;
  subtitle: string;
  tagLabels: string[];
  reason: string;
  agreementRatio: number;
  splitRatio: number;
  positiveRatio: number;
  negativeRatio: number;
}): ShowdownSummaryItem {
  return {
    kind: args.kind,
    cardId: args.cardId,
    title: args.title,
    subtitle: args.subtitle,
    tagLabels: args.tagLabels,
    reason: args.reason,
    agreementRatio: args.agreementRatio,
    splitRatio: args.splitRatio,
    positiveRatio: args.positiveRatio,
    negativeRatio: args.negativeRatio,
  };
}

export function createShowdownSummary(args: {
  deckId: DeckId;
  deckTitle: string;
  participantCount: number;
  completedRounds: number;
  totalCards: number;
  overview: string;
  strongestAlignments: ShowdownSummaryItem[];
  majorSplits: ShowdownSummaryItem[];
  surpriseConsensus: ShowdownSummaryItem[];
  conversationSparks: ShowdownSummaryItem[];
}): ShowdownSummary {
  return {
    deckId: asDeckId(args.deckId),
    deckTitle: args.deckTitle,
    participantCount: args.participantCount,
    completedRounds: args.completedRounds,
    totalCards: args.totalCards,
    overview: args.overview,
    strongestAlignments: args.strongestAlignments,
    majorSplits: args.majorSplits,
    surpriseConsensus: args.surpriseConsensus,
    conversationSparks: args.conversationSparks,
  };
}

export function formatShowdownActionLabel(action: CoreSwipeAction): string {
  return ACTION_LABELS[action];
}

export function getShowdownDefaultAction(): CoreSwipeAction {
  return ACTIONS[2];
}
