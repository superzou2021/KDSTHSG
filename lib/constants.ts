import type { Game, GameKey, Player, Question } from "@/types";

export const PLAYER_ID_KEY = "annual_game_player_id_v2";
export const PLAYER_PHONE_KEY = "annual_game_player_phone_v2";
export const PLAYER_CACHE_KEY = "annual_game_player_cache_v2";
export const STATE_KEY = "annual_game_demo_state_v3";

export const OFFICES = ["北京", "上海", "深圳", "香港"];
export const TEAMS = ["Alpha", "Beta", "Gamma", "Delta"];

export const GAME_ORDER: GameKey[] = ["bingo", "quiz", "story", "elimination"];

export const GAMES: Game[] = [
  { id: "game-bingo", key: "bingo", name: "Bingo 猜词", maxScore: 100, isOpen: false, order: 1, bingoScored: false },
  { id: "game-quiz", key: "quiz", name: "Quick Quiz", maxScore: 100, isOpen: false, order: 2 },
  { id: "game-story", key: "story", name: "真假故事", maxScore: 100, isOpen: false, order: 3 },
  { id: "game-elimination", key: "elimination", name: "站立淘汰", maxScore: 100, isOpen: false, order: 4 }
];

const bingoWords = [
  "Innovation", "AI", "Growth", "Customer", "Team", "Trust", "Value", "Speed", "Quality", "Future",
  "Alpha", "Matrix", "IRR", "MOIC", "AUM", "DPI", "Fund", "Strategy", "Market", "Partner",
  "Culture", "Delivery", "Product", "Design", "Risk", "Compliance", "Data", "Insight", "Revenue", "Impact"
];

const bingoTargets = ["Innovation", "AI", "Growth", "Team", "Trust", "Alpha", "Matrix", "Data", "Impact", "Future"];

export const QUESTIONS: Question[] = [
  ...bingoWords.map((word, index) => ({
    id: `bingo-${index + 1}`,
    gameKey: "bingo" as const,
    type: "word" as const,
    title: word,
    correctAnswer: bingoTargets.includes(word) ? word : "",
    score: 10,
    order: index + 1,
    isActive: true
  })),
  ...[
    ["公司年会互动系统的现场目标人数约为？", ["100", "300", "500", "2000"], "500"],
    ["Quick Quiz 每题基础分是多少？", ["5", "10", "20", "30"], "10"],
    ["本系统推荐使用哪个轻量数据库？", ["MongoDB", "SQLite", "Oracle", "Redis"], "SQLite"],
    ["大屏默认刷新间隔是多少？", ["1 秒", "3 秒", "10 秒", "30 秒"], "3 秒"],
    ["手机号在注册中用于什么？", ["公开展示", "唯一校验", "支付", "抽奖券"], "唯一校验"],
    ["总分满分是多少？", ["100", "200", "300", "400"], "400"],
    ["排行榜排序第一优先级是？", ["姓名", "Office", "总分降序", "Team"], "总分降序"],
    ["哪个页面用于现场大屏？", ["/screen", "/admin", "/api", "/login"], "/screen"],
    ["哪个服务负责后台数据管理？", ["PocketBase", "Kafka", "Spark", "Nacos"], "PocketBase"],
    ["游戏结果是否允许重复提交？", ["允许", "不允许", "只允许两次", "由用户决定"], "不允许"]
  ].map(([title, options, answer], index) => ({
    id: `quiz-${index + 1}`,
    gameKey: "quiz" as const,
    type: "single" as const,
    title: title as string,
    options: options as string[],
    correctAnswer: answer as string,
    score: 10,
    order: index + 1,
    isActive: true
  })),
  {
    id: "story-1",
    gameKey: "story",
    type: "boolean",
    title: "第一题：今年年会互动系统支持手机扫码参与。",
    options: ["真", "假"],
    correctAnswer: "真",
    score: 30,
    order: 1,
    isActive: true
  },
  {
    id: "story-2",
    gameKey: "story",
    type: "story",
    title: "第二题：同事 A 的三个故事里，哪个是假故事？",
    options: ["A. 他曾经一天完成 12 场客户访谈", "B. 他把测试服误当生产服上线", "C. 他用 Excel 做过一版完整排行榜"],
    correctAnswer: "B. 他把测试服误当生产服上线",
    score: 30,
    order: 2,
    isActive: true
  },
  {
    id: "story-3",
    gameKey: "story",
    type: "story",
    title: "第三题：同事 B 的三个故事里，哪个是假故事？",
    options: ["A. 她负责过 500 人现场活动", "B. 她把二维码印在胸牌背面", "C. 她在大屏上展示完整手机号"],
    correctAnswer: "C. 她在大屏上展示完整手机号",
    score: 30,
    order: 3,
    isActive: true
  },
  ...[
    ["站立淘汰：活动大屏不应展示什么？", ["姓名", "Office", "Team", "手机号"], "手机号"],
    ["站立淘汰：四个游戏全部完成后进入哪里？", ["最终成绩", "注册页", "错误页", "空白页"], "最终成绩"],
    ["站立淘汰：重复提交同一游戏应如何处理？", ["禁止", "加倍得分", "覆盖成绩", "忽略排名"], "禁止"],
    ["站立淘汰：Office 平均分计算方式是？", ["总分/人数", "最高分", "最低分", "随机数"], "总分/人数"],
    ["站立淘汰：正式数据后台优先使用？", ["PocketBase Admin", "浏览器控制台", "截图", "聊天记录"], "PocketBase Admin"]
  ].map(([title, options, answer], index) => ({
    id: `elimination-${index + 1}`,
    gameKey: "elimination" as const,
    type: "single" as const,
    title: title as string,
    options: options as string[],
    correctAnswer: answer as string,
    score: 20,
    order: index + 1,
    isActive: true
  }))
];

export const SEED_PLAYERS: Player[] = [
  { id: "seed-1", name: "李明", phone: "13900000001", office: "上海", team: "Alpha", totalScore: 360, completedGames: GAME_ORDER, finalSubmitted: true, created: "2026-01-01T09:00:00.000Z", updated: "2026-01-01T09:20:00.000Z", finalCompletedAt: "2026-01-01T09:20:00.000Z" },
  { id: "seed-2", name: "刘洋", phone: "13900000002", office: "北京", team: "Beta", totalScore: 330, completedGames: GAME_ORDER, finalSubmitted: true, created: "2026-01-01T09:01:00.000Z", updated: "2026-01-01T09:23:00.000Z", finalCompletedAt: "2026-01-01T09:23:00.000Z" },
  { id: "seed-3", name: "周琳", phone: "13900000003", office: "深圳", team: "Gamma", totalScore: 310, completedGames: GAME_ORDER, finalSubmitted: true, created: "2026-01-01T09:02:00.000Z", updated: "2026-01-01T09:18:00.000Z", finalCompletedAt: "2026-01-01T09:18:00.000Z" },
  { id: "seed-4", name: "陈一", phone: "13900000004", office: "香港", team: "Delta", totalScore: 280, completedGames: ["bingo", "quiz", "story"], finalSubmitted: false, created: "2026-01-01T09:03:00.000Z", updated: "2026-01-01T09:18:00.000Z" }
];
