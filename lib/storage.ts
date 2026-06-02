"use client";

import * as pbStorage from "@/lib/pb-storage";
import { GAME_ORDER, GAMES, PLAYER_CACHE_KEY, PLAYER_ID_KEY, PLAYER_PHONE_KEY, QUESTIONS, SEED_PLAYERS, STATE_KEY } from "@/lib/constants";
import { settlePendingBingoResults } from "@/lib/game-state";
import { getOfficeAverageRanking, getOfficeTop3, getPlayerRank, getPlayerRankingContext, getTop10Ranking } from "@/lib/ranking";
import type { AppState, GameKey, GameResult, Player } from "@/types";

let usePocketBase = false;

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

function setCachedPlayer(player: Player): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(PLAYER_CACHE_KEY, JSON.stringify(player));
}

function getCachedPlayer(playerId?: string | null): Player | null {
  if (!isBrowser()) return null;
  try {
    const raw = window.localStorage.getItem(PLAYER_CACHE_KEY);
    if (!raw) return null;
    const player = JSON.parse(raw) as Player;
    if (playerId && player.id !== playerId) return null;
    return player;
  } catch {
    return null;
  }
}

function hasPocketBaseConfig(): boolean {
  return Boolean(process.env.NEXT_PUBLIC_POCKETBASE_URL);
}

export async function checkBackend(): Promise<boolean> {
  const available = await pbStorage.checkPocketBase();
  usePocketBase = available;
  return available;
}

export function getInitialState(): AppState {
  return {
    players: SEED_PLAYERS,
    gameResults: [],
    games: GAMES,
    questions: QUESTIONS
  };
}

function loadStateLocal(): AppState {
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

function saveStateLocal(state: AppState): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(STATE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event("annual-game-state-change"));
}

export async function loadState(): Promise<AppState> {
  const available = await checkBackend();
  if (available) {
    return await pbStorage.loadStateFromPB();
  }
  return loadStateLocal();
}

export async function saveState(state: AppState): Promise<void> {
  const available = await checkBackend();
  if (available) {
    await pbStorage.saveState(state);
    return;
  }
  saveStateLocal(state);
}

export async function getCurrentPlayerId(): Promise<string | null> {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(PLAYER_ID_KEY);
}

export async function getCurrentPlayer(): Promise<Player | null> {
  const playerId = await getCurrentPlayerId();
  if (!playerId) return null;
  const state = await loadState();
  const player = state.players.find((item) => item.id === playerId) || null;
  if (player) {
    setCachedPlayer(player);
    return player;
  }
  return getCachedPlayer(playerId);
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

export async function registerPlayer(input: { name: string; phone: string; office: string; team: string }): Promise<{ player: Player; reused: boolean }> {
  const available = await checkBackend();
  if (available) {
    await pbStorage.ensureCollections();
    return await pbStorage.registerPlayer(input);
  }

  const name = input.name.trim().replace(/[<>]/g, "");
  const phone = input.phone.trim();
  const office = input.office.trim();
  const team = input.team.trim().replace(/[<>]/g, "");

  if (!name) throw new Error("姓名不能为空");
  if (!validatePhone(phone)) throw new Error("请输入有效的 11 位手机号");
  if (!office) throw new Error("请选择 Office");
  if (!team) throw new Error("请选择或填写 Team");

  const state = loadStateLocal();
  const existing = state.players.find((player) => player.phone === phone);
  if (existing) {
    window.localStorage.setItem(PLAYER_ID_KEY, existing.id);
    window.localStorage.setItem(PLAYER_PHONE_KEY, phone);
    setCachedPlayer(existing);
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
  saveStateLocal(state);
  window.localStorage.setItem(PLAYER_ID_KEY, player.id);
  window.localStorage.setItem(PLAYER_PHONE_KEY, phone);
  setCachedPlayer(player);
  return { player, reused: false };
}

export async function getGameResult(playerId: string, gameKey: GameKey): Promise<GameResult | null> {
  const available = await checkBackend();
  if (available) {
    return await pbStorage.getGameResult(playerId, gameKey);
  }
  if (hasPocketBaseConfig()) {
    return null;
  }
  const state = loadStateLocal();
  return state.gameResults.find((result) => result.player === playerId && result.gameKey === gameKey) || null;
}

export async function isGameOpen(gameKey: GameKey): Promise<boolean> {
  const available = await checkBackend();
  if (available) {
    return await pbStorage.isGameOpen(gameKey);
  }
  const state = loadStateLocal();
  return Boolean(state.games.find((game) => game.key === gameKey)?.isOpen);
}

export async function toggleGameOpen(gameKey: GameKey): Promise<AppState> {
  const available = await checkBackend();
  if (available) {
    return await pbStorage.toggleGameOpen(gameKey);
  }
  const state = loadStateLocal();
  state.games = state.games.map((game) => {
    if (game.key !== gameKey) return game;
    const isOpen = !game.isOpen;
    return game.key === "bingo" ? { ...game, isOpen, bingoScored: isOpen ? false : game.bingoScored } : { ...game, isOpen };
  });
  saveStateLocal(state);
  return state;
}

export async function triggerBingoScore(): Promise<AppState> {
  const available = await checkBackend();
  if (available) {
    return await pbStorage.triggerBingoScore();
  }
  const state = settlePendingBingoResults(loadStateLocal());
  state.games = state.games.map((game) => (game.key === "bingo" ? { ...game, isOpen: false, bingoScored: true } : game));
  saveStateLocal(state);
  return state;
}

export async function submitGameResult(input: {
  playerId: string;
  gameKey: GameKey;
  answers: Record<string, unknown>;
  score: number;
  pendingBingoScore?: boolean;
}): Promise<{ result: GameResult; player: Player; rank: number }> {
  const available = await checkBackend();
  if (available) {
    return await pbStorage.submitGameResult(input);
  }

  const state = loadStateLocal();
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
    completedAt: nowIso(),
    pendingBingoScore: input.pendingBingoScore
  };

  if (input.pendingBingoScore) {
    state.gameResults = [...state.gameResults, result];
    saveStateLocal(state);
    return { result, player: state.players[playerIndex], rank: getPlayerRank(state.players, input.playerId) };
  }

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
  saveStateLocal(state);
  return { result, player, rank: getPlayerRank(state.players, player.id) };
}

export async function getQuestions(gameKey: GameKey) {
  const state = await loadState();
  return state.questions.filter((question) => question.gameKey === gameKey && question.isActive).sort((a, b) => a.order - b.order);
}

export async function getLobbySnapshot(playerId: string) {
  const state = await loadState();
  const player = state.players.find((item) => item.id === playerId) || getCachedPlayer(playerId);
  return {
    state,
    player,
    rank: player ? getPlayerRank(state.players, player.id) : 0,
    results: state.gameResults.filter((result) => result.player === playerId)
  };
}

export async function getRankingSnapshot(playerId?: string | null) {
  const state = await loadState();
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

export async function resetDemoData(): Promise<void> {
  const available = await checkBackend();
  if (available) {
    await pbStorage.resetDemoData();
    return;
  }

  if (!isBrowser()) return;
  window.localStorage.removeItem(STATE_KEY);
  window.localStorage.removeItem(PLAYER_ID_KEY);
  window.localStorage.removeItem(PLAYER_PHONE_KEY);
  window.localStorage.removeItem(PLAYER_CACHE_KEY);
  loadStateLocal();
}

export function subscribeToState(callback: () => void): () => void {
  return pbStorage.subscribeToState(callback);
}

export { PLAYER_ID_KEY, PLAYER_PHONE_KEY };
