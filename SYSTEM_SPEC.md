# 年会互动游戏系统 SPEC 3.0

> 基于 2026-06-04 代码审查生成，反映系统当前真实状态。

---

## 1. 系统概述

### 1.1 项目定位
年会现场互动游戏系统，支持多用户手机端参与、后台实时控制、大屏实时展示。

### 1.2 技术栈
| 层级 | 技术 | 版本 |
|------|------|------|
| 前端框架 | Next.js (App Router) | ^16.2.6 |
| UI 框架 | React | ^19.2.6 |
| 后端/数据库 | PocketBase | ^0.27.0 |
| 样式 | CSS Variables + Tailwind CSS 4 | ^4.3.0 |
| 语言 | TypeScript | ^6.0.3 |
| 运行时 | Node.js | — |

### 1.3 部署架构
```
手机浏览器 ──→ Next.js (localhost:3000) ──→ PocketBase (localhost:8090)
大屏浏览器 ──→ Next.js                    ──→ PocketBase
后台控制台 ──→ Next.js                    ──→ PocketBase
```
- Next.js 通过 `--hostname 0.0.0.0` 绑定所有网卡，局域网设备通过 IP 访问
- PocketBase 通过 `--http 0.0.0.0:8090` 绑定所有网卡
- `.env.local` 中 `NEXT_PUBLIC_POCKETBASE_URL` 配置 PocketBase 地址

---

## 2. 数据模型

### 2.1 核心类型定义（types/index.ts）

#### GameKey
```typescript
type GameKey = "bingo" | "quiz" | "story" | "elimination";
```

#### Player
```typescript
type Player = {
  id: string;
  name: string;
  phone: string;          // 11位手机号，唯一标识
  office: string;         // 北京/上海/深圳/香港
  team: string;           // Alpha/Beta/Gamma/Delta
  totalScore: number;     // 总分（满分400）
  completedGames: GameKey[];  // 已完成的游戏列表
  finalSubmitted: boolean;    // 所有4个游戏是否全部完成
  created: string;
  updated: string;
  finalCompletedAt?: string; // 全部完成的时间戳
};
```

#### BingoPhase（Bingo 三阶段模型）
```typescript
type BingoPhase = "open" | "auto_score" | "closed";
```
| 阶段 | 含义 | 用户行为 |
|------|------|---------|
| `open` | 正常开放 | 提交后 pendingBingoScore=true，等待 Boss 判分 |
| `auto_score` | Boss 发言完成 | 已等待用户统一判分；后续用户提交后立即自动判分 |
| `closed` | 完全关闭 | 未完成用户不可再进入或提交 |

#### Game
```typescript
type Game = {
  id: string;
  key: GameKey;
  name: string;
  maxScore: number;           // 各游戏满分100
  isOpen: boolean;            // 游戏是否开放
  order: number;              // 显示顺序 1-4
  bingoScored?: boolean;      // [仅bingo] Boss是否已判分（仅后台展示用）
  bingoPhase?: BingoPhase;    // [仅bingo] 三阶段状态
  quizCurrentGroup?: number;  // [仅quiz] 当前题组编号
  quizOpenGroups?: number[];  // [仅quiz] 已开放的题组索引列表
};
```

#### Question
```typescript
type Question = {
  id: string;
  gameKey: GameKey;
  type: "word" | "single" | "boolean" | "story";
  title: string;
  options?: string[];
  correctAnswer: string | string[];
  score: number;
  order: number;
  isActive: boolean;
  sectorKey?: string;          // [仅quiz] 所属Sector标识
  sectorName?: string;         // [仅quiz] Sector显示名
  quizSessionIndex?: number;   // [仅quiz] 所属题组索引(0-4)
};
```

#### GameResult
```typescript
type GameResult = {
  id: string;
  player: string;              // player.id
  gameKey: GameKey;
  answers: Record<string, unknown>;
  score: number;
  maxScore: number;
  completedAt: string;
  pendingBingoScore?: boolean; // [仅bingo] 是否等待Boss判分
  quizSessionIndex?: number;   // [仅quiz] 题组索引
  sectorKey?: string;
  sectorName?: string;
};
```

#### QuizProgress
```typescript
type QuizProgress = {
  completedCount: number;      // 已完成题组数
  totalCount: 5;               // 总题组数
  score: number;               // Quiz累计得分
  maxScore: 100;
  openGroups: number[];        // 后台已开放的题组
  availableGroups: number[];   // 可答题的题组（已开放且未完成）
  completedGroups: number[];   // 已完成的题组
};
```

### 2.2 PocketBase Collections

| Collection | 字段 | 说明 |
|------------|------|------|
| `players` | name, phone, office, team, totalScore, completedGames(JSON), finalSubmitted, finalCompletedAt | 玩家信息 |
| `games` | key, name, maxScore, isOpen, order, bingoScored, bingoPhase, quizCurrentGroup, quizOpenGroups(JSON) | 游戏配置 |
| `game_results` | player, gameKey, answers(JSON), score, maxScore, completedAt, pendingBingoScore, quizSessionIndex, sectorKey, sectorName | 游戏结果 |
| `questions` | gameKey, type, title, options(JSON), correctAnswer, score, order, isActive, sectorKey, sectorName, quizSessionIndex | 题目数据 |

---

## 3. 游戏流程

### 3.1 游戏总览

| # | 游戏 | 满分 | 题型 | 题数 | 特殊机制 |
|---|------|------|------|------|---------|
| 1 | Bingo 猜词 | 100 | 选词 | 30词选9 | 三阶段判分（open→auto_score→closed） |
| 2 | Sector Quiz | 100 | 单选 | 10题(5组×2题) | 后台逐组开启，每组60秒倒计时 |
| 3 | 真假故事 | 100 | 选择 | 2题 | 每题50分，从3个故事中选假故事 |
| 4 | 站立淘汰 | 100 | 单选 | 5题 | 答错即淘汰，每题20分 |

### 3.2 Bingo 猜词流程

```
用户进入 → 选择9个词 → 提交
                              │
              ┌───────────────┼───────────────┐
              │ bingoPhase    │               │
              ▼               ▼               ▼
           open          auto_score       closed
    pendingBingoScore   立即判分          禁止提交
    =true              completedGames    显示"已结束"
    显示等待Boss       +bingo
    发言弹窗
              │               │
              ▼               │
    后台点击"完成Boss ────────┘
    发言并开启自动判分"
    → 所有pending用户统一判分
    → bingoPhase=auto_score
```

**核心原则**：用户是否完成Bingo，只看 `player.completedGames.includes("bingo")`，不用全局 `bingoScored` 或 `game.isOpen` 判断。

### 3.3 Sector Quiz 流程

```
后台控制台：逐个开启 Sector 1-5
                    │
用户进入 Quiz 页面 → 看到5个Sector列表
                    │
    ┌───────────────┼───────────────┐
    │ 已开放且未完成  │ 未开放        │ 已完成
    ▼               ▼               ▼
  "进入答题"      "等待主持人开启"  "已完成"
    │
    ▼
  进入答题 → 2题/组 → 60秒倒计时
    │
    ├── 答完2题 → 提交 → 显示ResultModal
    │
    └── 倒计时结束 → 自动提交
```

**关键逻辑**：
- `quizOpenGroups` 数组控制哪些Sector已开放
- 用户按自己节奏答题，不强制同步后台当前组
- 后台 `quizCurrentGroup` 仅记录已推进到第几组

### 3.4 真假故事流程

```
用户进入 → 第1题（同事A的假故事）→ 选择 → 下一题
         → 第2题（同事B的假故事）→ 选择 → 提交
         → 显示ResultModal
```

- 2道题，每题50分，满分100
- 从3个选项中选出假故事

### 3.5 站立淘汰流程

```
用户进入 → 第1题 → 答对 → 下一题 → ... → 全部答对 → 完成
                  → 答错 → 立即淘汰 → 提交结果 → 查看最终成绩
```

- 5题，每题20分，答错即淘汰
- 淘汰后直接跳转最终成绩页

---

## 4. 页面结构

### 4.1 页面路由

| 路由 | 页面 | 说明 |
|------|------|------|
| `/` | 首页 | Landing page，展示系统入口 |
| `/register` | 注册页 | 手机号注册/恢复，隐藏左右按钮 |
| `/lobby` | 活动大厅 | 游戏列表、进度、分数面板 |
| `/game/bingo` | Bingo 猜词 | 选词、提交、等待/结果弹窗 |
| `/game/quiz` | Sector Quiz | 5组答题、倒计时 |
| `/game/story` | 真假故事 | 2道选择假故事题 |
| `/game/elimination` | 站立淘汰 | 答错即淘汰 |
| `/result` | 最终成绩 | 总分、排名、TOP10、地区统计 |
| `/ranking` | 排行榜 | 用户排名置顶、TOP10、地区统计 |
| `/screen` | 大屏展示 | 实时排行榜、3秒刷新 |
| `/admin-control` | 后台控制台 | 游戏开关、Bingo控制、Quiz控制 |

### 4.2 页面详细说明

#### /register（注册页）
- 页面加载时先检查 localStorage 登录状态
- 已注册用户自动跳转 `/lobby`
- 手机号已存在时自动恢复用户（不报错）
- 隐藏左上和右上导航按钮

#### /lobby（活动大厅）
- 顶部：用户信息 + 完成进度 (x/4)
- ScorePanel：本轮得分、总分、排名
- 进度条
- 游戏卡片列表（4个游戏）

**GameCard 状态逻辑**：

| 游戏 | 条件 | 状态 | 可进入 |
|------|------|------|--------|
| Bingo | completedGames含bingo | 已完成 | 否 |
| Bingo | pendingBingoScore=true | 等待Boss发言 | 是 |
| Bingo | bingoPhase=open且isOpen | 未完成 | 是 |
| Bingo | bingoPhase=auto_score | 未完成 | 是 |
| Bingo | bingoPhase=closed | 已结束 | 否 |
| Quiz | completedCount>=5 | 已完成 | 否 |
| Quiz | availableGroups.length>0 | 继续答题 | 是 |
| Quiz | 无可用题组 | 未开放 | 否 |
| 其他 | completedGames含该key | 已完成 | 否 |
| 其他 | isOpen=true | 未开始 | 是 |
| 其他 | isOpen=false | 未开放 | 否 |

#### /game/bingo（Bingo 猜词）
- 30个词库，选9个组成3×3宫格
- `bingoPhase=open`：提交后 pendingBingoScore=true，显示 WaitingModal
- `bingoPhase=auto_score`：顶部提示"Boss发言已完成"，提交后立即判分
- `bingoPhase=closed`：未完成用户显示"Bingo已结束"
- 已完成用户显示 ResultModal
- 等待期间每秒轮询判分结果

#### /game/quiz（Sector Quiz）
- 5个Sector列表，每个Sector含2题
- 只有后台已开放的Sector才可进入
- 进入后60秒倒计时，答完2题或倒计时结束自动提交
- 每组提交后显示 ResultModal
- 全部完成后显示 Quiz 总分

#### /game/story（真假故事）
- 2道题，每题3个选项
- 逐题作答，全部完成后提交
- 每题50分

#### /game/elimination（站立淘汰）
- 5道单选题
- 答对进入下一题，答错立即淘汰
- 淘汰后跳转最终成绩页

#### /result（最终成绩）
- 顶部：总分 + 排名 + 用户信息
- 未完成游戏提示
- 距离TOP10差距
- TOP10排行榜
- 地区平均分
- 各地区TOP3

#### /ranking（排行榜）
- 用户排名置顶（名字72px，名次72px）
- TOP10排行榜
- 地区平均分排名
- 各地区TOP3

#### /screen（大屏展示）
- 3秒自动刷新
- 实时排行榜TOP10
- 地区平均分
- 各地区TOP3
- 背景色 #063125（与其他页面一致）

#### /admin-control（后台控制台）
- 参与人数/结果记录/已完成统计
- 游戏开关（4个游戏的开/关切换）
- Bingo控制区：
  - 当前阶段 + 完成/等待人数
  - "完成Boss发言并开启自动判分"按钮
  - "完全关闭Bingo"按钮
- Sector Quiz控制区：
  - 5个Sector，每个显示：状态 + 完成人数 + 题目列表 + 开启/关闭按钮
- 数据导出：生成JSON / 重置DEMO数据

---

## 5. 模块架构

### 5.1 文件结构

```
f:\HS\
├── app/
│   ├── globals.css              # 全局样式（深绿色主题）
│   ├── layout.tsx               # 根布局
│   ├── page.tsx                 # 首页
│   ├── register/page.tsx        # 注册页
│   ├── lobby/page.tsx           # 活动大厅
│   ├── game/
│   │   ├── bingo/page.tsx       # Bingo 猜词
│   │   ├── quiz/page.tsx        # Sector Quiz
│   │   ├── story/page.tsx       # 真假故事
│   │   └── elimination/page.tsx # 站立淘汰
│   ├── result/page.tsx          # 最终成绩
│   ├── ranking/page.tsx         # 排行榜
│   ├── screen/page.tsx          # 大屏展示
│   └── admin-control/page.tsx   # 后台控制台
├── components/
│   ├── Layout.tsx               # 页面布局（顶部导航）
│   ├── GameCard.tsx             # 游戏卡片（状态判断）
│   ├── ScorePanel.tsx           # 分数面板
│   ├── ResultModal.tsx          # 结果弹窗
│   ├── WaitingModal.tsx         # 等待弹窗
│   ├── EliminationModal.tsx     # 淘汰弹窗
│   ├── Countdown.tsx            # 倒计时组件
│   ├── RankingTable.tsx         # 排行表格
│   ├── OfficeAverageTable.tsx   # 地区平均分表格
│   └── OfficeTop3Panel.tsx      # 地区TOP3面板
├── hooks/
│   └── use-game-data.ts         # 所有React Hooks
├── lib/
│   ├── constants.ts             # 常量、初始数据、题目
│   ├── types/index.ts           # 类型定义（→ types/）
│   ├── pocketbase.ts            # PocketBase客户端
│   ├── pb-storage.ts            # PocketBase存储层（主）
│   ├── storage.ts               # localStorage存储层（备用）
│   ├── scoring.ts               # 评分计算
│   ├── scoring.test.ts          # 评分测试
│   ├── ranking.ts               # 排名计算
│   └── game-state.ts            # 纯函数状态处理
├── types/
│   └── index.ts                 # 类型定义
├── pocketbase.exe               # PocketBase可执行文件
├── pb_data/                     # PocketBase数据目录
├── scripts/                     # 辅助脚本
├── .env.local                   # 环境变量
└── next.config.js               # Next.js配置
```

### 5.2 模块职责

| 模块 | 职责 | 关键文件 |
|------|------|---------|
| 类型系统 | 所有TypeScript类型定义 | `types/index.ts` |
| 常量配置 | 游戏配置、题目数据、种子数据 | `lib/constants.ts` |
| PocketBase存储 | 数据CRUD、业务逻辑 | `lib/pb-storage.ts` |
| localStorage存储 | 离线备用方案 | `lib/storage.ts` |
| 评分系统 | 各游戏分数计算 | `lib/scoring.ts` |
| 排名系统 | 排行榜、地区统计 | `lib/ranking.ts` |
| 状态处理 | 纯函数状态转换 | `lib/game-state.ts` |
| React Hooks | 数据获取、状态管理 | `hooks/use-game-data.ts` |
| 页面组件 | 各页面UI和交互 | `app/*/page.tsx` |
| 通用组件 | 可复用UI组件 | `components/*.tsx` |

---

## 6. 核心业务逻辑

### 6.1 评分规则

| 游戏 | 计算函数 | 规则 |
|------|---------|------|
| Bingo | `calculateBingoScore(correctCount)` | 每个正确词10分，满分100 |
| Quiz | `calculateQuizScore(correctCount)` | 每题10分，满分100 |
| Story | `calculateStoryScore(results[])` | 每题50分，满分100 |
| Elimination | `calculateEliminationScore(correctCount)` | 每题20分，满分100 |

### 6.2 提交游戏结果（submitGameResult）

```
submitGameResult(input)
│
├── gameKey === "bingo"
│   ├── 已完成 → 拒绝重复提交
│   ├── 已有pending记录 → 拒绝重复提交
│   ├── bingoPhase === "closed" → 拒绝提交
│   ├── bingoPhase === "open" → pendingBingoScore=true，不更新player
│   └── bingoPhase === "auto_score" → 立即判分，更新player
│
├── gameKey === "quiz"
│   ├── 题组未开放 → 拒绝提交
│   ├── 题组已完成 → 拒绝重复提交
│   └── 正常提交 → 更新player
│
└── 其他游戏
    ├── 游戏未开放 → 拒绝提交
    ├── 已有结果 → 拒绝重复提交
    └── 正常提交 → 更新player
```

### 6.3 Bingo 判分流程（triggerBingoScore / completeBossAndEnableAutoScore）

```
1. 找到所有 pendingBingoScore=true 的 Bingo 记录
2. 将这些记录的 pendingBingoScore 设为 false
3. 重新计算这些用户的 completedGames、totalScore、finalSubmitted
4. 更新 Bingo game：bingoPhase="auto_score", isOpen=false
5. 同步到 PocketBase
```

### 6.4 Quiz 题组管理

```
openQuizGroup(index)  → quizOpenGroups 增加 index，isOpen=true
closeQuizGroup(index) → quizOpenGroups 移除 index，若为空则 isOpen=false
```

### 6.5 用户完成判断

```typescript
// 判断用户是否完成某游戏
function isGameCompleted(player: Player, gameKey: GameKey): boolean {
  if (gameKey === "quiz") {
    // Quiz需要5个题组全部完成
    return completedQuizGroups.size >= 5;
  }
  return player.completedGames.includes(gameKey);
}

// 判断用户是否全部完成
function isAllCompleted(player: Player): boolean {
  return GAME_ORDER.every(key => player.completedGames.includes(key));
}
```

---

## 7. 数据同步机制

### 7.1 前端轮询

| Hook | 刷新间隔 | 用途 |
|------|---------|------|
| `useAppState` | 500ms | 全局状态刷新 |
| `useCurrentPlayer` | 500ms | 当前用户信息 |
| `useLobbySnapshot` | 500ms | 大厅数据 |
| `useRanking` | 1500-3000ms | 排行榜数据 |
| `useGameStatus` | 500ms | 游戏开放状态 |

### 7.2 事件驱动

```typescript
// 状态变更时触发事件
window.dispatchEvent(new Event("annual-game-state-change"));

// subscribeToState 监听事件
subscribeToState(callback);
```

### 7.3 PocketBase 自动取消

```typescript
// 全局禁用自动取消，避免轮询冲突
pb.autoCancellation(false);
```

### 7.4 后台操作后刷新

```typescript
// 后台操作后连续刷新3次，确保数据同步
async function refreshMultiple(times = 3) {
  for (let i = 0; i < times; i++) {
    await refresh();
    await new Promise(resolve => setTimeout(resolve, 200));
  }
}
```

---

## 8. 用户认证与恢复

### 8.1 localStorage 键

| Key | 用途 |
|-----|------|
| `annual_game_player_id_v2` | 当前用户ID |
| `annual_game_player_phone_v2` | 当前用户手机号 |
| `annual_game_player_cache_v2` | 用户信息缓存（JSON） |

### 8.2 注册/恢复流程

```
用户扫码进入 /register
│
├── 检查 localStorage
│   ├── 有 playerId → 查 PocketBase
│   │   ├── 找到 → 自动跳转 /lobby
│   │   └── 未找到 → 按 phone 查找
│   │       ├── 找到 → 恢复 → 跳转 /lobby
│   │       └── 未找到 → 清空缓存 → 显示注册表单
│   └── 无 playerId → 显示注册表单
│
└── 填写手机号提交
    ├── 手机号已存在 → 自动恢复 → 跳转 /lobby
    └── 手机号不存在 → 创建新用户 → 跳转 /lobby
```

### 8.3 兼容性

- PocketBase 可用时：以 PocketBase 数据为准
- PocketBase 不可用时：使用 localStorage 缓存兜底
- 不因 PocketBase 短暂不可用就强制用户重新注册

---

## 9. 样式系统

### 9.1 主题色

| 变量 | 值 | 用途 |
|------|-----|------|
| `--green` | #00b86a | 主绿色 |
| `--green-bright` | #40d88a | 亮绿色 |
| `--gold` | #ffd060 | 金色（排名、分数） |
| `--ink` | #ffffff | 主文字色 |
| `--muted` | #a0b5a8 | 次要文字色 |
| `--panel` | rgba(12,45,34,0.9) | 面板背景 |
| `--border` | rgba(64,216,138,0.35) | 边框色 |
| `--danger` | #ff5a5f | 危险/错误色 |

### 9.2 背景色

所有页面统一使用深绿色背景：
```css
background:
  radial-gradient(ellipse at 50% 25%, rgba(64, 216, 138, 0.2), transparent 55%),
  #063125;
```

### 9.3 字体

| 变量 | 值 | 用途 |
|------|-----|------|
| `--mono` | SF Mono, Cascadia Code, Fira Code, Courier New, monospace | 数字、标签 |
| `--sans` | PingFang SC, Microsoft YaHei UI, Segoe UI, sans-serif | 正文 |

---

## 10. 常量配置

### 10.1 游戏配置

```typescript
const GAMES: Game[] = [
  { id: "game-bingo", key: "bingo", name: "Bingo 猜词", maxScore: 100, isOpen: false, order: 1, bingoScored: false, bingoPhase: "open" },
  { id: "game-quiz", key: "quiz", name: "Sector Quiz", maxScore: 100, isOpen: false, order: 2, quizCurrentGroup: 0, quizOpenGroups: [] },
  { id: "game-story", key: "story", name: "真假故事", maxScore: 100, isOpen: false, order: 3 },
  { id: "game-elimination", key: "elimination", name: "站立淘汰", maxScore: 100, isOpen: false, order: 4 }
];
```

### 10.2 Office / Team

```typescript
const OFFICES = ["北京", "上海", "深圳", "香港"];
const TEAMS = ["Alpha", "Beta", "Gamma", "Delta"];
```

### 10.3 Quiz 配置

- 5个Sector，每个2题，每组60秒倒计时
- Sector索引：0-4
- 题组分配：`quizSessionIndex = Math.floor((order - 1) / 2)`

---

## 11. 旧数据兼容

| 场景 | 处理方式 |
|------|---------|
| 旧数据无 `bingoPhase` | 根据 `bingoScored` 推断：true→auto_score，false→open |
| 旧数据有 `bingoScored=true` | 映射为 `bingoPhase=auto_score`，但不判断所有用户已完成 |
| 旧用户无 Bingo game_result | 视为未完成，auto_score阶段可进入并自动判分 |
| 旧数据无 `quizOpenGroups` | 默认空数组 |
| 旧数据无 `quizCurrentGroup` | 默认0 |

---

## 12. 环境变量

| 变量 | 值 | 说明 |
|------|-----|------|
| `NEXT_PUBLIC_POCKETBASE_URL` | http://192.168.71.33:8090 | PocketBase地址 |

---

## 13. 关键设计决策

### 13.1 Bingo 三阶段模型
- **问题**：原来用全局 `bingoScored` 判断用户是否完成，导致Boss判分后所有用户都显示已完成
- **解决**：引入 `bingoPhase` 三阶段模型，用户完成状态只看 `completedGames`

### 13.2 Quiz 独立进度
- **问题**：新用户进入时直接跳到后台当前题组
- **解决**：用户按自己节奏答题，后台 `quizOpenGroups` 仅控制哪些组可进入

### 13.3 PocketBase 自动取消
- **问题**：轮询导致请求被自动取消
- **解决**：全局禁用 `pb.autoCancellation(false)`

### 13.4 双存储层
- `pb-storage.ts`：PocketBase模式（主）
- `storage.ts`：localStorage模式（备用）
- `storage.ts` 作为统一入口，自动检测 PocketBase 可用性并分发

### 13.5 Sector Quiz 大厅控制
- **问题**：用户在后台未开放Sector时也能进入Quiz页面
- **解决**：大厅 GameCard 根据 `availableGroups` 判断是否可进入，无可用组时显示"未开放"且不可点击

---

## 14. API 函数索引

### 14.1 存储层（pb-storage.ts / storage.ts）

| 函数 | 说明 |
|------|------|
| `checkPocketBase()` | 检查 PocketBase 是否可用 |
| `ensureGameState()` | 确保 PocketBase 中游戏数据完整 |
| `ensureCollections()` | 确保 PocketBase collections 存在 |
| `loadState()` | 加载完整应用状态 |
| `getCurrentPlayerId()` | 获取当前用户ID |
| `getCurrentPlayer()` | 获取当前用户信息 |
| `saveCurrentPlayer(player)` | 保存当前用户到 localStorage |
| `clearCurrentPlayer()` | 清除当前用户缓存 |
| `findPlayerByPhone(phone)` | 按手机号查找用户 |
| `restoreCurrentPlayerFromLocal()` | 从 localStorage 恢复用户 |
| `registerPlayer(input)` | 注册/恢复用户 |
| `validatePhone(phone)` | 验证手机号格式 |
| `getGameResult(playerId, gameKey)` | 获取游戏结果 |
| `isGameOpen(gameKey)` | 检查游戏是否开放 |
| `toggleGameOpen(gameKey)` | 切换游戏开放状态 |
| `triggerBingoScore()` | 完成Boss发言并开启自动判分 |
| `closeBingoGame()` | 完全关闭Bingo |
| `advanceQuizGroup()` | 推进Quiz题组 |
| `openQuizGroup(index)` | 开启指定Quiz题组 |
| `closeQuizGroup(index)` | 关闭指定Quiz题组 |
| `submitGameResult(input)` | 提交游戏结果 |
| `getLobbySnapshot(playerId)` | 获取大厅快照 |
| `getRankingSnapshot(playerId)` | 获取排行榜快照 |
| `resetDemoData()` | 重置演示数据 |

### 14.2 评分函数（scoring.ts）

| 函数 | 说明 |
|------|------|
| `calculateBingoScore(correctCount)` | Bingo评分：每词10分 |
| `calculateQuizScore(correctCount)` | Quiz评分：每题10分 |
| `calculateStoryScore(results[])` | Story评分：每题50分 |
| `calculateEliminationScore(correctCount)` | Elimination评分：每题20分 |

### 14.3 排名函数（ranking.ts）

| 函数 | 说明 |
|------|------|
| `buildRanking(players)` | 构建完整排名 |
| `getTop10Ranking(players)` | TOP10排名 |
| `getPlayerRank(players, playerId)` | 用户排名 |
| `getOfficeAverageRanking(players)` | 地区平均分排名 |
| `getOfficeTop3(players)` | 各地区TOP3 |
| `getPlayerRankingContext(players, playerId)` | 用户排名上下文 |

### 14.4 React Hooks（use-game-data.ts）

| Hook | 说明 |
|------|------|
| `useAppState()` | 全局应用状态（500ms刷新） |
| `useCurrentPlayer()` | 当前用户信息（500ms刷新） |
| `useRegisterPlayer()` | 注册函数 |
| `useQuestions(gameKey)` | 题目列表 |
| `useGameStatus(gameKey)` | 游戏开放状态（500ms刷新） |
| `useSubmitGameResult()` | 提交游戏结果函数 |
| `useExistingResult(playerId, gameKey)` | 是否已有游戏结果 |
| `useLobbySnapshot(playerId)` | 大厅快照（500ms刷新） |
| `useRanking(playerId, intervalMs)` | 排行榜数据 |
| `useAdminActions()` | 后台操作函数集合 |

---

## 15. 测试

### 15.1 测试命令
```bash
npm test
# 运行 lib/scoring.test.ts, lib/business.test.ts, lib/integration.test.ts
```

### 15.2 构建命令
```bash
npm run build
# TypeScript 类型检查 + Next.js 生产构建
```

---

## 16. 启动流程

```bash
# 1. 启动 PocketBase
.\pocketbase.exe serve --http 0.0.0.0:8090

# 2. 启动 Next.js
npm run dev

# 3. 访问
# 主应用：http://localhost:3000
# 大屏：http://localhost:3000/screen
# 后台：http://localhost:3000/admin-control
# PocketBase管理：http://localhost:8090/_/
```

---

*文档版本：3.0 | 生成时间：2026-06-04 | 基于代码审查自动生成*
