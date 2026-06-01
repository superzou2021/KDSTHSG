# PocketBase Collections 导入说明

## 文件说明

- `pocketbase_collections_core.json`：严格按照 SYSTEM_SPEC 中 PocketBase Collections 章节生成，包含：
  - players
  - game_results
  - games

- `pocketbase_collections_extended.json`：在 core 基础上增加 `questions` 集合，适合后续把题库从 constants.ts 迁移到 PocketBase。

- `games_seed.json`：4 个游戏的初始化数据。

- `seed_games.mjs`：通过 PocketBase JS SDK 自动写入 / 更新 games 初始化数据。

## 推荐导入方式

1. 启动 PocketBase。
2. 打开后台：`http://127.0.0.1:8090/_/`
3. 创建管理员账号。
4. 进入 Settings / Import collections。
5. 导入 `pocketbase_collections_core.json`。
6. 再执行 games 初始化脚本。

## 初始化 games 数据

在项目根目录安装 PocketBase SDK：

```bash
npm install pocketbase
```

Windows PowerShell 示例：

```powershell
$env:PB_URL="http://127.0.0.1:8090"
$env:PB_ADMIN_EMAIL="你的管理员邮箱"
$env:PB_ADMIN_PASSWORD="你的管理员密码"
node seed_games.mjs
```

## 重要说明

PocketBase 的 collections 导入只导入集合结构，不会自动导入 games 记录，所以需要单独执行 `seed_games.mjs`。
