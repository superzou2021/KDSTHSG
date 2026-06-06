@echo off
echo ========================================
echo   性能优化应用脚本
echo ========================================
echo.

echo [1/4] 备份原始配置文件...
if exist "next.config.js" (
    copy /Y "next.config.js" "next.config.js.backup" >nul
    echo   ✓ 已备份 next.config.js
)
if exist "hooks\use-game-data.ts" (
    copy /Y "hooks\use-game-data.ts" "hooks\use-game-data.ts.backup" >nul
    echo   ✓ 已备份 hooks\use-game-data.ts
)
echo.

echo [2/4] 应用优化配置...
if exist "next.config.optimized.js" (
    copy /Y "next.config.optimized.js" "next.config.js" >nul
    echo   ✓ 已应用 next.config.js
)
if exist "hooks\use-game-data.optimized.ts" (
    copy /Y "hooks\use-game-data.optimized.ts" "hooks\use-game-data.ts" >nul
    echo   ✓ 已应用 hooks\use-game-data.ts
)
echo.

echo [3/4] 检查生产环境配置...
if not exist ".env.production" (
    echo   ⚠ .env.production 文件不存在
    echo   请手动创建 .env.production 文件
) else (
    echo   ✓ .env.production 已存在
)
echo.

echo [4/4] 清理缓存...
if exist ".next" (
    rmdir /S /Q ".next" >nul 2>&1
    echo   ✓ 已清理 .next 缓存
)
echo.

echo ========================================
echo   优化应用完成！
echo ========================================
echo.
echo 下一步操作：
echo 1. 本地测试：npm run build && npm run start
echo 2. 部署到服务器：上传构建后的文件
echo 3. 详细说明：查看 PERFORMANCE_OPTIMIZATION.md
echo.
pause