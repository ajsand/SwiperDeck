import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import {
  advanceLocalShowdownSession,
  getLocalShowdownSession,
  submitLocalShowdownResponse,
  syncLocalShowdownTimer,
} from '@/lib/showdown/showdownSessionStore';
import type {
  CoreSwipeAction,
  DeckId,
  ShowdownParticipantId,
  ShowdownSession,
  ShowdownSessionId,
} from '@/types/domain';

export interface UseShowdownSessionResult {
  session: ShowdownSession | null;
  lastKnownDeckId: DeckId | null;
  loading: boolean;
  error: string | null;
  timeRemainingMs: number;
  setParticipantAction: (
    participantId: ShowdownParticipantId,
    action: CoreSwipeAction,
  ) => void;
  advanceRound: () => void;
  refresh: () => void;
}

function calculateTimeRemainingMs(session: ShowdownSession | null): number {
  if (!session || session.completedAt) {
    return 0;
  }

  const currentRound = session.rounds[session.currentCardIndex];

  if (!currentRound) {
    return 0;
  }

  return Math.max(0, currentRound.deadlineAt - Date.now());
}

export function useShowdownSession(
  sessionId: ShowdownSessionId | null,
): UseShowdownSessionResult {
  const requestedSessionKey = sessionId ? (sessionId as string) : null;
  const [session, setSession] = useState<ShowdownSession | null>(null);
  const [lastKnownDeckId, setLastKnownDeckId] = useState<DeckId | null>(null);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [timeRemainingMs, setTimeRemainingMs] = useState(0);
  const lastSessionIdRef = useRef<ShowdownSessionId | null>(null);
  const stateSessionKeyRef = useRef<string | null>(requestedSessionKey);

  const refresh = useCallback(() => {
    setRefreshCount((current) => current + 1);
  }, []);

  useEffect(() => {
    const sessionChanged = lastSessionIdRef.current !== sessionId;
    lastSessionIdRef.current = sessionId;
    stateSessionKeyRef.current = requestedSessionKey;

    if (!sessionId) {
      setSession(null);
      setLastKnownDeckId(null);
      setTimeRemainingMs(0);
      setError('No showdown session was selected.');
      setLoading(false);
      return;
    }

    if (sessionChanged) {
      setSession(null);
      setLastKnownDeckId(null);
      setTimeRemainingMs(0);
      setError(null);
    }

    setLoading(true);
    const nextSession = getLocalShowdownSession(sessionId);

    if (!nextSession) {
      setSession(null);
      if (sessionChanged) {
        setLastKnownDeckId(null);
      }
      setTimeRemainingMs(0);
      setError(
        'This showdown session is no longer available. Start a new local showdown from the deck screen.',
      );
      setLoading(false);
      return;
    }

    setSession(nextSession);
    setLastKnownDeckId(nextSession.deckId);
    setTimeRemainingMs(calculateTimeRemainingMs(nextSession));
    setError(null);
    setLoading(false);
  }, [refreshCount, sessionId]);

  useEffect(() => {
    if (!sessionId || !session || session.completedAt) {
      return;
    }

    const intervalId = setInterval(() => {
      const synced = syncLocalShowdownTimer({ sessionId });

      if (!synced) {
        setError(
          'This showdown session expired. Start a new session from the deck screen.',
        );
        setSession(null);
        setTimeRemainingMs(0);
        return;
      }

      setSession(synced);
      setLastKnownDeckId(synced.deckId);
      setTimeRemainingMs(calculateTimeRemainingMs(synced));
    }, 250);

    return () => {
      clearInterval(intervalId);
    };
  }, [session, sessionId]);

  const setParticipantAction = useCallback(
    (participantId: ShowdownParticipantId, action: CoreSwipeAction) => {
      if (!sessionId) {
        return;
      }

      try {
        const nextSession = submitLocalShowdownResponse({
          sessionId,
          participantId,
          action,
        });
        setSession(nextSession);
        setTimeRemainingMs(calculateTimeRemainingMs(nextSession));
        setError(null);
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : 'Unable to save that showdown response.',
        );
      }
    },
    [sessionId],
  );

  const advanceRound = useCallback(() => {
    if (!sessionId) {
      return;
    }

    try {
      const nextSession = advanceLocalShowdownSession({ sessionId });
      setSession(nextSession);
      setTimeRemainingMs(calculateTimeRemainingMs(nextSession));
      setError(null);
    } catch (advanceError) {
      setError(
        advanceError instanceof Error
          ? advanceError.message
          : 'Unable to advance this showdown round.',
      );
    }
  }, [sessionId]);

  const isCurrentSessionState =
    stateSessionKeyRef.current === requestedSessionKey;

  return useMemo(
    () => ({
      session: isCurrentSessionState ? session : null,
      lastKnownDeckId: isCurrentSessionState ? lastKnownDeckId : null,
      loading: isCurrentSessionState ? loading : requestedSessionKey !== null,
      error: isCurrentSessionState ? error : null,
      timeRemainingMs: isCurrentSessionState ? timeRemainingMs : 0,
      setParticipantAction,
      advanceRound,
      refresh,
    }),
    [
      advanceRound,
      error,
      isCurrentSessionState,
      lastKnownDeckId,
      loading,
      refresh,
      requestedSessionKey,
      session,
      setParticipantAction,
      timeRemainingMs,
    ],
  );
}
