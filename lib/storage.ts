"use client";

import { GAME_ORDER, GAMES, PLAYER_ID_KEY, PLAYER_PHONE_KEY, QUESTIONS, SEED_PLAYERS, STATE_KEY } from "@/lib/constants";
import { getOfficeAverageRanking, getOfficeTop3, getPlayerRank, getPlayerRankingContext, getTop10Ranking } from "@/lib/ranking";
import type { AppState, GameKey, GameResult, Player } from "@/types";

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export function getInitialState(): AppState {
  return {
    players: SEED_PLAYERS,
    gameResults: [],
    games: GAMES,
    questions: QUESTIONS
  };
}

export function loadState(): AppState {
  if (!isBrowser()) return getInitialState();
  const raw = window.localStorage.getItem(STATE_KEY);
  if (!raw) {
    const initialState = getInitialState();
    window.localStorage.setItem(STATE_KEY, JSON.stringify(initialState));
    return initialState;
  }
  try {
    const parsed = JSON.parse(raw) as AppState;
    return {
      ...getInitialState(),
      ...parsed,
      games: parsed.games?.length ? parsed.games : GAMES,
      questions: parsed.questions?.length ? parsed.questions : QUESTIONS
    };
  } catch {
    const initialState = getInitialState();
    window.localStorage.setItem(STATE_KEY, JSON.stringify(initialState));
    return initialState;
  }
}

export function saveState(state: AppState): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("annual-game-state-change"));
}

export function getCurrentPlayerId(): string | null {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(PLAYER_ID_KEY);
}

export function getCurrentPlayer(): Player | null {
  const playerId = getCurrentPlayerId();
  if (!playerId) return null;
  return loadState().players.find((player) => player.id === playerId) || null;
}

export function validatePhone(phone: string): boolean {
  if (!phone || phone.length !== 11) return false;
  if (phone[0] !== '1') return false;
  const secondChar = parseInt(phone[1], 10);
  if (isNaN(secondChar) || secondChar < 3 || secondChar > 9) return false;
  for (let i = 2; i < 11; i++) {
    const char = phone[i];
    if (char < '0' || char > '9') return false;
  }
  return true;
}

export function registerPlayer(input: { name: string; phone: string; office: string; team: string }): { player: Player; reused: boolean } {
  const name = input.name.trim().replace(/[<>]/g, "");
  const phone = input.phone.trim();
  const office = input.office.trim();
  const team = input.team.trim().replace(/[<>]/g, "");

  if (!name) throw new Error("姓名不能为空");
  if (!validatePhone(phone)) throw new Error("请输入有效的 11 位手机号");
  if (!office) throw new Error("请选择 Office");
  if (!team) throw new Error("请选择或填写 Team");

  const state = loadState();
  const existing = state.players.find((player) => player.phone === phone);
  if (existing) {
    window.localStorage.setItem(PLAYER_ID_KEY, existing.id);
    window.localStorage.setItem(PLAYER_PHONE_KEY, phone);
    return { player: existing, reused: true };
  }

  const player: Player = {
    id: createId("player"),
    name,
    phone,
    office,
    team,
    totalScore: 0,
    completedGames: [],
    finalSubmitted: false,
    created: nowIso(),
    updated: nowIso()
  };
  state.players.push(player);
  saveState(state);
  window.localStorage.setItem(PLAYER_ID_KEY, player.id);
  window.localStorage.setItem(PLAYER_PHONE_KEY, phone);
  return { player, reused: false };
}

export function getGameResult(playerId: string, gameKey: GameKey): GameResult | null {
  return loadState().gameResults.find((result) => result.player === playerId && result.gameKey === gameKey) || null;
}

export function isGameOpen(gameKey: GameKey): boolean {
  return Boolean(loadState().games.find((game) => game.key === gameKey)?.isOpen);
}

export function toggleGameOpen(gameKey: GameKey): AppState {
  const state = loadState();
  state.games = state.games.map((game) => (game.key === gameKey ? { ...game, isOpen: !game.isOpen } : game));
  saveState(state);
  return state;
}

export function submitGameResult(input: {
  playerId: string;
  gameKey: GameKey;
  answers: Record<string, unknown>;
  score: number;
}): { result: GameResult; player: Player; rank: number } {
  const state = loadState();
  if (!state.games.find((game) => game.key === input.gameKey)?.isOpen) {
    throw new Error("该游戏暂未开放");
  }
  if (state.gameResults.some((result) => result.player === input.playerId && result.gameKey === input.gameKey)) {
    throw new Error("该游戏已完成，不能重复提交");
  }

  const playerIndex = state.players.findIndex((player) => player.id === input.playerId);
  if (playerIndex < 0) throw new Error("未找到当前用户，请重新注册");

  const result: GameResult = {
    id: createId("result"),
    player: input.playerId,
    gameKey: input.gameKey,
    answers: input.answers,
    score: Math.max(0, Math.min(100, Math.round(input.score))),
    maxScore: 100,
    completedAt: nowIso()
  };

  const gameResults = [...state.gameResults, result];
  const totalScore = gameResults
    .filter((item) => item.player === input.playerId)
    .reduce((sum, item) => sum + item.score, 0);
  const completedGames = [...new Set([...state.players[playerIndex].completedGames, input.gameKey])] as GameKey[];
  const finalSubmitted = GAME_ORDER.every((key) => completedGames.includes(key));
  const player: Player = {
    ...state.players[playerIndex],
    totalScore,
    completedGames,
    finalSubmitted,
    finalCompletedAt: finalSubmitted ? nowIso() : state.players[playerIndex].finalCompletedAt,
    updated: nowIso()
  };

  state.players[playerIndex] = player;
  state.gameResults = gameResults;
  saveState(state);
  return { result, player, rank: getPlayerRank(state.players, player.id) };
}

export function getQuestions(gameKey: GameKey) {
  return loadState().questions.filter((question) => question.gameKey === gameKey && question.isActive).sort((a, b) => a.order - b.order);
}

export function getLobbySnapshot(playerId: string) {
  const state = loadState();
  const player = state.players.find((item) => item.id === playerId) || null;
  return {
    state,
    player,
    rank: player ? getPlayerRank(state.players, player.id) : 0,
    results: state.gameResults.filter((result) => result.player === playerId)
  };
}

export function getRankingSnapshot(playerId?: string | null) {
  const state = loadState();
  return {
    players: state.players,
    games: state.games,
    results: state.gameResults,
    top10: getTop10Ranking(state.players),
    officeAverage: getOfficeAverageRanking(state.players),
    officeTop3: getOfficeTop3(state.players),
    context: playerId ? getPlayerRankingContext(state.players, playerId) : null
  };
}

export function resetDemoData(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(STATE_KEY);
  window.localStorage.removeItem(PLAYER_ID_KEY);
  window.localStorage.removeItem(PLAYER_PHONE_KEY);
  loadState();
}
