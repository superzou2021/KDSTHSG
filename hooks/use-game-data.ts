"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppState, GameKey, Player, Question } from "@/types";
import {
  getCurrentPlayer,
  getCurrentPlayerId,
  getGameResult,
  getInitialState,
  getLobbySnapshot,
  getQuestions,
  getRankingSnapshot,
  isGameOpen,
  loadState,
  registerPlayer,
  submitGameResult,
  toggleGameOpen,
  triggerBingoScore,
  closeBingoGame,
  advanceQuizGroup,
  openQuizGroup,
  closeQuizGroup,
  subscribeToState
} from "@/lib/storage";

const STATE_REFRESH_INTERVAL_MS = 500;

export function useAppState() {
  const [state, setState] = useState<AppState>(getInitialState());
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const newState = await loadState();
    setState(newState);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeToState(refresh);

    const timer = window.setInterval(refresh, STATE_REFRESH_INTERVAL_MS);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [refresh]);

  return { state, refresh, loading };
}

export function useCurrentPlayer() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [playerId, setPlayerId] = useState<string | null | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const id = await getCurrentPlayerId();
      setPlayerId(id);
      if (!id) {
        setPlayer(null);
        return;
      }
      const p = await getCurrentPlayer();
      setPlayer(p);
    } catch {
      setPlayer(null);
      setPlayerId(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeToState(refresh);

    const timer = window.setInterval(refresh, STATE_REFRESH_INTERVAL_MS);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [refresh]);

  return { player, playerId, refresh, loading };
}

export function useRegisterPlayer() {
  return registerPlayer;
}

export function useQuestions(gameKey: GameKey) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const q = await getQuestions(gameKey);
    setQuestions(q);
    setLoading(false);
  }, [gameKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return questions;
}

export function useGameStatus(gameKey: GameKey) {
  const [open, setOpen] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const isOpenVal = await isGameOpen(gameKey);
    setOpen(isOpenVal);
    setLoading(false);
  }, [gameKey]);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeToState(refresh);

    const timer = window.setInterval(refresh, STATE_REFRESH_INTERVAL_MS);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [refresh]);

  return open;
}

export function useSubmitGameResult() {
  return submitGameResult;
}

export function useExistingResult(playerId: string | null | undefined, gameKey: GameKey) {
  const [exists, setExists] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (playerId) {
      const result = await getGameResult(playerId, gameKey);
      setExists(Boolean(result));
    }
    setLoading(false);
  }, [playerId, gameKey]);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeToState(refresh);

    const timer = window.setInterval(refresh, STATE_REFRESH_INTERVAL_MS);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [refresh]);

  return exists;
}

export function useLobbySnapshot(playerId: string | null | undefined) {
  const [snapshot, setSnapshot] = useState<Awaited<ReturnType<typeof getLobbySnapshot>> | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      if (playerId) {
        const s = await getLobbySnapshot(playerId);
        setSnapshot(s);
      } else {
        setSnapshot(null);
      }
    } catch {
      setSnapshot(null);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeToState(refresh);
    const timer = window.setInterval(refresh, STATE_REFRESH_INTERVAL_MS);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [refresh]);

  return { snapshot, refresh, loading };
}

export function useRanking(playerId?: string | null, intervalMs?: number) {
  const [ranking, setRanking] = useState<Awaited<ReturnType<typeof getRankingSnapshot>>>(() => {
    const state = getInitialState();
    return {
      players: state.players,
      games: state.games,
      results: state.gameResults,
      top10: [],
      officeAverage: [],
      officeTop3: [],
      context: null
    };
  });
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const r = await getRankingSnapshot(playerId);
      setRanking(r);
    } finally {
      setLoading(false);
    }
  }, [playerId]);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeToState(refresh);

    const timer = window.setInterval(refresh, intervalMs || STATE_REFRESH_INTERVAL_MS);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [refresh, intervalMs]);

  return { ranking, refresh, loading };
}

export function useAdminActions() {
  return { toggleGameOpen, triggerBingoScore, closeBingoGame, advanceQuizGroup, openQuizGroup, closeQuizGroup };
}
