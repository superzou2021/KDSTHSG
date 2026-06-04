"use client";

import { pb } from "@/lib/pocketbase";
import { GAME_ORDER, GAMES, PLAYER_CACHE_KEY, PLAYER_ID_KEY, PLAYER_PHONE_KEY, QUESTIONS, SEED_PLAYERS } from "@/lib/constants";
import { settlePendingBingoResults } from "@/lib/game-state";
import { getOfficeAverageRanking, getOfficeTop3, getPlayerRank, getPlayerRankingContext, getTop10Ranking } from "@/lib/ranking";
import type { AppState, Game, GameKey, GameResult, Player, Question, QuizProgress, QuizSessionSnapshot } from "@/types";

let pocketBaseAvailable = false;

function nowIso(): string {
  return new Date().toISOString();
}

function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getQuizSessionIndexFromOrder(order: number): number {
  return Math.max(0, Math.min(4, Math.floor((Math.max(1, order) - 1) / 2)));
}

function getQuizSectorDefaults(index: number): { sectorKey: string; sectorName: string } {
  return {
    sectorKey: `sector-${index + 1}`,
    sectorName: `Sector ${index + 1}`
  };
}

function normalizeQuizOpenGroups(value: unknown): number[] {
  if (!Array.isArray(value)) return [];
  return [...new Set(value
    .map((item) => Number(item))
    .filter((item) => Number.isInteger(item) && item >= 0 && item <= 4))]
    .sort((a, b) => a - b);
}

function normalizeQuestion(question: Question): Question {
  if (question.gameKey !== "quiz") return question;
  const derivedSessionIndex = getQuizSessionIndexFromOrder(question.order);
  const hasExplicitSector = Boolean(question.sectorKey || question.sectorName);
  const quizSessionIndex = Number.isInteger(question.quizSessionIndex) && (hasExplicitSector || question.quizSessionIndex !== 0 || derivedSessionIndex === 0)
    ? question.quizSessionIndex as number
    : derivedSessionIndex;
  const defaults = getQuizSectorDefaults(quizSessionIndex);
  return {
    ...question,
    quizSessionIndex,
    sectorKey: question.sectorKey || defaults.sectorKey,
    sectorName: question.sectorName || defaults.sectorName
  };
}

function normalizeGameResult(result: GameResult): GameResult {
  if (result.gameKey !== "quiz") return result;
  const quizSessionIndex = Number.isInteger(result.quizSessionIndex) ? result.quizSessionIndex : undefined;
  if (quizSessionIndex === undefined) return result;
  const defaults = getQuizSectorDefaults(quizSessionIndex);
  return {
    ...result,
    sectorKey: result.sectorKey || defaults.sectorKey,
    sectorName: result.sectorName || defaults.sectorName
  };
}

function getCompletedGamesForPlayer(player: Player, playerResults: GameResult[], nextGameKey: GameKey): GameKey[] {
  const completedGames = new Set<GameKey>(player.completedGames.filter((key) => key !== "quiz"));
  for (const result of playerResults) {
    if (result.pendingBingoScore) continue;
    if (result.gameKey !== "quiz") completedGames.add(result.gameKey);
  }

  const completedQuizGroups = new Set(
    playerResults
      .filter((result) => result.gameKey === "quiz" && !result.pendingBingoScore)
      .map((result) => result.quizSessionIndex)
      .filter((index): index is number => Number.isInteger(index))
  );
  if (completedQuizGroups.size >= 5 || (nextGameKey === "quiz" && completedQuizGroups.size >= 5)) {
    completedGames.add("quiz");
  }
  return GAME_ORDER.filter((key) => completedGames.has(key));
}

function buildQuizProgress(state: AppState, playerId: string): QuizProgress {
  const quizGame = state.games.find((game) => game.key === "quiz");
  const openGroups = normalizeQuizOpenGroups(quizGame?.quizOpenGroups || []);
  const quizResults = state.gameResults
    .filter((result) => result.player === playerId && result.gameKey === "quiz" && !result.pendingBingoScore)
    .map(normalizeGameResult);
  const completedGroups = normalizeQuizOpenGroups(quizResults
    .map((result) => result.quizSessionIndex)
    .filter((index): index is number => Number.isInteger(index)));
  const completedSet = new Set(completedGroups);
  const availableGroups = openGroups.filter((group) => !completedSet.has(group));

  return {
    completedCount: completedGroups.length,
    totalCount: 5,
    score: quizResults.reduce((sum, result) => sum + result.score, 0),
    maxScore: 100,
    openGroups,
    availableGroups,
    completedGroups
  };
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
  // 兼容旧数据：没有 bingoPhase 字段时，根据 bingoScored 推断
  let bingoPhase = record.bingoPhase;
  if (record.key === "bingo" && !bingoPhase) {
    bingoPhase = record.bingoScored ? "auto_score" : "open";
  }
  return {
    id: record.id,
    key: record.key,
    name: record.name,
    maxScore: record.maxScore,
    isOpen: Boolean(record.isOpen),
    order: record.order,
    bingoScored: Boolean(record.bingoScored),
    bingoPhase,
    quizCurrentGroup: record.quizCurrentGroup || 0,
    quizOpenGroups: normalizeQuizOpenGroups(record.quizOpenGroups)
  };
}

function mapQuestionRecord(record: any): Question {
  return normalizeQuestion({
    id: record.id,
    gameKey: record.gameKey,
    type: record.type,
    title: record.title,
    options: record.options || undefined,
    correctAnswer: record.correctAnswer,
    score: record.score || 0,
    order: record.order || 1,
    isActive: record.isActive !== false,
    sectorKey: record.sectorKey || undefined,
    sectorName: record.sectorName || undefined,
    quizSessionIndex: record.quizSessionIndex
  });
}

async function loadQuestionsFromPB(): Promise<Question[]> {
  try {
    const records = await pb.collection("questions").getFullList({ sort: "order" });
    if (records.length === 0) return QUESTIONS.map(normalizeQuestion);
    return records.map(mapQuestionRecord);
  } catch {
    return QUESTIONS.map(normalizeQuestion);
  }
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
            if (existingGame.bingoPhase === undefined) {
              updateData.bingoPhase = existingGame.bingoScored ? "auto_score" : "open";
              shouldUpdate = true;
            }
          }
          if (game.key === "quiz") {
            if (existingGame.quizCurrentGroup === undefined) {
              updateData.quizCurrentGroup = 0;
              shouldUpdate = true;
            }
            if (existingGame.quizOpenGroups === undefined) {
              updateData.quizOpenGroups = [];
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
    const [players, gameResults, games, questions] = await Promise.all([
      pb.collection("players").getFullList(),
      pb.collection("game_results").getFullList({ sort: "completedAt" }),
      pb.collection("games").getFullList({ sort: "order" }),
      loadQuestionsFromPB()
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
      pendingBingoScore: mapPendingBingoScore(r),
      quizSessionIndex: r.quizSessionIndex,
      sectorKey: r.sectorKey || undefined,
      sectorName: r.sectorName || undefined
    })).map(normalizeGameResult);
    const mappedGames: Game[] = games.map(mapGameRecord);

    return {
      players: mappedPlayers,
      gameResults: mappedResults,
      games: mappedGames.length > 0 ? mappedGames : GAMES,
      questions
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
    questions: QUESTIONS.map(normalizeQuestion)
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

export function saveCurrentPlayer(player: Player): void {
  if (!isBrowser()) return;
  window.localStorage.setItem(PLAYER_ID_KEY, player.id);
  if (player.phone) {
    window.localStorage.setItem(PLAYER_PHONE_KEY, player.phone);
  }
  setCachedPlayer(player);
}

export function clearCurrentPlayer(): void {
  if (!isBrowser()) return;
  window.localStorage.removeItem(PLAYER_ID_KEY);
  window.localStorage.removeItem(PLAYER_PHONE_KEY);
  window.localStorage.removeItem(PLAYER_CACHE_KEY);
}

export async function findPlayerByPhone(phone: string): Promise<Player | null> {
  const trimmed = (phone || "").trim();
  if (!trimmed) return null;
  const available = await checkPocketBase();
  if (available) {
    try {
      const record = await pb.collection("players").getFirstListItem(
        pb.filter("phone = {:phone}", { phone: trimmed })
      );
      return record ? mapPlayerRecord(record) : null;
    } catch {
      return null;
    }
  }
  return null;
}

export async function restoreCurrentPlayerFromLocal(): Promise<Player | null> {
  if (!isBrowser()) return null;
  const playerId = window.localStorage.getItem(PLAYER_ID_KEY);
  const phone = window.localStorage.getItem(PLAYER_PHONE_KEY);
  if (!playerId && !phone) return null;

  const available = await checkPocketBase();
  if (available) {
    if (playerId) {
      try {
        const record = await pb.collection("players").getOne(playerId);
        if (record) {
          const player = mapPlayerRecord(record);
          saveCurrentPlayer(player);
          return player;
        }
      } catch {
        // 继续按 phone 查找
      }
    }
    if (phone) {
      const byPhone = await findPlayerByPhone(phone);
      if (byPhone) {
        saveCurrentPlayer(byPhone);
        return byPhone;
      }
    }
    // PocketBase 可用但找不到该用户，清除本地缓存
    clearCurrentPlayer();
    return null;
  }

  // PocketBase 不可用：使用本地缓存兜底
  const cached = getCachedPlayer(playerId || undefined);
  if (cached) return cached;
  return null;
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
      // 开启 Bingo 时：恢复到 open 阶段，清除已判分标记
      // 关闭 Bingo 时：保留当前 bingoPhase（由专门的"完全关闭"按钮设置 closed）
      if (isOpen) {
        return { ...game, isOpen, bingoScored: false, bingoPhase: "open" as const };
      }
      return { ...game, isOpen };
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
          if (game.bingoPhase) data.bingoPhase = game.bingoPhase;
        }
        if (game.key === "quiz") {
          data.quizCurrentGroup = game.quizCurrentGroup || 0;
          data.quizOpenGroups = game.quizOpenGroups || [];
        }
        await pb.collection("games").update(existing.id, data);
      }
    }
  }

  await saveState(newState);
  return available ? await loadState() : newState;
}

export async function triggerBingoScore(): Promise<AppState> {
  console.log("🎮 completeBossAndEnableAutoScore: 开始执行");
  
  let state = await loadState();
  console.log("📊 加载的当前状态：", {
    playersCount: state.players.length,
    gameResultsCount: state.gameResults.length,
    bingoPendingCount: state.gameResults.filter(r => r.gameKey === "bingo" && r.pendingBingoScore).length
  });
  
  // 1. 找到所有 pendingBingoScore=true 的 Bingo 记录并判分
  const gameResults = state.gameResults.map((result) => {
    if (result.gameKey !== "bingo" || !result.pendingBingoScore) return result;
    return {
      ...result,
      answers: { ...result.answers, pendingBingoScore: false },
      pendingBingoScore: false
    };
  });

  // 2. 重新计算所有玩家的 completedGames 和 totalScore
  const players = state.players.map((player) => {
    const playerResults = gameResults.filter((result) => result.player === player.id && !result.pendingBingoScore);
    const completedGames = getCompletedGamesForPlayer(player, playerResults, "bingo");
    const finalSubmitted = GAME_ORDER.every((key) => completedGames.includes(key));
    const totalScore = playerResults.reduce((sum, result) => sum + result.score, 0);

    return {
      ...player,
      totalScore,
      completedGames,
      finalSubmitted,
      finalCompletedAt: finalSubmitted ? player.finalCompletedAt || nowIso() : player.finalCompletedAt,
      updated: nowIso()
    };
  });

  // 3. 更新 Bingo 状态：bingoPhase=auto_score, isOpen=false
  // 注意：isOpen=false 不阻止未完成用户进入，由 bingoPhase 决定
  const newGames = state.games.map((game) => (
    game.key === "bingo" 
      ? { ...game, isOpen: false, bingoScored: true, bingoPhase: "auto_score" as const } 
      : game
  ));
  const newState = { ...state, players, gameResults, games: newGames };

  const available = await checkPocketBase();
  if (available) {
    console.log("🔌 PocketBase 可用，开始同步数据...");
    
    try {
      const pendingResults = await pb.collection("game_results").getFullList({ 
        filter: "gameKey = 'bingo'"
      });
      
      for (const result of pendingResults) {
        if (mapPendingBingoScore(result)) {
          await pb.collection("game_results").update(result.id, {
            pendingBingoScore: false,
            answers: { ...result.answers, pendingBingoScore: false }
          });
        }
      }

      for (const player of newState.players) {
        await pb.collection("players").update(player.id, buildPlayerUpdate(player));
      }

      const list = await pb.collection("games").getFullList();
      const bingo = list.find(g => g.key === "bingo");
      if (bingo) {
        await pb.collection("games").update(bingo.id, { 
          isOpen: false, 
          bingoScored: true,
          bingoPhase: "auto_score"
        });
      }

      console.log("✅ PocketBase 数据同步完成");
    } catch (error) {
      console.error("❌ PocketBase 同步失败:", error);
      throw error;
    }
  }

  await saveState(newState);
  const finalState = available ? await loadStateFromPB() : newState;
  console.log("🎯 completeBossAndEnableAutoScore: 执行完成");
  return finalState;
}

// 别名，语义更清晰
export const completeBossAndEnableAutoScore = triggerBingoScore;

// 完全关闭 Bingo（管理员决定终止 Bingo）
export async function closeBingoGame(): Promise<AppState> {
  const state = await loadState();
  const newGames = state.games.map((game) => (
    game.key === "bingo"
      ? { ...game, isOpen: false, bingoPhase: "closed" as const }
      : game
  ));
  const newState = { ...state, games: newGames };

  const available = await checkPocketBase();
  if (available) {
    const list = await pb.collection("games").getFullList();
    const bingo = list.find(g => g.key === "bingo");
    if (bingo) {
      await pb.collection("games").update(bingo.id, {
        isOpen: false,
        bingoPhase: "closed"
      });
    }
  }

  await saveState(newState);
  return available ? await loadStateFromPB() : newState;
}

export async function advanceQuizGroup(): Promise<AppState> {
  const state = await loadState();
  const newGames = state.games.map((game) => {
    if (game.key !== "quiz") return game;
    const nextGroup = (game.quizCurrentGroup || 0) + 1;
    const openedGroup = Math.max(0, Math.min(4, nextGroup - 1));
    const quizOpenGroups = normalizeQuizOpenGroups([...(game.quizOpenGroups || []), openedGroup]);
    return { ...game, quizCurrentGroup: nextGroup, quizOpenGroups };
  });
  const newState = { ...state, games: newGames };

  const available = await checkPocketBase();
  if (available) {
    const list = await pb.collection("games").getFullList();
    const quiz = list.find(g => g.key === "quiz");
    if (quiz) {
      const nextGroup = (quiz.quizCurrentGroup || 0) + 1;
      const openedGroup = Math.max(0, Math.min(4, nextGroup - 1));
      const quizOpenGroups = normalizeQuizOpenGroups([...(quiz.quizOpenGroups || []), openedGroup]);
      await pb.collection("games").update(quiz.id, { quizCurrentGroup: nextGroup, quizOpenGroups });
    }
  }

  await saveState(newState);
  return available ? await loadState() : newState;
}

export async function openQuizGroup(groupIndex: number): Promise<AppState> {
  if (!Number.isInteger(groupIndex) || groupIndex < 0 || groupIndex > 4) {
    throw new Error("Quiz group index must be between 0 and 4");
  }
  const state = await loadState();
  const newGames = state.games.map((game) => {
    if (game.key !== "quiz") return game;
    return {
      ...game,
      isOpen: true,
      quizOpenGroups: normalizeQuizOpenGroups([...(game.quizOpenGroups || []), groupIndex])
    };
  });
  const newState = { ...state, games: newGames };

  const available = await checkPocketBase();
  if (available) {
    const list = await pb.collection("games").getFullList();
    const quiz = list.find(g => g.key === "quiz");
    if (quiz) {
      await pb.collection("games").update(quiz.id, {
        isOpen: true,
        quizOpenGroups: normalizeQuizOpenGroups([...(quiz.quizOpenGroups || []), groupIndex])
      });
    }
  }

  await saveState(newState);
  return available ? await loadState() : newState;
}

export async function closeQuizGroup(groupIndex: number): Promise<AppState> {
  if (!Number.isInteger(groupIndex) || groupIndex < 0 || groupIndex > 4) {
    throw new Error("Quiz group index must be between 0 and 4");
  }
  const state = await loadState();
  const newGames = state.games.map((game) => {
    if (game.key !== "quiz") return game;
    const quizOpenGroups = normalizeQuizOpenGroups(game.quizOpenGroups || []).filter((index) => index !== groupIndex);
    return {
      ...game,
      quizOpenGroups,
      isOpen: quizOpenGroups.length > 0
    };
  });
  const newState = { ...state, games: newGames };

  const available = await checkPocketBase();
  if (available) {
    const list = await pb.collection("games").getFullList();
    const quiz = list.find(g => g.key === "quiz");
    if (quiz) {
      const quizOpenGroups = normalizeQuizOpenGroups(quiz.quizOpenGroups || []).filter((index) => index !== groupIndex);
      await pb.collection("games").update(quiz.id, {
        isOpen: quizOpenGroups.length > 0,
        quizOpenGroups
      });
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
  quizSessionIndex?: number;
  sectorKey?: string;
  sectorName?: string;
}): Promise<{ result: GameResult; player: Player; rank: number }> {
  const state = await loadState();
  const game = state.games.find((g) => g.key === input.gameKey);
  const player = state.players.find((p) => p.id === input.playerId);

  if (!player) throw new Error("未找到当前用户，请重新注册");

  // === Bingo 特殊逻辑：根据 bingoPhase 决定提交行为 ===
  if (input.gameKey === "bingo") {
    const bingoPhase = game?.bingoPhase || "open";

    // 1. 已完成则禁止重复提交
    if (player.completedGames.includes("bingo")) {
      throw new Error("该游戏已完成，不能重复提交");
    }
    // 已有非 pending 的 bingo 记录也算完成
    const existingBingoResult = state.gameResults.find(
      (r) => r.player === input.playerId && r.gameKey === "bingo"
    );
    if (existingBingoResult && !existingBingoResult.pendingBingoScore) {
      throw new Error("该游戏已完成，不能重复提交");
    }
    // 已存在 pending 记录不允许重复提交
    if (existingBingoResult && existingBingoResult.pendingBingoScore) {
      throw new Error("已提交，等待 Boss 发言完成后判分");
    }

    // 2. closed 阶段禁止提交
    if (bingoPhase === "closed") {
      throw new Error("Bingo 已结束");
    }

    // 3. open 阶段：标记 pending，等待 Boss 判分
    // 4. auto_score 阶段：立即判分
    const isPending = bingoPhase === "open";
    return await persistGameResult(state, input, isPending);
  }

  if (input.gameKey === "quiz") {
    const quizSessionIndex = Number.isInteger(input.quizSessionIndex) ? input.quizSessionIndex as number : 0;
    if (quizSessionIndex < 0 || quizSessionIndex > 4) {
      throw new Error("Quiz group index must be between 0 and 4");
    }
    const openGroups = normalizeQuizOpenGroups(game?.quizOpenGroups || []);
    if (!game?.isOpen || !openGroups.includes(quizSessionIndex)) {
      throw new Error("该游戏暂未开放");
    }
    if (state.gameResults.some((result) => (
      result.player === input.playerId &&
      result.gameKey === "quiz" &&
      (Number.isInteger(result.quizSessionIndex) ? result.quizSessionIndex : 0) === quizSessionIndex
    ))) {
      throw new Error("该组 Quiz 已完成，不能重复提交");
    }
    const defaults = getQuizSectorDefaults(quizSessionIndex);
    return await persistGameResult(state, {
      ...input,
      quizSessionIndex,
      sectorKey: input.sectorKey || defaults.sectorKey,
      sectorName: input.sectorName || defaults.sectorName
    }, false);
  }

  // === 其他游戏：必须 isOpen=true ===
  if (!game?.isOpen) {
    throw new Error("该游戏暂未开放");
  }

  if (state.gameResults.some((result) => result.player === input.playerId && result.gameKey === input.gameKey)) {
    throw new Error("该游戏已完成，不能重复提交");
  }

  return await persistGameResult(state, input, false);
}

async function persistGameResult(
  state: AppState,
  input: {
    playerId: string;
    gameKey: GameKey;
    answers: Record<string, unknown>;
    score: number;
    pendingBingoScore?: boolean;
    quizSessionIndex?: number;
    sectorKey?: string;
    sectorName?: string;
  },
  isPending: boolean
): Promise<{ result: GameResult; player: Player; rank: number }> {
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
    pendingBingoScore: isPending,
    quizSessionIndex: input.quizSessionIndex,
    sectorKey: input.sectorKey,
    sectorName: input.sectorName
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
      pendingBingoScore: isPending,
      quizSessionIndex: result.quizSessionIndex,
      sectorKey: result.sectorKey,
      sectorName: result.sectorName
    });
    result.id = created.id;
  }

  // pending 情况下不更新 player.completedGames
  if (isPending) {
    const newState: AppState = {
      ...state,
      gameResults: [...state.gameResults, result]
    };
    await saveState(newState);
    return { result, player: state.players[playerIndex], rank: getPlayerRank(state.players, input.playerId) };
  }

  // 已判分：更新 player
  const gameResults = [...state.gameResults, result];
  const totalScore = gameResults
    .filter((item) => item.player === input.playerId && !item.pendingBingoScore)
    .reduce((sum, item) => sum + item.score, 0);
  const playerResults = gameResults.filter((item) => item.player === input.playerId && !item.pendingBingoScore);
  const completedGames = getCompletedGamesForPlayer(state.players[playerIndex], playerResults, input.gameKey);
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
  return state.questions
    .map(normalizeQuestion)
    .filter((question) => question.gameKey === gameKey && question.isActive)
    .sort((a, b) => a.order - b.order);
}

export async function getQuizSessionSnapshot(playerId: string): Promise<QuizSessionSnapshot> {
  const state = await loadState();
  const quizGame = state.games.find((game) => game.key === "quiz");
  const results = state.gameResults
    .filter((result) => result.player === playerId && result.gameKey === "quiz")
    .map(normalizeGameResult);
  return {
    openGroups: normalizeQuizOpenGroups(quizGame?.quizOpenGroups || []),
    completedGroups: normalizeQuizOpenGroups(results
      .map((result) => result.quizSessionIndex)
      .filter((index): index is number => Number.isInteger(index))),
    results
  };
}

export async function getLobbySnapshot(playerId: string) {
  const state = await loadState();
  const player = state.players.find((item) => item.id === playerId) || getCachedPlayer(playerId);
  return {
    state,
    player,
    rank: player ? getPlayerRank(state.players, player.id) : 0,
    results: state.gameResults.filter((result) => result.player === playerId),
    quizProgress: buildQuizProgress(state, playerId)
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
        const updateData: Record<string, unknown> = {
          isOpen: false,
          bingoScored: game.key === "bingo" ? false : Boolean(game.bingoScored)
        };
        if (game.key === "quiz") {
          updateData.quizCurrentGroup = 0;
          updateData.quizOpenGroups = [];
        }
        await pb.collection("games").update(game.id, updateData);
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
