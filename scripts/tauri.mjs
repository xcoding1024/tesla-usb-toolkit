import { spawn } from "node:child_process";
import { homedir } from "node:os";
import { join } from "node:path";

const cargoBin = join(homedir(), ".cargo", "bin");
const sep = process.platform === "win32" ? ";" : ":";
const env = {
  ...process.env,
  PATH: `${cargoBin}${sep}${process.env.PATH ?? ""}`,
};

const child = spawn("tauri", process.argv.slice(2), {
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
