import { execFileSync, execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

function runGit(args, options = {}) {
  return execFileSync("git", args, {
    encoding: "utf8",
    cwd: options.cwd,
  }).trim();
}

function tryRunGit(args, options = {}) {
  try {
    return runGit(args, options);
  } catch {
    return "";
  }
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

  if (!match) {
    return `${normalized.trimEnd()}\n\n## [Unreleased]\n\n### Commit Audit\n${entry}\n`;
  }

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

function quoteForShell(value) {
  return `"${String(value).replace(/(["\\$`])/g, "\\$1")}"`;
}

function getConfiguredCodexCommand(repoRoot) {
  const fromEnv = (process.env.CODEX_CHANGELOG_COMMAND ?? "").trim();
  if (fromEnv) return fromEnv;

  const fromGitConfig = tryRunGit(["config", "--get", "hooks.codexChangelogCommand"], {
    cwd: repoRoot,
  }).trim();

  return fromGitConfig;
}

function isCodexAvailable() {
  try {
    execFileSync("codex", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
}

function isChangelogTouched(repoRoot) {
  const staged = tryRunGit(["diff", "--cached", "--name-only", "--", "CHANGELOG.md"], {
    cwd: repoRoot,
  });
  const unstaged = tryRunGit(["diff", "--name-only", "--", "CHANGELOG.md"], {
    cwd: repoRoot,
  });
  return Boolean(staged || unstaged);
}

function applyHeuristicUpdate({ repoRoot, changelogPath, subject, entries }) {
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

  const initial = "# Changelog\n\n## [Unreleased]\n";
  const existing = existsSync(changelogPath)
    ? readFileSync(changelogPath, "utf8")
    : initial;
  const updated = insertEntry(existing, entry).trimEnd() + "\n";

  writeFileSync(changelogPath, updated, "utf8");
  runGit(["add", "CHANGELOG.md"], { cwd: repoRoot });
}

function buildDefaultCodexPrompt({ commitSubject, changedFiles, stagedDiffPath, changelogPath }) {
  return [
    "你是资深软件工程师，目标是在本次提交前智能更新 CHANGELOG.md。",
    "",
    "严格要求：",
    "1. 只修改 CHANGELOG.md。",
    "2. 基于已暂存改动与提交主题，写入 ## [Unreleased] 下的变更记录。",
    "3. 使用简洁中文，按 Added / Changed / Fixed（按需）分类。",
    "4. 不要杜撰未出现在改动中的功能。",
    "5. 若已有同类条目，合并措辞避免重复。",
    "",
    `提交主题: ${commitSubject}`,
    `变更文件: ${changedFiles.join(", ")}`,
    `CHANGLELOG 路径: ${changelogPath}`,
    `已暂存 diff 文件: ${stagedDiffPath}`,
  ].join("\n");
}

function runCodexUpdate({ repoRoot, changelogPath, commitMsgFile, subject, entries }) {
  const changedFiles = entries.map((entry) => entry.filePath);
  const stagedDiff = tryRunGit(["diff", "--cached", "--no-color", "--minimal"], {
    cwd: repoRoot,
  });

  const hookTmpDir = path.join(repoRoot, ".git", ".changelog-hook");
  mkdirSync(hookTmpDir, { recursive: true });

  const stagedDiffPath = path.join(hookTmpDir, "staged.diff");
  const stagedFilesPath = path.join(hookTmpDir, "staged-files.json");
  writeFileSync(stagedDiffPath, stagedDiff, "utf8");
  writeFileSync(stagedFilesPath, JSON.stringify(changedFiles, null, 2), "utf8");

  const customCmd = getConfiguredCodexCommand(repoRoot);
  if (customCmd) {
    const resolved = customCmd
      .replaceAll("{REPO_ROOT}", quoteForShell(repoRoot))
      .replaceAll("{CHANGELOG}", quoteForShell(changelogPath))
      .replaceAll("{COMMIT_MSG}", quoteForShell(commitMsgFile))
      .replaceAll("{STAGED_DIFF}", quoteForShell(stagedDiffPath))
      .replaceAll("{STAGED_FILES}", quoteForShell(stagedFilesPath))
      .replaceAll("{SUBJECT}", quoteForShell(subject));

    execSync(resolved, {
      cwd: repoRoot,
      stdio: "inherit",
      shell: true,
      env: {
        ...process.env,
        CHANGELOG_REPO_ROOT: repoRoot,
        CHANGELOG_FILE: changelogPath,
        CHANGELOG_COMMIT_MSG_FILE: commitMsgFile,
        CHANGELOG_STAGED_DIFF_FILE: stagedDiffPath,
        CHANGELOG_STAGED_FILES_FILE: stagedFilesPath,
        CHANGELOG_COMMIT_SUBJECT: subject,
      },
    });

    return true;
  }

  if (!isCodexAvailable()) {
    return false;
  }

  const prompt = buildDefaultCodexPrompt({
    commitSubject: subject,
    changedFiles,
    stagedDiffPath,
    changelogPath,
  });

  execFileSync(
    "codex",
    [
      "exec",
      "-",
      "--sandbox",
      "workspace-write",
      "--skip-git-repo-check",
      "-C",
      repoRoot,
    ],
    {
      input: prompt,
      stdio: ["pipe", "inherit", "inherit"],
      timeout: 5 * 60 * 1000,
    }
  );

  return true;
}

function main() {
  const commitMsgFile = process.argv[2];
  if (!commitMsgFile) return;

  const subject = getCommitSubject(commitMsgFile);
  if (!subject || subject.startsWith("Merge ")) return;

  const repoRoot = runGit(["rev-parse", "--show-toplevel"]);
  const changelogPath = path.join(repoRoot, "CHANGELOG.md");

  const stagedRaw = runGit(["diff", "--cached", "--name-status", "--diff-filter=ACMRD"], {
    cwd: repoRoot,
  });

  const entries = parseStagedEntries(stagedRaw).filter(
    (entry) => entry.filePath !== "CHANGELOG.md"
  );

  if (!entries.length) return;

  const requireCodex = ["1", "true", "yes"].includes(
    String(process.env.CHANGELOG_REQUIRE_CODEX ?? "").toLowerCase()
  );

  let codexSucceeded = false;
  try {
    codexSucceeded = runCodexUpdate({
      repoRoot,
      changelogPath,
      commitMsgFile,
      subject,
      entries,
    });
  } catch (error) {
    if (requireCodex) {
      throw error;
    }
    console.warn("[changelog-hook] Codex 审查失败，回退到本地规则更新。", error);
  }

  if (!codexSucceeded || !isChangelogTouched(repoRoot)) {
    applyHeuristicUpdate({
      repoRoot,
      changelogPath,
      subject,
      entries,
    });
    return;
  }

  runGit(["add", "CHANGELOG.md"], { cwd: repoRoot });
}

try {
  main();
} catch (error) {
  console.error("[changelog-hook] 更新 CHANGELOG 失败：", error);
  process.exit(1);
}
