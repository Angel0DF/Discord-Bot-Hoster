import { spawn, ChildProcess, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import os from 'os';
import pidusage from 'pidusage';
import { BotConfig, BotState, BotStatus } from './types';
import { getBotById, getAllBots, saveBots, BOTS_STORAGE_DIR } from './storage';

interface ActiveProcess {
  process: ChildProcess;
  config: BotConfig;
  status: BotStatus;
  logs: string[];
  startTime: number;
  restartsCount: number;
  manuallyStopped?: boolean;
  stats: {
    cpu: number;
    memory: number;
    uptime: number;
    pid?: number;
  };
  restartTimeout?: NodeJS.Timeout;
  statsInterval?: NodeJS.Timeout;
}

// Global process registry across hot reloads in dev
declare global {
  var __ACTIVE_BOTS: Map<string, ActiveProcess> | undefined;
  var __LOG_LISTENERS: Map<string, Set<(line: string) => void>> | undefined;
}

const activeBots = global.__ACTIVE_BOTS ?? new Map<string, ActiveProcess>();
global.__ACTIVE_BOTS = activeBots;

const logListeners = global.__LOG_LISTENERS ?? new Map<string, Set<(line: string) => void>>();
global.__LOG_LISTENERS = logListeners;

const MAX_LOG_LINES = 1000;

export function addLogListener(botId: string, callback: (line: string) => void): () => void {
  if (!logListeners.has(botId)) {
    logListeners.set(botId, new Set());
  }
  const listeners = logListeners.get(botId)!;
  listeners.add(callback);

  return () => {
    listeners.delete(callback);
    if (listeners.size === 0) {
      logListeners.delete(botId);
    }
  };
}

function broadcastLog(botId: string, text: string) {
  const active = activeBots.get(botId);
  const timestamp = new Date().toLocaleTimeString();
  const formatted = `[${timestamp}] ${text}`;

  if (active) {
    active.logs.push(formatted);
    if (active.logs.length > MAX_LOG_LINES) {
      active.logs.shift();
    }
  }

  const listeners = logListeners.get(botId);
  if (listeners) {
    listeners.forEach((cb) => {
      try {
        cb(formatted);
      } catch (err) {
        console.error('Error dispatching log to listener:', err);
      }
    });
  }
}

export function getBotState(botId: string): BotState | null {
  const config = getBotById(botId);
  if (!config) return null;

  const active = activeBots.get(botId);
  if (!active) {
    return {
      id: botId,
      config,
      status: 'offline',
      stats: { cpu: 0, memory: 0, uptime: 0 },
      logs: [],
      restartsCount: 0,
    };
  }

  return {
    id: botId,
    config: active.config,
    status: active.status,
    stats: active.stats,
    logs: active.logs,
    restartsCount: active.restartsCount,
    lastStarted: active.startTime ? new Date(active.startTime).toISOString() : undefined,
  };
}

export function getAllBotStates(): BotState[] {
  const allConfigs = getAllBots();
  return allConfigs.map((config) => {
    const state = getBotState(config.id);
    return state || {
      id: config.id,
      config,
      status: 'offline',
      stats: { cpu: 0, memory: 0, uptime: 0 },
      logs: [],
      restartsCount: 0,
    };
  });
}

function resolveCommand(config: BotConfig, botDir: string): { command: string; args: string[] } {
  if (config.startCommand && config.startCommand.trim().length > 0) {
    const parts = config.startCommand.trim().split(' ');
    return { command: parts[0], args: parts.slice(1) };
  }

  const isWindows = process.platform === 'win32';

  if (config.runtime === 'python') {
    // Check if virtual environment exists
    const venvPython = isWindows
      ? path.join(botDir, '.venv', 'Scripts', 'python.exe')
      : path.join(botDir, '.venv', 'bin', 'python');

    if (fs.existsSync(venvPython)) {
      return { command: venvPython, args: [config.mainFile || 'main.py'] };
    }

    // Default to system python
    const pythonCmd = isWindows ? 'python' : 'python3';
    return { command: pythonCmd, args: [config.mainFile || 'main.py'] };
  }

  if (config.runtime === 'bun') {
    return { command: 'bun', args: ['run', config.mainFile || 'index.js'] };
  }

  // Default to Node.js
  return { command: 'node', args: [config.mainFile || 'index.js'] };
}

export async function startBot(botId: string): Promise<{ success: boolean; message: string }> {
  const config = getBotById(botId);
  if (!config) {
    return { success: false, message: 'Bot non trovato' };
  }

  let active = activeBots.get(botId);
  if (active && (active.status === 'online' || active.status === 'starting')) {
    return { success: false, message: 'Il bot è già in esecuzione' };
  }

  const botDir = path.join(BOTS_STORAGE_DIR, botId);
  if (!fs.existsSync(botDir)) {
    fs.mkdirSync(botDir, { recursive: true });
  }

  const { command, args } = resolveCommand(config, botDir);

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    ...config.env,
    BOT_ID: botId,
    NODE_ENV: 'production',
  };

  try {
    broadcastLog(botId, `⚡ [Host Manager] Avvio comando: ${command} ${args.join(' ')}`);

    const child = spawn(command, args, {
      cwd: botDir,
      env,
      shell: process.platform === 'win32',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    if (!active) {
      active = {
        process: child,
        config,
        status: 'starting',
        logs: [],
        startTime: Date.now(),
        restartsCount: 0,
        manuallyStopped: false,
        stats: { cpu: 0, memory: 0, uptime: 0, pid: child.pid },
      };
      activeBots.set(botId, active);
    } else {
      active.process = child;
      active.config = config;
      active.status = 'starting';
      active.startTime = Date.now();
      active.stats.pid = child.pid;
      active.manuallyStopped = false;
      active.restartsCount = 0;
    }

    child.stdout?.on('data', (data) => {
      const text = data.toString();
      const lines = text.split(/\r?\n/).filter((l: string) => l.length > 0);
      lines.forEach((line: string) => broadcastLog(botId, line));
    });

    child.stderr?.on('data', (data) => {
      const text = data.toString();
      const lines = text.split(/\r?\n/).filter((l: string) => l.length > 0);
      lines.forEach((line: string) => broadcastLog(botId, `⚠️ ${line}`));
    });

    child.on('spawn', () => {
      if (active) {
        active.status = 'online';
        active.stats.pid = child.pid;
        broadcastLog(botId, `🟢 [Host Manager] Bot avviato con PID ${child.pid}`);
      }
    });

    child.on('error', (err) => {
      broadcastLog(botId, `❌ [Host Manager] Errore di avvio processo: ${err.message}`);
      if (active) {
        active.status = 'error';
      }
    });

    child.on('close', (code, signal) => {
      broadcastLog(botId, `🛑 [Host Manager] Processo terminato (Exit Code: ${code}, Segnale: ${signal || 'none'})`);
      if (active) {
        if (active.statsInterval) {
          clearInterval(active.statsInterval);
          active.statsInterval = undefined;
        }
        active.stats = { cpu: 0, memory: 0, uptime: 0 };

        // Keep-Alive Watchdog: NEVER auto-restart if manually stopped by user
        if (active.manuallyStopped || !config.enabled || active.status === 'stopping' || active.status === 'offline') {
          active.status = 'offline';
          return;
        }

        // Only auto-restart on unexpected crashes
        if (config.autoRestart !== false) {
          active.restartsCount++;
          const delay = Math.min(15000, (config.restartDelay || 2000));
          broadcastLog(botId, `🔄 [Auto-Restart] Crash imprevisto. Tentativo di riavvio in ${delay / 1000}s...`);
          active.status = 'starting';
          active.restartTimeout = setTimeout(() => {
            startBot(botId);
          }, delay);
          return;
        }

        active.status = code === 0 ? 'offline' : 'error';
      }
    });

    // Start stats monitoring interval
    if (active.statsInterval) {
      clearInterval(active.statsInterval);
    }

    active.statsInterval = setInterval(async () => {
      if (active && active.process && active.process.pid && active.status === 'online') {
        try {
          const stats = await pidusage(active.process.pid);
          active.stats = {
            cpu: Math.round(stats.cpu * 10) / 10,
            memory: stats.memory,
            uptime: Math.floor((Date.now() - active.startTime) / 1000),
            pid: active.process.pid,
          };
          if (active.stats.uptime > 60 && active.restartsCount > 0) {
            active.restartsCount = 0;
          }
        } catch {
          // Process might have just exited
        }
      }
    }, 2000);

    // Persist enabled state
    const allBots = getAllBots();
    const bIndex = allBots.findIndex((b) => b.id === botId);
    if (bIndex !== -1) {
      (allBots[bIndex] as any).enabled = true;
      saveBots(allBots);
    }

    return { success: true, message: 'Bot avviato con successo' };
  } catch (error: any) {
    broadcastLog(botId, `❌ [Host Manager] Errore: ${error?.message || error}`);
    return { success: false, message: error?.message || 'Errore durante l\'avvio' };
  }
}

export async function stopBot(botId: string): Promise<{ success: boolean; message: string }> {
  // Persist disabled state
  const allBots = getAllBots();
  const bIndex = allBots.findIndex((b) => b.id === botId);
  if (bIndex !== -1) {
    (allBots[bIndex] as any).enabled = false;
    saveBots(allBots);
  }

  const active = activeBots.get(botId);
  if (!active || !active.process || active.status === 'offline') {
    return { success: true, message: 'Il bot è già offline' };
  }

  active.manuallyStopped = true;
  active.status = 'offline';
  if (active.restartTimeout) {
    clearTimeout(active.restartTimeout);
    active.restartTimeout = undefined;
  }
  if (active.statsInterval) {
    clearInterval(active.statsInterval);
    active.statsInterval = undefined;
  }

  broadcastLog(botId, `🛑 [Host Manager] Arresto manuale del bot...`);

  const pid = active.process.pid;

  if (pid) {
    if (process.platform === 'win32') {
      exec(`taskkill /pid ${pid} /T /F`, () => {});
    } else {
      try {
        active.process.kill('SIGKILL');
      } catch {
        active.process.kill('SIGTERM');
      }
    }
  }

  active.stats = { cpu: 0, memory: 0, uptime: 0 };
  return { success: true, message: 'Bot arrestato con successo' };
}

export async function restartBot(botId: string): Promise<{ success: boolean; message: string }> {
  const active = activeBots.get(botId);
  if (active) {
    active.manuallyStopped = false;
    if (active.restartTimeout) {
      clearTimeout(active.restartTimeout);
      active.restartTimeout = undefined;
    }
    if (active.statsInterval) {
      clearInterval(active.statsInterval);
      active.statsInterval = undefined;
    }
    if (active.process && active.process.pid) {
      try {
        if (process.platform === 'win32') {
          exec(`taskkill /pid ${active.process.pid} /T /F`, () => {});
        } else {
          active.process.kill('SIGKILL');
        }
      } catch {}
    }
  }

  broadcastLog(botId, `🔄 [Host Manager] Riavvio immediato del bot...`);
  await new Promise((resolve) => setTimeout(resolve, 400));
  return await startBot(botId);
}

export function sendBotInput(botId: string, input: string): boolean {
  const active = activeBots.get(botId);
  if (!active || !active.process || active.status !== 'online') {
    return false;
  }

  try {
    active.process.stdin?.write(input + '\n');
    broadcastLog(botId, `⌨️ > ${input}`);
    return true;
  } catch {
    return false;
  }
}

export function clearBotLogs(botId: string): void {
  const active = activeBots.get(botId);
  if (active) {
    active.logs = [];
  }
}

// Auto-boot sequence: restore and auto-start all enabled bots on server start/reboot
let isAutoBootStarted = false;
function triggerAutoBoot() {
  if (isAutoBootStarted) return;
  isAutoBootStarted = true;
  setTimeout(() => {
    try {
      const all = getAllBots();
      all.forEach((bot: any) => {
        if (bot.enabled !== false && bot.autoRestart !== false) {
          startBot(bot.id);
        }
      });
    } catch {}
  }, 2000);
}

// Trigger auto-boot when module loads
triggerAutoBoot();

