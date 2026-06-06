# 腾讯云部署性能优化方案

## 📊 问题分析

### 主要性能瓶颈

1. **高频网络请求**
   - 轮询间隔：500ms
   - 多个组件同时轮询
   - 每个页面可能产生6-8个并发请求

2. **无请求缓存**
   - 相同数据重复请求
   - 没有请求去重机制

3. **网络延迟**
   - 本地：~1-5ms
   - 云端：~50-200ms
   - 延迟放大20-40倍

## 🚀 优化方案

### 1. 轮询间隔优化

**修改前：** 500ms
**修改后：** 2000ms (生产环境)

**效果：** 减少75%的网络请求

### 2. 请求缓存机制

- 1秒内相同请求返回缓存数据
- 全局状态管理，减少重复请求
- 自动清理过期缓存

### 3. Next.js 配置优化

- 启用压缩
- 图片优化
- SWC 压缩
- 独立输出模式

## 📝 实施步骤

### 步骤1：更新 Next.js 配置

```bash
# 替换现有配置
mv next.config.js next.config.js.backup
mv next.config.optimized.js next.config.js
```

### 步骤2：更新 Hooks 文件

```bash
# 替换现有 hooks
mv hooks/use-game-data.ts hooks/use-game-data.ts.backup
mv hooks/use-game-data.optimized.ts hooks/use-game-data.ts
```

### 步骤3：创建生产环境配置

```bash
# 创建 .env.production 文件
# 文件已创建，包含以下配置：
NEXT_PUBLIC_POCKETBASE_URL=http://124.223.202.28:8090
NEXT_PUBLIC_POLLING_INTERVAL=2000
```

### 步骤4：重新构建和部署

```bash
# 本地测试
npm run build
npm run start

# 部署到腾讯云
npm run build
# 将 .next 目录上传到服务器
# 在服务器上运行：npm run start
```

## 🌐 腾讯云服务器优化

### 1. Nginx 配置优化

```nginx
# /etc/nginx/sites-available/your-app
server {
    listen 80;
    server_name your-domain.com;

    # 启用压缩
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/json;

    # 静态资源缓存
    location /_next/static {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 图片缓存
    location /images {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # 反向代理到 Next.js
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. PM2 进程管理

```bash
# 安装 PM2
npm install -g pm2

# 启动应用
pm2 start npm --name "alpha-matrix" -- start

# 配置集群模式
pm2 start npm --name "alpha-matrix" -- start -i max

# 保存配置
pm2 save

# 开机自启
pm2 startup
```

### 3. PocketBase 优化

```bash
# 使用 systemd 管理 PocketBase
sudo nano /etc/systemd/system/pocketbase.service
```

```ini
[Unit]
Description=PocketBase Service
After=network.target

[Service]
Type=simple
User=www-data
WorkingDirectory=/path/to/your/app
ExecStart=/path/to/your/app/pocketbase serve --http=0.0.0.0:8090
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
# 启动服务
sudo systemctl enable pocketbase
sudo systemctl start pocketbase
sudo systemctl status pocketbase
```

## 📈 性能监控

### 1. 添加性能监控

```bash
# 安装监控工具
npm install --save @sentry/nextjs
```

### 2. 日志配置

```javascript
// next.config.js
module.exports = {
  // ... 其他配置
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
};
```

## 🔧 高级优化

### 1. CDN 配置

- 将静态资源上传到 CDN
- 配置 CDN 缓存策略
- 使用 CDN 加速 API 请求

### 2. 数据库优化

```javascript
// PocketBase 索引优化
// 在管理后台为常用查询字段添加索引
// players: phone, office
// game_results: player, gameKey
```

### 3. WebSocket 实时更新

考虑使用 WebSocket 替代轮询：

```javascript
// hooks/use-realtime.ts
export function useRealtimeUpdates() {
  useEffect(() => {
    const ws = new WebSocket('ws://your-server:8090/realtime');
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      // 处理实时更新
    };
    
    return () => ws.close();
  }, []);
}
```

## 📊 预期效果

| 优化项 | 优化前 | 优化后 | 改善 |
|--------|--------|--------|------|
| 轮询间隔 | 500ms | 2000ms | 75% ↓ |
| 网络请求 | ~12/秒 | ~3/秒 | 75% ↓ |
| 响应时间 | 2-3秒 | 0.5-1秒 | 60% ↓ |
| 服务器负载 | 高 | 低 | 70% ↓ |

## 🚨 注意事项

1. **渐进式部署**
   - 先在测试环境验证
   - 分阶段发布到生产环境

2. **监控性能**
   - 使用 Google Lighthouse 测试
   - 监控服务器资源使用情况

3. **备份配置**
   - 保留原始配置文件
   - 准备回滚方案

4. **用户体验**
   - 添加加载状态
   - 优化错误处理

## 📞 技术支持

如遇到问题，请检查：
1. 服务器日志：`pm2 logs alpha-matrix`
2. Nginx 日志：`tail -f /var/log/nginx/error.log`
3. PocketBase 日志：`journalctl -u pocketbase -f`