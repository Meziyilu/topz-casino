import fg from "fast-glob";
import { Project, SyntaxKind, QuoteKind } from "ts-morph";
import fs from "node:fs";

const project = new Project({
  tsConfigFilePath: "tsconfig.json",
  manipulationSettings: {
    quoteKind: QuoteKind.Double,
    usePrefixAndSuffixTextForRename: false,
  },
});

const files = await fg(["app/api/**/route.ts", "app/api/**/route.tsx"], {
  dot: false,
  onlyFiles: true,
});

for (const file of files) {
  const sourceText = fs.readFileSync(file, "utf8");
  // 先載入到 ts-morph project
  const sf = project.createSourceFile(file, sourceText, { overwrite: true });

  // 1) 插入 export const runtime = "nodejs";
  const hasRuntime = sf.getVariableStatement(vs =>
    vs.getDeclarations().some(d =>
      d.getName && d.getName() === "runtime"
    )
  );
  const hasRuntimeText = sourceText.includes('export const runtime = "nodejs"');

  if (!hasRuntime && !hasRuntimeText) {
    // 插入到檔頭
    sf.insertStatements(0, 'export const runtime = "nodejs";\n');
  }

  // 2) 移除未使用的 readTokenFromHeaders / verifyJWT imports
  const targets = new Set(["readTokenFromHeaders", "verifyJWT"]);

  // 收集實際使用的識別字
  const used = new Set();
  sf.forEachDescendant(node => {
    if (node.getKind() === SyntaxKind.Identifier) {
      used.add(node.getText());
    }
  });

  // 檢查每個 import
  sf.getImportDeclarations().forEach(imp => {
    const named = imp.getNamedImports();
    if (!named.length) return;

    let changed = false;
    for (const ni of named) {
      const name = ni.getName();
      if (targets.has(name) && !used.has(name)) {
        ni.remove(); // 移除此命名 import
        changed = true;
      }
    }

    // 如果該 import 沒剩任何命名 import，且沒有 default import，就刪整行
    if (changed && !imp.getDefaultImport() && imp.getNamedImports().length === 0) {
      imp.remove();
    }
  });

  // 寫回
  fs.writeFileSync(file, sf.getFullText(), "utf8");
}

console.log(`✅ Processed ${files.length} route file(s).`);
