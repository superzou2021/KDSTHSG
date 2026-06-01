# Alpha Matrix - PocketBase 启动工具
# PowerShell 版本

$ErrorActionPreference = "Continue"

Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "                   Alpha Matrix - PocketBase 启动工具" -ForegroundColor Green
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host ""

# 切换到脚本所在目录
$scriptPath = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $scriptPath

# 检查 PocketBase 是否存在
if (-Not (Test-Path "pocketbase.exe")) {
    Write-Host "[错误] 未找到 pocketbase.exe！" -ForegroundColor Red
    Write-Host ""
    Write-Host "请按以下步骤操作：" -ForegroundColor Yellow
    Write-Host "  1. 访问 https://github.com/pocketbase/pocketbase/releases/latest" -ForegroundColor Cyan
    Write-Host "  2. 下载 pocketbase_X.X.X_windows_amd64.zip" -ForegroundColor Cyan
    Write-Host "  3. 解压后将 pocketbase.exe 放到项目根目录" -ForegroundColor Cyan
    Write-Host ""
    Read-Host "按任意键打开下载页面..."
    Start-Process "https://github.com/pocketbase/pocketbase/releases/latest"
    exit 1
}

Write-Host "[信息] 找到 pocketbase.exe" -ForegroundColor Green
Write-Host "[信息] 正在启动 PocketBase..." -ForegroundColor Cyan
Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host "PocketBase Admin: http://127.0.0.1:8090/_/" -ForegroundColor Cyan
Write-Host "==============================================================================" -ForegroundColor Green
Write-Host ""

# 启动 PocketBase
./pocketbase.exe serve --http=0.0.0.0:8090

Write-Host ""
Write-Host "==============================================================================" -ForegroundColor Yellow
Write-Host "PocketBase 已停止" -ForegroundColor Yellow
Write-Host "==============================================================================" -ForegroundColor Yellow
Write-Host ""
Read-Host "按任意键退出..."
