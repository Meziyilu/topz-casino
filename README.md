# Fullstack Render Template (Next.js + Prisma/Postgres + JWT Cookie)

A minimal, production-ready template you can **push to GitHub** and **deploy on Render** (via `render.yaml`).

## Stack
- Next.js (App Router)
- Prisma + PostgreSQL
- JWT via HttpOnly cookie (using `jose`)
- Protected route: `/lobby`
- Health check: `/api/healthz`

---

## Quickstart (Local)

1) **Install deps**
```bash
npm i
```

2) **Start a local Postgres** (Docker example):
```bash
docker run --name pg   -e POSTGRES_USER=app -e POSTGRES_PASSWORD=app -e POSTGRES_DB=app   -p 5432:5432 -d postgres:16
```

3) **Copy env**
```bash
cp .env.example .env
# update DATABASE_URL and JWT_SECRET
```

4) **Init DB**
```bash
npx prisma migrate dev --name init
```

5) **Run dev**
```bash
npm run dev
```

Open http://localhost:3000

---

## Deploy to Render (via GitHub)

1) **Create a GitHub repo** (or use an existing one)
```bash
git init
git add .
git commit -m "init: fullstack render template"
git branch -M main
git remote add origin <your_repo_url>
git push -u origin main
```

2) **Render Blueprint deploy**
- In Render, **New +** → **Blueprint** → point to your GitHub repo.
- Render will detect `render.yaml`, create:
  - a **PostgreSQL** database
  - a **Web Service** for this app
- Environment variables:
  - `DATABASE_URL` is wired automatically from the DB.
  - `JWT_SECRET` is auto-generated.
- Build will run `npm ci && prisma generate && next build` and start `next start -p $PORT`.

3) **Run DB migrations**  
Blueprint deploys run `postdeploy` steps if specified.  
If you need to apply migrations manually, use the Render **Shell**:
```bash
npx prisma migrate deploy
```

4) **Custom Domain (Namecheap)**
- In Render service → **Settings → Custom Domains** → add `www.yourdomain.com`.
- In **Namecheap DNS**:
  - Add **CNAME** record:  
    - **Host:** `www`  
    - **Value:** your Render subdomain (e.g., `fullstack-next.onrender.com`)  
    - **TTL:** automatic
  - (Recommended) Redirect apex/root to `www` (URL redirect record) to avoid ALIAS/ANAME issues.
- Wait for DNS to propagate.

---

## 502 Bad Gateway — quick checklist
- **Start command** correct? (`npm run start` → `next start -p $PORT` handled in package.json)
- **Node version** OK? We pin to Node 20 (`engines.node` + `NODE_VERSION` env).
- **Prisma** generated? Build step runs `prisma generate`.
- **Migrations** applied? Run `npx prisma migrate deploy` in Render Shell.
- **Health** endpoint `/api/healthz` returns `200 OK`? If not, check logs.

---

## Structure
```
app/
  api/
    auth/
      login/route.ts
      register/route.ts
      me/route.ts
    healthz/route.ts
  lobby/page.tsx
  page.tsx
  layout.tsx
  globals.css
lib/
  prisma.ts
  jwt.ts
middleware.ts
prisma/
  schema.prisma
render.yaml
```

---

## Extend
This is a clean base. Add your modules (bank, gacha, baccarat, etc.) inside `/app` and Prisma models as needed.
