import { buildShowdownSummary } from '@/lib/showdown/buildShowdownSummary';
import {
  createShowdownResponse,
  createShowdownRound,
  createShowdownSession,
  type ShowdownParticipant,
  type ShowdownSession,
  type ShowdownSessionConfig,
  type ShowdownSelectedCard,
} from '@/types/domain/showdown';
import {
  asShowdownSessionId,
  type DeckCardId,
  type DeckId,
  type ShowdownParticipantId,
  type ShowdownSessionId,
} from '@/types/domain';
import type { CoreSwipeAction } from '@/types/domain/actions';

const showdownSessions = new Map<ShowdownSessionId, ShowdownSession>();
let sessionCounter = 0;

function cloneSession(session: ShowdownSession): ShowdownSession {
  return {
    ...session,
    participants: session.participants.map((participant) => ({
      ...participant,
    })),
    config: {
      ...session.config,
    },
    selectedCards: session.selectedCards.map((card) => ({
      ...card,
      tags: [...card.tags],
    })),
    rounds: session.rounds.map((round) => ({
      ...round,
      responses: round.responses.map((response) => ({ ...response })),
    })),
    summary: session.summary
      ? {
          ...session.summary,
          strongestAlignments: session.summary.strongestAlignments.map(
            (item) => ({
              ...item,
              tagLabels: [...item.tagLabels],
            }),
          ),
          majorSplits: session.summary.majorSplits.map((item) => ({
            ...item,
            tagLabels: [...item.tagLabels],
          })),
          surpriseConsensus: session.summary.surpriseConsensus.map((item) => ({
            ...item,
            tagLabels: [...item.tagLabels],
          })),
          conversationSparks: session.summary.conversationSparks.map(
            (item) => ({
              ...item,
              tagLabels: [...item.tagLabels],
            }),
          ),
        }
      : null,
  };
}

function nextSessionId(): ShowdownSessionId {
  sessionCounter += 1;
  return asShowdownSessionId(`showdown_${Date.now()}_${sessionCounter}`);
}

function fillMissingResponsesWithSkip(
  session: ShowdownSession,
  cardId: DeckCardId,
  now: number,
): ShowdownSession {
  const round = session.rounds[session.currentCardIndex];

  if (!round) {
    return session;
  }

  const answeredParticipantIds = new Set(
    round.responses.map((response) => response.participantId as string),
  );
  const missingResponses = session.participants
    .filter(
      (participant) => !answeredParticipantIds.has(participant.id as string),
    )
    .map((participant, index) =>
      createShowdownResponse({
        participantId: participant.id,
        cardId,
        action: 'skip',
        respondedAt: now + index,
      }),
    );

  if (missingResponses.length === 0) {
    return session;
  }

  const nextRounds = [...session.rounds];
  nextRounds[session.currentCardIndex] = {
    ...round,
    responses: [...round.responses, ...missingResponses],
  };

  return {
    ...session,
    rounds: nextRounds,
  };
}

function startNextRound(
  session: ShowdownSession,
  now: number,
): ShowdownSession {
  const nextCardIndex = session.currentCardIndex + 1;
  const nextCard = session.selectedCards[nextCardIndex];

  if (!nextCard) {
    const summary = buildShowdownSummary(session);
    return {
      ...session,
      completedAt: now,
      summary,
    };
  }

  return {
    ...session,
    currentCardIndex: nextCardIndex,
    rounds: [
      ...session.rounds,
      createShowdownRound({
        cardId: nextCard.cardId,
        startedAt: now,
        responseSeconds: session.config.responseSeconds,
      }),
    ],
  };
}

export function createLocalShowdownSession(args: {
  deckId: DeckId;
  deckTitle: string;
  deckCategory: string;
  config: ShowdownSessionConfig;
  participants: ShowdownParticipant[];
  selectedCards: ShowdownSelectedCard[];
  now?: number;
}): ShowdownSession {
  const startedAt = args.now ?? Date.now();
  const session = createShowdownSession({
    id: nextSessionId(),
    deckId: args.deckId,
    deckTitle: args.deckTitle,
    deckCategory: args.deckCategory,
    participants: args.participants,
    config: args.config,
    selectedCards: args.selectedCards,
    startedAt,
  });

  showdownSessions.set(session.id, session);
  return cloneSession(session);
}

export function getLocalShowdownSession(
  sessionId: ShowdownSessionId,
): ShowdownSession | null {
  const session = showdownSessions.get(sessionId);
  return session ? cloneSession(session) : null;
}

export function submitLocalShowdownResponse(args: {
  sessionId: ShowdownSessionId;
  participantId: ShowdownParticipantId;
  action: CoreSwipeAction;
  now?: number;
}): ShowdownSession {
  const session = showdownSessions.get(args.sessionId);

  if (!session) {
    throw new Error('Showdown session not found.');
  }

  if (session.completedAt) {
    return cloneSession(session);
  }

  const card = session.selectedCards[session.currentCardIndex];
  const round = session.rounds[session.currentCardIndex];

  if (!card || !round) {
    throw new Error('Showdown round not found.');
  }

  const respondedAt = args.now ?? Date.now();
  const nextResponse = createShowdownResponse({
    participantId: args.participantId,
    cardId: card.cardId,
    action: args.action,
    respondedAt,
  });
  const filteredResponses = round.responses.filter(
    (response) => response.participantId !== args.participantId,
  );
  const nextRounds = [...session.rounds];
  nextRounds[session.currentCardIndex] = {
    ...round,
    responses: [...filteredResponses, nextResponse].sort(
      (left, right) => left.respondedAt - right.respondedAt,
    ),
  };
  const nextSession = {
    ...session,
    rounds: nextRounds,
  };

  showdownSessions.set(args.sessionId, nextSession);
  return cloneSession(nextSession);
}

export function advanceLocalShowdownSession(args: {
  sessionId: ShowdownSessionId;
  now?: number;
}): ShowdownSession {
  const session = showdownSessions.get(args.sessionId);

  if (!session) {
    throw new Error('Showdown session not found.');
  }

  if (session.completedAt) {
    return cloneSession(session);
  }

  const card = session.selectedCards[session.currentCardIndex];
  const now = args.now ?? Date.now();
  const withSkips = card
    ? fillMissingResponsesWithSkip(session, card.cardId, now)
    : session;
  const nextSession = startNextRound(withSkips, now);

  showdownSessions.set(args.sessionId, nextSession);
  return cloneSession(nextSession);
}

export function syncLocalShowdownTimer(args: {
  sessionId: ShowdownSessionId;
  now?: number;
}): ShowdownSession | null {
  const session = showdownSessions.get(args.sessionId);

  if (!session || session.completedAt) {
    return session ? cloneSession(session) : null;
  }

  const round = session.rounds[session.currentCardIndex];
  const now = args.now ?? Date.now();

  if (!round || round.deadlineAt > now) {
    return cloneSession(session);
  }

  return advanceLocalShowdownSession({
    sessionId: args.sessionId,
    now,
  });
}

export function resetLocalShowdownSessions(): void {
  showdownSessions.clear();
  sessionCounter = 0;
}
