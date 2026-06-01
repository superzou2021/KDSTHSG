"use client";

import { pb } from "@/lib/pocketbase";
import { GAME_ORDER, GAMES, PLAYER_ID_KEY, PLAYER_PHONE_KEY, QUESTIONS, SEED_PLAYERS } from "@/lib/constants";
import { getOfficeAverageRanking, getOfficeTop3, getPlayerRank, getPlayerRankingContext, getTop10Ranking } from "@/lib/ranking";
import type { AppState, GameKey, GameResult, Player } from "@/types";

let pocketBaseAvailable = false;

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function isBrowser(): boolean {
  return typeof window !== "undefined";
}

export async function checkPocketBase(): Promise<boolean> {
  try {
    await pb.health.check();
    pocketBaseAvailable = true;
    return true;
  } catch {
    pocketBaseAvailable = false;
    return false;
  }
}

export async function ensureGameState(): Promise<void> {
  const available = await checkPocketBase();
  if (!available) return;

  try {
    const list = await pb.collection("games").getFullList();
    if (list.length === 0) {
      for (const game of GAMES) {
        await pb.collection("games").create(game);
      }
    }
  } catch {
    for (const game of GAMES) {
      try {
        await pb.collection("games").create(game);
      } catch {}
    }
  }
}

export async function loadStateFromPB(): Promise<AppState> {
  const available = await checkPocketBase();
  if (!available) {
    return getInitialState();
  }

  try {
    const [players, gameResults, games] = await Promise.all([
      pb.collection("players").getFullList({ sort: "created" }),
      pb.collection("game_results").getFullList({ sort: "created" }),
      pb.collection("games").getFullList({ sort: "order" })
    ]);

    const mappedPlayers: Player[] = players.map(p => ({
      id: p.id,
      name: p.name,
      phone: p.phone,
      office: p.office,
      team: p.team,
      totalScore: p.totalScore,
      completedGames: p.completedGames || [],
      finalSubmitted: p.finalSubmitted,
      created: p.created,
      updated: p.updated,
      finalCompletedAt: p.finalCompletedAt
    }));

    const mappedResults: GameResult[] = gameResults.map(r => ({
      id: r.id,
      player: r.player,
      gameKey: r.gameKey,
      answers: r.answers,
      score: r.score,
      maxScore: r.maxScore,
      completedAt: r.completedAt
    }));

    return {
      players: mappedPlayers.length > 0 ? mappedPlayers : SEED_PLAYERS,
      gameResults: mappedResults,
      games: games.length > 0 ? games : GAMES,
      questions: QUESTIONS
    };
  } catch {
    return getInitialState();
  }
}

export function getInitialState(): AppState {
  return {
    players: SEED_PLAYERS,
    gameResults: [],
    games: GAMES,
    questions: QUESTIONS
  };
}

export async function loadState(): Promise<AppState> {
  const available = await checkPocketBase();
  if (available) {
    return await loadStateFromPB();
  }
  return getInitialState();
}

export async function saveStateToPB(state: AppState): Promise<void> {
  const available = await checkPocketBase();
  if (!available) return;
}

export async function saveState(state: AppState): Promise<void> {
  const available = await checkPocketBase();
  if (!available) return;

  if (isBrowser()) {
    window.dispatchEvent(new Event("annual-game-state-change"));
  }
}

export async function getCurrentPlayerId(): Promise<string | null> {
  if (!isBrowser()) return null;
  return window.localStorage.getItem(PLAYER_ID_KEY);
}

export async function getCurrentPlayer(): Promise<Player | null> {
  const playerId = await getCurrentPlayerId();
  if (!playerId) return null;
  const state = await loadState();
  return state.players.find((player) => player.id === playerId) || null;
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
  const name = input.name.trim().replace(/[<>]/g, "");
  const phone = input.phone.trim();
  const office = input.office.trim();
  const team = input.team.trim().replace(/[<>]/g, "");

  if (!name) throw new Error("姓名不能为空");
  if (!validatePhone(phone)) throw new Error("请输入有效的 11 位手机号");
  if (!office) throw new Error("请选择 Office");
  if (!team) throw new Error("请选择或填写 Team");

  const state = await loadState();
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

  const available = await checkPocketBase();
  if (available) {
    try {
      const created = await pb.collection("players").create({
        name: player.name,
        phone: player.phone,
        office: player.office,
        team: player.team,
        totalScore: player.totalScore,
        completedGames: player.completedGames,
        finalSubmitted: player.finalSubmitted
      });
      player.id = created.id;
    } catch {}
  }

  if (isBrowser()) {
    window.localStorage.setItem(PLAYER_ID_KEY, player.id);
    window.localStorage.setItem(PLAYER_PHONE_KEY, phone);
  }

  await saveState({ ...state, players: [...state.players, player] });
  return { player, reused: false };
}

export async function getGameResult(playerId: string, gameKey: GameKey): Promise<GameResult | null> {
  const state = await loadState();
  return state.gameResults.find((result) => result.player === playerId && result.gameKey === gameKey) || null;
}

export async function isGameOpen(gameKey: GameKey): Promise<boolean> {
  const state = await loadState();
  return Boolean(state.games.find((game) => game.key === gameKey)?.isOpen);
}

export async function toggleGameOpen(gameKey: GameKey): Promise<AppState> {
  const state = await loadState();
  const newGames = state.games.map((game) => (game.key === gameKey ? { ...game, isOpen: !game.isOpen } : game));
  const newState = { ...state, games: newGames };

  const available = await checkPocketBase();
  if (available) {
    try {
      const list = await pb.collection("games").getFullList();
      for (const game of newGames) {
        const existing = list.find(g => g.key === game.key);
        if (existing) {
          await pb.collection("games").update(existing.id, { isOpen: game.isOpen });
        }
      }
    } catch {}
  }

  await saveState(newState);
  return newState;
}

export async function submitGameResult(input: {
  playerId: string;
  gameKey: GameKey;
  answers: Record<string, unknown>;
  score: number;
}): Promise<{ result: GameResult; player: Player; rank: number }> {
  const state = await loadState();
  const game = state.games.find((g) => g.key === input.gameKey);

  if (!game?.isOpen) {
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

  const available = await checkPocketBase();
  if (available) {
    try {
      const created = await pb.collection("game_results").create({
        player: result.player,
        gameKey: result.gameKey,
        answers: result.answers,
        score: result.score,
        maxScore: result.maxScore,
        completedAt: result.completedAt
      });
      result.id = created.id;
    } catch {}
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

  if (available) {
    try {
      await pb.collection("players").update(player.id, {
        totalScore: player.totalScore,
        completedGames: player.completedGames,
        finalSubmitted: player.finalSubmitted,
        finalCompletedAt: player.finalCompletedAt,
        updated: player.updated
      });
    } catch {}
  }

  const newState: AppState = {
    ...state,
    players: state.players.map((p, i) => i === playerIndex ? player : p),
    gameResults
  };
  await saveState(newState);

  return { result, player, rank: getPlayerRank(newState.players, player.id) };
}

export async function getQuestions(gameKey: GameKey) {
  const state = await loadState();
  return state.questions.filter((question) => question.gameKey === gameKey && question.isActive).sort((a, b) => a.order - b.order);
}

export async function getLobbySnapshot(playerId: string) {
  const state = await loadState();
  const player = state.players.find((item) => item.id === playerId) || null;
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
  if (!isBrowser()) return;

  const available = await checkPocketBase();
  if (available) {
    try {
      const players = await pb.collection("players").getFullList();
      const results = await pb.collection("game_results").getFullList();

      for (const p of players) {
        await pb.collection("players").delete(p.id);
      }
      for (const r of results) {
        await pb.collection("game_results").delete(r.id);
      }
    } catch {}
  }

  window.localStorage.removeItem("annual_game_demo_state_v3");
  window.localStorage.removeItem(PLAYER_ID_KEY);
  window.localStorage.removeItem(PLAYER_PHONE_KEY);
  await loadState();
}

export function subscribeToState(callback: () => void): () => void {
  let unsub: (() => void) | null = null;

  checkPocketBase().then(available => {
    if (!available) {
      if (isBrowser()) {
        const handler = () => callback();
        window.addEventListener("annual-game-state-change", handler);
        window.addEventListener("storage", handler);
        unsub = () => {
          window.removeEventListener("annual-game-state-change", handler);
          window.removeEventListener("storage", handler);
        };
      }
      return;
    }

    Promise.all([
      pb.collection("players").subscribe("*", callback),
      pb.collection("game_results").subscribe("*", callback),
      pb.collection("games").subscribe("*", callback)
    ]).then(unsubs => {
      unsub = () => unsubs.forEach(u => u());
    }).catch(() => {});
  });

  return () => unsub?.();
}
