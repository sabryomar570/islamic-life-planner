// فحص سريع: أي محارف صينية/كورية/يابانية في كود عود = إفساد مخرجات، لا محتوى.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const roots = ["src", "tests", "."];
const exts = [".ts", ".tsx", ".md", ".css", ".html"];
const seen = new Set<string>();
const bad: string[] = [];

// محارف صينية/كورية/يابانية + محرف الإبدال U+FFFD: كلها إفساد مخرجات، لا محتوى.
const CJK = /[\u3000-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af\uff00-\uffef\uFFFD]/;

function walk(dir: string, depth = 0) {
  if (depth > 2) return;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const name of entries) {
    if (name === "node_modules" || name === "dist" || name.startsWith(".")) continue;
    const path = join(dir, name);
    let st;
    try {
      st = statSync(path);
    } catch {
      continue;
    }
    if (st.isDirectory()) {
      walk(path, depth + 1);
      continue;
    }
    if (!exts.some((ext) => name.endsWith(ext))) continue;
    const key = path.replace(/^\.\//, "");
    if (seen.has(key)) continue;
    seen.add(key);
    const text = readFileSync(path, "utf8");
    text.split("\n").forEach((line, index) => {
      if (CJK.test(line)) bad.push(`${key}:${index + 1}  ${line.trim().slice(0, 90)}`);
    });
  }
}

for (const root of roots) walk(root);

if (bad.length === 0) {
  console.log("نظيف: لا محارف صينية/كورية/يابانية ولا محارف إبدال في الكود أو التقارير.");
} else {
  console.log(`${bad.length} سطر يحتوي محارف غريبة:\n` + bad.join("\n"));
}
