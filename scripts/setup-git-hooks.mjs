import { execFileSync } from "node:child_process";

try {
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], {
    stdio: "inherit",
  });
  console.log("[hooks] 已设置 core.hooksPath = .githooks");
} catch (error) {
  console.error("[hooks] 设置失败:", error);
  process.exit(1);
}
