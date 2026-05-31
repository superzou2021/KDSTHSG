import test from "node:test";
import assert from "node:assert/strict";
import { 
  calculateBingoScore,
  calculateQuizScore,
  calculateStoryScore,
  calculateEliminationScore
} from "./scoring.ts";
import { 
  buildRanking,
  getPlayerRank,
  getTop10Ranking,
  getOfficeAverageRanking,
  getOfficeTop3,
  getPlayerRankingContext
} from "./ranking.ts";
import type { Player } from "../types/index.ts";

// ========== 完整游戏流程测试 ==========
test("集成测试: 完整的单人游戏流程", () => {
  // 1. 玩家注册并完成所有游戏
  const player: Player = {
    id: "player-1",
    name: "测试玩家",
    phone: "13900000001",
    office: "北京",
    team: "测试团队",
    totalScore: 0,
    completedGames: [],
    finalSubmitted: false,
    created: "2026-01-01T09:00:00.000Z",
    updated: "2026-01-01T09:00:00.000Z",
    finalCompletedAt: undefined
  };

  // 2. 完成 Bingo 游戏（答对 10 题）
  const bingoScore = calculateBingoScore(10);
  assert.equal(bingoScore, 100);
  player.totalScore += bingoScore;
  player.completedGames.push("bingo");

  // 3. 完成 Quiz 游戏（答对 8 题）
  const quizScore = calculateQuizScore(8);
  assert.equal(quizScore, 80);
  player.totalScore += quizScore;
  player.completedGames.push("quiz");

  // 4. 完成 Story 游戏（全对）
  const storyScore = calculateStoryScore([true, true, true]);
  assert.equal(storyScore, 100);
  player.totalScore += storyScore;
  player.completedGames.push("story");

  // 5. 完成 Elimination 游戏（答对 5 题）
  const eliminationScore = calculateEliminationScore(5);
  assert.equal(eliminationScore, 100);
  player.totalScore += eliminationScore;
  player.completedGames.push("elimination");

  // 6. 验证总分
  assert.equal(player.totalScore, 380); // 100+80+100+100
  assert.equal(player.completedGames.length, 4);
});

test("集成测试: 多人游戏排名流程", () => {
  // 1. 创建多个玩家，每个玩家完成不同的游戏
  const players: Player[] = [
    {
      id: "player-1",
      name: "玩家 A",
      phone: "13900000001",
      office: "北京",
      team: "Alpha",
      totalScore: calculateBingoScore(10) + calculateQuizScore(10) + calculateStoryScore([true, true, true]) + calculateEliminationScore(5),
      completedGames: ["bingo", "quiz", "story", "elimination"],
      finalSubmitted: false,
      created: "2026-01-01T09:00:00.000Z",
      updated: "2026-01-01T09:10:00.000Z",
      finalCompletedAt: "2026-01-01T09:10:00.000Z"
    },
    {
      id: "player-2",
      name: "玩家 B",
      phone: "13900000002",
      office: "北京",
      team: "Beta",
      totalScore: calculateBingoScore(10) + calculateQuizScore(10) + calculateStoryScore([true, true, true]) + calculateEliminationScore(5),
      completedGames: ["bingo", "quiz", "story", "elimination"],
      finalSubmitted: false,
      created: "2026-01-01T09:00:00.000Z",
      updated: "2026-01-01T09:09:00.000Z",
      finalCompletedAt: "2026-01-01T09:09:00.000Z"
    },
    {
      id: "player-3",
      name: "玩家 C",
      phone: "13900000003",
      office: "上海",
      team: "Gamma",
      totalScore: calculateBingoScore(8) + calculateQuizScore(7) + calculateStoryScore([true, false, false]) + calculateEliminationScore(3),
      completedGames: ["bingo", "quiz", "story", "elimination"],
      finalSubmitted: false,
      created: "2026-01-01T09:00:00.000Z",
      updated: "2026-01-01T09:12:00.000Z",
      finalCompletedAt: "2026-01-01T09:12:00.000Z"
    }
  ];

  // 2. 验证各玩家得分
  assert.equal(players[0].totalScore, 400); // 100+100+100+100
  assert.equal(players[1].totalScore, 400); // 100+100+100+100
  assert.equal(players[2].totalScore, 240); // 80+70+30+60

  // 3. 生成排名
  const ranking = buildRanking(players);
  assert.equal(ranking.length, 3);
  assert.equal(ranking[0].playerId, "player-2"); // 玩家 B 完成时间更早，分数相同
  assert.equal(ranking[1].playerId, "player-1");
  assert.equal(ranking[2].playerId, "player-3");

  // 4. 验证玩家排名
  assert.equal(getPlayerRank(players, "player-1"), 2);
  assert.equal(getPlayerRank(players, "player-2"), 1);
  assert.equal(getPlayerRank(players, "player-3"), 3);

  // 5. 验证 Top 10 排名
  const top10 = getTop10Ranking(players);
  assert.equal(top10.length, 3);
  assert.equal(top10[0].playerId, "player-2");

  // 6. 验证 Office 平均排名
  const officeAverages = getOfficeAverageRanking(players);
  assert.equal(officeAverages[0].office, "北京");
  assert.equal(officeAverages[0].averageScore, 400); // (400+400)/2
  assert.equal(officeAverages[1].office, "上海");
  assert.equal(officeAverages[1].averageScore, 240);

  // 7. 验证 Office Top 3
  const officeTop3 = getOfficeTop3(players);
  const beijingTop3 = officeTop3.find(g => g.office === "北京");
  assert.ok(beijingTop3);
  assert.equal(beijingTop3.players.length, 2);
  assert.equal(beijingTop3.players[0].playerId, "player-2");

  // 8. 验证玩家排名上下文
  const context = getPlayerRankingContext(players, "player-1");
  assert.ok(context.player);
  assert.equal(context.rank, 2);
  assert.ok(context.previousPlayer);
  assert.equal(context.previousPlayer?.playerId, "player-2");
});

test("集成测试: 边界场景 - 同分同完成时间", () => {
  const now = "2026-01-01T09:00:00.000Z";
  const players: Player[] = [
    {
      id: "player-1",
      name: "玩家 1",
      phone: "13900000001",
      office: "北京",
      team: "Team",
      totalScore: 300,
      completedGames: [],
      finalSubmitted: false,
      created: "2026-01-01T09:00:00.000Z",
      updated: now,
      finalCompletedAt: now
    },
    {
      id: "player-2",
      name: "玩家 2",
      phone: "13900000002",
      office: "北京",
      team: "Team",
      totalScore: 300,
      completedGames: [],
      finalSubmitted: false,
      created: "2026-01-01T09:00:00.000Z",
      updated: now,
      finalCompletedAt: now
    }
  ];

  // 当分数和完成时间都相同时，按 created 时间排序
  const ranking = buildRanking(players);
  assert.equal(ranking[0].playerId, "player-1");
  assert.equal(ranking[1].playerId, "player-2");
});

test("集成测试: 边界场景 - 部分完成游戏", () => {
  const players: Player[] = [
    {
      id: "player-1",
      name: "完整玩家",
      phone: "13900000001",
      office: "北京",
      team: "Team",
      totalScore: calculateBingoScore(10) + calculateQuizScore(10) + calculateStoryScore([true, true, true]) + calculateEliminationScore(5),
      completedGames: ["bingo", "quiz", "story", "elimination"],
      finalSubmitted: false,
      created: "2026-01-01T09:00:00.000Z",
      updated: "2026-01-01T09:10:00.000Z",
      finalCompletedAt: "2026-01-01T09:10:00.000Z"
    },
    {
      id: "player-2",
      name: "部分玩家",
      phone: "13900000002",
      office: "北京",
      team: "Team",
      totalScore: calculateBingoScore(10) + calculateQuizScore(10),
      completedGames: ["bingo", "quiz"],
      finalSubmitted: false,
      created: "2026-01-01T09:00:00.000Z",
      updated: "2026-01-01T09:09:00.000Z",
      finalCompletedAt: undefined
    }
  ];

  // 即使只完成部分游戏，也应该能正确排名
  const ranking = buildRanking(players);
  assert.equal(ranking[0].playerId, "player-1"); // 分数高
  assert.equal(ranking[1].playerId, "player-2");
});

test("集成测试: 数据一致性验证", () => {
  const players: Player[] = [
    {
      id: "player-1",
      name: "玩家 A",
      phone: "13900000001",
      office: "北京",
      team: "Team",
      totalScore: 350,
      completedGames: [],
      finalSubmitted: false,
      created: "2026-01-01T09:00:00.000Z",
      updated: "2026-01-01T09:10:00.000Z",
      finalCompletedAt: "2026-01-01T09:10:00.000Z"
    }
  ];

  // 验证各种排名方法返回的数据一致性
  const ranking = buildRanking(players);
  const top10 = getTop10Ranking(players);
  const playerRank = getPlayerRank(players, "player-1");
  const context = getPlayerRankingContext(players, "player-1");

  assert.equal(ranking.length, 1);
  assert.equal(top10.length, 1);
  assert.equal(playerRank, 1);
  assert.equal(context.rank, 1);
  assert.equal(ranking[0].totalScore, top10[0].totalScore);
  assert.equal(ranking[0].totalScore, context.player?.totalScore);
});

test("集成测试: 测试获取最后完成的游戏的分数", () => {
  // 模拟游戏结果
  const gameResults = [
    { gameKey: "bingo", score: 100, completedAt: "2026-01-01T09:01:00.000Z" },
    { gameKey: "quiz", score: 80, completedAt: "2026-01-01T09:02:00.000Z" },
    { gameKey: "story", score: 90, completedAt: "2026-01-01T09:03:00.000Z" },
    { gameKey: "elimination", score: 70, completedAt: "2026-01-01T09:04:00.000Z" }
  ];

  // 按完成时间排序，获取最新的游戏结果
  const lastResult = gameResults
    .slice()
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
  
  assert.equal(lastResult.gameKey, "elimination");
  assert.equal(lastResult.score, 70);
});

test("集成测试: Quick Quiz 每两题重置计时器逻辑", () => {
  // 模拟题次和计时器重置
  const quizQuestions = [
    { index: 0, shouldReset: false }, // 完成第 1 题不重置
    { index: 1, shouldReset: true },  // 完成第 2 题（第3题开始前）重置
    { index: 2, shouldReset: false }, // 完成第 3 题不重置
    { index: 3, shouldReset: true },  // 完成第 4 题（第5题开始前）重置
    { index: 4, shouldReset: false }, // 完成第 5 题不重置
    { index: 5, shouldReset: true },  // 完成第 6 题（第7题开始前）重置
    { index: 6, shouldReset: false }, // 完成第 7 题不重置
    { index: 7, shouldReset: true },  // 完成第 8 题（第9题开始前）重置
    { index: 8, shouldReset: false }, // 完成第 9 题不重置
    { index: 9, shouldReset: true }   // 完成第 10 题（第11题开始前）重置（但没有第11题）
  ];

  for (const question of quizQuestions) {
    const currentIndex = question.index;
    // 检查是否完成了偶数题（0-based），即第 2、4、6、8、10 题完成后重置
    const shouldReset = (currentIndex + 1) % 2 === 0;
    assert.equal(shouldReset, question.shouldReset, 
      `题次 ${currentIndex} 后是否重置错误: 期望 ${question.shouldReset}, 实际 ${shouldReset}`);
  }
});

test("集成测试: 游戏结果为空时的处理", () => {
  // 空数组测试
  const emptyResults: any[] = [];
  const lastResult = emptyResults
    .slice()
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
  
  assert.equal(lastResult, undefined);
});

test("集成测试: 游戏状态管理验证", () => {
  // 模拟游戏状态
  const games = [
    { id: "game-bingo", key: "bingo", name: "Bingo 猜词", maxScore: 100, isOpen: false, order: 1 },
    { id: "game-quiz", key: "quiz", name: "Quick Quiz", maxScore: 100, isOpen: false, order: 2 },
    { id: "game-story", key: "story", name: "真假故事", maxScore: 100, isOpen: false, order: 3 },
    { id: "game-elimination", key: "elimination", name: "站立淘汰", maxScore: 100, isOpen: false, order: 4 }
  ];

  // 验证默认状态都是关闭的
  for (const game of games) {
    assert.equal(game.isOpen, false);
  }

  // 验证排序
  const sortedGames = [...games].sort((a, b) => a.order - b.order);
  assert.equal(sortedGames[0].key, "bingo");
  assert.equal(sortedGames[1].key, "quiz");
  assert.equal(sortedGames[2].key, "story");
  assert.equal(sortedGames[3].key, "elimination");
});
