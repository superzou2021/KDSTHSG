# PocketBase 部署指南

## 1. 下载 PocketBase

访问 https://github.com/pocketbase/pocketbase/releases/latest 下载最新版本的 PocketBase。

选择与你操作系统对应的版本：
- Windows: `pocketbase_X.X.X_windows_amd64.zip`
- Mac: `pocketbase_X.X.X_darwin_amd64.zip` 或 `pocketbase_X.X.X_darwin_arm64.zip`
- Linux: `pocketbase_X.X.X_linux_amd64.zip`

## 2. 解压并启动 PocketBase

### 方法一：使用脚本（推荐）

Windows:
```bash
# 双击运行 QUICK_START_POCKETBASE.bat
```

或者使用 PowerShell:
```bash
.\pocketbase.exe serve --http=0.0.0.0:8090
```

### 方法二：手动启动

解压后，将 `pocketbase.exe` 放到项目根目录 `f:\HS\`，然后运行：

```bash
pocketbase.exe serve --http=0.0.0.0:8090
```

## 3. 配置 Admin 账户

启动后，在浏览器中访问：http://127.0.0.1:8090/_/

点击 "Create admin" 创建管理员账户。

## 4. 创建 Collections

### Collection 1: players

点击 "New Collection" → 选择 "Base collection"

**Collection name**: `players`

添加以下字段：

| Field name | Type | Options |
|------------|------|---------|
| `name` | Text | Required |
| `phone` | Text | Required, Unique |
| `office` | Text | Required |
| `team` | Text | Required |
| `totalScore` | Number | Required, Min: 0 |
| `completedGames` | JSON | Required |
| `finalSubmitted` | Bool | Required |
| `finalCompletedAt` | Text | Not required |

**API Rules**: 全部设为 `Everyone` (List/View/Create/Update/Delete)

---

### Collection 2: game_results

点击 "New Collection" → 选择 "Base collection"

**Collection name**: `game_results`

添加以下字段：

| Field name | Type | Options |
|------------|------|---------|
| `player` | Text | Required |
| `gameKey` | Select | Required |
| `answers` | JSON | Required |
| `score` | Number | Required |
| `maxScore` | Number | Required |
| `completedAt` | Text | Required |

**Select options for gameKey**: `bingo`, `quiz`, `story`, `elimination`

**API Rules**: 全部设为 `Everyone` (List/View/Create/Update/Delete)

---

### Collection 3: games

点击 "New Collection" → 选择 "Base collection"

**Collection name**: `games`

添加以下字段：

| Field name | Type | Options |
|------------|------|---------|
| `key` | Text | Required |
| `name` | Text | Required |
| `maxScore` | Number | Required |
| `isOpen` | Bool | Required |
| `order` | Number | Required |

**API Rules**: 全部设为 `Everyone` (List/View/Create/Update/Delete)

---

## 5. 初始化数据

### 初始化游戏状态

在 `games` collection 中创建 4 条记录：

1. **Bingo**:
```json
{
  "key": "bingo",
  "name": "Bingo 猜词",
  "maxScore": 100,
  "isOpen": false,
  "order": 1
}
```

2. **Quiz**:
```json
{
  "key": "quiz",
  "name": "Quick Quiz",
  "maxScore": 100,
  "isOpen": false,
  "order": 2
}
```

3. **Story**:
```json
{
  "key": "story",
  "name": "真假故事",
  "maxScore": 100,
  "isOpen": false,
  "order": 3
}
```

4. **Elimination**:
```json
{
  "key": "elimination",
  "name": "站立淘汰",
  "maxScore": 100,
  "isOpen": false,
  "order": 4
}
```

---

## 6. 配置环境变量

在项目根目录创建 `.env` 文件（已自动创建）：

```env
NEXT_PUBLIC_POCKETBASE_URL=http://localhost:8090
NEXT_PUBLIC_APP_NAME=Annual Game
```

如果需要在本地网络访问，修改为：

```env
NEXT_PUBLIC_POCKETBASE_URL=http://192.168.71.30:8090
```

---

## 7. 启动 Next.js 应用

```bash
npm run dev
```

访问 http://localhost:3000 测试。

---

## 8. 测试功能

1. 访问 http://localhost:3000/admin-control
2. 点击 "开启" 任意游戏
3. 在另一个设备（手机）访问 http://你的IP:3000
4. 注册并进入游戏大厅
5. 确认游戏状态已同步更新

---

## 9. 公网部署（可选）

### 使用云服务器（腾讯云/阿里云等）

1. 买一台云服务器（2核4G以上）
2. 下载 PocketBase Linux 版本
3. 上传到服务器
4. 运行 PocketBase：

```bash
./pocketbase serve --http=0.0.0.0:8090
```

5. 使用 Nginx 或 Caddy 反向代理并配置 HTTPS
6. 修改 `.env` 中的 URL 为你的域名：

```env
NEXT_PUBLIC_POCKETBASE_URL=https://your-domain.com
```

7. 部署 Next.js 应用（Vercel 或自建）

---

## 10. 数据备份

PocketBase 的所有数据都存储在 `pb_data/` 文件夹中。

定期备份 `pb_data/` 文件夹即可。

---

## 常见问题

### Q: PocketBase 无法启动？

A: 检查 8090 端口是否被占用。如果被占用，可以修改端口：

```bash
pocketbase serve --http=0.0.0.0:9090
```

同时修改 `.env` 中的端口。

### Q: 跨设备无法同步？

A:
1. 确认所有设备在同一个网络
2. 使用 IP 地址访问，不要使用 localhost
3. 检查防火墙是否放行 8090 端口

### Q: 本地开发需要 PocketBase 吗？

A: 不需要！项目已支持自动降级。如果 PocketBase 不可用，会自动使用 localStorage，不影响本地开发。

### Q: 如何切换回 localStorage 模式？

A: 停止 PocketBase 服务即可，代码会自动降级使用 localStorage。

---

## 架构说明

### 双模式设计

```
┌─────────────────────────────────────────────────┐
│                  Next.js App                     │
├─────────────────────────────────────────────────┤
│     storage.ts (统一接口)                      │
│       /        \                               │
│   localStorage  <--- (降级) ---> PocketBase    │
└─────────────────────────────────────────────────┘
```

### 实时同步机制

- PocketBase 有数据变更时，通过 WebSocket 实时推送
- 所有连接的设备立即自动刷新 UI
- 本地开发时仍然使用 localStorage，无影响

---

## 部署检查清单

- [ ] PocketBase 服务已启动
- [ ] 3 个 collections 已创建
- [ ] 初始化数据已填充
- [ ] API Rules 已设为 Everyone
- [ ] .env 文件配置正确
- [ ] 防火墙已放行 8090 端口
- [ ] 多设备同步测试通过
- [ ] 大屏页面可以实时更新
- [ ] 后台可以正常控制游戏开关
