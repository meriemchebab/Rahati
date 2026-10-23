import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import path from "node:path";

const frontendDir = process.cwd();
const repoDir = path.resolve(frontendDir, "..");
const backendDir = path.join(repoDir, "Backend");
const python = process.env.E2E_PYTHON ?? path.join(
  repoDir,
  ".venv",
  process.platform === "win32" ? "Scripts/python.exe" : "bin/python",
);

function stopProcessTree(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.pid === undefined) return Promise.resolve();

  return new Promise((resolve) => {
    const timer = setTimeout(resolve, 5_000);
    child.once("exit", () => {
      clearTimeout(timer);
      resolve();
    });

    if (process.platform === "win32") {
      spawnSync("taskkill.exe", ["/PID", String(child.pid), "/T", "/F"], { stdio: "ignore" });
    } else {
      try {
        process.kill(-child.pid, "SIGTERM");
      } catch {
        child.kill("SIGTERM");
      }
    }
  });
}

async function waitFor(url: string, label: string, child: ChildProcess): Promise<void> {
  const deadline = Date.now() + 120_000;
  let lastError = "not responding yet";
  let spawnError: Error | undefined;
  child.once("error", (error) => {
    spawnError = error;
  });

  while (Date.now() < deadline) {
    if (spawnError) throw new Error(`Could not start ${label}: ${spawnError.message}`);
    if (child.exitCode !== null) throw new Error(`${label} exited with code ${child.exitCode}`);
    try {
      const response = await fetch(url);
      if (response.ok) return;
      lastError = `HTTP ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await new Promise((resolve) => setTimeout(resolve, 300));
  }

  throw new Error(`${label} did not become ready (${lastError})`);
}

export default async function globalSetup() {
  const backend = spawn(python, ["e2e/serve_backend.py"], {
    cwd: backendDir,
    env: { ...process.env, E2E_BACKEND_PORT: "8010" },
    stdio: "inherit",
    detached: process.platform !== "win32",
  });
  const frontend = spawn(
    process.execPath,
    [path.join(frontendDir, "node_modules/next/dist/bin/next"), "dev", "--hostname", "127.0.0.1", "--port", "3001"],
    { cwd: frontendDir, env: process.env, stdio: "inherit", detached: process.platform !== "win32" },
  );

  try {
    await Promise.all([
      waitFor("http://127.0.0.1:8010/admin/login/", "Django", backend),
      waitFor("http://127.0.0.1:3001/", "Next.js", frontend),
    ]);
  } catch (error) {
    await Promise.all([stopProcessTree(frontend), stopProcessTree(backend)]);
    throw error;
  }

  return async () => {
    await Promise.all([stopProcessTree(frontend), stopProcessTree(backend)]);
  };
}
