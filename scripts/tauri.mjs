import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const cargoBin = join(homedir(), ".cargo", "bin");
const sep = process.platform === "win32" ? ";" : ":";
const args = process.argv.slice(2);

function configPathFromArgs(argv) {
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--config" || arg === "-c") return argv[i + 1] ?? "";
    if (arg.startsWith("--config=")) return arg.slice("--config=".length);
  }
  return "";
}

const configPath = configPathFromArgs(args);
const storeConfig = /microsoftstore|appstore|\.store\.conf/i.test(configPath);
const channel = process.env.TOOLKIT_CHANNEL === "store" || storeConfig ? "store" : "github";

const env = {
  ...process.env,
  PATH: `${cargoBin}${sep}${process.env.PATH ?? ""}`,
  TOOLKIT_CHANNEL: channel,
};

const child = spawn("tauri", args, {
  stdio: "inherit",
  env,
  shell: process.platform === "win32",
});

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 1);
});
