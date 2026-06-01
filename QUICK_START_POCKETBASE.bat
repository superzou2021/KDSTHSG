@echo off
chcp 65001 >nul
cls
echo ==============================================================================
echo                     Alpha Matrix - PocketBase 启动工具
echo ==============================================================================
echo.

cd /d "%~dp0"

if not exist "pocketbase.exe" (
    echo [错误] 未找到 pocketbase.exe！
    echo.
    echo 请按以下步骤操作：
    echo   1. 访问 https://github.com/pocketbase/pocketbase/releases/latest
    echo   2. 下载 pocketbase_X.X.X_windows_amd64.zip
    echo   3. 解压后将 pocketbase.exe 放到项目根目录
    echo.
    echo 按任意键打开下载页面...
    pause >nul
    start https://github.com/pocketbase/pocketbase/releases/latest
    exit /b 1
)

echo [信息] 找到 pocketbase.exe
echo [信息] 正在启动 PocketBase...
echo.
echo ==============================================================================
echo PocketBase Admin: http://127.0.0.1:8090/_/
echo ==============================================================================
echo.

pocketbase.exe serve --http=0.0.0.0:8090

echo.
echo ==============================================================================
echo PocketBase 已停止
echo ==============================================================================
echo.
pause
