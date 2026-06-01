# 快速开始指南

## 前置条件

- [ ] Node.js 18+
- [ ] npm 或 yarn

---

## 本地开发模式（无后端）

### 1. 安装依赖

```bash
npm install
```

### 2. 启动应用

```bash
npm run dev
```

访问 http://localhost:3000

---

## 多设备同步模式（PocketBase）

### 1. 下载 PocketBase

访问 https://github.com/pocketbase/pocketbase/releases/latest

下载对应你的系统的版本，解压后将 pocketbase.exe 放到项目根目录 `f:\HS\`

### 2. 启动 PocketBase

Windows:
```bash
# 双击运行 QUICK_START_POCKETBASE.bat
```

或者手动运行：
```bash
.\pocketbase.exe serve --http=0.0.0.0:8090
```

### 3. 配置 PocketBase

详细步骤见 `POCKETBASE_SETUP.md`

快速步骤：
1. 访问 http://127.0.0.1:8090/_/
2. 创建 admin 账户
3. 创建 3 个 collections（players, game_results, games）
4. 在 games collection 中初始化 4 条记录
5. 所有 API Rules 设为 Everyone

### 4. 启动 Next.js

```bash
npm run dev
```

访问 http://localhost:3000

---

## 网络访问配置

如果需要在本地网络内的其他设备访问（例如手机）：

### 1. 启动 PocketBase 监听所有网卡

```bash
.\pocketbase.exe serve --http=0.0.0.0:8090
```

### 2. 修改 .env 中的 URL

```env
NEXT_PUBLIC_POCKETBASE_URL=http://你的IP:8090
```

### 3. 获取你的 IP 地址

```bash
ipconfig
```

找到 IPv4 Address，例如：`192.168.71.30`

### 4. 手机访问

手机连接同WiFi，访问：
- http://你的IP:3000
- http://你的IP:8090/_/ (后台)

---

## 常见问题

### Q: 端口被占用？

A: 3000 或 8090 被占用时，PocketBase 会尝试使用其他端口。修改 .env 中的 URL 即可。

### Q: PocketBase 不可用时怎么办？

A: 系统会自动降级到 localStorage 模式，不会影响开发和演示。

### Q: 如何重置数据？

A: 
1. 删除 `pb_data/` 文件夹（重置 PocketBase）
2. 清除浏览器 localStorage（重置本地模式）

---

## 文件说明

```
f:\HS\
├── POCKETBASE_SETUP.md   # 详细部署指南
├── QUICK_START.md        # 本文档
├── QUICK_START_POCKETBASE.bat   # Windows 启动脚本
└── QUICK_START_POCKETBASE.ps1    # PowerShell 启动脚本
```

---

## 下一步

- 需要完整的部署指南 → 阅读 `POCKETBASE_SETUP.md`
- 需要了解如何配置 collections → 阅读 `POCKETBASE_SETUP.md`
- 需要了解架构 → 阅读 README.md
