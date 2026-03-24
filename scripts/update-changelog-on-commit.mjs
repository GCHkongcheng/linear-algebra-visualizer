import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function runGit(args) {
  return execFileSync("git", args, { encoding: "utf8" }).trim();
}

function getCommitSubject(commitMsgFile) {
  const raw = readFileSync(commitMsgFile, "utf8");
  return (
    raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .find((line) => line.length > 0 && !line.startsWith("#")) ?? ""
  );
}

function parseStagedEntries(raw) {
  return raw
    .split(/\r?\n/)
    .filter(Boolean)
    .map((line) => {
      const parts = line.split(/\s+/);
      if (parts.length < 2) return null;
      const status = parts[0];
      const filePath = parts[parts.length - 1];
      return { status, filePath };
    })
    .filter((entry) => entry !== null);
}

function formatTimeInShanghai(now = new Date()) {
  const formatted = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(now);
  return formatted.replace(",", "");
}

function reviewNotesFromFiles(files) {
  const notes = [];
  if (files.some((file) => file.startsWith("src/lib/"))) {
    notes.push("涉及核心计算逻辑，建议运行 npm run test:math");
  }
  if (files.some((file) => file === "package.json" || file === "package-lock.json")) {
    notes.push("依赖清单变更，建议执行 npm install 并验证 build");
  }
  if (files.some((file) => file.startsWith("src/app/") || file.startsWith("src/components/"))) {
    notes.push("涉及前端交互，建议人工回归关键页面");
  }
  return notes;
}

function summarizeStatuses(entries) {
  const counter = { A: 0, M: 0, D: 0, R: 0, C: 0 };
  for (const entry of entries) {
    const key = entry.status[0];
    if (counter[key] !== undefined) {
      counter[key] += 1;
    }
  }
  const parts = [];
  if (counter.A) parts.push(`新增 ${counter.A}`);
  if (counter.M) parts.push(`修改 ${counter.M}`);
  if (counter.D) parts.push(`删除 ${counter.D}`);
  if (counter.R) parts.push(`重命名 ${counter.R}`);
  if (counter.C) parts.push(`复制 ${counter.C}`);
  return parts.length ? parts.join("，") : `变更 ${entries.length}`;
}

function ensureUnreleasedSection(changelog) {
  if (changelog.includes("## [Unreleased]")) return changelog;
  const base = changelog.trimEnd();
  return `${base}\n\n## [Unreleased]\n`;
}

function insertEntry(changelog, entry) {
  const normalized = ensureUnreleasedSection(changelog).replace(/\r\n/g, "\n");
  const unreleasedPattern = /## \[Unreleased\][\s\S]*?(?=\n## \[|$)/;
  const match = normalized.match(unreleasedPattern);
  if (!match) return `${normalized.trimEnd()}\n\n## [Unreleased]\n\n### Commit Audit\n${entry}\n`;

  const unreleasedBlock = match[0];
  const marker = "### Commit Audit";
  let nextBlock;

  if (unreleasedBlock.includes(marker)) {
    nextBlock = unreleasedBlock.replace(marker, `${marker}\n${entry}`);
  } else {
    nextBlock = `${unreleasedBlock.trimEnd()}\n\n${marker}\n${entry}`;
  }

  return normalized.replace(unreleasedPattern, nextBlock);
}

function main() {
  const commitMsgFile = process.argv[2];
  if (!commitMsgFile) return;

  const subject = getCommitSubject(commitMsgFile);
  if (!subject || subject.startsWith("Merge ")) return;

  const stagedRaw = runGit(["diff", "--cached", "--name-status", "--diff-filter=ACMRD"]);
  const entries = parseStagedEntries(stagedRaw).filter(
    (entry) => entry.filePath !== "CHANGELOG.md"
  );

  if (!entries.length) return;

  const changedFiles = entries.map((entry) => entry.filePath);
  const notes = reviewNotesFromFiles(changedFiles);
  const statusSummary = summarizeStatuses(entries);
  const time = formatTimeInShanghai();

  const entryLines = [
    `- ${time} | 提交：${subject}`,
    `  - 文件审查：${statusSummary}`,
    `  - 变更范围：${changedFiles.map((file) => `\`${file}\``).join("、")}`,
  ];
  if (notes.length) {
    entryLines.push(`  - 风险提示：${notes.join("；")}`);
  }
  const entry = entryLines.join("\n");

  const repoRoot = runGit(["rev-parse", "--show-toplevel"]);
  const changelogPath = path.join(repoRoot, "CHANGELOG.md");
  const initial = "# Changelog\n\n## [Unreleased]\n";
  const existing = existsSync(changelogPath)
    ? readFileSync(changelogPath, "utf8")
    : initial;
  const updated = insertEntry(existing, entry).trimEnd() + "\n";

  writeFileSync(changelogPath, updated, "utf8");
  runGit(["add", "CHANGELOG.md"]);
}

try {
  main();
} catch (error) {
  console.error("[changelog-hook] 更新 CHANGELOG 失败：", error);
  process.exit(1);
}
