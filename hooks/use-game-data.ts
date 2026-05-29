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
  toggleGameOpen
} from "@/lib/storage";

export function useAppState() {
  const [state, setState] = useState<AppState>(getInitialState());
  const refresh = useCallback(() => setState(loadState()), []);

  useEffect(() => {
    refresh();
    window.addEventListener("annual-game-state-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("annual-game-state-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return { state, refresh };
}

export function useCurrentPlayer() {
  const [player, setPlayer] = useState<Player | null>(null);
  const refresh = useCallback(() => setPlayer(getCurrentPlayer()), []);

  useEffect(() => {
    refresh();
    window.addEventListener("annual-game-state-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("annual-game-state-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return { player, playerId: getCurrentPlayerId(), refresh };
}

export function useRegisterPlayer() {
  return registerPlayer;
}

export function useQuestions(gameKey: GameKey) {
  const [questions, setQuestions] = useState(() => getQuestions(gameKey));

  useEffect(() => {
    setQuestions(getQuestions(gameKey));
  }, [gameKey]);

  return questions;
}

export function useGameStatus(gameKey: GameKey, autoRefresh = true) {
  const [open, setOpen] = useState<boolean | null>(null);
  const refresh = useCallback(() => setOpen(isGameOpen(gameKey)), [gameKey]);

  useEffect(() => {
    refresh();
    window.addEventListener("annual-game-state-change", refresh);
    window.addEventListener("storage", refresh);
    
    let timer: number | undefined;
    if (autoRefresh) {
      timer = window.setInterval(refresh, 2000);
    }
    
    return () => {
      window.removeEventListener("annual-game-state-change", refresh);
      window.removeEventListener("storage", refresh);
      if (timer) {
        window.clearInterval(timer);
      }
    };
  }, [refresh, autoRefresh]);

  return open;
}

export function useSubmitGameResult() {
  return submitGameResult;
}

export function useExistingResult(playerId: string | null | undefined, gameKey: GameKey) {
  const [exists, setExists] = useState(false);
  useEffect(() => {
    setExists(Boolean(playerId && getGameResult(playerId, gameKey)));
  }, [playerId, gameKey]);
  return exists;
}

export function useLobbySnapshot(playerId: string | null | undefined) {
  const [snapshot, setSnapshot] = useState(() => (playerId ? getLobbySnapshot(playerId) : null));
  const refresh = useCallback(() => {
    setSnapshot(playerId ? getLobbySnapshot(playerId) : null);
  }, [playerId]);

  useEffect(() => {
    refresh();
    window.addEventListener("annual-game-state-change", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("annual-game-state-change", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  return { snapshot, refresh };
}

export function useRanking(playerId?: string | null, intervalMs?: number) {
  const [ranking, setRanking] = useState(() => getRankingSnapshot(playerId));
  const refresh = useCallback(() => setRanking(getRankingSnapshot(playerId)), [playerId]);

  useEffect(() => {
    refresh();
    if (!intervalMs) return undefined;
    const timer = window.setInterval(refresh, intervalMs);
    return () => window.clearInterval(timer);
  }, [refresh, intervalMs]);

  return { ranking, refresh };
}

export function useAdminActions() {
  return { toggleGameOpen };
}
