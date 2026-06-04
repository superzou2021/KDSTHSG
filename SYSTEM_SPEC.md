# 年会互动游戏系统 - 技术规范文档

## 1. 系统概述

### 1.1 项目背景
本系统是一个年会互动游戏平台，支持手机扫码参与多种互动游戏，包含实时排行榜、大屏展示等功能。

### 1.2 技术栈

| 分类 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 框架 | Next.js | 16.2.6 | React SSR 框架 |
| 语言 | TypeScript | 6.0.3 | 类型安全 |
| 样式 | Tailwind CSS | 4.3.0 | CSS 框架 |
| 数据库 | PocketBase | 0.27.0 | 轻量后端服务 |

### 1.3 核心特性

- **扫码注册与账号恢复**：支持自动检测已注册用户，无需重复注册
- **多游戏支持**：Bingo 猜词、Sector Quiz、真假故事、站立淘汰
- **实时同步**：500ms 轮询间隔，确保状态实时更新
- **大屏展示**：支持现场大屏实时展示排行榜和游戏状态
- **后台控制**：游戏开关、Bingo 判分、Quiz 板块控制

---

## 2. 架构设计

### 2.1 架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        前端层 (Next.js)                        │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ Register│ │  Lobby  │ │  Games  │ │ Ranking │ │  Admin  │  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │
└───────┼───────────┼───────────┼───────────┼───────────┼───────┘
        │           │           │           │           │
        ▼           ▼           ▼           ▼           ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Hooks 层                                │
│         useCurrentPlayer | useGameStatus | useLobbySnapshot    │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Storage 层                              │
│              ┌───────────────┴───────────────┐                │
│              ▼                               ▼                │
│        storage.ts                        pb-storage.ts         │
│    (统一接口)                         (PocketBase 实现)         │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    PocketBase / LocalStorage                   │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 模块职责

| 模块 | 职责 | 关键文件 |
|------|------|----------|
| **注册/恢复** | 用户注册、身份恢复 | `app/register/page.tsx` |
| **活动大厅** | 游戏入口、进度展示 | `app/lobby/page.tsx` |
| **游戏模块** | 4个游戏的核心逻辑 | `app/game/*/page.tsx` |
| **排行榜** | 个人排行、Office 排行 | `app/ranking/page.tsx` |
| **大屏展示** | 现场大屏输出 | `app/screen/page.tsx` |
| **后台控制** | 游戏开关、判分控制 | `app/admin-control/page.tsx` |
| **数据层** | 统一存储接口 | `lib/storage.ts` |
| **PB 适配** | PocketBase 实现 | `lib/pb-storage.ts` |
| **状态管理** | React Hooks | `hooks/use-game-data.ts` |

---

## 3. 数据模型

### 3.1 核心类型定义

```typescript
// Player - 用户模型
export type Player = {
  id: string;                    // 用户唯一标识
  name: string;                  // 姓名
  phone: string;                 // 手机号（唯一）
  office: string;                // Office（北京/上海/深圳/香港）
  team: string;                  // Team（Alpha/Beta/Gamma/Delta）
  totalScore: number;            // 总分
  completedGames: GameKey[];     // 已完成游戏列表
  finalSubmitted: boolean;       // 是否完成所有游戏
  created: string;               // 创建时间
  updated: string;               // 更新时间
  finalCompletedAt?: string;     // 最终完成时间
};

// Game - 游戏配置
export type Game = {
  id: string;                    // 游戏唯一标识
  key: GameKey;                  // 游戏标识
  name: string;                  // 游戏名称
  maxScore: number;              // 最高分
  isOpen: boolean;               // 是否开放
  order: number;                 // 排序顺序
  bingoScored?: boolean;         // Bingo 是否已判分
  quizCurrentGroup?: number;     // Quiz 当前板块（0-4）
};

// Question - 题目
export type Question = {
  id: string;                    // 题目ID
  gameKey: GameKey;              // 所属游戏
  type: "word" | "single" | "boolean" | "story";
  title: string;                 // 题目内容
  options?: string[];            // 选项（单选/故事题）
  correctAnswer: string | string[]; // 正确答案
  score: number;                 // 分值
  order: number;                 // 排序
  isActive: boolean;             // 是否启用
};

// GameResult - 游戏结果
export type GameResult = {
  id: string;                    // 结果ID
  player: string;                // 玩家ID
  gameKey: GameKey;              // 游戏标识
  answers: Record<string, unknown>; // 答题记录
  score: number;                 // 得分
  maxScore: number;              // 最高分
  completedAt: string;           // 完成时间
  pendingBingoScore?: boolean;   // 是否待判分（仅 Bingo）
};

// GameKey - 游戏标识
export type GameKey = "bingo" | "quiz" | "story" | "elimination";
```

### 3.2 localStorage Key 定义

| Key | 用途 | 说明 |
|-----|------|------|
| `annual_game_player_id_v2` | 当前玩家 ID | 用于快速查找 |
| `annual_game_player_phone_v2` | 当前玩家手机号 | 用于账号恢复 |
| `annual_game_player_cache_v2` | 当前玩家缓存 | JSON 格式 |
| `annual_game_demo_state_v3` | 演示数据状态 | localStorage fallback 模式 |

### 3.3 游戏配置

| 游戏 | Key | 名称 | 最高分 | 排序 |
|------|-----|------|--------|------|
| Bingo 猜词 | bingo | Bingo 猜词 | 100 | 1 |
| Sector Quiz | quiz | Sector Quiz | 100 | 2 |
| 真假故事 | story | 真假故事 | 100 | 3 |
| 站立淘汰 | elimination | 站立淘汰 | 100 | 4 |

---

## 4. 页面结构

### 4.1 页面路由

| 路径 | 页面 | 功能 | 是否需要登录 |
|------|------|------|--------------|
| `/` | 首页 | 入口页面 | 否 |
| `/register` | 注册页 | 用户注册/恢复 | 否 |
| `/lobby` | 活动大厅 | 游戏选择、进度展示 | 是 |
| `/game/bingo` | Bingo 猜词 | 选词游戏 | 是 |
| `/game/quiz` | Sector Quiz | 分组答题 | 是 |
| `/game/story` | 真假故事 | 真假判断 | 是 |
| `/game/elimination` | 站立淘汰 | 答题淘汰 | 是 |
| `/result` | 最终成绩 | 结算展示 | 是 |
| `/ranking` | 排行榜 | 个人/Office 排行 | 是 |
| `/screen` | 大屏展示 | 现场大屏 | 否 |
| `/admin-control` | 后台控制 | 游戏管理 | 否（内部） |

### 4.2 页面流程图

```
扫码 → /register 
        │
        ├─ 检查本地缓存 ──有──→ /lobby
        │
        └─ 注册表单 ──提交──→ /lobby
                               │
                               ├─ Bingo 猜词 ──完成──→ /lobby
                               │
                               ├─ Sector Quiz ──完成──→ /lobby
                               │
                               ├─ 真假故事 ──完成──→ /lobby
                               │
                               └─ 站立淘汰 ──完成──→ /result
```

---

## 5. 核心功能流程

### 5.1 注册与账号恢复流程

```
用户扫码进入 /register
        │
        ▼
┌─────────────────────┐
│ 检查本地缓存状态    │
│ (checking: true)    │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐     有缓存且有效
│ restoreCurrentPlayer│──────────────────────→ /lobby
│ FromLocal()         │
└──────────┬──────────┘
           │ 无缓存或失效
           ▼
┌─────────────────────┐
│ 显示注册表单        │
│ (checking: false)   │
└──────────┬──────────┘
           │
           ▼ 用户提交
┌─────────────────────┐
│ findPlayerByPhone() │─────已存在───→ 恢复用户 → /lobby
└──────────┬──────────┘
           │ 不存在
           ▼
┌─────────────────────┐
│ registerPlayer()    │─────创建用户 → /lobby
└─────────────────────┘
```

**关键方法说明：**

| 方法 | 功能 | 参数 | 返回值 |
|------|------|------|--------|
| `restoreCurrentPlayerFromLocal()` | 从本地恢复用户 | 无 | `Player \| null` |
| `findPlayerByPhone(phone)` | 按手机号查找用户 | `phone: string` | `Player \| null` |
| `saveCurrentPlayer(player)` | 保存当前用户到本地 | `player: Player` | `void` |
| `clearCurrentPlayer()` | 清除本地用户缓存 | 无 | `void` |

### 5.2 Bingo 猜词游戏流程

```
进入页面 → 检查游戏状态
              │
              ├─ 游戏关闭 ──→ 显示"游戏加载中" + 返回大厅
              │
              └─ 游戏开放
                    │
                    ▼
              选择9个词组成Bingo宫格
                    │
                    ▼
              提交 Bingo
                    │
                    ▼
              进入等待判分状态
                    │
                    ▼
         后台触发 Bingo 判分
                    │
                    ▼
              显示得分结果
                    │
                    ▼
              返回大厅
```

### 5.3 Sector Quiz 游戏流程

```
进入页面 → 开始对话框
              │
              ▼
         第1组（2题，60秒）
              │
              ├─ 答完或超时
              │
              ▼
         等待后台开启第2组
              │
              ├─ 后台点击"下一题组"
              │
              ▼
         第2组（2题，60秒）...
              │
              ▼
         第5组完成后提交成绩
              │
              ▼
         显示得分结果 → 返回大厅
```

**Quiz 配置：**
- 每组题目数：2 题
- 总组数：5 组
- 每组时间：60 秒
- 后台控制：管理员点击"下一题组"推进

---

## 6. 状态管理与同步

### 6.1 实时同步机制

```
┌────────────────────────────────────────────────────────────────┐
│                    状态刷新机制                                 │
├────────────────────────────────────────────────────────────────┤
│  轮询间隔：STATE_REFRESH_INTERVAL_MS = 500ms                  │
│                                                               │
│  useEffect(() => {                                            │
│    refresh();                                                 │
│    const timer = setInterval(refresh, 500);                   │
│    return () => clearInterval(timer);                         │
│  }, [refresh]);                                               │
└────────────────────────────────────────────────────────────────┘
```

### 6.2 存储层设计

**双层存储策略：**

| 模式 | 数据源 | 优先级 | 适用场景 |
|------|--------|--------|----------|
| PocketBase | 远程数据库 | 高 | 正常运行环境 |
| LocalStorage | 本地缓存 | 低 | PB 不可用时兜底 |

**存储层核心方法：**

| 方法 | 功能 | 双模式支持 |
|------|------|------------|
| `loadState()` | 加载完整状态 | ✅ |
| `saveState(state)` | 保存状态 | ✅ |
| `getCurrentPlayer()` | 获取当前用户 | ✅ |
| `registerPlayer(input)` | 注册用户 | ✅ |
| `submitGameResult(input)` | 提交游戏结果 | ✅ |
| `isGameOpen(gameKey)` | 检查游戏状态 | ✅ |
| `toggleGameOpen(gameKey)` | 切换游戏开关 | ✅ |
| `triggerBingoScore()` | 触发 Bingo 判分 | ✅ |
| `advanceQuizGroup()` | 推进 Quiz 板块 | ✅ |

---

## 7. 后台控制功能

### 7.1 后台控制面板

| 功能模块 | 说明 | 操作按钮 |
|----------|------|----------|
| 游戏开关 | 控制4个游戏的开启/关闭 | 点击开启/点击关闭 |
| Bingo 判分 | 对 Bingo 提交进行统一判分 | 触发判分 |
| Sector Quiz | 控制 Quiz 板块推进 | 下一题组 |
| 数据导出 | 导出当前状态 JSON | 生成 JSON |
| 数据重置 | 重置演示数据 | 重置 DEMO 数据 |

### 7.2 状态监控

| 监控项 | 说明 | 显示位置 |
|--------|------|----------|
| 参与人数 | 已注册玩家总数 | 顶部统计栏 |
| 结果记录 | 游戏结果总数 | 顶部统计栏 |
| 已完赛 | 完成全部4个游戏的人数 | 顶部统计栏 |
| 游戏状态 | 各游戏开放/关闭状态 | 游戏开关列表 |
| 当前板块 | Quiz 当前进行到第几板块 | Quiz 控制区 |

---

## 8. 错误处理与容错

### 8.1 自动取消机制

**问题**：PocketBase SDK 默认启用自动取消，导致并发请求冲突。

**解决方案**：在 `lib/pocketbase.ts` 中全局禁用自动取消：

```typescript
pb.autoCancellation(false);
```

### 8.2 网络容错

| 场景 | 处理策略 | 代码位置 |
|------|----------|----------|
| PB 不可用 | 切换到 localStorage fallback | `storage.ts` |
| 请求超时 | 重试 + 降级处理 | `pb-storage.ts` |
| 数据不一致 | 优先使用 PB 数据 | `loadState()` |

### 8.3 用户体验优化

| 场景 | 用户提示 | 处理方式 |
|------|----------|----------|
| 游戏关闭 | "游戏加载中,请耐心等待" | 统一显示 |
| 重复提交 | "该游戏已完成，不能重复提交" | 禁用提交按钮 |
| 账号恢复 | "欢迎回来，正在进入大厅..." | 自动跳转 |

---

## 9. 部署与配置

### 9.1 环境变量

```env
# .env.local
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
```

### 9.2 启动方式

```bash
# 开发模式
npm run dev

# 生产构建
npm run build

# 启动生产服务
npm run start

# 启动 PocketBase（Windows）
.\QUICK_START_POCKETBASE.ps1
```

### 9.3 PocketBase 配置

**集合结构**：

| 集合名 | 用途 | 对应类型 |
|--------|------|----------|
| `players` | 用户数据 | Player |
| `games` | 游戏配置 | Game |
| `questions` | 题目数据 | Question |
| `game_results` | 游戏结果 | GameResult |

---

## 10. 安全注意事项

### 10.1 数据校验

| 校验项 | 规则 | 位置 |
|--------|------|------|
| 手机号格式 | 11位数字，以1开头 | `validatePhone()` |
| 姓名过滤 | 移除 `<>` 特殊字符 | `registerPlayer()` |
| Team 过滤 | 移除 `<>` 特殊字符 | `registerPlayer()` |

### 10.2 权限控制

- **前端**：无敏感操作权限，仅展示和提交
- **后台**：通过独立路由 `/admin-control` 访问，建议内网访问

---

## 11. 验收标准

### 11.1 注册与恢复

| 场景 | 预期行为 |
|------|----------|
| 首次扫码 | 显示注册表单，注册成功后进入大厅 |
| 关闭浏览器再扫码 | 自动恢复身份，直接进入大厅 |
| 清缓存再扫码 | 显示注册表单 |
| 输入已注册手机号 | 显示"欢迎回来"，恢复身份并进入大厅 |
| 输入新手机号 | 创建新用户并进入大厅 |
| PB 不可用但有缓存 | 可进入大厅（使用本地缓存） |
| `/lobby` 无用户状态 | 自动跳回 `/register` |

### 11.2 游戏功能

| 游戏 | 验收要点 |
|------|----------|
| Bingo | 选词9个 → 提交 → 等待判分 → 显示结果 |
| Quiz | 分组答题（5组×2题）→ 每组60秒 → 后台控制推进 |
| Story | 3题真假判断 → 提交得分 |
| Elimination | 5题单选 → 提交得分 |

### 11.3 后台控制

| 功能 | 验收要点 |
|------|----------|
| 游戏开关 | 开启/关闭游戏，前端实时响应 |
| Bingo 判分 | 触发后关闭游戏，计算所有提交的得分 |
| Quiz 板块 | 点击"下一题组"推进到下一组 |

---

## 12. 项目文件结构

```
f:\HS/
├── app/                          # Next.js 页面
│   ├── admin-control/page.tsx    # 后台控制面板
│   ├── game/                     # 游戏页面
│   │   ├── bingo/page.tsx        # Bingo 猜词
│   │   ├── elimination/page.tsx  # 站立淘汰
│   │   ├── quiz/page.tsx         # Sector Quiz
│   │   └── story/page.tsx        # 真假故事
│   ├── lobby/page.tsx            # 活动大厅
│   ├── ranking/page.tsx          # 排行榜
│   ├── register/page.tsx         # 注册页面
│   ├── result/page.tsx           # 最终成绩
│   ├── screen/page.tsx           # 大屏展示
│   ├── globals.css               # 全局样式
│   └── layout.jsx                # 布局组件
├── components/                   # React 组件
│   ├── Countdown.tsx             # 倒计时组件
│   ├── GameCard.tsx              # 游戏卡片
│   ├── Layout.tsx                # 布局容器
│   ├── QuizStartModal.tsx        # Quiz 开始对话框
│   ├── ResultModal.tsx           # 结果对话框
│   ├── ScorePanel.tsx            # 分数面板
│   └── WaitingModal.tsx          # 等待对话框
├── hooks/                        # React Hooks
│   └── use-game-data.ts          # 游戏数据相关 Hooks
├── lib/                          # 工具库
│   ├── constants.ts              # 常量定义
│   ├── game-state.ts             # 游戏状态处理
│   ├── pb-storage.ts             # PocketBase 存储实现
│   ├── pocketbase.ts             # PocketBase 客户端配置
│   ├── ranking.ts                # 排行榜计算
│   ├── scoring.ts                # 得分计算
│   └── storage.ts                # 统一存储接口
├── pb_migrations/                # PocketBase 迁移脚本
├── types/                        # TypeScript 类型定义
│   └── index.ts                  # 核心类型
├── package.json                  # 项目配置
├── tsconfig.json                 # TypeScript 配置
└── tailwind.config.ts            # Tailwind 配置
```

---

**文档版本**: v1.0  
**生成日期**: 2026-06-04  
**适用项目**: alpha-matrix-h5