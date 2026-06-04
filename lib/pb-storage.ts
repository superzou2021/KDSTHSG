"use client";

import { pb } from "@/lib/pocketbase";
import { GAME_ORDER, GAMES, PLAYER_CACHE_KEY, PLAYER_ID_KEY, PLAYER_PHONE_KEY, QUESTIONS, SEED_PLAYERS } from "@/lib/constants";
import { settlePendingBingoResults } from "@/lib/game-state";
import { getOfficeAverageRanking, getOfficeTop3, getPlayerRank, getPlayerRankingContext, getTop10Ranking } from "@/lib/ranking";
import type { AppState, Game, GameKey, GameResult, Player } from "@/types";

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

function mapPlayerRecord(record: any): Player {
  return {
    id: record.id,
    name: record.name,
    phone: record.phone,
    office: record.office,
    team: record.team,
    totalScore: record.totalScore || 0,
    completedGames: record.completedGames || [],
    finalSubmitted: Boolean(record.finalSubmitted),
    created: record.created || nowIso(),
    updated: record.updated || record.created || nowIso(),
    finalCompletedAt: record.finalCompletedAt || undefined
  };
}

function mapGameRecord(record: any): Game {
  return {
    id: record.id,
    key: record.key,
    name: record.name,
    maxScore: record.maxScore,
    isOpen: Boolean(record.isOpen),
    order: record.order,
    bingoScored: Boolean(record.bingoScored),
    quizCurrentGroup: record.quizCurrentGroup || 0
  };
}

function mapPendingBingoScore(record: any): boolean {
  if (typeof record.pendingBingoScore === "boolean") {
    return record.pendingBingoScore;
  }
  return Boolean(record.answers?.pendingBingoScore);
}

function buildPlayerUpdate(player: Player): Record<string, unknown> {
  const playerUpdate: Record<string, unknown> = {
    totalScore: player.totalScore,
    completedGames: player.completedGames,
    finalSubmitted: player.finalSubmitted
  };
  if (player.finalCompletedAt) {
    playerUpdate.finalCompletedAt = player.finalCompletedAt;
  }
  return playerUpdate;
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
    } else {
      // 更新已有的游戏记录，确保包含所有字段
      for (const game of GAMES) {
        const existingGame = list.find(g => g.key === game.key);
        if (existingGame) {
          let shouldUpdate = false;
          const updateData: Record<string, unknown> = {};
          
          // 检查并添加缺失的字段
          if (game.key === "bingo") {
            if (existingGame.bingoScored === undefined) {
              updateData.bingoScored = false;
              shouldUpdate = true;
            }
          }
          if (game.key === "quiz") {
            if (existingGame.quizCurrentGroup === undefined) {
              updateData.quizCurrentGroup = 0;
              shouldUpdate = true;
            }
          }
          
          if (shouldUpdate) {
            await pb.collection("games").update(existingGame.id, updateData);
          }
        } else {
          // 如果游戏不存在，则创建
          await pb.collection("games").create(game);
        }
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

export async function ensureCollections(): Promise<void> {
  const available = await checkPocketBase();
  if (!available) return;

  try {
    await pb.collection("players").getFullList(1);
  } catch {
    try {
      await pb.collection("players").create({
        name: "temp",
        phone: "13900000000",
        office: "北京",
        team: "Alpha",
        totalScore: 0,
        completedGames: [],
        finalSubmitted: false
      });
      const records = await pb.collection("players").getFullList();
      for (const record of records) {
        await pb.collection("players").delete(record.id);
      }
    } catch {}
  }

  try {
    await pb.collection("game_results").getFullList(1);
  } catch {
    console.warn("game_results collection not found, using localStorage fallback");
  }

  await ensureGameState();
}

export async function loadStateFromPB(): Promise<AppState> {
  const available = await checkPocketBase();
  if (!available) {
    return getInitialState();
  }

  try {
    const [players, gameResults, games] = await Promise.all([
      pb.collection("players").getFullList(),
      pb.collection("game_results").getFullList({ sort: "completedAt" }),
      pb.collection("games").getFullList({ sort: "order" })
    ]);

    const mappedPlayers: Player[] = players.map(mapPlayerRecord);

    const mappedResults: GameResult[] = gameResults.map(r => ({
      id: r.id,
      player: r.player,
      gameKey: r.gameKey,
      answers: r.answers,
      score: r.score,
      maxScore: r.maxScore,
      completedAt: r.completedAt,
      pendingBingoScore: mapPendingBingoScore(r)
    }));
    const mappedGames: Game[] = games.map(mapGameRecord);

    return {
      players: mappedPlayers,
      gameResults: mappedResults,
      games: mappedGames.length > 0 ? mappedGames : GAMES,
      questions: QUESTIONS
    };
  } catch (error) {
    console.error("❌ loadStateFromPB 失败:", error);
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
  const name = input.name.trim().replace(/[<>]/g, "");
  const phone = input.phone.trim();
  const office = input.office.trim();
  const team = input.team.trim().replace(/[<>]/g, "");

  if (!name) throw new Error("姓名不能为空");
  if (!validatePhone(phone)) throw new Error("请输入有效的 11 位手机号");
  if (!office) throw new Error("请选择 Office");
  if (!team) throw new Error("请选择或填写 Team");

  const available = await checkPocketBase();
  if (available) {
    await ensureCollections();
    const existing = await pb.collection("players").getFirstListItem(pb.filter("phone = {:phone}", { phone })).catch(() => null);
    if (existing) {
      const player = mapPlayerRecord(existing);
      if (isBrowser()) {
        window.localStorage.setItem(PLAYER_ID_KEY, player.id);
        window.localStorage.setItem(PLAYER_PHONE_KEY, phone);
        setCachedPlayer(player);
      }
      return { player, reused: true };
    }

    const created = await pb.collection("players").create({
      name,
      phone,
      office,
      team,
      totalScore: 0,
      completedGames: [],
      finalSubmitted: false
    });
    const player = mapPlayerRecord(created);
    if (isBrowser()) {
      window.localStorage.setItem(PLAYER_ID_KEY, player.id);
      window.localStorage.setItem(PLAYER_PHONE_KEY, phone);
      setCachedPlayer(player);
      window.dispatchEvent(new Event("annual-game-state-change"));
    }
    return { player, reused: false };
  }

  const state = await loadState();
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

  if (isBrowser()) {
    window.localStorage.setItem(PLAYER_ID_KEY, player.id);
    window.localStorage.setItem(PLAYER_PHONE_KEY, phone);
    setCachedPlayer(player);
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
  const newGames = state.games.map((game) => {
    if (game.key !== gameKey) return game;
    const isOpen = !game.isOpen;
    if (game.key === "bingo") {
      return { ...game, isOpen, bingoScored: isOpen ? false : game.bingoScored };
    }
    if (game.key === "quiz" && isOpen) {
      return { ...game, isOpen, quizCurrentGroup: 0 };
    }
    return { ...game, isOpen };
  });
  const newState = { ...state, games: newGames };

  const available = await checkPocketBase();
  if (available) {
    const list = await pb.collection("games").getFullList();
    for (const game of newGames) {
      const existing = list.find(g => g.key === game.key);
      if (existing) {
        let data: Record<string, any> = { isOpen: game.isOpen };
        if (game.key === "bingo") {
          data.bingoScored = Boolean(game.bingoScored);
        }
        if (game.key === "quiz") {
          data.quizCurrentGroup = game.quizCurrentGroup || 0;
        }
        await pb.collection("games").update(existing.id, data);
      }
    }
  }

  await saveState(newState);
  return available ? await loadState() : newState;
}

export async function triggerBingoScore(): Promise<AppState> {
  console.log("🎮 triggerBingoScore: 开始执行");
  
  let state = await loadState();
  console.log("📊 加载的当前状态：", {
    playersCount: state.players.length,
    gameResultsCount: state.gameResults.length,
    bingoPendingCount: state.gameResults.filter(r => r.gameKey === "bingo" && r.pendingBingoScore).length
  });
  
  // 手动处理 BINGO 判分，将 bingo 加入玩家的 completedGames
  const gameResults = state.gameResults.map((result) => {
    if (result.gameKey !== "bingo" || !result.pendingBingoScore) return result;
    return {
      ...result,
      answers: { ...result.answers, pendingBingoScore: false },
      pendingBingoScore: false
    };
  });

  console.log("✅ 处理后的 gameResults");

  const players = state.players.map((player) => {
    const playerResults = gameResults.filter((result) => result.player === player.id && !result.pendingBingoScore);
    const completedGames = [...new Set(playerResults.map((result) => result.gameKey))] as GameKey[];
    const finalSubmitted = GAME_ORDER.every((key) => completedGames.includes(key));
    const totalScore = playerResults.reduce((sum, result) => sum + result.score, 0);

    console.log(`👤 处理玩家 ${player.name}：`, {
      beforeCompletedGames: player.completedGames,
      afterCompletedGames: completedGames,
      beforeTotalScore: player.totalScore,
      afterTotalScore: totalScore
    });

    return {
      ...player,
      totalScore,
      completedGames,
      finalSubmitted,
      finalCompletedAt: finalSubmitted ? player.finalCompletedAt || nowIso() : player.finalCompletedAt,
      updated: nowIso()
    };
  });

  const newGames = state.games.map((game) => (game.key === "bingo" ? { ...game, isOpen: false, bingoScored: true } : game));
  const newState = { ...state, players, gameResults, games: newGames };

  const available = await checkPocketBase();
  if (available) {
    console.log("🔌 PocketBase 可用，开始同步数据...");
    
    try {
      const pendingResults = await pb.collection("game_results").getFullList({ 
        filter: "gameKey = 'bingo'"
      });
      console.log(`📝 找到 ${pendingResults.length} 条 BINGO 结果`);
      
      for (const result of pendingResults) {
        if (mapPendingBingoScore(result)) {
          console.log(`✓ 更新 game_result ${result.id}: pendingBingoScore=false`);
          await pb.collection("game_results").update(result.id, {
            pendingBingoScore: false,
            answers: { ...result.answers, pendingBingoScore: false }
          });
        }
      }

      for (const player of newState.players) {
        console.log(`✓ 更新玩家 ${player.name}:`, {
          totalScore: player.totalScore,
          completedGames: player.completedGames
        });
        await pb.collection("players").update(player.id, buildPlayerUpdate(player));
      }

      const list = await pb.collection("games").getFullList();
      const bingo = list.find(g => g.key === "bingo");
      if (bingo) {
        console.log(`✓ 更新 BINGO 游戏状态：isOpen=false, bingoScored=true`);
        await pb.collection("games").update(bingo.id, { isOpen: false, bingoScored: true });
      }

      console.log("✅ PocketBase 数据同步完成");
    } catch (error) {
      console.error("❌ PocketBase 同步失败:", error);
      throw error;
    }
  }

  await saveState(newState);
  
  // 强制重新加载状态，确保获取最新数据
  const finalState = available ? await loadStateFromPB() : newState;
  
  console.log("🎯 triggerBingoScore: 执行完成");
  console.log("📊 最终状态验证：");
  console.log(`  游戏状态: bingo.isOpen=${finalState.games.find(g => g.key === 'bingo')?.isOpen}, bingo.bingoScored=${finalState.games.find(g => g.key === 'bingo')?.bingoScored}`);
  finalState.players.forEach(p => {
    console.log(`  👤 ${p.name}: completedGames=${JSON.stringify(p.completedGames)}, totalScore=${p.totalScore}`);
  });
  
  return finalState;
}

export async function advanceQuizGroup(): Promise<AppState> {
  const state = await loadState();
  const newGames = state.games.map((game) => {
    if (game.key !== "quiz") return game;
    const nextGroup = (game.quizCurrentGroup || 0) + 1;
    return { ...game, quizCurrentGroup: nextGroup };
  });
  const newState = { ...state, games: newGames };

  const available = await checkPocketBase();
  if (available) {
    const list = await pb.collection("games").getFullList();
    const quiz = list.find(g => g.key === "quiz");
    if (quiz) {
      const nextGroup = (quiz.quizCurrentGroup || 0) + 1;
      await pb.collection("games").update(quiz.id, { quizCurrentGroup: nextGroup });
    }
  }

  await saveState(newState);
  return available ? await loadState() : newState;
}

export async function submitGameResult(input: {
  playerId: string;
  gameKey: GameKey;
  answers: Record<string, unknown>;
  score: number;
  pendingBingoScore?: boolean;
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
    completedAt: nowIso(),
    pendingBingoScore: input.pendingBingoScore
  };

  const available = await checkPocketBase();
  if (available) {
    const created = await pb.collection("game_results").create({
      player: result.player,
      gameKey: result.gameKey,
      answers: result.answers,
      score: result.score,
      maxScore: result.maxScore,
      completedAt: result.completedAt,
      pendingBingoScore: Boolean(input.pendingBingoScore)
    });
    result.id = created.id;
  }

  if (input.pendingBingoScore) {
    const newState: AppState = {
      ...state,
      gameResults: [...state.gameResults, result]
    };
    await saveState(newState);
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

  if (available) {
    await pb.collection("players").update(player.id, buildPlayerUpdate(player));
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
  if (!isBrowser()) return;

  const available = await checkPocketBase();
  if (available) {
    try {
      const players = await pb.collection("players").getFullList();
      const results = await pb.collection("game_results").getFullList();
      const games = await pb.collection("games").getFullList();

      for (const p of players) {
        await pb.collection("players").delete(p.id);
      }
      for (const r of results) {
        await pb.collection("game_results").delete(r.id);
      }
      for (const game of games) {
        await pb.collection("games").update(game.id, {
          isOpen: false,
          bingoScored: game.key === "bingo" ? false : Boolean(game.bingoScored)
        });
      }
    } catch {}
  }

  window.localStorage.removeItem("annual_game_demo_state_v3");
  window.localStorage.removeItem(PLAYER_ID_KEY);
  window.localStorage.removeItem(PLAYER_PHONE_KEY);
  window.localStorage.removeItem(PLAYER_CACHE_KEY);
  await loadState();
}

export function subscribeToState(callback: () => void): () => void {
  let unsub: (() => void) | null = null;
  let disposed = false;

  const setUnsub = (nextUnsub: () => void) => {
    if (disposed) {
      nextUnsub();
      return;
    }
    unsub = nextUnsub;
  };

  checkPocketBase().then(available => {
    if (disposed) return;

    if (!available) {
      if (isBrowser()) {
        const handler = () => callback();
        window.addEventListener("annual-game-state-change", handler);
        window.addEventListener("storage", handler);
        setUnsub(() => {
          window.removeEventListener("annual-game-state-change", handler);
          window.removeEventListener("storage", handler);
        });
      }
      return;
    }

    Promise.all([
      pb.collection("players").subscribe("*", callback),
      pb.collection("game_results").subscribe("*", callback),
      pb.collection("games").subscribe("*", callback)
    ]).then(unsubs => {
      setUnsub(() => unsubs.forEach(u => u()));
    }).catch(() => {});
  });

  return () => {
    disposed = true;
    unsub?.();
  };
}
