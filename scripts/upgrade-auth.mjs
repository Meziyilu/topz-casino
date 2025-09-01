import fg from "fast-glob";
import fs from "node:fs";
import { Project, QuoteKind, SyntaxKind } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
  manipulationSettings: { quoteKind: QuoteKind.Double },
});

// 掃描所有 route
const files = await fg(["app/api/**/route.ts", "app/api/**/route.tsx"], { onlyFiles: true });

const NEED_IMPORTS = {
  verifyRequest: { text: 'import { verifyRequest } from "@/lib/verifyRequest";' },
  NextResponse: { text: 'import { NextResponse } from "next/server";' },
  prisma: { text: 'import prisma from "@/lib/prisma";' },
};

const GET_AUTHED_USER_FN =
  `
async function getAuthedUser(req: Request) {
  const auth = await verifyRequest(req);
  const userId = (auth && (auth.userId ?? auth.sub)) ? String(auth.userId ?? auth.sub) : null;
  if (!userId) return null;
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, balance: true, bankBalance: true, isAdmin: true },
  });
}
`.trim() + "\n";

// 典型舊片段替換
const PATTERN_BLOCKS = [
  // 經典 3 連：token / payload.catch / guard
  {
    re:
      /const\s+token\s*=\s*readTokenFromHeaders\s*\(\s*req\s*\)\s*;\s*const\s+payload\s*=\s*await\s+verifyJWT\s*\(\s*token\s*\)\s*\.catch\s*\(\s*\(\)\s*=>\s*null\s*\)\s*;\s*if\s*\(\s*!\s*payload\?\.\s*sub\s*\)\s*return\s+NextResponse\.json\(\s*{[^}]*}\s*,\s*{[^}]*}\s*\)\s*;\s*/gs,
    replacement:
      'const me = await getAuthedUser(req);\nif (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });\n',
  },
  // 兩段式：token / payload.catch；guard 另行
  {
    re:
      /const\s+token\s*=\s*readTokenFromHeaders\s*\(\s*req\s*\)\s*;\s*const\s+payload\s*=\s*await\s+verifyJWT\s*\(\s*token\s*\)\s*\.catch\s*\(\s*\(\)\s*=>\s*null\s*\)\s*;\s*/gs,
    replacement: "const me = await getAuthedUser(req);\n",
  },
  // 單獨的 if (!payload?.sub) guard
  {
    re:
      /if\s*\(\s*!\s*payload\?\.\s*sub\s*\)\s*return\s+NextResponse\.json\(\s*{[^}]*}\s*,\s*{[^}]*}\s*\)\s*;\s*/gs,
    replacement: 'if (!me) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });\n',
  },
];

function findFirstNonRuntimeImportIndex(sf) {
  // 確保 runtime 在頂部，其他 import 插在其後
  const stmts = sf.getStatements();
  if (!stmts.length) return 0;

  // 找第一個 import；若有，就插在它後面
  for (let i = 0; i < stmts.length; i++) {
    if (stmts[i].getKind() === SyntaxKind.ImportDeclaration) return i + 1;
  }

  // 沒 import：如果存在 runtime，插在第 1 行；否則插在 0
  const hasRuntime = sf.getFullText().includes('export const runtime = "nodejs"');
  return hasRuntime ? 1 : 0;
}

function ensureImports(sf) {
  const text = sf.getFullText();
  const insertIndex = findFirstNonRuntimeImportIndex(sf);

  if (!/from\s+["']@\/lib\/verifyRequest["']/.test(text)) {
    sf.insertStatements(insertIndex, NEED_IMPORTS.verifyRequest.text + "\n");
  }
  if (!/from\s+["']next\/server["']/.test(text)) {
    sf.insertStatements(insertIndex, NEED_IMPORTS.NextResponse.text + "\n");
  }
  if (!/from\s+["']@\/lib\/prisma["']/.test(text)) {
    sf.insertStatements(insertIndex, NEED_IMPORTS.prisma.text + "\n");
  }
}

function stripUnusedLegacyImports(sf) {
  const targets = new Set(["readTokenFromHeaders", "verifyJWT"]);
  sf.getImportDeclarations().forEach((imp) => {
    const named = imp.getNamedImports();
    if (!named.length) return;

    let removedAny = false;
    named.slice().forEach((ni) => {
      const name = ni.getName();
      if (targets.has(name)) {
        ni.remove();
        removedAny = true;
      }
    });

    if (removedAny && !imp.getDefaultImport() && imp.getNamedImports().length === 0) {
      imp.remove();
    }
  });
}

function removeLegacyHelperFunctions(sf) {
  const funcs = sf.getFunctions().filter((fn) => fn.getName?.() === "readTokenFromHeaders");
  funcs.forEach((fn) => fn.remove());
}

function ensureGetAuthedUser(sf) {
  const text = sf.getFullText();
  if (!/function\s+getAuthedUser\s*\(/.test(text)) {
    const insertIndex = findFirstNonRuntimeImportIndex(sf);
    sf.insertStatements(insertIndex + 1, "\n" + GET_AUTHED_USER_FN);
  }
}

const changed = [];

for (const file of files) {
  const sourceText = fs.readFileSync(file, "utf8");
  let newText = sourceText;

  // 1) regex 的快速替換
  for (const pat of PATTERN_BLOCKS) {
    newText = newText.replace(pat.re, pat.replacement);
  }

  // 2) ts-morph 進一步處理 import / helper 注入與清理
  const sf = project.createSourceFile(file, newText, { overwrite: true });

  stripUnusedLegacyImports(sf);
  removeLegacyHelperFunctions(sf);
  ensureImports(sf);
  ensureGetAuthedUser(sf);

  const finalText = sf.getFullText();
  if (finalText !== sourceText) {
    fs.writeFileSync(file, finalText, "utf8");
    changed.push(file);
  } else {
    // 沒改動就把這個 temp SourceFile 從 project 拿掉
    sf.deleteImmediatelySync();
  }
}

console.log(`✅ Auth upgrade completed. Updated ${changed.length} file(s).`);
for (const f of changed) console.log(" -", f);
