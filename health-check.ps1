Write-Host "=== 🧩 Topzcasino v1.1.2 健康檢查開始 ===" -ForegroundColor Cyan

# 1) 清理 node_modules 與 lockfile (可選)
# Write-Host "清理 node_modules & package-lock.json ..." -ForegroundColor Yellow
# Remove-Item -Recurse -Force node_modules -ErrorAction SilentlyContinue
# Remove-Item package-lock.json -ErrorAction SilentlyContinue
# npm ci

# 2) Prisma Client 生成
Write-Host "`n[1/5] Prisma Generate ..." -ForegroundColor Yellow
npx prisma generate
if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Prisma generate 失敗，請檢查 schema.prisma 或 DATABASE_URL" -ForegroundColor Red
  exit $LASTEXITCODE
} else {
  Write-Host "✅ Prisma generate 完成" -ForegroundColor Green
}

# 3) Prisma Schema 驗證
Write-Host "`n[2/5] Prisma Validate ..." -ForegroundColor Yellow
npx prisma validate
if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Prisma schema 驗證失敗" -ForegroundColor Red
  exit $LASTEXITCODE
} else {
  Write-Host "✅ Prisma schema 驗證通過" -ForegroundColor Green
}

# 4) Next.js Build
Write-Host "`n[3/5] Next.js Build ..." -ForegroundColor Yellow
npm run build
if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ Next.js build 失敗，請檢查程式碼與 ESLint" -ForegroundColor Red
  exit $LASTEXITCODE
} else {
  Write-Host "✅ Next.js build 成功" -ForegroundColor Green
}

# 5) Lint 檢查
Write-Host "`n[4/5] ESLint 檢查 ..." -ForegroundColor Yellow
npm run lint
if ($LASTEXITCODE -ne 0) {
  Write-Host "❌ ESLint 檢查未通過，請修正警告/錯誤" -ForegroundColor Red
  exit $LASTEXITCODE
} else {
  Write-Host "✅ ESLint 檢查通過" -ForegroundColor Green
}

# 6) 測試啟動 (僅測試是否能啟動，不常駐)
Write-Host "`n[5/5] 啟動測試 ..." -ForegroundColor Yellow
$proc = Start-Process "npm" -ArgumentList "run start" -NoNewWindow -PassThru
Start-Sleep -Seconds 10
if ($proc.HasExited) {
  Write-Host "❌ npm run start 無法啟動，請檢查環境變數與 DB" -ForegroundColor Red
  exit 1
} else {
  Write-Host "✅ 啟動成功 (10 秒測試)，自動關閉" -ForegroundColor Green
  Stop-Process -Id $proc.Id
}

Write-Host "`n=== 🎉 Topzcasino v1.1.2 健康檢查完成 ===" -ForegroundColor Cyan
