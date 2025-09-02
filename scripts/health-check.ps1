Write-Host "== Prisma validate =="
npx prisma validate || exit 1

Write-Host "== Prisma generate =="
npx prisma generate || exit 1

Write-Host "== TS typecheck =="
npx tsc --noEmit || exit 1

Write-Host "== ESLint =="
npm run lint || exit 1

Write-Host "== Next build =="
npm run build || exit 1

Write-Host "✅ All green."
