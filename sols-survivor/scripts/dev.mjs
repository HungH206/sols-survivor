import { spawn } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";

function loadDotEnv() {
  if (!existsSync(".env")) return;

  const lines = readFileSync(".env", "utf8").split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim().replace(/^["']|["']$/g, "");
    process.env[key] ??= value;
  }
}

function run(command, args, env) {
  const child = spawn(command, args, {
    env,
    shell: process.platform === "win32",
    stdio: "inherit",
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    if (code && code !== 0) {
      process.exit(code);
    }
  });

  return child;
}

loadDotEnv();

const api = run("node", ["server.mjs"], {
  ...process.env,
  PORT: "8080",
});

const vite = run("vite", ["--host", "127.0.0.1"], process.env);

function shutdown() {
  api.kill("SIGINT");
  vite.kill("SIGINT");
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
