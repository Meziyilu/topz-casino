import fg from "fast-glob";
import fs from "node:fs";
import { Project, QuoteKind, SyntaxKind } from "ts-morph";

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
  manipulationSettings: { quoteKind: QuoteKind.Double },
});

const files = await fg(["app/api/**/route.ts", "app/api/**/route.tsx"], { onlyFiles: true });

function hasIdentifier(sf, name) {
  let found = false;
  sf.forEachDescendant((n) => {
    if (n.getKind() === SyntaxKind.Identifier && n.getText() === name) found = true;
  });
  return found;
}

function removeImportByModule(sf, moduleSpec) {
  sf.getImportDeclarations().forEach((imp) => {
    if (imp.getModuleSpecifierValue() === moduleSpec) imp.remove();
  });
}

function ensureSingleVerifyRequestFromJwt(sf) {
  // 1) 刪掉 "@/lib/verifyRequest"
  removeImportByModule(sf, "@/lib/verifyRequest");

  // 2) 確保有從 "@/lib/jwt" 匯入 verifyRequest，且不重複
  const jwtImports = sf
    .getImportDeclarations()
    .filter((imp) => imp.getModuleSpecifierValue() === "@/lib/jwt");

  let hasNamed = false;
  for (const imp of jwtImports) {
    const named = imp.getNamedImports();
    const hasVR = named.some((ni) => ni.getName() === "verifyRequest");
    if (hasVR) {
      hasNamed = true;
      // 其他重複的 verifyRequest import 在不同位置的話，等下會一併清掉
    }
  }

  if (!hasNamed) {
    // 沒有就新增一條 import
    const firstImportIdx = sf.getStatements().findIndex((s) => s.getKind() === SyntaxKind.ImportDeclaration);
    const insertIndex = firstImportIdx >= 0 ? firstImportIdx + 1 : 0;
    sf.insertStatements(insertIndex, 'import { verifyRequest } from "@/lib/jwt";\n');
  } else {
    // 若有多條 from "@/lib/jwt"，合併到第一條
    const all = sf
      .getImportDeclarations()
      .filter((imp) => imp.getModuleSpecifierValue() === "@/lib/jwt");

    if (all.length > 1) {
      const first = all[0];
      for (let i = 1; i < all.length; i++) {
        const imp = all[i];
        // 把 verifyRequest 加到第一條（如果第二條有其他命名也一起合併）
        imp.getNamedImports().forEach((ni) => {
          const name = ni.getName();
          if (!first.getNamedImports().some((x) => x.getName() === name)) {
            first.addNamedImport(name);
          }
        });
        // 移掉多餘條
        imp.remove();
      }
    }
  }

  // 3) 保證只存在一次 verifyRequest 命名
  const jwt = sf.getImportDeclarations().find((imp) => imp.getModuleSpecifierValue() === "@/lib/jwt");
  if (jwt) {
    // 去重複 verifyRequest
    const seen = new Set();
    jwt.getNamedImports().forEach((ni) => {
      const n = ni.getName();
      if (seen.has(n)) ni.remove();
      else seen.add(n);
    });
  }
}

function removeUnusedGetAuthedUserAndImports(sf) {
  const usesGet = hasIdentifier(sf, "getAuthedUser");
  if (!usesGet) {
    // 刪掉函式
    sf.getFunctions()
      .filter((fn) => fn.getName?.() === "getAuthedUser")
      .forEach((fn) => fn.remove());

    // 若 verifyRequest 沒被使用，移掉 import
    const usesVerifyRequest = hasIdentifier(sf, "verifyRequest");
    if (!usesVerifyRequest) {
      sf.getImportDeclarations().forEach((imp) => {
        if (imp.getModuleSpecifierValue() === "@/lib/jwt") {
          const named = imp.getNamedImports();
          const keep = named.filter((ni) => ni.getName() !== "verifyRequest");
          if (keep.length !== named.length) {
            named.forEach((ni) => ni.remove());
            keep.forEach((ni) => imp.addNamedImport(ni.getName())); // 重新加回保留者
            if (!imp.getDefaultImport() && imp.getNamedImports().length === 0) imp.remove();
          }
        }
      });
    }

    // 若 prisma 沒被使用，移掉 import prisma
    const usesPrisma = hasIdentifier(sf, "prisma");
    if (!usesPrisma) {
      sf.getImportDeclarations().forEach((imp) => {
        if (imp.getModuleSpecifierValue() === "@/lib/prisma") imp.remove();
      });
    }
  }
}

const changed = [];

for (const file of files) {
  const sourceText = fs.readFileSync(file, "utf8");
  const sf = project.createSourceFile(file, sourceText, { overwrite: true });

  // 規整 verifyRequest 來源
  ensureSingleVerifyRequestFromJwt(sf);

  // 如果沒使用 getAuthedUser，就把函式與多餘 import 清掉
  removeUnusedGetAuthedUserAndImports(sf);

  const finalText = sf.getFullText();
  if (finalText !== sourceText) {
    fs.writeFileSync(file, finalText, "utf8");
    changed.push(file);
  } else {
    sf.deleteImmediatelySync();
  }
}

console.log(`✅ normalize-auth done. Updated ${changed.length} file(s).`);
changed.forEach((f) => console.log(" -", f));
