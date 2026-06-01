"use client";

import { useCallback, useEffect, useState } from "react";
import type { AppState, GameKey, Player } from "@/types";
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
  subscribeToState
} from "@/lib/storage";

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
    return unsubscribe;
  }, [refresh]);

  return { state, refresh, loading };
}

export function useCurrentPlayer() {
  const [player, setPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const p = await getCurrentPlayer();
    setPlayer(p);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeToState(refresh);
    return unsubscribe;
  }, [refresh]);

  return { player, playerId: getCurrentPlayerId(), refresh, loading };
}

export function useRegisterPlayer() {
  return registerPlayer;
}

export function useQuestions(gameKey: GameKey) {
  const [questions, setQuestions] = useState<any[]>([]);
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
    return unsubscribe;
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
    return unsubscribe;
  }, [refresh]);

  return exists;
}

export function useLobbySnapshot(playerId: string | null | undefined) {
  const [snapshot, setSnapshot] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (playerId) {
      const s = await getLobbySnapshot(playerId);
      setSnapshot(s);
    }
    setLoading(false);
  }, [playerId]);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeToState(refresh);
    return unsubscribe;
  }, [refresh]);

  return { snapshot, refresh, loading };
}

export function useRanking(playerId?: string | null, intervalMs?: number) {
  const [ranking, setRanking] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const r = await getRankingSnapshot(playerId);
    setRanking(r);
    setLoading(false);
  }, [playerId]);

  useEffect(() => {
    refresh();
    const unsubscribe = subscribeToState(refresh);

    if (!intervalMs) return unsubscribe;

    const timer = window.setInterval(refresh, intervalMs);
    return () => {
      unsubscribe();
      window.clearInterval(timer);
    };
  }, [refresh, intervalMs]);

  return { ranking, refresh, loading };
}

export function useAdminActions() {
  return { toggleGameOpen };
}
