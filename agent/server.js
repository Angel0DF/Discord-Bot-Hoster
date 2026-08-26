require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn, exec, execSync } = require('child_process');
const pidusage = require('pidusage');
let AdmZip;
try { AdmZip = require('adm-zip'); } catch {}

const app = express();
const PORT = process.env.PORT || 4000;
const SECRET_KEY = process.env.AGENT_SECRET_KEY || 'proxmox_discord_secret_2026';

const DATA_DIR = path.join(__dirname, 'data');
const BOTS_DIR = path.join(DATA_DIR, 'bots');
const BOTS_FILE = path.join(DATA_DIR, 'bots.json');

// Ensure directories
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(BOTS_DIR)) fs.mkdirSync(BOTS_DIR, { recursive: true });
if (!fs.existsSync(BOTS_FILE)) fs.writeFileSync(BOTS_FILE, JSON.stringify([], null, 2));

// CORS and Preflight handling
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-agent-secret');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '150mb' }));
app.use(express.urlencoded({ limit: '150mb', extended: true }));

// In-memory active processes
const activeProcesses = new Map();
const logListeners = new Map();
const MAX_LOG_LINES = 1000;

// Middleware for authentication
app.use((req, res, next) => {
  // Allow OPTIONS preflight and health ping without auth
  if (req.method === 'OPTIONS') return next();
  if (req.path === '/api/health') return next();

  const authHeader = req.headers['authorization'] || req.headers['x-agent-secret'];
  const querySecret = req.query.secret;

  const provided = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : querySecret;

  if (SECRET_KEY && provided !== SECRET_KEY) {
    return res.status(401).json({ success: false, error: 'Accesso non autorizzato. Secret Key non valida.' });
  }
  next();
});

// Storage helpers
function getBots() {
  try {
    return JSON.parse(fs.readFileSync(BOTS_FILE, 'utf8'));
  } catch {
    return [];
  }
}

function saveBots(bots) {
  fs.writeFileSync(BOTS_FILE, JSON.stringify(bots, null, 2));
}

function broadcastLog(botId, text) {
  let active = activeProcesses.get(botId);
  const formatted = `[${new Date().toLocaleTimeString()}] ${text}`;

  if (active) {
    active.logs.push(formatted);
    if (active.logs.length > MAX_LOG_LINES) active.logs.shift();
  }

  const listeners = logListeners.get(botId);
  if (listeners) {
    listeners.forEach((cb) => cb(formatted));
  }
}

// Bot Runner Functions
function resolveCommand(config, botDir) {
  if (config.startCommand && config.startCommand.trim().length > 0) {
    const parts = config.startCommand.trim().split(' ');
    return { command: parts[0], args: parts.slice(1) };
  }

  const isWindows = process.platform === 'win32';
  if (config.runtime === 'python') {
    const venvPython = isWindows
      ? path.join(botDir, '.venv', 'Scripts', 'python.exe')
      : path.join(botDir, '.venv', 'bin', 'python');

    if (fs.existsSync(venvPython)) return { command: venvPython, args: [config.mainFile || 'main.py'] };
    const pythonCmd = isWindows ? 'python' : 'python3';
    return { command: pythonCmd, args: [config.mainFile || 'main.py'] };
  }

  if (config.runtime === 'bun') {
    return { command: 'bun', args: ['run', config.mainFile || 'index.js'] };
  }

  return { command: 'node', args: [config.mainFile || 'index.js'] };
}

function startBotProcess(botId) {
  const bots = getBots();
  const config = bots.find((b) => b.id === botId);
  if (!config) return { success: false, message: 'Bot non trovato' };

  let active = activeProcesses.get(botId);
  if (active && (active.status === 'online' || active.status === 'starting')) {
    return { success: false, message: 'Bot già in esecuzione' };
  }

  const botDir = path.join(BOTS_DIR, botId);
  if (!fs.existsSync(botDir)) fs.mkdirSync(botDir, { recursive: true });

  // Parse any .env file on disk if present
  let diskEnv = {};
  const envFilePath = path.join(botDir, '.env');
  if (fs.existsSync(envFilePath)) {
    try {
      const lines = fs.readFileSync(envFilePath, 'utf8').split(/\r?\n/);
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eq = trimmed.indexOf('=');
        if (eq > 0) {
          const k = trimmed.substring(0, eq).trim();
          let v = trimmed.substring(eq + 1).trim();
          if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
            v = v.substring(1, v.length - 1);
          }
          if (k) diskEnv[k] = v;
        }
      }
    } catch {}
  }

  const env = {
    ...process.env,
    ...diskEnv,
    ...(config.env || {}),
    BOT_ID: botId,
    NODE_ENV: 'production',
  };

  const { command, args } = resolveCommand(config, botDir);

  const existingLogs = active ? active.logs : [];
  if (!active) {
    active = {
      process: null,
      config,
      status: 'starting',
      logs: existingLogs,
      startTime: Date.now(),
      restartsCount: 0,
      manuallyStopped: false,
      stats: { cpu: 0, memory: 0, uptime: 0, pid: 0 },
    };
    activeProcesses.set(botId, active);
  } else {
    active.config = config;
    active.status = 'starting';
    active.startTime = Date.now();
    active.manuallyStopped = false;
    active.restartsCount = 0;
  }

  broadcastLog(botId, `⚡ [Proxmox Agent] Avvio comando: ${command} ${args.join(' ')}`);

  try {
    const child = spawn(command, args, {
      cwd: botDir,
      env,
      shell: process.platform === 'win32',
      stdio: ['pipe', 'pipe', 'pipe'],
    });

    active.process = child;
    active.stats.pid = child.pid;

    child.stdout?.on('data', (d) => {
      d.toString().split(/\r?\n/).filter(Boolean).forEach((line) => broadcastLog(botId, line));
    });

    child.stderr?.on('data', (d) => {
      d.toString().split(/\r?\n/).filter(Boolean).forEach((line) => broadcastLog(botId, `⚠️ ${line}`));
    });

    child.on('spawn', () => {
      if (active) {
        active.status = 'online';
        active.stats.pid = child.pid;
        broadcastLog(botId, `🟢 [Proxmox Agent] Bot avviato con PID ${child.pid}`);
      }
    });

    child.on('error', (err) => {
      broadcastLog(botId, `❌ [Proxmox Agent] Errore di avvio: ${err.message}`);
      if (active) active.status = 'error';
    });

    child.on('close', (code, signal) => {
      broadcastLog(botId, `🛑 [Proxmox Agent] Processo terminato (Codice: ${code}, Segnale: ${signal || 'none'})`);
      if (active) {
        if (active.statsInterval) clearInterval(active.statsInterval);
        active.stats = { cpu: 0, memory: 0, uptime: 0 };

        // Keep-Alive Watchdog: NEVER auto-restart if the bot was manually stopped by user
        if (active.manuallyStopped || !config.enabled || active.status === 'stopped_by_user' || active.status === 'offline' || active.status === 'restarting') {
          if (active.status !== 'restarting') {
            active.status = 'offline';
          }
          return;
        }

        // Only auto-restart if it crashed unexpectedly while meant to be online
        if (config.autoRestart !== false) {
          active.restartsCount++;
          const delay = Math.min(10000, (config.restartDelay || 2000));
          broadcastLog(botId, `🔄 [Auto-Restart] Crash imprevisto. Riavvio in corso tra ${delay / 1000}s...`);
          active.status = 'starting';
          active.restartTimeout = setTimeout(() => startBotProcess(botId), delay);
          return;
        }

        active.status = code === 0 ? 'offline' : 'error';
      }
    });

    if (active.statsInterval) clearInterval(active.statsInterval);
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
        } catch {}
      }
    }, 2000);

    // Persist enabled state in bots.json
    const allBots = getBots();
    const bIndex = allBots.findIndex((b) => b.id === botId);
    if (bIndex !== -1) {
      allBots[bIndex].enabled = true;
      saveBots(allBots);
    }

    return { success: true, message: 'Bot avviato' };
  } catch (err) {
    broadcastLog(botId, `❌ [Proxmox Agent] Errore: ${err.message}`);
    return { success: false, message: err.message };
  }
}

function stopBotProcess(botId) {
  const active = activeProcesses.get(botId);
  if (!active || !active.process || active.status === 'offline') {
    const allBots = getBots();
    const bIndex = allBots.findIndex((b) => b.id === botId);
    if (bIndex !== -1) {
      allBots[bIndex].enabled = false;
      saveBots(allBots);
    }
    return { success: true, message: 'Bot già offline' };
  }

  active.manuallyStopped = true;
  active.status = 'stopped_by_user';
  if (active.restartTimeout) clearTimeout(active.restartTimeout);
  if (active.statsInterval) clearInterval(active.statsInterval);

  const allBots = getBots();
  const bIndex = allBots.findIndex((b) => b.id === botId);
  if (bIndex !== -1) {
    allBots[bIndex].enabled = false;
    saveBots(allBots);
  }

  broadcastLog(botId, `🛑 [Proxmox Agent] Arresto manuale del bot...`);
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

  active.status = 'offline';
  active.stats = { cpu: 0, memory: 0, uptime: 0 };
  return { success: true, message: 'Bot arrestato' };
}

function restartBotProcess(botId) {
  const active = activeProcesses.get(botId);
  if (active) {
    active.manuallyStopped = false;
    active.status = 'restarting';
    if (active.restartTimeout) clearTimeout(active.restartTimeout);
    if (active.statsInterval) clearInterval(active.statsInterval);
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

  broadcastLog(botId, `🔄 [Proxmox Agent] Riavvio immediato del bot...`);
  setTimeout(() => {
    startBotProcess(botId);
  }, 400);

  return { success: true, message: 'Riavvio in corso' };
}

// System stats calculation
let prevCpus = os.cpus();
function getCpuUsage() {
  const currentCpus = os.cpus();
  let idleDiff = 0, totalDiff = 0;
  for (let i = 0; i < currentCpus.length; i++) {
    const prev = prevCpus[i]?.times || { idle: 0, user: 0, nice: 0, sys: 0, irq: 0 };
    const curr = currentCpus[i].times;
    idleDiff += curr.idle - prev.idle;
    totalDiff += (curr.user + curr.nice + curr.sys + curr.idle + curr.irq) - (prev.user + prev.nice + prev.sys + prev.idle + prev.irq);
  }
  prevCpus = currentCpus;
  if (totalDiff === 0) return 0;
  return Math.max(0, Math.min(100, Math.round((100 - (100 * idleDiff) / totalDiff) * 10) / 10));
}

// REST Endpoints
app.get('/api/health', (req, res) => {
  res.json({ success: true, status: 'ok', hostname: os.hostname(), uptime: os.uptime() });
});

app.get('/api/system', (req, res) => {
  const totalMem = os.totalmem();
  const freeMem = os.freemem();
  const usedMem = totalMem - freeMem;
  res.json({
    success: true,
    stats: {
      hostname: os.hostname(),
      platform: `${os.platform()} (${os.release()})`,
      uptime: Math.floor(os.uptime()),
      cpuModel: os.cpus()[0]?.model || 'Unknown',
      cpuCores: os.cpus().length,
      cpuUsage: getCpuUsage(),
      totalMem,
      freeMem,
      usedMem,
      memUsagePercent: Math.round((usedMem / totalMem) * 1000) / 10,
      nodeVersion: process.version,
      isProxmoxGuest: true,
    },
  });
});

app.get('/api/bots', (req, res) => {
  const configs = getBots();
  const states = configs.map((config) => {
    const active = activeProcesses.get(config.id);
    return {
      id: config.id,
      config,
      status: active ? active.status : 'offline',
      stats: active ? active.stats : { cpu: 0, memory: 0, uptime: 0 },
      logs: active ? active.logs : [],
      restartsCount: active ? active.restartsCount : 0,
    };
  });
  res.json({ success: true, bots: states });
});

app.get('/api/bots/:id', (req, res) => {
  const { id } = req.params;
  const bots = getBots();
  const bot = bots.find((b) => b.id === id);
  if (!bot) return res.status(404).json({ success: false, error: 'Bot non trovato' });

  const active = activeProcesses.get(id);
  const state = {
    id: bot.id,
    config: bot,
    status: active ? active.status : 'offline',
    pid: active ? active.pid : undefined,
    startedAt: active ? active.startedAt : undefined,
    stats: active ? active.stats : { cpu: 0, memory: 0, uptime: 0 },
    logs: active ? active.logs : [],
    restartsCount: active ? active.restartsCount : 0,
  };

  res.json({ success: true, bot: state });
});

app.post('/api/bots', (req, res) => {
  const { name, runtime = 'nodejs', mainFile, description, env, templateFiles } = req.body;
  if (!name) return res.status(400).json({ success: false, error: 'Nome obbligatorio' });

  const id = 'bot_' + Math.random().toString(36).substring(2, 9);
  const now = new Date().toISOString();
  const botDir = path.join(BOTS_DIR, id);
  fs.mkdirSync(botDir, { recursive: true });

  // Write template files if provided
  if (Array.isArray(templateFiles)) {
    for (const f of templateFiles) {
      const target = path.join(botDir, f.name);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, f.content || '');
    }
  }

  const config = {
    id,
    name: name.trim(),
    description: description || '',
    runtime,
    mainFile: mainFile || (runtime === 'python' ? 'main.py' : 'index.js'),
    env: env || {},
    autoRestart: true,
    maxRestarts: 5,
    restartDelay: 3000,
    createdAt: now,
    updatedAt: now,
  };

  const bots = getBots();
  bots.push(config);
  saveBots(bots);

  res.json({ success: true, bot: config });
});

app.put('/api/bots/:id', (req, res) => {
  const { id } = req.params;
  const bots = getBots();
  const index = bots.findIndex((b) => b.id === id);
  if (index === -1) return res.status(404).json({ success: false, error: 'Bot non trovato' });

  const updated = { ...bots[index], ...req.body, id, updatedAt: new Date().toISOString() };
  bots[index] = updated;
  saveBots(bots);

  const active = activeProcesses.get(id);
  if (active) active.config = updated;

  res.json({ success: true, bot: updated });
});

app.delete('/api/bots/:id', (req, res) => {
  const { id } = req.params;
  stopBotProcess(id);
  const botDir = path.join(BOTS_DIR, id);
  if (fs.existsSync(botDir)) fs.rmSync(botDir, { recursive: true, force: true });

  const bots = getBots().filter((b) => b.id !== id);
  saveBots(bots);
  activeProcesses.delete(id);

  res.json({ success: true });
});

app.post('/api/bots/:id/power', (req, res) => {
  const { id } = req.params;
  const { action } = req.body;
  if (action === 'start') return res.json(startBotProcess(id));
  if (action === 'stop') return res.json(stopBotProcess(id));
  if (action === 'restart') return res.json(restartBotProcess(id));
  res.status(400).json({ success: false, error: 'Azione non valida' });
});

app.get('/api/bots/:id/logs', (req, res) => {
  const { id } = req.params;
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', '*');

  const active = activeProcesses.get(id);
  const initialLogs = active ? active.logs : [];
  res.write(`data: ${JSON.stringify({ type: 'history', logs: initialLogs })}\n\n`);

  if (!logListeners.has(id)) logListeners.set(id, new Set());
  const listeners = logListeners.get(id);

  const listener = (line) => {
    res.write(`data: ${JSON.stringify({ type: 'log', log: line })}\n\n`);
  };
  listeners.add(listener);

  const pingInterval = setInterval(() => res.write(': ping\n\n'), 15000);

  req.on('close', () => {
    clearInterval(pingInterval);
    listeners.delete(listener);
  });
});

app.post('/api/bots/:id/logs', (req, res) => {
  const { id } = req.params;
  const { input, action } = req.body;
  const active = activeProcesses.get(id);

  if (action === 'clear') {
    if (active) active.logs = [];
    return res.json({ success: true });
  }

  if (typeof input === 'string' && active && active.process) {
    active.process.stdin?.write(input + '\n');
    broadcastLog(id, `⌨️ > ${input}`);
    return res.json({ success: true });
  }

  res.status(400).json({ success: false });
});

app.get('/api/bots/:id/files', (req, res) => {
  const { id } = req.params;
  const subPath = req.query.path || '';
  const isContent = req.query.content === 'true';
  const target = path.join(BOTS_DIR, id, subPath);

  if (!fs.existsSync(target)) return res.status(404).json({ success: false, error: 'Non trovato' });
  const stat = fs.statSync(target);

  if (isContent) {
    return res.json({ success: true, content: fs.readFileSync(target, 'utf8') });
  }

  if (stat.isDirectory()) {
    const items = fs.readdirSync(target).map((name) => {
      const itemPath = path.join(target, name);
      const s = fs.statSync(itemPath);
      return {
        name,
        path: path.relative(path.join(BOTS_DIR, id), itemPath).replace(/\\/g, '/'),
        isDirectory: s.isDirectory(),
        size: s.size,
      };
    });
    return res.json({ success: true, files: items });
  }

  res.json({ success: true, content: fs.readFileSync(target, 'utf8'), isFile: true });
});

app.post('/api/bots/:id/files', (req, res) => {
  const { id } = req.params;
  const { path: filePath, content, isDirectory, action, encoding, isBinary, deleteAfter } = req.body;
  const botDir = path.join(BOTS_DIR, id);
  const target = path.join(botDir, filePath);

  if (action === 'delete') {
    if (fs.existsSync(target)) {
      if (fs.statSync(target).isDirectory()) fs.rmSync(target, { recursive: true, force: true });
      else fs.unlinkSync(target);
      return res.json({ success: true });
    }
    return res.status(404).json({ success: false });
  }

  if (action === 'unzip') {
    if (!fs.existsSync(target)) {
      return res.status(404).json({ success: false, error: 'Archivio non trovato: ' + filePath });
    }
    const destDir = path.dirname(target);
    try {
      const ext = path.extname(target).toLowerCase();
      let extracted = false;
      let lastErr = null;

      // 1. Try AdmZip for zip files
      if (ext === '.zip' && AdmZip) {
        try {
          const zip = new AdmZip(target);
          zip.extractAllTo(destDir, true);
          extracted = true;
        } catch (err) {
          lastErr = err;
        }
      }

      // 2. Try native system extraction tools (7z, unzip, tar, unrar)
      if (!extracted) {
        if (ext === '.zip') {
          try {
            execSync(`unzip -o "${target}" -d "${destDir}"`, { stdio: 'pipe' });
            extracted = true;
          } catch (e1) {
            try {
              execSync(`7z x -y "${target}" -o"${destDir}"`, { stdio: 'pipe' });
              extracted = true;
            } catch (e2) {
              lastErr = e2;
            }
          }
        } else if (ext === '.rar') {
          try {
            execSync(`7z x -y "${target}" -o"${destDir}"`, { stdio: 'pipe' });
            extracted = true;
          } catch (e1) {
            try {
              execSync(`unrar x -o+ "${target}" "${destDir}"`, { stdio: 'pipe' });
              extracted = true;
            } catch (e2) {
              try {
                execSync(`unrar-free -x "${target}" "${destDir}"`, { stdio: 'pipe' });
                extracted = true;
              } catch (e3) {
                lastErr = e3;
              }
            }
          }
        } else if (ext === '.tar' || ext === '.gz' || ext === '.tgz' || ext === '.bz2') {
          try {
            execSync(`tar -xf "${target}" -C "${destDir}"`, { stdio: 'pipe' });
            extracted = true;
          } catch (e) {
            lastErr = e;
          }
        } else {
          try {
            execSync(`7z x -y "${target}" -o"${destDir}"`, { stdio: 'pipe' });
            extracted = true;
          } catch (e) {
            lastErr = e;
          }
        }
      }

      if (!extracted && lastErr) {
        throw lastErr;
      }

      if (deleteAfter === true) {
        try { fs.unlinkSync(target); } catch {}
      }
      return res.json({ success: true, message: 'Archivio decompresso con successo' });
    } catch (err) {
      console.error('Extraction error:', err);
      return res.status(500).json({ success: false, error: 'Errore estrazione: ' + (err.message || 'Installa p7zip-full o unzip sul server') });
    }
  }

  if (isDirectory) {
    fs.mkdirSync(target, { recursive: true });
    return res.json({ success: true });
  }

  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (isBinary || encoding === 'base64') {
    const buffer = Buffer.from(content, 'base64');
    fs.writeFileSync(target, buffer);
  } else {
    fs.writeFileSync(target, content ?? '', 'utf8');
  }
  res.json({ success: true });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 [Proxmox Bot Hoster Agent] In ascolto sulla porta ${PORT}`);
  console.log(`🔑 Secret Key configurata: ${SECRET_KEY ? 'Presente' : 'Disabilitata'}`);

  // Auto-Boot: Automatically restore and start all active bots on server startup/reboot
  setTimeout(() => {
    const bots = getBots();
    console.log(`🔄 [Auto-Boot] Controllo bot da avviare automaticamente all'avvio (${bots.length} configurati)...`);
    bots.forEach((bot) => {
      if (bot.enabled !== false && bot.autoRestart !== false) {
        console.log(`🟢 [Auto-Boot] Avvio automatico bot: ${bot.name} (ID: ${bot.id})`);
        startBotProcess(bot.id);
      }
    });
  }, 1500);
});

