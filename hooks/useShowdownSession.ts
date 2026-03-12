import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  advanceLocalShowdownSession,
  getLocalShowdownSession,
  submitLocalShowdownResponse,
  syncLocalShowdownTimer,
} from '@/lib/showdown/showdownSessionStore';
import type {
  CoreSwipeAction,
  ShowdownParticipantId,
  ShowdownSession,
  ShowdownSessionId,
} from '@/types/domain';

export interface UseShowdownSessionResult {
  session: ShowdownSession | null;
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
  const [session, setSession] = useState<ShowdownSession | null>(null);
  const [loading, setLoading] = useState(Boolean(sessionId));
  const [error, setError] = useState<string | null>(null);
  const [refreshCount, setRefreshCount] = useState(0);
  const [timeRemainingMs, setTimeRemainingMs] = useState(0);

  const refresh = useCallback(() => {
    setRefreshCount((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!sessionId) {
      setSession(null);
      setError('No showdown session was selected.');
      setLoading(false);
      return;
    }

    setLoading(true);
    const nextSession = getLocalShowdownSession(sessionId);

    if (!nextSession) {
      setSession(null);
      setError(
        'This showdown session is no longer available. Start a new local showdown from the deck screen.',
      );
      setLoading(false);
      return;
    }

    setSession(nextSession);
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

  return useMemo(
    () => ({
      session,
      loading,
      error,
      timeRemainingMs,
      setParticipantAction,
      advanceRound,
      refresh,
    }),
    [
      advanceRound,
      error,
      loading,
      refresh,
      session,
      setParticipantAction,
      timeRemainingMs,
    ],
  );
}
