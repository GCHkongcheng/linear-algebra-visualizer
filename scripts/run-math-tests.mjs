import { rmSync } from "node:fs";
import { spawnSync } from "node:child_process";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: process.platform === "win32",
  });

  if (typeof result.status === "number") {
    return result.status;
  }

  return 1;
}

function cleanup() {
  rmSync(".tmp-math-test", { recursive: true, force: true });
}

cleanup();
let exitCode = 0;

try {
  exitCode = run("tsc", ["-p", "tsconfig.math-tests.json"]);
  if (exitCode === 0) {
    exitCode = run("node", [".tmp-math-test/scripts/test-math.js"]);
  }
} finally {
  cleanup();
}

process.exit(exitCode);
